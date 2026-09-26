"""Everything the patient mobile app talks to.

Patients sign in with their mobile number and a password of their own, and can
only ever see their own record. The clinic's data is the same one the website
admin uses, so an appointment booked in the app appears on the dashboard at once.
"""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db, serialize
from ..models import (
    AppBookingIn,
    AppLoginIn,
    AppPasswordIn,
    AppProfileUpdate,
    AppRegisterIn,
)
from ..routers.patients import _next_patient_id
from ..security import create_patient_token, current_patient, hash_password, verify_password

IST = ZoneInfo("Asia/Kolkata")
router = APIRouter(prefix="/api/app", tags=["patient app"])

# Clinic hours, mirrored from the website's booking form.
SESSIONS = [
    {"id": "morning", "label": "Morning", "range": "9:00 AM – 1:00 PM", "from": 9, "to": 13},
    {"id": "evening", "label": "Evening", "range": "3:00 PM – 9:00 PM", "from": 15, "to": 21},
]
BOOKING_DAYS = 30  # how far ahead a patient may book


def _slots(start: int, end: int) -> list[str]:
    return [f"{m // 60:02d}:{m % 60:02d}" for m in range(start * 60, end * 60, 30)]


def _today() -> datetime:
    return datetime.now(IST)


def _public(patient: dict) -> dict:
    """A patient's own record, without anything private to the clinic."""
    doc = serialize(patient)
    doc.pop("password_hash", None)
    return doc


async def _find_patient(patient_id: str) -> dict:
    doc = await get_db().patients.find_one({"patient_id": patient_id})
    if not doc:
        raise HTTPException(404, "Your record could not be found. Please contact the clinic.")
    return doc


# ---------------------------------------------------------------- account

@router.get("/check")
async def check_number(phone: str):
    """Does this mobile number already have a clinic record, and does it have an app login yet?

    Lets the app say "we found your record" instead of quietly creating a second one.
    """
    doc = await get_db().patients.find_one({"phone": phone}, {"password_hash": 1})
    return {"registered": bool(doc), "has_login": bool(doc and doc.get("password_hash"))}


@router.post("/register", status_code=201)
async def register(payload: AppRegisterIn):
    """Create an account. A patient already registered at the clinic keeps their Patient ID."""
    db = get_db()
    data = payload.model_dump(exclude={"password", "patient_id"})
    existing = await db.patients.find_one({"phone": payload.phone})

    if payload.patient_id:  # linking an existing clinic record by its Patient ID
        quoted = await db.patients.find_one({"patient_id": payload.patient_id.strip().upper()})
        if not quoted:
            raise HTTPException(404, "No patient found with that Patient ID.")
        if quoted.get("phone") != payload.phone:
            raise HTTPException(
                403, "That Patient ID is registered to a different mobile number. Please call the clinic."
            )
        existing = quoted

    if existing and existing.get("password_hash"):
        raise HTTPException(409, "This mobile number already has an account. Please sign in instead.")

    changes = {k: v for k, v in data.items() if v not in (None, "", [], {})}
    changes["password_hash"] = hash_password(payload.password)
    changes["app_user"] = True

    if existing:  # registered at the front desk before — attach a login to that record
        await db.patients.update_one({"_id": existing["_id"]}, {"$set": changes})
        patient_id = existing["patient_id"]
    else:
        changes["patient_id"] = await _next_patient_id(db)
        changes["created_at"] = datetime.now(timezone.utc)
        await db.patients.insert_one(changes)
        patient_id = changes["patient_id"]

    return {"access_token": create_patient_token(patient_id), "token_type": "bearer",
            "patient": _public(await _find_patient(patient_id))}


@router.post("/login")
async def login(payload: AppLoginIn):
    doc = await get_db().patients.find_one({"phone": payload.phone})
    if not doc or not doc.get("password_hash") or not verify_password(payload.password, doc["password_hash"]):
        raise HTTPException(401, "Wrong mobile number or password.")
    return {"access_token": create_patient_token(doc["patient_id"]), "token_type": "bearer",
            "patient": _public(doc)}


@router.get("/me")
async def me(patient_id: str = Depends(current_patient)):
    return _public(await _find_patient(patient_id))


@router.patch("/me")
async def update_me(payload: AppProfileUpdate, patient_id: str = Depends(current_patient)):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    changes["updated_at"] = datetime.now(timezone.utc)
    doc = await get_db().patients.find_one_and_update(
        {"patient_id": patient_id}, {"$set": changes}, return_document=True
    )
    if not doc:
        raise HTTPException(404, "Your record could not be found.")
    return _public(doc)


@router.post("/me/password")
async def change_password(payload: AppPasswordIn, patient_id: str = Depends(current_patient)):
    doc = await _find_patient(patient_id)
    if not verify_password(payload.current_password, doc.get("password_hash", "")):
        raise HTTPException(401, "Your current password is not right.")
    await get_db().patients.update_one(
        {"patient_id": patient_id}, {"$set": {"password_hash": hash_password(payload.new_password)}}
    )
    return {"ok": True}


# ---------------------------------------------------------------- appointments

@router.get("/slots")
async def free_slots(date: str):
    """Which times are still open on a given day, and which have passed."""
    try:
        day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=IST)
    except ValueError:
        raise HTTPException(400, "Use a date like 2026-09-30.")

    now = _today()
    closed = day.weekday() == 6  # Sunday is by prior appointment only
    taken = {
        a["slot"]
        for a in await get_db().appointments.find(
            {"date": date, "status": {"$ne": "cancelled"}}, {"slot": 1}
        ).to_list(400)
    }

    sessions = []
    for s in SESSIONS:
        times = []
        for t in _slots(s["from"], s["to"]):
            hour, minute = (int(x) for x in t.split(":"))
            passed = day.date() == now.date() and (hour, minute) <= (now.hour, now.minute)
            times.append({"time": t, "available": not closed and not passed and t not in taken})
        sessions.append({**{k: s[k] for k in ("id", "label", "range")}, "slots": times})

    return {"date": date, "closed": closed, "sessions": sessions}


@router.get("/me/appointments")
async def my_appointments(patient_id: str = Depends(current_patient)):
    doc = await _find_patient(patient_id)
    cursor = get_db().appointments.find(
        {"$or": [{"patient_id": patient_id}, {"phone": doc["phone"]}]}
    ).sort([("date", -1), ("slot", -1)])
    items = [serialize(a) for a in await cursor.to_list(200)]

    today = _today().strftime("%Y-%m-%d")
    upcoming = [a for a in items if a["date"] >= today and a.get("status") not in ("cancelled", "completed")]
    return {
        "upcoming": sorted(upcoming, key=lambda a: (a["date"], a["slot"])),
        "past": [a for a in items if a not in upcoming],
    }


@router.post("/me/appointments", status_code=201)
async def book(payload: AppBookingIn, patient_id: str = Depends(current_patient)):
    db = get_db()
    doc = await _find_patient(patient_id)

    day = datetime.strptime(payload.date, "%Y-%m-%d").replace(tzinfo=IST)
    now = _today()
    if day.date() < now.date():
        raise HTTPException(400, "That date has already passed.")
    if day.date() > (now + timedelta(days=BOOKING_DAYS)).date():
        raise HTTPException(400, f"Appointments can be booked up to {BOOKING_DAYS} days ahead.")
    if day.weekday() == 6:
        raise HTTPException(400, "Sundays are by prior appointment only — please call the clinic.")

    hour, minute = (int(x) for x in payload.slot.split(":"))
    if not any(s["from"] <= hour < s["to"] for s in SESSIONS):
        raise HTTPException(400, "That time is outside clinic hours.")
    if day.date() == now.date() and (hour, minute) <= (now.hour, now.minute):
        raise HTTPException(400, "That time has already passed today.")
    if await db.appointments.find_one(
        {"date": payload.date, "slot": payload.slot, "status": {"$ne": "cancelled"}}
    ):
        raise HTTPException(409, "That time has just been taken. Please choose another.")

    appointment = {
        "patient_id": patient_id,
        "name": doc["name"],
        "phone": doc["phone"],
        "date": payload.date,
        "slot": payload.slot,
        "reason": payload.reason,
        "notes": payload.notes,
        "status": "pending",
        "source": "app",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.appointments.insert_one(appointment)
    return serialize(await db.appointments.find_one({"_id": result.inserted_id}))


@router.post("/me/appointments/{appointment_id}/cancel")
async def cancel(appointment_id: str, patient_id: str = Depends(current_patient)):
    try:
        oid = ObjectId(appointment_id)
    except InvalidId:
        raise HTTPException(404, "Appointment not found.")

    doc = await _find_patient(patient_id)
    res = await get_db().appointments.find_one_and_update(
        {"_id": oid, "$or": [{"patient_id": patient_id}, {"phone": doc["phone"]}],
         "status": {"$in": ["pending", "confirmed"]}},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not res:
        raise HTTPException(404, "That appointment cannot be cancelled.")
    return serialize(res)
