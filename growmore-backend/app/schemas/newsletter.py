"""Newsletter Schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ==================== Subscription Schemas ====================

class SubscriptionCreate(BaseModel):
    """Create newsletter subscription."""

    email: EmailStr
    preferences: Optional[dict] = None
    source: Optional[str] = "manual"


class SubscriptionUpdate(BaseModel):
    """Update newsletter subscription."""

    is_active: Optional[bool] = None
    preferences: Optional[dict] = None


class SubscriptionResponse(BaseModel):
    """Newsletter subscription response."""

    id: UUID
    email: str
    user_id: Optional[UUID] = None
    is_active: bool
    subscribed_at: datetime
    preferences: Optional[dict] = None
    source: Optional[str] = None


class UnsubscribeRequest(BaseModel):
    """Unsubscribe request."""

    email: EmailStr
    reason: Optional[str] = None


# ==================== Newsletter Schemas ====================

class NewsletterCreate(BaseModel):
    """Create newsletter."""

    title: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    preview_text: Optional[str] = Field(None, max_length=200)
    scheduled_at: Optional[datetime] = None


class NewsletterUpdate(BaseModel):
    """Update newsletter."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    subject: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    preview_text: Optional[str] = Field(None, max_length=200)
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None


class NewsletterResponse(BaseModel):
    """Newsletter response."""

    id: UUID
    title: str
    subject: str
    content: str
    preview_text: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    total_recipients: int = 0
    sent_count: int = 0
    opened_count: int = 0
    clicked_count: int = 0
    failed_count: int = 0
    created_at: datetime


class NewsletterListResponse(BaseModel):
    """Newsletter list response."""

    items: List[NewsletterResponse]
    total: int
    page: int
    page_size: int


class NewsletterStats(BaseModel):
    """Newsletter statistics."""

    id: UUID
    title: str
    total_recipients: int
    sent_count: int
    opened_count: int
    clicked_count: int
    failed_count: int
    open_rate: float
    click_rate: float


# ==================== Template Schemas ====================

class TemplateCreate(BaseModel):
    """Create newsletter template."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    html_content: str = Field(..., min_length=1)
    variables: Optional[List[str]] = None


class TemplateUpdate(BaseModel):
    """Update newsletter template."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    html_content: Optional[str] = Field(None, min_length=1)
    variables: Optional[List[str]] = None
    is_active: Optional[bool] = None


class TemplateResponse(BaseModel):
    """Newsletter template response."""

    id: UUID
    name: str
    description: Optional[str] = None
    html_content: str
    variables: Optional[List[str]] = None
    is_active: bool
    created_at: datetime


# ==================== Queue Schemas ====================

class QueueItemResponse(BaseModel):
    """Queue item response."""

    id: UUID
    newsletter_id: UUID
    subscriber_email: str
    status: str
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    attempts: int


class QueueStats(BaseModel):
    """Queue statistics."""

    pending: int
    sent: int
    failed: int
    total: int
