"""Give existing feedback clips a cover image.

Clips uploaded before covers existed show a placeholder until they play. This
pulls each clip out of storage, grabs its first clear frame and saves it as the
clip's cover. Safe to re-run: clips that already have one are skipped.

    python -m app.make_covers
"""
import asyncio
import tempfile
from pathlib import Path

from starlette.concurrency import run_in_threadpool

from .db import get_db
from .uploads import bucket, file_id_from_path, store_bytes
from .videos import grab_cover


async def main() -> None:
    db = get_db()
    made = skipped = failed = 0

    async for clip in db.feedback.find():
        name = clip.get("patient_name") or str(clip["_id"])
        if clip.get("poster"):
            skipped += 1
            continue
        file_id = file_id_from_path(clip.get("src"))
        if not file_id:  # Cloudinary clips get their cover from the CDN
            skipped += 1
            continue

        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp:
            await bucket().download_to_stream(file_id, tmp)
            tmp.flush()
            cover = await run_in_threadpool(grab_cover, tmp.name)

        if not cover:
            print(f"  could not read a frame from {name}")
            failed += 1
            continue

        poster = await store_bytes(cover, f"{file_id}-cover.jpg", "image/jpeg", "feedback")
        await db.feedback.update_one({"_id": clip["_id"]}, {"$set": {"poster": poster}})
        print(f"  cover made for {name} ({len(cover) // 1024} KB)")
        made += 1

    print(f"Done — {made} cover(s) made, {skipped} skipped, {failed} failed.")


if __name__ == "__main__":
    asyncio.run(main())
