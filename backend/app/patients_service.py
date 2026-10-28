"""Patient helpers shared by the website/admin routes and the patient app."""
import datetime as dt
from zoneinfo import ZoneInfo

from fastapi import File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy import Integer, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .db import serialize
from .models import AppRecordIn
from .tables import Patient, Record
from .uploads import IMAGE_TYPES, PDF_TYPES, save_upload

IST = ZoneInfo("Asia/Kolkata")


def today_ist() -> dt.date:
    return dt.datetime.now(IST).date()


async def add_patient(session: AsyncSession, patient: Patient) -> Patient:
    """Insert a patient with the next ID `DDC<yymmdd><N>`: the registration date, then a running number N that
    restarts at 1 every month (DDC2610281 = first patient of October 2026, registered on the 28th)."""
    now = dt.datetime.now(IST)
    month = f"DDC{now:%y%m}"
    # One allocator at a time, so two desks registering together can't get the same N.
    await session.execute(select(func.pg_advisory_xact_lock(7_340_002)))
    taken = await session.scalar(
        select(func.max(func.substr(Patient.patient_id, 10).cast(Integer)))
        .where(Patient.patient_id.op("~")(f"^{month}[0-9]{{2}}[0-9]+$")))
    patient.patient_id = f"DDC{now:%y%m%d}{(taken or 0) + 1}"
    try:
        async with session.begin_nested():
            session.add(patient)
    except IntegrityError:
        raise HTTPException(409, "That patient ID was just taken. Please try again.")
    return patient


class RecordForm:
    """Multipart fields for adding a record, shared by the clinic and the patient app."""

    def __init__(
        self,
        kind: str = Form("report"),
        title: str = Form(...),
        notes: str = Form(""),
        date: str = Form(""),
        file: UploadFile | None = File(None),
    ):
        try:
            self.data = AppRecordIn(kind=kind, title=title, notes=notes or None, date=date or None)
        except ValidationError as exc:
            raise HTTPException(422, exc.errors(include_url=False, include_context=False))
        self.file = file


async def add_record(session: AsyncSession, form: RecordForm, patient_id: str, added_by: str) -> dict:
    record = Record(**form.data.model_dump(), patient_id=patient_id, added_by=added_by)
    record.date = record.date or today_ist()
    if form.file is not None and form.file.filename:
        is_pdf = (form.file.content_type or "").endswith("pdf")
        record.file = await save_upload(session, form.file, "records", PDF_TYPES if is_pdf else IMAGE_TYPES)
        record.file_type = "pdf" if is_pdf else "image"
    session.add(record)
    await session.commit()
    return serialize(record)
