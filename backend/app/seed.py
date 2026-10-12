"""Seed the database: admin user, doctors, and the gallery images already in the site folder.

    python -m app.seed            # admin + doctors
    python -m app.seed --gallery  # also import public/images/gallery/* from the frontend
"""
import asyncio
import mimetypes
import sys
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from .config import settings
from .db import SessionLocal, engine
from .security import hash_password
from .tables import Admin, Doctor, GalleryImage
from .uploads import store_bytes

FRONTEND = Path(__file__).resolve().parents[2] / "duhita-frontend" / "public"
IMAGES = {".jpg", ".jpeg", ".png", ".webp"}

DOCTORS = [
    {
        "name": "Dr. Nalluru Sasidhar",
        "qualification": "BDS, MDS (Conservative Dentistry)",
        "speciality": "Endodontist & Implantologist",
        "experience_years": 32,
        "bio": "Founder of Duhita Multispeciality Dental Centre, practising in Vijayawada since 1997.",
        "photo": "/images/dr-sasidhar.jpg",
        "order": 0,
        "active": True,
    }
]


async def seed_admin(session):
    await session.execute(
        insert(Admin).values(username=settings.admin_username, password_hash=hash_password(settings.admin_password))
        .on_conflict_do_nothing(index_elements=["username"])
    )
    print(f"admin ready: {settings.admin_username}")


async def seed_doctors(session):
    for doc in DOCTORS:
        if not await session.scalar(select(Doctor.id).where(Doctor.name == doc["name"])):
            session.add(Doctor(**doc))
    await session.flush()
    print(f"doctors: {await session.scalar(select(func.count()).select_from(Doctor))}")


async def seed_gallery(session):
    """Load the frontend's gallery photos (idempotent: skips files already imported)."""
    source = FRONTEND / "images" / "gallery"
    clinic = sorted(p for p in (source / "clinic").glob("*") if p.suffix.lower() in IMAGES)
    camps = sorted(p for p in (source / "camps").glob("*") if p.suffix.lower() in IMAGES)
    # Matches the website: first 8 clinic photos are Infrastructure, the rest the Clinic Gallery.
    groups = {"infrastructure": clinic[:8], "clinic": clinic[8:], "camps": camps}

    for category, files in groups.items():
        known = set(await session.scalars(select(GalleryImage.source_name).where(GalleryImage.category == category)))
        added = 0
        for order, path in enumerate(files):
            if path.name in known:
                continue
            content_type = mimetypes.guess_type(path.name)[0] or "image/jpeg"
            src = store_bytes(session, path.read_bytes(), path.name, content_type, "gallery")
            session.add(GalleryImage(category=category, caption="", src=src, source_name=path.name, order=order))
            added += 1
        print(f"{category}: {len(files)} photos ({added} newly imported)")


async def main():
    async with SessionLocal() as session:
        await seed_admin(session)
        await seed_doctors(session)
        if "--gallery" in sys.argv:
            await seed_gallery(session)
        await session.commit()
    await engine.dispose()
    print("done")


if __name__ == "__main__":
    asyncio.run(main())
