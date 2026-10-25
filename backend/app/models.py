import datetime as dt
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

# ---------- auth ----------

class LoginIn(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


# ---------- patient app (mobile) ----------

PHONE = r"^[6-9]\d{9}$"
SLOT = r"^([01]\d|2[0-3]):[0-5]\d$"


class AppRegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=PHONE)
    password: str = Field(min_length=6, max_length=72)
    # Optional: a patient who registered at the clinic or on the website can
    # quote their Patient ID so the app links to that exact record.
    patient_id: str | None = Field(default=None, max_length=20)
    age: int | None = Field(default=None, ge=0, le=120)
    sex: Literal["Male", "Female", "Other"] | None = None
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=400)


class AppLoginIn(BaseModel):
    phone: str = Field(pattern=PHONE)
    password: str = Field(min_length=1, max_length=72)


BloodGroup = Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


class AppProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    age: int | None = Field(default=None, ge=0, le=120)
    sex: Literal["Male", "Female", "Other"] | None = None
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=400)
    profession: str | None = Field(default=None, max_length=120)
    complaint: str | None = Field(default=None, max_length=800)
    # medical history the dentist needs to know before treating
    conditions: list[str] | None = None
    allergies: str | None = Field(default=None, max_length=400)
    medications: str | None = Field(default=None, max_length=400)
    blood_group: BloodGroup | None = None
    emergency_contact: str | None = Field(default=None, max_length=120)
    emergency_phone: str | None = Field(default=None, pattern=r"^$|^[6-9]\d{9}$")


RecordKind = Literal["prescription", "xray", "report", "note"]


class AppRecordIn(BaseModel):
    """A document a patient adds themselves — a report from elsewhere, an old X-ray."""
    kind: RecordKind = "report"
    title: str = Field(min_length=2, max_length=140)
    notes: str | None = Field(default=None, max_length=800)
    date: dt.date | None = None


class AppPasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=6, max_length=72)


class AppBookingIn(BaseModel):
    date: dt.date
    slot: str = Field(pattern=SLOT)
    reason: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=800)


# ---------- patients ----------

class PatientIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    age: int = Field(ge=0, le=120)
    sex: Literal["Male", "Female", "Other"]
    phone: str = Field(pattern=r"^[6-9]\d{9}$")
    address: str = Field(min_length=3, max_length=400)
    email: EmailStr | None = None
    referral: str | None = None
    referral_name: str | None = None
    profession: str | None = None
    conditions: list[str] = []
    condition_notes: dict[str, str] = {}
    pregnant: str | None = None
    complaint: str = Field(min_length=2, max_length=800)


class PatientOut(PatientIn):
    id: str
    patient_id: str
    created_at: dt.datetime


# ---------- appointments ----------

AppointmentStatus = Literal["pending", "confirmed", "checked_in", "engaged", "completed", "cancelled", "no_show"]
Category = Literal["high_priority", "telephonic", "walkin"]
Duration = Field(default=15, ge=5, le=240)


class AppointmentIn(BaseModel):
    patient_id: str | None = None
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=r"^[6-9]\d{9}$")
    date: dt.date
    slot: str = Field(pattern=SLOT)
    doctor: str | None = None
    reason: str | None = None
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    status: AppointmentStatus | None = None
    date: dt.date | None = None
    slot: str | None = Field(default=None, pattern=SLOT)
    duration: int | None = Field(default=None, ge=5, le=240)
    doctor_id: int | None = None
    doctor: str | None = None
    category: Category | Literal[""] | None = None
    procedures: str | None = Field(default=None, max_length=800)
    notes: str | None = None
    # Save even though the doctor already has someone at that time.
    force: bool = False


class NewPatientIn(BaseModel):
    """The few details the front desk takes when booking someone who isn't registered yet."""
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=PHONE)
    email: EmailStr | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    sex: Literal["Male", "Female", "Other"] | None = None


class AdminBookingIn(BaseModel):
    """An appointment made from the admin calendar, for an existing patient or a new one."""
    patient_id: str | None = None
    new_patient: NewPatientIn | None = None
    doctor_id: int | None = None
    date: dt.date
    slot: str = Field(pattern=SLOT)
    duration: int = Duration
    category: Category | None = None
    procedures: str | None = Field(default=None, max_length=800)
    notes: str | None = Field(default=None, max_length=800)
    status: AppointmentStatus = "confirmed"
    notify: bool = True  # WhatsApp the patient their confirmation
    force: bool = False


# ---------- daily schedule ----------

class ScheduleIn(BaseModel):
    date: dt.date
    time_from: str = Field(pattern=SLOT)
    time_to: str | None = Field(default=None, pattern=SLOT)
    patient_name: str
    patient_id: str | None = None
    doctor: str | None = None
    status: AppointmentStatus = "pending"
    notes: str | None = None
    priority: int = 1


class ScheduleUpdate(BaseModel):
    time_from: str | None = Field(default=None, pattern=SLOT)
    time_to: str | None = Field(default=None, pattern=SLOT)
    patient_name: str | None = None
    patient_id: str | None = None
    doctor: str | None = None
    status: AppointmentStatus | None = None
    notes: str | None = None
    priority: int | None = None


# ---------- doctors ----------

class DoctorIn(BaseModel):
    name: str
    qualification: str | None = None
    speciality: str | None = None
    experience_years: int | None = None
    bio: str | None = None
    photo: str | None = None
    order: int = 0
    active: bool = True
    in_calendar: bool = True
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


# ---------- research ----------

class ResearchIn(BaseModel):
    title: str
    authors: str
    publication: str | None = None
    year: str | None = None
    category: str | None = None
    description: str | None = None
    file: str | None = None


# ---------- gallery ----------

GalleryCategory = Literal["clinic", "infrastructure", "camps"]


class FeedbackUpdate(BaseModel):
    patient_name: str | None = None
    caption: str | None = None
    active: bool | None = None
    order: int | None = None


class GalleryUpdate(BaseModel):
    caption: str | None = None
    category: GalleryCategory | None = None
    order: int | None = None


# ---------- billing ----------

Money = Annotated[Decimal, Field(ge=0, le=Decimal("9999999.99"), max_digits=12, decimal_places=2)]
PaymentMode = Literal["cash", "card", "upi", "cheque", "bank", "other"]
# FDI tooth numbers: permanent 11-48, primary (child) 51-85.
TEETH = {q * 10 + n for q in (1, 2, 3, 4) for n in range(1, 9)} | {q * 10 + n for q in (5, 6, 7, 8) for n in range(1, 6)}


class ProcedureIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    cost: Money = Decimal(0)
    active: bool = True


class InvoiceItemIn(BaseModel):
    procedure_id: int | None = None
    name: str = Field(min_length=1, max_length=160)
    doctor_id: int | None = None
    date: dt.date
    teeth: list[int] = Field(default_factory=list, max_length=52)
    unit_cost: Money = Decimal(0)
    qty: int = Field(default=1, ge=1, le=999)
    discount_value: Money = Decimal(0)
    discount_type: Literal["pct", "inr"] = "pct"
    tax_pct: Decimal = Field(default=Decimal(0), ge=0, le=100, max_digits=5, decimal_places=2)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("teeth")
    @classmethod
    def valid_teeth(cls, teeth: list[int]) -> list[int]:
        bad = [t for t in teeth if t not in TEETH]
        if bad:
            raise ValueError(f"Not a tooth number: {', '.join(map(str, bad))}")
        return sorted(set(teeth))

    @model_validator(mode="after")
    def discount_in_range(self):
        if self.discount_type == "pct" and self.discount_value > 100:
            raise ValueError("A percentage discount can't be more than 100%.")
        if self.discount_type == "inr" and self.discount_value > self.unit_cost * self.qty:
            raise ValueError(f"The discount on {self.name} is more than its cost.")
        return self


class InvoiceIn(BaseModel):
    patient_id: str = Field(min_length=3, max_length=20)
    number: int | None = Field(default=None, ge=1, le=99_999_999)  # blank = next free bill number
    doctor_id: int | None = None
    date: dt.date
    notes: str | None = Field(default=None, max_length=1000)
    items: list[InvoiceItemIn] = Field(min_length=1, max_length=100)


class PaymentIn(BaseModel):
    amount: Money
    mode: PaymentMode = "cash"
    date: dt.date | None = None
    reference: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("amount")
    @classmethod
    def positive(cls, amount: Decimal) -> Decimal:
        if amount <= 0:
            raise ValueError("Enter an amount above zero.")
        return amount
