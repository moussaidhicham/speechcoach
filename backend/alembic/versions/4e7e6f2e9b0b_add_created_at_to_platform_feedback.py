"""Add created_at to platform feedback

Revision ID: 4e7e6f2e9b0b
Revises: 956201f6b4ac
Create Date: 2026-03-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4e7e6f2e9b0b"
down_revision: Union[str, Sequence[str], None] = "956201f6b4ac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "platformfeedback",
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )


def downgrade() -> None:
    op.drop_column("platformfeedback", "created_at")
