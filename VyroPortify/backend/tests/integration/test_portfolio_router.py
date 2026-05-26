"""Integration tests for the portfolio router.

Tests cover: generate, status, list, publish toggle, public access, delete.
Cache and Celery are mocked; DB uses in-memory SQLite.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


MOCK_PARSED_DATA = {
    "full_name": "Test User",
    "email": "test@example.com",
    "skills": ["Python"],
    "work_experience": [],
    "education": [],
    "projects": [],
    "certifications": [],
    "languages": [],
}


class TestGeneratePortfolio:
    async def test_generate_portfolio_queues_task(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """POST /portfolio/generate should create a portfolio record and return 202."""
        from app.models.resume import Resume

        resume = Resume(
            user_id=fake_user.id,
            original_filename="test.pdf",
            file_type="pdf",
            status="done",
            parsed_data=MOCK_PARSED_DATA,
        )
        db_session.add(resume)
        await db_session.flush()

        with patch("app.routers.portfolio.generate_portfolio_task") as mock_task:
            mock_task.delay = MagicMock(return_value=MagicMock(id="celery-task-id"))
            # Import inside the module for the patch to work
            with patch(
                "app.workers.tasks.generate_portfolio.generate_portfolio_task",
                mock_task,
            ):
                response = await client.post(
                    "/api/v1/portfolio/generate",
                    json={"resume_id": str(resume.id), "template_id": "aurora"},
                    headers=auth_headers,
                )

        assert response.status_code == 202
        data = response.json()
        assert "portfolio_id" in data
        assert "message" in data

    async def test_generate_portfolio_fails_for_unparsed_resume(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """Generating a portfolio from a 'pending' resume should return 422."""
        from app.models.resume import Resume

        resume = Resume(
            user_id=fake_user.id,
            original_filename="pending.pdf",
            file_type="pdf",
            status="pending",
        )
        db_session.add(resume)
        await db_session.flush()

        response = await client.post(
            "/api/v1/portfolio/generate",
            json={"resume_id": str(resume.id), "template_id": "aurora"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    async def test_generate_portfolio_with_nonexistent_resume_returns_404(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        response = await client.post(
            "/api/v1/portfolio/generate",
            json={"resume_id": str(uuid.uuid4()), "template_id": "aurora"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    async def test_generate_with_invalid_template_id_returns_422(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """Invalid template_id should fail Pydantic validation with 422."""
        from app.models.resume import Resume

        resume = Resume(
            user_id=fake_user.id,
            original_filename="test.pdf",
            file_type="pdf",
            status="done",
            parsed_data=MOCK_PARSED_DATA,
        )
        db_session.add(resume)
        await db_session.flush()

        response = await client.post(
            "/api/v1/portfolio/generate",
            json={"resume_id": str(resume.id), "template_id": "invalid_template"},
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestPortfolioStatus:
    async def test_portfolio_status_returns_correct_state(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """GET /portfolio/{id}/status should return the current status."""
        from app.models.portfolio import Portfolio

        portfolio = Portfolio(
            user_id=fake_user.id,
            slug=f"test-portfolio-{fake_user.id.hex[:8]}",
            template_id="aurora",
            status="queued",
            is_public=False,
            views=0,
        )
        db_session.add(portfolio)
        await db_session.flush()

        response = await client.get(
            f"/api/v1/portfolio/{portfolio.id}/status",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "queued"
        assert data["slug"] == portfolio.slug

    async def test_portfolio_status_returns_ai_fallback_flag(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """ai_fallback should be True when content has _ai_failed flag."""
        from app.models.portfolio import Portfolio

        portfolio = Portfolio(
            user_id=fake_user.id,
            slug=f"ai-fallback-{fake_user.id.hex[:8]}",
            template_id="minimal",
            status="published",
            content={"_ai_failed": True, "hero_tagline": "Fallback"},
            is_public=True,
            views=0,
        )
        db_session.add(portfolio)
        await db_session.flush()

        response = await client.get(
            f"/api/v1/portfolio/{portfolio.id}/status",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["ai_fallback"] is True


class TestListPortfolios:
    async def test_list_portfolios_returns_only_user_portfolios(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """GET /portfolio/ should only return portfolios belonging to the current user."""
        from app.models.portfolio import Portfolio
        from app.models.user import User

        # Create another user + their portfolio
        other_user = User(
            clerk_user_id="clerk_other_portfolio",
            email="other_portfolio@example.com",
            name="Other Portfolio User",
            plan="free",
        )
        db_session.add(other_user)
        await db_session.flush()

        their_portfolio = Portfolio(
            user_id=other_user.id,
            slug=f"their-portfolio-{other_user.id.hex[:8]}",
            template_id="aurora",
            status="published",
            is_public=True,
            views=0,
        )
        db_session.add(their_portfolio)

        # Create one portfolio for our test user
        my_portfolio = Portfolio(
            user_id=fake_user.id,
            slug=f"my-portfolio-{fake_user.id.hex[:8]}",
            template_id="minimal",
            status="draft",
            is_public=False,
            views=0,
        )
        db_session.add(my_portfolio)
        await db_session.flush()

        response = await client.get("/api/v1/portfolio/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        slugs = [item["slug"] for item in data["items"]]
        assert my_portfolio.slug in slugs
        assert their_portfolio.slug not in slugs


class TestPublishPortfolio:
    async def test_publish_portfolio_sets_flag(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """PUT /portfolio/{id}/publish should toggle is_public flag."""
        from app.models.portfolio import Portfolio

        portfolio = Portfolio(
            user_id=fake_user.id,
            slug=f"publish-test-{fake_user.id.hex[:8]}",
            template_id="aurora",
            status="published",
            is_public=False,
            views=0,
        )
        db_session.add(portfolio)
        await db_session.flush()

        response = await client.put(
            f"/api/v1/portfolio/{portfolio.id}/publish",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_public"] is True

    async def test_publish_twice_toggles_back(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """Calling publish twice should toggle back to original state."""
        from app.models.portfolio import Portfolio

        portfolio = Portfolio(
            user_id=fake_user.id,
            slug=f"toggle-test-{fake_user.id.hex[:8]}",
            template_id="aurora",
            status="published",
            is_public=False,
            views=0,
        )
        db_session.add(portfolio)
        await db_session.flush()

        # First toggle → True
        await client.put(f"/api/v1/portfolio/{portfolio.id}/publish", headers=auth_headers)
        # Second toggle → False
        response = await client.put(
            f"/api/v1/portfolio/{portfolio.id}/publish",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["is_public"] is False


class TestPublicPortfolio:
    async def test_public_portfolio_returns_without_auth(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        fake_user,
    ):
        """GET /portfolio/p/{slug} should return data for a public portfolio (no auth)."""
        from app.models.portfolio import Portfolio

        slug = f"public-slug-{fake_user.id.hex[:8]}"
        portfolio = Portfolio(
            user_id=fake_user.id,
            slug=slug,
            template_id="aurora",
            status="published",
            is_public=True,
            views=0,
            content={"hero_tagline": "Public portfolio"},
        )
        db_session.add(portfolio)
        await db_session.flush()
        # Need to commit for the public endpoint to see it (cache miss → DB hit)
        await db_session.commit()

        response = await client.get(f"/api/v1/portfolio/p/{slug}")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == slug
        assert data["is_public"] is True

    async def test_private_portfolio_returns_404_on_public_route(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        fake_user,
    ):
        """Private (is_public=False) portfolio should return 404 on public route."""
        from app.models.portfolio import Portfolio

        slug = f"private-slug-{fake_user.id.hex[:8]}"
        portfolio = Portfolio(
            user_id=fake_user.id,
            slug=slug,
            template_id="aurora",
            status="published",
            is_public=False,
            views=0,
        )
        db_session.add(portfolio)
        await db_session.flush()
        await db_session.commit()

        response = await client.get(f"/api/v1/portfolio/p/{slug}")
        assert response.status_code == 404
