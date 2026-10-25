import io

from PIL import Image

from tests.test_whatsapp import booking, next_weekday

PATIENT = {"name": "Sita Devi", "age": 34, "sex": "Female", "phone": "9123456780", "address": "Benz Circle",
           "complaint": "Sensitivity", "conditions": ["Diabetes"], "condition_notes": {"Diabetes": "Type 2"}}


def png(size=(40, 30)) -> bytes:
    out = io.BytesIO()
    Image.new("RGB", size, "teal").save(out, "PNG")
    return out.getvalue()


async def test_health(client):
    assert (await client.get("/api/health")).json() == {"status": "ok", "database": "connected"}


async def test_admin_auth(client):
    assert (await client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})).status_code == 401
    assert (await client.get("/api/patients")).status_code == 401


async def test_patient_lifecycle(admin, wa):
    res = await admin.post("/api/patients", json=PATIENT)
    assert res.status_code == 201
    pid = res.json()["patient_id"]
    assert pid.startswith("DD") and len(pid) == 11

    assert (await admin.get(f"/api/patients/lookup/{pid.lower()}")).json() == {
        "patient_id": pid, "name": "Sita Devi", "phone": "9123456780"}

    listing = (await admin.get("/api/patients", params={"q": "sita"})).json()
    assert listing["total"] == 1 and listing["items"][0]["conditions"] == ["Diabetes"]
    assert "password_hash" not in listing["items"][0]
    assert (await admin.get("/api/patients", params={"q": "50%_"})).json() == {"total": 0, "items": []}
    from app.patients_service import today_ist
    today = today_ist().isoformat()
    assert (await admin.get("/api/patients", params={"date_from": today, "date_to": today})).json()["total"] == 1

    rec = await admin.post(f"/api/patients/{pid}/records", data={"kind": "xray", "title": "OPG scan"},
                           files={"file": ("scan.png", png(), "image/png")})
    assert rec.status_code == 201, rec.text
    record = rec.json()
    assert record["file_type"] == "image" and record["date"] == today

    img = await admin.get(record["file"])
    assert img.status_code == 200 and img.headers["content-type"] == "image/jpeg"
    part = await admin.get(record["file"], headers={"Range": "bytes=0-9"})
    assert part.status_code == 206 and len(part.content) == 10 and part.content == img.content[:10]

    detail = (await admin.get(f"/api/patients/{pid}")).json()
    assert detail["patient"]["patient_id"] == pid and len(detail["records"]) == 1

    assert (await admin.delete(f"/api/patients/{pid}/records/{record['id']}")).json() == {"ok": True}
    assert (await admin.get(record["file"])).status_code == 404
    assert (await admin.delete(f"/api/patients/{pid}")).json() == {"ok": True}


async def test_large_file_streams_in_chunks(admin, wa):
    from app.db import SessionLocal
    from app.uploads import store_bytes

    blob = bytes(range(256)) * 9000  # ~2.3 MB, more than one chunk
    async with SessionLocal() as s:
        path = store_bytes(s, blob, "clip.mp4", "video/mp4", "feedback")
        await s.commit()
    full = await admin.get(path)
    assert full.content == blob
    tail = await admin.get(path, headers={"Range": "bytes=-1000"})
    assert tail.status_code == 206 and tail.content == blob[-1000:]
    assert (await admin.get(path, headers={"Range": f"bytes={len(blob)}-"})).status_code == 416


async def test_appointments_admin(admin, wa):
    a = (await admin.post("/api/appointments", json=booking())).json()
    await admin.post("/api/appointments", json=booking(name="Anil", phone="9000000001", slot="09:00"))
    day = next_weekday()

    items = (await admin.get("/api/appointments", params={"date": day})).json()["items"]
    assert [i["slot"] for i in items] == ["09:00", "10:30"]
    assert len((await admin.get("/api/appointments", params={"q": "ravi"})).json()["items"]) == 1
    assert (await admin.patch(f"/api/appointments/{a['id']}", json={"slot": "25:00"})).status_code == 422

    added = (await admin.post("/api/schedule/copy-appointments", params={"date": day})).json()
    assert added == {"added": 2}
    assert (await admin.post("/api/schedule/copy-appointments", params={"date": day})).json() == {"added": 0}
    schedule = (await admin.get("/api/schedule", params={"date": day})).json()["items"]
    assert [s["time_from"] for s in schedule] == ["09:00", "10:30"]

    stats = (await admin.get("/api/stats/overview")).json()
    assert stats["appointments_pending"] == 2 and stats["appointments_total"] == 2
    assert set(stats["gallery"]) == {"clinic", "infrastructure", "camps"}
    dash = (await admin.get("/api/stats/dashboard")).json()
    assert len(dash["recent_bookings"]) == 2

    assert (await admin.delete(f"/api/appointments/{a['id']}")).json() == {"ok": True}
    assert (await admin.delete(f"/api/appointments/{a['id']}")).status_code == 404


async def test_patient_app_flow(client, wa):
    assert (await client.get("/api/app/check", params={"phone": "9123456780"})).json() == {
        "registered": False, "has_login": False}
    reg = await client.post("/api/app/register", json={"name": "Sita", "phone": "9123456780", "password": "secret1"})
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    assert "password_hash" not in reg.json()["patient"]
    assert (await client.post("/api/app/register", json={"name": "Sita", "phone": "9123456780",
                                                          "password": "x12345"})).status_code == 409

    login = await client.post("/api/app/login", json={"phone": "9123456780", "password": "secret1"})
    assert login.status_code == 200
    h = {"Authorization": f"Bearer {token}"}

    me = await client.patch("/api/app/me", json={"blood_group": "O+", "conditions": ["Asthma"]}, headers=h)
    assert me.json()["blood_group"] == "O+" and me.json()["conditions"] == ["Asthma"]

    day = next_weekday()
    booked = await client.post("/api/app/me/appointments", json={"date": day, "slot": "17:00"}, headers=h)
    assert booked.status_code == 201 and booked.json()["source"] == "app"
    assert wa.sent[-1]["template"]["name"] == "appointment_request"
    clash = await client.post("/api/app/me/appointments", json={"date": day, "slot": "17:00"}, headers=h)
    assert clash.status_code == 409

    slots = (await client.get("/api/app/slots", params={"date": day})).json()
    evening = next(s for s in slots["sessions"] if s["id"] == "evening")
    assert next(t for t in evening["slots"] if t["time"] == "17:00")["available"] is False
    assert (await client.get("/api/app/slots", params={"date": "soon"})).status_code == 400

    mine = (await client.get("/api/app/me/appointments", headers=h)).json()
    assert len(mine["upcoming"]) == 1
    cancelled = await client.post(f"/api/app/me/appointments/{booked.json()['id']}/cancel", headers=h)
    assert cancelled.json()["status"] == "cancelled"
    assert (await client.post("/api/app/me/appointments", json={"date": day, "slot": "17:00"}, headers=h)).status_code == 201

    rec = await client.post("/api/app/me/records", data={"title": "Old report", "date": "2025-01-02"}, headers=h)
    assert rec.status_code == 201 and rec.json()["date"] == "2025-01-02"
    assert (await client.post("/api/app/me/records", data={"title": "x", "date": "bad"}, headers=h)).status_code == 422
    assert len((await client.get("/api/app/me/records", headers=h)).json()["items"]) == 1
    assert (await client.delete(f"/api/app/me/records/{rec.json()['id']}", headers=h)).json() == {"ok": True}

    photo = await client.post("/api/app/me/photo", files={"file": ("me.png", png(), "image/png")}, headers=h)
    assert photo.status_code == 200 and (await client.get(photo.json()["photo"])).status_code == 200
    assert (await client.post("/api/app/me/password", json={"current_password": "secret1",
                                                            "new_password": "secret2"}, headers=h)).json() == {"ok": True}


async def test_front_desk_patient_gets_app_login(admin, wa):
    pid = (await admin.post("/api/patients", json=PATIENT)).json()["patient_id"]
    reg = await admin.post("/api/app/register", json={"name": "Sita", "phone": "9123456780", "password": "secret1",
                                                       "patient_id": pid})
    assert reg.status_code == 201 and reg.json()["patient"]["patient_id"] == pid
    assert (await admin.post(f"/api/patients/{pid}/reset-app-login")).json()["ok"] is True


async def test_content_admin(admin, wa):
    doc = (await admin.post("/api/doctors", json={"name": "Dr. A", "order": 1})).json()
    assert (await admin.patch(f"/api/doctors/{doc['id']}", json={"name": "Dr. B", "active": False})).json()["name"] == "Dr. B"
    assert (await admin.get("/api/doctors")).json()["items"] == []
    assert len((await admin.get("/api/doctors", params={"include_inactive": True})).json()["items"]) == 1
    photo = await admin.post(f"/api/doctors/{doc['id']}/photo", files={"file": ("d.png", png(), "image/png")})
    assert photo.json()["photo"].startswith("/api/files/")

    ids = []
    for _ in range(3):
        res = await admin.post("/api/gallery", data={"category": "clinic"}, files={"file": ("g.png", png(), "image/png")})
        ids.append(res.json()["id"])
    assert (await admin.post("/api/gallery/reorder", json=ids[::-1])).json()["count"] == 3
    order = [i["id"] for i in (await admin.get("/api/gallery", params={"category": "clinic"})).json()["items"]]
    assert order == ids[::-1]
    assert (await admin.patch(f"/api/gallery/{ids[0]}", json={"caption": "Chair"})).json()["caption"] == "Chair"
    assert (await admin.delete(f"/api/gallery/{ids[0]}")).json() == {"ok": True}

    paper = await admin.post("/api/research", data={"title": "T", "authors": "Dr. B"},
                             files={"file": ("p.pdf", b"%PDF-1.4 test", "application/pdf")})
    assert paper.status_code == 201
    upd = await admin.patch(f"/api/research/{paper.json()['id']}", data={"year": "2026"})
    assert upd.json()["year"] == "2026"

    entry = (await admin.post("/api/schedule", json={"date": next_weekday(), "time_from": "11:00",
                                                     "patient_name": "Walk-in"})).json()
    assert (await admin.patch(f"/api/schedule/{entry['id']}", json={"status": "completed"})).json()["status"] == "completed"
    assert (await admin.get("/api/feedback/all")).json()["items"] == []
