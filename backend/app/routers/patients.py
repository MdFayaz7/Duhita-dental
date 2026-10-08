import random
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from ..db import get_db, serialize
from ..events import broadcast_event
from ..models import AppRecordIn, PatientIn
from ..security import current_admin
from ..uploads import IMAGE_TYPES, PDF_TYPES, delete_upload, save_upload

router = APIRouter(prefix="/api/patients", tags=["patients"])


async def _next_patient_id(db) -> str:
    stamp = datetime.now(IST).strftime("%y%m")
    for _ in range(25):
        candidate = f"DD{stamp}-{random.randint(1000, 9999)}"
        if not await db.patients.find_one({"patient_id": candidate}):
            return candidate
    raise HTTPException(500, "Could not allocate a patient ID. Please try again.")


@router.post("", status_code=201)
async def register(payload: PatientIn):
    db = get_db()
    doc = payload.model_dump()
    doc["patient_id"] = await _next_patient_id(db)
    doc["created_at"] = datetime.now(timezone.utc)
    await db.patients.insert_one(doc)
    res = {"patient_id": doc["patient_id"], "name": doc["name"]}
    await broadcast_event("patient_registered", serialize(doc))
    await broadcast_event("stats_updated")
    return res


@router.get("/lookup/{patient_id}")
async def lookup(patient_id: str):
    """Used by the booking form to fill in name and phone."""
    doc = await get_db().patients.find_one({"patient_id": patient_id.strip().upper()})
    if not doc:
        raise HTTPException(404, "No patient found with that ID.")
    return {"patient_id": doc["patient_id"], "name": doc["name"], "phone": doc["phone"]}


@router.post("/{patient_id}/reset-app-login", dependencies=[Depends(current_admin)])
async def reset_app_login(patient_id: str):
    """Clear a patient's app password so they can set a new one by registering again.

    Used when a patient calls the clinic saying they forgot their app password.
    """
    res = await get_db().patients.find_one_and_update(
        {"patient_id": patient_id.strip().upper()},
        {"$unset": {"password_hash": ""}},
        return_document=True,
    )
    if not res:
        raise HTTPException(404, "No patient found with that ID.")
    return {"ok": True, "patient_id": res["patient_id"], "name": res["name"]}


@router.get("")
async def list_patients(
    q: str | None = None,
    date_from: str | None = Query(None, description="YYYY-MM-DD, registered on or after"),
    date_to: str | None = Query(None, description="YYYY-MM-DD, registered on or before"),
    sort: str = Query("newest", pattern="^(newest|oldest|name)$"),
    limit: int = Query(50, le=500),
    skip: int = 0,
    _: str = Depends(current_admin),
):
    query: dict = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q}},
            {"patient_id": {"$regex": q, "$options": "i"}},
        ]
    if date_from or date_to:
        window: dict = {}
        if date_from:
            window["$gte"] = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
        if date_to:
            window["$lte"] = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        query["created_at"] = window

    order = {"newest": [("created_at", -1)], "oldest": [("created_at", 1)], "name": [("name", 1)]}[sort]
    db = get_db()
    cursor = db.patients.find(query).sort(order).skip(skip).limit(limit)
    return {
        "total": await db.patients.count_documents(query),
        "items": [serialize(d) for d in await cursor.to_list(limit)],
    }


@router.get("/{patient_id}")
async def patient_detail(patient_id: str, _: str = Depends(current_admin)):
    db = get_db()
    doc = await db.patients.find_one({"patient_id": patient_id.upper()})
    if not doc:
        raise HTTPException(404, "Patient not found.")
    history = await db.appointments.find({"patient_id": doc["patient_id"]}).sort("date", -1).to_list(50)
    records = await db.records.find({"patient_id": doc["patient_id"]}).sort([("date", -1), ("created_at", -1)]).to_list(200)
    return {
        "patient": serialize(doc),
        "appointments": [serialize(a) for a in history],
        "records": [serialize(r) for r in records],
    }


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str, _: str = Depends(current_admin)):
    res = await get_db().patients.delete_one({"patient_id": patient_id})
    if not res.deleted_count:
        raise HTTPException(404, "Patient not found.")
    await broadcast_event("patient_deleted", {"patient_id": patient_id})
    await broadcast_event("stats_updated")
    return {"ok": True}


# ---------------------------------------------------------------- records
# The clinic files a patient's prescriptions, X-rays and reports here so they
# show up automatically in that patient's app/website record once logged in.

@router.post("/{patient_id}/records", status_code=201)
async def add_record(
    patient_id: str,
    kind: str = Form("report"),
    title: str = Form(...),
    notes: str = Form(""),
    date: str = Form(""),
    file: UploadFile | None = File(None),
    _: str = Depends(current_admin),
):
    db = get_db()
    if not await db.patients.find_one({"patient_id": patient_id.upper()}, {"_id": 1}):
        raise HTTPException(404, "Patient not found.")

    payload = AppRecordIn(kind=kind, title=title, notes=notes or None, date=date or None)
    doc = {
        **payload.model_dump(),
        "patient_id": patient_id.upper(),
        "date": payload.date or datetime.now(IST).strftime("%Y-%m-%d"),
        "added_by": "clinic",
        "created_at": datetime.now(timezone.utc),
        "file": None,
        "file_type": None,
    }
    if file is not None and file.filename:
        allowed = PDF_TYPES if (file.content_type or "").endswith("pdf") else IMAGE_TYPES
        doc["file"] = await save_upload(file, "records", allowed)
        doc["file_type"] = "pdf" if allowed is PDF_TYPES else "image"

    result = await db.records.insert_one(doc)
    created = serialize(await db.records.find_one({"_id": result.inserted_id}))
    await broadcast_event("record_updated", {"patient_id": patient_id.upper(), "record": created})
    return created


@router.delete("/{patient_id}/records/{record_id}")
async def delete_record(patient_id: str, record_id: str, _: str = Depends(current_admin)):
    try:
        oid = ObjectId(record_id)
    except InvalidId:
        raise HTTPException(404, "Record not found.")
    doc = await get_db().records.find_one_and_delete({"_id": oid, "patient_id": patient_id.upper()})
    if not doc:
        raise HTTPException(404, "Record not found.")
    await delete_upload(doc.get("file"))
    await broadcast_event("record_updated", {"patient_id": patient_id.upper(), "record_id": record_id})
    return {"ok": True}
