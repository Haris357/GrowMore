"""Newsletter API Endpoints."""

from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_current_user, get_current_admin_user, get_current_user_optional
from app.models.user import User
from app.schemas.newsletter import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    UnsubscribeRequest,
    NewsletterCreate,
    NewsletterUpdate,
    NewsletterResponse,
    NewsletterListResponse,
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
)
from app.services.newsletter_service import NewsletterService

router = APIRouter()


def get_newsletter_service():
    """Get newsletter service instance."""
    return NewsletterService()


# ==================== Public Subscription Endpoints ====================

@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_to_newsletter(
    data: SubscriptionCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Subscribe to newsletter.

    Public endpoint - authentication optional.
    If authenticated, links subscription to user account.
    """
    service = get_newsletter_service()
    user_id = current_user.firebase_uid if current_user else None

    result = await service.subscribe(
        email=data.email,
        user_id=user_id,
        preferences=data.preferences,
        source=data.source or "website",
    )

    return result


@router.post("/unsubscribe")
async def unsubscribe_from_newsletter(data: UnsubscribeRequest):
    """
    Unsubscribe from newsletter.

    Public endpoint for unsubscribe links.
    """
    service = get_newsletter_service()
    result = await service.unsubscribe(data.email, data.reason)
    return result


@router.get("/subscription/status")
async def get_subscription_status(
    email: str = Query(...),
):
    """Check subscription status for an email."""
    service = get_newsletter_service()
    subscription = await service.subscription_repo.get_by_email(email)

    if not subscription:
        return {"subscribed": False}

    return {
        "subscribed": subscription.get("is_active", False),
        "subscribed_at": subscription.get("subscribed_at"),
        "preferences": subscription.get("preferences"),
    }


@router.put("/subscription/preferences")
async def update_subscription_preferences(
    data: SubscriptionUpdate,
    email: str = Query(...),
):
    """Update subscription preferences."""
    service = get_newsletter_service()
    result = await service.update_preferences(email, data.preferences or {})

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


# ==================== Admin Newsletter Management ====================

@router.get("/admin/subscribers")
async def list_subscribers(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_admin_user),
):
    """List all newsletter subscribers (admin only)."""
    service = get_newsletter_service()
    return await service.get_subscribers(page, page_size)


@router.get("/admin/subscribers/stats")
async def get_subscriber_stats(
    current_user: User = Depends(get_current_admin_user),
):
    """Get subscriber statistics (admin only)."""
    service = get_newsletter_service()
    return await service.get_subscription_stats()


@router.post("/admin/newsletters", response_model=NewsletterResponse)
async def create_newsletter(
    data: NewsletterCreate,
    current_user: User = Depends(get_current_admin_user),
):
    """Create a new newsletter (admin only)."""
    service = get_newsletter_service()

    newsletter = await service.create_newsletter(
        title=data.title,
        subject=data.subject,
        content=data.content,
        preview_text=data.preview_text,
        scheduled_at=data.scheduled_at,
        created_by=current_user.firebase_uid,
    )

    return newsletter


@router.get("/admin/newsletters", response_model=NewsletterListResponse)
async def list_newsletters(
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_admin_user),
):
    """List all newsletters (admin only)."""
    service = get_newsletter_service()
    return await service.get_newsletters(status, page, page_size)


@router.get("/admin/newsletters/{newsletter_id}", response_model=NewsletterResponse)
async def get_newsletter(
    newsletter_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Get newsletter details (admin only)."""
    service = get_newsletter_service()
    newsletter = await service.get_newsletter(newsletter_id)

    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")

    return newsletter


@router.put("/admin/newsletters/{newsletter_id}", response_model=NewsletterResponse)
async def update_newsletter(
    newsletter_id: str,
    data: NewsletterUpdate,
    current_user: User = Depends(get_current_admin_user),
):
    """Update newsletter (admin only)."""
    service = get_newsletter_service()

    result = await service.update_newsletter(
        newsletter_id,
        data.model_dump(exclude_unset=True),
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.delete("/admin/newsletters/{newsletter_id}")
async def delete_newsletter(
    newsletter_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Delete newsletter (admin only, drafts only)."""
    service = get_newsletter_service()
    result = await service.delete_newsletter(newsletter_id)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"message": "Newsletter deleted"}


@router.post("/admin/newsletters/{newsletter_id}/schedule")
async def schedule_newsletter(
    newsletter_id: str,
    scheduled_at: datetime = Query(...),
    current_user: User = Depends(get_current_admin_user),
):
    """Schedule newsletter for sending (admin only)."""
    service = get_newsletter_service()
    result = await service.schedule_newsletter(newsletter_id, scheduled_at)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"message": "Newsletter scheduled", "scheduled_at": scheduled_at}


@router.post("/admin/newsletters/{newsletter_id}/send")
async def send_newsletter_now(
    newsletter_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Send newsletter immediately (admin only)."""
    service = get_newsletter_service()
    result = await service.send_newsletter_now(newsletter_id)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.get("/admin/newsletters/{newsletter_id}/stats")
async def get_newsletter_stats(
    newsletter_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Get newsletter statistics (admin only)."""
    service = get_newsletter_service()
    result = await service.get_newsletter_stats(newsletter_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


# ==================== Admin Template Management ====================

@router.get("/admin/templates")
async def list_templates(
    active_only: bool = Query(default=True),
    current_user: User = Depends(get_current_admin_user),
):
    """List newsletter templates (admin only)."""
    service = get_newsletter_service()
    templates = await service.get_templates(active_only)
    return {"templates": templates}


@router.post("/admin/templates", response_model=TemplateResponse)
async def create_template(
    data: TemplateCreate,
    current_user: User = Depends(get_current_admin_user),
):
    """Create newsletter template (admin only)."""
    service = get_newsletter_service()

    template = await service.create_template(
        name=data.name,
        html_content=data.html_content,
        description=data.description,
        variables=data.variables,
        created_by=current_user.firebase_uid,
    )

    return template


@router.get("/admin/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Get template details (admin only)."""
    service = get_newsletter_service()
    template = await service.get_template(template_id)

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return template


@router.put("/admin/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    data: TemplateUpdate,
    current_user: User = Depends(get_current_admin_user),
):
    """Update template (admin only)."""
    service = get_newsletter_service()

    result = await service.update_template(
        template_id,
        data.model_dump(exclude_unset=True),
    )

    if not result:
        raise HTTPException(status_code=404, detail="Template not found")

    return result


@router.delete("/admin/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Delete template (admin only)."""
    service = get_newsletter_service()
    result = await service.delete_template(template_id)

    if not result.get("success"):
        raise HTTPException(status_code=404, detail="Template not found")

    return {"message": "Template deleted"}


@router.post("/admin/templates/{template_id}/preview")
async def preview_template(
    template_id: str,
    variables: Dict[str, Any],
    current_user: User = Depends(get_current_admin_user),
):
    """Preview template with variables (admin only)."""
    service = get_newsletter_service()

    try:
        rendered = await service.render_template(template_id, variables)
        return {"html": rendered}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
