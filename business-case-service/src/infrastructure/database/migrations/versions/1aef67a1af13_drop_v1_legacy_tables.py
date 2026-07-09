"""drop_v1_legacy_tables

Revision ID: 1aef67a1af13
Revises: da1a54b28a4b
Create Date: 2026-06-02 15:41:51.238754
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1aef67a1af13'
down_revision: Union[str, None] = 'da1a54b28a4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PRECAUCIÓN: Estas operaciones eliminan irrevocablemente los datos v1.
    op.drop_table('entregables')
    op.drop_table('cash_flow_entries')


def downgrade() -> None:
    raise Exception("Downgrade not supported. Legacy data has been purged.")
