"""v2_metadata_and_logs_no_drop

Revision ID: da1a54b28a4b
Revises: b2c3d4e5f6g7
Create Date: 2026-06-02 15:39:26.705315
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'da1a54b28a4b'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Crear categoría 'Legacy' para los documentos exportados
    op.execute("""
        INSERT IGNORE INTO document_categories (id, name, is_active, created_at, updated_at) 
        VALUES ('legacy-migrated', 'Documento Migrado (v1)', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
    """)

    # 2. Migrar registros de cash flow a logs (Ya que la data pasará a formato v2)
    op.execute("""
        INSERT INTO cash_flow_audit_log (
            id, project_id, field_name, new_value, user_id, user_name, 
            user_role, action, notes, occurred_at
        )
        SELECT 
            UUID(), c.project_id, 'legacy_migration', 
            CONCAT('Ingreso: ', c.actual_income, ' / Egreso: ', c.actual_expense),
            (SELECT id FROM users LIMIT 1), 'System', 'admin', 'import_excel', 
            CONCAT('Migrado de v1 para año: ', c.year, ' mes: ', c.month),
            UTC_TIMESTAMP()
        FROM cash_flow_entries c
    """)


def downgrade() -> None:
    pass
