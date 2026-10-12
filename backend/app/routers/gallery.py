from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import delete, func, select, update

from ..db import SessionDep, serialize
from ..models import GalleryUpdate
from ..security import current_admin
from ..tables import GalleryImage
from ..uploads import IMAGE_TYPES, delete_upload, save_upload
from .reorder import positions

router = APIRouter(prefix="/api/gallery", tags=["gallery"])
CATEGORIES = {"clinic", "infrastructure", "camps"}


@router.get("")
async def list_images(session: SessionDep, category: str | None = Query(None), limit: int = Query(200, le=500)):
    stmt = select(GalleryImage).order_by(GalleryImage.order, GalleryImage.created_at.desc()).limit(limit)
    if category:
        stmt = stmt.where(GalleryImage.category == category)
    return {"items": [serialize(r) for r in await session.scalars(stmt)]}


@router.post("", status_code=201, dependencies=[Depends(current_admin)])
async def upload_image(
    session: SessionDep,
    category: str = Form(...),
    caption: str = Form(""),
    file: UploadFile = File(...),
):
    if category not in CATEGORIES:
        raise HTTPException(400, f"Category must be one of: {', '.join(sorted(CATEGORIES))}")
    image = GalleryImage(
        category=category,
        caption=caption.strip(),
        src=await save_upload(session, file, f"gallery/{category}", IMAGE_TYPES),
        order=await session.scalar(select(func.count()).where(GalleryImage.category == category)),
    )
    session.add(image)
    await session.commit()
    return serialize(image)


@router.patch("/{image_id}", dependencies=[Depends(current_admin)])
async def update_image(image_id: int, payload: GalleryUpdate, session: SessionDep):
    changes = payload.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(400, "Nothing to update.")
    image = (await session.execute(
        update(GalleryImage).where(GalleryImage.id == image_id).values(**changes).returning(GalleryImage)
    )).scalar_one_or_none()
    if not image:
        raise HTTPException(404, "Image not found.")
    await session.commit()
    return serialize(image)


@router.post("/reorder", dependencies=[Depends(current_admin)])
async def reorder(session: SessionDep, ids: list[str] = Body(...)):
    """Send the image ids in the order they should appear."""
    await session.execute(update(GalleryImage), positions(ids))
    await session.commit()
    return {"ok": True, "count": len(ids)}


@router.delete("/{image_id}", dependencies=[Depends(current_admin)])
async def delete_image(image_id: int, session: SessionDep):
    row = (await session.execute(delete(GalleryImage).where(GalleryImage.id == image_id).returning(GalleryImage.src))).first()
    if not row:
        raise HTTPException(404, "Image not found.")
    await delete_upload(session, row.src)
    await session.commit()
    return {"ok": True}
