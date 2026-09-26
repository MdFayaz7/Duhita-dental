import random
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_db, serialize
from ..models import PatientIn
from ..security import current_admin

router = APIRouter(prefix="/api/patients", tags=["patients"])


async def _next_patient_id(db) -> str:
    stamp = datetime.now(IST).strftime("%y%m")
    for _ in range(25):
        candidate = f"DD{stamp}-{random.randint(1000, 9999)}"
        if not await db.patients.find_one({"patient_id": candidate}):
            return candidate
    raise HTTPException(500, "Could not allocate a patient ID. Please try again.")


@router.post("", status_code=201)
async def register(payload: PatientIn):
    db = get_db()
    doc = payload.model_dump()
    doc["patient_id"] = await _next_patient_id(db)
    doc["created_at"] = datetime.now(timezone.utc)
    await db.patients.insert_one(doc)
    return {"patient_id": doc["patient_id"], "name": doc["name"]}


@router.get("/lookup/{patient_id}")
async def lookup(patient_id: str):
    """Used by the booking form to fill in name and phone."""
    doc = await get_db().patients.find_one({"patient_id": patient_id.strip().upper()})
    if not doc:
        raise HTTPException(404, "No patient found with that ID.")
    return {"patient_id": doc["patient_id"], "name": doc["name"], "phone": doc["phone"]}


@router.post("/{patient_id}/reset-app-login", dependencies=[Depends(current_admin)])
async def reset_app_login(patient_id: str):
    """Clear a patient's app password so they can set a new one by registering again.

    Used when a patient calls the clinic saying they forgot their app password.
    """
    res = await get_db().patients.find_one_and_update(
        {"patient_id": patient_id.strip().upper()},
        {"$unset": {"password_hash": ""}},
        return_document=True,
    )
    if not res:
        raise HTTPException(404, "No patient found with that ID.")
    return {"ok": True, "patient_id": res["patient_id"], "name": res["name"]}


@router.get("")
async def list_patients(
    q: str | None = None,
    date_from: str | None = Query(None, description="YYYY-MM-DD, registered on or after"),
    date_to: str | None = Query(None, description="YYYY-MM-DD, registered on or before"),
    sort: str = Query("newest", pattern="^(newest|oldest|name)$"),
    limit: int = Query(50, le=500),
    skip: int = 0,
    _: str = Depends(current_admin),
):
    query: dict = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q}},
            {"patient_id": {"$regex": q, "$options": "i"}},
        ]
    if date_from or date_to:
        window: dict = {}
        if date_from:
            window["$gte"] = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
        if date_to:
            window["$lte"] = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        query["created_at"] = window

    order = {"newest": [("created_at", -1)], "oldest": [("created_at", 1)], "name": [("name", 1)]}[sort]
    db = get_db()
    cursor = db.patients.find(query).sort(order).skip(skip).limit(limit)
    return {
        "total": await db.patients.count_documents(query),
        "items": [serialize(d) for d in await cursor.to_list(limit)],
    }


@router.get("/{patient_id}")
async def patient_detail(patient_id: str, _: str = Depends(current_admin)):
    db = get_db()
    doc = await db.patients.find_one({"patient_id": patient_id.upper()})
    if not doc:
        raise HTTPException(404, "Patient not found.")
    history = await db.appointments.find({"patient_id": doc["patient_id"]}).sort("date", -1).to_list(50)
    return {"patient": serialize(doc), "appointments": [serialize(a) for a in history]}


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str, _: str = Depends(current_admin)):
    res = await get_db().patients.delete_one({"patient_id": patient_id})
    if not res.deleted_count:
        raise HTTPException(404, "Patient not found.")
    return {"ok": True}
