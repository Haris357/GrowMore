from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.portfolio import Portfolio, PortfolioHolding, PortfolioTransaction
from app.repositories.portfolio_repository import (
    PortfolioRepository,
    PortfolioHoldingRepository,
    PortfolioTransactionRepository,
)
from app.core.exceptions import NotFoundError, ValidationError, AuthorizationError


import uuid as _uuid

# Fixed namespace so gold/silver/crypto get stable synthetic holding_ids (holding_id is a NOT-NULL UUID).
_ASSET_NS = _uuid.UUID("6f1e7c00-0000-4000-8000-0000000000aa")


def _metal_holding_id(metal: str) -> str:
    return str(_uuid.uuid5(_ASSET_NS, f"metal:{metal.lower()}"))


def _crypto_holding_id(coin_id: str) -> str:
    return str(_uuid.uuid5(_ASSET_NS, f"crypto:{coin_id.lower()}"))


class PortfolioService:
    def __init__(self, db: Client):
        self.db = db
        self.portfolio_repo = PortfolioRepository(db)
        self.holding_repo = PortfolioHoldingRepository(db)
        self.transaction_repo = PortfolioTransactionRepository(db)

    async def get_portfolio_detail(self, portfolio_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """Full portfolio with LIVE prices across stocks, gold, silver and crypto."""
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")
        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to access this portfolio")

        rows = self.db.table("portfolio_holdings").select("*").eq("portfolio_id", str(portfolio_id)).execute().data or []

        # ── Gather live prices per asset type ──
        stock_ids = [r["holding_id"] for r in rows if r["holding_type"] == "stock"]
        coin_ids = [r.get("notes") for r in rows if r["holding_type"] == "crypto" and r.get("notes")]
        need_metals = any(r["holding_type"] in ("gold", "silver") for r in rows)

        stock_map: Dict[str, Any] = {}
        if stock_ids:
            sres = (
                self.db.table("stocks")
                .select("id, current_price, change_percentage, companies!inner(symbol, name, logo_url, sectors(name))")
                .in_("id", stock_ids).execute().data or []
            )
            stock_map = {s["id"]: s for s in sres}

        metals: Dict[str, Any] = {}
        usd_pkr = Decimal("280")
        if need_metals or coin_ids:
            from app.services.precious_metals_service import get_precious_metals_prices, _fetch_exchange_rate
            try:
                usd_pkr = await _fetch_exchange_rate()
            except Exception:
                pass
            if need_metals:
                try:
                    metals = await get_precious_metals_prices()
                except Exception:
                    metals = {}

        crypto_map: Dict[str, Any] = {}
        if coin_ids:
            from app.services.crypto_service import CryptoService
            try:
                res = await CryptoService().get_markets(page=1, per_page=250)
                for c in (res or {}).get("coins", []):
                    key = c.get("id") or c.get("coin_id")
                    if key:
                        crypto_map[key] = c
            except Exception:
                crypto_map = {}

        def _num(v, d=0.0):
            try:
                return float(v) if v not in (None, "") else d
            except (TypeError, ValueError):
                return d

        holdings_out: List[Dict[str, Any]] = []
        total_value = total_invested = today_pl = 0.0
        sectors: Dict[str, float] = {}

        for r in rows:
            htype = r["holding_type"]
            qty = _num(r.get("quantity"))
            avg = _num(r.get("avg_buy_price"))
            invested = _num(r.get("total_invested")) or (qty * avg)

            price = change_pct = 0.0
            symbol = name = logo = None
            sector = None

            if htype == "stock":
                s = stock_map.get(r["holding_id"]) or {}
                comp = s.get("companies") or {}
                price = _num(s.get("current_price"))
                change_pct = _num(s.get("change_percentage"))
                symbol, name, logo = comp.get("symbol"), comp.get("name"), comp.get("logo_url")
                sector = (comp.get("sectors") or {}).get("name") if isinstance(comp.get("sectors"), dict) else None
            elif htype in ("gold", "silver"):
                m = metals.get(htype) or {}
                price = _num(m.get("per_tola"))
                change_pct = _num(m.get("change_percentage"))
                symbol, name, sector = htype.upper(), htype.capitalize(), "Precious Metals"
            elif htype == "crypto":
                c = crypto_map.get(r.get("notes")) or {}
                price = _num(c.get("current_price")) * float(usd_pkr)  # USD → PKR
                change_pct = _num(c.get("price_change_percentage_24h"))
                symbol = (c.get("symbol") or "").upper()
                name, logo, sector = c.get("name"), c.get("image"), "Crypto"

            if price <= 0:
                price = avg  # fall back to cost basis if live price unavailable
            value = qty * price
            pl = value - invested
            pl_pct = (pl / invested * 100) if invested > 0 else 0.0
            prev_value = value / (1 + change_pct / 100) if change_pct else value
            today_pl += value - prev_value

            total_value += value
            total_invested += invested
            if sector:
                sectors[sector] = sectors.get(sector, 0.0) + value

            holdings_out.append({
                "holding_id": r["holding_id"],
                "holding_type": htype,
                "symbol": symbol,
                "name": name,
                "logo_url": logo,
                "sector": sector,
                "coin_id": r.get("notes") if htype == "crypto" else None,
                "quantity": qty,
                "avg_buy_price": avg,
                "current_price": price,
                "change_percentage": change_pct,
                "total_invested": invested,
                "current_value": value,
                "profit_loss": pl,
                "profit_loss_pct": pl_pct,
            })

        holdings_out.sort(key=lambda h: h["current_value"], reverse=True)
        unrealized = total_value - total_invested
        prev_total = total_value - today_pl
        return {
            "id": portfolio["id"],
            "name": portfolio.get("name"),
            "total_value": round(total_value, 2),
            "total_invested": round(total_invested, 2),
            "unrealized_pl": round(unrealized, 2),
            "unrealized_pl_pct": round(unrealized / total_invested * 100, 2) if total_invested > 0 else 0,
            "today_pl": round(today_pl, 2),
            "today_pl_pct": round(today_pl / prev_total * 100, 2) if prev_total > 0 else 0,
            "positions": len(holdings_out),
            "holdings": holdings_out,
            "sectors": sorted(
                [{"name": k, "value": round(v, 2), "pct": round(v / total_value * 100, 1) if total_value > 0 else 0}
                 for k, v in sectors.items()],
                key=lambda x: x["value"], reverse=True,
            ),
        }

    async def get_user_portfolio_overview(self, user_id: UUID) -> Dict[str, Any]:
        """Aggregate ALL of a user's portfolios with live prices — for the dashboard."""
        empty = {
            "total_value": 0.0, "total_invested": 0.0, "total_gain_loss": 0.0,
            "gain_loss_pct": 0.0, "today_pl": 0.0, "today_pl_pct": 0.0,
            "holdings_count": 0, "portfolios_count": 0,
        }
        try:
            portfolios = await self.portfolio_repo.get_user_portfolios(user_id)
        except Exception:
            return empty
        if not portfolios:
            return empty

        tv = ti = today = 0.0
        holdings = 0
        for p in portfolios:
            try:
                d = await self.get_portfolio_detail(p.id, user_id)
            except Exception:
                continue
            tv += d["total_value"]
            ti += d["total_invested"]
            today += d["today_pl"]
            holdings += d["positions"]

        gl = tv - ti
        prev = tv - today
        return {
            "total_value": round(tv, 2),
            "total_invested": round(ti, 2),
            "total_gain_loss": round(gl, 2),
            "gain_loss_pct": round(gl / ti * 100, 2) if ti > 0 else 0.0,
            "today_pl": round(today, 2),
            "today_pl_pct": round(today / prev * 100, 2) if prev > 0 else 0.0,
            "holdings_count": holdings,
            "portfolios_count": len(portfolios),
        }

    async def execute_trade(self, portfolio_id: UUID, user_id: UUID, data: Dict[str, Any]) -> Dict[str, Any]:
        """Record a buy/sell and update the holding (avg on buy, qty reduce + realized P&L on sell)."""
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")
        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to access this portfolio")

        htype = data["holding_type"]
        asset_id = str(data.get("asset_id") or "").strip()
        notes = None
        if htype == "stock":
            holding_id = asset_id
        elif htype in ("gold", "silver"):
            holding_id = _metal_holding_id(htype)
        elif htype == "crypto":
            holding_id = _crypto_holding_id(asset_id)
            notes = asset_id
        else:
            raise ValidationError("Invalid holding_type")

        ttype = (data.get("transaction_type") or "buy").lower()
        qty = Decimal(str(data["quantity"]))
        price = Decimal(str(data["price"]))
        fees = Decimal(str(data.get("fees") or 0))
        if qty <= 0 or price < 0:
            raise ValidationError("Quantity must be positive")
        total_amount = qty * price + (fees if ttype == "buy" else -fees)

        # Record the transaction
        self.db.table("portfolio_transactions").insert({
            "portfolio_id": str(portfolio_id), "holding_type": htype, "holding_id": holding_id,
            "transaction_type": ttype, "quantity": float(qty), "price": float(price),
            "total_amount": float(total_amount), "fees": float(fees), "notes": notes,
            "transaction_date": data.get("transaction_date") or datetime.utcnow().isoformat(),
        }).execute()

        # Update the holding
        existing = (
            self.db.table("portfolio_holdings").select("*")
            .eq("portfolio_id", str(portfolio_id)).eq("holding_type", htype).eq("holding_id", holding_id)
            .limit(1).execute().data
        )
        existing = existing[0] if existing else None

        if ttype == "buy":
            if existing:
                old_qty = Decimal(str(existing["quantity"]))
                old_inv = Decimal(str(existing["total_invested"]))
                new_qty = old_qty + qty
                new_inv = old_inv + qty * price + fees
                self.db.table("portfolio_holdings").update({
                    "quantity": float(new_qty), "total_invested": float(new_inv),
                    "avg_buy_price": float(new_inv / new_qty) if new_qty > 0 else 0,
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("id", existing["id"]).execute()
            else:
                self.db.table("portfolio_holdings").insert({
                    "portfolio_id": str(portfolio_id), "holding_type": htype, "holding_id": holding_id,
                    "quantity": float(qty), "avg_buy_price": float((qty * price + fees) / qty),
                    "total_invested": float(qty * price + fees), "notes": notes,
                }).execute()
        else:  # sell
            if not existing:
                raise ValidationError("You don't hold this asset")
            old_qty = Decimal(str(existing["quantity"]))
            if qty > old_qty:
                raise ValidationError("Cannot sell more than you hold")
            avg = Decimal(str(existing["avg_buy_price"]))
            new_qty = old_qty - qty
            if new_qty <= 0:
                self.db.table("portfolio_holdings").delete().eq("id", existing["id"]).execute()
            else:
                self.db.table("portfolio_holdings").update({
                    "quantity": float(new_qty), "total_invested": float(avg * new_qty),
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("id", existing["id"]).execute()

        return {"success": True, "holding_type": htype, "transaction_type": ttype}

    async def get_user_portfolios(self, user_id: UUID) -> List[Portfolio]:
        return await self.portfolio_repo.get_user_portfolios(user_id)

    async def get_portfolio_by_id(self, portfolio_id: UUID, user_id: UUID) -> Dict[str, Any]:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to access this portfolio")

        holdings = await self.holding_repo.get_portfolio_holdings(portfolio_id)

        total_invested = sum(h.total_invested for h in holdings)
        current_value = sum(h.current_value or h.total_invested for h in holdings)
        profit_loss = current_value - total_invested
        profit_loss_percentage = (profit_loss / total_invested * 100) if total_invested > 0 else Decimal("0")

        return {
            **portfolio,
            "holdings": holdings,
            "profit_loss": profit_loss,
            "profit_loss_percentage": profit_loss_percentage,
        }

    async def create_portfolio(self, user_id: UUID, data: Dict[str, Any]) -> Portfolio:
        portfolios = await self.portfolio_repo.get_user_portfolios(user_id)

        if data.get("is_default", False) and portfolios:
            await self.portfolio_repo.set_default(user_id, None)
        elif not portfolios:
            data["is_default"] = True

        data["user_id"] = str(user_id)
        result = await self.portfolio_repo.create(data)
        return Portfolio(**result)

    async def update_portfolio(
        self, portfolio_id: UUID, user_id: UUID, data: Dict[str, Any]
    ) -> Portfolio:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to update this portfolio")

        if data.get("is_default", False):
            await self.portfolio_repo.set_default(user_id, portfolio_id)
            data.pop("is_default", None)

        data["updated_at"] = datetime.utcnow().isoformat()
        result = await self.portfolio_repo.update(portfolio_id, data)
        return Portfolio(**result)

    async def delete_portfolio(self, portfolio_id: UUID, user_id: UUID) -> bool:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to delete this portfolio")

        return await self.portfolio_repo.delete(portfolio_id)

    async def add_holding(
        self, portfolio_id: UUID, user_id: UUID, data: Dict[str, Any]
    ) -> PortfolioHolding:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this portfolio")

        existing = await self.holding_repo.get_holding_by_asset(
            portfolio_id, data["holding_type"], data["holding_id"]
        )

        if existing:
            new_quantity = existing.quantity + data["quantity"]
            new_total_invested = existing.total_invested + (data["quantity"] * data["avg_buy_price"])
            new_avg_price = new_total_invested / new_quantity

            updated = await self.holding_repo.update_holding(existing.id, {
                "quantity": float(new_quantity),
                "avg_buy_price": float(new_avg_price),
                "total_invested": float(new_total_invested),
            })
            return updated

        data["portfolio_id"] = str(portfolio_id)
        data["total_invested"] = float(data["quantity"] * data["avg_buy_price"])
        data["quantity"] = float(data["quantity"])
        data["avg_buy_price"] = float(data["avg_buy_price"])
        data["holding_id"] = str(data["holding_id"])

        result = await self.holding_repo.create(data)
        return PortfolioHolding(**result)

    async def update_holding(
        self, portfolio_id: UUID, holding_id: UUID, user_id: UUID, data: Dict[str, Any]
    ) -> PortfolioHolding:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this portfolio")

        holding = await self.holding_repo.get_by_id(holding_id)
        if not holding or str(holding["portfolio_id"]) != str(portfolio_id):
            raise NotFoundError("Holding")

        if "quantity" in data and "avg_buy_price" in data:
            data["total_invested"] = float(data["quantity"] * data["avg_buy_price"])

        result = await self.holding_repo.update_holding(holding_id, data)
        return result

    async def remove_holding(
        self, portfolio_id: UUID, holding_id: UUID, user_id: UUID
    ) -> bool:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this portfolio")

        return await self.holding_repo.delete(holding_id)

    async def record_transaction(
        self, portfolio_id: UUID, user_id: UUID, data: Dict[str, Any]
    ) -> PortfolioTransaction:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this portfolio")

        data["portfolio_id"] = str(portfolio_id)
        data["total_amount"] = float(data["quantity"] * data["price"] + data.get("fees", 0))
        data["holding_id"] = str(data["holding_id"])
        data["quantity"] = float(data["quantity"])
        data["price"] = float(data["price"])
        data["fees"] = float(data.get("fees", 0))

        result = await self.transaction_repo.create(data)
        return PortfolioTransaction(**result)

    async def get_transactions(
        self, portfolio_id: UUID, user_id: UUID, page: int = 1, page_size: int = 20
    ) -> Dict[str, Any]:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to access this portfolio")

        return await self.transaction_repo.get_portfolio_transactions(portfolio_id, page, page_size)

    async def get_performance(self, portfolio_id: UUID, user_id: UUID) -> Dict[str, Any]:
        portfolio_data = await self.get_portfolio_by_id(portfolio_id, user_id)
        holdings = portfolio_data.get("holdings", [])

        asset_allocation = {"stock": Decimal("0"), "commodity": Decimal("0")}
        best_performer = None
        worst_performer = None
        best_pct = Decimal("-9999999")
        worst_pct = Decimal("9999999")

        for holding in holdings:
            asset_allocation[holding.holding_type] += holding.current_value or holding.total_invested

            pct = holding.profit_loss_percentage or Decimal("0")
            if pct > best_pct:
                best_pct = pct
                best_performer = holding
            if pct < worst_pct:
                worst_pct = pct
                worst_performer = holding

        return {
            "portfolio_id": portfolio_id,
            "total_invested": portfolio_data["total_invested"],
            "current_value": portfolio_data["current_value"],
            "profit_loss": portfolio_data["profit_loss"],
            "profit_loss_percentage": portfolio_data["profit_loss_percentage"],
            "holdings_count": len(holdings),
            "best_performer": best_performer,
            "worst_performer": worst_performer,
            "asset_allocation": {k: float(v) for k, v in asset_allocation.items()},
        }
