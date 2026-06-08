"""drop_sdui_templates_table

Revision ID: 3790704b30b7
Revises: 6daf85a44ca9
Create Date: 2026-06-04 12:41:36.303341

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3790704b30b7'
down_revision: Union[str, Sequence[str], None] = '6daf85a44ca9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table('sdui_templates')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        'sdui_templates',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('template_key', sa.String(length=100), nullable=False, unique=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('json_layout', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('version', sa.Integer(), default=1),
        sa.Column('figma_url', sa.String(length=500), nullable=True),
        sa.Column('figma_node_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now())
    )
