"""What the clinic shares to a patient's own app account (Practo's SHARE ON/OFF, per section).

Stored on the patient as extra["share"]; anything not set is shared. Only that patient's own records are ever
returned — family members on the same mobile number each see just their own."""
SECTIONS = ("vitals", "notes", "treatments", "prescriptions", "files", "billing")


def share_flags(patient) -> dict[str, bool]:
    saved = (patient.extra or {}).get("share") or {}
    return {s: bool(saved.get(s, True)) for s in SECTIONS}
