"""Meta's webhook: verification handshake, delivery receipts, and admins tapping Confirm."""
import hmac
import json
import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

from .. import whatsapp
from ..config import settings
from ..db import SessionDep, serialize, utcnow
from ..events import broadcast_event
from ..tables import WhatsAppMessage

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])
log = logging.getLogger("duhita.whatsapp")


@router.get("/webhook")
async def verify(
    mode: str = Query("", alias="hub.mode"),
    token: str = Query("", alias="hub.verify_token"),
    challenge: str = Query("", alias="hub.challenge"),
):
    expected = settings.whatsapp_verify_token
    if mode == "subscribe" and expected and hmac.compare_digest(token, expected):
        return PlainTextResponse(challenge)
    raise HTTPException(403, "Verification failed.")


def _button_payload(msg: dict) -> str | None:
    if msg.get("type") == "button":  # quick-reply button on a template
        return (msg.get("button") or {}).get("payload")
    if msg.get("type") == "interactive":
        return ((msg.get("interactive") or {}).get("button_reply") or {}).get("id")
    return None


@router.post("/webhook")
async def receive(request: Request, session: SessionDep, background: BackgroundTasks):
    body = await request.body()
    if not whatsapp.valid_signature(body, request.headers.get("x-hub-signature-256")):
        raise HTTPException(403, "Invalid signature.")
    try:
        payload = json.loads(body)
    except ValueError:
        raise HTTPException(400, "Invalid JSON.")

    values = [change.get("value") or {} for entry in payload.get("entry", []) for change in entry.get("changes", [])]
    confirmed = []
    admins = settings.admin_whatsapp_numbers

    for value in values:
        for receipt in value.get("statuses", []):
            errors = receipt.get("errors") or [{}]
            await session.execute(
                update(WhatsAppMessage)
                .where(WhatsAppMessage.wa_message_id == receipt.get("id"))
                .values(status=receipt.get("status", "unknown"), updated_at=utcnow(),
                        error=errors[0].get("title") or errors[0].get("message"))
            )

        for msg in value.get("messages", []):
            sender = whatsapp.normalize_number(msg.get("from")) or ""
            # Meta retries deliveries; the unique message id makes each tap count once.
            inbound = (await session.execute(
                insert(WhatsAppMessage)
                .values(wa_message_id=msg.get("id"), direction="in", phone=sender, kind=msg.get("type", "unknown"),
                        status="received", payload=msg)
                .on_conflict_do_nothing(index_elements=["wa_message_id"])
                .returning(WhatsAppMessage.id)
            )).scalar_one_or_none()
            button = _button_payload(msg)
            if inbound is None or not button or not button.startswith(whatsapp.CONFIRM):
                continue
            if sender not in admins:
                log.warning("Ignoring a Confirm tap from %s, which is not in WHATSAPP_ADMIN_NUMBERS", sender)
                continue
            try:
                appointment_id = int(button.removeprefix(whatsapp.CONFIRM))
            except ValueError:
                continue

            await session.execute(update(WhatsAppMessage).where(WhatsAppMessage.id == inbound)
                                  .values(appointment_id=appointment_id))
            appt, reply = await whatsapp.confirm_from_admin(session, appointment_id)
            if appt:
                confirmed.append(appt)
            background.add_task(whatsapp.reply, sender, reply, appointment_id)

    await session.commit()
    for appt in confirmed:
        background.add_task(whatsapp.notify_patient_confirmed, appt.id)
        await broadcast_event("appointment_updated", serialize(appt))
    if confirmed:
        await broadcast_event("stats_updated")
    return {"ok": True}
