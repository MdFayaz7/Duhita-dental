"""Patient feedback video clips (portrait 9:16), shown on the website's Reviews page."""
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import delete, func, select, update

from ..db import SessionDep, serialize
from ..models import FeedbackUpdate
from ..security import current_admin
from ..tables import Feedback
from ..videos import cloud_enabled, delete_video, save_video, size_limit_mb
from .reorder import positions

router = APIRouter(prefix="/api/feedback", tags=["feedback"])
ORDER = (Feedback.order, Feedback.created_at.desc())


@router.get("")
async def list_clips(session: SessionDep):
    rows = await session.scalars(select(Feedback).where(Feedback.active.is_(True)).order_by(*ORDER).limit(100))
    return {"items": [serialize(r) for r in rows]}


@router.get("/all", dependencies=[Depends(current_admin)])
async def list_all_clips(session: SessionDep):
    """Admin view, including hidden clips."""
    rows = await session.scalars(select(Feedback).order_by(*ORDER).limit(100))
    return {"items": [serialize(r) for r in rows], "max_mb": size_limit_mb(), "cdn": cloud_enabled()}


@router.post("", status_code=201, dependencies=[Depends(current_admin)])
async def upload_clip(
    session: SessionDep,
    patient_name: str = Form(""),
    caption: str = Form(""),
    file: UploadFile = File(...),
):
    stored = await save_video(session, file)
    clip = Feedback(
        patient_name=patient_name.strip(),
        caption=caption.strip(),
        **stored,
        active=True,
        order=await session.scalar(select(func.count()).select_from(Feedback)),
    )
    session.add(clip)
    await session.commit()
    return serialize(clip)


@router.patch("/{clip_id}", dependencies=[Depends(current_admin)])
async def update_clip(clip_id: int, payload: FeedbackUpdate, session: SessionDep):
    changes = payload.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    clip = (await session.execute(
        update(Feedback).where(Feedback.id == clip_id).values(**changes).returning(Feedback)
    )).scalar_one_or_none()
    if not clip:
        raise HTTPException(404, "Clip not found.")
    await session.commit()
    return serialize(clip)


@router.post("/reorder", dependencies=[Depends(current_admin)])
async def reorder(session: SessionDep, ids: list[str] = Body(...)):
    await session.execute(update(Feedback), positions(ids))
    await session.commit()
    return {"ok": True}


@router.delete("/{clip_id}", dependencies=[Depends(current_admin)])
async def delete_clip(clip_id: int, session: SessionDep):
    clip = (await session.execute(delete(Feedback).where(Feedback.id == clip_id).returning(Feedback))).scalar_one_or_none()
    if not clip:
        raise HTTPException(404, "Clip not found.")
    await delete_video(session, clip)
    await session.commit()
    return {"ok": True}
