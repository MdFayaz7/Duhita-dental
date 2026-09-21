from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db, serialize
from ..models import ScheduleIn, ScheduleUpdate
from ..security import current_admin

router = APIRouter(prefix="/api/schedule", tags=["schedule"], dependencies=[Depends(current_admin)])


@router.get("")
async def list_entries(date: str):
    cursor = get_db().schedule.find({"date": date}).sort([("priority", 1), ("time_from", 1)])
    return {"items": [serialize(d) for d in await cursor.to_list(300)]}


@router.post("", status_code=201)
async def create(payload: ScheduleIn):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await get_db().schedule.insert_one(doc)
    return serialize(await get_db().schedule.find_one({"_id": result.inserted_id}))


@router.post("/copy-appointments")
async def copy_from_appointments(date: str):
    """Pull the day's appointments into the timed schedule table."""
    db = get_db()
    appointments = await db.appointments.find({"date": date, "status": {"$ne": "cancelled"}}).sort("slot", 1).to_list(300)
    existing = {(d.get("patient_name"), d.get("time_from")) for d in await db.schedule.find({"date": date}).to_list(300)}
    rows = []
    for i, a in enumerate(appointments, start=1):
        key = (a.get("name"), a.get("slot"))
        if key in existing:
            continue
        rows.append({
            "date": date,
            "time_from": a.get("slot"),
            "time_to": None,
            "patient_name": a.get("name"),
            "patient_id": a.get("patient_id"),
            "doctor": a.get("doctor"),
            "status": a.get("status", "pending"),
            "notes": a.get("reason") or a.get("notes"),
            "priority": i,
            "created_at": datetime.now(timezone.utc),
        })
    if rows:
        await db.schedule.insert_many(rows)
    return {"added": len(rows)}


@router.patch("/{entry_id}")
async def update(entry_id: str, payload: ScheduleUpdate):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    res = await get_db().schedule.find_one_and_update(
        {"_id": ObjectId(entry_id)}, {"$set": changes}, return_document=True
    )
    if not res:
        raise HTTPException(404, "Schedule entry not found.")
    return serialize(res)


@router.delete("/{entry_id}")
async def delete(entry_id: str):
    res = await get_db().schedule.delete_one({"_id": ObjectId(entry_id)})
    if not res.deleted_count:
        raise HTTPException(404, "Schedule entry not found.")
    return {"ok": True}
