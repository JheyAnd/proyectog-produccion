"""Renamed suministro to materiales and added servicios

Revision ID: d6e00f9d6a92
Revises: 1aef67a1af13
Create Date: 2026-06-12 15:39:17.004961
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6e00f9d6a92'
down_revision: Union[str, None] = '1aef67a1af13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename suministro to materiales
    op.alter_column('business_case', 'venta_suministro', new_column_name='venta_materiales', existing_type=sa.Numeric(precision=18, scale=2))
    op.alter_column('business_case', 'costo_suministro', new_column_name='costo_materiales', existing_type=sa.Numeric(precision=18, scale=2))
    
    # Add servicios columns
    op.add_column('business_case', sa.Column('venta_servicios', sa.Numeric(precision=18, scale=2), nullable=True))
    op.add_column('business_case', sa.Column('costo_servicios', sa.Numeric(precision=18, scale=2), nullable=True))

def downgrade() -> None:
    # Remove servicios columns
    op.drop_column('business_case', 'costo_servicios')
    op.drop_column('business_case', 'venta_servicios')
    
    # Rename materiales back to suministro
    op.alter_column('business_case', 'venta_materiales', new_column_name='venta_suministro', existing_type=sa.Numeric(precision=18, scale=2))
    op.alter_column('business_case', 'costo_materiales', new_column_name='costo_suministro', existing_type=sa.Numeric(precision=18, scale=2))
