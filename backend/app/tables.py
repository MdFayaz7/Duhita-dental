"""Database schema. Change it here, then add an Alembic revision (see backend/README.md).

Trigram search indexes (*_trgm) are created by the first migration when pg_trgm is available."""
import datetime as dt

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Date, DateTime, Identity, Index, Integer, LargeBinary, SmallInteger,
    Text, func, text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, deferred, mapped_column

STATUSES = ("pending", "confirmed", "completed", "cancelled", "no_show")
STATUS_CHECK = "status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')"


class Base(DeclarativeBase):
    pass


def pk() -> Mapped[int]:
    return mapped_column(BigInteger, Identity(always=False), primary_key=True)


def created() -> Mapped[dt.datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def extra() -> Mapped[dict]:
    """Fields carried over from the old Mongo documents that have no column of their own."""
    return mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False, default=dict)


class Admin(Base):
    __tablename__ = "admins"
    id: Mapped[int] = pk()
    username: Mapped[str] = mapped_column(Text, unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = created()


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (
        Index("ix_patients_created_at", "created_at"),
    )
    id: Mapped[int] = pk()
    patient_id: Mapped[str] = mapped_column(Text, unique=True)
    name: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(Text, index=True)
    age: Mapped[int | None] = mapped_column(SmallInteger)
    sex: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    referral: Mapped[str | None] = mapped_column(Text)
    referral_name: Mapped[str | None] = mapped_column(Text)
    profession: Mapped[str | None] = mapped_column(Text)
    complaint: Mapped[str | None] = mapped_column(Text)
    conditions: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"), default=list)
    condition_notes: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), default=dict)
    pregnant: Mapped[str | None] = mapped_column(Text)
    allergies: Mapped[str | None] = mapped_column(Text)
    medications: Mapped[str | None] = mapped_column(Text)
    blood_group: Mapped[str | None] = mapped_column(Text)
    emergency_contact: Mapped[str | None] = mapped_column(Text)
    emergency_phone: Mapped[str | None] = mapped_column(Text)
    photo: Mapped[str | None] = mapped_column(Text)
    password_hash: Mapped[str | None] = mapped_column(Text)
    app_user: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), default=False)
    created_at: Mapped[dt.datetime] = created()
    updated_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    extra: Mapped[dict] = extra()


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        CheckConstraint(STATUS_CHECK, name="ck_appointments_status"),
        Index("ix_appointments_date_slot", "date", "slot"),
        Index("ix_appointments_status", "status"),
        Index("ix_appointments_created_at", "created_at"),
    )
    id: Mapped[int] = pk()
    patient_id: Mapped[str | None] = mapped_column(Text, index=True)
    name: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(Text, index=True)
    date: Mapped[dt.date] = mapped_column(Date)
    slot: Mapped[str] = mapped_column(Text)
    doctor: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, server_default="pending", default="pending")
    source: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = created()
    updated_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    confirmed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    admin_notified_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    patient_notified_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    extra: Mapped[dict] = extra()


class ScheduleEntry(Base):
    __tablename__ = "schedule"
    __table_args__ = (
        CheckConstraint(STATUS_CHECK, name="ck_schedule_status"),
        Index("ix_schedule_date_priority", "date", "priority", "time_from"),
    )
    id: Mapped[int] = pk()
    date: Mapped[dt.date] = mapped_column(Date)
    time_from: Mapped[str] = mapped_column(Text)
    time_to: Mapped[str | None] = mapped_column(Text)
    patient_name: Mapped[str] = mapped_column(Text)
    patient_id: Mapped[str | None] = mapped_column(Text)
    doctor: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, server_default="pending", default="pending")
    notes: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[int] = mapped_column(Integer, server_default="1", default=1)
    created_at: Mapped[dt.datetime] = created()
    extra: Mapped[dict] = extra()


class Doctor(Base):
    __tablename__ = "doctors"
    __table_args__ = (Index("ix_doctors_order", "order", "name"),)
    id: Mapped[int] = pk()
    name: Mapped[str] = mapped_column(Text)
    qualification: Mapped[str | None] = mapped_column(Text)
    speciality: Mapped[str | None] = mapped_column(Text)
    experience_years: Mapped[int | None] = mapped_column(Integer)
    bio: Mapped[str | None] = mapped_column(Text)
    photo: Mapped[str | None] = mapped_column(Text)
    order: Mapped[int] = mapped_column(Integer, server_default="0", default=0)
    active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), default=True)
    created_at: Mapped[dt.datetime] = created()
    extra: Mapped[dict] = extra()


class Research(Base):
    __tablename__ = "research"
    id: Mapped[int] = pk()
    title: Mapped[str] = mapped_column(Text)
    authors: Mapped[str] = mapped_column(Text)
    publication: Mapped[str | None] = mapped_column(Text)
    year: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    file: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = created()
    extra: Mapped[dict] = extra()


class GalleryImage(Base):
    __tablename__ = "gallery"
    __table_args__ = (Index("ix_gallery_category_order", "category", "order", "created_at"),)
    id: Mapped[int] = pk()
    category: Mapped[str] = mapped_column(Text)
    caption: Mapped[str] = mapped_column(Text, server_default="", default="")
    src: Mapped[str] = mapped_column(Text)
    source_name: Mapped[str | None] = mapped_column(Text)
    order: Mapped[int] = mapped_column(Integer, server_default="0", default=0)
    created_at: Mapped[dt.datetime] = created()
    extra: Mapped[dict] = extra()


class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = (Index("ix_feedback_order", "order", "created_at"),)
    id: Mapped[int] = pk()
    patient_name: Mapped[str] = mapped_column(Text, server_default="", default="")
    caption: Mapped[str] = mapped_column(Text, server_default="", default="")
    src: Mapped[str] = mapped_column(Text)
    poster: Mapped[str | None] = mapped_column(Text)
    cloud_id: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), default=True)
    order: Mapped[int] = mapped_column(Integer, server_default="0", default=0)
    created_at: Mapped[dt.datetime] = created()
    extra: Mapped[dict] = extra()


class Record(Base):
    __tablename__ = "records"
    __table_args__ = (Index("ix_records_patient_date", "patient_id", "date", "created_at"),)
    id: Mapped[int] = pk()
    patient_id: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(Text, server_default="report", default="report")
    title: Mapped[str] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    date: Mapped[dt.date | None] = mapped_column(Date)
    added_by: Mapped[str] = mapped_column(Text)
    file: Mapped[str | None] = mapped_column(Text)
    file_type: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = created()
    extra: Mapped[dict] = extra()


class StoredFile(Base):
    """Uploaded photos, PDFs and videos, served at /api/files/<id>. Ids carried over from GridFS keep their URLs."""
    __tablename__ = "files"
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    filename: Mapped[str] = mapped_column(Text)
    content_type: Mapped[str] = mapped_column(Text)
    folder: Mapped[str | None] = mapped_column(Text)
    size: Mapped[int] = mapped_column(BigInteger)
    data: Mapped[bytes] = deferred(mapped_column(LargeBinary, nullable=False))
    created_at: Mapped[dt.datetime] = created()


class WhatsAppMessage(Base):
    """Every WhatsApp message sent or received: delivery status for debugging, and webhook de-duplication."""
    __tablename__ = "whatsapp_messages"
    id: Mapped[int] = pk()
    wa_message_id: Mapped[str | None] = mapped_column(Text, unique=True)
    direction: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(Text)
    appointment_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    status: Mapped[str] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), default=dict)
    created_at: Mapped[dt.datetime] = created()
    updated_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
