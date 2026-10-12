"""WhatsApp Cloud API (Meta): new-booking alerts to the clinic with a Confirm button, confirmations to patients.

Both messages start a conversation, so WhatsApp requires approved *templates* for them; the exact
template text to submit is in backend/README.md. Without WHATSAPP_TOKEN set, messages are logged
and recorded as `skipped` instead of sent, so development and tests never hit Meta.
"""
import datetime as dt
import hashlib
import hmac
import logging
import re

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import SessionLocal, utcnow
from .tables import Appointment, WhatsAppMessage

log = logging.getLogger("duhita.whatsapp")
CONFIRM = "confirm:"
_client: httpx.AsyncClient | None = None


def enabled() -> bool:
    return bool(settings.whatsapp_token and settings.whatsapp_phone_number_id)


def http_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            base_url=f"https://graph.facebook.com/{settings.whatsapp_api_version}/",
            headers={"Authorization": f"Bearer {settings.whatsapp_token}"},
            timeout=httpx.Timeout(10.0, connect=5.0),
        )
    return _client


async def aclose() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def normalize_number(raw: str | None) -> str | None:
    """Any way a number gets typed -> WhatsApp's digits-only international form (919876543210)."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 10:
        digits = settings.whatsapp_country_code + digits
    elif len(digits) == 11 and digits.startswith("0"):
        digits = settings.whatsapp_country_code + digits[1:]
    return digits if 11 <= len(digits) <= 15 else None


def valid_signature(body: bytes, header: str | None) -> bool:
    """Meta signs every webhook call with the app secret; anything else is rejected."""
    secret = settings.whatsapp_app_secret
    if not secret or not header or not header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header.removeprefix("sha256="))


def fmt_date(day: dt.date) -> str:
    return day.strftime("%a, %d %b %Y")


def fmt_slot(slot: str) -> str:
    hour, minute = (int(x) for x in slot.split(":"))
    return dt.time(hour, minute).strftime("%I:%M %p").lstrip("0")


def _param(value: str | None) -> str:
    # Template parameters may not contain newlines, tabs or runs of spaces, nor be empty.
    return re.sub(r"\s+", " ", value or "").strip()[:200] or "-"


def template(name: str, params: list[str | None], buttons: list[str] = ()) -> dict:
    components = [{"type": "body", "parameters": [{"type": "text", "text": _param(p)} for p in params]}]
    components += [
        {"type": "button", "sub_type": "quick_reply", "index": str(i), "parameters": [{"type": "payload", "payload": b}]}
        for i, b in enumerate(buttons)
    ]
    return {"type": "template", "template": {"name": name, "language": {"code": settings.whatsapp_language},
                                             "components": components}}


def text(body: str) -> dict:
    return {"type": "text", "text": {"body": body}}


async def send(session: AsyncSession, *, to: str, kind: str, body: dict, appointment_id: int | None = None) -> WhatsAppMessage:
    """Send one message and record it (with the caller's commit). Never raises: a failed alert must not fail a booking."""
    message = WhatsAppMessage(direction="out", phone=to, kind=kind, appointment_id=appointment_id,
                              status="pending", payload=body)
    session.add(message)
    if not enabled():
        message.status = "skipped"
        log.info("WhatsApp not configured; would send %s to %s", kind, to)
        return message
    try:
        res = await http_client().post(f"{settings.whatsapp_phone_number_id}/messages",
                                       json={"messaging_product": "whatsapp", "to": to, **body})
        data = res.json() if res.content else {}
        if res.is_error:
            raise RuntimeError((data.get("error") or {}).get("message") or res.text)
        message.wa_message_id = data["messages"][0]["id"]
        message.status = "sent"
    except Exception as exc:
        message.status, message.error = "failed", str(exc)[:500]
        log.warning("WhatsApp %s to %s failed: %s", kind, to, exc)
    return message


def _when(appt: Appointment) -> str:
    return f"{appt.name} on {fmt_date(appt.date)} at {fmt_slot(appt.slot)}"


async def notify_admins_new_appointment(appointment_id: int) -> None:
    """Background task: tell every clinic admin about a new booking, with a Confirm button."""
    admins = sorted(settings.admin_whatsapp_numbers)
    if not admins:
        return
    async with SessionLocal() as session:
        appt = await session.get(Appointment, appointment_id)
        if not appt or appt.status != "pending" or appt.admin_notified_at:
            return
        body = template(
            settings.whatsapp_template_admin,
            [appt.name, appt.phone, fmt_date(appt.date), fmt_slot(appt.slot), appt.reason or appt.notes],
            buttons=[f"{CONFIRM}{appt.id}"],
        )
        results = [await send(session, to=n, kind="admin_new_appointment", body=body, appointment_id=appt.id)
                   for n in admins]
        if any(m.status == "sent" for m in results):
            appt.admin_notified_at = utcnow()
        await session.commit()


async def notify_patient_confirmed(appointment_id: int) -> None:
    """Background task: send the patient their confirmation, at most once per appointment."""
    async with SessionLocal() as session:
        # Claim the send atomically, so a dashboard click and a WhatsApp tap can't both message the patient.
        appt = (await session.execute(
            update(Appointment)
            .where(Appointment.id == appointment_id, Appointment.status == "confirmed",
                   Appointment.patient_notified_at.is_(None))
            .values(patient_notified_at=utcnow())
            .returning(Appointment)
        )).scalar_one_or_none()
        if not appt:
            return
        to = normalize_number(appt.phone)
        message = None
        if to:
            message = await send(
                session, to=to, kind="patient_confirmed", appointment_id=appt.id,
                body=template(settings.whatsapp_template_patient, [appt.name, fmt_date(appt.date), fmt_slot(appt.slot)]),
            )
        if not message or message.status != "sent":
            appt.patient_notified_at = None  # let a later confirmation try again
        await session.commit()


async def reply(to: str, body: str, appointment_id: int | None = None) -> None:
    """Background task: a plain-text reply to an admin who just tapped a button (their 24-hour window is open)."""
    async with SessionLocal() as session:
        await send(session, to=to, kind="admin_reply", body=text(body), appointment_id=appointment_id)
        await session.commit()


async def confirm_from_admin(session: AsyncSession, appointment_id: int) -> tuple[Appointment | None, str]:
    """Apply an admin's Confirm tap. Returns the appointment if this tap confirmed it, and the reply to send."""
    appt = (await session.execute(
        select(Appointment).where(Appointment.id == appointment_id).with_for_update()
    )).scalar_one_or_none()
    if not appt:
        return None, "That appointment no longer exists."
    if appt.status == "confirmed":
        return None, f"Already confirmed: {_when(appt)}."
    if appt.status != "pending":
        return None, f"Not confirmed: {_when(appt)} is {appt.status.replace('_', ' ')}."
    appt.status = "confirmed"
    appt.confirmed_at = appt.updated_at = utcnow()
    return appt, f"✅ Confirmed: {_when(appt)}. The patient is being sent a WhatsApp confirmation."
