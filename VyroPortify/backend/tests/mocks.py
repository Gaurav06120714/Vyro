"""Shared mock objects for external services.

Usage:
    from tests.mocks import mock_anthropic_client, mock_s3_service, mock_stripe
"""

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch


# ── Claude / Anthropic mock ────────────────────────────────────────────────────

def make_claude_response(content: str) -> MagicMock:
    """Build a fake anthropic.messages.create() response."""
    block = MagicMock()
    block.text = content
    response = MagicMock()
    response.content = [block]
    return response


def mock_anthropic_client(response_content: str | None = None) -> MagicMock:
    """Return a MagicMock that behaves like anthropic.Anthropic().

    The .messages.create() method returns a response with one text block.
    """
    if response_content is None:
        response_content = json.dumps({
            "full_name": "Test User",
            "email": "test@example.com",
            "phone": None,
            "location": None,
            "linkedin_url": None,
            "github_url": None,
            "portfolio_url": None,
            "summary": "Experienced engineer",
            "work_experience": [],
            "education": [],
            "skills": ["Python", "FastAPI"],
            "projects": [],
            "certifications": [],
            "languages": [],
        })
    client = MagicMock()
    client.messages.create.return_value = make_claude_response(response_content)
    return client


# ── S3 / Storage mock ──────────────────────────────────────────────────────────

def mock_s3_service() -> MagicMock:
    """Return a MagicMock that behaves like S3StorageService."""
    mock = MagicMock()
    mock.upload_file = AsyncMock(
        return_value=f"resumes/test-user-id/20240101_120000-abc12345.pdf"
    )
    mock.presigned_url = AsyncMock(
        return_value="https://s3.example.com/presigned-url?token=abc"
    )
    mock.delete_file = AsyncMock(return_value=None)
    mock.download_file = AsyncMock(return_value=b"%PDF-1.4 test content")
    mock.object_exists = AsyncMock(return_value=True)
    return mock


# ── Stripe mock ────────────────────────────────────────────────────────────────

def mock_stripe(
    checkout_url: str = "https://checkout.stripe.com/pay/cs_test_123",
    session_id: str = "cs_test_123",
) -> MagicMock:
    """Return a MagicMock for stripe_service functions."""
    mock = MagicMock()

    checkout_session = MagicMock()
    checkout_session.url = checkout_url
    checkout_session.id = session_id

    portal_session = MagicMock()
    portal_session.url = "https://billing.stripe.com/session/bps_test_123"

    mock.get_or_create_customer.return_value = "cus_test_123"
    mock.create_checkout_session.return_value = checkout_session
    mock.create_customer_portal_session.return_value = portal_session
    mock.get_subscription_status.return_value = {
        "status": "active",
        "current_period_end": 1735689600,
        "cancel_at_period_end": False,
    }
    mock.construct_webhook_event.return_value = {
        "id": "evt_test_123",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {"user_id": str(uuid.UUID("00000000-0000-0000-0000-000000000001"))},
                "customer": "cus_test_456",
                "subscription": "sub_test_789",
            }
        },
    }
    return mock


# ── Redis / Cache mock ─────────────────────────────────────────────────────────

def mock_redis() -> MagicMock:
    """Return a MagicMock for the Redis cache (app.core.cache.cache)."""
    mock = MagicMock()
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=None)
    mock.delete = AsyncMock(return_value=None)
    mock.delete_pattern = AsyncMock(return_value=None)
    mock.close = AsyncMock(return_value=None)
    return mock


# ── Celery task mock ───────────────────────────────────────────────────────────

def mock_celery_task() -> MagicMock:
    """Return a MagicMock for a Celery task.

    .delay() returns a mock AsyncResult with id and state.
    """
    task = MagicMock()
    result = MagicMock()
    result.id = str(uuid.uuid4())
    result.state = "PENDING"
    task.delay.return_value = result
    task.apply.return_value = result
    return task
