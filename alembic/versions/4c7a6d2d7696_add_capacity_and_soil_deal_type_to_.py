"""add_capacity_and_soil_deal_type_to_dropoffs

Revision ID: 4c7a6d2d7696
Revises: ef293d58c46c
Create Date: 2026-07-10 19:03:17.624490

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
"""add_capacity_and_soil_deal_type_to_dropoffs

Revision ID: 4c7a6d2d7696
Revises: ef293d58c46c
Create Date: 2026-07-10 19:03:17.624490

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c7a6d2d7696'
down_revision: Union[str, Sequence[str], None] = 'ef293d58c46c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely add soil_deal_type column to drop_offs table since capacity already exists
    op.add_column('drop_offs', sa.Column('soil_deal_type', sa.String(), nullable=False, server_default='SITE_PAYS'))


def downgrade() -> None:
    op.drop_column('drop_offs', 'soil_deal_type')
