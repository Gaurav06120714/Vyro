"""Centralised enums for VyroPortify.

All status/plan/template string constants must live here.
Import these everywhere raw strings like "pending", "free", "aurora" were used.
"""

from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class Plan(str, Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class TemplateID(str, Enum):
    AURORA = "aurora"
    MINIMAL = "minimal"
    CYBER = "cyber"
    EXECUTIVE = "executive"


class ResumeStatus(str, Enum):
    UPLOADED = "pending"      # created, not yet parsed
    PARSING = "processing"    # Celery task running
    PARSED = "done"           # successfully parsed
    FAILED = "failed"         # parse failed


class PortfolioStatus(str, Enum):
    DRAFT = "draft"
    QUEUED = "queued"
    GENERATING = "generating"
    PUBLISHED = "published"
    FAILED = "failed"
    ARCHIVED = "archived"
