"""Add hashed_password column to users table

Revision ID: 0002_add_hashed_password
Revises: 0001_initial_schema
Create Date: 2026-05-09 00:01:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_add_hashed_password"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add the column as nullable first so existing rows aren't rejected,
    # then apply NOT NULL after backfill (safe on empty tables at this stage).
    op.add_column(
        "users",
        sa.Column("hashed_password", sa.Text(), nullable=True),
    )
    # In production you would backfill here before making it NOT NULL.
    # For a fresh project the table is empty so we can tighten immediately.
    op.alter_column("users", "hashed_password", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "hashed_password")
