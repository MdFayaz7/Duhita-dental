"""Seed the database: admin user, doctors, and the images/research already in the site folder.

    python -m app.seed            # admin + doctors
    python -m app.seed --gallery  # also import public/images/gallery/* from the frontend
"""
import asyncio
import shutil
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
    """Copy the frontend's gallery files into uploads/ and index them."""
    mapping = {"clinic": ("clinic", 8), "infrastructure": ("clinic", None), "camps": ("camps", None)}
    for category, (folder, limit) in mapping.items():
        source = FRONTEND / "images" / "gallery" / folder
        if not source.exists():
            print(f"skip {category}: {source} not found")
            continue
        files = sorted(p for p in source.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
        files = files[:limit] if limit else (files[8:] if category == "infrastructure" else files)
        target = Path(settings.upload_dir) / "gallery" / category
        target.mkdir(parents=True, exist_ok=True)
        for order, path in enumerate(files):
            dest = target / path.name
            if not dest.exists():
                shutil.copy2(path, dest)
            src = f"/uploads/gallery/{category}/{path.name}"
            await db.gallery.update_one(
                {"src": src},
                {"$setOnInsert": {
                    "category": category, "caption": "", "src": src,
                    "order": order, "created_at": datetime.now(timezone.utc),
                }},
                upsert=True,
            )
        print(f"{category}: {len(files)} images")


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
