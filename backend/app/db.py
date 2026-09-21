from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri, uuidRepresentation="standard")
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


def serialize(doc: dict | None) -> dict | None:
    """Mongo document -> JSON-safe dict."""
    if not doc:
        return None
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc
