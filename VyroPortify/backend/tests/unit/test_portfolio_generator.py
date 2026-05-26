"""Unit tests for the portfolio generator service.

Covers:
- _slugify: URL-safe slug generation, uniqueness, special characters
- ContentEnhancer: mocked Claude calls, fallback behavior
- TemplateInjector: Jinja2 rendering for aurora/minimal templates, XSS escaping
"""

import json
import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.routers.portfolio import _slugify
from app.services.portfolio_generator import (
    ContentEnhancer,
    TemplateInjector,
    _normalise,
)


# ── _slugify ───────────────────────────────────────────────────────────────────

class TestSlugify:
    def _user_id(self) -> uuid.UUID:
        return uuid.UUID("12345678-1234-1234-1234-123456789012")

    def test_slug_is_lowercase(self):
        slug = _slugify("John Doe", self._user_id())
        assert slug == slug.lower()

    def test_slug_replaces_spaces_with_dashes(self):
        slug = _slugify("John Doe", self._user_id())
        assert " " not in slug
        assert "-" in slug

    def test_slug_removes_special_characters(self):
        slug = _slugify("John O'Malley (Sr.)", self._user_id())
        assert "'" not in slug
        assert "(" not in slug
        assert "." not in slug

    def test_slug_includes_user_id_suffix(self):
        user_id = self._user_id()
        slug = _slugify("Alice", user_id)
        expected_suffix = str(user_id)[:8]
        assert slug.endswith(expected_suffix)

    def test_same_name_different_user_produces_different_slug(self):
        uid1 = uuid.UUID("11111111-1111-1111-1111-111111111111")
        uid2 = uuid.UUID("22222222-2222-2222-2222-222222222222")
        slug1 = _slugify("Bob Smith", uid1)
        slug2 = _slugify("Bob Smith", uid2)
        assert slug1 != slug2

    def test_slug_is_url_safe(self):
        slug = _slugify("María García López", self._user_id())
        # Only a-z, 0-9, and hyphens should remain
        import re
        assert re.match(r"^[a-z0-9\-]+$", slug), f"Slug not URL-safe: {slug!r}"

    def test_slug_truncated_to_reasonable_length(self):
        long_name = "A" * 100
        slug = _slugify(long_name, self._user_id())
        # Base slug is truncated to 40 chars, then user_id suffix added
        # Total length should be ≤ 50 chars
        assert len(slug) <= 50

    def test_empty_name_falls_back_to_user_id_suffix(self):
        slug = _slugify("", self._user_id())
        assert len(slug) > 0  # at least the suffix part


# ── ContentEnhancer ────────────────────────────────────────────────────────────

class TestContentEnhancer:
    SAMPLE_PARSED_DATA = {
        "full_name": "Bob Smith",
        "summary": "Backend engineer with 10 years of experience",
        "skills": ["Python", "Go", "Kubernetes"],
        "work_experience": [],
        "education": [],
        "projects": [],
    }

    SAMPLE_ENHANCED = {
        "hero_tagline": "Building resilient backend systems at scale",
        "hero_description": "10 years crafting distributed systems.",
        "about_paragraph": "Bob is a backend engineer passionate about Kubernetes.",
        "title": "Senior Backend Engineer",
    }

    def _make_mock_response(self, content: str) -> MagicMock:
        block = MagicMock()
        block.text = content
        resp = MagicMock()
        resp.content = [block]
        return resp

    def test_enhance_returns_dict_with_claude_content(self):
        with patch("app.services.portfolio_generator.anthropic.Anthropic") as MockAnthropic:
            client = MagicMock()
            MockAnthropic.return_value = client
            client.messages.create.return_value = self._make_mock_response(
                json.dumps(self.SAMPLE_ENHANCED)
            )
            enhancer = ContentEnhancer()
            result = enhancer.enhance(self.SAMPLE_PARSED_DATA)

        assert result["hero_tagline"] == "Building resilient backend systems at scale"
        assert result["title"] == "Senior Backend Engineer"

    def test_enhance_returns_fallback_on_claude_failure(self):
        with patch("app.services.portfolio_generator.anthropic.Anthropic") as MockAnthropic:
            client = MagicMock()
            MockAnthropic.return_value = client
            client.messages.create.side_effect = Exception("API timeout")
            enhancer = ContentEnhancer()
            result = enhancer.enhance(self.SAMPLE_PARSED_DATA)

        # Fallback uses the summary as hero_tagline
        assert "_ai_failed" in result
        assert result["_ai_failed"] is True

    def test_enhance_strips_markdown_from_response(self):
        wrapped = f"```json\n{json.dumps(self.SAMPLE_ENHANCED)}\n```"
        with patch("app.services.portfolio_generator.anthropic.Anthropic") as MockAnthropic:
            client = MagicMock()
            MockAnthropic.return_value = client
            client.messages.create.return_value = self._make_mock_response(wrapped)
            enhancer = ContentEnhancer()
            result = enhancer.enhance(self.SAMPLE_PARSED_DATA)

        assert result["hero_tagline"] == "Building resilient backend systems at scale"

    def test_enhance_truncates_large_parsed_data(self):
        """Large parsed data should be truncated before sending to Claude."""
        large_data = {"summary": "x" * 60_000, "skills": []}
        with patch("app.services.portfolio_generator.anthropic.Anthropic") as MockAnthropic:
            client = MagicMock()
            MockAnthropic.return_value = client
            client.messages.create.return_value = self._make_mock_response(
                json.dumps(self.SAMPLE_ENHANCED)
            )
            enhancer = ContentEnhancer()
            enhancer.enhance(large_data)

        call_args = client.messages.create.call_args
        user_content = call_args[1]["messages"][0]["content"]
        # The content sent to Claude should be within the 50k limit + overhead
        assert len(user_content) < 55_000


# ── TemplateInjector ───────────────────────────────────────────────────────────

class TestTemplateInjector:
    SAMPLE_PARSED = {
        "full_name": "Carol White",
        "email": "carol@example.com",
        "phone": "555-1234",
        "location": "Seattle, WA",
        "linkedin_url": "https://linkedin.com/in/carol",
        "github_url": "https://github.com/carol",
        "portfolio_url": None,
        "summary": "Full-stack engineer.",
        "work_experience": [],
        "education": [],
        "skills": ["Python", "React", "AWS"],
        "projects": [],
        "certifications": [],
        "languages": [],
    }

    SAMPLE_ENHANCED = {
        "hero_tagline": "Building full-stack products users love",
        "hero_description": "5 years of web development.",
        "about_paragraph": "Carol is a full-stack engineer based in Seattle.",
        "title": "Full-Stack Engineer",
    }

    def test_render_aurora_template_produces_html(self):
        injector = TemplateInjector()
        html = injector.inject("aurora", self.SAMPLE_PARSED, self.SAMPLE_ENHANCED)
        assert isinstance(html, str)
        assert len(html) > 100  # non-trivial output
        assert "<html" in html.lower() or "<!DOCTYPE" in html.lower() or "<!doctype" in html.lower()

    def test_render_minimal_template_produces_html(self):
        injector = TemplateInjector()
        html = injector.inject("minimal", self.SAMPLE_PARSED, self.SAMPLE_ENHANCED)
        assert isinstance(html, str)
        assert len(html) > 100

    def test_portfolio_content_escapes_xss(self):
        """XSS payloads in data should be escaped by Jinja2's autoescape."""
        xss_data = {
            **self.SAMPLE_PARSED,
            "full_name": '<script>alert("XSS")</script>',
            "summary": "<img src=x onerror=alert(1)>",
        }
        injector = TemplateInjector()
        html = injector.inject("aurora", xss_data, self.SAMPLE_ENHANCED)
        # Raw <script> tag should NOT appear in output — it must be escaped
        assert '<script>alert("XSS")</script>' not in html
        assert "<img src=x onerror=alert(1)>" not in html

    def test_render_uses_enhanced_fields_over_parsed(self):
        """Enhanced fields should override parsed fields in the template context."""
        injector = TemplateInjector()
        html = injector.inject("aurora", self.SAMPLE_PARSED, self.SAMPLE_ENHANCED)
        # Enhanced tagline should appear (not overridden by parsed summary)
        assert "Building full-stack products users love" in html

    def test_invalid_template_raises_value_error(self):
        injector = TemplateInjector()
        with pytest.raises(ValueError, match="not found"):
            injector.inject("nonexistent_template", self.SAMPLE_PARSED, self.SAMPLE_ENHANCED)


# ── _normalise helper ─────────────────────────────────────────────────────────

class TestNormalise:
    def test_passes_through_dict(self):
        d = {"key": "value", "num": 42}
        assert _normalise(d) == d

    def test_passes_through_list(self):
        lst = [1, 2, 3]
        assert _normalise(lst) == lst

    def test_normalises_pydantic_model(self):
        from app.services.resume_parser import ResumeData
        model = ResumeData(full_name="Test", skills=["Python"])
        result = _normalise(model)
        assert isinstance(result, dict)
        assert result["full_name"] == "Test"
        assert result["skills"] == ["Python"]

    def test_normalises_nested_structures(self):
        nested = {"items": [{"a": 1}, {"b": 2}]}
        result = _normalise(nested)
        assert result == {"items": [{"a": 1}, {"b": 2}]}
