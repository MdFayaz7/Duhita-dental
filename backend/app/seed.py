"""Seed the database: admin user, doctors, and the images/research already in the site folder.

    python -m app.seed            # admin + doctors
    python -m app.seed --gallery  # also import public/images/gallery/* from the frontend
"""
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

from .config import settings
from .db import ensure_indexes, get_db
from .security import hash_password

FRONTEND = Path(__file__).resolve().parents[2] / "duhita-frontend" / "public"

DOCTORS = [
    {
        "name": "Dr. Nalluru Sasidhar",
        "qualification": "M.D.S (Oral & Maxillofacial Surgery)",
        "speciality": "Oral & Maxillofacial Surgery",
        "experience_years": 30,
        "bio": "Founder of Duhita Multispeciality Dental Centre, practising in Vijayawada since 1997.",
        "photo": "/images/dr-sasidhar.jpg",
        "order": 0,
        "active": True,
    }
]


async def seed_admin(db):
    await db.admins.update_one(
        {"username": settings.admin_username},
        {"$setOnInsert": {"username": settings.admin_username, "password": hash_password(settings.admin_password)}},
        upsert=True,
    )
    print(f"admin ready: {settings.admin_username}")


async def seed_doctors(db):
    for doc in DOCTORS:
        await db.doctors.update_one({"name": doc["name"]}, {"$setOnInsert": doc}, upsert=True)
    print(f"doctors: {await db.doctors.count_documents({})}")


async def seed_gallery(db):
    """Load the frontend's gallery photos into GridFS (idempotent: skips files already imported)."""
    import mimetypes

    from .uploads import store_bytes

    source = FRONTEND / "images" / "gallery"
    clinic = sorted(p for p in (source / "clinic").glob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    camps = sorted(p for p in (source / "camps").glob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    # Matches the website: first 8 clinic photos are Infrastructure, the rest the Clinic Gallery.
    groups = {"infrastructure": clinic[:8], "clinic": clinic[8:], "camps": camps}

    for category, files in groups.items():
        added = 0
        for order, path in enumerate(files):
            if await db.gallery.find_one({"category": category, "source_name": path.name}):
                continue
            content_type = mimetypes.guess_type(path.name)[0] or "image/jpeg"
            src = await store_bytes(path.read_bytes(), path.name, content_type, "gallery")
            await db.gallery.insert_one({
                "category": category, "caption": "", "src": src, "source_name": path.name,
                "order": order, "created_at": datetime.now(timezone.utc),
            })
            added += 1
        print(f"{category}: {len(files)} photos ({added} newly imported)")


async def main():
    db = get_db()
    await ensure_indexes()
    await seed_admin(db)
    await seed_doctors(db)
    if "--gallery" in sys.argv:
        await seed_gallery(db)
    print("done")


if __name__ == "__main__":
    asyncio.run(main())
