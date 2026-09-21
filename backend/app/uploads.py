"""File storage for admin uploads (gallery photos, doctor photos, research PDFs).

Files are stored in MongoDB GridFS rather than on local disk, because hosts like
Render's free tier wipe the disk on every restart or redeploy. Each file is served
back at /api/files/<id>. Paths starting with /uploads/ are legacy local files.
"""
from pathlib import Path

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from .config import settings
from .db import get_db

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
PDF_TYPES = {"application/pdf"}
FILE_PREFIX = "/api/files/"


def bucket() -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(get_db(), bucket_name="files")


async def store_bytes(data: bytes, filename: str, content_type: str, folder: str) -> str:
    file_id = await bucket().upload_from_stream(
        filename, data, metadata={"content_type": content_type, "folder": folder}
    )
    return f"{FILE_PREFIX}{file_id}"


async def save_upload(file: UploadFile, folder: str, allowed: set[str]) -> str:
    """Validate an upload, store it in GridFS and return its public path."""
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(400, f"File is {size_mb:.1f} MB — the limit is {settings.max_upload_mb} MB.")
    return await store_bytes(data, file.filename or "upload", file.content_type, folder)


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
