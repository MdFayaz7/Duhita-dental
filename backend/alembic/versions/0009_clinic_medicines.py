"""the clinic's own medicines list (medicines_list.xlsx) added to the drug pick list

Doses are the usual adult defaults and are only pre-filled on the form; the doctor edits them per patient, and any
drug the clinic already edited is left alone. Products whose form isn't obvious from the name get no defaults.

Revision ID: 0009
Revises: 0008
"""
import json

from alembic import op
import sqlalchemy as sa

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None

# (type, name, strength, frequency, days, food, instructions)
DRUGS = [
    ("TABLET", "Clavam", "625 mg", "1-0-1", 5, "after", ""),
    ("TABLET", "Mox CV", "625 mg", "1-0-1", 5, "after", ""),
    ("TABLET", "Augo CV", "625 mg", "1-0-1", 5, "after", ""),
    ("TABLET", "Augmentin", "625 mg", "1-0-1", 5, "after", ""),
    ("TABLET", "Moxikind CV", "375 mg", "1-0-1", 5, "after", ""),
    ("TABLET", "Taxim-O", "200 mg", "1-0-1", 5, "after", ""),
    ("TABLET", "Hifenac-P", "", "1-0-1", 3, "after", ""),
    ("TABLET", "Hifenac-D", "", "1-0-1", 5, "after", ""),
    ("TABLET", "Hifenac-MR", "", "1-0-1", 3, "after", ""),
    ("TABLET", "Imolplus", "", "1-0-1", 3, "after", ""),
    ("TABLET", "Ketorol DT", "10 mg", "1-0-1", 3, "after", "Only if pain"),
    ("TABLET", "Pantop", "40 mg", "1-0-0", 5, "before", "Empty stomach"),
    ("CAPSULE", "Pan-DSR", "", "1-0-0", 5, "before", "Empty stomach"),
    ("GEL", "Metrohex Plus", "", "1-0-1", 7, "after", "Apply on gums"),
    ("MOUTHWASH", "Drez Gargle", "", "1-0-1", 7, "after", "Dilute with equal water"),
    ("MOUTHWASH", "Pradontax", "", "1-0-1", 7, "after", "10 ml, rinse 30 seconds, do not swallow"),
    ("TOOTHPASTE", "Sensodyne Repair & Protect", "", "1-0-1", 30, "", "Brush twice daily"),
    ("TOOTHPASTE", "Vantej", "", "1-0-1", 30, "", "Brush twice daily"),
    ("TOOTHPASTE", "Elsenz", "", "1-0-1", 30, "", "Brush twice daily"),
    ("TOOTHPASTE", "Senquel-F", "", "1-0-1", 30, "", "Brush twice daily"),
    ("TOOTHPASTE", "Cheerio", "", "1-0-1", 30, "", "Pea-sized amount, brush twice daily"),
    (None, "Ordent", "", "", None, "", ""),
    (None, "Gum Chek", "", "", None, "", ""),
]


def upgrade() -> None:
    rows = []
    for t, n, s, fr, d, food, ins in DRUGS:
        data = {"type": t, "strength": s, "dose": "1", "frequency": fr, "days": d, "food": food, "instructions": ins} if t else {}
        rows.append({"name": " ".join(filter(None, (t, n, s))), "data": json.dumps(data)})
    op.get_bind().execute(sa.text(
        "INSERT INTO emr_terms (kind, name, data) VALUES ('drug', :name, CAST(:data AS jsonb)) "
        "ON CONFLICT (kind, lower(name)) DO UPDATE SET data = EXCLUDED.data WHERE emr_terms.data = '{}'::jsonb"), rows)


def downgrade() -> None:
    pass
