from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_db, serialize
from ..models import AppointmentIn, AppointmentUpdate
from ..security import current_admin

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


@router.post("", status_code=201)
async def create(payload: AppointmentIn):
    db = get_db()
    doc = payload.model_dump()
    doc.update(status="pending", created_at=datetime.now(timezone.utc))
    result = await db.appointments.insert_one(doc)
    return {"id": str(result.inserted_id), **{k: doc[k] for k in ("name", "date", "slot")}}


@router.get("")
async def list_appointments(
    date: str | None = None,
    status: str | None = None,
    q: str | None = None,
    limit: int = Query(200, le=500),
    _: str = Depends(current_admin),
):
    query: dict = {}
    if date:
        query["date"] = date
    if status and status != "all":
        query["status"] = status
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q}},
            {"patient_id": {"$regex": q, "$options": "i"}},
        ]
    db = get_db()
    cursor = db.appointments.find(query).sort([("date", 1), ("slot", 1)]).limit(limit)
    return {"items": [serialize(d) for d in await cursor.to_list(limit)]}


@router.patch("/{appointment_id}")
async def update(appointment_id: str, payload: AppointmentUpdate, _: str = Depends(current_admin)):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    changes["updated_at"] = datetime.now(timezone.utc)
    res = await get_db().appointments.find_one_and_update(
        {"_id": ObjectId(appointment_id)}, {"$set": changes}, return_document=True
    )
    if not res:
        raise HTTPException(404, "Appointment not found.")
    return serialize(res)


@router.delete("/{appointment_id}")
async def delete(appointment_id: str, _: str = Depends(current_admin)):
    res = await get_db().appointments.delete_one({"_id": ObjectId(appointment_id)})
    if not res.deleted_count:
        raise HTTPException(404, "Appointment not found.")
    return {"ok": True}
