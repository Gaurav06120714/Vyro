"""Seed 3 default portfolio templates.

Usage (from /backend with .venv active):
    python -m scripts.seed_templates

The script is fully idempotent — it uses INSERT … ON CONFLICT DO UPDATE so it
is safe to re-run any number of times. Existing rows are updated in-place if
the config has changed.
"""

import asyncio
import sys
from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.session import AsyncSessionLocal
from app.models.template import Template

# ── seed data ─────────────────────────────────────────────────────────────────

DEFAULT_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "minimal",
        "name": "Minimal",
        "preview_url": "https://cdn.vyroportify.com/previews/minimal.png",
        "category": "personal",
        "is_pro": False,
        "config": {
            "layout": "single-column",
            "fonts": {
                "heading": "Inter",
                "body": "Inter",
            },
            "colors": {
                "primary": "#111827",
                "accent": "#6366f1",
                "background": "#ffffff",
                "surface": "#f9fafb",
                "text": "#374151",
            },
            "sections": {
                "hero": True,
                "about": True,
                "experience": True,
                "education": True,
                "skills": True,
                "projects": False,
                "awards": False,
                "contact": True,
            },
            "border_radius": "0.375rem",
            "spacing": "comfortable",
        },
    },
    {
        "id": "modern",
        "name": "Modern",
        "preview_url": "https://cdn.vyroportify.com/previews/modern.png",
        "category": "developer",
        "is_pro": False,
        "config": {
            "layout": "two-column",
            "fonts": {
                "heading": "Geist",
                "body": "Geist",
            },
            "colors": {
                "primary": "#0f172a",
                "accent": "#0ea5e9",
                "background": "#f8fafc",
                "surface": "#e2e8f0",
                "text": "#1e293b",
            },
            "sections": {
                "hero": True,
                "about": True,
                "experience": True,
                "education": True,
                "skills": True,
                "projects": True,
                "awards": False,
                "contact": True,
            },
            "border_radius": "0.5rem",
            "spacing": "compact",
        },
    },
    {
        "id": "bold",
        "name": "Bold",
        "preview_url": "https://cdn.vyroportify.com/previews/bold.png",
        "category": "designer",
        "is_pro": True,
        "config": {
            "layout": "magazine",
            "fonts": {
                "heading": "Playfair Display",
                "body": "Source Sans Pro",
            },
            "colors": {
                "primary": "#1e1b4b",
                "accent": "#f59e0b",
                "background": "#fafaf9",
                "surface": "#f5f0e8",
                "text": "#292524",
            },
            "sections": {
                "hero": True,
                "about": True,
                "experience": True,
                "education": True,
                "skills": True,
                "projects": True,
                "awards": True,
                "contact": True,
            },
            "border_radius": "0rem",
            "spacing": "spacious",
        },
    },
]


# ── seed logic ────────────────────────────────────────────────────────────────

async def seed() -> None:
    """Upsert all default templates (idempotent)."""
    async with AsyncSessionLocal() as session:
        stmt = (
            pg_insert(Template)
            .values(DEFAULT_TEMPLATES)
            .on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "name": pg_insert(Template).excluded.name,
                    "preview_url": pg_insert(Template).excluded.preview_url,
                    "category": pg_insert(Template).excluded.category,
                    "is_pro": pg_insert(Template).excluded.is_pro,
                    "config": pg_insert(Template).excluded.config,
                    # updated_at is handled by SQLAlchemy's onupdate
                },
            )
        )
        await session.execute(stmt)
        await session.commit()

    ids = [t["id"] for t in DEFAULT_TEMPLATES]
    print(f"✓ Upserted {len(ids)} template(s): {ids}", flush=True)


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        asyncio.run(seed())
    except Exception as exc:  # noqa: BLE001
        print(f"✗ Seed failed: {exc}", file=sys.stderr)
        sys.exit(1)
