"""
Stock AI Analysis Service.
Generates a comprehensive AI-powered analysis for a single PSX stock by:
  1. Pulling fundamentals + recent price history + financials from the DB
  2. Sending a structured context to OpenAI (gpt-4o-mini)
  3. Returning a verdict + score + signals + thesis + inferred sentiment
Cached per-symbol for 6 hours so the drawer feels instant on repeat opens.
"""
import json
import logging
import time
from typing import Any, Dict, Optional
from uuid import UUID

from app.config.settings import settings
from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)

ANALYSIS_TTL = 6 * 60 * 60  # 6 hours
_cache: Dict[str, Dict[str, Any]] = {}


def _get_cached(key: str) -> Optional[Dict[str, Any]]:
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < ANALYSIS_TTL:
        return entry["data"]
    return None


def _set_cached(key: str, data: Dict[str, Any]) -> None:
    _cache[key] = {"data": data, "ts": time.time()}


def _safe_num(v: Any) -> Optional[float]:
    try:
        if v is None or v == "":
            return None
        return float(v)
    except (TypeError, ValueError):
        return None


def _fmt_money(v: Optional[float]) -> str:
    if v is None:
        return "N/A"
    av = abs(v)
    if av >= 1e9:
        return f"Rs. {v / 1e9:.2f}B"
    if av >= 1e7:
        return f"Rs. {v / 1e7:.2f}Cr"
    if av >= 1e5:
        return f"Rs. {v / 1e5:.2f}L"
    if av >= 1e3:
        return f"Rs. {v / 1e3:.2f}K"
    return f"Rs. {v:,.2f}"


def _fmt_pct(v: Optional[float]) -> str:
    return "N/A" if v is None else f"{v:.2f}%"


def _fmt_ratio(v: Optional[float], suffix: str = "") -> str:
    return "N/A" if v is None else f"{v:.2f}{suffix}"


async def _gather_context(stock_id: UUID) -> Dict[str, Any]:
    """Pull every data point we have on this stock from the DB."""
    db = get_supabase_service_client()

    # Stock row + company join
    stock_res = (
        db.table("stocks")
        .select(
            "*, companies!inner(symbol, name, logo_url, sectors(name))"
        )
        .eq("id", str(stock_id))
        .limit(1)
        .execute()
    )
    if not stock_res.data:
        raise ValueError("Stock not found")
    stock = stock_res.data[0]
    company = stock.get("companies") or {}
    sector_obj = company.get("sectors") or {}

    # Recent price history (last 30 daily points)
    history_res = (
        db.table("stock_history")
        .select("date,close_price,volume")
        .eq("stock_id", str(stock_id))
        .order("date", desc=True)
        .limit(30)
        .execute()
    )
    history = list(reversed(history_res.data or []))

    # Financial statements (last 4 annual)
    fin_res = (
        db.table("financial_statements")
        .select("*")
        .eq("stock_id", str(stock_id))
        .eq("period_type", "annual")
        .order("fiscal_year", desc=True)
        .limit(4)
        .execute()
    )
    annuals = fin_res.data or []

    # 52-week metrics from history
    week_52_high = max((_safe_num(h.get("close_price")) or 0) for h in history) if history else None
    week_52_low = min((_safe_num(h.get("close_price")) or 0) for h in history if _safe_num(h.get("close_price"))) if history else None

    return {
        "stock": stock,
        "company": company,
        "sector": (sector_obj.get("name") if isinstance(sector_obj, dict) else None) or "Unknown",
        "history": history,
        "annuals": annuals,
        "week_52_high": week_52_high,
        "week_52_low": week_52_low,
    }


def _build_prompt(ctx: Dict[str, Any]) -> str:
    s = ctx["stock"]
    c = ctx["company"]
    sector = ctx["sector"]
    annuals = ctx["annuals"]

    # Compact recent annuals string
    annual_lines = []
    for a in annuals[:4]:
        rev = _fmt_money(_safe_num(a.get("revenue")))
        ni = _fmt_money(_safe_num(a.get("net_income")))
        eps = _safe_num(a.get("eps"))
        annual_lines.append(
            f"  - FY{a.get('fiscal_year')}: Revenue {rev} · Net Income {ni} · EPS {eps if eps is not None else 'N/A'}"
        )
    annual_block = "\n".join(annual_lines) if annual_lines else "  (no annual financial data on file)"

    cur_price = _safe_num(s.get("current_price"))
    chg_pct = _safe_num(s.get("change_percentage"))
    pe = _safe_num(s.get("pe_ratio"))
    eps = _safe_num(s.get("eps"))
    roe = _safe_num(s.get("roe"))
    roa = _safe_num(s.get("roa"))
    de = _safe_num(s.get("debt_to_equity"))
    nm = _safe_num(s.get("net_margin"))
    gm = _safe_num(s.get("gross_margin"))
    om = _safe_num(s.get("operating_margin"))
    div = _safe_num(s.get("dividend_yield"))
    rg = _safe_num(s.get("revenue_growth"))
    eg = _safe_num(s.get("earnings_growth"))
    pb = _safe_num(s.get("pb_ratio"))
    mcap = _safe_num(s.get("market_cap"))
    vol = _safe_num(s.get("volume"))

    return f"""You are a senior PSX (Pakistan Stock Exchange) equity analyst. Produce a complete BUY/HOLD/SELL analysis for the stock below. Use ONLY the data I give you — do NOT invent numbers. Where a metric is missing, write "N/A" and exclude it from scoring.

═══ STOCK ═══
Symbol: {c.get('symbol')}
Name: {c.get('name')}
Sector: {sector}
Current Price: Rs. {cur_price if cur_price is not None else 'N/A'}
Day Change: {chg_pct if chg_pct is not None else 'N/A'}%
Market Cap: {_fmt_money(mcap)}
Volume: {int(vol) if vol else 'N/A'}

═══ FUNDAMENTALS ═══
P/E Ratio: {_fmt_ratio(pe, 'x')}
P/B Ratio: {_fmt_ratio(pb, 'x')}
EPS: {eps if eps is not None else 'N/A'}
ROE: {_fmt_pct(roe)}
ROA: {_fmt_pct(roa)}
Net Margin: {_fmt_pct(nm)}
Gross Margin: {_fmt_pct(gm)}
Operating Margin: {_fmt_pct(om)}
Debt/Equity: {_fmt_ratio(de)}
Dividend Yield: {_fmt_pct(div)}
Revenue Growth (YoY): {_fmt_pct(rg)}
Earnings Growth (YoY): {_fmt_pct(eg)}

═══ RECENT FINANCIALS (annual) ═══
{annual_block}

═══ RECENT PRICE ACTION ═══
30-day data points on file: {len(ctx['history'])}
Approx 52W High in window: Rs. {ctx['week_52_high'] or 'N/A'}
Approx 52W Low in window: Rs. {ctx['week_52_low'] or 'N/A'}

═══ TASK ═══
Produce a JSON object with this EXACT shape (no markdown, no extra fields, valid JSON only):

{{
  "verdict": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "AVOID",
  "score": <number 0-10>,
  "headline": "<single sentence reason for the verdict>",

  "fundamental_signals": [
    {{"name": "P/E Ratio", "value": "<formatted>", "status": "good" | "bad" | "neutral", "rationale": "<1 line>"}},
    {{"name": "ROE", "value": "<formatted>", "status": "...", "rationale": "..."}},
    {{"name": "Net Margin", "value": "...", "status": "...", "rationale": "..."}},
    {{"name": "Revenue Growth", "value": "...", "status": "...", "rationale": "..."}},
    {{"name": "EPS Growth", "value": "...", "status": "...", "rationale": "..."}},
    {{"name": "Debt/Equity", "value": "...", "status": "...", "rationale": "..."}},
    {{"name": "Dividend Yield", "value": "...", "status": "...", "rationale": "..."}}
  ],

  "technical_signals": {{
    "daily": "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell",
    "momentum": "Positive" | "Neutral" | "Negative",
    "trend": "<short description, e.g. 'Above 50-day MA' or 'Below trend'>",
    "rsi_zone": "Oversold" | "Neutral" | "Overbought",
    "near_52w": "<short description like 'Within 5% of 52W high' or '15% below 52W high'>"
  }},

  "social_sentiment": {{
    "overall": "BULLISH" | "MIXED" | "BEARISH" | "SILENT",
    "bullish_pct": <0-100>,
    "neutral_pct": <0-100>,
    "bearish_pct": <0-100>,
    "summary": "<2 sentence summary of how Pakistani retail/analysts likely view this stock right now, inferred from sector, valuation, and price action — be honest, mark inferences>",
    "sources": [
      {{"platform": "Reddit", "label": "r/PakistanStockExchange", "sentiment": "bullish" | "bearish" | "neutral", "quote": "<paraphrased opinion this community would likely express>"}},
      {{"platform": "X", "label": "FinTwit PK", "sentiment": "...", "quote": "..."}},
      {{"platform": "Blog", "label": "ksestocks / brecorder", "sentiment": "...", "quote": "..."}}
    ]
  }},

  "thesis": "<3-4 sentence investment thesis written plainly, mentioning sector context>",
  "reasons_to_buy": ["<reason 1>", "<reason 2>"],
  "risks": ["<risk 1>", "<risk 2>"],
  "catalysts": ["<upcoming catalyst or event to watch>"],
  "social_pulse": "<1 sentence on what the street is saying vs what fundamentals show>",
  "what_to_watch": "<1 sentence on the next event/data point that could move the stock>"
}}

IMPORTANT:
- Status must reflect THESE thresholds: P/E<15 good / >25 bad; ROE>15 good / <10 bad; Net Margin>10 good / <5 bad; Revenue Growth>5 good / <0 bad; EPS Growth >0 good / <0 bad; D/E<0.5 good / >1 bad; Div Yield>5 good / 0 bad
- bullish_pct + neutral_pct + bearish_pct must sum to 100
- For social_sentiment.sources: include 2-4 entries that reflect plausible Pakistani investor community views inferred from this stock's profile. Do not fabricate specific real handles or dates. Use generic community labels.
- score must reflect signal counts: ~1 point per green signal, half for neutral, 0 for red, plus +/- 1 from sentiment
- Be DIRECT and useful. No fluff. No disclaimers in JSON content (UI adds those).
"""


def _fallback_payload(ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Returned when OpenAI key missing or call fails — gives a usable shell."""
    s = ctx["stock"]
    c = ctx["company"]
    cur = _safe_num(s.get("current_price"))
    chg = _safe_num(s.get("change_percentage"))
    pe = _safe_num(s.get("pe_ratio"))
    roe = _safe_num(s.get("roe"))

    # Light heuristic verdict
    score = 5.0
    if pe is not None and pe > 0 and pe < 15:
        score += 1
    if roe is not None and roe > 15:
        score += 1
    if chg is not None and chg > 0:
        score += 0.5
    verdict = "BUY" if score >= 6 else "HOLD" if score >= 4 else "SELL"

    return {
        "verdict": verdict,
        "score": round(score, 1),
        "headline": f"{c.get('symbol')} fundamentals snapshot — AI commentary unavailable right now.",
        "fundamental_signals": [
            {"name": "P/E Ratio", "value": _fmt_ratio(pe, "x"), "status": "good" if pe and pe < 15 else "bad" if pe and pe > 25 else "neutral", "rationale": "Standard valuation check"},
            {"name": "ROE", "value": _fmt_pct(roe), "status": "good" if roe and roe > 15 else "bad" if roe and roe < 10 else "neutral", "rationale": "Return on equity"},
        ],
        "technical_signals": {
            "daily": "Neutral",
            "momentum": "Positive" if (chg or 0) > 0 else "Negative" if (chg or 0) < 0 else "Neutral",
            "trend": "Insufficient data",
            "rsi_zone": "Neutral",
            "near_52w": "N/A",
        },
        "social_sentiment": {
            "overall": "SILENT",
            "bullish_pct": 33, "neutral_pct": 34, "bearish_pct": 33,
            "summary": "Live social sentiment requires the AI commentary service.",
            "sources": [],
        },
        "thesis": "AI analysis temporarily unavailable. Fundamental snapshot shown is based on database metrics only.",
        "reasons_to_buy": [],
        "risks": ["AI commentary not available — review fundamentals manually."],
        "catalysts": [],
        "social_pulse": "Sentiment data unavailable.",
        "what_to_watch": "Refresh in a few minutes.",
        "_fallback": True,
    }


async def get_stock_ai_analysis(stock_id: UUID) -> Dict[str, Any]:
    """Generate (or return cached) AI analysis for a single stock."""
    cache_key = f"ai_{stock_id}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    try:
        ctx = await _gather_context(stock_id)
    except Exception as e:
        logger.error(f"AI analysis: failed to gather context for {stock_id}: {e}")
        return {
            "verdict": "HOLD",
            "score": 5.0,
            "headline": "Unable to load stock data for analysis.",
            "fundamental_signals": [],
            "technical_signals": {"daily": "Neutral", "momentum": "Neutral", "trend": "—", "rsi_zone": "Neutral", "near_52w": "—"},
            "social_sentiment": {"overall": "SILENT", "bullish_pct": 0, "neutral_pct": 100, "bearish_pct": 0, "summary": "No data.", "sources": []},
            "thesis": "Stock data is not available right now.",
            "reasons_to_buy": [], "risks": [], "catalysts": [],
            "social_pulse": "—", "what_to_watch": "—",
            "_fallback": True,
        }

    company = ctx["company"]
    payload_meta = {
        "symbol": company.get("symbol"),
        "company_name": company.get("name"),
        "sector": ctx["sector"],
        "logo_url": company.get("logo_url"),
        "current_price": _safe_num(ctx["stock"].get("current_price")),
        "change_percentage": _safe_num(ctx["stock"].get("change_percentage")),
        "market_cap": _safe_num(ctx["stock"].get("market_cap")),
        "week_52_high": ctx["week_52_high"],
        "week_52_low": ctx["week_52_low"],
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    if not settings.openai_api_key:
        result = _fallback_payload(ctx) | payload_meta
        _set_cached(cache_key, result)
        return result

    prompt = _build_prompt(ctx)

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)

        response = await client.chat.completions.create(
            model=settings.openai_model or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a senior PSX equity analyst. Respond ONLY with valid JSON matching the requested schema."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            max_tokens=1600,
            response_format={"type": "json_object"},
        )
        content = (response.choices[0].message.content or "").strip()
        analysis = json.loads(content)

        # Normalise pct sums
        ss = analysis.get("social_sentiment") or {}
        b, n, br = ss.get("bullish_pct", 0), ss.get("neutral_pct", 0), ss.get("bearish_pct", 0)
        total = (b or 0) + (n or 0) + (br or 0)
        if total and total != 100:
            ss["bullish_pct"] = round((b or 0) * 100 / total)
            ss["neutral_pct"] = round((n or 0) * 100 / total)
            ss["bearish_pct"] = 100 - ss["bullish_pct"] - ss["neutral_pct"]
            analysis["social_sentiment"] = ss

        result = analysis | payload_meta
        _set_cached(cache_key, result)
        return result

    except Exception as e:
        logger.error(f"AI analysis OpenAI call failed for {stock_id}: {e}")
        result = _fallback_payload(ctx) | payload_meta
        _set_cached(cache_key, result)
        return result
