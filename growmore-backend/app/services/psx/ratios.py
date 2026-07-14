"""
Compute derived financial ratios from stored financial statements.

The PSX Terminal fundamentals API is unavailable and DPS company pages don't
expose ROE / current ratio / leverage in a parseable form — but we DO have the
raw statement line items, so these ratios are computed here and written to the
stocks table (so the screener + detail view have complete fundamentals).

Statement figures are stored in thousands. Ratios that divide two statement
figures are scale-invariant (the thousands cancel); only market-cap-relative
ratios (fcf_yield) need scaling — market cap is absolute PKR.
"""
from typing import Any, Dict, List, Optional


def _num(v: Any) -> Optional[float]:
    if v is None or v == "":
        return None
    try:
        n = float(v)
        return n
    except (ValueError, TypeError):
        return None


def compute_ratios_from_financials(
    annual_desc: List[Dict[str, Any]],
    market_cap: Optional[float] = None,
) -> Dict[str, float]:
    """
    annual_desc: annual statement rows, latest fiscal year first.
    market_cap:  absolute PKR (for fcf_yield); statements are in thousands.
    Returns only the ratios that could be computed.
    """
    if not annual_desc:
        return {}

    cur = annual_desc[0]
    prev = annual_desc[1] if len(annual_desc) > 1 else None

    def g(row: Optional[Dict[str, Any]], key: str) -> Optional[float]:
        return _num(row.get(key)) if row else None

    revenue = g(cur, "revenue")
    net = g(cur, "net_income")
    equity = g(cur, "total_equity")
    assets = g(cur, "total_assets")
    cur_assets = g(cur, "current_assets")
    cur_liab = g(cur, "current_liabilities")
    total_liab = g(cur, "total_liabilities")
    op_income = g(cur, "operating_income")
    gross = g(cur, "gross_profit")
    interest = g(cur, "interest_expense")
    fcf = g(cur, "free_cash_flow")

    out: Dict[str, float] = {}

    def pct(n: Optional[float], d: Optional[float]) -> Optional[float]:
        return (n / d * 100) if (n is not None and d not in (None, 0)) else None

    def ratio(n: Optional[float], d: Optional[float]) -> Optional[float]:
        return (n / d) if (n is not None and d not in (None, 0)) else None

    def change(n: Optional[float], d: Optional[float]) -> Optional[float]:
        return ((n / d - 1) * 100) if (n is not None and d not in (None, 0)) else None

    capital_employed = (assets - cur_liab) if (assets is not None and cur_liab is not None) else None

    candidates = {
        "roe": pct(net, equity),
        "roa": pct(net, assets),
        "roce": pct(op_income, capital_employed),
        "gross_margin": pct(gross, revenue),
        "operating_margin": pct(op_income, revenue),
        "net_margin": pct(net, revenue),
        "debt_to_equity": ratio(total_liab, equity),
        "debt_to_assets": ratio(total_liab, assets),
        "current_ratio": ratio(cur_assets, cur_liab),
        "interest_coverage": ratio(op_income, abs(interest)) if interest else None,
    }
    if prev:
        candidates["revenue_growth"] = change(revenue, g(prev, "revenue"))
        candidates["earnings_growth"] = change(net, g(prev, "net_income"))
        candidates["profit_growth"] = change(net, g(prev, "net_income"))
    if market_cap and fcf is not None:
        candidates["fcf_yield"] = (fcf * 1000) / market_cap * 100  # fcf is in thousands

    for key, val in candidates.items():
        if val is not None:
            # guard against absurd blow-ups from tiny/near-zero denominators
            if abs(val) < 1e7:
                out[key] = round(val, 4)

    return out
