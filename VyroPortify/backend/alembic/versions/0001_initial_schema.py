"""Initial schema — users, resumes, portfolios, ai_jobs, templates

Revision ID: 0001_initial_schema
Revises: —
Create Date: 2026-05-09 00:00:00.000000

Tables created (in dependency order):
    templates → users → resumes → portfolios → ai_jobs

Indexes:
    ix_users_email                (unique)
    ix_users_stripe_customer_id   (unique)
    ix_resumes_user_id
    ix_portfolios_user_id
    ix_portfolios_slug            (unique)
    ix_ai_jobs_user_id
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# ── Alembic metadata ──────────────────────────────────────────────────────────
revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# ── helpers ───────────────────────────────────────────────────────────────────

def _ts() -> list[sa.Column]:
    """Standard created_at / updated_at columns (tz-aware, DB-managed)."""
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    ]


# ── upgrade ───────────────────────────────────────────────────────────────────

def upgrade() -> None:
    # ── 1. templates (referenced by portfolios — no FK deps) ──────────────
    op.create_table(
        "templates",
        sa.Column("id", sa.String(100), primary_key=True, comment="Slug PK, e.g. 'minimal'"),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("preview_url", sa.Text(), nullable=True),
        sa.Column(
            "category",
            sa.String(100),
            nullable=True,
            comment="personal | developer | designer | executive",
        ),
        sa.Column("is_pro", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="Layout, color scheme, font, and section-visibility settings",
        ),
        *_ts(),
    )

    # ── 2. users ──────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column(
            "plan",
            sa.String(50),
            nullable=False,
            server_default="free",
            comment="free | pro | enterprise",
        ),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        *_ts(),
        # DB-level uniqueness (belt-and-suspenders alongside indexes below)
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("stripe_customer_id", name="uq_users_stripe_customer_id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"], unique=True)

    # ── 3. resumes ────────────────────────────────────────────────────────
    op.create_table(
        "resumes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=True),
        sa.Column("file_type", sa.String(50), nullable=True, comment="pdf | docx | txt"),
        sa.Column(
            "parsed_data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="Structured JSON extracted from the resume",
        ),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="pending",
            comment="pending | processing | done | failed",
        ),
        *_ts(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_resumes_user_id", ondelete="CASCADE"
        ),
    )
    op.create_index("ix_resumes_user_id", "resumes", ["user_id"])

    # ── 4. portfolios ─────────────────────────────────────────────────────
    op.create_table(
        "portfolios",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resume_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("template_id", sa.String(100), nullable=True),
        sa.Column(
            "content",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="Rendered section content keyed by section name",
        ),
        sa.Column("html_url", sa.Text(), nullable=True),
        sa.Column("custom_domain", sa.String(253), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("views", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="draft",
            comment="draft | published | archived",
        ),
        *_ts(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_portfolios_user_id", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["resume_id"], ["resumes.id"], name="fk_portfolios_resume_id", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["templates.id"],
            name="fk_portfolios_template_id",
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint("slug", name="uq_portfolios_slug"),
    )
    op.create_index("ix_portfolios_user_id", "portfolios", ["user_id"])
    op.create_index("ix_portfolios_slug", "portfolios", ["slug"], unique=True)

    # ── 5. ai_jobs ────────────────────────────────────────────────────────
    op.create_table(
        "ai_jobs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "job_type",
            sa.String(100),
            nullable=False,
            comment="resume_parse | portfolio_generate | content_enhance",
        ),
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="pending",
            comment="pending | running | done | failed",
        ),
        sa.Column("input_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("output_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_msg", sa.Text(), nullable=True),
        sa.Column("tokens_used", sa.Integer(), nullable=True),
        sa.Column("duration_ms", sa.BigInteger(), nullable=True),
        *_ts(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_ai_jobs_user_id", ondelete="CASCADE"
        ),
    )
    op.create_index("ix_ai_jobs_user_id", "ai_jobs", ["user_id"])


# ── downgrade ─────────────────────────────────────────────────────────────────

def downgrade() -> None:
    # Drop indexes first, then tables in reverse-dependency order
    op.drop_index("ix_ai_jobs_user_id", table_name="ai_jobs")
    op.drop_table("ai_jobs")

    op.drop_index("ix_portfolios_slug", table_name="portfolios")
    op.drop_index("ix_portfolios_user_id", table_name="portfolios")
    op.drop_table("portfolios")

    op.drop_index("ix_resumes_user_id", table_name="resumes")
    op.drop_table("resumes")

    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.drop_table("templates")
