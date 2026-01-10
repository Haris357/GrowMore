"""
Notifications API Endpoints.
Price alerts, in-app notifications, and preferences.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user
from app.services.notification_service import NotificationService, ALERT_CONDITIONS
from app.models.user import User

router = APIRouter()


# ==================== Request Models ====================

class PriceAlertCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    condition: str = Field(..., pattern="^(price_above|price_below|change_above|change_below|volume_spike|new_high|new_low)$")
    target_value: float = Field(...)
    notes: Optional[str] = None


class NotificationMarkRead(BaseModel):
    notification_ids: List[str] = Field(..., min_items=1)


class PreferencesUpdate(BaseModel):
    price_alerts: Optional[bool] = None
    news_alerts: Optional[bool] = None
    portfolio_updates: Optional[bool] = None
    goal_reminders: Optional[bool] = None
    market_updates: Optional[bool] = None
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")


# ==================== Price Alert Endpoints ====================

@router.get("/alerts")
async def list_price_alerts(
    active_only: bool = Query(default=True),
    current_user: User = Depends(get_current_user),
):
    """
    Get all price alerts for the current user.

    Filter by active_only to show only untriggered alerts.
    """
    service = NotificationService()
    alerts = await service.get_user_alerts(
        user_id=current_user.firebase_uid,
        active_only=active_only,
    )
    return {
        "alerts": alerts,
        "total": len(alerts),
    }


@router.post("/alerts", status_code=status.HTTP_201_CREATED)
async def create_price_alert(
    alert: PriceAlertCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new price alert.

    Conditions:
    - price_above: Alert when price rises above target
    - price_below: Alert when price falls below target
    - change_above: Alert when daily change exceeds threshold (%)
    - change_below: Alert when daily change drops below threshold (%)
    - volume_spike: Alert on volume spike
    - new_high: Alert on new 52-week high
    - new_low: Alert on new 52-week low
    """
    service = NotificationService()
    result = await service.create_price_alert(
        user_id=current_user.firebase_uid,
        symbol=alert.symbol.upper(),
        condition=alert.condition,
        target_value=alert.target_value,
        notes=alert.notes,
    )
    return result


@router.delete("/alerts/{alert_id}")
async def delete_price_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a price alert."""
    service = NotificationService()
    success = await service.delete_alert(current_user.firebase_uid, alert_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    return {"message": "Alert deleted successfully"}


@router.post("/alerts/{alert_id}/toggle")
async def toggle_price_alert(
    alert_id: str,
    is_active: bool = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Enable or disable a price alert."""
    service = NotificationService()
    result = await service.toggle_alert(
        user_id=current_user.firebase_uid,
        alert_id=alert_id,
        is_active=is_active,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    return result


@router.get("/alerts/conditions")
async def get_alert_conditions():
    """Get available alert conditions with descriptions."""
    return {
        "conditions": [
            {"id": key, "description": desc}
            for key, desc in ALERT_CONDITIONS.items()
        ]
    }


# ==================== Notification Endpoints ====================

@router.get("")
async def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """
    Get notifications for the current user.

    Use unread_only=true to filter to unread notifications.
    """
    service = NotificationService()
    notifications = await service.get_notifications(
        user_id=current_user.firebase_uid,
        unread_only=unread_only,
        limit=limit,
    )

    unread_count = await service.get_unread_count(current_user.firebase_uid)

    return {
        "notifications": notifications,
        "total": len(notifications),
        "unread_count": unread_count,
    }


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
):
    """Get count of unread notifications."""
    service = NotificationService()
    count = await service.get_unread_count(current_user.firebase_uid)
    return {"unread_count": count}


@router.post("/mark-read")
async def mark_notifications_read(
    request: NotificationMarkRead,
    current_user: User = Depends(get_current_user),
):
    """Mark specific notifications as read."""
    service = NotificationService()
    count = await service.mark_as_read(
        user_id=current_user.firebase_uid,
        notification_ids=request.notification_ids,
    )
    return {"marked_count": count}


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    service = NotificationService()
    count = await service.mark_all_read(current_user.firebase_uid)
    return {"marked_count": count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a notification."""
    service = NotificationService()
    success = await service.delete_notification(
        user_id=current_user.firebase_uid,
        notification_id=notification_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return {"message": "Notification deleted"}


# ==================== Preferences Endpoints ====================

@router.get("/preferences")
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
):
    """Get notification preferences."""
    service = NotificationService()
    preferences = await service.get_preferences(current_user.firebase_uid)
    return {"preferences": preferences}


@router.put("/preferences")
async def update_notification_preferences(
    update: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Update notification preferences.

    Options:
    - price_alerts: Price alert notifications
    - news_alerts: Breaking news notifications
    - portfolio_updates: Portfolio value change alerts
    - goal_reminders: Goal progress reminders
    - market_updates: Market open/close notifications
    - email_enabled: Send notifications via email
    - push_enabled: Send push notifications
    - quiet_hours_start/end: Time range to suppress notifications (HH:MM format)
    """
    service = NotificationService()

    update_data = update.dict(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No preferences to update",
        )

    result = await service.update_preferences(
        user_id=current_user.firebase_uid,
        preferences=update_data,
    )

    return result


# ==================== Quick Actions ====================

@router.post("/alerts/quick/price-target")
async def quick_create_price_target_alert(
    symbol: str = Query(..., min_length=1),
    target_price: float = Query(..., gt=0),
    direction: str = Query(..., pattern="^(above|below)$"),
    current_user: User = Depends(get_current_user),
):
    """Quick endpoint to create a price target alert."""
    service = NotificationService()
    condition = "price_above" if direction == "above" else "price_below"

    result = await service.create_price_alert(
        user_id=current_user.firebase_uid,
        symbol=symbol.upper(),
        condition=condition,
        target_value=target_price,
    )

    return result


@router.post("/alerts/quick/change-threshold")
async def quick_create_change_alert(
    symbol: str = Query(..., min_length=1),
    threshold_pct: float = Query(...),
    direction: str = Query(..., pattern="^(up|down)$"),
    current_user: User = Depends(get_current_user),
):
    """Quick endpoint to create a percentage change alert."""
    service = NotificationService()
    condition = "change_above" if direction == "up" else "change_below"

    result = await service.create_price_alert(
        user_id=current_user.firebase_uid,
        symbol=symbol.upper(),
        condition=condition,
        target_value=abs(threshold_pct) if direction == "up" else -abs(threshold_pct),
    )

    return result
