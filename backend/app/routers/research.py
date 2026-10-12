from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import delete, select

from ..db import SessionDep, serialize
from ..security import current_admin
from ..tables import Research
from ..uploads import PDF_TYPES, delete_upload, save_upload

router = APIRouter(prefix="/api/research", tags=["research"])


@router.get("")
async def list_papers(session: SessionDep):
    rows = await session.scalars(select(Research).order_by(Research.created_at.desc()).limit(200))
    return {"items": [serialize(r) for r in rows]}


@router.post("", status_code=201, dependencies=[Depends(current_admin)])
async def create_paper(
    session: SessionDep,
    title: str = Form(...),
    authors: str = Form(...),
    publication: str = Form(""),
    year: str = Form(""),
    category: str = Form(""),
    description: str = Form(""),
    file: UploadFile | None = File(None),
):
    paper = Research(
        title=title.strip(),
        authors=authors.strip(),
        publication=publication.strip() or None,
        year=year.strip() or None,
        category=category.strip() or None,
        description=description.strip() or None,
        file=await save_upload(session, file, "research", PDF_TYPES) if file else None,
    )
    session.add(paper)
    await session.commit()
    return serialize(paper)


@router.patch("/{paper_id}", dependencies=[Depends(current_admin)])
async def update_paper(
    paper_id: int,
    session: SessionDep,
    title: str | None = Form(None),
    authors: str | None = Form(None),
    publication: str | None = Form(None),
    year: str | None = Form(None),
    category: str | None = Form(None),
    description: str | None = Form(None),
    file: UploadFile | None = File(None),
):
    paper = await session.get(Research, paper_id)
    if not paper:
        raise HTTPException(404, "Paper not found.")

    changes = {k: v for k, v in {
        "title": title, "authors": authors, "publication": publication,
        "year": year, "category": category, "description": description,
    }.items() if v is not None}
    if file:
        await delete_upload(session, paper.file)
        changes["file"] = await save_upload(session, file, "research", PDF_TYPES)
    if not changes:
        raise HTTPException(400, "Nothing to update.")

    for key, value in changes.items():
        setattr(paper, key, value)
    await session.commit()
    return serialize(paper)


@router.delete("/{paper_id}", dependencies=[Depends(current_admin)])
async def delete_paper(paper_id: int, session: SessionDep):
    row = (await session.execute(delete(Research).where(Research.id == paper_id).returning(Research.file))).first()
    if not row:
        raise HTTPException(404, "Paper not found.")
    await delete_upload(session, row.file)
    await session.commit()
    return {"ok": True}
