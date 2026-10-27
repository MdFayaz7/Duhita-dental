"""Billing: the procedure fee list, invoices with treatment lines, payments, and the patient timeline."""
import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError

from ..billing import build_items, refresh_paid
from ..db import SessionDep, contains, serialize, utcnow
from ..events import broadcast_event
from ..models import InvoiceIn, PaymentIn, ProcedureIn
from ..patients_service import today_ist
from ..security import current_admin
from ..tables import (
    Appointment, ClinicalNote, Doctor, Invoice, InvoiceItem, Patient, Payment, Prescription, Procedure, Record, Treatment,
    VitalSign,
)

router = APIRouter(tags=["billing"], dependencies=[Depends(current_admin)])

PATIENT_FIELDS = (Patient.patient_id, Patient.name, Patient.phone, Patient.age, Patient.sex, Patient.address)


async def _patient(session, patient_id: str) -> dict:
    row = (await session.execute(select(*PATIENT_FIELDS).where(Patient.patient_id == patient_id.strip().upper()))).first()
    if not row:
        raise HTTPException(404, "Patient not found.")
    return row._asdict()


async def _invoice(session, invoice_id: int, lock: bool = False) -> Invoice:
    invoice = await session.get(Invoice, invoice_id, with_for_update=lock)
    if not invoice:
        raise HTTPException(404, "Invoice not found.")
    return invoice


async def _doctor_ids_exist(session, payload: InvoiceIn) -> None:
    wanted = {i.doctor_id for i in payload.items if i.doctor_id} | ({payload.doctor_id} if payload.doctor_id else set())
    if wanted:
        found = set(await session.scalars(select(Doctor.id).where(Doctor.id.in_(wanted))))
        if wanted - found:
            raise HTTPException(404, "Doctor not found.")


def _out(invoice: Invoice, payments: list[Payment] | None = None, patient: dict | None = None) -> dict:
    out = serialize(invoice)
    out["due"] = invoice.total - invoice.paid
    out["items"] = [serialize(i) for i in invoice.items]
    if payments is not None:
        out["payments"] = [serialize(p) for p in payments]
    if patient is not None:
        out["patient"] = patient
    return out


async def _full(session, invoice: Invoice) -> dict:
    payments = (await session.scalars(
        select(Payment).where(Payment.invoice_id == invoice.id).order_by(Payment.date, Payment.id))).all()
    return _out(invoice, payments, await _patient(session, invoice.patient_id))


async def _changed(invoice: Invoice) -> None:
    await broadcast_event("billing_updated", {"patient_id": invoice.patient_id, "invoice_id": str(invoice.id)})


# ---------------------------------------------------------------- procedures (fee list)

@router.get("/api/procedures")
async def list_procedures(session: SessionDep, include_inactive: bool = False):
    stmt = select(Procedure).order_by(func.lower(Procedure.name)).limit(2000)
    if not include_inactive:
        stmt = stmt.where(Procedure.active.is_(True))
    return {"items": [serialize(p) for p in await session.scalars(stmt)]}


@router.post("/api/procedures", status_code=201)
async def create_procedure(payload: ProcedureIn, session: SessionDep):
    procedure = Procedure(**payload.model_dump())
    session.add(procedure)
    try:
        await session.commit()
    except IntegrityError:
        raise HTTPException(409, f"“{payload.name}” is already in the list.")
    return serialize(procedure)


@router.patch("/api/procedures/{procedure_id}")
async def update_procedure(procedure_id: int, payload: ProcedureIn, session: SessionDep):
    procedure = await session.get(Procedure, procedure_id)
    if not procedure:
        raise HTTPException(404, "Procedure not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(procedure, key, value)
    try:
        await session.commit()
    except IntegrityError:
        raise HTTPException(409, f"“{payload.name}” is already in the list.")
    return serialize(procedure)


@router.delete("/api/procedures/{procedure_id}")
async def delete_procedure(procedure_id: int, session: SessionDep):
    """Old invoices keep the procedure's name on their lines, so removing it from the list is safe."""
    if (await session.execute(delete(Procedure).where(Procedure.id == procedure_id))).rowcount == 0:
        raise HTTPException(404, "Procedure not found.")
    await session.commit()
    return {"ok": True}


# ---------------------------------------------------------------- invoices

async def _next_number(session) -> int:
    return (await session.scalar(select(func.coalesce(func.max(Invoice.number), 0)))) + 1


@router.get("/api/invoices/next-number")
async def next_number(session: SessionDep):
    return {"number": await _next_number(session)}


@router.get("/api/invoices")
async def list_invoices(
    session: SessionDep,
    patient_id: str | None = None,
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
    due_only: bool = False,
    q: str | None = None,
    limit: int = Query(50, le=500),
    skip: int = Query(0, ge=0),
):
    filters = [Invoice.status == "active"]
    if patient_id:
        filters.append(Invoice.patient_id == patient_id.strip().upper())
    if date_from:
        filters.append(Invoice.date >= date_from)
    if date_to:
        filters.append(Invoice.date <= date_to)
    if due_only:
        filters.append(Invoice.total > Invoice.paid)
    if q and q.strip():
        term = q.strip()
        matches = [contains(Patient.name, term), contains(Patient.phone, term), contains(Invoice.patient_id, term)]
        if term.isdigit():
            matches.append(Invoice.number == int(term))
        filters.append(or_(*matches))

    base = select(Invoice).join(Patient, Patient.patient_id == Invoice.patient_id, isouter=True).where(*filters)
    summary = (await session.execute(
        select(func.count(), func.coalesce(func.sum(Invoice.total), 0), func.coalesce(func.sum(Invoice.paid), 0))
        .select_from(base.subquery())
    )).one()
    rows = (await session.execute(
        base.add_columns(Patient.name.label("patient_name"), Patient.phone.label("patient_phone"))
        .order_by(Invoice.date.desc(), Invoice.number.desc()).offset(skip).limit(limit)
    )).all()
    return {
        "total": summary[0],
        "summary": {"billed": summary[1], "received": summary[2], "due": summary[1] - summary[2]},
        "items": [{**_out(r.Invoice), "patient_name": r.patient_name, "patient_phone": r.patient_phone} for r in rows],
    }


@router.get("/api/invoices/{invoice_id}")
async def get_invoice(invoice_id: int, session: SessionDep):
    return await _full(session, await _invoice(session, invoice_id))


async def _save(session, invoice: Invoice, payload: InvoiceIn) -> None:
    await _doctor_ids_exist(session, payload)
    items, totals = build_items(payload.items)
    if totals["total"] < invoice.paid:
        raise HTTPException(400, f"The new total is less than the ₹{invoice.paid} already received. Remove a payment first.")
    if payload.number is None:
        # Serialise "next number" so two desks saving at once can't pick the same one.
        await session.execute(select(func.pg_advisory_xact_lock(7_340_001)))
        invoice.number = invoice.number or await _next_number(session)
    else:
        invoice.number = payload.number
    invoice.patient_id = payload.patient_id.strip().upper()
    invoice.doctor_id = payload.doctor_id or next((i.doctor_id for i in payload.items if i.doctor_id), None)
    invoice.date, invoice.notes = payload.date, payload.notes
    invoice.items = items
    for key, value in totals.items():
        setattr(invoice, key, value)
    session.add(invoice)  # only once complete, so no half-filled row is ever flushed
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(409, f"Bill number {payload.number} is already used. Choose another.")


@router.post("/api/invoices", status_code=201)
async def create_invoice(payload: InvoiceIn, session: SessionDep):
    await _patient(session, payload.patient_id)
    invoice = Invoice(paid=Decimal(0))
    await _save(session, invoice, payload)
    await _changed(invoice)
    return await _full(session, invoice)


@router.put("/api/invoices/{invoice_id}")
async def update_invoice(invoice_id: int, payload: InvoiceIn, session: SessionDep):
    invoice = await _invoice(session, invoice_id, lock=True)
    if invoice.status == "cancelled":
        raise HTTPException(400, "This invoice was cancelled.")
    if payload.patient_id.strip().upper() != invoice.patient_id:
        raise HTTPException(400, "An invoice can't be moved to another patient.")
    invoice.updated_at = utcnow()
    await _save(session, invoice, payload)
    await _changed(invoice)
    return await _full(session, invoice)


@router.post("/api/invoices/{invoice_id}/cancel")
async def cancel_invoice(invoice_id: int, session: SessionDep):
    """Keeps the bill number used (as accountants expect) but takes it out of totals and dues."""
    invoice = await _invoice(session, invoice_id, lock=True)
    if invoice.paid > 0:
        raise HTTPException(400, "Remove this invoice's payments before cancelling it.")
    invoice.status, invoice.updated_at = "cancelled", utcnow()
    await session.commit()
    await _changed(invoice)
    return await _full(session, invoice)


@router.delete("/api/invoices/{invoice_id}")
async def delete_invoice(invoice_id: int, session: SessionDep):
    invoice = await _invoice(session, invoice_id, lock=True)
    if invoice.paid > 0:
        raise HTTPException(400, "Remove this invoice's payments before deleting it.")
    await session.delete(invoice)
    await session.commit()
    await _changed(invoice)
    return {"ok": True}


# ---------------------------------------------------------------- payments

@router.post("/api/invoices/{invoice_id}/payments", status_code=201)
async def add_payment(invoice_id: int, payload: PaymentIn, session: SessionDep):
    invoice = await _invoice(session, invoice_id, lock=True)
    if invoice.status == "cancelled":
        raise HTTPException(400, "This invoice was cancelled.")
    due = invoice.total - invoice.paid
    if payload.amount > due:
        raise HTTPException(400, f"Only ₹{due} is due on this invoice.")
    session.add(Payment(**payload.model_dump(exclude={"date"}), date=payload.date or today_ist(),
                        patient_id=invoice.patient_id, invoice_id=invoice.id))
    await session.flush()
    await refresh_paid(session, invoice)
    await session.commit()
    await _changed(invoice)
    return await _full(session, invoice)


@router.delete("/api/payments/{payment_id}")
async def delete_payment(payment_id: int, session: SessionDep):
    payment = await session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(404, "Payment not found.")
    invoice = await session.get(Invoice, payment.invoice_id, with_for_update=True) if payment.invoice_id else None
    await session.delete(payment)
    await session.flush()
    if invoice:
        await refresh_paid(session, invoice)
    await session.commit()
    if invoice:
        await _changed(invoice)
    return {"ok": True}


# ---------------------------------------------------------------- patient billing & timeline

@router.get("/api/patients/{patient_id}/billing")
async def patient_billing(patient_id: str, session: SessionDep):
    patient = await _patient(session, patient_id)
    pid = patient["patient_id"]
    invoices = (await session.scalars(
        select(Invoice).where(Invoice.patient_id == pid).order_by(Invoice.date.desc(), Invoice.number.desc()).limit(500))).all()
    payments = (await session.scalars(
        select(Payment).where(Payment.patient_id == pid).order_by(Payment.date.desc(), Payment.id.desc()).limit(500))).all()
    active = [i for i in invoices if i.status == "active"]
    billed, received = sum((i.total for i in active), Decimal(0)), sum((i.paid for i in active), Decimal(0))
    return {
        "patient": patient,
        "summary": {"billed": billed, "received": received, "due": billed - received},
        "invoices": [_out(i) for i in invoices],
        "payments": [serialize(p) for p in payments],
    }


@router.get("/api/patients/{patient_id}/timeline")
async def patient_timeline(patient_id: str, session: SessionDep):
    """Everything that happened for a patient, newest first — like Practo's patient timeline."""
    patient = await _patient(session, patient_id)
    pid = patient["patient_id"]
    doctors = dict((await session.execute(select(Doctor.id, Doctor.name))).tuples().all())

    invoices = (await session.scalars(select(Invoice).where(Invoice.patient_id == pid).limit(500))).all()
    payments = (await session.scalars(select(Payment).where(Payment.patient_id == pid).limit(500))).all()
    appointments = (await session.scalars(select(Appointment).where(Appointment.patient_id == pid).limit(500))).all()
    records = (await session.scalars(select(Record).where(Record.patient_id == pid).limit(500))).all()
    vitals = (await session.scalars(select(VitalSign).where(VitalSign.patient_id == pid).limit(500))).all()
    notes = (await session.scalars(select(ClinicalNote).where(ClinicalNote.patient_id == pid).limit(500))).all()
    prescriptions = (await session.scalars(select(Prescription).where(Prescription.patient_id == pid).limit(500))).all()
    billed = {i.treatment_id for inv in invoices if inv.status == "active" for i in inv.items}
    treatments = (await session.scalars(select(Treatment).where(Treatment.patient_id == pid).limit(500))).all()
    numbers = {i.id: i.number for i in invoices}

    events = []
    for inv in invoices:
        events.append({"type": "invoice", "date": inv.date, "at": inv.created_at, "id": str(inv.id), "number": inv.number,
                       "status": inv.status, "total": inv.total, "paid": inv.paid, "due": inv.total - inv.paid,
                       "items": [i.name for i in inv.items]})
        if inv.status == "active":
            for item in inv.items:
                events.append({"type": "procedure", "date": item.date, "at": inv.created_at, "id": f"{inv.id}-{item.id}",
                               "name": item.name, "teeth": item.teeth, "doctor": doctors.get(item.doctor_id),
                               "doctor_id": item.doctor_id, "notes": item.notes})
    for pay in payments:
        events.append({"type": "payment", "date": pay.date, "at": pay.created_at, "id": str(pay.id), "amount": pay.amount,
                       "mode": pay.mode, "reference": pay.reference, "invoice_number": numbers.get(pay.invoice_id)})
    for appt in appointments:
        events.append({"type": "appointment", "date": appt.date, "at": appt.created_at, "id": str(appt.id),
                       "slot": appt.slot, "status": appt.status, "doctor": doctors.get(appt.doctor_id) or appt.doctor,
                       "doctor_id": appt.doctor_id, "procedures": appt.procedures or appt.reason})
    for rec in records:
        events.append({"type": "record", "date": rec.date or rec.created_at.date(), "at": rec.created_at, "id": str(rec.id),
                       "title": rec.title, "kind": rec.kind, "file": rec.file, "file_type": rec.file_type})

    for t in treatments:
        if t.id in billed:
            continue  # shown through its invoice line
        events.append({"type": "procedure" if t.status == "completed" else "plan", "date": t.completed_on or t.date,
                       "at": t.created_at, "id": f"t{t.id}", "name": t.name, "teeth": t.teeth, "total": t.total,
                       "doctor": doctors.get(t.doctor_id), "doctor_id": t.doctor_id, "notes": t.notes})
    for v in vitals:
        events.append({"type": "vitals", **serialize(v), "date": v.date, "at": v.created_at,
                       "doctor": doctors.get(v.doctor_id)})
    for n in notes:
        events.append({"type": "note", **serialize(n), "date": n.date, "at": n.created_at, "doctor": doctors.get(n.doctor_id)})
    for rx in prescriptions:
        events.append({"type": "prescription", **serialize(rx), "date": rx.date, "at": rx.created_at,
                       "doctor": doctors.get(rx.doctor_id)})

    # Within a day, Practo shows the bill on top, then payments, then what was done.
    order = {"invoice": 0, "payment": 1, "procedure": 2, "plan": 3, "note": 4, "vitals": 5, "prescription": 6,
             "appointment": 7, "record": 8}
    events.sort(key=lambda e: (e["date"], -order[e["type"]], e["at"]), reverse=True)
    for e in events:
        e["date"] = e["date"].isoformat()
        e.pop("at")
    return {"patient": patient, "events": events}
