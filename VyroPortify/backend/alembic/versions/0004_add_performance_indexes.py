"""add performance indexes for resumes and portfolios

Revision ID: 0004_add_performance_indexes
Revises: fb6d4ef46e79
Create Date: 2026-05-15

Indexes added:
  - resumes.status          — filter by parse state (done / pending / failed)
  - portfolios.is_public    — sitemap and public listing queries
  - portfolios.status       — filter by generation state (published / draft)

Note: resumes.user_id, portfolios.user_id, and portfolios.slug already have
indexes from the initial schema / previous migrations. We use IF NOT EXISTS
guards so re-running this migration on an already-indexed column is safe.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004_add_performance_indexes"
down_revision: str | None = "fb6d4ef46e79"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── resumes.status ──────────────────────────────────────────────────────
    # Used in: resume listing filtered by status, Celery task status polling
    op.create_index(
        "ix_resumes_status",
        "resumes",
        ["status"],
        unique=False,
        if_not_exists=True,
    )

    # ── portfolios.is_public ─────────────────────────────────────────────────
    # Used in: sitemap endpoint (is_public=True), public portfolio listing
    op.create_index(
        "ix_portfolios_is_public",
        "portfolios",
        ["is_public"],
        unique=False,
        if_not_exists=True,
    )

    # ── portfolios.status ────────────────────────────────────────────────────
    # Used in: generation status polling, filtering by published state
    op.create_index(
        "ix_portfolios_status",
        "portfolios",
        ["status"],
        unique=False,
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("ix_portfolios_status", table_name="portfolios")
    op.drop_index("ix_portfolios_is_public", table_name="portfolios")
    op.drop_index("ix_resumes_status", table_name="resumes")
