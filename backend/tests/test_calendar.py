import io

from openpyxl import Workbook

from tests.test_whatsapp import booking, next_weekday


async def make_doctor(admin, name="Dr. Harish") -> dict:
    res = await admin.post("/api/doctors", json={"name": name, "active": False})
    assert res.status_code == 201
    return res.json()


async def test_clinic_hours_are_public(client):
    hours = (await client.get("/api/clinic/hours")).json()
    assert [(s["from"], s["to"]) for s in hours["sessions"]] == [("10:00", "13:00"), ("16:30", "20:00")]
    assert hours["slot_minutes"] == 15 and hours["sessions"][1]["range"] == "4:30 PM – 8:00 PM"
    slots = (await client.get("/api/app/slots", params={"date": next_weekday()})).json()
    times = [t["time"] for s in slots["sessions"] for t in s["slots"]]
    assert times[0] == "10:00" and "16:30" in times and "13:00" not in times and times[-1] == "19:30"


async def test_book_new_patient_from_calendar(admin, wa):
    doctor = await make_doctor(admin)
    assert doctor["color"] and doctor["in_calendar"] is True
    day = next_weekday()

    res = await admin.post("/api/appointments/admin", json={
        "new_patient": {"name": "Lakshmi", "phone": "9000011111"}, "doctor_id": int(doctor["id"]),
        "date": day, "slot": "10:15", "duration": 30, "category": "telephonic", "procedures": "RCT"})
    assert res.status_code == 201, res.text
    appt = res.json()
    assert appt["doctor"] == "Dr. Harish" and appt["duration"] == 30 and appt["status"] == "confirmed"
    assert appt["patient_id"].startswith("DD") and appt["source"] == "clinic"
    assert [m["template"]["name"] for m in wa.sent] == ["appointment_confirmed"]  # patient told, admins not asked

    # 10:30 overlaps 10:15 + 30 min for the same doctor ...
    clash = await admin.post("/api/appointments/admin", json={
        "patient_id": appt["patient_id"], "doctor_id": int(doctor["id"]), "date": day, "slot": "10:30"})
    assert clash.status_code == 409 and "Lakshmi" in clash.json()["detail"]
    # ... unless the desk books it anyway, and 10:45 is free.
    assert (await admin.post("/api/appointments/admin", json={
        "patient_id": appt["patient_id"], "doctor_id": int(doctor["id"]), "date": day, "slot": "10:30",
        "force": True, "notify": False})).status_code == 201
    free = await admin.post("/api/appointments/admin", json={
        "patient_id": appt["patient_id"], "doctor_id": int(doctor["id"]), "date": day, "slot": "10:45",
        "status": "checked_in", "category": "walkin"})
    assert free.status_code == 201 and free.json()["status"] == "checked_in"

    cal = (await admin.get("/api/appointments/calendar", params={"start": day, "end": day})).json()["items"]
    assert [a["slot"] for a in cal] == ["10:15", "10:30", "10:45"]
    only = (await admin.get("/api/appointments/calendar",
                            params={"start": day, "end": day, "doctor_id": 999})).json()["items"]
    assert only == []
    assert (await admin.get("/api/appointments/calendar",
                            params={"start": "2026-01-01", "end": "2026-06-01"})).status_code == 400

    # Dragging the walk-in onto 10:15 clashes; cancelling the first booking frees the time.
    assert (await admin.patch(f"/api/appointments/{free.json()['id']}", json={"slot": "10:15"})).status_code == 409
    await admin.patch(f"/api/appointments/{appt['id']}", json={"status": "cancelled"})
    moved = await admin.patch(f"/api/appointments/{free.json()['id']}", json={"slot": "11:00", "status": "engaged"})
    assert moved.status_code == 200 and moved.json()["status"] == "engaged"


async def test_reassign_doctor_and_website_booking_still_works(admin, client, wa):
    harish, sindhu = await make_doctor(admin), await make_doctor(admin, "Dr. Sindhu")
    assert harish["color"] != sindhu["color"]
    site = (await client.post("/api/appointments", json=booking())).json()
    res = await admin.patch(f"/api/appointments/{site['id']}",
                            json={"doctor_id": int(sindhu["id"]), "duration": 45, "category": "high_priority"})
    assert res.status_code == 200 and res.json()["doctor"] == "Dr. Sindhu" and res.json()["duration"] == 45
    assert (await admin.patch(f"/api/appointments/{site['id']}", json={"category": ""})).json()["category"] is None
    assert (await admin.patch(f"/api/appointments/{site['id']}", json={"doctor_id": 424242})).status_code == 404

    # Editing a doctor's profile from the old form doesn't wipe their colour.
    edited = await admin.patch(f"/api/doctors/{harish['id']}", json={"name": "Dr. Harish (Perio)"})
    assert edited.json()["color"] == harish["color"]


def xlsx(rows: list[list]) -> bytes:
    wb = Workbook()
    for row in rows:
        wb.active.append(row)
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


PRACTO = [
    ["Practo Patient Export"],
    ["Patient Number", "Patient Name", "Mobile Number", "Secondary Mobile", "Email Address", "Gender",
     "Date of Birth", "Address", "City", "Medical History", "Patient Notes", "Registered On"],
    ["P-1", "RAVI KUMAR", "+91 98765 43210", "", "ravi@example.com", "M", "14/02/1985", "MG Road", "Vijayawada",
     "Diabetes, BP", "Prefers evenings", "05/03/2019"],
    ["P-2", "Sita Kumar", "098765-43210", "", "", "F", "", "MG Road", "Vijayawada", "", "", "05/03/2019"],
    ["P-3", "Baby Anu", "9876543210 / 9123456789", "", "", "Female", "2018-06-01", "", "", "", "", ""],
    ["P-4", "No Phone", "12345", "", "not-an-email", "", "", "", "", "", "", "2020-01-10"],
    ["P-5", "", "9000000009", "", "", "", "", "", "", "", "", ""],
    ["P-2", "Sita Kumar", "9876543210", "", "sita@example.com", "F", "", "", "", "", "", "05/03/2019"],
]


async def test_practo_import(admin, client):
    # Sita registered on the website before the import: she must be linked, not duplicated.
    site = await client.post("/api/patients", json={
        "name": "Sita Kumar", "age": 40, "sex": "Female", "phone": "9876543210", "address": "Benz Circle",
        "complaint": "Cleaning"})
    site_id = site.json()["patient_id"]

    files = {"file": ("patients.xlsx", xlsx(PRACTO), "application/octet-stream")}
    prev = (await admin.post("/api/patients/import/preview", files=files)).json()
    assert prev["mapping"]["phone"] == "Mobile Number" and prev["mapping"]["practo_id"] == "Patient Number"
    s = prev["summary"]
    assert s == {"rows_in_file": 6, "skipped_no_name": 1, "duplicates_in_file": 1, "to_create": 3, "to_update": 1,
                 "no_mobile": 1, "family_numbers": 1, "patients_in_families": 3}
    assert prev["sample"][0]["name"] == "Ravi Kumar" and prev["sample"][0]["phone"] == "9876543210"
    assert prev["sample"][0]["conditions"] == ["Diabetes", "BP"] and prev["sample"][0]["age"] >= 40
    assert prev["sample_families"][0]["members"] == ["Ravi Kumar", "Sita Kumar", "Baby Anu"]

    done = (await admin.post("/api/patients/import/commit", files=files)).json()
    assert done["created"] == 3 and done["updated"] == 1

    ravi = (await admin.get("/api/patients", params={"q": "P-1"})).json()["items"][0]
    assert ravi["patient_id"].startswith("DD1903-") and ravi["source"] == "practo"
    assert ravi["address"] == "MG Road, Vijayawada" and ravi["practo_notes"] == "Prefers evenings"
    assert ravi["created_at"].startswith("2019-03-05") and ravi["family_size"] == 3
    anu = (await admin.get("/api/patients", params={"q": "Baby Anu"})).json()["items"][0]
    assert anu["alt_phone"] == "9123456789" and anu["dob"] == "2018-06-01"
    assert (await admin.get("/api/patients", params={"q": "9123456789"})).json()["total"] == 1

    sita = (await admin.get(f"/api/patients/{site_id}")).json()
    assert sita["patient"]["practo_id"] == "P-2" and sita["patient"]["email"] == "sita@example.com"
    assert sita["patient"]["address"] == "Benz Circle"  # never overwritten
    assert sorted(f["name"] for f in sita["family"]) == ["Baby Anu", "Ravi Kumar"]
    no_phone = (await admin.get("/api/patients", params={"q": "No Phone"})).json()["items"][0]
    assert no_phone["phone"] == "" and no_phone["family_size"] == 0 and no_phone["email"] is None

    # Importing the same file again changes nothing.
    again = (await admin.post("/api/patients/import/commit", files=files)).json()
    assert again["created"] == 0 and again["updated"] == 0
    assert (await admin.get("/api/patients")).json()["total"] == 4


async def test_import_csv_with_manual_mapping(admin):
    csv = "Full Name;Cell;Sex\nAsha;9811122233;F\nAsha;9811122233;F\n".encode()
    files = {"file": ("export.csv", csv, "text/csv")}
    prev = await admin.post("/api/patients/import/preview", files=files)
    assert prev.status_code == 200 and "phone" not in prev.json()["mapping"]
    mapping = '{"name": "Full Name", "phone": "Cell", "sex": "Sex"}'
    done = (await admin.post("/api/patients/import/commit", files=files, data={"mapping": mapping})).json()
    assert done["created"] == 1 and done["duplicates_in_file"] == 1
    bad = await admin.post("/api/patients/import/preview", files=files, data={"mapping": '{"phone": "Cell"}'})
    assert bad.status_code == 400
