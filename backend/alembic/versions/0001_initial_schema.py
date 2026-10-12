"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-10-13 00:25:15.273949
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

TRGM = [("patients", "name"), ("patients", "phone"), ("patients", "patient_id"), ("appointments", "name")]


def upgrade() -> None:
    op.create_table('admins',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('username', sa.Text(), nullable=False),
    sa.Column('password_hash', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('username')
    )
    op.create_table('appointments',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('patient_id', sa.Text(), nullable=True),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('phone', sa.Text(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('slot', sa.Text(), nullable=False),
    sa.Column('doctor', sa.Text(), nullable=True),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('status', sa.Text(), server_default='pending', nullable=False),
    sa.Column('source', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('admin_notified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('patient_notified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.CheckConstraint("status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')", name='ck_appointments_status'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_appointments_created_at', 'appointments', ['created_at'], unique=False)
    op.create_index('ix_appointments_date_slot', 'appointments', ['date', 'slot'], unique=False)
    op.create_index(op.f('ix_appointments_patient_id'), 'appointments', ['patient_id'], unique=False)
    op.create_index(op.f('ix_appointments_phone'), 'appointments', ['phone'], unique=False)
    op.create_index('ix_appointments_status', 'appointments', ['status'], unique=False)
    op.create_table('doctors',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('qualification', sa.Text(), nullable=True),
    sa.Column('speciality', sa.Text(), nullable=True),
    sa.Column('experience_years', sa.Integer(), nullable=True),
    sa.Column('bio', sa.Text(), nullable=True),
    sa.Column('photo', sa.Text(), nullable=True),
    sa.Column('order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_doctors_order', 'doctors', ['order', 'name'], unique=False)
    op.create_table('feedback',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('patient_name', sa.Text(), server_default='', nullable=False),
    sa.Column('caption', sa.Text(), server_default='', nullable=False),
    sa.Column('src', sa.Text(), nullable=False),
    sa.Column('poster', sa.Text(), nullable=True),
    sa.Column('cloud_id', sa.Text(), nullable=True),
    sa.Column('active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_feedback_order', 'feedback', ['order', 'created_at'], unique=False)
    op.create_table('files',
    sa.Column('id', sa.Text(), nullable=False),
    sa.Column('filename', sa.Text(), nullable=False),
    sa.Column('content_type', sa.Text(), nullable=False),
    sa.Column('folder', sa.Text(), nullable=True),
    sa.Column('size', sa.BigInteger(), nullable=False),
    sa.Column('data', sa.LargeBinary(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('gallery',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('category', sa.Text(), nullable=False),
    sa.Column('caption', sa.Text(), server_default='', nullable=False),
    sa.Column('src', sa.Text(), nullable=False),
    sa.Column('source_name', sa.Text(), nullable=True),
    sa.Column('order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_gallery_category_order', 'gallery', ['category', 'order', 'created_at'], unique=False)
    op.create_table('patients',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('patient_id', sa.Text(), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('phone', sa.Text(), nullable=False),
    sa.Column('age', sa.SmallInteger(), nullable=True),
    sa.Column('sex', sa.Text(), nullable=True),
    sa.Column('email', sa.Text(), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('referral', sa.Text(), nullable=True),
    sa.Column('referral_name', sa.Text(), nullable=True),
    sa.Column('profession', sa.Text(), nullable=True),
    sa.Column('complaint', sa.Text(), nullable=True),
    sa.Column('conditions', postgresql.ARRAY(sa.Text()), server_default=sa.text("'{}'"), nullable=False),
    sa.Column('condition_notes', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.Column('pregnant', sa.Text(), nullable=True),
    sa.Column('allergies', sa.Text(), nullable=True),
    sa.Column('medications', sa.Text(), nullable=True),
    sa.Column('blood_group', sa.Text(), nullable=True),
    sa.Column('emergency_contact', sa.Text(), nullable=True),
    sa.Column('emergency_phone', sa.Text(), nullable=True),
    sa.Column('photo', sa.Text(), nullable=True),
    sa.Column('password_hash', sa.Text(), nullable=True),
    sa.Column('app_user', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('patient_id')
    )
    op.create_index('ix_patients_created_at', 'patients', ['created_at'], unique=False)
    op.create_index(op.f('ix_patients_phone'), 'patients', ['phone'], unique=False)
    op.create_table('records',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('patient_id', sa.Text(), nullable=False),
    sa.Column('kind', sa.Text(), server_default='report', nullable=False),
    sa.Column('title', sa.Text(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('date', sa.Date(), nullable=True),
    sa.Column('added_by', sa.Text(), nullable=False),
    sa.Column('file', sa.Text(), nullable=True),
    sa.Column('file_type', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_records_patient_date', 'records', ['patient_id', 'date', 'created_at'], unique=False)
    op.create_table('research',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('title', sa.Text(), nullable=False),
    sa.Column('authors', sa.Text(), nullable=False),
    sa.Column('publication', sa.Text(), nullable=True),
    sa.Column('year', sa.Text(), nullable=True),
    sa.Column('category', sa.Text(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('file', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('schedule',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('time_from', sa.Text(), nullable=False),
    sa.Column('time_to', sa.Text(), nullable=True),
    sa.Column('patient_name', sa.Text(), nullable=False),
    sa.Column('patient_id', sa.Text(), nullable=True),
    sa.Column('doctor', sa.Text(), nullable=True),
    sa.Column('status', sa.Text(), server_default='pending', nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('priority', sa.Integer(), server_default='1', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.CheckConstraint("status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')", name='ck_schedule_status'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_schedule_date_priority', 'schedule', ['date', 'priority', 'time_from'], unique=False)
    op.create_table('whatsapp_messages',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('wa_message_id', sa.Text(), nullable=True),
    sa.Column('direction', sa.Text(), nullable=False),
    sa.Column('phone', sa.Text(), nullable=False),
    sa.Column('kind', sa.Text(), nullable=False),
    sa.Column('appointment_id', sa.BigInteger(), nullable=True),
    sa.Column('status', sa.Text(), nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('wa_message_id')
    )
    op.create_index(op.f('ix_whatsapp_messages_appointment_id'), 'whatsapp_messages', ['appointment_id'], unique=False)

    # Photos and videos are already compressed; storing them uncompressed lets range requests
    # (video seeking) read just the bytes they need instead of the whole file.
    op.execute("ALTER TABLE files ALTER COLUMN data SET STORAGE EXTERNAL")

    # Fast "contains" search for the admin's patient and appointment search boxes.
    has_trgm = op.get_bind().execute(
        sa.text("SELECT 1 FROM pg_available_extensions WHERE name = 'pg_trgm'")
    ).scalar()
    if has_trgm:
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        for table, column in TRGM:
            op.execute(f"CREATE INDEX ix_{table}_{column}_trgm ON {table} USING gin ({column} gin_trgm_ops)")


def downgrade() -> None:
    for table, column in TRGM:
        op.execute(f"DROP INDEX IF EXISTS ix_{table}_{column}_trgm")
    op.drop_index(op.f('ix_whatsapp_messages_appointment_id'), table_name='whatsapp_messages')
    op.drop_table('whatsapp_messages')
    op.drop_index('ix_schedule_date_priority', table_name='schedule')
    op.drop_table('schedule')
    op.drop_table('research')
    op.drop_index('ix_records_patient_date', table_name='records')
    op.drop_table('records')
    op.drop_index(op.f('ix_patients_phone'), table_name='patients')
    op.drop_index('ix_patients_created_at', table_name='patients')
    op.drop_table('patients')
    op.drop_index('ix_gallery_category_order', table_name='gallery')
    op.drop_table('gallery')
    op.drop_table('files')
    op.drop_index('ix_feedback_order', table_name='feedback')
    op.drop_table('feedback')
    op.drop_index('ix_doctors_order', table_name='doctors')
    op.drop_table('doctors')
    op.drop_index('ix_appointments_status', table_name='appointments')
    op.drop_index(op.f('ix_appointments_phone'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_patient_id'), table_name='appointments')
    op.drop_index('ix_appointments_date_slot', table_name='appointments')
    op.drop_index('ix_appointments_created_at', table_name='appointments')
    op.drop_table('appointments')
    op.drop_table('admins')
