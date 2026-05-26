"""Integration tests for the auth router.

Tests the GET /api/v1/auth/me endpoint using the TestClient
with the DB and auth dependencies overridden by conftest fixtures.
"""

import pytest
from httpx import AsyncClient


class TestAuthRouter:
    async def test_me_returns_200_with_valid_auth(self, client: AsyncClient, auth_headers: dict):
        """GET /auth/me should return 200 with user data for authenticated user."""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200

    async def test_me_returns_user_fields(self, client: AsyncClient, auth_headers: dict, fake_user):
        """Response should include the expected user fields."""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        data = response.json()
        assert data["email"] == fake_user.email
        assert data["plan"] == fake_user.plan
        assert "id" in data
        assert "created_at" in data

    async def test_me_does_not_expose_password(self, client: AsyncClient, auth_headers: dict):
        """User response must NOT include hashed_password."""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        data = response.json()
        assert "hashed_password" not in data
        assert "password" not in data

    async def test_me_without_auth_returns_403(self, client: AsyncClient):
        """GET /auth/me without Authorization header should return 403 (HTTPBearer raises)."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code in (401, 403)

    async def test_health_endpoint_returns_ok(self, client: AsyncClient):
        """Health endpoint should be accessible without auth."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    async def test_v1_health_endpoint_returns_ok(self, client: AsyncClient):
        """Versioned health endpoint should return ok."""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data
