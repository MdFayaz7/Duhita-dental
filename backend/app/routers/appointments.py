import datetime as dt

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import delete as sql_delete
from sqlalchemy import or_, select

from .. import whatsapp
from ..booking import check_clash, resolve_doctor
from ..db import SessionDep, contains, serialize, utcnow
from ..events import broadcast_event
from ..models import AppointmentIn, AppointmentUpdate
from ..security import current_admin
from ..tables import Appointment

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


@router.post("", status_code=201)
async def create(payload: AppointmentIn, session: SessionDep, background: BackgroundTasks):
    appt = Appointment(**payload.model_dump(), status="pending", source="website")
    session.add(appt)
    await session.commit()
    created = {"id": str(appt.id), "name": appt.name, "date": appt.date.isoformat(), "slot": appt.slot,
               "phone": appt.phone, "status": appt.status}
    background.add_task(whatsapp.notify_admins_new_appointment, appt.id)
    await broadcast_event("appointment_created", created)
    await broadcast_event("stats_updated")
    return created


@router.get("")
async def list_appointments(
    session: SessionDep,
    date: dt.date | None = None,
    status: str | None = None,
    q: str | None = None,
    limit: int = Query(200, le=500),
    _: str = Depends(current_admin),
):
    stmt = select(Appointment)
    if date:
        stmt = stmt.where(Appointment.date == date).order_by(Appointment.slot)
    else:
        stmt = stmt.order_by(Appointment.date.desc(), Appointment.slot)
    if status and status != "all":
        stmt = stmt.where(Appointment.status == status)
    if q and q.strip():
        stmt = stmt.where(or_(contains(Appointment.name, q), contains(Appointment.phone, q),
                              contains(Appointment.patient_id, q)))
    rows = (await session.scalars(stmt.limit(limit))).all()
    return {"items": [serialize(r) for r in rows]}


@router.patch("/{appointment_id}")
async def update(appointment_id: int, payload: AppointmentUpdate, session: SessionDep,
                 background: BackgroundTasks, _: str = Depends(current_admin)):
    changes = payload.model_dump(exclude_none=True, exclude={"force"})
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    appt = await session.get(Appointment, appointment_id, with_for_update=True)
    if not appt:
        raise HTTPException(404, "Appointment not found.")

    if "doctor_id" in changes:
        doctor = await resolve_doctor(session, changes["doctor_id"])
        changes["doctor"] = doctor.name
    else:
        doctor = await resolve_doctor(session, appt.doctor_id)
    if "category" in changes:
        changes["category"] = changes["category"] or None
    moved = any(k in changes for k in ("date", "slot", "duration", "doctor_id"))
    if moved and not payload.force and changes.get("status", appt.status) not in ("cancelled", "no_show"):
        await check_clash(session, doctor=doctor, date=changes.get("date", appt.date),
                          slot=changes.get("slot", appt.slot), duration=changes.get("duration", appt.duration),
                          ignore_id=appt.id)

    newly_confirmed = changes.get("status") == "confirmed" and appt.status != "confirmed"
    for key, value in changes.items():
        setattr(appt, key, value)
    appt.updated_at = utcnow()
    if newly_confirmed:
        appt.confirmed_at = appt.updated_at
    await session.commit()

    if newly_confirmed:
        background.add_task(whatsapp.notify_patient_confirmed, appt.id)
    serialized = serialize(appt)
    await broadcast_event("appointment_updated", serialized)
    await broadcast_event("stats_updated")
    return serialized


@router.delete("/{appointment_id}")
async def delete(appointment_id: int, session: SessionDep, _: str = Depends(current_admin)):
    deleted = (await session.execute(
        sql_delete(Appointment).where(Appointment.id == appointment_id).returning(Appointment.id)
    )).scalar_one_or_none()
    if deleted is None:
        raise HTTPException(404, "Appointment not found.")
    await session.commit()
    await broadcast_event("appointment_deleted", {"id": str(appointment_id)})
    await broadcast_event("stats_updated")
    return {"ok": True}
