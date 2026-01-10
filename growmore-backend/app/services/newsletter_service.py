"""Newsletter Service."""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.db.supabase import get_supabase_service_client
from app.email.sender import email_sender
from app.repositories.newsletter_repository import (
    NewsletterRepository,
    NewsletterQueueRepository,
    NewsletterSubscriptionRepository,
    NewsletterTemplateRepository,
)

logger = logging.getLogger(__name__)


class NewsletterService:
    """Service for managing newsletters."""

    def __init__(self):
        self.db = get_supabase_service_client()
        self.newsletter_repo = NewsletterRepository(self.db)
        self.queue_repo = NewsletterQueueRepository(self.db)
        self.subscription_repo = NewsletterSubscriptionRepository(self.db)
        self.template_repo = NewsletterTemplateRepository(self.db)

    # ==================== Subscription Management ====================

    async def subscribe(
        self,
        email: str,
        user_id: Optional[str] = None,
        preferences: Optional[dict] = None,
        source: str = "manual",
    ) -> Dict[str, Any]:
        """
        Subscribe email to newsletter.

        Args:
            email: Email address
            user_id: Optional user ID
            preferences: Subscription preferences
            source: Subscription source

        Returns:
            Subscription data
        """
        # Check if already subscribed
        existing = await self.subscription_repo.get_by_email(email)
        if existing:
            if existing.get("is_active"):
                return {"message": "Already subscribed", "subscription": existing}
            # Resubscribe
            await self.subscription_repo.resubscribe(email)
            updated = await self.subscription_repo.get_by_email(email)
            return {"message": "Resubscribed successfully", "subscription": updated}

        # Create new subscription
        subscription = await self.subscription_repo.create({
            "email": email,
            "user_id": user_id,
            "preferences": preferences or {},
            "source": source,
            "is_active": True,
        })

        return {"message": "Subscribed successfully", "subscription": subscription}

    async def unsubscribe(
        self,
        email: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Unsubscribe email from newsletter.

        Args:
            email: Email address
            reason: Optional unsubscribe reason

        Returns:
            Result message
        """
        success = await self.subscription_repo.unsubscribe(email)
        if success:
            logger.info(f"Unsubscribed: {email}, reason: {reason}")
            return {"message": "Unsubscribed successfully"}
        return {"message": "Email not found in subscription list"}

    async def update_preferences(
        self,
        email: str,
        preferences: dict,
    ) -> Dict[str, Any]:
        """Update subscription preferences."""
        subscription = await self.subscription_repo.get_by_email(email)
        if not subscription:
            return {"error": "Subscription not found"}

        updated = await self.subscription_repo.update(
            subscription["id"],
            {"preferences": preferences},
        )
        return {"message": "Preferences updated", "subscription": updated}

    async def get_subscribers(
        self,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """Get paginated list of subscribers."""
        return await self.subscription_repo.get_active_subscribers(page, page_size)

    async def get_subscription_stats(self) -> Dict[str, Any]:
        """Get subscription statistics."""
        return await self.subscription_repo.get_stats()

    # ==================== Newsletter Management ====================

    async def create_newsletter(
        self,
        title: str,
        subject: str,
        content: str,
        preview_text: Optional[str] = None,
        scheduled_at: Optional[datetime] = None,
        created_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new newsletter.

        Args:
            title: Newsletter title
            subject: Email subject
            content: HTML content
            preview_text: Preview text
            scheduled_at: Schedule time
            created_by: Creator user ID

        Returns:
            Newsletter data
        """
        status = "scheduled" if scheduled_at else "draft"

        newsletter = await self.newsletter_repo.create({
            "title": title,
            "subject": subject,
            "content": content,
            "preview_text": preview_text,
            "status": status,
            "scheduled_at": scheduled_at.isoformat() if scheduled_at else None,
            "created_by": created_by,
        })

        return newsletter

    async def update_newsletter(
        self,
        newsletter_id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update newsletter."""
        newsletter = await self.newsletter_repo.get_by_id(newsletter_id)
        if not newsletter:
            return {"error": "Newsletter not found"}

        if newsletter.get("status") in ["sending", "sent"]:
            return {"error": "Cannot update newsletter that is sending or sent"}

        return await self.newsletter_repo.update(newsletter_id, data)

    async def get_newsletter(self, newsletter_id: str) -> Optional[Dict[str, Any]]:
        """Get newsletter by ID."""
        return await self.newsletter_repo.get_by_id(newsletter_id)

    async def get_newsletters(
        self,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Get newsletters with optional status filter."""
        return await self.newsletter_repo.get_all(status, page, page_size)

    async def delete_newsletter(self, newsletter_id: str) -> Dict[str, Any]:
        """Delete newsletter (only drafts)."""
        newsletter = await self.newsletter_repo.get_by_id(newsletter_id)
        if not newsletter:
            return {"error": "Newsletter not found"}

        if newsletter.get("status") != "draft":
            return {"error": "Can only delete draft newsletters"}

        success = await self.newsletter_repo.delete(newsletter_id)
        return {"success": success}

    # ==================== Sending ====================

    async def schedule_newsletter(
        self,
        newsletter_id: str,
        scheduled_at: datetime,
    ) -> Dict[str, Any]:
        """Schedule newsletter for sending."""
        newsletter = await self.newsletter_repo.get_by_id(newsletter_id)
        if not newsletter:
            return {"error": "Newsletter not found"}

        if newsletter.get("status") not in ["draft", "scheduled"]:
            return {"error": "Newsletter cannot be scheduled"}

        return await self.newsletter_repo.update(newsletter_id, {
            "status": "scheduled",
            "scheduled_at": scheduled_at.isoformat(),
        })

    async def send_newsletter_now(self, newsletter_id: str) -> Dict[str, Any]:
        """
        Start sending newsletter immediately.

        This queues all subscribers and starts the sending process.
        """
        newsletter = await self.newsletter_repo.get_by_id(newsletter_id)
        if not newsletter:
            return {"error": "Newsletter not found"}

        if newsletter.get("status") not in ["draft", "scheduled"]:
            return {"error": "Newsletter cannot be sent"}

        # Get all active subscribers
        emails = await self.subscription_repo.get_all_active_emails()
        if not emails:
            return {"error": "No active subscribers"}

        # Update newsletter status
        await self.newsletter_repo.update(newsletter_id, {
            "status": "sending",
            "total_recipients": len(emails),
        })

        # Add to queue
        queued = await self.queue_repo.add_to_queue(newsletter_id, emails)

        # Start processing (async)
        asyncio.create_task(self._process_newsletter_queue(newsletter_id))

        return {
            "message": "Newsletter sending started",
            "total_recipients": len(emails),
            "queued": queued,
        }

    async def _process_newsletter_queue(
        self,
        newsletter_id: str,
        batch_size: int = 50,
    ):
        """
        Process newsletter queue in batches.

        This runs asynchronously after send_newsletter_now is called.
        """
        newsletter = await self.newsletter_repo.get_by_id(newsletter_id)
        if not newsletter:
            logger.error(f"Newsletter {newsletter_id} not found for processing")
            return

        subject = newsletter["subject"]
        content = newsletter["content"]
        sent_count = 0
        failed_count = 0

        while True:
            # Get pending items
            pending = await self.queue_repo.get_pending(newsletter_id, batch_size)
            if not pending:
                break

            for item in pending:
                try:
                    success = await email_sender.send_newsletter(
                        to=item["subscriber_email"],
                        subject=subject,
                        html_content=content,
                        newsletter_id=newsletter_id,
                    )

                    if success:
                        await self.queue_repo.mark_sent(item["id"])
                        sent_count += 1
                    else:
                        await self.queue_repo.mark_failed(item["id"], "Send failed")
                        failed_count += 1

                except Exception as e:
                    logger.error(f"Error sending to {item['subscriber_email']}: {e}")
                    await self.queue_repo.mark_failed(item["id"], str(e))
                    failed_count += 1

                # Small delay to avoid rate limiting
                await asyncio.sleep(0.1)

            # Update stats periodically
            await self.newsletter_repo.update_stats(
                newsletter_id,
                sent_count=sent_count,
                failed_count=failed_count,
            )
            sent_count = 0
            failed_count = 0

        # Mark as sent
        await self.newsletter_repo.mark_sent(newsletter_id)
        logger.info(f"Newsletter {newsletter_id} sending completed")

    async def get_newsletter_stats(self, newsletter_id: str) -> Dict[str, Any]:
        """Get newsletter statistics."""
        newsletter = await self.newsletter_repo.get_by_id(newsletter_id)
        if not newsletter:
            return {"error": "Newsletter not found"}

        queue_stats = await self.queue_repo.get_stats(newsletter_id)

        sent = newsletter.get("sent_count", 0)
        opened = newsletter.get("opened_count", 0)
        clicked = newsletter.get("clicked_count", 0)

        return {
            "id": newsletter_id,
            "title": newsletter.get("title"),
            "status": newsletter.get("status"),
            "total_recipients": newsletter.get("total_recipients", 0),
            "sent_count": sent,
            "opened_count": opened,
            "clicked_count": clicked,
            "failed_count": newsletter.get("failed_count", 0),
            "open_rate": round(opened / sent * 100, 2) if sent else 0,
            "click_rate": round(clicked / sent * 100, 2) if sent else 0,
            "queue": queue_stats,
        }

    # ==================== Templates ====================

    async def create_template(
        self,
        name: str,
        html_content: str,
        description: Optional[str] = None,
        variables: Optional[List[str]] = None,
        created_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create newsletter template."""
        return await self.template_repo.create({
            "name": name,
            "html_content": html_content,
            "description": description,
            "variables": variables or [],
            "created_by": created_by,
        })

    async def get_templates(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get all templates."""
        return await self.template_repo.get_all(active_only)

    async def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get template by ID."""
        return await self.template_repo.get_by_id(template_id)

    async def update_template(
        self,
        template_id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update template."""
        return await self.template_repo.update(template_id, data)

    async def delete_template(self, template_id: str) -> Dict[str, Any]:
        """Delete template."""
        success = await self.template_repo.delete(template_id)
        return {"success": success}

    async def render_template(
        self,
        template_id: str,
        variables: Dict[str, Any],
    ) -> str:
        """
        Render template with variables.

        Args:
            template_id: Template ID
            variables: Dict of variable values

        Returns:
            Rendered HTML content
        """
        template = await self.template_repo.get_by_id(template_id)
        if not template:
            raise ValueError("Template not found")

        content = template["html_content"]

        # Simple variable substitution
        for key, value in variables.items():
            content = content.replace(f"{{{{{key}}}}}", str(value))

        return content

    # ==================== Scheduled Jobs ====================

    async def process_scheduled_newsletters(self):
        """
        Process scheduled newsletters.

        This should be called by a scheduled job.
        """
        scheduled = await self.newsletter_repo.get_scheduled()

        for newsletter in scheduled:
            logger.info(f"Processing scheduled newsletter: {newsletter['id']}")
            await self.send_newsletter_now(newsletter["id"])

    async def send_weekly_digests(self):
        """
        Send weekly digest emails to all users with portfolios.

        This should be called by a weekly scheduled job.
        """
        from app.services.analytics_service import AnalyticsService

        # Get users with portfolio preferences
        users_result = self.db.table("users").select(
            "id, email, display_name"
        ).execute()

        users = users_result.data or []
        analytics = AnalyticsService(self.db)

        for user in users:
            try:
                # Get portfolio data
                portfolio = await analytics.get_portfolio_analytics(user["id"])
                if portfolio.get("error") or not portfolio.get("holdings"):
                    continue

                # Prepare digest data
                digest_data = {
                    "week_start": (datetime.utcnow().date()).strftime("%B %d"),
                    "week_end": datetime.utcnow().strftime("%B %d, %Y"),
                    "portfolio_value": f"PKR {portfolio['summary'].get('total_value', 0):,.0f}",
                    "weekly_change": f"PKR {portfolio['summary'].get('total_gain_loss', 0):,.0f}",
                    "weekly_change_pct": f"{portfolio['summary'].get('gain_loss_percentage', 0):.1f}",
                    "is_positive": portfolio['summary'].get('total_gain_loss', 0) >= 0,
                    "top_gainers": portfolio.get("top_performers", [])[:3],
                    "top_losers": portfolio.get("worst_performers", [])[:3],
                    "market_summary": {},
                }

                await email_sender.send_weekly_digest(user, digest_data)
                logger.info(f"Sent weekly digest to {user['email']}")

            except Exception as e:
                logger.error(f"Failed to send digest to {user.get('email')}: {e}")

    async def send_news_roundups(self):
        """
        Send weekly news roundup to subscribers.

        This should be called by a weekly scheduled job.
        """
        # Get recent news
        news_result = self.db.table("news").select("*").order(
            "published_at", desc=True
        ).limit(20).execute()
        news_items = news_result.data or []

        if not news_items:
            logger.info("No news items for roundup")
            return

        # Get subscribers who want news
        subscribers = await self.subscription_repo.get_all_active_emails()

        for email in subscribers:
            try:
                # Get user info if exists
                user_result = self.db.table("users").select(
                    "display_name"
                ).eq("email", email).execute()
                user = user_result.data[0] if user_result.data else {"email": email}
                user["email"] = email

                await email_sender.send_news_roundup(user, news_items)
                logger.info(f"Sent news roundup to {email}")

            except Exception as e:
                logger.error(f"Failed to send roundup to {email}: {e}")
