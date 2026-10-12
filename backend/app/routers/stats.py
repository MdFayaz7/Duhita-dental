import datetime as dt

from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from ..db import SessionDep, serialize, utcnow
from ..patients_service import today_ist
from ..security import current_admin
from ..tables import Appointment, Doctor, Feedback, GalleryImage, Patient, Research, ScheduleEntry

router = APIRouter(prefix="/api/stats", tags=["stats"], dependencies=[Depends(current_admin)])


def _count(model, *where):
    return select(func.count()).select_from(model).where(*where).scalar_subquery()


@router.get("/overview")
async def overview(session: SessionDep):
    today = today_ist()
    # Every dashboard counter in a single round trip.
    row = (await session.execute(select(
        _count(Appointment, Appointment.date == today).label("appointments_today"),
        _count(Appointment, Appointment.status == "pending").label("appointments_pending"),
        _count(Appointment).label("appointments_total"),
        _count(Patient).label("patients_total"),
        _count(Patient, Patient.created_at >= utcnow() - dt.timedelta(days=7)).label("patients_this_week"),
        _count(Doctor, Doctor.active.is_(True)).label("doctors"),
        _count(Research).label("research"),
        _count(Feedback).label("feedback"),
        _count(GalleryImage, GalleryImage.category == "clinic").label("clinic"),
        _count(GalleryImage, GalleryImage.category == "infrastructure").label("infrastructure"),
        _count(GalleryImage, GalleryImage.category == "camps").label("camps"),
    ))).one()._asdict()
    gallery = {k: row.pop(k) for k in ("clinic", "infrastructure", "camps")}
    return {**row, "gallery": gallery, "today": today.isoformat()}


@router.get("/dashboard")
async def dashboard(session: SessionDep):
    """Everything the Overview page needs, in one call."""
    recent_bookings = await session.scalars(select(Appointment).order_by(Appointment.created_at.desc()).limit(6))
    recent_patients = await session.scalars(select(Patient).order_by(Patient.created_at.desc()).limit(6))
    todays_schedule = await session.scalars(
        select(ScheduleEntry).where(ScheduleEntry.date == today_ist())
        .order_by(ScheduleEntry.priority, ScheduleEntry.time_from).limit(20)
    )
    return {
        "recent_bookings": [serialize(d) for d in recent_bookings],
        "recent_patients": [serialize(d) for d in recent_patients],
        "todays_schedule": [serialize(d) for d in todays_schedule],
    }
