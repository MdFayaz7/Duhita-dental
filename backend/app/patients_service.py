"""Patient helpers shared by the website/admin routes and the patient app."""
import datetime as dt
import secrets
from zoneinfo import ZoneInfo

from fastapi import File, Form, HTTPException, UploadFile
from pydantic import ValidationError
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
    """Insert a patient with a fresh `DDyymm-nnnn` ID; the unique index settles any collision."""
    stamp = dt.datetime.now(IST).strftime("%y%m")
    for _ in range(25):
        patient.patient_id = f"DD{stamp}-{1000 + secrets.randbelow(9000)}"
        try:
            async with session.begin_nested():
                session.add(patient)
            return patient
        except IntegrityError:
            continue
    raise HTTPException(500, "Could not allocate a patient ID. Please try again.")


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
