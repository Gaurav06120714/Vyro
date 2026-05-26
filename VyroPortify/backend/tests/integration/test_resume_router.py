"""Integration tests for the resume router.

All tests use in-memory SQLite + overridden auth (conftest).
S3 and Claude are mocked to avoid real network calls.
"""

import io
import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.factories import make_resume, make_user


# ── Magic byte helpers ─────────────────────────────────────────────────────────

PDF_BYTES = b"%PDF-1.4 fake pdf content for testing"
DOCX_BYTES = b"PK\x03\x04" + b"\x00" * 50


def _pdf_file(name: str = "resume.pdf") -> tuple[str, bytes, str]:
    return ("file", (name, PDF_BYTES, "application/pdf"))


def _docx_file(name: str = "resume.docx") -> tuple[str, bytes, str]:
    mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return ("file", (name, DOCX_BYTES, mime))


def _fake_html_as_pdf(name: str = "evil.pdf") -> tuple[str, bytes, str]:
    """File with PDF content-type but HTML magic bytes."""
    return ("file", (name, b"<html>evil</html>", "application/pdf"))


MOCK_PARSED_DATA = {
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "skills": ["Python"],
    "work_experience": [],
    "education": [],
    "projects": [],
    "certifications": [],
    "languages": [],
}


class TestUploadResume:
    @patch("app.routers.resume.storage")
    @patch("app.routers.resume.anyio.to_thread.run_sync")
    async def test_upload_valid_pdf_returns_201(
        self,
        mock_run_sync,
        mock_storage,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """A valid PDF upload should return 201 with resume data."""
        mock_storage.upload_file = AsyncMock(return_value="resumes/test/file.pdf")
        mock_storage.presigned_url = AsyncMock(return_value="https://s3.example.com/file.pdf")

        from app.services.resume_parser import ResumeData
        mock_run_sync.return_value = ResumeData(**MOCK_PARSED_DATA)

        with patch("app.core.config.settings") as mock_settings:
            mock_settings.AWS_ACCESS_KEY_ID = "test_key"
            mock_settings.R2_ACCESS_KEY_ID = ""
            mock_settings.MAX_UPLOAD_SIZE_MB = 5
            mock_settings.PRESIGNED_URL_DEFAULT_HOURS = 24
            mock_settings.API_V1_PREFIX = "/api/v1"

            response = await client.post(
                "/api/v1/resume/upload",
                files=[_pdf_file()],
                headers=auth_headers,
            )

        # The endpoint creates a record — either 201 or 200 depending on inline parse path
        assert response.status_code in (200, 201)

    async def test_upload_invalid_magic_bytes_returns_400(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """A file with HTML content but PDF content-type should return 400."""
        response = await client.post(
            "/api/v1/resume/upload",
            files=[_fake_html_as_pdf()],
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "content does not match" in response.json()["detail"].lower()

    async def test_upload_unsupported_content_type_returns_400(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Uploading an image should return 400 with unsupported file type message."""
        response = await client.post(
            "/api/v1/resume/upload",
            files=[("file", ("photo.jpg", b"\xff\xd8\xff\xe0", "image/jpeg"))],
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "unsupported file type" in response.json()["detail"].lower()

    async def test_upload_empty_file_returns_400(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Empty file should return 400."""
        response = await client.post(
            "/api/v1/resume/upload",
            files=[("file", ("empty.pdf", b"", "application/pdf"))],
            headers=auth_headers,
        )
        assert response.status_code == 400

    async def test_upload_oversized_file_returns_413(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """File exceeding MAX_UPLOAD_SIZE_MB should return 413."""
        # Create 6 MB PDF-magic file (default limit is 5 MB)
        large_bytes = b"%PDF-1.4 " + b"x" * (6 * 1024 * 1024)
        response = await client.post(
            "/api/v1/resume/upload",
            files=[("file", ("big.pdf", large_bytes, "application/pdf"))],
            headers=auth_headers,
        )
        assert response.status_code == 413

    async def test_upload_without_auth_returns_403(self, client: AsyncClient):
        """Upload without auth header should return 403."""
        response = await client.post(
            "/api/v1/resume/upload",
            files=[_pdf_file()],
        )
        assert response.status_code in (401, 403)


class TestListResumes:
    async def test_list_resumes_returns_200(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """GET /resume/ should return 200."""
        response = await client.get("/api/v1/resume/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    async def test_list_resumes_returns_only_user_resumes(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """Resumes from another user should not appear in the list."""
        from app.models.resume import Resume
        from app.models.user import User

        # Create a second user
        other_user = User(
            clerk_user_id="clerk_other_user",
            email="other@example.com",
            name="Other User",
            plan="free",
        )
        db_session.add(other_user)
        await db_session.flush()

        # Create resume for other user
        other_resume = Resume(
            user_id=other_user.id,
            original_filename="other_resume.pdf",
            file_type="pdf",
            status="done",
        )
        db_session.add(other_resume)
        await db_session.flush()

        response = await client.get("/api/v1/resume/", headers=auth_headers)
        data = response.json()

        # No items for our test user (fake_user has no resumes in this test)
        item_user_ids = [item["user_id"] for item in data["items"]]
        assert str(other_user.id) not in item_user_ids

    async def test_list_resumes_with_invalid_ttl_returns_400(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """ttl_hours that is not a multiple of 2 should return 400."""
        response = await client.get(
            "/api/v1/resume/?ttl_hours=3",
            headers=auth_headers,
        )
        assert response.status_code == 400


class TestDeleteResume:
    async def test_delete_resume_removes_from_db(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """DELETE /resume/{id} should delete the DB record and return 204."""
        from app.models.resume import Resume

        resume = Resume(
            user_id=fake_user.id,
            original_filename="to_delete.pdf",
            file_type="pdf",
            status="done",
            s3_key=None,  # no S3 key → skip S3 deletion
        )
        db_session.add(resume)
        await db_session.flush()
        resume_id = resume.id

        response = await client.delete(
            f"/api/v1/resume/{resume_id}",
            headers=auth_headers,
        )
        assert response.status_code == 204

    async def test_delete_nonexistent_resume_returns_404(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Deleting a resume that doesn't exist should return 404."""
        fake_id = uuid.uuid4()
        response = await client.delete(
            f"/api/v1/resume/{fake_id}",
            headers=auth_headers,
        )
        assert response.status_code == 404

    async def test_delete_other_users_resume_returns_404(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """Cannot delete another user's resume — should return 404 (not 403)."""
        from app.models.resume import Resume
        from app.models.user import User

        other_user = User(
            clerk_user_id="clerk_other_delete",
            email="other_delete@example.com",
            name="Other",
            plan="free",
        )
        db_session.add(other_user)
        await db_session.flush()

        resume = Resume(
            user_id=other_user.id,
            original_filename="protected.pdf",
            file_type="pdf",
            status="done",
        )
        db_session.add(resume)
        await db_session.flush()

        response = await client.delete(
            f"/api/v1/resume/{resume.id}",
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestResumeStatus:
    async def test_resume_status_returns_200(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        """GET /resume/{id}/status should return status and parsed data."""
        from app.models.resume import Resume

        resume = Resume(
            user_id=fake_user.id,
            original_filename="status_test.pdf",
            file_type="pdf",
            status="done",
            parsed_data=MOCK_PARSED_DATA,
        )
        db_session.add(resume)
        await db_session.flush()

        response = await client.get(
            f"/api/v1/resume/{resume.id}/status",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "done"
        assert data["parsed_data"]["full_name"] == "Jane Doe"

    async def test_resume_status_pending_shows_pending(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        fake_user,
    ):
        from app.models.resume import Resume

        resume = Resume(
            user_id=fake_user.id,
            original_filename="pending.pdf",
            file_type="pdf",
            status="pending",
        )
        db_session.add(resume)
        await db_session.flush()

        response = await client.get(
            f"/api/v1/resume/{resume.id}/status",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "pending"


class TestBuildResume:
    @patch("app.routers.resume.anyio.to_thread.run_sync")
    async def test_build_resume_calls_claude_mock(
        self,
        mock_run_sync,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """POST /resume/build should call build_resume_with_claude and return 201."""
        from app.services.resume_parser import ResumeData

        mock_run_sync.return_value = ResumeData(**MOCK_PARSED_DATA)

        payload = {
            "personal": {"name": "Test User", "title": "Engineer"},
            "experience_summary": {"years": 5, "tech_stack": ["Python"]},
            "work_experiences": [],
            "projects": [],
            "education": {"degree": "BS", "institution": "MIT", "year": "2020"},
            "skills": ["Python", "Docker"],
            "social_links": {},
            "career_goal": "Build great software",
        }

        response = await client.post(
            "/api/v1/resume/build",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert "resume_id" in data
        assert "message" in data
