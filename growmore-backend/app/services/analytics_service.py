from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID
from collections import defaultdict

from supabase import Client

from app.repositories.stock_repository import StockRepository
from app.repositories.commodity_repository import CommodityRepository
from app.repositories.portfolio_repository import PortfolioRepository, PortfolioHoldingRepository


class AnalyticsService:
    def __init__(self, db: Client):
        self.db = db
        self.stock_repo = StockRepository(db)
        self.commodity_repo = CommodityRepository(db)
        self.portfolio_repo = PortfolioRepository(db)
        self.holding_repo = PortfolioHoldingRepository(db)

    async def get_market_overview(self, market_id: UUID) -> Dict[str, Any]:
        top_gainers = await self.stock_repo.get_top_gainers(market_id, limit=5)
        top_losers = await self.stock_repo.get_top_losers(market_id, limit=5)
        most_active = await self.stock_repo.get_most_active(market_id, limit=5)

        stocks_result = await self.stock_repo.get_stocks_with_companies(
            market_id=market_id, page=1, page_size=1000
        )
        stocks = stocks_result.get("items", [])

        total_market_cap = sum(s.get("market_cap", 0) or 0 for s in stocks)
        advancing = sum(1 for s in stocks if (s.get("change_percentage") or 0) > 0)
        declining = sum(1 for s in stocks if (s.get("change_percentage") or 0) < 0)
        unchanged = len(stocks) - advancing - declining

        return {
            "market_id": str(market_id),
            "total_stocks": len(stocks),
            "total_market_cap": total_market_cap,
            "advancing": advancing,
            "declining": declining,
            "unchanged": unchanged,
            "top_gainers": top_gainers[:5],
            "top_losers": top_losers[:5],
            "most_active": most_active[:5],
            "as_of": datetime.utcnow(),
        }

    async def get_sector_performance(self, market_id: UUID) -> List[Dict[str, Any]]:
        result = self.db.table("sectors").select("id, name, code").eq(
            "market_id", str(market_id)
        ).execute()

        sectors = result.data or []
        sector_performance = []

        for sector in sectors:
            stocks_result = await self.stock_repo.get_stocks_with_companies(
                market_id=market_id,
                sector_id=sector["id"],
                page=1,
                page_size=1000,
            )
            stocks = stocks_result.get("items", [])

            if not stocks:
                continue

            total_change = sum(s.get("change_percentage", 0) or 0 for s in stocks)
            avg_change = total_change / len(stocks) if stocks else 0
            total_volume = sum(s.get("volume", 0) or 0 for s in stocks)
            total_market_cap = sum(s.get("market_cap", 0) or 0 for s in stocks)

            sector_performance.append({
                "sector_id": sector["id"],
                "sector_name": sector["name"],
                "sector_code": sector.get("code"),
                "stocks_count": len(stocks),
                "avg_change_percentage": avg_change,
                "total_volume": total_volume,
                "total_market_cap": total_market_cap,
            })

        sector_performance.sort(key=lambda x: x["avg_change_percentage"], reverse=True)
        return sector_performance

    async def get_portfolio_summary(self, user_id: UUID) -> Dict[str, Any]:
        portfolios = await self.portfolio_repo.get_user_portfolios(user_id)

        total_invested = Decimal("0")
        total_current_value = Decimal("0")
        total_holdings = 0

        asset_allocation = {"stock": Decimal("0"), "commodity": Decimal("0"), "bank_product": Decimal("0")}

        for portfolio in portfolios:
            total_invested += portfolio.total_invested
            total_current_value += portfolio.current_value

            holdings = await self.holding_repo.get_portfolio_holdings(portfolio.id)
            total_holdings += len(holdings)

            for holding in holdings:
                value = holding.current_value or holding.total_invested
                asset_allocation[holding.holding_type] += value

        profit_loss = total_current_value - total_invested
        profit_loss_percentage = (profit_loss / total_invested * 100) if total_invested > 0 else Decimal("0")

        return {
            "portfolios_count": len(portfolios),
            "total_holdings": total_holdings,
            "total_invested": float(total_invested),
            "current_value": float(total_current_value),
            "profit_loss": float(profit_loss),
            "profit_loss_percentage": float(profit_loss_percentage),
            "asset_allocation": {k: float(v) for k, v in asset_allocation.items()},
        }

    async def compare_assets(
        self, asset_type: str, asset_ids: List[UUID]
    ) -> List[Dict[str, Any]]:
        results = []

        for asset_id in asset_ids:
            if asset_type == "stock":
                stock = await self.stock_repo.get_by_id(asset_id)
                if stock:
                    results.append({
                        "id": str(asset_id),
                        "type": "stock",
                        "current_price": stock.get("current_price"),
                        "change_percentage": stock.get("change_percentage"),
                        "volume": stock.get("volume"),
                        "market_cap": stock.get("market_cap"),
                    })
            elif asset_type == "commodity":
                commodity = await self.commodity_repo.get_by_id(asset_id)
                if commodity:
                    results.append({
                        "id": str(asset_id),
                        "type": "commodity",
                        "name": commodity.get("name"),
                        "current_price": commodity.get("current_price"),
                        "change_percentage": commodity.get("change_percentage"),
                    })

        return results

    # ==================== Advanced Analytics ====================

    async def get_comprehensive_market_overview(self) -> Dict[str, Any]:
        """Get comprehensive market overview for dashboard."""
        try:
            # Market stats
            stocks_result = self.db.table("stocks").select(
                "symbol,name,current_price,change_amount,change_percentage,volume,sector"
            ).execute()
            stocks = stocks_result.data or []

            advancing = sum(1 for s in stocks if float(s.get("change_percentage", 0) or 0) > 0)
            declining = sum(1 for s in stocks if float(s.get("change_percentage", 0) or 0) < 0)
            unchanged = len(stocks) - advancing - declining

            total_volume = sum(int(s.get("volume", 0) or 0) for s in stocks)
            total_value = sum(
                float(s.get("volume", 0) or 0) * float(s.get("current_price", 0) or 0)
                for s in stocks
            )

            # Top movers
            sorted_by_change = sorted(stocks, key=lambda x: float(x.get("change_percentage", 0) or 0), reverse=True)
            top_gainers = sorted_by_change[:5]
            top_losers = sorted_by_change[-5:][::-1]

            # Most active
            most_active = sorted(stocks, key=lambda x: int(x.get("volume", 0) or 0), reverse=True)[:5]

            # Sector performance
            sector_data = defaultdict(list)
            for stock in stocks:
                sector = stock.get("sector", "Other") or "Other"
                change = float(stock.get("change_percentage", 0) or 0)
                sector_data[sector].append(change)

            sector_performance = []
            for sector, changes in sector_data.items():
                avg_change = sum(changes) / len(changes) if changes else 0
                sector_performance.append({
                    "sector": sector,
                    "avg_change_pct": round(avg_change, 2),
                    "stock_count": len(changes),
                    "advancing": sum(1 for c in changes if c > 0),
                    "declining": sum(1 for c in changes if c < 0),
                })
            sector_performance.sort(key=lambda x: x["avg_change_pct"], reverse=True)

            # Indices
            indices_result = self.db.table("market_indices").select("*").execute()
            indices = indices_result.data or []

            # Commodities
            commodities_result = self.db.table("commodities").select(
                "symbol,name,current_price,change_percentage,unit"
            ).execute()
            commodities = commodities_result.data or []

            return {
                "market_stats": {
                    "total_stocks": len(stocks),
                    "advancing": advancing,
                    "declining": declining,
                    "unchanged": unchanged,
                    "advance_decline_ratio": round(advancing / max(declining, 1), 2),
                    "total_volume": total_volume,
                    "total_value": round(total_value, 2),
                    "market_breadth": "bullish" if advancing > declining else "bearish" if declining > advancing else "neutral",
                },
                "indices": indices,
                "top_gainers": top_gainers,
                "top_losers": top_losers,
                "most_active": most_active,
                "sector_performance": sector_performance,
                "commodities": commodities,
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            return {"error": str(e)}

    async def get_portfolio_analytics(
        self,
        user_id: str,
        portfolio_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get comprehensive portfolio analytics."""
        try:
            # Get holdings
            query = self.db.table("holdings").select(
                "*, stocks(symbol, name, sector, current_price, change_percentage)"
            ).eq("user_id", user_id)

            if portfolio_id:
                query = query.eq("portfolio_id", portfolio_id)

            result = query.execute()
            holdings = []

            for h in (result.data or []):
                stock = h.get("stocks", {}) or {}
                quantity = int(h.get("quantity", 0))
                avg_price = float(h.get("average_price", 0))
                current_price = float(stock.get("current_price", avg_price))

                total_invested = quantity * avg_price
                current_value = quantity * current_price
                gain_loss = current_value - total_invested
                gain_loss_pct = (gain_loss / total_invested * 100) if total_invested > 0 else 0

                holdings.append({
                    "id": h.get("id"),
                    "symbol": h.get("symbol"),
                    "name": stock.get("name"),
                    "sector": stock.get("sector"),
                    "quantity": quantity,
                    "average_price": avg_price,
                    "current_price": current_price,
                    "total_invested": round(total_invested, 2),
                    "current_value": round(current_value, 2),
                    "gain_loss": round(gain_loss, 2),
                    "gain_loss_pct": round(gain_loss_pct, 2),
                    "day_change_pct": float(stock.get("change_percentage", 0) or 0),
                })

            if not holdings:
                return {
                    "message": "No holdings found",
                    "summary": {"total_value": 0, "total_invested": 0},
                }

            # Calculate metrics
            total_value = sum(h["current_value"] for h in holdings)
            total_invested = sum(h["total_invested"] for h in holdings)
            total_gain_loss = total_value - total_invested
            gain_loss_pct = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0

            # Asset allocation
            allocation = []
            for h in holdings:
                pct = (h["current_value"] / total_value * 100) if total_value > 0 else 0
                allocation.append({
                    "symbol": h["symbol"],
                    "name": h.get("name"),
                    "value": h["current_value"],
                    "percentage": round(pct, 2),
                })
            allocation.sort(key=lambda x: x["percentage"], reverse=True)

            # Sector breakdown
            sectors = defaultdict(lambda: {"value": 0, "count": 0})
            for h in holdings:
                sector = h.get("sector", "Other") or "Other"
                sectors[sector]["value"] += h["current_value"]
                sectors[sector]["count"] += 1

            sector_breakdown = []
            for sector, data in sectors.items():
                pct = (data["value"] / total_value * 100) if total_value > 0 else 0
                sector_breakdown.append({
                    "sector": sector,
                    "value": round(data["value"], 2),
                    "percentage": round(pct, 2),
                    "holdings_count": data["count"],
                })
            sector_breakdown.sort(key=lambda x: x["percentage"], reverse=True)

            # Risk metrics
            max_holding_pct = max(
                (h["current_value"] / total_value * 100) if total_value > 0 else 0
                for h in holdings
            )
            unique_sectors = len(set(h.get("sector", "Other") for h in holdings))
            diversification = min(100, unique_sectors * 15 + len(holdings) * 5)

            if diversification < 30:
                risk_level = "high"
            elif diversification < 60:
                risk_level = "moderate"
            else:
                risk_level = "low"

            # Top performers
            sorted_by_gain = sorted(holdings, key=lambda x: x["gain_loss_pct"], reverse=True)

            return {
                "summary": {
                    "total_value": round(total_value, 2),
                    "total_invested": round(total_invested, 2),
                    "total_gain_loss": round(total_gain_loss, 2),
                    "gain_loss_percentage": round(gain_loss_pct, 2),
                    "holdings_count": len(holdings),
                },
                "allocation": allocation,
                "sector_breakdown": sector_breakdown,
                "risk_metrics": {
                    "concentration_risk": round(max_holding_pct, 2),
                    "diversification_score": round(diversification, 1),
                    "unique_sectors": unique_sectors,
                    "risk_level": risk_level,
                },
                "top_performers": sorted_by_gain[:5],
                "worst_performers": sorted_by_gain[-5:][::-1] if len(sorted_by_gain) >= 5 else sorted_by_gain[::-1][:5],
                "holdings": holdings,
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            return {"error": str(e)}

    async def get_dashboard_summary(self, user_id: str) -> Dict[str, Any]:
        """Get complete dashboard summary for a user."""
        try:
            # Portfolio summary
            portfolio = await self.get_portfolio_analytics(user_id)

            # Market overview (condensed)
            market = await self.get_comprehensive_market_overview()

            # Goals summary
            from app.services.goals_service import GoalsService
            goals_service = GoalsService()
            goals = await goals_service.get_goals_summary(user_id)

            # Recent notifications count
            from app.services.notification_service import NotificationService
            notif_service = NotificationService()
            unread_count = await notif_service.get_unread_count(user_id)
            alerts = await notif_service.get_user_alerts(user_id, active_only=True)

            return {
                "portfolio": {
                    "total_value": portfolio.get("summary", {}).get("total_value", 0),
                    "total_gain_loss": portfolio.get("summary", {}).get("total_gain_loss", 0),
                    "gain_loss_pct": portfolio.get("summary", {}).get("gain_loss_percentage", 0),
                    "holdings_count": portfolio.get("summary", {}).get("holdings_count", 0),
                },
                "market": {
                    "indices": market.get("indices", [])[:3],
                    "breadth": market.get("market_stats", {}).get("market_breadth", "neutral"),
                },
                "goals": {
                    "active": goals.get("active_goals", 0),
                    "achieved": goals.get("achieved_goals", 0),
                    "overall_progress": goals.get("overall_progress_percentage", 0),
                },
                "notifications": {
                    "unread_count": unread_count,
                    "active_alerts": len(alerts),
                },
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            return {"error": str(e)}
