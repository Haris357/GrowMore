"""Security Service for Device Tracking, Sessions, and Events."""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from user_agents import parse as parse_user_agent

from app.db.supabase import get_supabase_service_client
from app.email.sender import email_sender
from app.repositories.security_repository import (
    SessionRepository,
    DeviceRepository,
    LoginHistoryRepository,
    SecurityEventRepository,
)

logger = logging.getLogger(__name__)


class SecurityService:
    """Service for security features and device tracking."""

    def __init__(self):
        self.db = get_supabase_service_client()
        self.session_repo = SessionRepository(self.db)
        self.device_repo = DeviceRepository(self.db)
        self.login_history_repo = LoginHistoryRepository(self.db)
        self.event_repo = SecurityEventRepository(self.db)

    # ==================== Device Management ====================

    def parse_user_agent(self, user_agent: str) -> Dict[str, Any]:
        """Parse user agent string to extract device info."""
        try:
            ua = parse_user_agent(user_agent)
            return {
                "browser": f"{ua.browser.family} {ua.browser.version_string}",
                "os": f"{ua.os.family} {ua.os.version_string}",
                "device_type": "mobile" if ua.is_mobile else "tablet" if ua.is_tablet else "desktop",
                "device_name": ua.device.family if ua.device.family != "Other" else None,
            }
        except Exception:
            return {
                "browser": "Unknown",
                "os": "Unknown",
                "device_type": "desktop",
                "device_name": None,
            }

    def generate_device_id(
        self,
        user_id: str,
        user_agent: str,
        additional_data: Optional[str] = None,
    ) -> str:
        """Generate a device fingerprint."""
        data = f"{user_id}:{user_agent}"
        if additional_data:
            data += f":{additional_data}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]

    async def register_device(
        self,
        user_id: str,
        device_id: str,
        user_agent: str,
        ip_address: Optional[str] = None,
        location: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Register or update a device for a user.

        Returns device info and whether it's a new device.
        """
        # Check if device exists
        existing = await self.device_repo.get_by_device_id(user_id, device_id)

        if existing:
            # Update last used
            await self.device_repo.update_last_used(
                existing["id"],
                ip_address,
                location,
            )
            return {"device": existing, "is_new": False}

        # Parse user agent
        ua_info = self.parse_user_agent(user_agent)

        # Create new device
        device = await self.device_repo.create({
            "user_id": user_id,
            "device_id": device_id,
            "device_name": ua_info.get("device_name"),
            "device_type": ua_info.get("device_type"),
            "browser": ua_info.get("browser"),
            "os": ua_info.get("os"),
            "is_trusted": False,
            "last_ip": ip_address,
            "last_location": location,
        })

        return {"device": device, "is_new": True}

    async def get_user_devices(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all devices for a user."""
        return await self.device_repo.get_user_devices(user_id)

    async def trust_device(
        self,
        user_id: str,
        device_id: str,
        trust: bool = True,
        device_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Set device trust status."""
        device = await self.device_repo.get_by_device_id(user_id, device_id)
        if not device:
            return {"error": "Device not found"}

        await self.device_repo.set_trusted(device["id"], trust, device_name)

        # Log event
        await self.log_event(
            user_id=user_id,
            event_type="device_trusted" if trust else "device_untrusted",
            description=f"Device {'trusted' if trust else 'untrusted'}: {device_id[:8]}...",
            severity="info",
        )

        return {"success": True, "trusted": trust}

    async def remove_device(self, user_id: str, device_id: str) -> Dict[str, Any]:
        """Remove a device."""
        device = await self.device_repo.get_by_device_id(user_id, device_id)
        if not device:
            return {"error": "Device not found"}

        # Invalidate sessions for this device
        sessions = await self.session_repo.get_user_sessions(user_id)
        for session in sessions:
            if session.get("device_id") == device_id:
                await self.session_repo.invalidate(session["id"])

        # Delete device
        await self.device_repo.delete(device["id"])

        # Log event
        await self.log_event(
            user_id=user_id,
            event_type="device_removed",
            description=f"Device removed: {device_id[:8]}...",
            severity="info",
        )

        return {"success": True}

    # ==================== Session Management ====================

    async def create_session(
        self,
        user_id: str,
        device_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        location: Optional[str] = None,
        expires_in_days: int = 30,
    ) -> Dict[str, Any]:
        """Create a new session."""
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

        session = await self.session_repo.create({
            "user_id": user_id,
            "session_token": session_token,
            "device_id": device_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "location": location,
            "is_active": True,
            "expires_at": expires_at.isoformat(),
        })

        return session

    async def validate_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Validate and refresh session."""
        session = await self.session_repo.get_by_token(session_token)
        if not session:
            return None

        # Check expiry
        expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
        if expires_at.replace(tzinfo=None) < datetime.utcnow():
            await self.session_repo.invalidate(session["id"])
            return None

        # Update activity
        await self.session_repo.update_activity(session["id"])
        return session

    async def get_user_sessions(
        self,
        user_id: str,
        current_session_token: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get all active sessions for a user."""
        sessions = await self.session_repo.get_user_sessions(user_id)

        # Mark current session
        for session in sessions:
            session["is_current"] = session.get("session_token") == current_session_token
            # Parse user agent for display
            if session.get("user_agent"):
                ua_info = self.parse_user_agent(session["user_agent"])
                session["device_type"] = ua_info.get("device_type")
                session["browser"] = ua_info.get("browser")
                session["device_name"] = ua_info.get("device_name")

        return sessions

    async def revoke_session(
        self,
        user_id: str,
        session_id: str,
        current_session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Revoke a specific session."""
        if session_id == current_session_id:
            return {"error": "Cannot revoke current session"}

        sessions = await self.session_repo.get_user_sessions(user_id)
        session = next((s for s in sessions if s["id"] == session_id), None)

        if not session:
            return {"error": "Session not found"}

        await self.session_repo.invalidate(session_id)

        await self.log_event(
            user_id=user_id,
            event_type="session_revoked",
            description="Session manually revoked",
            severity="info",
        )

        return {"success": True}

    async def revoke_all_sessions(
        self,
        user_id: str,
        except_current: bool = True,
        current_session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Revoke all sessions for a user."""
        if except_current and current_session_id:
            count = await self.session_repo.invalidate_all_except(user_id, current_session_id)
        else:
            count = await self.session_repo.invalidate_all(user_id)

        await self.log_event(
            user_id=user_id,
            event_type="all_sessions_revoked",
            description=f"Revoked {count} sessions",
            severity="warning",
        )

        return {"success": True, "revoked_count": count}

    # ==================== Login History ====================

    async def record_login(
        self,
        user_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_id: Optional[str] = None,
        location: Optional[str] = None,
        status: str = "success",
        failure_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Record a login attempt."""
        record = await self.login_history_repo.create({
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "device_id": device_id,
            "location": location,
            "status": status,
            "failure_reason": failure_reason,
        })

        # Log security event
        if status == "success":
            await self.log_event(
                user_id=user_id,
                event_type="login_success",
                description=f"Successful login from {ip_address or 'unknown'}",
                ip_address=ip_address,
                user_agent=user_agent,
                severity="info",
            )
        else:
            await self.log_event(
                user_id=user_id,
                event_type="login_failed",
                description=f"Failed login: {failure_reason or 'unknown'}",
                ip_address=ip_address,
                user_agent=user_agent,
                severity="warning",
            )

        return record

    async def get_login_history(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Get login history for a user."""
        result = await self.login_history_repo.get_user_history(user_id, page, page_size)

        # Parse user agents
        for entry in result.get("history", []):
            if entry.get("user_agent"):
                ua_info = self.parse_user_agent(entry["user_agent"])
                entry["device_type"] = ua_info.get("device_type")
                entry["browser"] = ua_info.get("browser")

        return result

    async def check_suspicious_activity(self, user_id: str) -> Dict[str, Any]:
        """Check for suspicious login activity."""
        # Check recent failed attempts
        failed = await self.login_history_repo.get_recent_failed(user_id, minutes=30)

        suspicious = False
        reasons = []

        if len(failed) >= 5:
            suspicious = True
            reasons.append(f"{len(failed)} failed login attempts in last 30 minutes")

        # Check for login from new location (simplified)
        last_success = await self.login_history_repo.get_last_successful(user_id)
        if last_success:
            # Could add location comparison here
            pass

        return {
            "suspicious": suspicious,
            "reasons": reasons,
            "failed_attempts": len(failed),
        }

    # ==================== Security Events ====================

    async def log_event(
        self,
        user_id: Optional[str],
        event_type: str,
        description: str,
        severity: str = "info",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """Log a security event."""
        return await self.event_repo.create({
            "user_id": user_id,
            "event_type": event_type,
            "description": description,
            "severity": severity,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "metadata": metadata,
        })

    async def get_security_events(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        event_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get security events for a user."""
        return await self.event_repo.get_user_events(
            user_id, page, page_size, event_type
        )

    # ==================== Security Notifications ====================

    async def notify_new_login(
        self,
        user: Dict[str, Any],
        device_info: Dict[str, Any],
        ip_address: str,
        location: str,
        is_new_device: bool = False,
    ):
        """Send notification for new login."""
        try:
            # Check user preferences
            prefs = user.get("notification_preferences", {})
            if not prefs.get("login_alerts", True):
                return

            if is_new_device:
                await email_sender.send_new_device_alert(
                    user=user,
                    device_info={
                        **device_info,
                        "ip_address": ip_address,
                        "location": location,
                    },
                )
            else:
                await email_sender.send_login_alert(
                    user=user,
                    device_info=device_info,
                    ip_address=ip_address,
                    location=location,
                )
        except Exception as e:
            logger.error(f"Failed to send login notification: {e}")

    async def notify_password_changed(self, user: Dict[str, Any]):
        """Send notification for password change."""
        try:
            await email_sender.send_password_changed(user)
        except Exception as e:
            logger.error(f"Failed to send password change notification: {e}")

    # ==================== Security Settings ====================

    async def get_security_settings(self, user_id: str) -> Dict[str, Any]:
        """Get user security settings summary."""
        trusted_count = await self.device_repo.count_trusted(user_id)
        sessions_count = await self.session_repo.count_active(user_id)

        # Get user for preferences
        result = self.db.table("users").select(
            "notification_preferences, updated_at"
        ).eq("id", user_id).execute()
        profile = result.data[0] if result.data else {}

        prefs = profile.get("notification_preferences", {})

        return {
            "two_factor_enabled": False,  # Placeholder for future
            "login_alerts_enabled": prefs.get("login_alerts", True),
            "new_device_alerts_enabled": prefs.get("new_device_alerts", True),
            "trusted_devices_count": trusted_count,
            "active_sessions_count": sessions_count,
            "last_password_change": profile.get("updated_at"),
        }

    async def update_security_settings(
        self,
        user_id: str,
        settings: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update user security settings."""
        # Get current preferences
        result = self.db.table("users").select(
            "notification_preferences"
        ).eq("id", user_id).execute()

        current_prefs = {}
        if result.data:
            current_prefs = result.data[0].get("notification_preferences", {}) or {}

        # Update preferences
        if "login_alerts_enabled" in settings:
            current_prefs["login_alerts"] = settings["login_alerts_enabled"]
        if "new_device_alerts_enabled" in settings:
            current_prefs["new_device_alerts"] = settings["new_device_alerts_enabled"]

        # Save
        self.db.table("users").update({
            "notification_preferences": current_prefs,
        }).eq("id", user_id).execute()

        return {"success": True, "preferences": current_prefs}
