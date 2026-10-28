import io

import openpyxl


def xlsx(header, rows, title_row=False) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    if title_row:
        ws.append(list(range(1, len(header) + 1)))
    ws.append(header)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def test_practo_archive_import_and_history(admin):
    files = {
        "patients": ("patients.xlsx", xlsx(["Patient Number", "Patient Name", "Mobile Number", "Gender", "Age"],
                                           [[101, "Asha K", 919876543210, "Female", 31], [102, "Ravi", None, "Male", None]])),
        "treatments": ("t.xlsx", xlsx(["Date", "Patient Number", "Patient Name", "Treatment Name", "Tooth Number", "Quantity", "Treatment Cost", "Amount", "Discount", "DiscountType", "Doctor"],
                                      [["2024-01-05", 101, "Asha K", "RCT", "46|47", "1", "4500", "4500", "0", "PERCENT", "Dr. N"]])),
        "invoices": ("i.xlsx", xlsx(["#", "Date", "Patient Number", "Patient Name", "Doctor Name", "Invoice Number", "Treatment Name", "Unit Cost", "Quantity", "Discount", "DiscountType", "Cancelled"],
                                    [[1, "2024-01-05", "101", "Asha K", "Dr. N", "55", "RCT", "4500", "1", 10, "PERCENT", None]], title_row=True)),
        "payments": ("p.xlsx", xlsx(["Date", "Patient Number", "Patient Name", "Amount Paid", "Payment Mode", "Cancelled"],
                                    [["2024-01-06", "101", "Asha K", "1000", "cash", None], ["2024-01-07", None, "asha k", "500", "card", None]])),
    }
    res = await admin.post("/api/practo/import", files={k: (n, d) for k, (n, d) in files.items()})
    assert res.json()["imported"] == {"patients": 2, "treatments": 1, "invoices": 1, "payments": 2}

    everyone = (await admin.get("/api/practo/patients")).json()["items"]
    assert [p["number"] for p in everyone] == ["101", "102"]  # with history first, though 102 is the newer number
    assert everyone[0]["records"] == 3 and everyone[0]["last_visit"] == "2024-01-06" and everyone[1]["records"] == 0

    listed = (await admin.get("/api/practo/patients?q=9876543210")).json()
    assert listed["total"] == 1 and listed["items"][0]["number"] == "101" and listed["items"][0]["mobile"] == "9876543210"

    h = (await admin.get("/api/practo/patients/101")).json()
    assert h["treatments"][0]["teeth"] == "46, 47"
    assert float(h["summary"]["billed"]) == 4050 and float(h["summary"]["paid"]) == 1500  # unnumbered payment matched by unique name

    # Re-import replaces, never duplicates.
    await admin.post("/api/practo/import", files={"patients": files["patients"]})
    assert (await admin.get("/api/practo/summary")).json()["patients"] == 2
    assert (await admin.post("/api/practo/import", files={"patients": ("x.xlsx", xlsx(["Name"], [["a"]]))})).status_code == 400


async def test_new_patient_ids_run_per_month(admin):
    from tests.test_api import PATIENT
    a = (await admin.post("/api/patients", json=PATIENT)).json()["patient_id"]
    b = (await admin.post("/api/patients", json={**PATIENT, "name": "Second"})).json()["patient_id"]
    assert a.startswith("DDC") and len(a) == 10 and a.endswith("1") and b[:9] == a[:9] and b.endswith("2")
