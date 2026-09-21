import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from .config import settings

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
PDF_TYPES = {"application/pdf"}
SAFE = re.compile(r"[^a-zA-Z0-9._-]+")


async def save_upload(file: UploadFile, folder: str, allowed: set[str]) -> str:
    """Store an upload under uploads/<folder>/ and return its public path."""
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(400, f"File is {size_mb:.1f} MB — the limit is {settings.max_upload_mb} MB.")

    suffix = Path(file.filename or "").suffix.lower() or ".bin"
    name = f"{uuid.uuid4().hex}{SAFE.sub('-', suffix)}"
    target_dir = Path(settings.upload_dir) / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / name).write_bytes(data)
    return f"/uploads/{folder}/{name}"


def delete_upload(public_path: str | None) -> None:
    if not public_path or not public_path.startswith("/uploads/"):
        return
    path = Path(settings.upload_dir) / public_path.removeprefix("/uploads/")
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
