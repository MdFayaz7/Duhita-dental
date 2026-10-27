"""Clinic hours: the one place the admin calendar, the website and the patient app read them from.

The weekly timings are admin-editable (Settings → Clinic hours) and stored in `settings` under `clinic_hours`;
DEFAULT_WEEK applies until someone saves them."""
import datetime as dt
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .tables import Setting

SLOT_MINUTES = 15  # calendar grid and bookable start times
HOURS_KEY = "clinic_hours"
_WEEKDAY = [{"from": "10:00", "to": "13:00"}, {"from": "16:30", "to": "20:00"}]
DEFAULT_WEEK = [_WEEKDAY] * 6 + [[]]  # Monday … Saturday; Sunday by prior appointment only
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
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


def _session(s: dict) -> dict:
    start = minutes(s["from"])
    name = "Morning" if start < 12 * 60 else "Afternoon" if start < 16 * 60 else "Evening"
    return {"id": name.lower(), "label": name, "from": s["from"], "to": s["to"],
            "range": f"{_label(s['from'])} – {_label(s['to'])}"}


def session_slots(session: dict, step: int = SLOT_MINUTES) -> list[str]:
    return [hhmm(m) for m in range(minutes(session["from"]), minutes(session["to"]), step)]


@dataclass(frozen=True)
class Hours:
    week: list[list[dict]]  # Monday first

    def sessions(self, day: dt.date) -> list[dict]:
        return [_session(s) for s in self.week[day.weekday()]]

    def is_closed(self, day: dt.date) -> bool:
        return not self.week[day.weekday()]

    def within(self, day: dt.date, slot: str) -> bool:
        m = minutes(slot)
        return any(minutes(s["from"]) <= m < minutes(s["to"]) for s in self.week[day.weekday()])

    def payload(self) -> dict:
        open_days = [d for d in self.week if d]
        # `sessions` spans every open day, so the calendar grid covers the earliest opening to the latest closing.
        spans = sorted({(s["from"], s["to"]) for d in open_days for s in d})
        return {
            "slot_minutes": SLOT_MINUTES,
            "week": [{"weekday": i, "day": DAY_NAMES[i], "closed": not d, "sessions": [_session(s) for s in d]}
                     for i, d in enumerate(self.week)],
            "sessions": [_session({"from": a, "to": b}) for a, b in spans] or [_session(s) for s in _WEEKDAY],
            "closed_weekdays": [i for i, d in enumerate(self.week) if not d],
            "durations": DURATIONS,
            "categories": CATEGORIES,
        }


async def load_hours(session: AsyncSession) -> Hours:
    saved = await session.scalar(select(Setting.value).where(Setting.key == HOURS_KEY))
    return Hours(saved["week"] if saved else DEFAULT_WEEK)
