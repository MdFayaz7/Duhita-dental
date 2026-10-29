"""Database schema. Change it here, then add an Alembic revision (see backend/README.md).

Trigram search indexes (*_trgm) are created by the first migration when pg_trgm is available."""
import datetime as dt

from decimal import Decimal

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Identity, Index, Integer, LargeBinary,
    Numeric, SmallInteger, Text, func, text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, deferred, mapped_column, relationship

# checked_in = waiting at the clinic, engaged = in the chair (Practo's Waiting / Engaged / Done).
STATUSES = ("pending", "confirmed", "checked_in", "engaged", "completed", "cancelled", "no_show")
STATUS_CHECK = "status IN ({})".format(", ".join(f"'{s}'" for s in STATUSES))


class Base(DeclarativeBase):
    pass


def pk() -> Mapped[int]:
    return mapped_column(BigInteger, Identity(always=False), primary_key=True)


def created() -> Mapped[dt.datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def extra() -> Mapped[dict]:
    """Free-form fields that have no column of their own."""
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
    alt_phone: Mapped[str | None] = mapped_column(Text)
    dob: Mapped[dt.date | None] = mapped_column(Date)
    # Practo's own patient number, so a re-import updates rather than duplicates.
    practo_id: Mapped[str | None] = mapped_column(Text, unique=True)
    source: Mapped[str | None] = mapped_column(Text)
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
        Index("ix_appointments_date_doctor", "date", "doctor_id"),
    )
    id: Mapped[int] = pk()
    patient_id: Mapped[str | None] = mapped_column(Text, index=True)
    name: Mapped[str] = mapped_column(Text)
    phone: Mapped[str] = mapped_column(Text, index=True)
    date: Mapped[dt.date] = mapped_column(Date)
    slot: Mapped[str] = mapped_column(Text)
    duration: Mapped[int] = mapped_column(SmallInteger, server_default="15", default=15)  # minutes
    # doctor_id drives the calendar; `doctor` keeps the name for older bookings and messages.
    doctor_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("doctors.id", ondelete="SET NULL"))
    doctor: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(Text)
    procedures: Mapped[str | None] = mapped_column(Text)
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
    active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), default=True)  # shown on the website
    in_calendar: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), default=True)
    color: Mapped[str | None] = mapped_column(Text)
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
    """Uploaded photos, PDFs and videos, served at /api/files/<id>."""
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


# ---------------------------------------------------------------- billing
# Money is NUMERIC(12,2) end to end (Decimal in Python): no float rounding on bills.

def money(default: str | None = "0") -> Mapped[Decimal]:
    return mapped_column(Numeric(12, 2), server_default=default, default=Decimal(default or 0), nullable=False)


class Procedure(Base):
    """The clinic's list of treatments and their standard fees (Practo's "Procedures" catalogue)."""
    __tablename__ = "procedures"
    __table_args__ = (Index("ix_procedures_name", text("lower(name)"), unique=True),)
    id: Mapped[int] = pk()
    name: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(Text)
    cost: Mapped[Decimal] = money()
    active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), default=True)
    created_at: Mapped[dt.datetime] = created()


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'cancelled')", name="ck_invoices_status"),
        Index("ix_invoices_patient_date", "patient_id", "date"),
        Index("ix_invoices_date", "date"),
    )
    id: Mapped[int] = pk()
    number: Mapped[int] = mapped_column(Integer, unique=True)  # the bill number printed on the invoice
    patient_id: Mapped[str] = mapped_column(Text)
    doctor_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("doctors.id", ondelete="SET NULL"))
    date: Mapped[dt.date] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, server_default="active", default="active")
    # Cached from the items on every save so lists and reports are one cheap query.
    subtotal: Mapped[Decimal] = money()
    discount: Mapped[Decimal] = money()
    tax: Mapped[Decimal] = money()
    total: Mapped[Decimal] = money()
    paid: Mapped[Decimal] = money()
    created_at: Mapped[dt.datetime] = created()
    updated_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    items: Mapped[list["InvoiceItem"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan", order_by="InvoiceItem.position", lazy="selectin")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    __table_args__ = (
        CheckConstraint("discount_type IN ('pct', 'inr')", name="ck_invoice_items_discount_type"),
        Index("ix_invoice_items_invoice", "invoice_id", "position"),
    )
    id: Mapped[int] = pk()
    invoice_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("invoices.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(SmallInteger, server_default="0", default=0)
    procedure_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("procedures.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(Text)
    doctor_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("doctors.id", ondelete="SET NULL"))
    date: Mapped[dt.date] = mapped_column(Date)
    teeth: Mapped[list[int]] = mapped_column(ARRAY(SmallInteger), server_default=text("'{}'"), default=list)
    unit_cost: Mapped[Decimal] = money()
    qty: Mapped[int] = mapped_column(SmallInteger, server_default="1", default=1)
    discount_value: Mapped[Decimal] = money()
    discount_type: Mapped[str] = mapped_column(Text, server_default="pct", default="pct")
    tax_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), server_default="0", default=Decimal(0))
    total: Mapped[Decimal] = money()
    notes: Mapped[str | None] = mapped_column(Text)
    # Set when the line was billed from a completed procedure, so it isn't listed twice.
    treatment_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("treatments.id", ondelete="SET NULL", name="fk_invoice_items_treatment_id", use_alter=True), index=True)
    invoice: Mapped[Invoice] = relationship(back_populates="items")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payments_amount"),
        CheckConstraint("mode IN ('cash', 'card', 'upi', 'cheque', 'bank', 'other')", name="ck_payments_mode"),
        Index("ix_payments_patient_date", "patient_id", "date"),
        Index("ix_payments_invoice", "invoice_id"),
    )
    id: Mapped[int] = pk()
    patient_id: Mapped[str] = mapped_column(Text)
    invoice_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("invoices.id", ondelete="SET NULL"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    mode: Mapped[str] = mapped_column(Text, server_default="cash", default="cash")
    reference: Mapped[str | None] = mapped_column(Text)
    date: Mapped[dt.date] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = created()


# ---------------------------------------------------------------- settings

class Setting(Base):
    """Small admin-editable settings (e.g. clinic_hours), one JSON value per key."""
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB)
    updated_at: Mapped[dt.datetime] = created()


# ---------------------------------------------------------------- EMR (Practo's patient record sections)

def patient_ref() -> Mapped[str]:
    return mapped_column(Text, index=True)


def doctor_ref() -> Mapped[int | None]:
    return mapped_column(BigInteger, ForeignKey("doctors.id", ondelete="SET NULL"))


class VitalSign(Base):
    __tablename__ = "vital_signs"
    id: Mapped[int] = pk()
    patient_id: Mapped[str] = patient_ref()
    date: Mapped[dt.date] = mapped_column(Date)
    doctor_id: Mapped[int | None] = doctor_ref()
    pulse: Mapped[int | None] = mapped_column(SmallInteger)
    temperature: Mapped[Decimal | None] = mapped_column(Numeric(4, 1))
    temperature_site: Mapped[str | None] = mapped_column(Text)
    bp_systolic: Mapped[int | None] = mapped_column(SmallInteger)
    bp_diastolic: Mapped[int | None] = mapped_column(SmallInteger)
    bp_position: Mapped[str | None] = mapped_column(Text)
    weight: Mapped[Decimal | None] = mapped_column(Numeric(5, 1))
    resp_rate: Mapped[int | None] = mapped_column(SmallInteger)
    created_at: Mapped[dt.datetime] = created()


class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    id: Mapped[int] = pk()
    patient_id: Mapped[str] = patient_ref()
    date: Mapped[dt.date] = mapped_column(Date)
    doctor_id: Mapped[int | None] = doctor_ref()
    complaints: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"), default=list)
    observations: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"), default=list)
    investigations: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"), default=list)
    diagnoses: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"), default=list)
    notes: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"), default=list)
    follow_up: Mapped[dt.date | None] = mapped_column(Date)
    created_at: Mapped[dt.datetime] = created()


class Treatment(Base):
    """A treatment-plan line; status 'completed' makes it a completed procedure (billable)."""
    __tablename__ = "treatments"
    __table_args__ = (
        CheckConstraint("status IN ('planned', 'completed')", name="ck_treatments_status"),
        CheckConstraint("discount_type IN ('pct', 'inr')", name="ck_treatments_discount_type"),
        Index("ix_treatments_status_date", "status", "date"),
    )
    id: Mapped[int] = pk()
    patient_id: Mapped[str] = patient_ref()
    date: Mapped[dt.date] = mapped_column(Date)
    doctor_id: Mapped[int | None] = doctor_ref()
    status: Mapped[str] = mapped_column(Text, server_default="planned", default="planned")
    procedure_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("procedures.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(Text)
    unit_cost: Mapped[Decimal] = money()
    qty: Mapped[int] = mapped_column(SmallInteger, server_default="1", default=1)
    discount_value: Mapped[Decimal] = money()
    discount_type: Mapped[str] = mapped_column(Text, server_default="pct", default="pct")
    total: Mapped[Decimal] = money()
    teeth: Mapped[list[int]] = mapped_column(ARRAY(SmallInteger), server_default=text("'{}'"), default=list)
    notes: Mapped[str | None] = mapped_column(Text)
    completed_on: Mapped[dt.date | None] = mapped_column(Date)
    created_at: Mapped[dt.datetime] = created()


class Prescription(Base):
    __tablename__ = "prescriptions"
    id: Mapped[int] = pk()
    patient_id: Mapped[str] = patient_ref()
    date: Mapped[dt.date] = mapped_column(Date)
    doctor_id: Mapped[int | None] = doctor_ref()
    # [{drug, strength, dose, frequency: "1-0-1", food, days, instructions}]
    items: Mapped[list[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), default=list)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = created()


class EmrTerm(Base):
    """Pick lists on the right of Practo's forms: complaints, observations, …, drugs and prescription templates."""
    __tablename__ = "emr_terms"
    __table_args__ = (Index("ix_emr_terms_kind_name", "kind", text("lower(name)"), unique=True),)
    id: Mapped[int] = pk()
    kind: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    data: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), default=dict)
    created_at: Mapped[dt.datetime] = created()


# ---------------------------------------------------------------- Practo archive
# The clinic's history exported from Practo, kept apart from the live tables and keyed by Practo's own patient number.
# Re-importing a file replaces that table's contents (see app/practo_archive.py).

class PractoPatient(Base):
    __tablename__ = "practo_patients"
    number: Mapped[str] = mapped_column(Text, primary_key=True)  # Practo "Patient Number"
    name: Mapped[str] = mapped_column(Text)
    mobile: Mapped[str | None] = mapped_column(Text, index=True)
    gender: Mapped[str | None] = mapped_column(Text)
    age: Mapped[int | None] = mapped_column(SmallInteger)
    dob: Mapped[dt.date | None] = mapped_column(Date)
    email: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    data: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), default=dict)  # every other column
    # Refreshed after every import, so the list can show patients with history first, latest visit on top.
    last_visit: Mapped[dt.date | None] = mapped_column(Date)
    records: Mapped[int] = mapped_column(Integer, server_default="0", default=0)


def practo_number() -> Mapped[str | None]:
    return mapped_column(Text, index=True)


class PractoTreatment(Base):
    __tablename__ = "practo_treatments"
    id: Mapped[int] = pk()
    patient_number: Mapped[str | None] = practo_number()
    patient_name: Mapped[str | None] = mapped_column(Text)
    date: Mapped[dt.date | None] = mapped_column(Date)
    name: Mapped[str] = mapped_column(Text)
    teeth: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    qty: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    discount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    discount_type: Mapped[str | None] = mapped_column(Text)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    doctor: Mapped[str | None] = mapped_column(Text)


class PractoInvoiceLine(Base):
    __tablename__ = "practo_invoice_lines"
    id: Mapped[int] = pk()
    patient_number: Mapped[str | None] = practo_number()
    patient_name: Mapped[str | None] = mapped_column(Text)
    date: Mapped[dt.date | None] = mapped_column(Date)
    doctor: Mapped[str | None] = mapped_column(Text)
    invoice_number: Mapped[str | None] = mapped_column(Text)
    treatment: Mapped[str | None] = mapped_column(Text)
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    qty: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    discount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    discount_type: Mapped[str | None] = mapped_column(Text)
    tax_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    cancelled: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), default=False)
    notes: Mapped[str | None] = mapped_column(Text)


class PractoPayment(Base):
    __tablename__ = "practo_payments"
    id: Mapped[int] = pk()
    patient_number: Mapped[str | None] = practo_number()
    patient_name: Mapped[str | None] = mapped_column(Text)
    date: Mapped[dt.date | None] = mapped_column(Date)
    receipt_number: Mapped[str | None] = mapped_column(Text)
    treatment: Mapped[str | None] = mapped_column(Text)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    invoice_number: Mapped[str | None] = mapped_column(Text)
    mode: Mapped[str | None] = mapped_column(Text)
    cancelled: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), default=False)
    notes: Mapped[str | None] = mapped_column(Text)
