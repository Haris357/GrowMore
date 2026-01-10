from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class TokenVerifyRequest(BaseModel):
    token: str = Field(..., min_length=1)


class TokenVerifyResponse(BaseModel):
    user: "UserResponse"
    is_new_user: bool


class UserCreate(BaseModel):
    firebase_uid: str
    email: EmailStr
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    auth_provider: str


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    photo_url: Optional[str] = None
    preferred_market_id: Optional[UUID] = None


class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = Field(None, pattern="^(light|dark|system)$")
    notifications_enabled: Optional[bool] = None
    email_notifications: Optional[bool] = None
    default_currency: Optional[str] = Field(None, max_length=10)
    language: Optional[str] = Field(None, max_length=10)


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    auth_provider: str
    preferred_market_id: Optional[UUID] = None
    preferences: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


TokenVerifyResponse.model_rebuild()
