"""Bulk import of the clinic's Practo patient list.

Two steps, both stateless — the browser sends the same file each time:
  POST /api/patients/import/preview  -> detected column mapping, cleaned sample rows and what would happen
  POST /api/patients/import/commit   -> one transaction: new patients inserted, known ones filled in

Re-running an import is safe: a patient is matched by Practo patient number first, then by
mobile number + name (someone who already registered on the website or app), and existing
details are only ever filled in, never overwritten.
"""
import datetime as dt
import json
from collections import defaultdict

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, insert, select, tuple_, update

from ..db import SessionDep, utcnow
from ..events import broadcast_event
from ..patients_service import IST
from ..practo_import import FIELDS, REQUIRED, ImportFileError, clean_rows, detect_mapping, family_phones, read_table
from ..security import current_admin
from ..tables import Patient

router = APIRouter(prefix="/api/patients/import", tags=["patient import"], dependencies=[Depends(current_admin)])

CHUNK = 1000
FILLABLE = ("name", "phone", "alt_phone", "email", "sex", "dob", "age", "address", "blood_group", "referral",
            "allergies", "practo_id")
MAX_IMPORT_MB = 40


async def _load(file: UploadFile, mapping: str | None):
    data = await file.read()
    if len(data) > MAX_IMPORT_MB * 1024 * 1024:
        raise HTTPException(413, f"The file is larger than {MAX_IMPORT_MB} MB.")
    try:
        headers, rows = read_table(file.filename or "", data)
    except ImportFileError as exc:
        raise HTTPException(400, str(exc))
    detected = detect_mapping(headers)
    chosen = detected
    if mapping:
        try:
            chosen = {k: v for k, v in json.loads(mapping).items() if k in FIELDS and v in headers}
        except (ValueError, AttributeError):
            raise HTTPException(400, "The column mapping could not be read.")
    missing = [f for f in REQUIRED if f not in chosen]
    if missing:
        raise HTTPException(400, f"Choose which column holds the patient {', '.join(missing)}.")
    return headers, detected, chosen, clean_rows(headers, rows, chosen)


def _dedupe(rows: list[dict]) -> list[dict]:
    """Drop nameless rows and repeats within the file (same Practo number, or same mobile + name)."""
    seen: dict[tuple, int] = {}
    out: list[dict] = []
    for row in rows:
        if "no name" in row["_issues"]:
            continue
        key = ("id", row["practo_id"]) if row["practo_id"] else ("pn", row["phone"], row["name"].lower())
        if key in seen:
            out[seen[key]] = row  # a later line in the export wins
        else:
            seen[key] = len(out)
            out.append(row)
    return out


async def _match_existing(session, rows: list[dict]) -> dict[int, Patient]:
    """row index -> the patient it should update (by Practo number, else by mobile + name)."""
    practo_ids = [r["practo_id"] for r in rows if r["practo_id"]]
    by_practo: dict[str, Patient] = {}
    for i in range(0, len(practo_ids), CHUNK):
        for p in await session.scalars(select(Patient).where(Patient.practo_id.in_(practo_ids[i:i + CHUNK]))):
            by_practo[p.practo_id] = p

    # Only rows Practo numbers didn't already place need the (slower) mobile + name lookup.
    pairs = list({(r["phone"], r["name"].lower()) for r in rows
                  if r["phone"] and not (r["practo_id"] and r["practo_id"] in by_practo)})
    by_phone_name: dict[tuple, Patient] = {}
    for i in range(0, len(pairs), CHUNK):
        stmt = select(Patient).where(tuple_(Patient.phone, func.lower(Patient.name)).in_(pairs[i:i + CHUNK]))
        for p in await session.scalars(stmt):
            by_phone_name.setdefault((p.phone, p.name.lower()), p)

    matches: dict[int, Patient] = {}
    claimed: set[int] = {p.id for p in by_practo.values()}
    for i, row in enumerate(rows):
        hit = by_practo.get(row["practo_id"]) if row["practo_id"] else None
        if hit is None and row["phone"]:
            candidate = by_phone_name.get((row["phone"], row["name"].lower()))
            # Don't claim a record that already belongs to another Practo patient (or another row).
            if candidate is not None and not candidate.practo_id and candidate.id not in claimed:
                hit = candidate
                claimed.add(candidate.id)
        if hit is not None:
            matches[i] = hit
    return matches


class _IdAllocator:
    """Hands out `DDyymm-nnnn` IDs in bulk: the month the patient registered in Practo, spilling into
    earlier months if one is full (9000 IDs a month)."""

    def __init__(self, session):
        self.session = session
        self.used: dict[str, set[int]] = {}
        self.next: dict[str, int] = {}

    async def _month(self, stamp: str) -> None:
        if stamp in self.used:
            return
        taken = await self.session.scalars(select(Patient.patient_id).where(Patient.patient_id.like(f"DD{stamp}-%")))
        self.used[stamp] = {int(p.rsplit("-", 1)[1]) for p in taken if p.rsplit("-", 1)[1].isdigit()}
        self.next[stamp] = 1000

    async def take(self, day: dt.date) -> str:
        year, month = day.year, day.month
        for _ in range(240):  # twenty years back is more than enough
            stamp = f"{year % 100:02d}{month:02d}"
            await self._month(stamp)
            n, used = self.next[stamp], self.used[stamp]
            while n in used:
                n += 1
            if n <= 9999:
                used.add(n)
                self.next[stamp] = n + 1
                return f"DD{stamp}-{n}"
            year, month = (year, month - 1) if month > 1 else (year - 1, 12)
        raise HTTPException(500, "Ran out of patient IDs.")


def _plan_update(existing: Patient, row: dict) -> dict:
    """Only fill what the clinic's record is missing; never overwrite what's already there."""
    changes = {k: row[k] for k in FILLABLE if row.get(k) not in (None, "", []) and getattr(existing, k) in (None, "")}
    if row["conditions"] and not existing.conditions:
        changes["conditions"] = row["conditions"]
    if row["extra"]:
        merged = {**row["extra"], **(existing.extra or {})}
        if merged != (existing.extra or {}):
            changes["extra"] = merged
    return changes


def _summary(rows: list[dict], matches: dict[int, Patient], all_rows: list[dict]) -> dict:
    families = family_phones(rows)
    return {
        "rows_in_file": len(all_rows),
        "skipped_no_name": sum(1 for r in all_rows if "no name" in r["_issues"]),
        "duplicates_in_file": len(all_rows) - len(rows) - sum(1 for r in all_rows if "no name" in r["_issues"]),
        "to_create": len(rows) - len(matches),
        "to_update": len(matches),
        "no_mobile": sum(1 for r in rows if not r["phone"]),
        "family_numbers": len(families),
        "patients_in_families": sum(families.values()),
    }


def _public(row: dict) -> dict:
    out = {k: v for k, v in row.items() if k != "extra"}
    for k in ("dob", "registered_on"):
        out[k] = row[k].isoformat() if row[k] else None
    return out


@router.post("/preview")
async def preview(session: SessionDep, file: UploadFile = File(...), mapping: str | None = Form(None)):
    headers, detected, chosen, all_rows = await _load(file, mapping)
    rows = _dedupe(all_rows)
    matches = await _match_existing(session, rows)
    families = family_phones(rows)
    sample_families = [
        {"phone": phone, "members": [r["name"] for r in rows if r["phone"] == phone]}
        for phone, _ in families.most_common(5)
    ]
    return {
        "headers": headers,
        "fields": FIELDS,
        "detected": detected,
        "mapping": chosen,
        "summary": _summary(rows, matches, all_rows),
        "sample": [_public(r) for r in rows[:8]],
        "sample_families": sample_families,
        "problems": [{"row": i + 2, "name": r["name"], "issues": r["_issues"]}
                     for i, r in enumerate(all_rows) if r["_issues"]][:20],
    }


@router.post("/commit")
async def commit(session: SessionDep, file: UploadFile = File(...), mapping: str | None = Form(None)):
    _, _, _, all_rows = await _load(file, mapping)
    rows = _dedupe(all_rows)
    matches = await _match_existing(session, rows)
    summary = _summary(rows, matches, all_rows)

    # Updates (filling blanks), batched by primary key.
    updates = []
    for i, existing in matches.items():
        changes = _plan_update(existing, rows[i])
        if changes:
            updates.append({"id": existing.id, **changes, "updated_at": utcnow()})
    by_keys: dict[tuple, list] = defaultdict(list)
    for u in updates:
        by_keys[tuple(sorted(u))].append(u)
    for group in by_keys.values():
        for i in range(0, len(group), CHUNK):
            await session.execute(update(Patient), group[i:i + CHUNK])

    # New patients, oldest registration first so their IDs read in order.
    ids = _IdAllocator(session)
    today = dt.datetime.now(IST).date()
    new_rows = sorted((r for i, r in enumerate(rows) if i not in matches),
                      key=lambda r: r["registered_on"] or today)
    inserts = []
    for r in new_rows:
        registered = r["registered_on"] or today
        inserts.append({
            **{k: r[k] for k in FILLABLE},
            "patient_id": await ids.take(registered),
            "conditions": r["conditions"],
            "extra": r["extra"],
            "source": "practo",
            "created_at": dt.datetime.combine(registered, dt.time(10, 0), IST) if r["registered_on"] else utcnow(),
        })
    for i in range(0, len(inserts), CHUNK):
        await session.execute(insert(Patient), inserts[i:i + CHUNK])
    await session.commit()

    await broadcast_event("patient_registered", {"imported": len(inserts)})
    await broadcast_event("stats_updated")
    return {**summary, "created": len(inserts), "updated": len(updates)}
