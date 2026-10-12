"""Give existing feedback clips a cover image.

Clips uploaded before covers existed show a placeholder until they play. This
pulls each clip out of storage, grabs its first clear frame and saves it as the
clip's cover. Safe to re-run: clips that already have one are skipped.

    python -m app.make_covers
"""
import asyncio
import tempfile

from sqlalchemy import select
from starlette.concurrency import run_in_threadpool

from .db import SessionLocal, engine
from .tables import Feedback, StoredFile
from .uploads import file_id_from_path, store_bytes
from .videos import grab_cover


async def main() -> None:
    made = skipped = failed = 0
    async with SessionLocal() as session:
        for clip in (await session.scalars(select(Feedback))).all():
            name = clip.patient_name or str(clip.id)
            file_id = file_id_from_path(clip.src)
            if clip.poster or not file_id:  # Cloudinary clips get their cover from the CDN
                skipped += 1
                continue

            data = await session.scalar(select(StoredFile.data).where(StoredFile.id == file_id))
            if not data:
                failed += 1
                continue
            with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp:
                tmp.write(data)
                tmp.flush()
                cover = await run_in_threadpool(grab_cover, tmp.name)

            if not cover:
                print(f"  could not read a frame from {name}")
                failed += 1
                continue

            clip.poster = store_bytes(session, cover, f"{file_id}-cover.jpg", "image/jpeg", "feedback")
            await session.commit()
            print(f"  cover made for {name} ({len(cover) // 1024} KB)")
            made += 1
    await engine.dispose()
    print(f"Done — {made} cover(s) made, {skipped} skipped, {failed} failed.")


if __name__ == "__main__":
    asyncio.run(main())
