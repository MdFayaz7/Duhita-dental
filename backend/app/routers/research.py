from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..db import get_db, serialize
from ..security import current_admin
from ..uploads import PDF_TYPES, delete_upload, save_upload

router = APIRouter(prefix="/api/research", tags=["research"])


@router.get("")
async def list_papers():
    cursor = get_db().research.find().sort("created_at", -1)
    return {"items": [serialize(d) for d in await cursor.to_list(200)]}


@router.post("", status_code=201, dependencies=[Depends(current_admin)])
async def create_paper(
    title: str = Form(...),
    authors: str = Form(...),
    publication: str = Form(""),
    year: str = Form(""),
    category: str = Form(""),
    description: str = Form(""),
    file: UploadFile | None = File(None),
):
    doc = {
        "title": title.strip(),
        "authors": authors.strip(),
        "publication": publication.strip() or None,
        "year": year.strip() or None,
        "category": category.strip() or None,
        "description": description.strip() or None,
        "file": await save_upload(file, "research", PDF_TYPES) if file else None,
        "created_at": datetime.now(timezone.utc),
    }
    db = get_db()
    result = await db.research.insert_one(doc)
    return serialize(await db.research.find_one({"_id": result.inserted_id}))


@router.patch("/{paper_id}", dependencies=[Depends(current_admin)])
async def update_paper(
    paper_id: str,
    title: str | None = Form(None),
    authors: str | None = Form(None),
    publication: str | None = Form(None),
    year: str | None = Form(None),
    category: str | None = Form(None),
    description: str | None = Form(None),
    file: UploadFile | None = File(None),
):
    db = get_db()
    current = await db.research.find_one({"_id": ObjectId(paper_id)})
    if not current:
        raise HTTPException(404, "Paper not found.")

    changes = {k: v for k, v in {
        "title": title, "authors": authors, "publication": publication,
        "year": year, "category": category, "description": description,
    }.items() if v is not None}

    if file:
        changes["file"] = await save_upload(file, "research", PDF_TYPES)
        delete_upload(current.get("file"))
    if not changes:
        raise HTTPException(400, "Nothing to update.")

    res = await db.research.find_one_and_update(
        {"_id": ObjectId(paper_id)}, {"$set": changes}, return_document=True
    )
    return serialize(res)


@router.delete("/{paper_id}", dependencies=[Depends(current_admin)])
async def delete_paper(paper_id: str):
    doc = await get_db().research.find_one_and_delete({"_id": ObjectId(paper_id)})
    if not doc:
        raise HTTPException(404, "Paper not found.")
    delete_upload(doc.get("file"))
    return {"ok": True}
