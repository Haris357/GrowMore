"""Newsletter Models."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr


class NewsletterSubscription(BaseModel):
    """Newsletter subscription model."""

    id: UUID
    email: EmailStr
    user_id: Optional[UUID] = None
    is_active: bool = True
    subscribed_at: datetime
    unsubscribed_at: Optional[datetime] = None
    preferences: Optional[dict] = None
    source: Optional[str] = None  # signup, manual, import
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Newsletter(BaseModel):
    """Newsletter model."""

    id: UUID
    title: str
    subject: str
    content: str  # HTML content
    preview_text: Optional[str] = None
    status: str = "draft"  # draft, scheduled, sending, sent, cancelled
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    total_recipients: int = 0
    sent_count: int = 0
    opened_count: int = 0
    clicked_count: int = 0
    failed_count: int = 0
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NewsletterQueue(BaseModel):
    """Newsletter queue item model."""

    id: UUID
    newsletter_id: UUID
    subscriber_email: str
    status: str = "pending"  # pending, sent, failed
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    attempts: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class NewsletterTemplate(BaseModel):
    """Newsletter template model."""

    id: UUID
    name: str
    description: Optional[str] = None
    html_content: str
    variables: Optional[List[str]] = None  # List of template variables
    is_active: bool = True
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
