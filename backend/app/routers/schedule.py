import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete as sql_delete
from sqlalchemy import insert, select, update as sql_update

from ..db import SessionDep, serialize
from ..events import broadcast_event
from ..models import ScheduleIn, ScheduleUpdate
from ..security import current_admin
from ..tables import Appointment, ScheduleEntry

router = APIRouter(prefix="/api/schedule", tags=["schedule"], dependencies=[Depends(current_admin)])


@router.get("")
async def list_entries(date: dt.date, session: SessionDep):
    rows = await session.scalars(
        select(ScheduleEntry).where(ScheduleEntry.date == date)
        .order_by(ScheduleEntry.priority, ScheduleEntry.time_from).limit(300)
    )
    return {"items": [serialize(r) for r in rows]}


@router.post("", status_code=201)
async def create(payload: ScheduleIn, session: SessionDep):
    entry = ScheduleEntry(**payload.model_dump())
    session.add(entry)
    await session.commit()
    created = serialize(entry)
    await broadcast_event("schedule_updated", created)
    return created


@router.post("/copy-appointments")
async def copy_from_appointments(date: dt.date, session: SessionDep):
    """Pull the day's appointments into the timed schedule table."""
    appointments = await session.scalars(
        select(Appointment).where(Appointment.date == date, Appointment.status != "cancelled")
        .order_by(Appointment.slot).limit(300)
    )
    existing = set((await session.execute(
        select(ScheduleEntry.patient_name, ScheduleEntry.time_from).where(ScheduleEntry.date == date)
    )).tuples())
    rows = [
        {
            "date": date, "time_from": a.slot, "time_to": None, "patient_name": a.name,
            "patient_id": a.patient_id, "doctor": a.doctor, "status": a.status,
            "notes": a.reason or a.notes, "priority": i,
        }
        for i, a in enumerate(appointments, start=1)
        if (a.name, a.slot) not in existing
    ]
    if rows:
        await session.execute(insert(ScheduleEntry), rows)
        await session.commit()
        await broadcast_event("schedule_updated", {"date": date.isoformat(), "added": len(rows)})
    return {"added": len(rows)}


@router.patch("/{entry_id}")
async def update(entry_id: int, payload: ScheduleUpdate, session: SessionDep):
    changes = payload.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    entry = (await session.execute(
        sql_update(ScheduleEntry).where(ScheduleEntry.id == entry_id).values(**changes).returning(ScheduleEntry)
    )).scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "Schedule entry not found.")
    await session.commit()
    serialized = serialize(entry)
    await broadcast_event("schedule_updated", serialized)
    return serialized


@router.delete("/{entry_id}")
async def delete(entry_id: int, session: SessionDep):
    deleted = (await session.execute(
        sql_delete(ScheduleEntry).where(ScheduleEntry.id == entry_id).returning(ScheduleEntry.id)
    )).scalar_one_or_none()
    if deleted is None:
        raise HTTPException(404, "Schedule entry not found.")
    await session.commit()
    await broadcast_event("schedule_updated", {"id": str(entry_id)})
    return {"ok": True}
