"""Test data factories.

Each function creates an ORM model instance with sensible defaults.
Pass keyword arguments to override any field.

Usage:
    user = make_user()
    resume = make_resume(user_id=user.id, status="done")
    portfolio = make_portfolio(user_id=user.id, resume_id=resume.id)
"""

import uuid
from datetime import datetime, timezone

from app.models.portfolio import Portfolio
from app.models.resume import Resume
from app.models.user import User


def make_user(
    clerk_id: str = "clerk_test_abc123",
    plan: str = "free",
    email: str | None = None,
    **kwargs,
) -> User:
    """Create a User instance (not persisted to DB)."""
    user_id = uuid.uuid4()
    user = User.__new__(User)
    user.id = user_id
    user.clerk_user_id = clerk_id
    user.email = email or f"user_{user_id.hex[:8]}@example.com"
    user.name = "Test User"
    user.plan = plan
    user.avatar_url = None
    user.stripe_customer_id = None
    user.stripe_subscription_id = None
    user.plan_expires_at = None
    user.hashed_password = None
    user.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    user.updated_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    for k, v in kwargs.items():
        setattr(user, k, v)
    return user


def make_resume(
    user_id: uuid.UUID | None = None,
    status: str = "pending",
    parsed_data: dict | None = None,
    **kwargs,
) -> Resume:
    """Create a Resume instance (not persisted to DB)."""
    resume = Resume.__new__(Resume)
    resume.id = uuid.uuid4()
    resume.user_id = user_id or uuid.uuid4()
    resume.s3_key = f"resumes/{resume.user_id}/test-resume.pdf"
    resume.file_url = "https://example.com/presigned-url"
    resume.original_filename = "test_resume.pdf"
    resume.file_type = "pdf"
    resume.raw_text = "John Doe\nSoftware Engineer\nPython, FastAPI"
    resume.parsed_data = parsed_data or {
        "full_name": "John Doe",
        "email": "john@example.com",
        "skills": ["Python", "FastAPI"],
        "work_experience": [],
        "education": [],
        "projects": [],
        "certifications": [],
        "languages": [],
    }
    resume.status = status
    resume.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    resume.updated_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    for k, v in kwargs.items():
        setattr(resume, k, v)
    return resume


def make_portfolio(
    user_id: uuid.UUID | None = None,
    resume_id: uuid.UUID | None = None,
    status: str = "draft",
    is_public: bool = False,
    slug: str | None = None,
    **kwargs,
) -> Portfolio:
    """Create a Portfolio instance (not persisted to DB)."""
    portfolio = Portfolio.__new__(Portfolio)
    portfolio.id = uuid.uuid4()
    portfolio.user_id = user_id or uuid.uuid4()
    portfolio.resume_id = resume_id or uuid.uuid4()
    portfolio.slug = slug or f"john-doe-{portfolio.user_id.hex[:8]}"
    portfolio.template_id = "aurora"
    portfolio.content = {"hero_tagline": "Building great software"}
    portfolio.html_url = None
    portfolio.custom_domain = None
    portfolio.is_public = is_public
    portfolio.views = 0
    portfolio.status = status
    portfolio.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    portfolio.updated_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    for k, v in kwargs.items():
        setattr(portfolio, k, v)
    return portfolio
