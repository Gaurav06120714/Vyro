"""Add s3_key and original_filename columns to resumes

Revision ID: 0003_resume_s3_fields
Revises: 0002_add_hashed_password
Create Date: 2026-05-09 00:02:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_resume_s3_fields"
down_revision: str | None = "0002_add_hashed_password"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("resumes", sa.Column("s3_key", sa.Text(), nullable=True))
    op.add_column("resumes", sa.Column("original_filename", sa.Text(), nullable=True))
    # Unique constraint on s3_key — each uploaded object is referenced exactly once
    op.create_unique_constraint("uq_resumes_s3_key", "resumes", ["s3_key"])


def downgrade() -> None:
    op.drop_constraint("uq_resumes_s3_key", "resumes", type_="unique")
    op.drop_column("resumes", "original_filename")
    op.drop_column("resumes", "s3_key")
