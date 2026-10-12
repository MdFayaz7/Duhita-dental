import datetime as dt
from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import settings

engine = create_async_engine(
    settings.async_database_url,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,
    pool_recycle=1800,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]

PRIVATE_COLUMNS = {"extra", "password_hash"}


def serialize(row: Any) -> dict | None:
    """ORM row -> JSON-safe dict: string id, ISO dates, UTC ISO timestamps, private columns dropped.

    Fields that only existed in the old Mongo documents live in `extra` and are merged
    back in, so nothing the clients relied on disappears.
    """
    if row is None:
        return None
    out: dict = dict(getattr(row, "extra", None) or {})
    for column in row.__table__.columns:
        if column.key in PRIVATE_COLUMNS:
            continue
        value = getattr(row, column.key)
        if isinstance(value, dt.datetime):
            value = (value if value.tzinfo else value.replace(tzinfo=dt.timezone.utc)).isoformat()
        elif isinstance(value, dt.date):
            value = value.isoformat()
        out[column.key] = value
    out["id"] = str(row.id)
    return out


def escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def contains(column, text: str):
    """Case-insensitive substring match, served by the trigram indexes."""
    return column.ilike(f"%{escape_like(text.strip())}%", escape="\\")


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)
