"""calendar (doctor, duration, category, check-in statuses) and Practo patient import

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-25 12:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

OLD_STATUSES = "status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')"
NEW_STATUSES = ("status IN ('pending', 'confirmed', 'checked_in', 'engaged', 'completed', 'cancelled', "
                "'no_show')")
# Matches DOCTOR_COLORS in the admin calendar, so existing doctors start out distinguishable.
COLORS = ["#4e79a7", "#c45a9d", "#3f9e5a", "#9c5a2b", "#7b2fbe", "#16808a", "#d23f3f", "#e0662b",
          "#b56a1f", "#7f56d9", "#22303c"]


def upgrade() -> None:
    op.add_column('doctors', sa.Column('in_calendar', sa.Boolean(), server_default=sa.text('true'), nullable=False))
    op.add_column('doctors', sa.Column('color', sa.Text(), nullable=True))

    op.add_column('appointments', sa.Column('duration', sa.SmallInteger(), server_default='15', nullable=False))
    op.add_column('appointments', sa.Column('doctor_id', sa.BigInteger(), nullable=True))
    op.add_column('appointments', sa.Column('category', sa.Text(), nullable=True))
    op.add_column('appointments', sa.Column('procedures', sa.Text(), nullable=True))
    op.create_foreign_key('fk_appointments_doctor_id', 'appointments', 'doctors', ['doctor_id'], ['id'],
                          ondelete='SET NULL')
    op.create_index('ix_appointments_date_doctor', 'appointments', ['date', 'doctor_id'], unique=False)
    for table in ('appointments', 'schedule'):
        op.drop_constraint(f'ck_{table}_status', table, type_='check')
        op.create_check_constraint(f'ck_{table}_status', table, NEW_STATUSES)

    op.add_column('patients', sa.Column('alt_phone', sa.Text(), nullable=True))
    op.add_column('patients', sa.Column('dob', sa.Date(), nullable=True))
    op.add_column('patients', sa.Column('practo_id', sa.Text(), nullable=True))
    op.add_column('patients', sa.Column('source', sa.Text(), nullable=True))
    op.create_unique_constraint('uq_patients_practo_id', 'patients', ['practo_id'])

    # Link bookings that named a doctor to that doctor's row, and colour the existing doctors.
    op.execute("UPDATE appointments a SET doctor_id = d.id FROM doctors d "
               "WHERE a.doctor_id IS NULL AND a.doctor IS NOT NULL AND lower(trim(a.doctor)) = lower(trim(d.name))")
    colors = ", ".join(f"'{c}'" for c in COLORS)
    op.execute(f"""UPDATE doctors SET color = (ARRAY[{colors}])[1 + (ranked.n % {len(COLORS)})]
                   FROM (SELECT id, row_number() OVER (ORDER BY "order", name) - 1 AS n FROM doctors) ranked
                   WHERE doctors.id = ranked.id AND doctors.color IS NULL""")


def downgrade() -> None:
    op.drop_constraint('uq_patients_practo_id', 'patients', type_='unique')
    for column in ('source', 'practo_id', 'dob', 'alt_phone'):
        op.drop_column('patients', column)

    for table in ('appointments', 'schedule'):
        op.execute(f"UPDATE {table} SET status = 'confirmed' WHERE status IN ('checked_in', 'engaged')")
        op.drop_constraint(f'ck_{table}_status', table, type_='check')
        op.create_check_constraint(f'ck_{table}_status', table, OLD_STATUSES)
    op.drop_index('ix_appointments_date_doctor', table_name='appointments')
    op.drop_constraint('fk_appointments_doctor_id', 'appointments', type_='foreignkey')
    for column in ('procedures', 'category', 'doctor_id', 'duration'):
        op.drop_column('appointments', column)

    op.drop_column('doctors', 'color')
    op.drop_column('doctors', 'in_calendar')
