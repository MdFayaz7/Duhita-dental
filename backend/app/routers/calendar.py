"""The admin appointment calendar (Practo-style): clinic hours, a date range of bookings, and booking from a slot."""
import datetime as dt

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from .. import whatsapp
from ..booking import check_clash, resolve_doctor
from ..clinic import HOURS_KEY, load_hours
from ..db import SessionDep, serialize, utcnow
from ..events import broadcast_event
from ..models import AdminBookingIn, ClinicHoursIn
from ..patients_service import add_patient, today_ist
from ..security import current_admin
from ..tables import Appointment, Patient, Setting

router = APIRouter(tags=["calendar"])

MAX_RANGE_DAYS = 62  # a month view plus the spill-over weeks either side


@router.get("/api/clinic/hours")
async def clinic_hours(session: SessionDep):
    """Opening hours, slot length, durations and booking categories (public: the website reads them too)."""
    return (await load_hours(session)).payload()


@router.put("/api/clinic/hours", dependencies=[Depends(current_admin)])
async def save_clinic_hours(payload: ClinicHoursIn, session: SessionDep):
    week = [[{"from": s.start, "to": s.end} for s in sorted(day, key=lambda s: s.start)] for day in payload.week]
    await session.execute(insert(Setting).values(key=HOURS_KEY, value={"week": week})
                          .on_conflict_do_update(index_elements=[Setting.key], set_={"value": {"week": week}, "updated_at": utcnow()}))
    await session.commit()
    await broadcast_event("clinic_hours_updated")
    return (await load_hours(session)).payload()


@router.get("/api/appointments/calendar", dependencies=[Depends(current_admin)])
async def calendar(session: SessionDep, start: dt.date, end: dt.date, doctor_id: int | None = Query(None)):
    if end < start or (end - start).days > MAX_RANGE_DAYS:
        raise HTTPException(400, f"Choose a range of up to {MAX_RANGE_DAYS} days.")
    stmt = (select(Appointment).where(Appointment.date >= start, Appointment.date <= end)
            .order_by(Appointment.date, Appointment.slot).limit(5000))
    if doctor_id is not None:
        stmt = stmt.where(Appointment.doctor_id == doctor_id)
    return {"items": [serialize(a) for a in await session.scalars(stmt)]}


@router.post("/api/appointments/admin", status_code=201, dependencies=[Depends(current_admin)])
async def book(payload: AdminBookingIn, session: SessionDep, background: BackgroundTasks):
    """Book from the calendar: an existing patient by ID, or a new one registered on the spot."""
    doctor = await resolve_doctor(session, payload.doctor_id)

    if payload.patient_id:
        patient = await session.scalar(select(Patient).where(Patient.patient_id == payload.patient_id.strip().upper()))
        if not patient:
            raise HTTPException(404, "No patient found with that Patient ID.")
    elif payload.new_patient:
        patient = None
    else:
        raise HTTPException(400, "Choose a patient, or enter a new patient's name and mobile number.")

    if not payload.force:
        await check_clash(session, doctor=doctor, date=payload.date, slot=payload.slot, duration=payload.duration)

    if patient is None:
        patient = await add_patient(session, Patient(**payload.new_patient.model_dump(), source="clinic"))
        await broadcast_event("patient_registered", {"patient_id": patient.patient_id})

    now = utcnow()
    appt = Appointment(
        patient_id=patient.patient_id, name=patient.name, phone=patient.phone,
        date=payload.date, slot=payload.slot, duration=payload.duration,
        doctor_id=doctor.id if doctor else None, doctor=doctor.name if doctor else None,
        category=payload.category, procedures=payload.procedures, notes=payload.notes,
        status=payload.status, source="clinic",
        confirmed_at=now if payload.status == "confirmed" else None,
        # The front desk made it, so there is nothing for the admins to approve on WhatsApp.
        admin_notified_at=now,
    )
    session.add(appt)
    await session.commit()

    if payload.status == "confirmed" and payload.notify and payload.date >= today_ist():
        background.add_task(whatsapp.notify_patient_confirmed, appt.id)
    created = serialize(appt)
    await broadcast_event("appointment_created", created)
    await broadcast_event("stats_updated")
    return created
