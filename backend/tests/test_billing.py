from tests.test_api import PATIENT


async def setup(admin):
    pid = (await admin.post("/api/patients", json=PATIENT)).json()["patient_id"]
    doctor = (await admin.post("/api/doctors", json={"name": "Dr. N Sasidhar"})).json()
    for name, cost in (("Implants", 20000), ("Deep cleaning", 3000), ("Medicines", 0)):
        await admin.post("/api/procedures", json={"name": name, "cost": cost})
    procs = {p["name"]: p for p in (await admin.get("/api/procedures")).json()["items"]}
    return pid, int(doctor["id"]), procs


def line(name, cost, doctor_id, **extra):
    return {"name": name, "unit_cost": cost, "date": "2026-10-25", "doctor_id": doctor_id, **extra}


async def test_procedure_catalogue(admin):
    await setup(admin)
    items = (await admin.get("/api/procedures")).json()["items"]
    assert [p["name"] for p in items] == ["Deep cleaning", "Implants", "Medicines"]
    created = await admin.post("/api/procedures", json={"name": "Veneers", "cost": "8000"})
    assert created.status_code == 201 and float(created.json()["cost"]) == 8000
    assert (await admin.post("/api/procedures", json={"name": "veneers"})).status_code == 409
    pid = created.json()["id"]
    assert float((await admin.patch(f"/api/procedures/{pid}", json={"name": "Veneers", "cost": 9000})).json()["cost"]) == 9000
    assert (await admin.delete(f"/api/procedures/{pid}")).json() == {"ok": True}


async def test_invoice_matches_practo_printout(admin):
    """The invoice from the Practo PDF: implants 20,000 + medicines (tooth 22) + deep cleaning 3,000."""
    pid, doc, procs = await setup(admin)
    body = {"patient_id": pid, "number": 2387, "date": "2026-10-25", "items": [
        line("IMPLANTS", 20000, doc, procedure_id=int(procs["Implants"]["id"])),
        line("MEDICINES", 0, doc, teeth=[22]),
        line("DEEP CLEANING", 3000, doc),
    ]}
    res = await admin.post("/api/invoices", json=body)
    assert res.status_code == 201, res.text
    inv = res.json()
    assert inv["number"] == 2387 and float(inv["total"]) == 23000 and float(inv["due"]) == 23000
    assert inv["doctor_id"] == doc and inv["items"][1]["teeth"] == [22] and inv["patient"]["name"] == "Sita Devi"
    assert (await admin.get("/api/invoices/next-number")).json() == {"number": 2388}
    assert (await admin.post("/api/invoices", json=body)).status_code == 409  # bill number taken

    # Discounts (% and ₹), tax after discount, quantity from teeth.
    second = await admin.post("/api/invoices", json={"patient_id": pid, "date": "2026-10-26", "items": [
        line("FILLING", 5000, doc, qty=2, teeth=[36, 37], discount_value=10, discount_type="pct"),
        line("CLEANING", "1000.50", doc, discount_value=100, discount_type="inr", tax_pct=18),
    ]})
    s = second.json()
    assert s["number"] == 2388
    assert float(s["subtotal"]) == 11000.5 and float(s["discount"]) == 1100 and float(s["tax"]) == 162.09
    assert float(s["total"]) == 10062.59

    bad = await admin.post("/api/invoices", json={"patient_id": pid, "date": "2026-10-26", "items": [
        line("X", 100, doc, discount_value=101)]})
    assert bad.status_code == 422
    assert (await admin.post("/api/invoices", json={**body, "number": 9, "items": [line("X", 1, doc, teeth=[19])]})).status_code == 422


async def test_payments_and_timeline(admin):
    pid, doc, _ = await setup(admin)
    inv = (await admin.post("/api/invoices", json={"patient_id": pid, "date": "2026-10-02", "items": [
        line("CONSULTATION", 500, doc, date="2026-10-01"), line("COMPOSITE FILLING", 12000, doc, date="2026-10-02")]})).json()
    iid = inv["id"]

    assert (await admin.post(f"/api/invoices/{iid}/payments", json={"amount": 20000})).status_code == 400  # over the due
    part = (await admin.post(f"/api/invoices/{iid}/payments", json={"amount": 2500, "mode": "upi", "reference": "UTR1"})).json()
    assert float(part["paid"]) == 2500 and float(part["due"]) == 10000 and part["payments"][0]["mode"] == "upi"
    rest = (await admin.post(f"/api/invoices/{iid}/payments", json={"amount": 10000, "date": "2026-10-02"})).json()
    assert float(rest["due"]) == 0

    # Editing can't drop the total below what was received; removing a payment re-opens the due.
    shrink = await admin.put(f"/api/invoices/{iid}", json={"patient_id": pid, "date": "2026-10-02",
                                                         "items": [line("CONSULTATION", 500, doc)]})
    assert shrink.status_code == 400
    assert (await admin.delete(f"/api/invoices/{iid}")).status_code == 400
    big = next(p for p in rest["payments"] if float(p["amount"]) == 10000)
    assert [float(p["amount"]) for p in rest["payments"]] == [10000, 2500]  # listed by payment date
    assert (await admin.delete(f"/api/payments/{big['id']}")).json() == {"ok": True}
    assert float((await admin.get(f"/api/invoices/{iid}")).json()["due"]) == 10000

    billing = (await admin.get(f"/api/patients/{pid}/billing")).json()
    assert billing["summary"] == {"billed": 12500.0, "received": 2500.0, "due": 10000.0}

    events = (await admin.get(f"/api/patients/{pid}/timeline")).json()["events"]
    # Newest day first; within a day the bill, then payments, then procedures (the 2,500 UPI was paid today).
    assert [(e["type"], e["date"] >= "2026-10-25") for e in events][:1] == [("payment", True)]
    assert [(e["date"], e["type"]) for e in events[1:]] == [
        ("2026-10-02", "invoice"), ("2026-10-02", "procedure"), ("2026-10-01", "procedure")]
    assert events[-1]["name"] == "CONSULTATION" and events[-1]["doctor"] == "Dr. N Sasidhar"

    listing = (await admin.get("/api/invoices", params={"q": "sita"})).json()
    assert listing["total"] == 1 and float(listing["summary"]["due"]) == 10000 and listing["items"][0]["patient_name"] == "Sita Devi"
    assert (await admin.get("/api/invoices", params={"due_only": True, "date_from": "2026-11-01"})).json()["total"] == 0

    # A patient with bills can't be deleted; a cancelled bill leaves the totals.
    assert (await admin.delete(f"/api/patients/{pid}")).status_code == 400
    await admin.delete(f"/api/payments/{next(p for p in part['payments'])['id']}")
    assert (await admin.post(f"/api/invoices/{iid}/cancel")).json()["status"] == "cancelled"
    assert (await admin.get(f"/api/patients/{pid}/billing")).json()["summary"]["billed"] == 0
