"""Security Schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


# ==================== Session Schemas ====================

class SessionResponse(BaseModel):
    """User session response."""

    id: UUID
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    is_current: bool = False
    last_activity: datetime
    created_at: datetime


class SessionListResponse(BaseModel):
    """List of active sessions."""

    sessions: List[SessionResponse]
    total: int


# ==================== Device Schemas ====================

class DeviceResponse(BaseModel):
    """User device response."""

    id: UUID
    device_id: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    is_trusted: bool
    last_ip: Optional[str] = None
    last_location: Optional[str] = None
    last_used: datetime
    created_at: datetime


class DeviceListResponse(BaseModel):
    """List of user devices."""

    devices: List[DeviceResponse]
    total: int


class TrustDeviceRequest(BaseModel):
    """Request to trust/untrust a device."""

    device_id: str
    trust: bool = True
    device_name: Optional[str] = None


# ==================== Login History Schemas ====================

class LoginHistoryResponse(BaseModel):
    """Login history entry."""

    id: UUID
    ip_address: Optional[str] = None
    location: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    status: str
    failure_reason: Optional[str] = None
    created_at: datetime


class LoginHistoryListResponse(BaseModel):
    """List of login history."""

    history: List[LoginHistoryResponse]
    total: int
    page: int
    page_size: int


# ==================== Security Event Schemas ====================

class SecurityEventResponse(BaseModel):
    """Security event response."""

    id: UUID
    event_type: str
    severity: str
    description: str
    ip_address: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime


class SecurityEventListResponse(BaseModel):
    """List of security events."""

    events: List[SecurityEventResponse]
    total: int
    page: int
    page_size: int


# ==================== Security Settings Schemas ====================

class SecuritySettingsResponse(BaseModel):
    """User security settings."""

    two_factor_enabled: bool = False
    login_alerts_enabled: bool = True
    new_device_alerts_enabled: bool = True
    trusted_devices_count: int = 0
    active_sessions_count: int = 0
    last_password_change: Optional[datetime] = None


class SecuritySettingsUpdate(BaseModel):
    """Update security settings."""

    login_alerts_enabled: Optional[bool] = None
    new_device_alerts_enabled: Optional[bool] = None


# ==================== Device Info Schemas ====================

class DeviceInfo(BaseModel):
    """Device information from request."""

    device_id: Optional[str] = None
    device_type: Optional[str] = None  # mobile, desktop, tablet
    device_name: Optional[str] = None
    browser: Optional[str] = None
    browser_version: Optional[str] = None
    os: Optional[str] = None
    os_version: Optional[str] = None
    user_agent: Optional[str] = None
