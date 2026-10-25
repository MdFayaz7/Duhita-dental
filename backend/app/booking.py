"""Double-booking checks shared by the admin calendar's create and reschedule."""
import datetime as dt

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .clinic import minutes
from .tables import Appointment, Doctor

# A cancelled or no-show booking no longer holds its time.
HOLDS_TIME = Appointment.status.not_in(("cancelled", "no_show"))


def _label(slot: str) -> str:
    hour, minute = (int(x) for x in slot.split(":"))
    return f"{(hour + 11) % 12 + 1}:{minute:02d} {'AM' if hour < 12 else 'PM'}"


async def resolve_doctor(session: AsyncSession, doctor_id: int | None) -> Doctor | None:
    if doctor_id is None:
        return None
    doctor = await session.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(404, "Doctor not found.")
    return doctor


async def check_clash(session: AsyncSession, *, doctor: Doctor | None, date: dt.date, slot: str, duration: int,
                      ignore_id: int | None = None) -> None:
    """409 if the doctor already has someone whose time overlaps [slot, slot + duration)."""
    if doctor is None:
        return
    stmt = select(Appointment.name, Appointment.slot, Appointment.duration).where(
        Appointment.doctor_id == doctor.id, Appointment.date == date, HOLDS_TIME)
    if ignore_id is not None:
        stmt = stmt.where(Appointment.id != ignore_id)
    start, end = minutes(slot), minutes(slot) + duration
    for other in (await session.execute(stmt)).all():
        other_start = minutes(other.slot)
        if other_start < end and start < other_start + (other.duration or 15):
            raise HTTPException(
                409, f"{doctor.name} already has {other.name} at {_label(other.slot)} ({other.duration} min).")
