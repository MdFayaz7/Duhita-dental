"""the clinic's own procedure list and fees (replaces the Practo catalogue; old entries are hidden, not deleted)

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None

# From "treatment prices list" (package rates). Where the list gives a range, the lower figure is the default fee.
PROCEDURES = {
    "General": [("Consultation", 500), ("OPG", 1000)],
    "Oral Surgery": [
        ("Extraction", 1000), ("Impaction", 3000), ("Abscess Incision", 1000), ("Cyst Small", 3000), ("Cyst Large", 10000),
        ("Excision of Small Growth", 1000), ("Alveoloplasty (Quadrant)", 1000),
        ("Fracture Wiring including L.A. Alveolar Fracture", 15000), ("Fracture Reduction Closed", 20000),
        ("Fracture Reduction Open L.A.", 15000), ("Fracture Reduction Open G.A. inclusive of all", 40000), ("Splinting", 10000),
        ("Apicectomy in L.A.", 10000), ("Apicectomy with Grafting", 12000), ("Frenectomy", 5000),
    ],
    "Orthodontics & Cosmetic": [
        ("Composite Veneering L.C. per Tooth", 1500), ("Orthodontic Surgery inclusive of all", 45000),
        ("Removable Appliance Upper", 5000), ("Removable Appliance Lower", 5000), ("Fixed Beggs Appliance (both jaws)", 20000),
        ("Fixed Straight Wire Appliance", 25000), ("Expansion Plate", 10000), ("Inclined Plate", 10000),
        ("Inclined Plate Repair", 2000), ("Habit Breaking Appliance", 10000), ("Ortho Metal Braces", 40000),
        ("Ortho Metal Ceramic", 50000), ("Ortho Self Ligating", 80000), ("Ortho Aligners", 250000),
    ],
    "Operative Dentistry": [
        ("Zinc Oxide Eugenol Filling", 500), ("Amalgam Class I and Class II", 1500), ("GIC Class I, Class II and Class V", 1500),
        ("Posterior GIC", 1200), ("Light Cure Restoration", 5000), ("Composite Veneer", 2000), ("Metal Ceramic Crown", 6000),
        ("Full Ceramic Crown", 15000), ("Anterior Root Canal Treatment", 6000), ("Posterior Root Canal Treatment", 6000),
        ("Nickel Chrome Crown", 5000), ("Post and Core", 6000), ("Bleaching Vital Home Bleach for 8 Upper Teeth", 12000),
        ("Hemisection including Root Canal", 10000), ("Resectomy including Root Canal", 10000), ("Apicoectomy", 10000),
        ("Ceramic Inlay", 2000),
    ],
    "Periodontics": [
        ("Oral Prophylaxis (Grade II) Full Mouth", 1500), ("Oral Prophylaxis (Grade III) Extrinsic Stains Full Mouth", 3000),
        ("Sub Gingival Curettage per Quadrant", 5000), ("Flap Surgery (per Quadrant)", 6000),
        ("Flap Surgery with Bone Grafting (per Quadrant)", 10000), ("Gingivectomy (per Quadrant)", 5000),
        ("Alveoplasty (per Quadrant)", 5000),
    ],
    "Prosthodontics": [
        ("Removable Partial Denture with Single Tooth", 1500), ("Each Additional Tooth", 250), ("Complete Denture Set", 15000),
        ("Repair of Denture in Heat Polymerizing Acrylic", 1500), ("Metal Ceramic Crown (per unit)", 6000),
        ("Nickel Chrome Crown (per unit)", 10000), ("Anterior Post Ceramic Crown", 12000), ("Implant (single)", 25000),
    ],
    "Oral Pathology": [("Biopsy", 3000)],
}


def upgrade() -> None:
    op.add_column('procedures', sa.Column('category', sa.Text(), nullable=True))
    op.execute("UPDATE procedures SET active = false")
    rows = [{"name": n, "cost": c, "category": cat} for cat, items in PROCEDURES.items() for n, c in items]
    op.get_bind().execute(sa.text("""
        INSERT INTO procedures (name, cost, category, active) VALUES (:name, :cost, :category, true)
        ON CONFLICT (lower(name)) DO UPDATE SET cost = EXCLUDED.cost, category = EXCLUDED.category, active = true
    """), rows)


def downgrade() -> None:
    op.execute("UPDATE procedures SET active = true WHERE category IS NULL")
    op.drop_column('procedures', 'category')
