import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, or_, select, update

from ..db import SessionDep, contains, serialize
from ..events import broadcast_event
from ..models import PatientIn
from ..patients_service import IST, RecordForm, add_patient, add_record
from ..security import current_admin
from ..tables import Appointment, Patient, Record
from ..uploads import delete_upload

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("", status_code=201)
async def register(payload: PatientIn, session: SessionDep):
    patient = await add_patient(session, Patient(**payload.model_dump()))
    await session.commit()
    await broadcast_event("patient_registered", serialize(patient))
    await broadcast_event("stats_updated")
    return {"patient_id": patient.patient_id, "name": patient.name}


@router.get("/lookup/{patient_id}")
async def lookup(patient_id: str, session: SessionDep):
    """Used by the booking form to fill in name and phone."""
    row = (await session.execute(
        select(Patient.patient_id, Patient.name, Patient.phone).where(Patient.patient_id == patient_id.strip().upper())
    )).first()
    if not row:
        raise HTTPException(404, "No patient found with that ID.")
    return row._asdict()


@router.post("/{patient_id}/reset-app-login", dependencies=[Depends(current_admin)])
async def reset_app_login(patient_id: str, session: SessionDep):
    """Clear a patient's app password so they can set a new one by registering again.

    Used when a patient calls the clinic saying they forgot their app password.
    """
    row = (await session.execute(
        update(Patient).where(Patient.patient_id == patient_id.strip().upper())
        .values(password_hash=None).returning(Patient.patient_id, Patient.name)
    )).first()
    if not row:
        raise HTTPException(404, "No patient found with that ID.")
    await session.commit()
    return {"ok": True, **row._asdict()}


@router.get("")
async def list_patients(
    session: SessionDep,
    q: str | None = None,
    date_from: dt.date | None = Query(None, description="YYYY-MM-DD (clinic time), registered on or after"),
    date_to: dt.date | None = Query(None, description="YYYY-MM-DD (clinic time), registered on or before"),
    sort: str = Query("newest", pattern="^(newest|oldest|name)$"),
    limit: int = Query(50, le=500),
    skip: int = Query(0, ge=0),
    _: str = Depends(current_admin),
):
    filters = []
    if q and q.strip():
        filters.append(or_(contains(Patient.name, q), contains(Patient.phone, q), contains(Patient.patient_id, q)))
    if date_from:
        filters.append(Patient.created_at >= dt.datetime.combine(date_from, dt.time.min, IST))
    if date_to:
        filters.append(Patient.created_at < dt.datetime.combine(date_to + dt.timedelta(days=1), dt.time.min, IST))

    order = {"newest": Patient.created_at.desc(), "oldest": Patient.created_at.asc(), "name": Patient.name.asc()}[sort]
    # One round trip: the page plus the total, via a window count.
    rows = (await session.execute(
        select(Patient, func.count().over().label("total")).where(*filters).order_by(order).offset(skip).limit(limit)
    )).all()
    total = rows[0].total if rows else (
        await session.scalar(select(func.count()).select_from(Patient).where(*filters)) if skip else 0
    )
    return {"total": total, "items": [serialize(r.Patient) for r in rows]}


@router.get("/{patient_id}")
async def patient_detail(patient_id: str, session: SessionDep, _: str = Depends(current_admin)):
    patient = await session.scalar(select(Patient).where(Patient.patient_id == patient_id.upper()))
    if not patient:
        raise HTTPException(404, "Patient not found.")
    history = await session.scalars(
        select(Appointment).where(Appointment.patient_id == patient.patient_id).order_by(Appointment.date.desc()).limit(50)
    )
    records = await session.scalars(
        select(Record).where(Record.patient_id == patient.patient_id)
        .order_by(Record.date.desc().nulls_last(), Record.created_at.desc()).limit(200)
    )
    return {
        "patient": serialize(patient),
        "appointments": [serialize(a) for a in history],
        "records": [serialize(r) for r in records],
    }


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str, session: SessionDep, _: str = Depends(current_admin)):
    deleted = (await session.execute(
        delete(Patient).where(Patient.patient_id == patient_id).returning(Patient.id)
    )).scalar_one_or_none()
    if deleted is None:
        raise HTTPException(404, "Patient not found.")
    await session.commit()
    await broadcast_event("patient_deleted", {"patient_id": patient_id})
    await broadcast_event("stats_updated")
    return {"ok": True}


# ---------------------------------------------------------------- records
# The clinic files a patient's prescriptions, X-rays and reports here so they
# show up automatically in that patient's app/website record once logged in.

@router.post("/{patient_id}/records", status_code=201)
async def add_clinic_record(patient_id: str, session: SessionDep, form: RecordForm = Depends(),
                            _: str = Depends(current_admin)):
    patient_id = patient_id.upper()
    if not await session.scalar(select(Patient.id).where(Patient.patient_id == patient_id)):
        raise HTTPException(404, "Patient not found.")
    created = await add_record(session, form, patient_id, "clinic")
    await broadcast_event("record_updated", {"patient_id": patient_id, "record": created})
    return created


@router.delete("/{patient_id}/records/{record_id}")
async def delete_record(patient_id: str, record_id: int, session: SessionDep, _: str = Depends(current_admin)):
    file = (await session.execute(
        delete(Record).where(Record.id == record_id, Record.patient_id == patient_id.upper()).returning(Record.file)
    )).first()
    if not file:
        raise HTTPException(404, "Record not found.")
    await delete_upload(session, file.file)
    await session.commit()
    await broadcast_event("record_updated", {"patient_id": patient_id.upper(), "record_id": str(record_id)})
    return {"ok": True}
