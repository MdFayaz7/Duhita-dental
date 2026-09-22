"""Patient feedback video clips (portrait 9:16), shown on the website's Reviews page."""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..db import get_db, serialize
from ..models import FeedbackUpdate
from ..security import current_admin
from ..videos import cloud_enabled, delete_video, save_video, size_limit_mb

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.get("")
async def list_clips():
    cursor = get_db().feedback.find({"active": {"$ne": False}}).sort([("order", 1), ("created_at", -1)])
    return {"items": [serialize(d) for d in await cursor.to_list(100)]}


@router.get("/all", dependencies=[Depends(current_admin)])
async def list_all_clips():
    """Admin view, including hidden clips."""
    cursor = get_db().feedback.find().sort([("order", 1), ("created_at", -1)])
    return {
        "items": [serialize(d) for d in await cursor.to_list(100)],
        "max_mb": size_limit_mb(),
        "cdn": cloud_enabled(),
    }


@router.post("", status_code=201, dependencies=[Depends(current_admin)])
async def upload_clip(
    patient_name: str = Form(""),
    caption: str = Form(""),
    file: UploadFile = File(...),
):
    db = get_db()
    stored = await save_video(file)
    doc = {
        "patient_name": patient_name.strip(),
        "caption": caption.strip(),
        **stored,
        "active": True,
        "order": await db.feedback.count_documents({}),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.feedback.insert_one(doc)
    return serialize(await db.feedback.find_one({"_id": result.inserted_id}))


@router.patch("/{clip_id}", dependencies=[Depends(current_admin)])
async def update_clip(clip_id: str, payload: FeedbackUpdate):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    res = await get_db().feedback.find_one_and_update(
        {"_id": ObjectId(clip_id)}, {"$set": changes}, return_document=True
    )
    if not res:
        raise HTTPException(404, "Clip not found.")
    return serialize(res)


@router.post("/reorder", dependencies=[Depends(current_admin)])
async def reorder(ids: list[str]):
    db = get_db()
    for position, clip_id in enumerate(ids):
        await db.feedback.update_one({"_id": ObjectId(clip_id)}, {"$set": {"order": position}})
    return {"ok": True}


@router.delete("/{clip_id}", dependencies=[Depends(current_admin)])
async def delete_clip(clip_id: str):
    doc = await get_db().feedback.find_one_and_delete({"_id": ObjectId(clip_id)})
    if not doc:
        raise HTTPException(404, "Clip not found.")
    await delete_video(doc)
    return {"ok": True}
