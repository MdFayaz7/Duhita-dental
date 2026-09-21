"""One-off: move files referenced as /uploads/... into GridFS and update the records.

    python -m app.migrate_uploads
"""
import asyncio
import mimetypes
from pathlib import Path

from .config import settings
from .db import get_db
from .uploads import store_bytes

TARGETS = [("gallery", "src"), ("doctors", "photo"), ("research", "file")]


async def main():
    db = get_db()
    moved = missing = 0
    for collection, field in TARGETS:
        async for doc in db[collection].find({field: {"$regex": "^/uploads/"}}):
            local = Path(settings.upload_dir) / doc[field].removeprefix("/uploads/")
            if not local.exists():
                missing += 1
                print(f"missing: {local}")
                continue
            content_type = mimetypes.guess_type(local.name)[0] or "application/octet-stream"
            new_path = await store_bytes(local.read_bytes(), local.name, content_type, collection)
            await db[collection].update_one({"_id": doc["_id"]}, {"$set": {field: new_path}})
            moved += 1
    print(f"moved {moved} file(s) into GridFS, {missing} missing")


if __name__ == "__main__":
    asyncio.run(main())
