"""File storage for uploads (gallery photos, doctor photos, research PDFs, records, clips).

Files live in Postgres (`files` table) so a single `pg_dump` backs up everything and the
container's disk can be thrown away. Each file is served at /api/files/<id>.
Paths starting with /uploads/ are legacy local files.
"""
import io
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from .config import settings
from .tables import StoredFile

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"}
MAX_IMAGE_EDGE = 1600  # px — sharp on any screen, light enough for phones
PDF_TYPES = {"application/pdf"}
VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v"}
FILE_PREFIX = "/api/files/"


def store_bytes(session: AsyncSession, data: bytes, filename: str, content_type: str, folder: str) -> str:
    """Stage a file in the session; it is written with the caller's commit."""
    file_id = uuid.uuid4().hex
    session.add(StoredFile(id=file_id, filename=filename, content_type=content_type, folder=folder,
                           size=len(data), data=data))
    return f"{FILE_PREFIX}{file_id}"


def optimise_image(data: bytes, filename: str) -> tuple[bytes, str, str]:
    """Resize to web size, fix phone rotation, strip metadata; HEIC becomes JPEG.

    Returns (bytes, content_type, filename). Transparent PNGs stay PNG.
    """
    from PIL import Image, ImageOps
    from pillow_heif import register_heif_opener

    register_heif_opener()
    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)
    except Exception:
        raise HTTPException(400, "That file could not be read as an image. Please upload a JPG or PNG photo.")

    img.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE))
    stem = Path(filename).stem or "photo"
    out = io.BytesIO()
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        img.save(out, "PNG", optimize=True)
        return out.getvalue(), "image/png", f"{stem}.png"
    img.convert("RGB").save(out, "JPEG", quality=82, optimize=True, progressive=True)
    return out.getvalue(), "image/jpeg", f"{stem}.jpg"


async def save_upload(session: AsyncSession, file: UploadFile, folder: str, allowed: set[str]) -> str:
    """Validate an upload, stage it for storage and return its public path."""
    filename = file.filename or "upload"
    content_type = file.content_type or ""
    is_image_upload = allowed is IMAGE_TYPES
    is_video_upload = allowed is VIDEO_TYPES
    suffix = Path(filename).suffix.lower()
    # Some browsers send HEIC photos / MOV clips with an empty or generic type — trust the extension there.
    trusted_by_extension = (is_image_upload and suffix in IMAGE_EXTENSIONS) or (is_video_upload and suffix in VIDEO_EXTENSIONS)
    if content_type not in allowed and not trusted_by_extension:
        kind = ("a JPG, PNG, WebP or HEIC photo" if is_image_upload
                else "an MP4, MOV or WebM video" if is_video_upload else "a PDF")
        raise HTTPException(400, f"Unsupported file type ({content_type or 'unknown'}). Please upload {kind}.")
    if is_video_upload and content_type not in VIDEO_TYPES:
        content_type = {".webm": "video/webm", ".mov": "video/quicktime"}.get(suffix, "video/mp4")

    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    limit = settings.max_video_mb if is_video_upload else settings.max_upload_mb
    if size_mb > limit:
        raise HTTPException(400, f"File is {size_mb:.1f} MB — the limit is {limit} MB.")

    if is_image_upload:
        data, content_type, filename = await run_in_threadpool(optimise_image, data, filename)
    return store_bytes(session, data, filename, content_type, folder)


def file_id_from_path(public_path: str | None) -> str | None:
    if not public_path or not public_path.startswith(FILE_PREFIX):
        return None
    return public_path.removeprefix(FILE_PREFIX) or None


async def delete_upload(session: AsyncSession, public_path: str | None) -> None:
    """Remove a stored file with the caller's commit. Safe to call with any path, including None."""
    file_id = file_id_from_path(public_path)
    if file_id:
        await session.execute(delete(StoredFile).where(StoredFile.id == file_id))
    elif public_path and public_path.startswith("/uploads/"):  # legacy local file
        (Path(settings.upload_dir) / public_path.removeprefix("/uploads/")).unlink(missing_ok=True)
