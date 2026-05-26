"""Unit tests for the resume parser service."""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.resume_parser import (
    ResumeData,
    ResumeParseError,
    TextExtractionError,
    extract_text_from_pdf,
    parse_resume_with_claude,
)

# ── Fixtures ────────────────────────────────────────────────────────────────────

SAMPLE_RESUME_TEXT = """
John Smith
john.smith@example.com | (555) 123-4567 | San Francisco, CA
https://linkedin.com/in/johnsmith | https://github.com/johnsmith

SUMMARY
Senior software engineer with 8 years of experience building scalable web applications.

WORK EXPERIENCE
Senior Software Engineer — Acme Corp (Jan 2020 – Present)
San Francisco, CA
• Led backend development for the core API serving 10M+ requests/day
• Reduced p99 latency by 40% through query optimization and caching
• Mentored a team of 5 junior engineers

Software Engineer — StartupXYZ (Jun 2017 – Dec 2019)
• Built microservices in Python and Go
• Deployed containerized workloads on Kubernetes

EDUCATION
University of California, Berkeley
B.S. Computer Science | 2017 | GPA: 3.8

SKILLS
Python, Go, TypeScript, React, PostgreSQL, Redis, AWS, Docker, Kubernetes

CERTIFICATIONS
AWS Solutions Architect – Associate
"""

SAMPLE_PARSED_JSON = {
    "full_name": "John Smith",
    "email": "john.smith@example.com",
    "phone": "(555) 123-4567",
    "location": "San Francisco, CA",
    "linkedin_url": "https://linkedin.com/in/johnsmith",
    "github_url": "https://github.com/johnsmith",
    "portfolio_url": None,
    "summary": "Senior software engineer with 8 years of experience building scalable web applications.",
    "work_experience": [
        {
            "company": "Acme Corp",
            "title": "Senior Software Engineer",
            "start_date": "Jan 2020",
            "end_date": "Present",
            "location": "San Francisco, CA",
            "description": [
                "Led backend development for the core API serving 10M+ requests/day",
                "Reduced p99 latency by 40% through query optimization and caching",
                "Mentored a team of 5 junior engineers",
            ],
        },
        {
            "company": "StartupXYZ",
            "title": "Software Engineer",
            "start_date": "Jun 2017",
            "end_date": "Dec 2019",
            "location": None,
            "description": [
                "Built microservices in Python and Go",
                "Deployed containerized workloads on Kubernetes",
            ],
        },
    ],
    "education": [
        {
            "institution": "University of California, Berkeley",
            "degree": "Bachelor of Science",
            "field": "Computer Science",
            "graduation_year": "2017",
            "gpa": "3.8",
        }
    ],
    "skills": ["Python", "Go", "TypeScript", "React", "PostgreSQL", "Redis", "AWS", "Docker", "Kubernetes"],
    "projects": [],
    "certifications": ["AWS Solutions Architect – Associate"],
    "languages": [],
}


def _make_mock_response(content: str) -> MagicMock:
    """Build a mock anthropic message response."""
    block = MagicMock()
    block.text = content
    response = MagicMock()
    response.content = [block]
    return response


# ── Test 1: parse_resume_with_claude returns ResumeData on success ──────────────

def test_parse_resume_success():
    with patch("app.services.resume_parser.anthropic.Anthropic") as MockAnthropic:
        mock_client = MagicMock()
        MockAnthropic.return_value = mock_client
        mock_client.messages.create.return_value = _make_mock_response(
            json.dumps(SAMPLE_PARSED_JSON)
        )

        result = parse_resume_with_claude(SAMPLE_RESUME_TEXT)

    assert isinstance(result, ResumeData)
    assert result.full_name == "John Smith"
    assert result.email == "john.smith@example.com"
    assert result.phone == "(555) 123-4567"
    assert len(result.work_experience) == 2
    assert result.work_experience[0].company == "Acme Corp"
    assert len(result.skills) == 9
    assert "AWS Solutions Architect – Associate" in result.certifications


# ── Test 2: retry logic — succeeds on 3rd attempt ─────────────────────────────

def test_parse_resume_retries_and_succeeds():
    import anthropic as anthropic_lib

    with patch("app.services.resume_parser.anthropic.Anthropic") as MockAnthropic:
        with patch("app.services.resume_parser.time.sleep"):  # no actual sleeping
            mock_client = MagicMock()
            MockAnthropic.return_value = mock_client
            mock_client.messages.create.side_effect = [
                anthropic_lib.APIError(message="rate limit", request=MagicMock(), body={}),
                anthropic_lib.APIError(message="rate limit", request=MagicMock(), body={}),
                _make_mock_response(json.dumps(SAMPLE_PARSED_JSON)),
            ]

            result = parse_resume_with_claude(SAMPLE_RESUME_TEXT)

    assert result.full_name == "John Smith"
    assert mock_client.messages.create.call_count == 3


# ── Test 3: raises ResumeParseError after 3 failures ──────────────────────────

def test_parse_resume_raises_after_max_retries():
    import anthropic as anthropic_lib

    with patch("app.services.resume_parser.anthropic.Anthropic") as MockAnthropic:
        with patch("app.services.resume_parser.time.sleep"):
            mock_client = MagicMock()
            MockAnthropic.return_value = mock_client
            mock_client.messages.create.side_effect = anthropic_lib.APIError(
                message="server error", request=MagicMock(), body={}
            )

            with pytest.raises(ResumeParseError, match="Failed to parse resume after 3 attempts"):
                parse_resume_with_claude(SAMPLE_RESUME_TEXT)

    assert mock_client.messages.create.call_count == 3


# ── Test 4: extract_text_from_pdf raises on empty output ──────────────────────

def test_extract_text_from_pdf_empty_raises():
    mock_page = MagicMock()
    mock_page.extract_text.return_value = ""

    mock_pdf = MagicMock()
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)
    mock_pdf.pages = [mock_page]

    with patch("app.services.resume_parser.pdfplumber") as mock_pdfplumber:
        mock_pdfplumber.open.return_value = mock_pdf

        with pytest.raises(TextExtractionError, match="no extractable text"):
            extract_text_from_pdf(b"fake pdf bytes")


# ── Test 5: ResumeData model handles missing optional fields gracefully ─────────

def test_resume_data_partial_json():
    """ResumeData should accept partial data with defaults for optional fields."""
    minimal = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
    }
    result = ResumeData(**minimal)

    assert result.full_name == "Jane Doe"
    assert result.email == "jane@example.com"
    assert result.phone is None
    assert result.work_experience == []
    assert result.skills == []
    assert result.certifications == []
