"""
WebSocket API Endpoints.
Real-time streaming connections for prices, news, and alerts.
"""

import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from app.core.dependencies import get_current_user_optional
from app.websockets.connection_manager import manager
from app.websockets.price_stream import price_stream
from app.websockets.news_stream import news_stream

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_user_from_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Validate token and return user info.

    For WebSocket connections, we can't use regular Depends.
    """
    if not token:
        return None

    try:
        from app.core.firebase import verify_firebase_token
        user = verify_firebase_token(token)
        return user
    except Exception as e:
        logger.warning(f"WebSocket auth failed: {e}")
        return None


@router.websocket("/stream")
async def websocket_stream(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
):
    """
    Main WebSocket endpoint for real-time updates.

    Connect with optional auth token:
    ws://localhost:8000/api/v1/ws/stream?token=YOUR_TOKEN

    Message format (client -> server):
    {
        "action": "subscribe" | "unsubscribe",
        "topic": "prices" | "news" | "alerts" | "market" | "portfolio",
        "symbols": ["OGDC", "HBL"]  // optional, for symbol-specific
    }

    Message format (server -> client):
    {
        "type": "price_update" | "news_update" | "alert" | "market_update",
        "data": {...},
        "timestamp": "2024-01-08T12:00:00Z"
    }
    """
    # Authenticate user (optional)
    user = await get_user_from_token(token)
    user_id = user["uid"] if user else None

    # Accept connection
    connection_id = await manager.connect(websocket, user_id)

    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "connection_id": connection_id,
            "authenticated": user_id is not None,
            "message": "Connected to GrowMore real-time stream",
        })

        # Listen for messages
        while True:
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                await handle_client_message(websocket, message, user_id)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format",
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logger.info(f"Client disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id)


async def handle_client_message(
    websocket: WebSocket,
    message: Dict[str, Any],
    user_id: Optional[str],
):
    """Handle incoming WebSocket messages from clients."""
    action = message.get("action")
    topic = message.get("topic")
    symbols = message.get("symbols", [])

    if action == "subscribe":
        if not user_id:
            # Anonymous users can only subscribe to prices and market
            if topic not in ["prices", "market"]:
                await websocket.send_json({
                    "type": "error",
                    "message": "Authentication required for this subscription",
                })
                return

        if topic:
            manager.subscribe(user_id or "anonymous", topic, symbols)
            await websocket.send_json({
                "type": "subscribed",
                "topic": topic,
                "symbols": symbols,
            })

            # Send initial data
            if topic == "prices" and symbols:
                await price_stream.send_price_snapshot(user_id or "anonymous", symbols)

    elif action == "unsubscribe":
        if topic:
            manager.unsubscribe(user_id or "anonymous", topic, symbols)
            await websocket.send_json({
                "type": "unsubscribed",
                "topic": topic,
                "symbols": symbols,
            })

    elif action == "ping":
        await websocket.send_json({
            "type": "pong",
            "timestamp": message.get("timestamp"),
        })

    elif action == "get_snapshot":
        # Get current prices for requested symbols
        if symbols:
            await price_stream.send_price_snapshot(user_id or "anonymous", symbols)

    else:
        await websocket.send_json({
            "type": "error",
            "message": f"Unknown action: {action}",
        })


@router.websocket("/prices")
async def websocket_prices(
    websocket: WebSocket,
    symbols: Optional[str] = Query(default=None),
):
    """
    Simplified WebSocket for price updates only.

    Connect with optional symbol filter:
    ws://localhost:8000/api/v1/ws/prices?symbols=OGDC,HBL,UBL
    """
    await websocket.accept()

    # Parse symbols
    symbol_list = symbols.split(",") if symbols else []

    # Subscribe to prices
    manager.anonymous_connections.append(websocket)
    manager.subscriptions["prices"].add("anonymous")

    for symbol in symbol_list:
        if symbol not in manager.symbol_subscriptions:
            manager.symbol_subscriptions[symbol] = set()
        manager.symbol_subscriptions[symbol].add("anonymous")

    try:
        # Send initial snapshot
        if symbol_list:
            snapshot = {s: price_stream.get_latest_price(s) for s in symbol_list}
        else:
            snapshot = price_stream.last_prices

        await websocket.send_json({
            "type": "snapshot",
            "data": snapshot,
        })

        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Handle ping
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        manager.anonymous_connections.remove(websocket)
        manager.subscriptions["prices"].discard("anonymous")
        for symbol in symbol_list:
            if symbol in manager.symbol_subscriptions:
                manager.symbol_subscriptions[symbol].discard("anonymous")


@router.get("/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics."""
    return {
        "connections": manager.get_stats(),
        "price_streaming": price_stream.is_streaming,
        "news_streaming": news_stream.is_streaming,
    }


@router.post("/broadcast/test")
async def test_broadcast(
    message: str = "Test broadcast message",
):
    """Test endpoint to broadcast a message (dev only)."""
    await manager.broadcast_all({
        "type": "test",
        "message": message,
    })
    return {"status": "broadcast sent"}
