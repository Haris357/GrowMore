"""
WebSocket Connection Manager.
Handles WebSocket connections, subscriptions, and message broadcasting.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections and subscriptions.

    Features:
    - Connection tracking per user
    - Topic-based subscriptions (stocks, news, alerts)
    - Efficient broadcasting to subscribed clients
    - Heartbeat/ping-pong for connection health
    """

    def __init__(self):
        # Active connections: {user_id: [websocket, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}

        # Anonymous connections (not authenticated)
        self.anonymous_connections: List[WebSocket] = []

        # Subscriptions: {topic: set(user_ids)}
        self.subscriptions: Dict[str, Set[str]] = {
            "prices": set(),      # Stock price updates
            "news": set(),        # News updates
            "alerts": set(),      # Price alerts
            "market": set(),      # Market status updates
            "portfolio": set(),   # Portfolio value updates
        }

        # Symbol-specific subscriptions: {symbol: set(user_ids)}
        self.symbol_subscriptions: Dict[str, Set[str]] = {}

        # Connection metadata
        self.connection_info: Dict[str, Dict[str, Any]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Accept a new WebSocket connection.

        Returns connection_id for tracking.
        """
        await websocket.accept()

        connection_id = f"{user_id or 'anon'}_{datetime.utcnow().timestamp()}"

        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)

            # Auto-subscribe authenticated users to alerts
            self.subscriptions["alerts"].add(user_id)
        else:
            self.anonymous_connections.append(websocket)

        self.connection_info[connection_id] = {
            "user_id": user_id,
            "websocket": websocket,
            "connected_at": datetime.utcnow().isoformat(),
            "subscriptions": [],
        }

        logger.info(f"WebSocket connected: {connection_id}")
        return connection_id

    def disconnect(
        self,
        websocket: WebSocket,
        user_id: Optional[str] = None,
    ):
        """Remove a WebSocket connection."""
        if user_id and user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # Remove from all subscriptions
                for topic_subscribers in self.subscriptions.values():
                    topic_subscribers.discard(user_id)
                for symbol_subscribers in self.symbol_subscriptions.values():
                    symbol_subscribers.discard(user_id)
        elif websocket in self.anonymous_connections:
            self.anonymous_connections.remove(websocket)

        # Clean up connection info
        for conn_id, info in list(self.connection_info.items()):
            if info["websocket"] == websocket:
                del self.connection_info[conn_id]
                break

        logger.info(f"WebSocket disconnected: user_id={user_id}")

    def subscribe(
        self,
        user_id: str,
        topic: str,
        symbols: Optional[List[str]] = None,
    ):
        """Subscribe a user to a topic or specific symbols."""
        if topic in self.subscriptions:
            self.subscriptions[topic].add(user_id)

        if symbols:
            for symbol in symbols:
                if symbol not in self.symbol_subscriptions:
                    self.symbol_subscriptions[symbol] = set()
                self.symbol_subscriptions[symbol].add(user_id)

        logger.debug(f"User {user_id} subscribed to {topic}, symbols={symbols}")

    def unsubscribe(
        self,
        user_id: str,
        topic: Optional[str] = None,
        symbols: Optional[List[str]] = None,
    ):
        """Unsubscribe a user from a topic or specific symbols."""
        if topic and topic in self.subscriptions:
            self.subscriptions[topic].discard(user_id)

        if symbols:
            for symbol in symbols:
                if symbol in self.symbol_subscriptions:
                    self.symbol_subscriptions[symbol].discard(user_id)

    async def send_personal_message(
        self,
        message: Dict[str, Any],
        user_id: str,
    ):
        """Send a message to a specific user (all their connections)."""
        if user_id not in self.active_connections:
            return

        message_json = json.dumps(message)
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(message_json)
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {e}")

    async def broadcast_to_topic(
        self,
        message: Dict[str, Any],
        topic: str,
    ):
        """Broadcast a message to all subscribers of a topic."""
        if topic not in self.subscriptions:
            return

        message_json = json.dumps(message)
        for user_id in self.subscriptions[topic]:
            if user_id in self.active_connections:
                for websocket in self.active_connections[user_id]:
                    try:
                        await websocket.send_text(message_json)
                    except Exception as e:
                        logger.error(f"Error broadcasting to {user_id}: {e}")

    async def broadcast_to_symbol(
        self,
        message: Dict[str, Any],
        symbol: str,
    ):
        """Broadcast a message to all subscribers of a specific symbol."""
        if symbol not in self.symbol_subscriptions:
            return

        message_json = json.dumps(message)
        for user_id in self.symbol_subscriptions[symbol]:
            if user_id in self.active_connections:
                for websocket in self.active_connections[user_id]:
                    try:
                        await websocket.send_text(message_json)
                    except Exception as e:
                        logger.error(f"Error broadcasting symbol {symbol} to {user_id}: {e}")

    async def broadcast_all(self, message: Dict[str, Any]):
        """Broadcast a message to all connected clients."""
        message_json = json.dumps(message)

        # Authenticated users
        for user_id, websockets in self.active_connections.items():
            for websocket in websockets:
                try:
                    await websocket.send_text(message_json)
                except Exception as e:
                    logger.error(f"Error broadcasting to {user_id}: {e}")

        # Anonymous users
        for websocket in self.anonymous_connections:
            try:
                await websocket.send_text(message_json)
            except Exception as e:
                logger.error(f"Error broadcasting to anonymous: {e}")

    async def send_ping(self, websocket: WebSocket) -> bool:
        """Send ping to check connection health."""
        try:
            await websocket.send_json({"type": "ping", "timestamp": datetime.utcnow().isoformat()})
            return True
        except Exception:
            return False

    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics."""
        return {
            "authenticated_users": len(self.active_connections),
            "total_authenticated_connections": sum(
                len(conns) for conns in self.active_connections.values()
            ),
            "anonymous_connections": len(self.anonymous_connections),
            "subscriptions": {
                topic: len(subscribers)
                for topic, subscribers in self.subscriptions.items()
            },
            "symbol_subscriptions": len(self.symbol_subscriptions),
        }


# Global connection manager instance
manager = ConnectionManager()
