import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.tables import Base

if context.config.config_file_name:
    fileConfig(context.config.config_file_name)


def include_object(obj, name, type_, reflected, compare_to) -> bool:
    # Trigram indexes are managed by hand in the migrations, not declared on the models.
    return not (type_ == "index" and name and name.endswith("_trgm"))


def run(connection) -> None:
    context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True,
                      include_object=include_object)
    with context.begin_transaction():
        context.run_migrations()


async def main() -> None:
    engine = create_async_engine(settings.async_database_url)
    async with engine.connect() as conn:
        await conn.run_sync(run)
    await engine.dispose()


if context.is_offline_mode():
    context.configure(url=settings.async_database_url, target_metadata=Base.metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(main())
