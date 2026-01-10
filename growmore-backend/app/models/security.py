"""Security Models for Device Tracking and Sessions."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class UserSession(BaseModel):
    """User session model."""

    id: UUID
    user_id: UUID
    session_token: str
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location: Optional[str] = None
    is_active: bool = True
    last_activity: datetime
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class UserDevice(BaseModel):
    """User device model."""

    id: UUID
    user_id: UUID
    device_id: str  # Fingerprint or unique ID
    device_name: Optional[str] = None
    device_type: Optional[str] = None  # mobile, desktop, tablet
    browser: Optional[str] = None
    os: Optional[str] = None
    is_trusted: bool = False
    last_ip: Optional[str] = None
    last_location: Optional[str] = None
    last_used: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class LoginHistory(BaseModel):
    """Login history model."""

    id: UUID
    user_id: UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_id: Optional[str] = None
    location: Optional[str] = None
    status: str  # success, failed, blocked
    failure_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SecurityEvent(BaseModel):
    """Security event model."""

    id: UUID
    user_id: Optional[UUID] = None
    event_type: str  # login, logout, password_change, suspicious_activity, etc.
    severity: str = "info"  # info, warning, critical
    description: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True
