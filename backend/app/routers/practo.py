"""Practo archive: upload the four Practo exports, list Practo patients, and one patient's Practo history."""
from decimal import Decimal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import and_, delete, exists, func, or_, select, text

from ..db import SessionDep, contains, serialize
from ..models import PractoInvoiceLineEdit, PractoPaymentEdit, PractoTreatmentEdit
from ..practo_archive import KINDS, ArchiveError, parse, refresh_stats, replace
from ..security import current_admin
from ..tables import PractoInvoiceLine, PractoPatient, PractoPayment, PractoTreatment

router = APIRouter(prefix="/api/practo", tags=["practo"], dependencies=[Depends(current_admin)])

MAX_BYTES = 30 * 1024 * 1024


@router.post("/import")
async def import_archive(session: SessionDep, patients: UploadFile | None = File(None), treatments: UploadFile | None = File(None),
                         invoices: UploadFile | None = File(None), payments: UploadFile | None = File(None)):
    """Replace the archive tables for whichever files are sent. All are parsed before anything is written."""
    files = {k: f for k, f in zip(KINDS, (patients, treatments, invoices, payments)) if f is not None}
    if not files:
        raise HTTPException(400, "Choose at least one Practo export.")
    parsed = {}
    for kind, f in files.items():
        data = await f.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise HTTPException(413, f"{f.filename} is larger than 30 MB.")
        try:
            parsed[kind] = parse(kind, f.filename or kind, data)
        except ArchiveError as e:
            raise HTTPException(400, str(e))
        except Exception:
            raise HTTPException(400, f"{f.filename} could not be read. Upload the CSV or Excel file exactly as Practo exported it.")
    counts = {kind: await replace(session, kind, rows) for kind, rows in parsed.items()}
    await refresh_stats(session)
    await session.commit()
    return {"imported": counts}


@router.delete("")
async def clear_archive(session: SessionDep):
    """Empty the whole Practo archive (patients, treatments, invoices, payments). Live clinic data is untouched."""
    await session.execute(text("TRUNCATE practo_patients, practo_treatments, practo_invoice_lines, practo_payments"))
    await session.commit()
    return {"ok": True}


@router.get("/summary")
async def summary(session: SessionDep):
    counts = {"with_history": await session.scalar(select(func.count()).where(PractoPatient.records > 0))}
    for kind, table in (("patients", PractoPatient), ("treatments", PractoTreatment), ("invoices", PractoInvoiceLine), ("payments", PractoPayment)):
        counts[kind] = await session.scalar(select(func.count()).select_from(table))
    return counts


@router.get("/patients")
async def list_patients(session: SessionDep, q: str | None = None, limit: int = Query(40, le=200), skip: int = Query(0, ge=0)):
    stmt = select(PractoPatient, func.count().over().label("total"))
    if q and q.strip():
        stmt = stmt.where(or_(contains(PractoPatient.name, q), contains(PractoPatient.mobile, q), PractoPatient.number == q.strip()))
    # Patients with history first, latest visit on top; then the rest, newest Practo number first.
    order = (PractoPatient.last_visit.desc().nulls_last(), func.length(PractoPatient.number).desc(), PractoPatient.number.desc())
    rows = (await session.execute(stmt.order_by(*order).offset(skip).limit(limit))).all()
    return {"total": rows[0].total if rows else 0, "items": [_patient(r.PractoPatient) for r in rows]}


def _patient(p: PractoPatient) -> dict:
    out = {c: getattr(p, c) for c in ("number", "name", "mobile", "gender", "age", "email", "address", "records")}
    iso = lambda d: d.isoformat() if d else None  # noqa: E731
    return {**out, "dob": iso(p.dob), "last_visit": iso(p.last_visit), "details": p.data}


def _line_total(line: PractoInvoiceLine) -> Decimal:
    gross = (line.unit_cost or 0) * (line.qty or 1)
    off = gross * (line.discount or 0) / 100 if (line.discount_type or "PERCENT").upper() == "PERCENT" else (line.discount or 0)
    return round(gross - off, 2)


@router.get("/patients/{number}")
async def patient_history(number: str, session: SessionDep):
    """Everything Practo recorded for one patient number — read only."""
    patient = await session.get(PractoPatient, number)
    if not patient:
        raise HTTPException(404, "No Practo patient with that number.")

    # Rows whose patient number is blank or unknown to the patients export are matched by exact name — but only
    # when exactly one Practo patient has that name, so nothing is ever attached to the wrong person.
    name = patient.name.strip().lower()
    unique_name = await session.scalar(
        select(func.count()).select_from(PractoPatient).where(func.lower(func.trim(PractoPatient.name)) == name)) == 1

    async def rows(table, order):
        match = table.patient_number == number
        if unique_name:
            orphan = or_(table.patient_number.is_(None),
                         ~exists().where(PractoPatient.number == table.patient_number))
            match = or_(match, and_(func.lower(func.trim(table.patient_name)) == name, orphan))
        return (await session.scalars(select(table).where(match).order_by(*order))).all()

    treatments = await rows(PractoTreatment, (PractoTreatment.date.desc(), PractoTreatment.id))
    lines = await rows(PractoInvoiceLine, (PractoInvoiceLine.date.desc(), PractoInvoiceLine.id))
    payments = await rows(PractoPayment, (PractoPayment.date.desc(), PractoPayment.id))
    invoices = [{**serialize(l), "total": _line_total(l)} for l in lines]
    billed = sum((i["total"] for i in invoices if not i["cancelled"]), Decimal(0))
    paid = sum((p.amount or 0 for p in payments if not p.cancelled), Decimal(0))
    return {
        "patient": _patient(patient),
        "summary": {"billed": billed, "paid": paid, "due": billed - paid},
        "treatments": [serialize(t) for t in treatments],
        "invoices": invoices,
        "payments": [serialize(p) for p in payments],
    }


# ---------------------------------------------------------------- corrections to imported rows

EDITABLE = {"treatments": PractoTreatment, "invoices": PractoInvoiceLine, "payments": PractoPayment}


async def _save_edit(session, model, row_id: int, changes: dict) -> dict:
    row = await session.get(model, row_id)
    if not row:
        raise HTTPException(404, "That record no longer exists.")
    for key, value in changes.items():
        setattr(row, key, value.strip() if isinstance(value, str) else value)
    await session.flush()
    await refresh_stats(session)
    await session.commit()
    return serialize(row)


@router.patch("/treatments/{row_id}")
async def edit_treatment(row_id: int, payload: PractoTreatmentEdit, session: SessionDep):
    return await _save_edit(session, PractoTreatment, row_id, payload.model_dump(exclude_unset=True))


@router.patch("/invoices/{row_id}")
async def edit_invoice_line(row_id: int, payload: PractoInvoiceLineEdit, session: SessionDep):
    return await _save_edit(session, PractoInvoiceLine, row_id, payload.model_dump(exclude_unset=True))


@router.patch("/payments/{row_id}")
async def edit_payment(row_id: int, payload: PractoPaymentEdit, session: SessionDep):
    return await _save_edit(session, PractoPayment, row_id, payload.model_dump(exclude_unset=True))


@router.delete("/{kind}/{row_id}")
async def delete_row(kind: str, row_id: int, session: SessionDep):
    model = EDITABLE.get(kind)
    if model is None:
        raise HTTPException(404, "Unknown record type.")
    if (await session.execute(delete(model).where(model.id == row_id))).rowcount == 0:
        raise HTTPException(404, "That record no longer exists.")
    await refresh_stats(session)
    await session.commit()
    return {"ok": True}
