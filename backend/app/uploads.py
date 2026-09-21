"""File storage for admin uploads (gallery photos, doctor photos, research PDFs).

Files are stored in MongoDB GridFS rather than on local disk, because hosts like
Render's free tier wipe the disk on every restart or redeploy. Each file is served
back at /api/files/<id>. Paths starting with /uploads/ are legacy local files.
"""
import io
from pathlib import Path

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from .config import settings
from .db import get_db

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"}
MAX_IMAGE_EDGE = 1600  # px — sharp on any screen, light enough for phones
PDF_TYPES = {"application/pdf"}
FILE_PREFIX = "/api/files/"


def bucket() -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(get_db(), bucket_name="files")


async def store_bytes(data: bytes, filename: str, content_type: str, folder: str) -> str:
    file_id = await bucket().upload_from_stream(
        filename, data, metadata={"content_type": content_type, "folder": folder}
    )
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


async def save_upload(file: UploadFile, folder: str, allowed: set[str]) -> str:
    """Validate an upload, store it in GridFS and return its public path."""
    filename = file.filename or "upload"
    content_type = file.content_type or ""
    is_image_upload = allowed is IMAGE_TYPES
    # Some browsers send HEIC photos with an empty or generic type — trust the extension there.
    if content_type not in allowed and not (is_image_upload and Path(filename).suffix.lower() in IMAGE_EXTENSIONS):
        kind = "a JPG, PNG, WebP or HEIC photo" if is_image_upload else "a PDF"
        raise HTTPException(400, f"Unsupported file type ({content_type or 'unknown'}). Please upload {kind}.")

    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(400, f"File is {size_mb:.1f} MB — the limit is {settings.max_upload_mb} MB.")

    if is_image_upload:
        data, content_type, filename = optimise_image(data, filename)
    return await store_bytes(data, filename, content_type, folder)


def file_id_from_path(public_path: str | None) -> ObjectId | None:
    if not public_path or not public_path.startswith(FILE_PREFIX):
        return None
    try:
        return ObjectId(public_path.removeprefix(FILE_PREFIX))
    except InvalidId:
        return None


async def delete_upload(public_path: str | None) -> None:
    """Remove a stored file. Safe to call with any path, including None."""
    file_id = file_id_from_path(public_path)
    if file_id:
        try:
            await bucket().delete(file_id)
        except Exception:
            pass  # already gone
        return
    if public_path and public_path.startswith("/uploads/"):  # legacy local file
        (Path(settings.upload_dir) / public_path.removeprefix("/uploads/")).unlink(missing_ok=True)
