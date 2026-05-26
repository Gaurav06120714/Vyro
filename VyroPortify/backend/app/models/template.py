from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.portfolio import Portfolio


class Template(TimestampMixin, Base):
    """Portfolio visual template. Uses a human-readable VARCHAR PK (e.g. 'minimal')."""

    __tablename__ = "templates"

    # Human-readable slug primary key, e.g. "minimal", "modern", "bold"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    preview_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="personal | developer | designer | executive"
    )
    is_pro: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    config: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True, comment="Layout, color scheme, font, and section-visibility settings"
    )

    # Relationships
    portfolios: Mapped[list["Portfolio"]] = relationship(back_populates="template")

    def __repr__(self) -> str:
        return f"<Template id={self.id!r} name={self.name!r} is_pro={self.is_pro}>"
