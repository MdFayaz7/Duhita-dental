"""One-off: copy everything from the old MongoDB (records and GridFS files) into Postgres.

    pip install -r requirements-dev.txt          # adds pymongo, needed only here
    alembic upgrade head                         # create the empty schema first
    MONGO_URI=... MONGO_DB=duhita_dental python -m app.migrate_from_mongo --dry-run
    MONGO_URI=... MONGO_DB=duhita_dental python -m app.migrate_from_mongo

Runs in one transaction: it either copies everything or nothing. File ids are kept, so every
/api/files/<id> link already saved in the data (or cached by browsers) keeps working.
Fields that have no column are kept in each row's `extra` and still returned by the API.
Use --wipe to empty the Postgres tables first (e.g. to re-run after a dry run that looked wrong).
"""
import asyncio
import datetime as dt
import mimetypes
import os
import sys
from collections.abc import Iterable, Iterator
from pathlib import Path

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, SmallInteger, func, insert, select, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import SessionLocal, engine
from .tables import (
    STATUSES, Admin, Appointment, Base, Doctor, Feedback, GalleryImage, Patient, Record, Research, ScheduleEntry,
    StoredFile,
)

UTC = dt.timezone.utc
BATCH = 500
TABLES = {
    "admins": Admin, "patients": Patient, "appointments": Appointment, "schedule": ScheduleEntry,
    "doctors": Doctor, "research": Research, "gallery": GalleryImage, "feedback": Feedback, "records": Record,
}
FILE_FIELDS = {"gallery": ["src"], "doctors": ["photo"], "research": ["file"], "feedback": ["src", "poster"],
               "records": ["file"], "patients": ["photo"]}
REQUIRED = {"patients": ["patient_id", "name", "phone"], "appointments": ["name", "phone", "date", "slot"],
            "schedule": ["date", "time_from", "patient_name"], "doctors": ["name"], "research": ["title", "authors"],
            "gallery": ["category", "src"], "feedback": ["src"], "records": ["patient_id", "title", "added_by"],
            "admins": ["username", "password_hash"]}


# ---------------------------------------------------------------- value conversion

def to_json(value):
    """Mongo values -> JSON-safe values for the `extra` column."""
    from bson import ObjectId

    if isinstance(value, dict):
        return {str(k): to_json(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_json(v) for v in value]
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if isinstance(value, bytes):
        return None
    return value


def to_datetime(value) -> dt.datetime | None:
    if isinstance(value, str):
        try:
            value = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if isinstance(value, dt.datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    return None


def to_date(value) -> dt.date | None:
    if isinstance(value, dt.datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return dt.date.fromisoformat(value.strip()[:10])
        except ValueError:
            return None
    return None


def to_int(value) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def to_bool(value) -> bool | None:
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return None if value is None else bool(value)


def convert(column, value):
    kind = column.type
    if isinstance(kind, DateTime):
        return to_datetime(value)
    if isinstance(kind, Date):
        return to_date(value)
    if isinstance(kind, (Integer, SmallInteger, BigInteger)):
        number = to_int(value)
        return number if number is None or not isinstance(kind, SmallInteger) or abs(number) < 32768 else None
    if isinstance(kind, Boolean):
        return to_bool(value)
    if isinstance(kind, ARRAY):
        return [str(v) for v in value] if isinstance(value, (list, tuple)) else ([str(value)] if value else [])
    if isinstance(kind, JSONB):
        return to_json(value) if isinstance(value, dict) else {}
    if value is None:
        return None
    return value if isinstance(value, str) else str(to_json(value))


def to_row(collection: str, doc: dict) -> tuple[dict | None, str | None]:
    """A Mongo document -> (row for the table, or None and the reason it was skipped)."""
    model = TABLES[collection]
    doc = dict(doc)
    oid = doc.pop("_id", None)
    if collection == "admins" and "password" in doc:
        doc["password_hash"] = doc.pop("password")

    columns = {c.key: c for c in model.__table__.columns if c.key not in ("id", "extra")}
    row, extra = {}, {}
    for key, value in doc.items():
        if key in columns:
            converted = convert(columns[key], value)
            if converted is None and value not in (None, ""):
                extra[f"legacy_{key}"] = to_json(value)  # unreadable value: keep it, don't lose it
            if converted is not None:
                row[key] = converted
        else:
            extra[key] = to_json(value)

    if "created_at" in columns and not row.get("created_at"):
        row["created_at"] = oid.generation_time if hasattr(oid, "generation_time") else dt.datetime.now(UTC)
    if "status" in columns and row.get("status") not in STATUSES:
        if "status" in row:
            extra["legacy_status"] = row["status"]
        row["status"] = "pending"
    if collection == "records":
        row.setdefault("added_by", "clinic")
    if collection == "patients" and row.get("patient_id"):
        row["patient_id"] = row["patient_id"].strip().upper()

    missing = [k for k in REQUIRED[collection] if row.get(k) in (None, "")]
    if missing:
        return None, f"missing or unreadable {', '.join(missing)}"
    if "extra" in model.__table__.columns:
        row["extra"] = extra
    return row, None


# ---------------------------------------------------------------- source

class MongoSource:
    def __init__(self, uri: str, db_name: str):
        from pymongo import MongoClient

        self.client = MongoClient(uri, uuidRepresentation="standard", serverSelectionTimeoutMS=10000)
        self.db = self.client[db_name]

    def count(self, collection: str) -> int:
        return self.db[collection].estimated_document_count()

    def documents(self, collection: str) -> Iterator[dict]:
        return self.db[collection].find().sort("_id", 1)

    def files(self) -> Iterator[tuple[dict, bytes]]:
        from gridfs import GridFSBucket

        bucket = GridFSBucket(self.db, bucket_name="files")
        for meta in self.db["files.files"].find().sort("_id", 1):
            yield meta, bucket.open_download_stream(meta["_id"]).read()


# ---------------------------------------------------------------- copy

def _batches(rows: Iterable[dict]) -> Iterator[list[dict]]:
    batch = []
    for row in rows:
        batch.append(row)
        if len(batch) == BATCH:
            yield batch
            batch = []
    if batch:
        yield batch


def _local_file(session: AsyncSession, path: str, folder: str) -> str:
    """A legacy /uploads/... path: import the file if it is still on this disk."""
    local = Path(settings.upload_dir) / path.removeprefix("/uploads/")
    if not local.is_file():
        return path
    from .uploads import store_bytes

    content_type = mimetypes.guess_type(local.name)[0] or "application/octet-stream"
    return store_bytes(session, local.read_bytes(), local.name, content_type, folder)


async def copy(source, session: AsyncSession) -> dict:
    report = {}
    files = 0
    for meta, data in source.files():
        metadata = meta.get("metadata") or {}
        session.add(StoredFile(
            id=str(meta["_id"]), filename=meta.get("filename") or "file",
            content_type=metadata.get("content_type") or mimetypes.guess_type(meta.get("filename") or "")[0]
            or "application/octet-stream",
            folder=metadata.get("folder"), size=len(data), data=data,
            created_at=to_datetime(meta.get("uploadDate")) or dt.datetime.now(UTC),
        ))
        files += 1
        if files % 50 == 0:
            await session.flush()
            session.expunge_all()  # file bytes don't need to stay in memory once written
    await session.flush()
    session.expunge_all()
    report["files"] = (files, files, [])

    for collection, model in TABLES.items():
        seen, skipped, rows = 0, [], []
        for doc in source.documents(collection):
            seen += 1
            row, reason = to_row(collection, doc)
            if row is None:
                skipped.append(f"{doc.get('_id')}: {reason}")
                continue
            for field in FILE_FIELDS.get(collection, []):
                if isinstance(row.get(field), str) and row[field].startswith("/uploads/"):
                    row[field] = _local_file(session, row[field], collection)
            rows.append(row)
        await session.flush()
        for batch in _batches(rows):
            await session.execute(insert(model), batch)
        report[collection] = (seen, len(rows), skipped)
    return report


async def empty_tables(session: AsyncSession) -> list[str]:
    counts = {t.name: await session.scalar(select(func.count()).select_from(t)) for t in Base.metadata.sorted_tables}
    return [name for name, n in counts.items() if n]


async def main() -> int:
    dry_run, wipe = "--dry-run" in sys.argv, "--wipe" in sys.argv
    uri, db_name = os.environ.get("MONGO_URI"), os.environ.get("MONGO_DB", "duhita_dental")
    if not uri:
        print("Set MONGO_URI (and MONGO_DB if it isn't duhita_dental).")
        return 2

    source = MongoSource(uri, db_name)
    async with SessionLocal() as session:
        if wipe:
            names = ", ".join(t.name for t in Base.metadata.sorted_tables)
            await session.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))
        elif busy := await empty_tables(session):
            print(f"Postgres already has data in: {', '.join(busy)}. Re-run with --wipe to replace it.")
            return 1

        report = await copy(source, session)
        print(f"{'collection':<14}{'mongo':>8}{'copied':>8}")
        for name, (seen, copied, skipped) in report.items():
            print(f"{name:<14}{seen:>8}{copied:>8}")
            for line in skipped:
                print(f"    skipped {line}")

        if dry_run:
            await session.rollback()
            print("\nDry run: nothing was written.")
        else:
            await session.commit()
            print("\nDone. Every row above is now in Postgres.")
    await engine.dispose()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
