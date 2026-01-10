"""Newsletter Repository."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client


class NewsletterSubscriptionRepository:
    """Repository for newsletter subscriptions."""

    def __init__(self, db: Client):
        self.db = db
        self.table = "newsletter_subscriptions"

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new subscription."""
        data["subscribed_at"] = datetime.utcnow().isoformat()
        data["created_at"] = datetime.utcnow().isoformat()
        result = self.db.table(self.table).insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get subscription by email."""
        result = self.db.table(self.table).select("*").eq("email", email).execute()
        return result.data[0] if result.data else None

    async def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get subscription by user ID."""
        result = self.db.table(self.table).select("*").eq("user_id", user_id).execute()
        return result.data[0] if result.data else None

    async def get_active_subscribers(
        self,
        page: int = 1,
        page_size: int = 100,
    ) -> Dict[str, Any]:
        """Get all active subscribers with pagination."""
        offset = (page - 1) * page_size

        # Get total count
        count_result = self.db.table(self.table).select(
            "*", count="exact"
        ).eq("is_active", True).execute()
        total = count_result.count or 0

        # Get items
        result = self.db.table(self.table).select("*").eq(
            "is_active", True
        ).order("subscribed_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "items": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_all_active_emails(self) -> List[str]:
        """Get all active subscriber emails."""
        result = self.db.table(self.table).select("email").eq("is_active", True).execute()
        return [r["email"] for r in (result.data or [])]

    async def update(self, subscription_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update subscription."""
        data["updated_at"] = datetime.utcnow().isoformat()
        result = self.db.table(self.table).update(data).eq("id", subscription_id).execute()
        return result.data[0] if result.data else {}

    async def unsubscribe(self, email: str) -> bool:
        """Unsubscribe email."""
        result = self.db.table(self.table).update({
            "is_active": False,
            "unsubscribed_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("email", email).execute()
        return len(result.data or []) > 0

    async def resubscribe(self, email: str) -> bool:
        """Resubscribe email."""
        result = self.db.table(self.table).update({
            "is_active": True,
            "unsubscribed_at": None,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("email", email).execute()
        return len(result.data or []) > 0

    async def get_stats(self) -> Dict[str, Any]:
        """Get subscription statistics."""
        all_result = self.db.table(self.table).select("*", count="exact").execute()
        active_result = self.db.table(self.table).select(
            "*", count="exact"
        ).eq("is_active", True).execute()

        return {
            "total": all_result.count or 0,
            "active": active_result.count or 0,
            "inactive": (all_result.count or 0) - (active_result.count or 0),
        }


class NewsletterRepository:
    """Repository for newsletters."""

    def __init__(self, db: Client):
        self.db = db
        self.table = "newsletters"

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new newsletter."""
        data["created_at"] = datetime.utcnow().isoformat()
        data["status"] = data.get("status", "draft")
        result = self.db.table(self.table).insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_by_id(self, newsletter_id: str) -> Optional[Dict[str, Any]]:
        """Get newsletter by ID."""
        result = self.db.table(self.table).select("*").eq("id", newsletter_id).execute()
        return result.data[0] if result.data else None

    async def get_all(
        self,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Get all newsletters with optional filtering."""
        offset = (page - 1) * page_size

        query = self.db.table(self.table).select("*", count="exact")
        if status:
            query = query.eq("status", status)

        count_result = query.execute()
        total = count_result.count or 0

        query = self.db.table(self.table).select("*")
        if status:
            query = query.eq("status", status)

        result = query.order("created_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "items": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_scheduled(self) -> List[Dict[str, Any]]:
        """Get newsletters scheduled to be sent."""
        now = datetime.utcnow().isoformat()
        result = self.db.table(self.table).select("*").eq(
            "status", "scheduled"
        ).lte("scheduled_at", now).execute()
        return result.data or []

    async def update(self, newsletter_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update newsletter."""
        data["updated_at"] = datetime.utcnow().isoformat()
        result = self.db.table(self.table).update(data).eq("id", newsletter_id).execute()
        return result.data[0] if result.data else {}

    async def update_stats(
        self,
        newsletter_id: str,
        sent_count: int = 0,
        failed_count: int = 0,
    ) -> Dict[str, Any]:
        """Update newsletter send stats."""
        newsletter = await self.get_by_id(newsletter_id)
        if not newsletter:
            return {}

        update_data = {
            "sent_count": newsletter.get("sent_count", 0) + sent_count,
            "failed_count": newsletter.get("failed_count", 0) + failed_count,
            "updated_at": datetime.utcnow().isoformat(),
        }
        return await self.update(newsletter_id, update_data)

    async def mark_sent(self, newsletter_id: str) -> Dict[str, Any]:
        """Mark newsletter as sent."""
        return await self.update(newsletter_id, {
            "status": "sent",
            "sent_at": datetime.utcnow().isoformat(),
        })

    async def delete(self, newsletter_id: str) -> bool:
        """Delete newsletter."""
        result = self.db.table(self.table).delete().eq("id", newsletter_id).execute()
        return len(result.data or []) > 0


class NewsletterQueueRepository:
    """Repository for newsletter queue."""

    def __init__(self, db: Client):
        self.db = db
        self.table = "newsletter_queue"

    async def add_to_queue(
        self,
        newsletter_id: str,
        emails: List[str],
    ) -> int:
        """Add emails to newsletter queue."""
        items = [
            {
                "newsletter_id": newsletter_id,
                "subscriber_email": email,
                "status": "pending",
                "attempts": 0,
                "created_at": datetime.utcnow().isoformat(),
            }
            for email in emails
        ]

        if not items:
            return 0

        result = self.db.table(self.table).insert(items).execute()
        return len(result.data or [])

    async def get_pending(
        self,
        newsletter_id: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get pending queue items for a newsletter."""
        result = self.db.table(self.table).select("*").eq(
            "newsletter_id", newsletter_id
        ).eq("status", "pending").limit(limit).execute()
        return result.data or []

    async def mark_sent(self, queue_id: str) -> Dict[str, Any]:
        """Mark queue item as sent."""
        result = self.db.table(self.table).update({
            "status": "sent",
            "sent_at": datetime.utcnow().isoformat(),
        }).eq("id", queue_id).execute()
        return result.data[0] if result.data else {}

    async def mark_failed(
        self,
        queue_id: str,
        error_message: str,
    ) -> Dict[str, Any]:
        """Mark queue item as failed."""
        item = self.db.table(self.table).select("attempts").eq("id", queue_id).execute()
        attempts = (item.data[0].get("attempts", 0) if item.data else 0) + 1

        result = self.db.table(self.table).update({
            "status": "failed",
            "error_message": error_message,
            "attempts": attempts,
        }).eq("id", queue_id).execute()
        return result.data[0] if result.data else {}

    async def get_stats(self, newsletter_id: str) -> Dict[str, Any]:
        """Get queue statistics for a newsletter."""
        pending = self.db.table(self.table).select(
            "*", count="exact"
        ).eq("newsletter_id", newsletter_id).eq("status", "pending").execute()

        sent = self.db.table(self.table).select(
            "*", count="exact"
        ).eq("newsletter_id", newsletter_id).eq("status", "sent").execute()

        failed = self.db.table(self.table).select(
            "*", count="exact"
        ).eq("newsletter_id", newsletter_id).eq("status", "failed").execute()

        return {
            "pending": pending.count or 0,
            "sent": sent.count or 0,
            "failed": failed.count or 0,
            "total": (pending.count or 0) + (sent.count or 0) + (failed.count or 0),
        }

    async def clear_queue(self, newsletter_id: str) -> int:
        """Clear all queue items for a newsletter."""
        result = self.db.table(self.table).delete().eq(
            "newsletter_id", newsletter_id
        ).execute()
        return len(result.data or [])


class NewsletterTemplateRepository:
    """Repository for newsletter templates."""

    def __init__(self, db: Client):
        self.db = db
        self.table = "newsletter_templates"

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new template."""
        data["created_at"] = datetime.utcnow().isoformat()
        result = self.db.table(self.table).insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_by_id(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get template by ID."""
        result = self.db.table(self.table).select("*").eq("id", template_id).execute()
        return result.data[0] if result.data else None

    async def get_all(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get all templates."""
        query = self.db.table(self.table).select("*")
        if active_only:
            query = query.eq("is_active", True)
        result = query.order("name").execute()
        return result.data or []

    async def update(self, template_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update template."""
        data["updated_at"] = datetime.utcnow().isoformat()
        result = self.db.table(self.table).update(data).eq("id", template_id).execute()
        return result.data[0] if result.data else {}

    async def delete(self, template_id: str) -> bool:
        """Delete template."""
        result = self.db.table(self.table).delete().eq("id", template_id).execute()
        return len(result.data or []) > 0
