"""Patient feedback video storage.

With CLOUDINARY_URL set, clips go to Cloudinary: they are served from its CDN,
re-encoded to a light 720p stream and get a poster frame, so the website never
has to stream video through this (small) server. Without it, clips fall back to
MongoDB GridFS with a tighter size limit.
"""
from pathlib import Path

from fastapi import HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from .config import settings
from .uploads import FILE_PREFIX, VIDEO_EXTENSIONS, VIDEO_TYPES, bucket, delete_upload

# Portrait-friendly web stream: at most 720px wide, automatic codec and quality.
STREAM = "c_limit,w_720,q_auto,vc_auto"
POSTER = "c_limit,w_540,q_auto,so_1"
FOLDER = "duhita/feedback"


def cloud_enabled() -> bool:
    return bool(settings.cloudinary_url)


def size_limit_mb() -> int:
    return settings.max_video_mb if cloud_enabled() else settings.max_local_video_mb


def _cloudinary():
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(cloudinary_url=settings.cloudinary_url, secure=True)
    return cloudinary


def _urls(public_id: str) -> dict:
    cloud = _cloudinary().config().cloud_name
    base = f"https://res.cloudinary.com/{cloud}/video/upload"
    return {"src": f"{base}/{STREAM}/{public_id}.mp4", "poster": f"{base}/{POSTER}/{public_id}.jpg"}


def _check(file: UploadFile) -> tuple[str, str]:
    filename = file.filename or "clip.mp4"
    suffix = Path(filename).suffix.lower()
    content_type = file.content_type or ""
    if content_type not in VIDEO_TYPES and suffix not in VIDEO_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type ({content_type or 'unknown'}). Please upload an MP4, MOV or WebM video.")
    if content_type not in VIDEO_TYPES:
        content_type = {".webm": "video/webm", ".mov": "video/quicktime"}.get(suffix, "video/mp4")

    size = file.size
    if size is None:  # size unknown — measure without loading the clip into memory
        file.file.seek(0, 2)
        size = file.file.tell()
    file.file.seek(0)
    limit = size_limit_mb()
    if size > limit * 1024 * 1024:
        hint = "" if cloud_enabled() else " Compress it (720p is plenty) or connect Cloudinary for larger clips."
        raise HTTPException(400, f"Video is {size / 1048576:.0f} MB — the limit is {limit} MB.{hint}")
    return filename, content_type


async def save_video(file: UploadFile) -> dict:
    """Store a clip; returns the fields to keep on the feedback document."""
    filename, content_type = _check(file)

    if cloud_enabled():
        uploader = _cloudinary().uploader
        try:
            result = await run_in_threadpool(
                uploader.upload_large,
                file.file,
                resource_type="video",
                folder=FOLDER,
                chunk_size=6 * 1024 * 1024,
                # Encode the web version now, so the first visitor doesn't wait for it.
                eager=[{"raw_transformation": STREAM, "format": "mp4"}],
                eager_async=True,
            )
        except Exception as exc:
            raise HTTPException(502, f"Video upload to Cloudinary failed: {exc}") from exc
        return {"cloud_id": result["public_id"], **_urls(result["public_id"])}

    # GridFS fallback — streamed from the temp file, never read fully into memory.
    file_id = await bucket().upload_from_stream(
        filename, file.file, metadata={"content_type": content_type, "folder": "feedback"}
    )
    return {"src": f"{FILE_PREFIX}{file_id}", "poster": ""}


async def delete_video(doc: dict) -> None:
    if doc.get("cloud_id"):
        try:
            await run_in_threadpool(
                _cloudinary().uploader.destroy, doc["cloud_id"], resource_type="video", invalidate=True
            )
        except Exception:
            pass  # already gone or Cloudinary unreachable — the website no longer lists it anyway
        return
    await delete_upload(doc.get("src"))
