"""
Data mappers — pure functions that convert API responses to Supabase-ready dicts.

PSX Terminal API fields → stocks/companies/stock_history columns.
DPS Portal data → same columns (same mapping as old unified scraper).
"""
from datetime import datetime, date
from typing import Any, Dict, Optional

from .dps_client import MarketWatchRow, CompanyFullData


def map_tick_to_stock_update(tick: dict) -> dict:
    """
    PSX Terminal /api/ticks/REG/{symbol} → stocks table update.

    Input: {price, change, changePercent, volume, high, low, ...}
    Output: {current_price, change_amount, change_percentage, volume, high_price, low_price, last_updated}
    """
    update: Dict[str, Any] = {"last_updated": datetime.utcnow().isoformat()}
    field_map = {
        "price": "current_price",
        "change": "change_amount",
        "changePercent": "change_percentage",
        "volume": "volume",
        "high": "high_price",
        "low": "low_price",
    }
    for src, dst in field_map.items():
        val = tick.get(src)
        if val is not None:
            update[dst] = val
    return update


def map_fundamentals_to_stock_update(fundamentals: dict) -> dict:
    """
    PSX Terminal /api/fundamentals/{symbol} → stocks table update.

    Input: {marketCap, peRatio, dividendYield, freeFloat, volume30Avg, ...}
    """
    result: Dict[str, Any] = {}
    mapping = {
        "peRatio": "pe_ratio",
        "dividendYield": "dividend_yield",
        "volume30Avg": "avg_volume",
    }
    for src, dst in mapping.items():
        val = fundamentals.get(src)
        if val is not None:
            if dst == "avg_volume":
                result[dst] = int(val)
            else:
                result[dst] = val

    # marketCap comes as string like "583.9B" — parse it
    market_cap_str = fundamentals.get("marketCap")
    if market_cap_str:
        parsed = _parse_market_cap_string(market_cap_str)
        if parsed is not None:
            result["market_cap"] = parsed

    # freeFloat comes as string like "439.5M"
    free_float_str = fundamentals.get("freeFloat")
    if free_float_str:
        parsed = _parse_market_cap_string(free_float_str)
        if parsed is not None:
            result["float_shares"] = int(parsed)

    return result


def map_company_to_updates(company: dict) -> tuple[dict, dict]:
    """
    PSX Terminal /api/companies/{symbol} → (company_update, stock_update).

    Input: {businessDescription, financialStats: {marketCap, shares, freeFloat, freeFloatPercent}, ...}
    """
    company_update: Dict[str, Any] = {}
    stock_update: Dict[str, Any] = {}

    desc = company.get("businessDescription")
    if desc:
        company_update["description"] = desc[:1000]

    stats = company.get("financialStats", {})
    if stats:
        if stats.get("marketCap") is not None:
            parsed = _parse_market_cap_string(str(stats["marketCap"]))
            if parsed is not None:
                stock_update["market_cap"] = parsed
        if stats.get("shares") is not None:
            try:
                stock_update["shares_outstanding"] = int(stats["shares"])
            except (ValueError, TypeError):
                pass
        if stats.get("freeFloat") is not None:
            try:
                stock_update["float_shares"] = int(stats["freeFloat"])
            except (ValueError, TypeError):
                pass

    return company_update, stock_update


def map_kline_to_history(kline: dict, stock_id: str) -> dict:
    """
    PSX Terminal /api/klines/{symbol}/1d → stock_history table row.

    Input: {timestamp (ms), open, high, low, close, volume}
    """
    ts = kline.get("timestamp", 0)
    dt = datetime.fromtimestamp(ts / 1000).date() if ts else date.today()

    return {
        "stock_id": stock_id,
        "date": dt.isoformat(),
        "open_price": kline.get("open"),
        "high_price": kline.get("high"),
        "low_price": kline.get("low"),
        "close_price": kline.get("close"),
        "volume": kline.get("volume"),
    }


def map_dividends_to_stock_update(dividends: list) -> dict:
    """
    PSX Terminal /api/dividends/{symbol} → stocks table update.

    Uses the most recent dividend amount as DPS.
    """
    if not dividends:
        return {}

    # Sort by ex_date descending to get latest
    sorted_divs = sorted(
        [d for d in dividends if d.get("amount") is not None],
        key=lambda d: d.get("ex_date", ""),
        reverse=True,
    )
    if not sorted_divs:
        return {}

    return {"dps": sorted_divs[0]["amount"]}


def map_market_watch_to_stock_update(row: MarketWatchRow) -> dict:
    """DPS market-watch row → stocks table update."""
    update: Dict[str, Any] = {"last_updated": datetime.utcnow().isoformat()}
    field_map = {
        "current_price": row.current_price,
        "open_price": row.open_price,
        "high_price": row.high_price,
        "low_price": row.low_price,
        "previous_close": row.previous_close,
        "change_amount": row.change_amount,
        "change_percentage": row.change_percentage,
        "volume": row.volume,
    }
    for col, val in field_map.items():
        if val is not None:
            update[col] = val
    return update


def map_market_watch_to_history(row: MarketWatchRow, stock_id: str) -> dict:
    """DPS market-watch row → stock_history table row."""
    return {
        "stock_id": stock_id,
        "date": date.today().isoformat(),
        "open_price": row.open_price,
        "high_price": row.high_price,
        "low_price": row.low_price,
        "close_price": row.current_price,
        "volume": row.volume,
    }


def map_company_full_to_updates(data: CompanyFullData) -> tuple[dict, dict]:
    """
    DPS company page full data → (company_update, stock_update).
    Same logic as old _save_company_full in unified_psx_scraper.
    """
    company_update: Dict[str, Any] = {}
    stock_update: Dict[str, Any] = {"last_updated": datetime.utcnow().isoformat()}

    # Company info
    if data.info.name and data.info.name != data.symbol:
        company_update["name"] = data.info.name
    if data.info.description:
        company_update["description"] = data.info.description

    fund = data.fundamentals
    ratios = data.ratios
    eq = data.equity

    fund_fields = {
        "market_cap": fund.market_cap or eq.market_cap,
        "pe_ratio": fund.pe_ratio,
        "pb_ratio": fund.pb_ratio,
        "ps_ratio": fund.ps_ratio,
        "peg_ratio": fund.peg_ratio,
        "ev_ebitda": fund.ev_ebitda,
        "eps": fund.eps,
        "book_value": fund.book_value,
        "dps": fund.dps,
        "dividend_yield": fund.dividend_yield,
        "shares_outstanding": fund.shares_outstanding or eq.shares_outstanding,
        "float_shares": fund.float_shares or eq.free_float_shares,
        "week_52_high": fund.week_52_high,
        "week_52_low": fund.week_52_low,
        "avg_volume": fund.avg_volume,
    }

    ratio_fields = {
        "roe": ratios.roe,
        "roa": ratios.roa,
        "roce": ratios.roce,
        "gross_margin": ratios.gross_margin,
        "operating_margin": ratios.operating_margin,
        "net_margin": ratios.net_margin,
        "profit_margin": ratios.profit_margin,
        "debt_to_equity": ratios.debt_to_equity,
        "debt_to_assets": ratios.debt_to_assets,
        "current_ratio": ratios.current_ratio,
        "quick_ratio": ratios.quick_ratio,
        "interest_coverage": ratios.interest_coverage,
        "revenue_growth": ratios.revenue_growth,
        "earnings_growth": ratios.earnings_growth,
        "profit_growth": ratios.profit_growth,
    }

    for k, v in {**fund_fields, **ratio_fields}.items():
        if v is not None:
            try:
                stock_update[k] = float(v) if not isinstance(v, int) else v
            except (ValueError, TypeError):
                pass

    return company_update, stock_update


# ── Helpers ──

def _parse_market_cap_string(value: str) -> Optional[float]:
    """Parse PSX Terminal market cap strings like '583.9B', '439.5M', '1.2T'."""
    if not value:
        return None
    s = str(value).strip().upper()
    for prefix in ["RS.", "RS", "PKR", "$"]:
        s = s.replace(prefix, "")
    s = s.strip()
    if not s or s in ("-", "--"):
        return None
    try:
        multiplier = 1
        if s.endswith("T"):
            s = s[:-1].strip()
            multiplier = 1e12
        elif s.endswith("B"):
            s = s[:-1].strip()
            multiplier = 1e9
        elif s.endswith("M"):
            s = s[:-1].strip()
            multiplier = 1e6
        elif s.endswith("K"):
            s = s[:-1].strip()
            multiplier = 1e3
        s = s.replace(",", "")
        return float(s) * multiplier
    except (ValueError, TypeError):
        return None
