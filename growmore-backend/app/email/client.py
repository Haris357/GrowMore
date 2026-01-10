"""
Email Client using Resend.
Handles all email sending operations.
"""

import logging
from typing import Any, Dict, List, Optional

import resend

from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmailClient:
    """
    Email client using Resend API.

    Free tier: 3,000 emails/month
    Great deliverability and simple API.
    """

    def __init__(self):
        self.api_key = getattr(settings, "RESEND_API_KEY", None)
        self.from_address = getattr(settings, "EMAIL_FROM_ADDRESS", "noreply@growmore.pk")
        self.from_name = getattr(settings, "EMAIL_FROM_NAME", "GrowMore")
        self.reply_to = getattr(settings, "EMAIL_REPLY_TO", "support@growmore.pk")

        if self.api_key:
            resend.api_key = self.api_key

    @property
    def is_configured(self) -> bool:
        """Check if email client is properly configured."""
        return bool(self.api_key)

    async def send(
        self,
        to: str | List[str],
        subject: str,
        html: str,
        text: Optional[str] = None,
        reply_to: Optional[str] = None,
        tags: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Send an email.

        Args:
            to: Recipient email(s)
            subject: Email subject
            html: HTML content
            text: Plain text content (optional)
            reply_to: Reply-to address (optional)
            tags: Email tags for tracking (optional)

        Returns:
            Response from Resend API
        """
        if not self.is_configured:
            logger.warning("Email client not configured. Skipping email send.")
            return {"id": None, "error": "Email client not configured"}

        try:
            params = {
                "from": f"{self.from_name} <{self.from_address}>",
                "to": to if isinstance(to, list) else [to],
                "subject": subject,
                "html": html,
            }

            if text:
                params["text"] = text
            if reply_to:
                params["reply_to"] = reply_to
            elif self.reply_to:
                params["reply_to"] = self.reply_to
            if tags:
                params["tags"] = tags

            response = resend.Emails.send(params)
            logger.info(f"Email sent successfully: {subject} to {to}")
            return response

        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return {"id": None, "error": str(e)}

    async def send_batch(
        self,
        emails: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Send multiple emails in a batch.

        Args:
            emails: List of email params (to, subject, html, etc.)

        Returns:
            Batch response from Resend API
        """
        if not self.is_configured:
            logger.warning("Email client not configured. Skipping batch send.")
            return {"data": [], "error": "Email client not configured"}

        try:
            # Add from address to each email
            for email in emails:
                if "from" not in email:
                    email["from"] = f"{self.from_name} <{self.from_address}>"

            response = resend.Batch.send(emails)
            logger.info(f"Batch email sent: {len(emails)} emails")
            return response

        except Exception as e:
            logger.error(f"Error sending batch email: {e}")
            return {"data": [], "error": str(e)}

    async def get_email(self, email_id: str) -> Dict[str, Any]:
        """Get email details by ID."""
        if not self.is_configured:
            return {"error": "Email client not configured"}

        try:
            return resend.Emails.get(email_id)
        except Exception as e:
            logger.error(f"Error getting email {email_id}: {e}")
            return {"error": str(e)}


# Global email client instance
email_client = EmailClient()
