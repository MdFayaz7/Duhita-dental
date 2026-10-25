"""Clinic hours: the one place the admin calendar, the website and the patient app read them from."""
import datetime as dt

SLOT_MINUTES = 15  # calendar grid and bookable start times
SESSIONS = [
    {"id": "morning", "label": "Morning", "from": "10:00", "to": "13:00"},
    {"id": "evening", "label": "Evening", "from": "16:30", "to": "20:00"},
]
CLOSED_WEEKDAYS = {6}  # Sunday: by prior appointment only
DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120]
CATEGORIES = [
    {"id": "high_priority", "label": "High priority", "color": "#e8743b"},
    {"id": "telephonic", "label": "Telephonic", "color": "#5b8fd0"},
    {"id": "walkin", "label": "Walk-in", "color": "#3fae6a"},
]


def minutes(hhmm: str) -> int:
    hour, minute = (int(x) for x in hhmm.split(":"))
    return hour * 60 + minute


def hhmm(total: int) -> str:
    return f"{total // 60:02d}:{total % 60:02d}"


def _label(hhmm_: str) -> str:
    hour, minute = (int(x) for x in hhmm_.split(":"))
    return f"{(hour + 11) % 12 + 1}:{minute:02d} {'AM' if hour < 12 else 'PM'}"


def session_slots(session: dict, step: int = SLOT_MINUTES) -> list[str]:
    return [hhmm(m) for m in range(minutes(session["from"]), minutes(session["to"]), step)]


def within_hours(slot: str) -> bool:
    m = minutes(slot)
    return any(minutes(s["from"]) <= m < minutes(s["to"]) for s in SESSIONS)


def is_closed(day: dt.date) -> bool:
    return day.weekday() in CLOSED_WEEKDAYS


def hours_payload() -> dict:
    return {
        "slot_minutes": SLOT_MINUTES,
        "sessions": [{**s, "range": f"{_label(s['from'])} – {_label(s['to'])}"} for s in SESSIONS],
        "closed_weekdays": sorted(CLOSED_WEEKDAYS),
        "durations": DURATIONS,
        "categories": CATEGORIES,
    }
