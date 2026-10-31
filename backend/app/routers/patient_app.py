"""Everything the patient mobile app talks to.

Patients sign in with their mobile number and a password of their own, and can
only ever see their own record. The clinic's data is the same one the website
admin uses, so an appointment booked in the app appears on the dashboard at once.
"""
import datetime as dt

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import and_, delete, func, or_, select, update

from .. import whatsapp
from ..clinic import DAY_NAMES, load_hours, minutes, session_slots
from ..db import SessionDep, serialize, utcnow
from ..events import broadcast_event
from ..models import AppBookingIn, AppLoginIn, AppPasswordIn, AppProfileUpdate, AppRegisterIn
from ..patients_service import IST, RecordForm, add_patient, add_record
from ..security import create_patient_token, current_patient, hash_password, verify_password
from ..sharing import share_flags
from ..tables import (
    Appointment, ClinicalNote, Doctor, Invoice, InvoiceItem, Payment, Patient, Prescription, Record, Treatment, VitalSign,
)
from ..uploads import IMAGE_TYPES, delete_upload, save_upload

router = APIRouter(prefix="/api/app", tags=["patient app"])

BOOKING_DAYS = 30  # how far ahead a patient may book
APP_SLOT_MINUTES = 30  # patients pick half-hour starts; the front desk works in 15-minute slots
ACTIVE = Appointment.status != "cancelled"


def _now() -> dt.datetime:
    return dt.datetime.now(IST)


def _session_token(patient: Patient) -> dict:
    return {"access_token": create_patient_token(patient.patient_id), "token_type": "bearer",
            "patient": serialize(patient)}


async def _find_patient(session, patient_id: str) -> Patient:
    patient = await session.scalar(select(Patient).where(Patient.patient_id == patient_id))
    if not patient:
        raise HTTPException(404, "Your record could not be found. Please contact the clinic.")
    return patient


def _mine(patient: Patient):
    # Own bookings only; a phone-only booking (no patient ID yet) counts, but never a family member's.
    return or_(Appointment.patient_id == patient.patient_id,
               and_(Appointment.patient_id.is_(None), Appointment.phone == patient.phone))


# ---------------------------------------------------------------- account

@router.get("/check")
async def check_number(phone: str, session: SessionDep):
    """Does this mobile number already have a clinic record, and does it have an app login yet?

    Lets the app say "we found your record" instead of quietly creating a second one.
    """
    rows = (await session.execute(select(Patient.password_hash).where(Patient.phone == phone))).all()
    return {"registered": bool(rows), "has_login": any(r.password_hash for r in rows)}


@router.post("/register", status_code=201)
async def register(payload: AppRegisterIn, session: SessionDep):
    """Create an account. A patient already registered at the clinic keeps their Patient ID."""
    if payload.patient_id:  # linking an existing clinic record by its Patient ID
        existing = await session.scalar(select(Patient).where(Patient.patient_id == payload.patient_id.strip().upper()))
        if not existing:
            raise HTTPException(404, "No patient found with that Patient ID.")
        if existing.phone != payload.phone:
            raise HTTPException(403, "That Patient ID is registered to a different mobile number. Please call the clinic.")
    else:
        existing = await session.scalar(
            select(Patient).where(Patient.phone == payload.phone).order_by(Patient.password_hash.is_(None), Patient.id).limit(1)
        )

    if existing and existing.password_hash:
        raise HTTPException(409, "This mobile number already has an account. Please sign in instead.")

    changes = {k: v for k, v in payload.model_dump(exclude={"password", "patient_id"}).items()
               if v not in (None, "", [], {})}
    changes.update(password_hash=hash_password(payload.password), app_user=True)

    if existing:  # registered at the front desk before — attach a login to that record
        for key, value in changes.items():
            setattr(existing, key, value)
        patient = existing
    else:
        patient = await add_patient(session, Patient(**changes))
    await session.commit()
    return _session_token(patient)


@router.post("/login")
async def login(payload: AppLoginIn, session: SessionDep):
    patient = await session.scalar(
        select(Patient).where(Patient.phone == payload.phone, Patient.password_hash.is_not(None)).limit(1)
    )
    if not patient or not verify_password(payload.password, patient.password_hash):
        raise HTTPException(401, "Wrong mobile number or password.")
    return _session_token(patient)


@router.get("/me")
async def me(session: SessionDep, patient_id: str = Depends(current_patient)):
    return serialize(await _find_patient(session, patient_id))


@router.patch("/me")
async def update_me(payload: AppProfileUpdate, session: SessionDep, patient_id: str = Depends(current_patient)):
    changes = payload.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    patient = (await session.execute(
        update(Patient).where(Patient.patient_id == patient_id)
        .values(**changes, updated_at=utcnow()).returning(Patient)
    )).scalar_one_or_none()
    if not patient:
        raise HTTPException(404, "Your record could not be found.")
    await session.commit()
    return serialize(patient)


@router.post("/me/password")
async def change_password(payload: AppPasswordIn, session: SessionDep, patient_id: str = Depends(current_patient)):
    patient = await _find_patient(session, patient_id)
    if not verify_password(payload.current_password, patient.password_hash or ""):
        raise HTTPException(401, "Your current password is not right.")
    patient.password_hash = hash_password(payload.new_password)
    await session.commit()
    return {"ok": True}


@router.post("/me/photo")
async def upload_photo(session: SessionDep, file: UploadFile = File(...), patient_id: str = Depends(current_patient)):
    """Set the patient's profile picture."""
    patient = await _find_patient(session, patient_id)
    old = patient.photo
    patient.photo = await save_upload(session, file, "patients", IMAGE_TYPES)
    await delete_upload(session, old)  # the one it replaced
    await session.commit()
    return {"photo": patient.photo}


@router.delete("/me/photo")
async def remove_photo(session: SessionDep, patient_id: str = Depends(current_patient)):
    patient = await _find_patient(session, patient_id)
    await delete_upload(session, patient.photo)
    patient.photo = None
    await session.commit()
    return {"ok": True}


# ---------------------------------------------------------------- records

@router.get("/me/records")
async def my_records(session: SessionDep, patient_id: str = Depends(current_patient)):
    """Prescriptions, X-rays and reports — those the clinic adds and those the patient uploads."""
    patient = await _find_patient(session, patient_id)
    shown = [Record.patient_id == patient.patient_id]
    if not share_flags(patient)["files"]:
        shown.append(Record.added_by != "clinic")  # their own uploads stay visible
    rows = await session.scalars(
        select(Record).where(*shown)
        .order_by(Record.date.desc().nulls_last(), Record.created_at.desc()).limit(200)
    )
    return {"items": [serialize(r) for r in rows]}


@router.get("/me/health")
async def my_health(session: SessionDep, patient_id: str = Depends(current_patient)):
    """The clinic's record of this patient — only the sections the clinic shares, only their own entries."""
    patient = await _find_patient(session, patient_id)
    share, pid = share_flags(patient), patient.patient_id
    doctors = dict((await session.execute(select(Doctor.id, Doctor.name))).tuples().all())

    async def rows(model, *where, limit=100):
        found = await session.scalars(select(model).where(model.patient_id == pid, *where)
                                      .order_by(model.date.desc(), model.id.desc()).limit(limit))
        return [{**serialize(r), "doctor": doctors.get(getattr(r, "doctor_id", None))} for r in found]

    out: dict = {"share": share}
    if share["vitals"]:
        out["vitals"] = await rows(VitalSign)
    if share["notes"]:
        out["notes"] = await rows(ClinicalNote)
    if share["prescriptions"]:
        out["prescriptions"] = await rows(Prescription)
    if share["treatments"]:
        out["plans"] = await rows(Treatment, Treatment.status == "planned")
        # Completed procedures = completed treatments + lines billed straight onto an invoice (as in the admin's view).
        done = await rows(Treatment, Treatment.status == "completed")
        billed = await session.scalars(
            select(InvoiceItem).join(Invoice).where(Invoice.patient_id == pid, Invoice.status == "active",
                                                    InvoiceItem.treatment_id.is_(None)).limit(100))
        done += [{"id": f"bill-{x.id}", "name": x.name, "date": x.date.isoformat(), "teeth": x.teeth,
                  "doctor": doctors.get(x.doctor_id)} for x in billed]
        out["procedures"] = sorted(done, key=lambda t: str(t["date"]), reverse=True)
    if share["billing"]:
        invoices = await session.scalars(select(Invoice).where(Invoice.patient_id == pid, Invoice.status == "active")
                                         .order_by(Invoice.date.desc()).limit(100))
        out["invoices"] = [{"id": str(i.id), "number": i.number, "date": i.date.isoformat(), "total": i.total, "paid": i.paid,
                            "due": i.total - i.paid, "items": [x.name for x in i.items]} for i in invoices]
        out["payments"] = await rows(Payment)
    return out


@router.post("/me/records", status_code=201)
async def add_my_record(session: SessionDep, form: RecordForm = Depends(), patient_id: str = Depends(current_patient)):
    return await add_record(session, form, patient_id, "patient")


@router.delete("/me/records/{record_id}")
async def delete_record(record_id: int, session: SessionDep, patient_id: str = Depends(current_patient)):
    """A patient may remove what they added; the clinic's own entries stay."""
    row = (await session.execute(
        delete(Record).where(Record.id == record_id, Record.patient_id == patient_id, Record.added_by == "patient")
        .returning(Record.file)
    )).first()
    if not row:
        raise HTTPException(404, "That record cannot be removed.")
    await delete_upload(session, row.file)
    await session.commit()
    return {"ok": True}


# ---------------------------------------------------------------- appointments

@router.get("/slots")
async def free_slots(date: str, session: SessionDep):
    """Which times are still open on a given day, and which have passed."""
    try:
        day = dt.date.fromisoformat(date)
    except ValueError:
        raise HTTPException(400, "Use a date like 2026-09-30.")

    now = _now()
    hours = await load_hours(session)
    closed = hours.is_closed(day)
    taken = set(await session.scalars(select(Appointment.slot).where(Appointment.date == day, ACTIVE)))
    now_minutes = now.hour * 60 + now.minute

    sessions = []
    for s in hours.sessions(day):
        times = []
        for t in session_slots(s, APP_SLOT_MINUTES):
            passed = day == now.date() and minutes(t) <= now_minutes
            times.append({"time": t, "available": not closed and not passed and t not in taken})
        sessions.append({**{k: s[k] for k in ("id", "label", "range")}, "slots": times})

    return {"date": date, "closed": closed, "sessions": sessions}


@router.get("/me/appointments")
async def my_appointments(session: SessionDep, patient_id: str = Depends(current_patient)):
    patient = await _find_patient(session, patient_id)
    rows = await session.scalars(
        select(Appointment).where(_mine(patient)).order_by(Appointment.date.desc(), Appointment.slot.desc()).limit(200)
    )
    items = [serialize(a) for a in rows]

    today = _now().date().isoformat()
    upcoming = [a for a in items if a["date"] >= today and a.get("status") not in ("cancelled", "completed")]
    return {
        "upcoming": sorted(upcoming, key=lambda a: (a["date"], a["slot"])),
        "past": [a for a in items if a not in upcoming],
    }


@router.post("/me/appointments", status_code=201)
async def book(payload: AppBookingIn, session: SessionDep, background: BackgroundTasks,
               patient_id: str = Depends(current_patient)):
    patient = await _find_patient(session, patient_id)

    day, now = payload.date, _now()
    if day < now.date():
        raise HTTPException(400, "That date has already passed.")
    if day > (now + dt.timedelta(days=BOOKING_DAYS)).date():
        raise HTTPException(400, f"Appointments can be booked up to {BOOKING_DAYS} days ahead.")
    hours = await load_hours(session)
    if hours.is_closed(day):
        raise HTTPException(400, f"{DAY_NAMES[day.weekday()]}s are by prior appointment only — please call the clinic.")

    hour, minute = (int(x) for x in payload.slot.split(":"))
    if not hours.within(day, payload.slot):
        raise HTTPException(400, "That time is outside clinic hours.")
    if day == now.date() and (hour, minute) <= (now.hour, now.minute):
        raise HTTPException(400, "That time has already passed today.")

    # Serialise bookings for the same slot so two patients can't take it at once.
    await session.execute(select(func.pg_advisory_xact_lock(int(day.strftime("%Y%m%d")) * 10_000 + hour * 100 + minute)))
    if await session.scalar(select(Appointment.id).where(Appointment.date == day, Appointment.slot == payload.slot, ACTIVE).limit(1)):
        raise HTTPException(409, "That time has just been taken. Please choose another.")

    appt = Appointment(patient_id=patient_id, name=patient.name, phone=patient.phone, date=day, slot=payload.slot,
                       reason=payload.reason, notes=payload.notes, status="pending", source="app")
    session.add(appt)
    await session.commit()

    created = serialize(appt)
    background.add_task(whatsapp.notify_admins_new_appointment, appt.id)
    await broadcast_event("appointment_created", created)
    await broadcast_event("stats_updated")
    return created


@router.post("/me/appointments/{appointment_id}/cancel")
async def cancel(appointment_id: int, session: SessionDep, patient_id: str = Depends(current_patient)):
    patient = await _find_patient(session, patient_id)
    appt = (await session.execute(
        update(Appointment)
        .where(Appointment.id == appointment_id, _mine(patient), Appointment.status.in_(("pending", "confirmed")))
        .values(status="cancelled", updated_at=utcnow())
        .returning(Appointment)
    )).scalar_one_or_none()
    if not appt:
        raise HTTPException(404, "That appointment cannot be cancelled.")
    await session.commit()
    cancelled = serialize(appt)
    await broadcast_event("appointment_updated", cancelled)
    await broadcast_event("stats_updated")
    return cancelled
