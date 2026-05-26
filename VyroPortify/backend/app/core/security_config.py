"""Centralized security configuration for VyroPortify.

All security-relevant constants and constraints live here so they can be:
  1. Loaded from environment variables (production-grade, 12-factor).
  2. Changed in one place without hunting through router/service files.
  3. Audited independently by security reviewers.

Import pattern:
    from app.core.security_config import security_settings
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class SecuritySettings(BaseSettings):
    """Security-specific settings loaded from environment variables.

    These supplement the main Settings class and are focused exclusively on
    security boundaries, limits, and policies.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # ── File upload security ───────────────────────────────────────────────────
    # Max upload size in bytes — matches MAX_UPLOAD_SIZE_MB in main Settings.
    # Defined here as bytes so validation code doesn't need to multiply.
    # 10 MB hard ceiling at the HTTP layer (middleware); 5 MB at the app layer.
    MAX_REQUEST_BODY_BYTES: int = 10 * 1024 * 1024   # 10 MB — HTTP middleware limit
    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024           # 5 MB  — application limit

    # Allowed MIME types for resume uploads.
    # Magic-byte validation enforces this independently of the Content-Type header
    # (which is attacker-controlled and cannot be trusted alone).
    ALLOWED_MIME_TYPES: set[str] = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    }

    # ── AI / LLM security ─────────────────────────────────────────────────────
    # Maximum characters sent to Claude in a single prompt.
    # This prevents:
    #   1. Cost explosion from maliciously large payloads.
    #   2. Prompt injection attacks that use long preambles to shift context.
    #   3. Accidental token overflows causing API errors.
    MAX_TEXT_LENGTH_FOR_AI: int = 50_000  # ~12,500 tokens for Haiku

    # ── Rate limiting (tokens per window) ─────────────────────────────────────
    # These are enforced by slowapi decorators on individual endpoints.
    # Defined here for visibility — actual enforcement is in the routers.
    RATE_LIMIT_AI_ENDPOINTS: str = "10/minute"    # resume/build, portfolio/generate
    RATE_LIMIT_DEFAULT: str = "200/minute"        # global default per IP

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Loaded from the environment so production deployments can tighten this
    # without code changes. In development, localhost origins are fine.
    # Note: actual CORS configuration lives in main.py (CORSMiddleware).
    # This is the source of truth for what's valid.
    CORS_ORIGINS_PRODUCTION: list[str] = []

    # ── Stripe webhook ─────────────────────────────────────────────────────────
    # Redis key TTL for processed webhook IDs (idempotency cache).
    # 24 hours matches Stripe's retry window — after 24h a duplicate event
    # would be a legitimate re-send worth processing again.
    WEBHOOK_IDEMPOTENCY_TTL_SECONDS: int = 86_400  # 24 hours

    # ── Security headers ──────────────────────────────────────────────────────
    # Content-Security-Policy directive.
    # This is intentionally restrictive. Adjust for inline styles/scripts if needed.
    CONTENT_SECURITY_POLICY: str = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://clerk.accounts.dev https://*.clerk.accounts.dev; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https://img.clerk.com https://images.clerk.dev "
        "https://avatars.githubusercontent.com https://lh3.googleusercontent.com "
        "https://*.amazonaws.com; "
        "connect-src 'self' https://api.clerk.dev https://*.clerk.accounts.dev "
        "https://api.anthropic.com https://api.stripe.com; "
        "font-src 'self' data:; "
        "frame-src 'none'; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )

    @field_validator("MAX_TEXT_LENGTH_FOR_AI")
    @classmethod
    def validate_ai_limit(cls, v: int) -> int:
        if v < 1000:
            raise ValueError("MAX_TEXT_LENGTH_FOR_AI must be at least 1000 chars")
        if v > 500_000:
            raise ValueError("MAX_TEXT_LENGTH_FOR_AI cannot exceed 500,000 chars")
        return v


# Module-level singleton — import this everywhere:
#   from app.core.security_config import security_settings
security_settings = SecuritySettings()
