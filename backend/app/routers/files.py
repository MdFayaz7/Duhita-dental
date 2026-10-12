import re

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import func, select

from ..db import SessionDep, engine
from ..tables import StoredFile

router = APIRouter(prefix="/api/files", tags=["files"])
RANGE = re.compile(r"bytes=(\d*)-(\d*)")
CHUNK = 1024 * 1024


def _slice(file_id: str, start: int, length: int):
    # substring() on a STORAGE EXTERNAL bytea reads only the requested pages.
    return select(func.substring(StoredFile.data, start + 1, length)).where(StoredFile.id == file_id)


@router.api_route("/{file_id}", methods=["GET", "HEAD"])
async def get_file(file_id: str, request: Request, session: SessionDep):
    """Serve a stored file. Supports byte ranges, which iPhone Safari requires to play video."""
    meta = (await session.execute(
        select(StoredFile.filename, StoredFile.content_type, StoredFile.size).where(StoredFile.id == file_id)
    )).first()
    if not meta:
        raise HTTPException(404, "File not found.")

    filename, content_type, size = meta
    headers = {
        # File ids never change, so browsers and CDNs may cache them for a year.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
        "Content-Disposition": f'inline; filename="{filename}"',
    }

    start, end, status = 0, size - 1, 200
    match = RANGE.fullmatch(request.headers.get("range", "").strip())
    if match and size:
        first, last = match.groups()
        if first:
            start = int(first)
            end = min(int(last), size - 1) if last else size - 1
        elif last:  # "bytes=-500" → the final 500 bytes
            start = max(size - int(last), 0)
        if start >= size or start > end:
            return Response(status_code=416, headers={"Content-Range": f"bytes */{size}"})
        status = 206
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"

    length = end - start + 1 if size else 0
    headers["Content-Length"] = str(length)
    if request.method == "HEAD" or not length:
        return Response(status_code=status, media_type=content_type, headers=headers)

    if length <= CHUNK:  # photos and PDFs: one query, no streaming overhead
        body = (await session.execute(_slice(file_id, start, length))).scalar_one()
        return Response(body, status_code=status, media_type=content_type, headers=headers)

    async def stream():
        # The request session is closed once the response starts, so stream on a connection of our own.
        async with engine.connect() as conn:
            offset, remaining = start, length
            while remaining > 0:
                chunk = (await conn.execute(_slice(file_id, offset, min(CHUNK, remaining)))).scalar_one()
                if not chunk:
                    break
                offset += len(chunk)
                remaining -= len(chunk)
                yield chunk

    return StreamingResponse(stream(), status_code=status, media_type=content_type, headers=headers)
