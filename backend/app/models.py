from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

# ---------- auth ----------

class LoginIn(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


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
    created_at: datetime


# ---------- appointments ----------

AppointmentStatus = Literal["pending", "confirmed", "completed", "cancelled", "no_show"]


class AppointmentIn(BaseModel):
    patient_id: str | None = None
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=r"^[6-9]\d{9}$")
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    slot: str = Field(pattern=r"^\d{2}:\d{2}$")
    doctor: str | None = None
    reason: str | None = None
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    status: AppointmentStatus | None = None
    date: str | None = None
    slot: str | None = None
    doctor: str | None = None
    notes: str | None = None


# ---------- daily schedule ----------

class ScheduleIn(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time_from: str = Field(pattern=r"^\d{2}:\d{2}$")
    time_to: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    patient_name: str
    patient_id: str | None = None
    doctor: str | None = None
    status: AppointmentStatus = "pending"
    notes: str | None = None
    priority: int = 1


class ScheduleUpdate(BaseModel):
    time_from: str | None = None
    time_to: str | None = None
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
