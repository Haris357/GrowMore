"""Logging Models."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class APILog(BaseModel):
    """API request/response log model."""

    id: UUID
    method: str
    path: str
    status_code: int
    request_body: Optional[dict] = None
    response_body: Optional[dict] = None
    user_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    duration_ms: int
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ErrorLog(BaseModel):
    """Application error log model."""

    id: UUID
    error_type: str
    error_message: str
    stack_trace: Optional[str] = None
    endpoint: Optional[str] = None
    user_id: Optional[UUID] = None
    request_data: Optional[dict] = None
    severity: str = "error"  # error, warning, critical
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLog(BaseModel):
    """Audit trail log model."""

    id: UUID
    user_id: UUID
    action: str  # create, update, delete, view
    entity_type: str  # portfolio, watchlist, alert, etc.
    entity_id: Optional[str] = None
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ScraperLog(BaseModel):
    """Scraper execution log model."""

    id: UUID
    scraper_name: str
    status: str  # started, completed, failed
    records_processed: int = 0
    records_created: int = 0
    records_updated: int = 0
    records_failed: int = 0
    error_message: Optional[str] = None
    duration_ms: int = 0
    metadata: Optional[dict] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AILog(BaseModel):
    """AI service usage log model."""

    id: UUID
    service: str  # openai, gemini, etc.
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_estimate: Optional[float] = None
    user_id: Optional[UUID] = None
    feature: Optional[str] = None  # sentiment, summary, recommendation
    success: bool = True
    error_message: Optional[str] = None
    duration_ms: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class JobLog(BaseModel):
    """Background job execution log model."""

    id: UUID
    job_name: str
    job_type: str  # scheduled, manual, triggered
    status: str  # queued, running, completed, failed
    parameters: Optional[dict] = None
    result: Optional[dict] = None
    error_message: Optional[str] = None
    duration_ms: int = 0
    retry_count: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
