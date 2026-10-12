import datetime as dt
import hashlib
import hmac
import json

from sqlalchemy import select

from app.db import SessionLocal
from app.tables import Appointment, WhatsAppMessage


def next_weekday() -> str:
    day = dt.date.today() + dt.timedelta(days=2)
    while day.weekday() == 6:
        day += dt.timedelta(days=1)
    return day.isoformat()


def booking(**overrides) -> dict:
    return {"name": "Ravi Kumar", "phone": "9876543210", "date": next_weekday(), "slot": "10:30",
            "reason": "Tooth pain", **overrides}


def signed(payload: dict) -> tuple[bytes, dict]:
    body = json.dumps(payload).encode()
    sig = hmac.new(b"app-secret", body, hashlib.sha256).hexdigest()
    return body, {"x-hub-signature-256": f"sha256={sig}", "content-type": "application/json"}


def button_tap(appointment_id: str, sender: str = "919440313066", msg_id: str = "wamid.in1") -> dict:
    return {"entry": [{"changes": [{"value": {"messages": [{
        "from": sender, "id": msg_id, "type": "button",
        "button": {"payload": f"confirm:{appointment_id}", "text": "Confirm"},
    }]}}]}]}


async def appointment(appointment_id: str) -> Appointment:
    async with SessionLocal() as s:
        return await s.get(Appointment, int(appointment_id))


async def test_new_booking_alerts_admin_with_confirm_button(client, wa):
    res = await client.post("/api/appointments", json=booking())
    assert res.status_code == 201
    appt_id = res.json()["id"]

    [msg] = wa.sent
    assert msg["to"] == "919440313066"
    tpl = msg["template"]
    assert tpl["name"] == "appointment_request"
    body = [p["text"] for p in tpl["components"][0]["parameters"]]
    assert body[0] == "Ravi Kumar" and body[1] == "9876543210" and body[3] == "10:30 AM" and body[4] == "Tooth pain"
    assert tpl["components"][1] == {"type": "button", "sub_type": "quick_reply", "index": "0",
                                    "parameters": [{"type": "payload", "payload": f"confirm:{appt_id}"}]}
    assert (await appointment(appt_id)).admin_notified_at is not None


async def test_admin_tap_confirms_and_notifies_patient_once(client, wa):
    appt_id = (await client.post("/api/appointments", json=booking())).json()["id"]
    wa.sent.clear()

    body, headers = signed(button_tap(appt_id))
    res = await client.post("/api/whatsapp/webhook", content=body, headers=headers)
    assert res.status_code == 200

    appt = await appointment(appt_id)
    assert appt.status == "confirmed" and appt.confirmed_at and appt.patient_notified_at
    patient_msgs = [m for m in wa.sent if m["to"] == "919876543210"]
    assert len(patient_msgs) == 1 and patient_msgs[0]["template"]["name"] == "appointment_confirmed"
    replies = [m for m in wa.sent if m["type"] == "text"]
    assert replies[0]["to"] == "919440313066" and replies[0]["text"]["body"].startswith("✅ Confirmed")

    # Meta redelivers the same event: nothing happens twice.
    wa.sent.clear()
    assert (await client.post("/api/whatsapp/webhook", content=body, headers=headers)).status_code == 200
    assert wa.sent == []

    # A second, distinct tap is answered but does not message the patient again.
    body2, headers2 = signed(button_tap(appt_id, msg_id="wamid.in2"))
    await client.post("/api/whatsapp/webhook", content=body2, headers=headers2)
    assert [m["text"]["body"][:17] for m in wa.sent] == ["Already confirmed"]


async def test_webhook_rejects_bad_signature_and_strangers(client, wa):
    appt_id = (await client.post("/api/appointments", json=booking())).json()["id"]
    body, _ = signed(button_tap(appt_id))
    res = await client.post("/api/whatsapp/webhook", content=body, headers={"x-hub-signature-256": "sha256=bad"})
    assert res.status_code == 403

    body, headers = signed(button_tap(appt_id, sender="919999999999"))
    assert (await client.post("/api/whatsapp/webhook", content=body, headers=headers)).status_code == 200
    assert (await appointment(appt_id)).status == "pending"


async def test_webhook_verification_handshake(client):
    ok = await client.get("/api/whatsapp/webhook",
                          params={"hub.mode": "subscribe", "hub.verify_token": "verify-me", "hub.challenge": "42"})
    assert ok.status_code == 200 and ok.text == "42"
    bad = await client.get("/api/whatsapp/webhook",
                           params={"hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "42"})
    assert bad.status_code == 403


async def test_dashboard_confirm_also_notifies_patient(admin, wa):
    appt_id = (await admin.post("/api/appointments", json=booking())).json()["id"]
    wa.sent.clear()
    res = await admin.patch(f"/api/appointments/{appt_id}", json={"status": "confirmed"})
    assert res.status_code == 200 and res.json()["status"] == "confirmed"
    assert [m["template"]["name"] for m in wa.sent] == ["appointment_confirmed"]

    await admin.patch(f"/api/appointments/{appt_id}", json={"notes": "bring x-ray"})
    assert len(wa.sent) == 1


async def test_whatsapp_outage_never_breaks_booking(admin, wa):
    wa.fail = True
    res = await admin.post("/api/appointments", json=booking())
    assert res.status_code == 201
    appt_id = res.json()["id"]
    await admin.patch(f"/api/appointments/{appt_id}", json={"status": "confirmed"})

    appt = await appointment(appt_id)
    assert appt.status == "confirmed" and appt.patient_notified_at is None  # free to retry later
    async with SessionLocal() as s:
        statuses = set(await s.scalars(select(WhatsAppMessage.status)))
    assert statuses == {"failed"}


async def test_delivery_receipts_update_status(client, wa):
    await client.post("/api/appointments", json=booking())
    body, headers = signed({"entry": [{"changes": [{"value": {"statuses": [
        {"id": "wamid.out1", "status": "read", "recipient_id": "919440313066"}]}}]}]})
    assert (await client.post("/api/whatsapp/webhook", content=body, headers=headers)).status_code == 200
    async with SessionLocal() as s:
        assert await s.scalar(select(WhatsAppMessage.status).where(WhatsAppMessage.wa_message_id == "wamid.out1")) == "read"
