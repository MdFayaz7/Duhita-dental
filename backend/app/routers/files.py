import re

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from gridfs.errors import NoFile

from ..uploads import bucket

router = APIRouter(prefix="/api/files", tags=["files"])
RANGE = re.compile(r"bytes=(\d*)-(\d*)")
CHUNK = 256 * 1024


@router.api_route("/{file_id}", methods=["GET", "HEAD"])
async def get_file(file_id: str, request: Request):
    """Serve a stored file. Supports byte ranges, which iPhone Safari requires to play video."""
    try:
        stream = await bucket().open_download_stream(ObjectId(file_id))
    except (InvalidId, NoFile):
        raise HTTPException(404, "File not found.")

    size = stream.length
    content_type = (stream.metadata or {}).get("content_type", "application/octet-stream")
    headers = {
        # File ids never change, so browsers and CDNs may cache them for a year.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
        "Content-Disposition": f'inline; filename="{stream.filename}"',
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

    headers["Content-Length"] = str(end - start + 1 if size else 0)
    if request.method == "HEAD":
        return Response(status_code=status, media_type=content_type, headers=headers)
    stream.seek(start)

    async def body():
        remaining = end - start + 1
        while remaining > 0:
            chunk = await stream.read(min(CHUNK, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk

    return StreamingResponse(body(), status_code=status, media_type=content_type, headers=headers)
