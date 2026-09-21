from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from ..db import get_db, serialize
from ..models import GalleryUpdate
from ..security import current_admin
from ..uploads import IMAGE_TYPES, delete_upload, save_upload

router = APIRouter(prefix="/api/gallery", tags=["gallery"])
CATEGORIES = {"clinic", "infrastructure", "camps"}


@router.get("")
async def list_images(category: str | None = Query(None), limit: int = Query(200, le=500)):
    query = {"category": category} if category else {}
    cursor = get_db().gallery.find(query).sort([("order", 1), ("created_at", -1)])
    return {"items": [serialize(d) for d in await cursor.to_list(limit)]}


@router.post("", status_code=201, dependencies=[Depends(current_admin)])
async def upload_image(
    category: str = Form(...),
    caption: str = Form(""),
    file: UploadFile = File(...),
):
    if category not in CATEGORIES:
        raise HTTPException(400, f"Category must be one of: {', '.join(sorted(CATEGORIES))}")
    db = get_db()
    path = await save_upload(file, f"gallery/{category}", IMAGE_TYPES)
    doc = {
        "category": category,
        "caption": caption.strip(),
        "src": path,
        "order": await db.gallery.count_documents({"category": category}),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.gallery.insert_one(doc)
    return serialize(await db.gallery.find_one({"_id": result.inserted_id}))


@router.patch("/{image_id}", dependencies=[Depends(current_admin)])
async def update_image(image_id: str, payload: GalleryUpdate):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    res = await get_db().gallery.find_one_and_update(
        {"_id": ObjectId(image_id)}, {"$set": changes}, return_document=True
    )
    if not res:
        raise HTTPException(404, "Image not found.")
    return serialize(res)


@router.post("/reorder", dependencies=[Depends(current_admin)])
async def reorder(ids: list[str]):
    """Send the image ids in the order they should appear."""
    db = get_db()
    for position, image_id in enumerate(ids):
        await db.gallery.update_one({"_id": ObjectId(image_id)}, {"$set": {"order": position}})
    return {"ok": True, "count": len(ids)}


@router.delete("/{image_id}", dependencies=[Depends(current_admin)])
async def delete_image(image_id: str):
    doc = await get_db().gallery.find_one_and_delete({"_id": ObjectId(image_id)})
    if not doc:
        raise HTTPException(404, "Image not found.")
    delete_upload(doc.get("src"))
    return {"ok": True}
