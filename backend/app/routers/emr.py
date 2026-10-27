"""Patient record (Practo's EMR): vital signs, clinical notes, treatment plans / completed procedures, prescriptions,
their pick lists, plus patient groups, profile edits, merging and communications."""
import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, literal, or_, select, union_all, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError

from ..billing import line_amounts
from ..db import SessionDep, serialize, utcnow
from ..events import broadcast_event
from ..models import (
    BillTreatmentsIn, ClinicalNoteIn, ShareIn, EmrTermIn, InvoiceIn, InvoiceItemIn, MergeIn, PatientUpdate, PrescriptionIn,
    TreatmentIn, VitalSignIn,
)
from ..patients_service import today_ist
from ..security import current_admin
from ..sharing import share_flags
from ..tables import (
    Appointment, ClinicalNote, EmrTerm, Invoice, InvoiceItem, Patient, Payment, Prescription, Record, ScheduleEntry,
    Treatment, VitalSign, WhatsAppMessage,
)
from .billing import _save as save_invoice

router = APIRouter(tags=["emr"], dependencies=[Depends(current_admin)])

PATIENT_COLS = (Patient.name.label("patient_name"), Patient.sex.label("patient_sex"), Patient.age.label("patient_age"))
NOTE_FIELDS = {"complaints": "complaint", "observations": "observation", "investigations": "investigation",
               "diagnoses": "diagnosis", "notes": "note"}
# Everything that points at a patient by their patient ID (moved over when two records are merged).
PATIENT_LINKED = (Appointment, ScheduleEntry, Record, Invoice, Payment, VitalSign, ClinicalNote, Treatment, Prescription)


async def _patient(session, patient_id: str) -> Patient:
    patient = await session.scalar(select(Patient).where(Patient.patient_id == patient_id.strip().upper()))
    if not patient:
        raise HTTPException(404, "Patient not found.")
    return patient


def _row(r) -> dict:
    """(Model, patient_name, patient_sex, patient_age) → JSON with the patient summary the all-patients views show."""
    return {**serialize(r[0]), "patient_name": r.patient_name, "patient_sex": r.patient_sex, "patient_age": r.patient_age}


async def _commit(session, patient_id: str) -> None:
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(400, "That doctor or procedure no longer exists.")
    await broadcast_event("emr_updated", {"patient_id": patient_id})


# ---------------------------------------------------------------- vitals, notes, prescriptions, treatments

def _values(model, payload) -> dict:
    data = payload.model_dump(exclude={"tax_pct", "treatment_id"})
    data["patient_id"] = data["patient_id"].strip().upper()
    data["date"] = data.get("date") or today_ist()
    if model is Treatment:
        data["total"] = line_amounts(InvoiceItemIn(**{**data, "date": data["date"]}))[3]
        data["completed_on"] = data["date"] if data["status"] == "completed" else None
    return data


async def _learn_terms(session, payload: ClinicalNoteIn) -> None:
    """New complaints, diagnoses, … typed into a note join the pick list for next time."""
    rows = [{"kind": kind, "name": term.strip()} for field, kind in NOTE_FIELDS.items() for term in getattr(payload, field)]
    if rows:
        await session.execute(insert(EmrTerm).values(rows).on_conflict_do_nothing())


def _crud(path: str, model, schema) -> None:
    @router.get(f"/api/emr/{path}", name=f"list_{path}")
    async def list_rows(session: SessionDep, patient_id: str | None = None, limit: int = Query(30, le=200),
                        skip: int = Query(0, ge=0), status: str | None = None):
        stmt = select(model, *PATIENT_COLS).join(Patient, Patient.patient_id == model.patient_id, isouter=True)
        if patient_id:
            stmt = stmt.where(model.patient_id == patient_id.upper())
        if status and model is Treatment:
            stmt = stmt.where(Treatment.status == status)
        rows = (await session.execute(stmt.order_by(model.date.desc(), model.id.desc()).offset(skip).limit(limit + 1))).all()
        return {"items": [_row(r) for r in rows[:limit]], "more": len(rows) > limit}

    @router.post(f"/api/emr/{path}", status_code=201, name=f"create_{path}")
    async def create(payload: schema, session: SessionDep):
        await _patient(session, payload.patient_id)
        row = model(**_values(model, payload))
        session.add(row)
        if model is ClinicalNote:
            await _learn_terms(session, payload)
        await _commit(session, row.patient_id)
        return serialize(row)

    @router.put(f"/api/emr/{path}/{{row_id}}", name=f"update_{path}")
    async def update_row(row_id: int, payload: schema, session: SessionDep):
        row = await session.get(model, row_id)
        if not row or row.patient_id != payload.patient_id.upper():
            raise HTTPException(404, "Not found.")
        if model is Treatment and await _billed(session, row_id):
            raise HTTPException(400, "This procedure is already on an invoice. Edit the invoice instead.")
        for key, value in _values(model, payload).items():
            setattr(row, key, value)
        if model is ClinicalNote:
            await _learn_terms(session, payload)
        await _commit(session, row.patient_id)
        return serialize(row)

    @router.delete(f"/api/emr/{path}/{{row_id}}", name=f"delete_{path}")
    async def delete_row(row_id: int, session: SessionDep):
        if model is Treatment and await _billed(session, row_id):
            raise HTTPException(400, "This procedure is on an invoice. Remove it from the invoice first.")
        patient_id = (await session.execute(delete(model).where(model.id == row_id).returning(model.patient_id))).scalar()
        if patient_id is None:
            raise HTTPException(404, "Not found.")
        await _commit(session, patient_id)
        return {"ok": True}


async def _billed(session, treatment_id: int) -> bool:
    return bool(await session.scalar(
        select(InvoiceItem.id).join(Invoice).where(InvoiceItem.treatment_id == treatment_id, Invoice.status == "active").limit(1)))


# Completed procedures = completed treatments + lines billed straight on an invoice (not from a treatment),
# so the list matches what was actually done whichever way the desk entered it.
@router.get("/api/emr/procedures/completed")
async def completed_procedures(session: SessionDep, patient_id: str | None = None,
                               limit: int = Query(30, le=200), skip: int = Query(0, ge=0)):
    billed = (select(InvoiceItem.invoice_id).join(Invoice)
              .where(InvoiceItem.treatment_id == Treatment.id, Invoice.status == "active").limit(1).scalar_subquery())
    cols = ("id", "date", "doctor_id", "name", "unit_cost", "qty", "discount_value", "discount_type", "total", "teeth", "notes")
    done = select(literal("treatment").label("source"), Treatment.patient_id, billed.label("invoice_id"),
                  *(getattr(Treatment, c) for c in cols)).where(Treatment.status == "completed")
    direct = (select(literal("invoice").label("source"), Invoice.patient_id, InvoiceItem.invoice_id,
                     *(getattr(InvoiceItem, c) for c in cols))
              .join(Invoice).where(Invoice.status == "active", InvoiceItem.treatment_id.is_(None)))
    if patient_id:
        done = done.where(Treatment.patient_id == patient_id.upper())
        direct = direct.where(Invoice.patient_id == patient_id.upper())
    u = union_all(done, direct).subquery()
    rows = (await session.execute(
        select(u, *PATIENT_COLS).join(Patient, Patient.patient_id == u.c.patient_id, isouter=True)
        .order_by(u.c.date.desc(), u.c.id.desc()).offset(skip).limit(limit + 1)
    )).mappings().all()
    items = [{**r, "id": f"{r['source'][0]}{r['id']}", "row_id": str(r["id"]), "date": r["date"].isoformat(),
              "invoice_id": str(r["invoice_id"]) if r["invoice_id"] else None} for r in rows[:limit]]
    return {"items": items, "more": len(rows) > limit}


@router.post("/api/emr/treatments/complete")
async def complete_treatments(payload: BillTreatmentsIn, session: SessionDep):
    today = today_ist()
    rows = (await session.execute(
        update(Treatment).where(Treatment.id.in_(payload.ids), Treatment.status == "planned")
        .values(status="completed", completed_on=today).returning(Treatment.patient_id))).scalars().all()
    await _commit(session, rows[0] if rows else "")
    return {"completed": len(rows)}


@router.post("/api/emr/treatments/invoice", status_code=201)
async def bill_treatments(payload: BillTreatmentsIn, session: SessionDep):
    """Raise one invoice from completed procedures (Practo's “Generate invoice”)."""
    rows = (await session.scalars(
        select(Treatment).where(Treatment.id.in_(payload.ids)).order_by(Treatment.date, Treatment.id))).all()
    if len(rows) != len(set(payload.ids)) or len({t.patient_id for t in rows}) != 1:
        raise HTTPException(400, "Pick procedures of one patient.")
    if any(t.status != "completed" for t in rows):
        raise HTTPException(400, "Only completed procedures can be billed.")
    for t in rows:
        if await _billed(session, t.id):
            raise HTTPException(400, f"{t.name} is already on an invoice.")
    invoice_in = InvoiceIn(patient_id=rows[0].patient_id, date=today_ist(), doctor_id=rows[0].doctor_id, items=[
        InvoiceItemIn(procedure_id=t.procedure_id, name=t.name, doctor_id=t.doctor_id, date=t.date, teeth=t.teeth,
                      unit_cost=t.unit_cost, qty=t.qty, discount_value=t.discount_value, discount_type=t.discount_type,
                      notes=t.notes, treatment_id=t.id) for t in rows])
    invoice = Invoice(paid=Decimal(0))
    await save_invoice(session, invoice, invoice_in)
    await broadcast_event("billing_updated", {"patient_id": invoice.patient_id})
    return {"id": str(invoice.id), "number": invoice.number}


for _path, _model, _schema in (("vitals", VitalSign, VitalSignIn), ("notes", ClinicalNote, ClinicalNoteIn),
                               ("treatments", Treatment, TreatmentIn), ("prescriptions", Prescription, PrescriptionIn)):
    _crud(_path, _model, _schema)


# ---------------------------------------------------------------- pick lists

@router.get("/api/emr/terms")
async def list_terms(session: SessionDep, kind: str):
    rows = await session.scalars(select(EmrTerm).where(EmrTerm.kind == kind).order_by(EmrTerm.created_at, EmrTerm.id))
    return {"items": [serialize(t) for t in rows]}


@router.post("/api/emr/terms", status_code=201)
async def add_term(payload: EmrTermIn, session: SessionDep):
    row = (await session.execute(
        insert(EmrTerm).values(kind=payload.kind, name=payload.name.strip(), data=payload.data)
        .on_conflict_do_nothing().returning(EmrTerm))).scalar()
    if not row:
        raise HTTPException(409, f"{payload.name} is already on the list.")
    await session.commit()
    return serialize(row)


@router.delete("/api/emr/terms/{term_id}")
async def delete_term(term_id: int, session: SessionDep):
    await session.execute(delete(EmrTerm).where(EmrTerm.id == term_id))
    await session.commit()
    return {"ok": True}


# ---------------------------------------------------------------- files across patients

@router.get("/api/emr/files")
async def files(session: SessionDep, patient_id: str | None = None, kind: str | None = None,
                limit: int = Query(30, le=200), skip: int = Query(0, ge=0)):
    stmt = select(Record, *PATIENT_COLS).join(Patient, Patient.patient_id == Record.patient_id, isouter=True)
    if patient_id:
        stmt = stmt.where(Record.patient_id == patient_id.upper())
    if kind:
        stmt = stmt.where(Record.kind == kind)
    rows = (await session.execute(stmt.order_by(Record.date.desc().nulls_last(), Record.id.desc())
                                  .offset(skip).limit(limit + 1))).all()
    labels = (await session.execute(
        select(Record.kind, func.count()).where(*([Record.patient_id == patient_id.upper()] if patient_id else []))
        .group_by(Record.kind))).all()
    return {"items": [_row(r) for r in rows[:limit]], "more": len(rows) > limit, "labels": dict(labels)}


# ---------------------------------------------------------------- patients: profile, merge, messages

@router.patch("/api/patients/{patient_id}")
async def update_patient(patient_id: str, payload: PatientUpdate, session: SessionDep):
    patient = await _patient(session, patient_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, key, value.strip() if isinstance(value, str) else value)
    patient.updated_at = utcnow()
    await session.commit()
    await broadcast_event("patient_updated", {"patient_id": patient.patient_id})
    return serialize(patient)


@router.put("/api/patients/{patient_id}/share")
async def set_share(patient_id: str, payload: ShareIn, session: SessionDep):
    """Turn sharing of one section to the patient's app account on or off."""
    patient = await _patient(session, patient_id)
    patient.extra = {**(patient.extra or {}), "share": {**share_flags(patient), payload.section: payload.on}}
    await session.commit()
    await broadcast_event("patient_updated", {"patient_id": patient.patient_id})
    return share_flags(patient)


@router.post("/api/patients/merge")
async def merge_patients(payload: MergeIn, session: SessionDep):
    """Move everything from `remove` onto `keep`, fill keep's blank details from it, then delete `remove`."""
    keep, remove = await _patient(session, payload.keep), await _patient(session, payload.remove)
    if keep.id == remove.id:
        raise HTTPException(400, "Pick two different patients.")
    for model in PATIENT_LINKED:
        await session.execute(update(model).where(model.patient_id == remove.patient_id).values(patient_id=keep.patient_id))
    for col in Patient.__table__.columns.keys():
        if col in ("id", "patient_id", "practo_id", "created_at", "extra") or getattr(keep, col) not in (None, "", []):
            continue
        setattr(keep, col, getattr(remove, col))
    practo_id = remove.practo_id
    await session.delete(remove)
    await session.flush()
    keep.practo_id = keep.practo_id or practo_id
    keep.updated_at = utcnow()
    await session.commit()
    await broadcast_event("patient_deleted", {"patient_id": remove.patient_id})
    await broadcast_event("stats_updated")
    return serialize(keep)


@router.get("/api/patients/{patient_id}/communications")
async def communications(patient_id: str, session: SessionDep):
    patient = await _patient(session, patient_id)
    phones = [p for p in (patient.phone, patient.alt_phone) if p]
    appts = select(Appointment.id).where(Appointment.patient_id == patient.patient_id)
    rows = await session.scalars(
        select(WhatsAppMessage).where(or_(
            WhatsAppMessage.phone.in_(phones + [f"91{p}" for p in phones]), WhatsAppMessage.appointment_id.in_(appts)))
        .order_by(WhatsAppMessage.created_at.desc()).limit(200))
    return {"items": [{**serialize(m), "channel": "WhatsApp", "text": _wa_text(m.payload)} for m in rows]}


def _wa_text(payload: dict) -> str | None:
    """Best-effort readable text of a stored WhatsApp payload (template name, body text or button reply)."""
    if not isinstance(payload, dict):
        return None
    if (t := payload.get("template")) and isinstance(t, dict):
        return f"Template: {t.get('name', '').replace('_', ' ')}"
    for key in ("text", "button", "interactive"):
        v = payload.get(key)
        if isinstance(v, dict):
            return v.get("body") or v.get("text") or v.get("title") or (v.get("button_reply") or {}).get("title")
        if isinstance(v, str):
            return v
    return None

