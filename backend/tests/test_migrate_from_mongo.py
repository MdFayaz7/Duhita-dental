import datetime as dt

from bson import ObjectId

from app.db import SessionLocal
from app.migrate_from_mongo import copy
from app.security import hash_password

FILE_ID = ObjectId()


class FakeMongo:
    """What the old database looked like, including its untidy corners."""

    data = {
        "admins": [{"_id": ObjectId(), "username": "DuhitaAdmin", "password": hash_password("old-pass-1")}],
        "patients": [
            {"_id": ObjectId(), "patient_id": "dd2601-1234", "name": "Sita", "phone": "9123456780", "age": "34",
             "conditions": ["Diabetes"], "condition_notes": {"Diabetes": "Type 2"},
             "created_at": dt.datetime(2026, 1, 5, 10, 0), "password_hash": "$2b$12$x", "app_user": True,
             "favourite_colour": "teal"},
            {"_id": ObjectId(), "name": "No ID", "phone": "9000000000"},
        ],
        "appointments": [
            {"_id": ObjectId(), "patient_id": "DD2601-1234", "name": "Sita", "phone": "9123456780",
             "date": "2026-02-01", "slot": "10:30", "status": "confirmed", "source": "app"},
            {"_id": ObjectId(), "name": "Old", "phone": "9000000001", "date": "2026-02-02", "slot": "09:00",
             "status": "accepted"},
            {"_id": ObjectId(), "name": "Broken", "phone": "9000000002", "date": "someday", "slot": "09:00"},
        ],
        "schedule": [{"_id": ObjectId(), "date": "2026-02-01", "time_from": "10:30", "patient_name": "Sita",
                      "priority": 1, "status": "pending"}],
        "doctors": [{"_id": ObjectId(), "name": "Dr. N. Sasidhar", "order": 0, "active": True,
                     "photo": f"/api/files/{FILE_ID}"}],
        "research": [], "feedback": [],
        "gallery": [{"_id": ObjectId(), "category": "clinic", "caption": "", "src": f"/api/files/{FILE_ID}", "order": 2}],
        "records": [{"_id": ObjectId(), "patient_id": "DD2601-1234", "title": "OPG", "kind": "xray",
                     "added_by": "clinic", "date": "2026-02-01"}],
    }

    def documents(self, collection):
        return iter(self.data[collection])

    def files(self):
        yield {"_id": FILE_ID, "filename": "a.jpg", "metadata": {"content_type": "image/jpeg", "folder": "gallery"},
               "uploadDate": dt.datetime(2026, 1, 1)}, b"\xff\xd8jpeg-bytes"


async def test_copy_keeps_everything_readable(admin):
    async with SessionLocal() as session:
        report = await copy(FakeMongo(), session)
        await session.commit()

    assert report["patients"][:2] == (2, 1) and "patient_id" in report["patients"][2][0]
    assert report["appointments"][:2] == (3, 2) and "date" in report["appointments"][2][0]
    assert report["files"][:2] == (1, 1)

    patient = (await admin.get("/api/patients/DD2601-1234")).json()
    p = patient["patient"]
    assert p["age"] == 34 and p["conditions"] == ["Diabetes"] and p["favourite_colour"] == "teal"
    assert p["created_at"].startswith("2026-01-05T10:00:00") and "password_hash" not in p
    assert [a["status"] for a in patient["appointments"]] == ["confirmed"]
    assert len(patient["records"]) == 1

    old = (await admin.get("/api/appointments", params={"q": "Old"})).json()["items"][0]
    assert old["status"] == "pending" and old["legacy_status"] == "accepted"

    img = await admin.get(f"/api/files/{FILE_ID}")
    assert img.status_code == 200 and img.content == b"\xff\xd8jpeg-bytes"
    assert (await admin.get("/api/doctors")).json()["items"][0]["photo"] == f"/api/files/{FILE_ID}"

    # Existing passwords keep working: the hashes move over unchanged.
    assert (await admin.post("/api/auth/login", json={"username": "DuhitaAdmin", "password": "old-pass-1"})).status_code == 200
    assert (await admin.post("/api/auth/login", json={"username": "DuhitaAdmin", "password": "nope"})).status_code == 401
