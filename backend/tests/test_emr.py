from tests.test_api import PATIENT
from tests.test_billing import setup


async def test_patient_record_flow(admin):
    pid, doc, _ = await setup(admin)
    assert (await admin.post("/api/emr/vitals", json={"patient_id": pid, "pulse": 72, "bp_systolic": 120, "bp_diastolic": 80})).status_code == 201
    assert (await admin.post("/api/emr/vitals", json={"patient_id": pid})).status_code == 422
    note = await admin.post("/api/emr/notes", json={"patient_id": pid, "doctor_id": doc, "complaints": ["Jaw clicking"]})
    assert note.status_code == 201
    assert "Jaw clicking" in [t["name"] for t in (await admin.get("/api/emr/terms?kind=complaint")).json()["items"]]
    rx = await admin.post("/api/emr/prescriptions", json={"patient_id": pid, "items": [{"drug": "Amoxicillin 500 mg", "frequency": "1-0-1", "days": 5}]})
    assert rx.status_code == 201

    plan = (await admin.post("/api/emr/treatments", json={"patient_id": pid, "doctor_id": doc, "name": "ROOT CANAL", "unit_cost": "4500", "teeth": [46]})).json()
    assert float(plan["total"]) == 4500 and plan["status"] == "planned"
    assert (await admin.post("/api/emr/treatments/complete", json={"ids": [int(plan["id"])]})).json()["completed"] == 1
    inv = await admin.post("/api/emr/treatments/invoice", json={"ids": [int(plan["id"])]})
    assert inv.status_code == 201
    assert (await admin.post("/api/emr/treatments/invoice", json={"ids": [int(plan["id"])]})).status_code == 400
    done = (await admin.get(f"/api/emr/procedures/completed?patient_id={pid}")).json()["items"]
    assert len(done) == 1 and done[0]["source"] == "treatment" and done[0]["invoice_id"] == inv.json()["id"]

    types = {e["type"] for e in (await admin.get(f"/api/patients/{pid}/timeline")).json()["events"]}
    assert {"vitals", "note", "prescription", "invoice", "procedure"} <= types


async def test_groups_merge_and_hours(admin):
    a = (await admin.post("/api/patients", json=PATIENT)).json()["patient_id"]
    b = (await admin.post("/api/patients", json={**PATIENT, "name": "Duplicate"})).json()["patient_id"]
    await admin.post("/api/emr/vitals", json={"patient_id": b, "pulse": 80})
    groups = (await admin.get("/api/patients/groups")).json()
    assert groups["all"] == 2
    assert (await admin.patch(f"/api/patients/{a}", json={"blood_group": "O+"})).json()["blood_group"] == "O+"
    assert (await admin.post("/api/patients/merge", json={"keep": a, "remove": b})).status_code == 200
    assert (await admin.get(f"/api/emr/vitals?patient_id={a}")).json()["items"]
    assert (await admin.get(f"/api/patients/{b}")).status_code == 404

    week = [[{"from": "10:00", "to": "13:00"}]] * 5 + [[{"from": "09:00", "to": "14:00"}], []]
    saved = (await admin.put("/api/clinic/hours", json={"week": week})).json()
    assert saved["week"][5]["sessions"][0]["from"] == "09:00" and saved["closed_weekdays"] == [6]
    assert (await admin.put("/api/clinic/hours", json={"week": [[{"from": "10:00", "to": "09:00"}]] + [[]] * 6})).status_code == 422


async def test_sharing_reaches_only_the_patients_own_app(admin, client):
    pid = (await admin.post("/api/patients", json=PATIENT)).json()["patient_id"]
    sibling = (await admin.post("/api/patients", json={**PATIENT, "name": "Sibling"})).json()["patient_id"]
    await admin.post("/api/emr/prescriptions", json={"patient_id": pid, "items": [{"drug": "Amoxicillin"}]})
    await admin.post("/api/emr/prescriptions", json={"patient_id": sibling, "items": [{"drug": "Ibuprofen"}]})

    reg = await client.post("/api/app/register", json={"name": PATIENT["name"], "phone": PATIENT["phone"], "password": "secret12", "patient_id": pid})
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    health = (await client.get("/api/app/me/health", headers=headers)).json()
    assert [i["drug"] for rx in health["prescriptions"] for i in rx["items"]] == ["Amoxicillin"]

    # A procedure billed straight onto a bill shows as treatment done, alongside the bill itself.
    await admin.post("/api/invoices", json={"patient_id": pid, "date": "2026-10-26", "items": [{"name": "Scaling", "unit_cost": 800, "date": "2026-10-26"}]})
    health = (await client.get("/api/app/me/health", headers=headers)).json()
    assert [t["name"] for t in health["procedures"]] == ["Scaling"] and health["invoices"][0]["items"] == ["Scaling"]

    assert (await admin.put(f"/api/patients/{pid}/share", json={"section": "prescriptions", "on": False})).json()["prescriptions"] is False
    assert "prescriptions" not in (await client.get("/api/app/me/health", headers=headers)).json()


async def test_payments_across_patients(admin):
    pid, doc, _ = await setup(admin)
    inv = (await admin.post("/api/invoices", json={"patient_id": pid, "date": "2026-10-25", "items": [{"name": "X", "unit_cost": "500", "date": "2026-10-25"}]})).json()
    await admin.post(f"/api/invoices/{inv['id']}/payments", json={"amount": "200", "date": "2026-10-26"})
    res = (await admin.get("/api/payments?date_from=2026-10-01")).json()
    assert res["items"][0]["patient_name"] and res["items"][0]["invoice_number"] == inv["number"] and not res["more"]


async def test_excel_export_with_chosen_columns(admin):
    import io

    import openpyxl
    pid = (await admin.post("/api/patients", json=PATIENT)).json()["patient_id"]
    keys = [c["key"] for c in (await admin.get("/api/export/columns?kind=clinic")).json()["columns"]]
    assert {"patient_id", "phone", "due"} <= set(keys)
    res = await admin.get("/api/export/patients?kind=clinic&columns=patient_id,phone")
    rows = list(openpyxl.load_workbook(io.BytesIO(res.content)).active.iter_rows(values_only=True))
    assert rows == [("Patient ID", "Mobile"), (pid, PATIENT["phone"])]
    assert (await admin.get("/api/export/patients?kind=clinic&columns=password_hash")).status_code == 422
    assert (await admin.get("/api/export/patients?kind=practo&columns=number,mobile")).status_code == 200
