from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

from fastapi import APIRouter, Depends

from ..db import get_db, serialize
from ..security import current_admin

router = APIRouter(prefix="/api/stats", tags=["stats"], dependencies=[Depends(current_admin)])


@router.get("/overview")
async def overview():
    db = get_db()
    today = datetime.now(IST).strftime("%Y-%m-%d")
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    return {
        "appointments_today": await db.appointments.count_documents({"date": today}),
        "appointments_pending": await db.appointments.count_documents({"status": "pending"}),
        "appointments_total": await db.appointments.count_documents({}),
        "patients_total": await db.patients.count_documents({}),
        "patients_this_week": await db.patients.count_documents({"created_at": {"$gte": datetime.fromisoformat(week_ago)}}),
        "doctors": await db.doctors.count_documents({"active": True}),
        "research": await db.research.count_documents({}),
        "gallery": {
            "clinic": await db.gallery.count_documents({"category": "clinic"}),
            "infrastructure": await db.gallery.count_documents({"category": "infrastructure"}),
            "camps": await db.gallery.count_documents({"category": "camps"}),
        },
        "today": today,
    }


@router.get("/dashboard")
async def dashboard():
    """Everything the Overview page needs, in one call."""
    db = get_db()
    today = datetime.now(IST).strftime("%Y-%m-%d")
    recent_bookings = await db.appointments.find().sort("created_at", -1).to_list(6)
    recent_patients = await db.patients.find().sort("created_at", -1).to_list(6)
    todays_schedule = await db.schedule.find({"date": today}).sort([("priority", 1), ("time_from", 1)]).to_list(20)
    return {
        "recent_bookings": [serialize(d) for d in recent_bookings],
        "recent_patients": [serialize(d) for d in recent_patients],
        "todays_schedule": [serialize(d) for d in todays_schedule],
    }
