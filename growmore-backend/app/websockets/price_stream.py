"""
Price Streaming WebSocket Manager.
Real-time stock and commodity price updates.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.websockets.connection_manager import manager

logger = logging.getLogger(__name__)


class PriceStreamManager:
    """
    Manages real-time price streaming.

    Features:
    - Stock price updates from PSX
    - Gold/Silver price updates
    - Market index updates (KSE-100, KMI-30)
    - Configurable update frequency
    """

    def __init__(self):
        self.is_streaming = False
        self.stream_task: Optional[asyncio.Task] = None
        self.update_interval = 5  # seconds
        self.last_prices: Dict[str, Dict[str, Any]] = {}

    async def start_streaming(self):
        """Start the price streaming background task."""
        if self.is_streaming:
            return

        self.is_streaming = True
        self.stream_task = asyncio.create_task(self._stream_loop())
        logger.info("Price streaming started")

    async def stop_streaming(self):
        """Stop the price streaming background task."""
        self.is_streaming = False
        if self.stream_task:
            self.stream_task.cancel()
            try:
                await self.stream_task
            except asyncio.CancelledError:
                pass
        logger.info("Price streaming stopped")

    async def _stream_loop(self):
        """Main streaming loop."""
        while self.is_streaming:
            try:
                # Fetch latest prices
                prices = await self._fetch_latest_prices()

                # Find changed prices
                changed = self._get_changed_prices(prices)

                if changed:
                    # Broadcast to subscribers
                    await self._broadcast_prices(changed)

                # Update cache
                self.last_prices = prices

                await asyncio.sleep(self.update_interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in price stream: {e}")
                await asyncio.sleep(self.update_interval)

    async def _fetch_latest_prices(self) -> Dict[str, Dict[str, Any]]:
        """
        Fetch latest prices from database.

        In production, this would query the stocks table for latest prices.
        """
        from app.db.supabase import get_supabase_service_client

        prices = {}

        try:
            db = get_supabase_service_client()

            # Fetch stock prices
            result = db.table("stocks").select(
                "symbol,current_price,change_amount,change_percentage,volume,updated_at"
            ).execute()

            for stock in (result.data or []):
                prices[stock["symbol"]] = {
                    "type": "stock",
                    "symbol": stock["symbol"],
                    "price": stock["current_price"],
                    "change": stock["change_amount"],
                    "change_pct": stock["change_percentage"],
                    "volume": stock["volume"],
                    "timestamp": stock["updated_at"],
                }

            # Fetch commodity prices
            commodity_result = db.table("commodities").select(
                "symbol,name,current_price,change_amount,change_percentage,updated_at"
            ).execute()

            for commodity in (commodity_result.data or []):
                prices[commodity["symbol"]] = {
                    "type": "commodity",
                    "symbol": commodity["symbol"],
                    "name": commodity["name"],
                    "price": commodity["current_price"],
                    "change": commodity["change_amount"],
                    "change_pct": commodity["change_percentage"],
                    "timestamp": commodity["updated_at"],
                }

            # Fetch index data
            index_result = db.table("market_indices").select(
                "symbol,name,current_value,change_amount,change_percentage,updated_at"
            ).execute()

            for index in (index_result.data or []):
                prices[index["symbol"]] = {
                    "type": "index",
                    "symbol": index["symbol"],
                    "name": index["name"],
                    "value": index["current_value"],
                    "change": index["change_amount"],
                    "change_pct": index["change_percentage"],
                    "timestamp": index["updated_at"],
                }

        except Exception as e:
            logger.error(f"Error fetching prices: {e}")

        return prices

    def _get_changed_prices(
        self,
        new_prices: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Dict[str, Any]]:
        """Compare with cached prices to find changes."""
        changed = {}

        for symbol, data in new_prices.items():
            if symbol not in self.last_prices:
                changed[symbol] = data
            else:
                # Check if price changed
                old_price = self.last_prices[symbol].get("price") or self.last_prices[symbol].get("value")
                new_price = data.get("price") or data.get("value")
                if old_price != new_price:
                    changed[symbol] = data

        return changed

    async def _broadcast_prices(self, prices: Dict[str, Dict[str, Any]]):
        """Broadcast price updates to subscribers."""
        # Broadcast to general price subscribers
        await manager.broadcast_to_topic(
            {
                "type": "price_update",
                "data": list(prices.values()),
                "timestamp": datetime.utcnow().isoformat(),
            },
            topic="prices",
        )

        # Broadcast to symbol-specific subscribers
        for symbol, data in prices.items():
            await manager.broadcast_to_symbol(
                {
                    "type": "price_update",
                    "data": data,
                    "timestamp": datetime.utcnow().isoformat(),
                },
                symbol=symbol,
            )

    async def send_price_snapshot(
        self,
        user_id: str,
        symbols: Optional[List[str]] = None,
    ):
        """Send current prices to a specific user."""
        if symbols:
            data = {s: self.last_prices.get(s) for s in symbols if s in self.last_prices}
        else:
            data = self.last_prices

        await manager.send_personal_message(
            {
                "type": "price_snapshot",
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
            },
            user_id=user_id,
        )

    def get_latest_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get the latest cached price for a symbol."""
        return self.last_prices.get(symbol)


# Global price stream manager
price_stream = PriceStreamManager()
