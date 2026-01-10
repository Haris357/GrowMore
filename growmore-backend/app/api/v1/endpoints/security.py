"""Security API Endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.security import (
    SessionListResponse,
    DeviceListResponse,
    TrustDeviceRequest,
    LoginHistoryListResponse,
    SecurityEventListResponse,
    SecuritySettingsResponse,
    SecuritySettingsUpdate,
)
from app.services.security_service import SecurityService

router = APIRouter()


def get_security_service():
    """Get security service instance."""
    return SecurityService()


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ==================== Sessions ====================

@router.get("/sessions", response_model=SessionListResponse)
async def get_active_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Get all active sessions.

    Returns list of active sessions with device info.
    Current session is marked.
    """
    service = get_security_service()

    # Get session token from header if available
    auth_header = request.headers.get("Authorization", "")
    session_token = auth_header.replace("Bearer ", "") if auth_header else None

    sessions = await service.get_user_sessions(
        current_user.firebase_uid,
        current_session_token=session_token,
    )

    return {
        "sessions": sessions,
        "total": len(sessions),
    }


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Revoke a specific session.

    Cannot revoke the current session.
    """
    service = get_security_service()

    # Get current session ID
    auth_header = request.headers.get("Authorization", "")
    current_token = auth_header.replace("Bearer ", "") if auth_header else None

    # Find current session
    sessions = await service.get_user_sessions(current_user.firebase_uid)
    current_session = next(
        (s for s in sessions if s.get("session_token") == current_token),
        None
    )
    current_session_id = current_session["id"] if current_session else None

    result = await service.revoke_session(
        current_user.firebase_uid,
        session_id,
        current_session_id,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"message": "Session revoked"}


@router.delete("/sessions")
async def revoke_all_sessions(
    request: Request,
    except_current: bool = Query(default=True),
    current_user: User = Depends(get_current_user),
):
    """
    Revoke all sessions.

    By default, keeps the current session active.
    """
    service = get_security_service()

    # Get current session ID
    auth_header = request.headers.get("Authorization", "")
    current_token = auth_header.replace("Bearer ", "") if auth_header else None

    sessions = await service.get_user_sessions(current_user.firebase_uid)
    current_session = next(
        (s for s in sessions if s.get("session_token") == current_token),
        None
    )
    current_session_id = current_session["id"] if current_session else None

    result = await service.revoke_all_sessions(
        current_user.firebase_uid,
        except_current,
        current_session_id,
    )

    return {"message": f"Revoked {result['revoked_count']} sessions"}


# ==================== Devices ====================

@router.get("/devices", response_model=DeviceListResponse)
async def get_user_devices(
    current_user: User = Depends(get_current_user),
):
    """
    Get all registered devices.

    Returns list of devices with trust status.
    """
    service = get_security_service()
    devices = await service.get_user_devices(current_user.firebase_uid)

    return {
        "devices": devices,
        "total": len(devices),
    }


@router.post("/devices/trust")
async def trust_device(
    data: TrustDeviceRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Trust or untrust a device.

    Trusted devices may have reduced security prompts.
    """
    service = get_security_service()

    result = await service.trust_device(
        current_user.firebase_uid,
        data.device_id,
        data.trust,
        data.device_name,
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    status_msg = "trusted" if data.trust else "untrusted"
    return {"message": f"Device {status_msg}"}


@router.delete("/devices/{device_id}")
async def remove_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Remove a device.

    Also revokes all sessions from this device.
    """
    service = get_security_service()
    result = await service.remove_device(current_user.firebase_uid, device_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return {"message": "Device removed"}


# ==================== Login History ====================

@router.get("/login-history", response_model=LoginHistoryListResponse)
async def get_login_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """
    Get login history.

    Shows all login attempts with status and location.
    """
    service = get_security_service()

    result = await service.get_login_history(
        current_user.firebase_uid,
        page,
        page_size,
    )

    return result


# ==================== Security Events ====================

@router.get("/events", response_model=SecurityEventListResponse)
async def get_security_events(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    event_type: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """
    Get security events.

    Shows security-related activities on the account.
    """
    service = get_security_service()

    result = await service.get_security_events(
        current_user.firebase_uid,
        page,
        page_size,
        event_type,
    )

    return result


# ==================== Security Settings ====================

@router.get("/settings", response_model=SecuritySettingsResponse)
async def get_security_settings(
    current_user: User = Depends(get_current_user),
):
    """
    Get security settings summary.

    Shows current security configuration and stats.
    """
    service = get_security_service()
    return await service.get_security_settings(current_user.firebase_uid)


@router.put("/settings")
async def update_security_settings(
    data: SecuritySettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Update security settings.

    Configure notification preferences.
    """
    service = get_security_service()

    result = await service.update_security_settings(
        current_user.firebase_uid,
        data.model_dump(exclude_unset=True),
    )

    return {"message": "Settings updated", "preferences": result.get("preferences")}


# ==================== Activity Check ====================

@router.get("/check-activity")
async def check_suspicious_activity(
    current_user: User = Depends(get_current_user),
):
    """
    Check for suspicious activity.

    Returns warning if suspicious patterns detected.
    """
    service = get_security_service()
    return await service.check_suspicious_activity(current_user.firebase_uid)
