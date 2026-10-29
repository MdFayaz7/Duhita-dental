"""starter list of common dental drugs with default dosage (doctors add more from Prescriptions → Add Drug)

Revision ID: 0008
Revises: 0007
"""
import json

from alembic import op
import sqlalchemy as sa

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None

# (type, name, strength, frequency, days, food, instructions)
DRUGS = [
    ("TABLET", "Amoxicillin", "500 mg", "1-1-1", 5, "after", ""),
    ("TABLET", "Augmentin Duo", "625 mg", "1-0-1", 5, "after", ""),
    ("CAPSULE", "Doxycycline", "100 mg", "1-0-1", 5, "after", ""),
    ("TABLET", "Azithromycin", "500 mg", "1-0-0", 3, "before", ""),
    ("TABLET", "Metronidazole (Metrogyl)", "400 mg", "1-1-1", 5, "after", "Avoid alcohol"),
    ("TABLET", "Clindamycin", "300 mg", "1-1-1", 5, "after", ""),
    ("TABLET", "Ibuprofen", "400 mg", "1-0-1", 3, "after", ""),
    ("TABLET", "Hifenac P (Aceclofenac + Paracetamol)", "100/325 mg", "1-0-1", 3, "after", ""),
    ("TABLET", "Ketorol DT (Ketorolac)", "10 mg", "1-0-1", 3, "after", "Only if pain"),
    ("TABLET", "Paracetamol (Dolo)", "650 mg", "1-1-1", 3, "after", "Only if fever or pain"),
    ("TABLET", "Zerodol SP", "", "1-0-1", 3, "after", ""),
    ("TABLET", "Pantoprazole (Pan)", "40 mg", "1-0-0", 5, "before", "Empty stomach"),
    ("TABLET", "Chymoral Forte", "", "1-1-1", 5, "before", ""),
    ("CAPSULE", "Becosules", "", "1-0-0", 15, "after", ""),
    ("MOUTHWASH", "Chlorhexidine 0.2% (Hexidine)", "", "1-0-1", 7, "after", "10 ml, rinse 30 seconds, do not swallow"),
    ("MOUTHWASH", "Betadine Gargle", "2%", "1-0-1", 7, "after", "Dilute with equal water"),
    ("GEL", "Metrogyl DG", "", "1-0-1", 7, "after", "Apply on gums"),
    ("GEL", "Mucopain", "", "1-1-1", 5, "before", "Apply before food"),
    ("GEL", "Dologel CT", "", "1-1-1", 5, "after", "Apply on the ulcer"),
    ("TOOTHPASTE", "Sensodyne", "", "1-0-1", 30, "", "Brush twice daily"),
]


def upgrade() -> None:
    rows = [{"name": f"{t} {n}{f' {s}' if s else ''}", "data": json.dumps({
        "type": t, "strength": s, "dose": "1", "frequency": fr, "days": d, "food": food, "instructions": ins})}
        for t, n, s, fr, d, food, ins in DRUGS]
    op.get_bind().execute(sa.text(
        "INSERT INTO emr_terms (kind, name, data) VALUES ('drug', :name, CAST(:data AS jsonb)) "
        # drugs seeded earlier without a dosage get one; anything a doctor already set is kept
        "ON CONFLICT (kind, lower(name)) DO UPDATE SET data = EXCLUDED.data WHERE emr_terms.data = '{}'::jsonb"), rows)


def downgrade() -> None:
    pass
