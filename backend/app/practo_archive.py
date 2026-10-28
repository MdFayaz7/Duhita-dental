"""Read Practo's four exports (patients, treatments, invoices, payments) into the practo_* archive tables.

Each file replaces its table in one transaction, so re-uploading a newer export is safe. Practo writes patient
numbers as integers in one file and text in another; they are normalised to plain digit strings so they join."""
import csv
import datetime as dt
import io
import re
from decimal import Decimal, InvalidOperation

import openpyxl
import xlrd
from sqlalchemy import delete, insert, text
from sqlalchemy.ext.asyncio import AsyncSession

from .tables import PractoInvoiceLine, PractoPatient, PractoPayment, PractoTreatment

KINDS = ("patients", "treatments", "invoices", "payments")


class ArchiveError(ValueError):
    pass


def _rows(filename: str, data: bytes) -> tuple[list[str], list[tuple]]:
    """Header + data rows of the first sheet; the header is the first row that names "Patient Number"."""
    if filename.lower().endswith((".csv", ".txt")):
        for encoding in ("utf-8-sig", "cp1252"):  # Practo's CSVs are UTF-8; Excel re-saves are often Windows-1252
            try:
                text_ = data.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        first = text_.split("\n", 1)[0]
        delimiter = max(",;\t", key=first.count)  # whichever separator the header line uses most
        rows = [tuple(r) for r in csv.reader(io.StringIO(text_), delimiter=delimiter)]
    elif filename.lower().endswith(".xls"):
        sheet = xlrd.open_workbook(file_contents=data).sheet_by_index(0)
        rows = [tuple(sheet.row_values(i)) for i in range(sheet.nrows)]
    else:
        ws = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True).worksheets[0]
        rows = list(ws.iter_rows(values_only=True))
    for i, row in enumerate(rows[:10]):
        header = [str(c).strip() if c is not None else "" for c in row]
        if "Patient Number" in header:
            return header, [r for r in rows[i + 1:] if any(c not in (None, "") for c in r)]
    raise ArchiveError(f"{filename}: no “Patient Number” column — is this a Practo export?")


def _text(v) -> str | None:
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).strip()
    if len(s) >= 2 and s[0] == s[-1] == "'":  # Practo's CSV wraps values as 'text' so Excel keeps them as text
        s = s[1:-1].strip()
    return s or None


def _number(v) -> str | None:
    """Practo patient number → just the number: "'DMDC 1234'", "DMDC1234", 1234.0 and " 1234 " all become "1234".

    Practo sometimes appends a date ("DMDC 1234 12/03/2020") — the number is kept — or writes only a date
    ("DMDC12/03/2020"), which counts as no number."""
    if isinstance(v, (dt.date, dt.datetime)):
        return None
    s = (_text(v) or "").strip("'\" ").upper()
    s = re.sub(r"^DMDC\s*", "", s)
    m = re.match(r"(\d+)(?:\.0+)?(?:\s+\d{1,4}[/-]\d{1,2}[/-]\d{1,4}.*)?$", s)
    if m:
        return str(int(m.group(1)))
    return None if not s or re.search(r"\d{1,4}[/-]\d{1,2}[/-]\d{1,4}", s) else s


def _dec(v) -> Decimal | None:
    s = _text(v)
    if s is None:
        return None
    try:
        return Decimal(s.replace(",", ""))
    except InvalidOperation:
        return None


def _date(v) -> dt.date | None:
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    s = _text(v)
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return dt.datetime.strptime(s[:10], fmt).date() if s else None
        except ValueError:
            continue
    return None


def _age(v) -> int | None:
    d = _dec(v)
    return int(d) if d is not None and 0 <= d <= 120 else None


def _phone(v) -> str | None:
    digits = re.sub(r"\D", "", _text(v) or "")
    return digits[-10:] if len(digits) >= 10 else (digits or None)


PATIENT_COLUMNS = {"Patient Number", "Patient Name", "Mobile Number", "Gender", "Age", "Date of Birth", "Email Address", "Address"}


def parse(kind: str, filename: str, data: bytes) -> list[dict]:
    header, rows = _rows(filename, data)
    col = {name: i for i, name in enumerate(header) if name}

    def get(row, name):
        i = col.get(name)
        return row[i] if i is not None and i < len(row) else None

    out = []
    for r in rows:
        g = lambda name: get(r, name)  # noqa: E731
        if kind == "patients":
            # Patients Practo exported without a number are kept under a placeholder key ("NA-…"), shown as "no number".
            number = _number(g("Patient Number")) or f"NA-{len(out) + 1}"
            out.append({
                "number": number, "name": _text(g("Patient Name")) or "(no name)", "mobile": _phone(g("Mobile Number")),
                "gender": _text(g("Gender")), "age": _age(g("Age")), "dob": _date(g("Date of Birth")),
                "email": _text(g("Email Address")), "address": _text(g("Address")),
                "data": {k: _text(get(r, k)) for k in col if k not in PATIENT_COLUMNS and _text(get(r, k))},
            })
        elif kind == "treatments":
            out.append({
                "patient_number": _number(g("Patient Number")), "patient_name": _text(g("Patient Name")), "date": _date(g("Date")),
                "name": _text(g("Treatment Name")) or "—", "teeth": (_text(g("Tooth Number")) or "").replace("|", ", ") or None,
                "notes": _text(g("Treatment Notes")), "qty": _dec(g("Quantity")), "cost": _dec(g("Treatment Cost")),
                "discount": _dec(g("Discount")), "discount_type": _text(g("DiscountType")), "amount": _dec(g("Amount")),
                "doctor": _text(g("Doctor")),
            })
        elif kind == "invoices":
            out.append({
                "patient_number": _number(g("Patient Number")), "patient_name": _text(g("Patient Name")), "date": _date(g("Date")),
                "doctor": _text(g("Doctor Name")), "invoice_number": _text(g("Invoice Number")), "treatment": _text(g("Treatment Name")),
                "unit_cost": _dec(g("Unit Cost")), "qty": _dec(g("Quantity")), "discount": _dec(g("Discount")),
                "discount_type": _text(g("DiscountType")), "tax_percent": _dec(g("Tax Percent")),
                "cancelled": bool(_text(g("Cancelled"))) and _text(g("Cancelled")) not in ("0", "No", "no"),
                "notes": " · ".join(filter(None, (_text(g("Notes")), _text(g("Description"))))) or None,
            })
        elif kind == "payments":
            out.append({
                "patient_number": _number(g("Patient Number")), "patient_name": _text(g("Patient Name")), "date": _date(g("Date")),
                "receipt_number": _text(g("Receipt Number")), "treatment": _text(g("Treatment name")), "amount": _dec(g("Amount Paid")),
                "invoice_number": _text(g("Invoice Number")), "mode": _text(g("Payment Mode")),
                "cancelled": bool(_text(g("Cancelled"))) and _text(g("Cancelled")) not in ("0", "No", "no"),
                "notes": _text(g("Notes")),
            })
    if not out:
        raise ArchiveError(f"{filename}: no rows found.")
    return out


TABLES = {"patients": PractoPatient, "treatments": PractoTreatment, "invoices": PractoInvoiceLine, "payments": PractoPayment}


async def replace(session: AsyncSession, kind: str, rows: list[dict]) -> int:
    """Swap the table's contents for these rows (caller commits). Duplicate patient numbers keep the last row."""
    table = TABLES[kind]
    if kind == "patients":
        rows = _merge_patients(rows)
    await session.execute(delete(table))
    for i in range(0, len(rows), 2000):  # asyncpg caps bind parameters per statement
        await session.execute(insert(table), rows[i:i + 2000])
    return len(rows)


def _merge_patients(rows: list[dict]) -> list[dict]:
    """One row per patient number: repeated rows fill each other's blanks (later rows win on conflicts)."""
    merged: dict[str, dict] = {}
    for r in rows:
        prev = merged.get(r["number"])
        if prev is None:
            merged[r["number"]] = r
            continue
        for k, v in r.items():
            if k == "data":
                prev["data"] = {**prev["data"], **{dk: dv for dk, dv in v.items() if dv}}
            elif v not in (None, "", "(no name)"):
                prev[k] = v
    return list(merged.values())


async def refresh_stats(session: AsyncSession) -> None:
    """Per-patient record count and latest date across treatments, invoices and payments (one pass each)."""
    await session.execute(text("""
        WITH h AS (
            SELECT patient_number, date FROM practo_treatments
            UNION ALL SELECT patient_number, date FROM practo_invoice_lines
            UNION ALL SELECT patient_number, date FROM practo_payments
        ), s AS (SELECT patient_number, count(*) AS n, max(date) AS last FROM h WHERE patient_number IS NOT NULL GROUP BY 1)
        UPDATE practo_patients p SET records = coalesce(s.n, 0), last_visit = s.last
        FROM practo_patients p2 LEFT JOIN s ON s.patient_number = p2.number
        WHERE p.number = p2.number
    """))
