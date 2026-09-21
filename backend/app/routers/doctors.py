from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..db import get_db, serialize
from ..models import DoctorIn
from ..security import current_admin
from ..uploads import IMAGE_TYPES, delete_upload, save_upload

router = APIRouter(prefix="/api/doctors", tags=["doctors"])


@router.get("")
async def list_doctors(include_inactive: bool = False):
    query = {} if include_inactive else {"active": True}
    cursor = get_db().doctors.find(query).sort([("order", 1), ("name", 1)])
    return {"items": [serialize(d) for d in await cursor.to_list(100)]}


@router.post("", status_code=201, dependencies=[Depends(current_admin)])
async def create_doctor(payload: DoctorIn):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    db = get_db()
    result = await db.doctors.insert_one(doc)
    return serialize(await db.doctors.find_one({"_id": result.inserted_id}))


@router.post("/{doctor_id}/photo", dependencies=[Depends(current_admin)])
async def upload_photo(doctor_id: str, file: UploadFile = File(...)):
    db = get_db()
    current = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not current:
        raise HTTPException(404, "Doctor not found.")
    path = await save_upload(file, "doctors", IMAGE_TYPES)
    await delete_upload(current.get("photo"))
    res = await db.doctors.find_one_and_update(
        {"_id": ObjectId(doctor_id)}, {"$set": {"photo": path}}, return_document=True
    )
    return serialize(res)


@router.patch("/{doctor_id}", dependencies=[Depends(current_admin)])
async def update_doctor(doctor_id: str, payload: DoctorIn):
    res = await get_db().doctors.find_one_and_update(
        {"_id": ObjectId(doctor_id)}, {"$set": payload.model_dump()}, return_document=True
    )
    if not res:
        raise HTTPException(404, "Doctor not found.")
    return serialize(res)


@router.delete("/{doctor_id}", dependencies=[Depends(current_admin)])
async def delete_doctor(doctor_id: str):
    doc = await get_db().doctors.find_one_and_delete({"_id": ObjectId(doctor_id)})
    if not doc:
        raise HTTPException(404, "Doctor not found.")
    await delete_upload(doc.get("photo"))
    return {"ok": True}
