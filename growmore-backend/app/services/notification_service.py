"""
Notification Service.
Manages user notifications, price alerts, and delivery preferences.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)


# Alert condition types
ALERT_CONDITIONS = {
    "price_above": "Price rises above target",
    "price_below": "Price falls below target",
    "change_above": "Daily change exceeds threshold (%)",
    "change_below": "Daily change drops below threshold (%)",
    "volume_spike": "Trading volume spikes",
    "new_high": "Stock reaches new 52-week high",
    "new_low": "Stock reaches new 52-week low",
}


class NotificationService:
    """
    Notification management service.

    Features:
    - Price alert creation and management
    - In-app notifications
    - Notification preferences
    - Alert triggering and delivery
    """

    def __init__(self):
        self.db = get_supabase_service_client()

    # ==================== Price Alerts ====================

    async def create_price_alert(
        self,
        user_id: str,
        symbol: str,
        condition: str,
        target_value: float,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new price alert."""
        try:
            if condition not in ALERT_CONDITIONS:
                raise ValueError(f"Invalid condition: {condition}")

            alert_data = {
                "user_id": user_id,
                "symbol": symbol,
                "condition": condition,
                "target_value": target_value,
                "notes": notes,
                "is_active": True,
                "triggered_at": None,
            }

            result = self.db.table("price_alerts").insert(alert_data).execute()
            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error creating price alert: {e}")
            raise

    async def get_user_alerts(
        self,
        user_id: str,
        active_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """Get all price alerts for a user."""
        try:
            query = self.db.table("price_alerts").select("*").eq("user_id", user_id)

            if active_only:
                query = query.eq("is_active", True)

            query = query.order("created_at", desc=True)
            result = query.execute()

            return result.data or []

        except Exception as e:
            logger.error(f"Error getting user alerts: {e}")
            return []

    async def delete_alert(self, user_id: str, alert_id: str) -> bool:
        """Delete a price alert."""
        try:
            self.db.table("price_alerts").delete().eq(
                "id", alert_id
            ).eq("user_id", user_id).execute()
            return True

        except Exception as e:
            logger.error(f"Error deleting alert: {e}")
            return False

    async def toggle_alert(
        self,
        user_id: str,
        alert_id: str,
        is_active: bool,
    ) -> Dict[str, Any]:
        """Enable or disable an alert."""
        try:
            result = self.db.table("price_alerts").update({
                "is_active": is_active
            }).eq("id", alert_id).eq("user_id", user_id).execute()

            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error toggling alert: {e}")
            raise

    async def check_and_trigger_alerts(
        self,
        symbol: str,
        current_price: float,
        change_pct: float,
        volume: Optional[int] = None,
        high_52w: Optional[float] = None,
        low_52w: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Check if any alerts should be triggered for a symbol.

        Returns list of triggered alerts.
        """
        triggered = []

        try:
            # Get active alerts for this symbol
            result = self.db.table("price_alerts").select("*").eq(
                "symbol", symbol
            ).eq("is_active", True).is_("triggered_at", "null").execute()

            alerts = result.data or []

            for alert in alerts:
                condition = alert["condition"]
                target = float(alert["target_value"])
                should_trigger = False

                if condition == "price_above" and current_price >= target:
                    should_trigger = True
                elif condition == "price_below" and current_price <= target:
                    should_trigger = True
                elif condition == "change_above" and change_pct >= target:
                    should_trigger = True
                elif condition == "change_below" and change_pct <= target:
                    should_trigger = True
                elif condition == "new_high" and high_52w and current_price >= high_52w:
                    should_trigger = True
                elif condition == "new_low" and low_52w and current_price <= low_52w:
                    should_trigger = True

                if should_trigger:
                    # Mark as triggered
                    self.db.table("price_alerts").update({
                        "triggered_at": datetime.utcnow().isoformat(),
                        "triggered_value": current_price,
                    }).eq("id", alert["id"]).execute()

                    triggered.append({
                        **alert,
                        "triggered_value": current_price,
                    })

        except Exception as e:
            logger.error(f"Error checking alerts: {e}")

        return triggered

    # ==================== In-App Notifications ====================

    async def create_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        priority: str = "normal",
    ) -> Dict[str, Any]:
        """Create an in-app notification."""
        try:
            notification_data = {
                "user_id": user_id,
                "type": notification_type,
                "title": title,
                "message": message,
                "data": data or {},
                "priority": priority,
                "is_read": False,
            }

            result = self.db.table("notifications").insert(notification_data).execute()
            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            raise

    async def get_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Get notifications for a user."""
        try:
            query = self.db.table("notifications").select("*").eq("user_id", user_id)

            if unread_only:
                query = query.eq("is_read", False)

            query = query.order("created_at", desc=True).limit(limit)
            result = query.execute()

            return result.data or []

        except Exception as e:
            logger.error(f"Error getting notifications: {e}")
            return []

    async def mark_as_read(
        self,
        user_id: str,
        notification_ids: List[str],
    ) -> int:
        """Mark notifications as read."""
        try:
            for notif_id in notification_ids:
                self.db.table("notifications").update({
                    "is_read": True,
                    "read_at": datetime.utcnow().isoformat(),
                }).eq("id", notif_id).eq("user_id", user_id).execute()

            return len(notification_ids)

        except Exception as e:
            logger.error(f"Error marking notifications read: {e}")
            return 0

    async def mark_all_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user."""
        try:
            result = self.db.table("notifications").update({
                "is_read": True,
                "read_at": datetime.utcnow().isoformat(),
            }).eq("user_id", user_id).eq("is_read", False).execute()

            return len(result.data) if result.data else 0

        except Exception as e:
            logger.error(f"Error marking all read: {e}")
            return 0

    async def delete_notification(self, user_id: str, notification_id: str) -> bool:
        """Delete a notification."""
        try:
            self.db.table("notifications").delete().eq(
                "id", notification_id
            ).eq("user_id", user_id).execute()
            return True

        except Exception as e:
            logger.error(f"Error deleting notification: {e}")
            return False

    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications."""
        try:
            result = self.db.table("notifications").select(
                "id", count="exact"
            ).eq("user_id", user_id).eq("is_read", False).execute()

            return result.count or 0

        except Exception as e:
            logger.error(f"Error getting unread count: {e}")
            return 0

    # ==================== Notification Preferences ====================

    async def get_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get notification preferences for a user."""
        try:
            result = self.db.table("notification_preferences").select("*").eq(
                "user_id", user_id
            ).single().execute()

            if result.data:
                return result.data

            # Return defaults if no preferences set
            return {
                "price_alerts": True,
                "news_alerts": True,
                "portfolio_updates": True,
                "goal_reminders": True,
                "market_updates": True,
                "email_enabled": False,
                "push_enabled": True,
                "quiet_hours_start": None,
                "quiet_hours_end": None,
            }

        except Exception as e:
            logger.error(f"Error getting preferences: {e}")
            return {}

    async def update_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update notification preferences."""
        try:
            # Check if preferences exist
            existing = self.db.table("notification_preferences").select("id").eq(
                "user_id", user_id
            ).execute()

            if existing.data:
                result = self.db.table("notification_preferences").update(
                    preferences
                ).eq("user_id", user_id).execute()
            else:
                result = self.db.table("notification_preferences").insert({
                    "user_id": user_id,
                    **preferences,
                }).execute()

            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error updating preferences: {e}")
            raise

    # ==================== Notification Helpers ====================

    async def notify_alert_triggered(
        self,
        alert: Dict[str, Any],
        current_value: float,
    ):
        """Send notification when a price alert is triggered."""
        condition_desc = ALERT_CONDITIONS.get(alert["condition"], alert["condition"])

        await self.create_notification(
            user_id=alert["user_id"],
            notification_type="price_alert",
            title=f"Price Alert: {alert['symbol']}",
            message=f"{condition_desc} - Target: {alert['target_value']}, Current: {current_value}",
            data={
                "alert_id": alert["id"],
                "symbol": alert["symbol"],
                "condition": alert["condition"],
                "target_value": alert["target_value"],
                "triggered_value": current_value,
            },
            priority="high",
        )

    async def notify_goal_achieved(
        self,
        user_id: str,
        goal_name: str,
        target_amount: float,
    ):
        """Send notification when a goal is achieved."""
        await self.create_notification(
            user_id=user_id,
            notification_type="goal_achieved",
            title="Goal Achieved!",
            message=f"Congratulations! You've reached your goal: {goal_name} (PKR {target_amount:,.0f})",
            data={
                "goal_name": goal_name,
                "target_amount": target_amount,
            },
            priority="high",
        )

    async def notify_portfolio_change(
        self,
        user_id: str,
        change_pct: float,
        change_amount: float,
    ):
        """Send notification for significant portfolio changes."""
        direction = "up" if change_amount > 0 else "down"
        await self.create_notification(
            user_id=user_id,
            notification_type="portfolio_update",
            title=f"Portfolio {direction.title()} {abs(change_pct):.1f}%",
            message=f"Your portfolio is {direction} PKR {abs(change_amount):,.0f} today",
            data={
                "change_pct": change_pct,
                "change_amount": change_amount,
            },
            priority="normal",
        )

    async def notify_breaking_news(
        self,
        user_id: str,
        article_title: str,
        article_id: str,
        affected_symbols: List[str],
    ):
        """Send notification for breaking news affecting user's holdings."""
        await self.create_notification(
            user_id=user_id,
            notification_type="news_alert",
            title="Breaking News",
            message=article_title,
            data={
                "article_id": article_id,
                "affected_symbols": affected_symbols,
            },
            priority="high",
        )
