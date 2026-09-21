from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from gridfs.errors import NoFile

from ..uploads import bucket

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/{file_id}")
async def get_file(file_id: str):
    try:
        stream = await bucket().open_download_stream(ObjectId(file_id))
    except (InvalidId, NoFile):
        raise HTTPException(404, "File not found.")

    content_type = (stream.metadata or {}).get("content_type", "application/octet-stream")

    async def chunks():
        while chunk := await stream.readchunk():
            yield chunk

    return StreamingResponse(
        chunks(),
        media_type=content_type,
        headers={
            # File ids never change, so browsers and CDNs may cache them for a year.
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": str(stream.length),
            "Content-Disposition": f'inline; filename="{stream.filename}"',
        },
    )
