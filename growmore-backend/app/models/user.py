from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserPreferences(BaseModel):
    theme: str = "light"
    notifications_enabled: bool = True
    email_notifications: bool = True
    default_currency: str = "PKR"
    language: str = "en"


class User(BaseModel):
    id: UUID
    firebase_uid: str
    email: EmailStr
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    auth_provider: str
    preferred_market_id: Optional[UUID] = None
    preferences: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    firebase_uid: str
    email: EmailStr
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    auth_provider: str
    preferred_market_id: Optional[UUID] = None
    preferences: Dict[str, Any] = Field(default_factory=dict)


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    preferred_market_id: Optional[UUID] = None
    preferences: Optional[Dict[str, Any]] = None
