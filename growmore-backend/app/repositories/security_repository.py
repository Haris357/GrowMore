"""Security Repository for Sessions, Devices, and Events."""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from supabase import Client


class SessionRepository:
    """Repository for user sessions."""

    def __init__(self, db: Client):
        self.db = db
        self.table = "user_sessions"

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new session."""
        data["created_at"] = datetime.utcnow().isoformat()
        data["last_activity"] = datetime.utcnow().isoformat()
        result = self.db.table(self.table).insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_by_token(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Get session by token."""
        result = self.db.table(self.table).select("*").eq(
            "session_token", session_token
        ).eq("is_active", True).execute()
        return result.data[0] if result.data else None

    async def get_user_sessions(
        self,
        user_id: str,
        active_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """Get all sessions for a user."""
        query = self.db.table(self.table).select("*").eq("user_id", user_id)
        if active_only:
            query = query.eq("is_active", True)
        result = query.order("last_activity", desc=True).execute()
        return result.data or []

    async def update_activity(self, session_id: str) -> Dict[str, Any]:
        """Update session last activity."""
        result = self.db.table(self.table).update({
            "last_activity": datetime.utcnow().isoformat(),
        }).eq("id", session_id).execute()
        return result.data[0] if result.data else {}

    async def invalidate(self, session_id: str) -> bool:
        """Invalidate a session."""
        result = self.db.table(self.table).update({
            "is_active": False,
        }).eq("id", session_id).execute()
        return len(result.data or []) > 0

    async def invalidate_all_except(
        self,
        user_id: str,
        current_session_id: str,
    ) -> int:
        """Invalidate all sessions except current one."""
        result = self.db.table(self.table).update({
            "is_active": False,
        }).eq("user_id", user_id).neq("id", current_session_id).execute()
        return len(result.data or [])

    async def invalidate_all(self, user_id: str) -> int:
        """Invalidate all sessions for a user."""
        result = self.db.table(self.table).update({
            "is_active": False,
        }).eq("user_id", user_id).execute()
        return len(result.data or [])

    async def cleanup_expired(self) -> int:
        """Clean up expired sessions."""
        now = datetime.utcnow().isoformat()
        result = self.db.table(self.table).delete().lt("expires_at", now).execute()
        return len(result.data or [])

    async def count_active(self, user_id: str) -> int:
        """Count active sessions for a user."""
        result = self.db.table(self.table).select(
            "*", count="exact"
        ).eq("user_id", user_id).eq("is_active", True).execute()
        return result.count or 0


class DeviceRepository:
    """Repository for user devices."""

    def __init__(self, db: Client):
        self.db = db
        self.table = "user_devices"

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create/register a new device."""
        data["created_at"] = datetime.utcnow().isoformat()
        data["last_used"] = datetime.utcnow().isoformat()
        result = self.db.table(self.table).insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_by_device_id(
        self,
        user_id: str,
        device_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Get device by device ID."""
        result = self.db.table(self.table).select("*").eq(
            "user_id", user_id
        ).eq("device_id", device_id).execute()
        return result.data[0] if result.data else None

    async def get_user_devices(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all devices for a user."""
        result = self.db.table(self.table).select("*").eq(
            "user_id", user_id
        ).order("last_used", desc=True).execute()
        return result.data or []

    async def update(self, device_db_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update device."""
        result = self.db.table(self.table).update(data).eq("id", device_db_id).execute()
        return result.data[0] if result.data else {}

    async def update_last_used(
        self,
        device_db_id: str,
        ip_address: Optional[str] = None,
        location: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update device last used time and IP."""
        data = {"last_used": datetime.utcnow().isoformat()}
        if ip_address:
            data["last_ip"] = ip_address
        if location:
            data["last_location"] = location
        return await self.update(device_db_id, data)

    async def set_trusted(
        self,
        device_db_id: str,
        trusted: bool,
        device_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Set device trust status."""
        data = {"is_trusted": trusted}
        if device_name:
            data["device_name"] = device_name
        return await self.update(device_db_id, data)

    async def delete(self, device_db_id: str) -> bool:
        """Delete/remove a device."""
        result = self.db.table(self.table).delete().eq("id", device_db_id).execute()
        return len(result.data or []) > 0

    async def count_trusted(self, user_id: str) -> int:
        """Count trusted devices for a user."""
        result = self.db.table(self.table).select(
            "*", count="exact"
        ).eq("user_id", user_id).eq("is_trusted", True).execute()
        return result.count or 0


class LoginHistoryRepository:
    """Repository for login history."""

    def __init__(self, db: Client):
        self.db = db
        self.table = "login_history"

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Record a login attempt."""
        data["created_at"] = datetime.utcnow().isoformat()
        result = self.db.table(self.table).insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_user_history(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get login history for a user."""
        offset = (page - 1) * page_size

        query = self.db.table(self.table).select("*", count="exact").eq("user_id", user_id)
        if status:
            query = query.eq("status", status)

        count_result = query.execute()
        total = count_result.count or 0

        query = self.db.table(self.table).select("*").eq("user_id", user_id)
        if status:
            query = query.eq("status", status)

        result = query.order("created_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "history": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_recent_failed(
        self,
        user_id: str,
        minutes: int = 30,
    ) -> List[Dict[str, Any]]:
        """Get recent failed login attempts."""
        since = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
        result = self.db.table(self.table).select("*").eq(
            "user_id", user_id
        ).eq("status", "failed").gte("created_at", since).execute()
        return result.data or []

    async def get_last_successful(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get last successful login."""
        result = self.db.table(self.table).select("*").eq(
            "user_id", user_id
        ).eq("status", "success").order("created_at", desc=True).limit(1).execute()
        return result.data[0] if result.data else None


class SecurityEventRepository:
    """Repository for security events."""

    def __init__(self, db: Client):
        self.db = db
        self.table = "security_events"

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Record a security event."""
        data["created_at"] = datetime.utcnow().isoformat()
        result = self.db.table(self.table).insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_user_events(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        event_type: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get security events for a user."""
        offset = (page - 1) * page_size

        query = self.db.table(self.table).select("*", count="exact").eq("user_id", user_id)
        if event_type:
            query = query.eq("event_type", event_type)
        if severity:
            query = query.eq("severity", severity)

        count_result = query.execute()
        total = count_result.count or 0

        query = self.db.table(self.table).select("*").eq("user_id", user_id)
        if event_type:
            query = query.eq("event_type", event_type)
        if severity:
            query = query.eq("severity", severity)

        result = query.order("created_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "events": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_all_events(
        self,
        page: int = 1,
        page_size: int = 50,
        severity: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get all security events (for admin)."""
        offset = (page - 1) * page_size

        query = self.db.table(self.table).select("*", count="exact")
        if severity:
            query = query.eq("severity", severity)

        count_result = query.execute()
        total = count_result.count or 0

        query = self.db.table(self.table).select("*")
        if severity:
            query = query.eq("severity", severity)

        result = query.order("created_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "events": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
