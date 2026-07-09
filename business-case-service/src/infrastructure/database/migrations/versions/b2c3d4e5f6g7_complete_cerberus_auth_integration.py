"""complete_cerberus_auth_integration

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-30 12:00:00.000000

Adds the cerberus_audit_logs table and the missing permission columns 
to the users table (allowed_directors, module_features).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. cerberus_audit_logs table
    op.create_table(
        'cerberus_audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('ip_cliente', sa.String(length=64), nullable=False, server_default=''),
        sa.Column('usuario_login', sa.String(length=255), nullable=False),
        sa.Column('aplicacion', sa.String(length=100), nullable=False, server_default='proyectog-web'),
        sa.Column('url_efectiva', sa.Text(), nullable=True),
        sa.Column('cabeceras_env', sa.Text(), nullable=True),
        sa.Column('json_enviado', sa.Text(), nullable=True),
        sa.Column('http_codigo', sa.Integer(), nullable=True),
        sa.Column('cabeceras_rec', sa.Text(), nullable=True),
        sa.Column('json_recibido', sa.Text(), nullable=True),
        sa.Column('duracion_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('exito', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('error_detalle', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cerberus_audit_logs_usuario_login'), 'cerberus_audit_logs', ['usuario_login'], unique=False)
    op.create_index(op.f('ix_cerberus_audit_logs_created_at'), 'cerberus_audit_logs', ['created_at'], unique=False)

    # 2. Add columns to users
    # We use batch_alter_table for compatibility and checking if column exists is harder in raw alembic, 
    # but here we assume they don't exist yet in the DB.
    op.add_column('users', sa.Column('allowed_directors', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('module_features', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'module_features')
    op.drop_column('users', 'allowed_directors')
    op.drop_index(op.f('ix_cerberus_audit_logs_created_at'), table_name='cerberus_audit_logs')
    op.drop_index(op.f('ix_cerberus_audit_logs_usuario_login'), table_name='cerberus_audit_logs')
    op.drop_table('cerberus_audit_logs')
