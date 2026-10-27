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
