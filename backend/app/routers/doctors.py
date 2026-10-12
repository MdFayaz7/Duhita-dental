from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import delete, select

from ..db import SessionDep, serialize
from ..models import DoctorIn
from ..security import current_admin
from ..tables import Doctor
from ..uploads import IMAGE_TYPES, delete_upload, save_upload

router = APIRouter(prefix="/api/doctors", tags=["doctors"])


async def _get(session, doctor_id: int) -> Doctor:
    doctor = await session.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(404, "Doctor not found.")
    return doctor


@router.get("")
async def list_doctors(session: SessionDep, include_inactive: bool = False):
    stmt = select(Doctor).order_by(Doctor.order, Doctor.name).limit(100)
    if not include_inactive:
        stmt = stmt.where(Doctor.active.is_(True))
    return {"items": [serialize(d) for d in await session.scalars(stmt)]}


@router.post("", status_code=201, dependencies=[Depends(current_admin)])
async def create_doctor(payload: DoctorIn, session: SessionDep):
    doctor = Doctor(**payload.model_dump())
    session.add(doctor)
    await session.commit()
    return serialize(doctor)


@router.post("/{doctor_id}/photo", dependencies=[Depends(current_admin)])
async def upload_photo(doctor_id: int, session: SessionDep, file: UploadFile = File(...)):
    doctor = await _get(session, doctor_id)
    old = doctor.photo
    doctor.photo = await save_upload(session, file, "doctors", IMAGE_TYPES)
    await delete_upload(session, old)
    await session.commit()
    return serialize(doctor)


@router.patch("/{doctor_id}", dependencies=[Depends(current_admin)])
async def update_doctor(doctor_id: int, payload: DoctorIn, session: SessionDep):
    doctor = await _get(session, doctor_id)
    for key, value in payload.model_dump().items():
        setattr(doctor, key, value)
    await session.commit()
    return serialize(doctor)


@router.delete("/{doctor_id}", dependencies=[Depends(current_admin)])
async def delete_doctor(doctor_id: int, session: SessionDep):
    row = (await session.execute(delete(Doctor).where(Doctor.id == doctor_id).returning(Doctor.photo))).first()
    if not row:
        raise HTTPException(404, "Doctor not found.")
    await delete_upload(session, row.photo)
    await session.commit()
    return {"ok": True}
