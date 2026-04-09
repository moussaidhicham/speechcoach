"""Add progress tracking columns to videosession

Revision ID: b7a1d3e2f4c5
Revises: 956201f6b4ac
Create Date: 2026-04-09 17:42:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'b7a1d3e2f4c5'
down_revision: Union[str, Sequence[str], None] = '4e7e6f2e9b0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add columns to videosession table
    op.add_column('videosession', sa.Column('current_step', sa.String(255), nullable=True))
    op.add_column('videosession', sa.Column('progress_percent', sa.Float(), nullable=False, server_default='0.0'))
    op.add_column('videosession', sa.Column('processing_started_at', sa.DateTime(), nullable=True))

def downgrade() -> None:
    # Remove columns from videosession table
    op.drop_column('videosession', 'processing_started_at')
    op.drop_column('videosession', 'progress_percent')
    op.drop_column('videosession', 'current_step')
