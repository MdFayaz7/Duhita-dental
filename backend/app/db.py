from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.mongo_uri,
            uuidRepresentation="standard",
            maxPoolSize=50,
            minPoolSize=5,
            serverSelectionTimeoutMS=5000,
        )
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.mongo_db]


async def ensure_indexes() -> None:
    db = get_db()
    await db.admins.create_index("username", unique=True)
    await db.patients.create_index("patient_id", unique=True)
    await db.patients.create_index("phone")
    await db.appointments.create_index([("date", 1), ("slot", 1)])
    await db.appointments.create_index("patient_id")
    await db.schedule.create_index([("date", 1), ("priority", 1)])
    await db.gallery.create_index([("category", 1), ("order", 1)])
    await db.research.create_index("created_at")
    await db.doctors.create_index("order")
    await db.feedback.create_index([("order", 1), ("created_at", -1)])


import datetime


def serialize(doc: dict | None) -> dict | None:
    """Mongo document -> JSON-safe dict with UTC ISO8601 timestamps."""
    if not doc:
        return None
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    for k, v in list(doc.items()):
        if isinstance(v, datetime.datetime):
            if v.tzinfo is None:
                v = v.replace(tzinfo=datetime.timezone.utc)
            doc[k] = v.isoformat()
    return doc
