"""
Simple Verdict — a plain-English "is this good to invest in?" view for
NON-TECHNICAL users, powered by live web search.

Why AI here (and not pure rules): our database has income-statement data
(revenue, net income, EPS, margins, growth) but NO balance-sheet data — debt,
equity, assets and cash flow are all empty. A rule-based score would therefore
be blind to whether a company is drowning in debt, which is exactly what a
beginner needs to know. So the model is asked to research the missing pieces on
the web and cite what it finds.

Grounding strategy: every figure we DO have is injected into the prompt as
authoritative ground truth, so the model never has to guess (or contradict) the
numbers the app already shows on screen. It researches only the gaps.

Falls back to a rules-only summary if the AI is unavailable, so the tab always
renders something useful.

IMPORTANT: this is a financial-health explainer, NOT investment advice.
"""
import logging
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
from uuid import UUID

from app.config.settings import settings
from app.db.supabase import get_supabase_service_client
from app.services.stock_insights_service import (
    _parse_json, _clean, _clean_list, _extract_sources,
)

logger = logging.getLogger(__name__)

VERDICT_TTL = 12 * 60 * 60  # 12 h — beginners re-open the same stock often
_cache: Dict[str, Dict[str, Any]] = {}

DISCLAIMER = (
    "This is an automated, plain-English summary of public information — not investment advice. "
    "It cannot predict the future. Always check the sources and consider speaking to a licensed "
    "financial advisor before investing."
)

VALID_STATUS = {"good", "ok", "weak", "unknown"}
BANDS = [
    (75, "Looks Strong", "positive", "A"),
    (60, "Looks Healthy", "positive", "B"),
    (45, "Mixed Picture", "neutral", "C"),
    (30, "Looks Weak", "negative", "D"),
    (0,  "High Risk", "negative", "E"),
]


def _band(score: int):
    for lo, verdict, tone, grade in BANDS:
        if score >= lo:
            return verdict, tone, grade
    return "High Risk", "negative", "E"


def _num(v) -> Optional[float]:
    try:
        return float(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _money(v: Optional[float]) -> str:
    if v is None:
        return "not available"
    a = abs(v)
    if a >= 1_000_000_000_000: return f"Rs {v/1_000_000_000_000:.2f} trillion"
    if a >= 1_000_000_000: return f"Rs {v/1_000_000_000:.2f} billion"
    if a >= 1_000_000: return f"Rs {v/1_000_000:.1f} million"
    return f"Rs {v:,.0f}"


_INLINE_CITE_RE = re.compile(r"\(\[([^\]]+)\]\((https?://[^)\s]+)\)\)")


def _sources(response: Any, parsed_json: Optional[Dict[str, Any]] = None) -> List[Dict[str, str]]:
    """
    Collect cited sources through three escalating strategies.

    In strict-JSON mode the Responses API is inconsistent about attaching
    url_citation annotations, and the model does not always emit inline
    ([outlet](url)) markup either — so we also ask it to declare the pages it
    visited as a "sources" field in its JSON. An empty list would undermine the
    whole point of the feature, so we take whichever strategy yields results.
    """
    out = _extract_sources(response)          # 1. API annotations (most reliable when present)
    if out:
        return out

    seen: set = set()
    collected: List[Dict[str, str]] = []

    def _add(url: str, label: str) -> None:
        clean = (url or "").strip().rstrip(".,;)")
        if not clean.startswith("http") or clean in seen:
            return
        seen.add(clean)
        host = urlparse(clean).netloc.replace("www.", "")
        collected.append({"title": (label or host).strip(), "url": clean, "outlet": host or label})

    # 2. inline markdown citations left in the raw text
    for outlet, url in _INLINE_CITE_RE.findall(getattr(response, "output_text", "") or ""):
        _add(url, outlet)

    # 3. the model's own declared "sources" array
    for s in ((parsed_json or {}).get("sources") or []):
        if isinstance(s, dict):
            _add(str(s.get("url", "")), str(s.get("outlet", "")))

    return collected


def _get_cached(key: str) -> Optional[Dict[str, Any]]:
    e = _cache.get(key)
    if e and (time.time() - e["ts"]) < VERDICT_TTL:
        return e["data"]
    return None


async def _context(stock_id: UUID) -> Dict[str, Any]:
    db = get_supabase_service_client()
    res = (
        db.table("stocks")
        .select("*, companies!inner(id, symbol, name, logo_url, sectors(name))")
        .eq("id", str(stock_id)).limit(1).execute()
    )
    if not res.data:
        raise ValueError("Stock not found")
    s = res.data[0]
    comp = s.get("companies") or {}
    sec = comp.get("sectors") or {}
    raw_name = comp.get("name") or ""
    non_compliant = "NON-COMPLIANT" in raw_name.upper()

    # Last 3 FULL years of income-statement history (real filed data we DO have).
    # Must filter to annual rows — the table also holds quarterly rows for the same
    # fiscal_year — and skip the current, still-incomplete fiscal year.
    hist = []
    try:
        import datetime as _dt
        this_year = _dt.date.today().year
        rows = (
            db.table("financial_statements")
            .select("fiscal_year, revenue, net_income, eps")
            .eq("company_id", comp.get("id"))
            .eq("period_type", "annual")
            .lt("fiscal_year", this_year)
            .order("fiscal_year", desc=True).limit(3).execute().data or []
        )
        seen = set()
        for r in rows:
            fy = r.get("fiscal_year")
            if fy in seen:
                continue
            seen.add(fy)
            # Values are filed in THOUSANDS of PKR — convert to absolute rupees.
            rev, ni = _num(r.get("revenue")), _num(r.get("net_income"))
            hist.append({
                "year": fy,
                "revenue": rev * 1000 if rev is not None else None,
                "net_income": ni * 1000 if ni is not None else None,
                "eps": _num(r.get("eps")),
            })
    except Exception as e:
        logger.debug(f"verdict: statement history unavailable: {e}")

    return {
        "symbol": comp.get("symbol"),
        "name": raw_name.replace("(NON-COMPLIANT)", "").replace("NON-COMPLIANT", "").strip(" -–—"),
        "logo_url": comp.get("logo_url"),
        "sector": (sec.get("name") if isinstance(sec, dict) else None) or "Unknown",
        "current_price": _num(s.get("current_price")),
        "change_percentage": _num(s.get("change_percentage")),
        "market_cap": _num(s.get("market_cap")),
        "pe_ratio": _num(s.get("pe_ratio")),
        "eps": _num(s.get("eps")),
        "net_margin": _num(s.get("net_margin")),
        "profit_growth": _num(s.get("profit_growth")),
        "revenue_growth": _num(s.get("revenue_growth")),
        "dividend_yield": _num(s.get("dividend_yield")),
        "week_52_high": _num(s.get("week_52_high")),
        "week_52_low": _num(s.get("week_52_low")),
        "shariah": "NON_COMPLIANT" if non_compliant else "COMPLIANT",
        "history": hist,
    }


def _known_figures(c: Dict[str, Any]) -> str:
    """Everything we can state as fact — the model must use these verbatim."""
    L = []
    if c["current_price"] is not None: L.append(f"- Current share price: Rs {c['current_price']:,.2f}")
    if c["change_percentage"] is not None: L.append(f"- Change today: {c['change_percentage']:+.2f}%")
    if c["market_cap"] is not None: L.append(f"- Market capitalisation: {_money(c['market_cap'])}")
    if c["pe_ratio"] is not None: L.append(f"- P/E ratio: {c['pe_ratio']:.2f}")
    if c["eps"] is not None: L.append(f"- Earnings per share (EPS): Rs {c['eps']:.2f}")
    if c["net_margin"] is not None: L.append(f"- Net profit margin: {c['net_margin']:.1f}%")
    if c["profit_growth"] is not None: L.append(f"- Profit growth vs last year: {c['profit_growth']:+.1f}%")
    if c["revenue_growth"] is not None: L.append(f"- Revenue growth vs last year: {c['revenue_growth']:+.1f}%")
    if c["dividend_yield"] is not None: L.append(f"- Dividend yield: {c['dividend_yield']:.2f}%")
    if c["week_52_high"] and c["week_52_low"]:
        L.append(f"- 52-week range: Rs {c['week_52_low']:,.2f} – Rs {c['week_52_high']:,.2f}")
    for h in c["history"]:
        if h["revenue"] or h["net_income"]:
            L.append(f"- FY{h['year']}: revenue {_money(h['revenue'])}, net income {_money(h['net_income'])}"
                     + (f", EPS Rs {h['eps']:.2f}" if h["eps"] is not None else ""))
    L.append(f"- PSX Shariah screening: {'NON-COMPLIANT' if c['shariah']=='NON_COMPLIANT' else 'Compliant'}")
    return "\n".join(L) if L else "- (no reliable figures on file)"


def _prompt(c: Dict[str, Any]) -> str:
    return (
        f"You are explaining the stock {c['symbol']} ({c['name']}), listed on the Pakistan Stock Exchange "
        f"in the {c['sector']} sector, to someone who knows NOTHING about investing.\n\n"

        "VERIFIED FIGURES FROM OUR DATABASE (treat these as fact, use them, never contradict them):\n"
        f"{_known_figures(c)}\n\n"

        "WHAT WE DO NOT HAVE — research these with web search:\n"
        "- How much debt the company carries (debt-to-equity, borrowings vs equity)\n"
        "- Balance-sheet strength (assets vs liabilities, ability to pay short-term bills)\n"
        "- Cash flow quality (is reported profit backed by real cash?)\n"
        "- Recent news, results, dividends, management or regulatory issues\n"
        "- Any analyst or brokerage view, and known risks facing this company or sector\n\n"

        "WRITING RULES — this is the most important part:\n"
        "1. Write for a complete beginner. NO jargon. If you must use a term like 'debt-to-equity', "
        "immediately explain it in everyday words (e.g. 'it owes Rs 2 for every Rs 1 the owners put in').\n"
        "2. Use simple money comparisons a Pakistani reader understands. Short sentences.\n"
        "3. Be honest and balanced. If the company looks risky, say so plainly. Do NOT hype.\n"
        "4. Never tell the reader to buy or sell. Describe the company's health and let them decide.\n"
        "5. Base claims on the verified figures above plus what you actually find. If you cannot verify "
        "something, set that check's status to \"unknown\" and say the data isn't available.\n"
        "6. You MUST actually use the web_search tool, and you MUST cite the real sources you find INLINE "
        "like ([outlet](url)) inside these specific fields: \"summary\", the \"answer\" of the debt check, "
        "and \"debt_findings.plain\". Cite at least 3 different sources. This is mandatory — a response with "
        "no inline citations is invalid. Even if you cannot find an exact debt figure, cite the pages you "
        "checked.\n\n"

        "Respond with ONLY a valid JSON object (no markdown fences) in exactly this shape:\n"
        "{\n"
        '  "score": <integer 0-100, overall financial health for a beginner>,\n'
        '  "scores": {\n'
        '    "profitability": <0-100>, "debt_safety": <0-100>, "growth": <0-100>,\n'
        '    "value_for_money": <0-100>, "dividend": <0-100>, "stability": <0-100>\n'
        "  },\n"
        '  "headline": "<one plain sentence, max 15 words, on how this company looks>",\n'
        '  "summary": "<3-4 short sentences in everyday language explaining the company and its health>",\n'
        '  "checks": [\n'
        '    {"question":"Is the company actually making money?","status":"good|ok|weak|unknown","answer":"<plain English, 1-2 sentences>"},\n'
        '    {"question":"Is it buried in debt?","status":"...","answer":"..."},\n'
        '    {"question":"Is the business growing?","status":"...","answer":"..."},\n'
        '    {"question":"Is the share price reasonable?","status":"...","answer":"..."},\n'
        '    {"question":"Does it pay you cash while you hold it?","status":"...","answer":"..."},\n'
        '    {"question":"How bumpy is the ride?","status":"...","answer":"..."}\n'
        "  ],\n"
        '  "debt_findings": {"debt_to_equity": <number or null>, "plain": "<what you found about its debt, '
        'in everyday words, with a citation>"},\n'
        '  "pros": ["<simple good point>", ...],\n'
        '  "cons": ["<simple concern>", ...],\n'
        '  "risk_level": "LOW" | "MEDIUM" | "HIGH",\n'
        '  "risk_note": "<one plain sentence on how risky this is for a beginner>",\n'
        '  "who_its_for": "<one sentence: what kind of person this suits, e.g. someone wanting steady dividends>",\n'
        '  "what_to_watch": "<one or two things a beginner should keep an eye on>",\n'
        '  "beginner_tips": ["<general, practical tip>", ...],\n'
        '  "sources": [{"outlet":"<site name>","url":"<full URL of a page you actually opened>"}, ...]\n'
        "}\n"
        "The \"sources\" array is REQUIRED and must list at least 3 real pages you actually visited while "
        "researching this company, with complete working URLs. They are shown to the reader as clickable "
        "links, so never invent a URL.\n"
        "The six numbers in \"scores\" are shown to the user as a chart, so they must be consistent with your "
        "written checks (a \"weak\" check must not get a high number). Use 0-100 where 100 is excellent. If you "
        "genuinely could not verify a category, give it 50 and say so in the matching check.\n"
        "Keep checks to exactly the 6 questions above, pros/cons to 2-4 items each, tips to 3-4 items."
    )


def _chart_data(c: Dict[str, Any], scores: Dict[str, int]) -> Dict[str, Any]:
    """Chart-ready numbers for the beginner tab (all from data we hold)."""
    # 3-year revenue / profit trend from real filed statements
    trend = []
    for h in sorted([x for x in c["history"] if x.get("year")], key=lambda x: x["year"]):
        if h.get("revenue") is None and h.get("net_income") is None:
            continue
        trend.append({
            "year": str(h["year"]),
            "revenue": round((h["revenue"] or 0) / 1_000_000, 1),      # millions
            "profit": round((h["net_income"] or 0) / 1_000_000, 1),
            "eps": h.get("eps"),
        })

    # where today's price sits in the 52-week range
    price_range = None
    hi, lo, px = c["week_52_high"], c["week_52_low"], c["current_price"]
    if hi and lo and px and hi > lo:
        price_range = {
            "low": lo, "high": hi, "current": px,
            "position": round((px - lo) / (hi - lo) * 100),
        }

    return {
        "score_breakdown": [
            {"label": "Profit",     "key": "profitability",   "value": scores.get("profitability", 50)},
            {"label": "Low Debt",   "key": "debt_safety",     "value": scores.get("debt_safety", 50)},
            {"label": "Growth",     "key": "growth",          "value": scores.get("growth", 50)},
            {"label": "Fair Price", "key": "value_for_money", "value": scores.get("value_for_money", 50)},
            {"label": "Dividend",   "key": "dividend",        "value": scores.get("dividend", 50)},
            {"label": "Stability",  "key": "stability",       "value": scores.get("stability", 50)},
        ],
        "financial_trend": trend,
        "price_range": price_range,
    }


def _rules_fallback(c: Dict[str, Any], reason: str) -> Dict[str, Any]:
    """Rules-only summary using the figures we hold, when AI is unavailable."""
    checks: List[Dict[str, Any]] = []
    score_parts: List[float] = []

    eps, nm = c["eps"], c["net_margin"]
    if eps is not None or nm is not None:
        good = (eps or 0) > 0 or (nm or 0) > 0
        checks.append({"question": "Is the company actually making money?",
                       "status": "good" if good else "weak",
                       "answer": (f"Yes — it earned about Rs {eps:.2f} per share." if good and eps is not None
                                  else "Yes, it is profitable." if good
                                  else "No — it is currently running at a loss.")})
        score_parts.append(1.0 if good else 0.15)

    g = c["profit_growth"] if c["profit_growth"] is not None else c["revenue_growth"]
    if g is not None:
        st = "good" if g >= 15 else "ok" if g >= 0 else "weak"
        checks.append({"question": "Is the business growing?", "status": st,
                       "answer": (f"It grew about {g:.0f}% versus last year." if g >= 0
                                  else f"It shrank about {abs(g):.0f}% versus last year.")})
        score_parts.append({"good": 1.0, "ok": 0.6, "weak": 0.15}[st])

    pe = c["pe_ratio"]
    if pe is not None and pe > 0:
        st = "good" if pe <= 12 else "ok" if pe <= 20 else "weak"
        checks.append({"question": "Is the share price reasonable?", "status": st,
                       "answer": f"You pay about Rs {pe:.0f} for every Rs 1 of yearly profit."})
        score_parts.append({"good": 1.0, "ok": 0.6, "weak": 0.15}[st])

    dy = c["dividend_yield"]
    if dy is not None:
        st = "good" if dy >= 5 else "ok"
        checks.append({"question": "Does it pay you cash while you hold it?", "status": st,
                       "answer": (f"Yes — about {dy:.1f}% a year in cash dividends." if dy > 0
                                  else "No dividend at present; profits are reinvested instead.")})
        score_parts.append({"good": 1.0, "ok": 0.6}[st])

    checks.append({"question": "Is it buried in debt?", "status": "unknown",
                   "answer": "We could not check this company's debt right now. This is an important gap — "
                             "please check its latest annual report before investing."})

    hi, lo = c["week_52_high"], c["week_52_low"]
    if hi and lo and lo > 0:
        swing = (hi - lo) / lo * 100
        st = "good" if swing < 40 else "ok" if swing < 90 else "weak"
        risk = "LOW" if swing < 40 else "MEDIUM" if swing < 90 else "HIGH"
        note = f"Over the past year the price moved about {swing:.0f}% between its low and high."
    else:
        st, risk, note = "unknown", "MEDIUM", "Not enough history to measure how bumpy this share is."
    checks.append({"question": "How bumpy is the ride?", "status": st, "answer": note})

    score = round(sum(score_parts) / len(score_parts) * 100) if score_parts else 40
    verdict, tone, grade = _band(score)
    return {
        **{k: c[k] for k in ("symbol", "name", "logo_url", "sector", "current_price",
                             "change_percentage", "shariah")},
        "score": score, "verdict": verdict, "tone": tone, "grade": grade,
        "headline": f"Based on the figures we hold, {c['symbol']} {verdict.lower()}.",
        "summary": (f"{reason} This summary uses only the financial figures stored in our database, so it "
                    "does not cover the company's debt or balance sheet. Treat it as incomplete."),
        "checks": checks, "pros": [], "cons": [],
        "risk_level": risk, "risk_note": note,
        "who_its_for": "", "what_to_watch": "Check the company's latest annual report for its debt levels.",
        "beginner_tips": [
            "Never invest money you might need soon — share prices go up and down.",
            "Spreading money across several companies lowers your risk.",
            "A cheap share is not automatically a good one.",
        ],
        "sources": [], "disclaimer": DISCLAIMER, "ai_powered": False,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


async def get_stock_verdict(stock_id: UUID, refresh: bool = False) -> Dict[str, Any]:
    key = f"verdict_{stock_id}"
    if not refresh:
        cached = _get_cached(key)
        if cached:
            return cached

    try:
        c = await _context(stock_id)
    except Exception as e:
        logger.error(f"verdict: context failed for {stock_id}: {e}")
        raise

    if not settings.openai_api_key:
        return _rules_fallback(c, "The AI service is not configured.")

    model = settings.openai_research_model or "gpt-4.1"
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.responses.create(
            model=model,
            tools=[{"type": "web_search"}],
            # Force the search: with rich figures already in the prompt the model
            # otherwise answers from memory and returns no citable sources.
            tool_choice={"type": "web_search"},
            input=_prompt(c),
            max_output_tokens=6000,
        )
        parsed = _parse_json(response.output_text or "")
        if not parsed:
            return _rules_fallback(c, "The AI could not produce a structured result this time.")

        try:
            score = max(0, min(100, int(parsed.get("score", 50))))
        except (TypeError, ValueError):
            score = 50
        verdict, tone, grade = _band(score)

        raw_scores = parsed.get("scores") or {}
        scores: Dict[str, int] = {}
        for k in ("profitability", "debt_safety", "growth", "value_for_money", "dividend", "stability"):
            try:
                scores[k] = max(0, min(100, int(raw_scores.get(k, 50))))
            except (TypeError, ValueError):
                scores[k] = 50

        checks = []
        for ch in (parsed.get("checks") or []):
            if not isinstance(ch, dict):
                continue
            st = str(ch.get("status", "unknown")).lower()
            checks.append({
                "question": _clean(ch.get("question", "")),
                "status": st if st in VALID_STATUS else "unknown",
                "answer": _clean(ch.get("answer", "")),
            })

        result = {
            **{k: c[k] for k in ("symbol", "name", "logo_url", "sector", "current_price",
                                 "change_percentage", "shariah")},
            "score": score, "verdict": verdict, "tone": tone, "grade": grade,
            "headline": _clean(parsed.get("headline", "")),
            "summary": _clean(parsed.get("summary", "")),
            "checks": checks,
            "pros": _clean_list(parsed.get("pros"))[:4],
            "cons": _clean_list(parsed.get("cons"))[:4],
            "risk_level": str(parsed.get("risk_level", "MEDIUM")).upper(),
            "risk_note": _clean(parsed.get("risk_note", "")),
            "who_its_for": _clean(parsed.get("who_its_for", "")),
            "what_to_watch": _clean(parsed.get("what_to_watch", "")),
            "beginner_tips": _clean_list(parsed.get("beginner_tips"))[:4],
            "debt_findings": {
                "debt_to_equity": _num((parsed.get("debt_findings") or {}).get("debt_to_equity")),
                "plain": _clean((parsed.get("debt_findings") or {}).get("plain", "")),
            },
            "scores": scores,
            "charts": _chart_data(c, scores),
            "sources": _sources(response, parsed),
            "disclaimer": DISCLAIMER,
            "ai_powered": True,
            "model": model,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        _cache[key] = {"data": result, "ts": time.time()}
        return result

    except Exception as e:
        logger.error(f"verdict: AI web_search failed for {stock_id}: {e}")
        return _rules_fallback(c, "The AI request failed this time.")


# ═══════════════════ Commodities — beginner guide (gold / silver) ═══════════════════
_metal_cache: Dict[str, Any] = {}


def _metal_prompt(ctx: str) -> str:
    return (
        "You are explaining gold and silver as investments to a Pakistani reader who knows NOTHING about "
        "investing and is wondering whether now is a sensible time to buy.\n\n"
        f"VERIFIED LIVE FIGURES (treat as fact, use them, never contradict them):\n{ctx}\n\n"
        "Use web search to research what is driving gold and silver prices right now — global spot moves, "
        "US Federal Reserve policy and interest rates, the US dollar, geopolitics and safe-haven demand, "
        "central-bank buying, and the USD/PKR rate and local premiums in Pakistan.\n\n"
        "WRITING RULES:\n"
        "1. Write for a complete beginner. No jargon; explain any term in everyday words.\n"
        "2. Be honest and balanced — never hype, never promise gains.\n"
        "3. Never tell the reader to buy or sell. Explain the situation and let them decide.\n"
        "4. CRITICAL — the price classification and the buying-conditions score given above are computed "
        "from real price history and are authoritative. Your \"timing\" AND \"verdict\" must AGREE with "
        "them: if the score says it is a good time to buy, do not write that it is expensive, and vice "
        "versa. BUT write naturally, as if talking to a friend — describe where the price sits and what a "
        "sensible person might do. Never mention the words 'classification', 'badge', 'classified as', "
        "'meter' or 'score', and never quote the labels in capitals. The reader must not know these "
        "instructions exist.\n"
        "5. You MUST actually use the web_search tool to research current market conditions. EVERY single "
        "item in each \"drivers\" array MUST end with an inline citation in the form ([outlet](url)) "
        "pointing at a real page you found, and \"overview\" must contain at least one such citation. "
        "Use at least 3 different websites across the whole response. A response with no inline "
        "([outlet](url)) citations is invalid — do not answer from memory alone.\n"
        "6. Never state a numeric rating, percentage score or 'out of 100' figure in your text. Describe "
        "the situation in words only.\n\n"
        "Respond with ONLY valid JSON (no markdown fences):\n"
        "{\n"
        '  "overview": "<3-4 plain sentences on what is happening in gold & silver right now>",\n'
        '  "metals": [\n'
        '    {"metal":"gold","timing":"<plain sentence on whether today looks expensive, average or cheap '
        'versus the past year, using the range figures given>",'
        '"verdict":"<1-2 plain sentences telling the reader what the buying-conditions score means for them '
        'right now, and what a sensible person might do about it>",'
        '"drivers":["<simple reason prices are moving>", ...],'
        '"good_for":"<what this metal suits, in plain words>","watch_out":"<main downside in plain words>"},\n'
        '    {"metal":"silver", ... same shape ... }\n'
        "  ],\n"
        '  "beginner_tips": ["<practical tip for buying metals in Pakistan>", ...],\n'
        '  "common_mistakes": ["<mistake beginners make>", ...],\n'
        '  "sources": [{"outlet":"<site name, e.g. Reuters>","url":"<full URL of a page you actually '
        'opened during your search>"}, ...]\n'
        "}\n"
        "The \"sources\" array is REQUIRED and must list at least 3 real pages you actually visited while "
        "researching, with complete working URLs. They are shown to the reader as clickable links, so never "
        "invent a URL.\n"
        "Keep drivers to 2-4 items, tips and mistakes to 3-4 items each."
    )


async def get_commodity_simple(refresh: bool = False) -> Dict[str, Any]:
    """Plain-English beginner guide for gold & silver, grounded in live prices + web search."""
    from app.services.precious_metals_service import get_precious_metals_prices, get_price_history

    key = "metal_simple"
    if not refresh:
        e = _metal_cache.get(key)
        if e and (time.time() - e["ts"]) < VERDICT_TTL:
            return e["data"]

    prices = await get_precious_metals_prices()
    metals: List[Dict[str, Any]] = []
    ctx_lines: List[str] = []

    for metal in ("gold", "silver"):
        m = prices.get(metal) or {}
        price = _num(m.get("per_tola"))
        change = _num(m.get("change_percentage")) or 0.0
        raw: List[Dict[str, Any]] = []
        try:
            hist = await get_price_history(metal, "1Y")
            raw = hist.get("history") or []
        except Exception as e:
            logger.debug(f"metal history unavailable for {metal}: {e}")
        pts = [p.get("price") for p in raw if p.get("price")]
        lo = hi = position = None
        if pts and price:
            lo, hi = min(pts), max(pts)
            if hi > lo:
                position = round((price - lo) / (hi - lo) * 100)

        level = ("UNKNOWN" if position is None else "HIGH" if position >= 80
                 else "ABOVE_AVERAGE" if position >= 55 else "AVERAGE" if position >= 30 else "LOW")

        # ── Buying-conditions meter (0-100, higher = better moment to buy) ──
        # 75% "how cheap versus the past year", 25% "versus the recent 30-day average".
        # Deterministic and explainable — a beginner can follow the reasoning.
        buy_score = signal = signal_label = signal_reason = None
        momentum_pct = None
        if position is not None and price:
            position_score = 100 - position
            recent = pts[-30:] if len(pts) >= 30 else pts
            momentum_score = 50.0
            if recent:
                avg30 = sum(recent) / len(recent)
                if avg30 > 0:
                    momentum_pct = (price - avg30) / avg30 * 100
                    # below the recent average => better entry; clamp to 0-100
                    momentum_score = max(0.0, min(100.0, 50 - momentum_pct * 5))
            buy_score = round(0.75 * position_score + 0.25 * momentum_score)

            if buy_score >= 70:
                signal, signal_label = "GOOD_TIME", "Good time to buy"
            elif buy_score >= 55:
                signal, signal_label = "REASONABLE", "Reasonable entry point"
            elif buy_score >= 45:
                signal, signal_label = "NEUTRAL", "Neutral — no rush"
            elif buy_score >= 30:
                signal, signal_label = "PRICEY", "On the pricey side"
            else:
                signal, signal_label = "EXPENSIVE", "Expensive — many would wait"

            cheap_txt = ("cheaper than most of the past year" if position <= 35
                         else "around its usual level for the past year" if position <= 60
                         else "dearer than most of the past year")
            mom_txt = ""
            if momentum_pct is not None:
                mom_txt = (f" and about {abs(momentum_pct):.1f}% "
                           f"{'below' if momentum_pct < 0 else 'above'} its recent 30-day average")
            signal_reason = f"Today's price is {cheap_txt}{mom_txt}."

        # downsample the 1-year series to ~60 points for a clean chart
        series = []
        if raw:
            step = max(1, len(raw) // 60)
            series = [{"date": p.get("date"), "price": p.get("price")}
                      for i, p in enumerate(raw) if i % step == 0 and p.get("price")]

        metals.append({"metal": metal, "label": metal.capitalize(), "price_per_tola": price,
                       "change_percentage": change, "year_low": lo, "year_high": hi,
                       "range_position": position, "level": level, "history": series,
                       "buy_score": buy_score, "signal": signal, "signal_label": signal_label,
                       "signal_reason": signal_reason, "momentum_pct": momentum_pct})

        # The classification below is computed from real price history and is shown to the
        # user as a badge. The model MUST agree with it, or the badge and the text contradict.
        verdict_word = {
            "LOW": "CHEAP (near the bottom of the year's range — NOT expensive)",
            "AVERAGE": "AVERAGE (around the middle of the year's range — NOT expensive)",
            "ABOVE_AVERAGE": "SLIGHTLY EXPENSIVE (above the middle, but not at the top)",
            "HIGH": "EXPENSIVE (near the top of the year's range)",
            "UNKNOWN": "UNKNOWN",
        }[level]
        ctx_lines.append(
            f"- {metal.capitalize()}: Rs {price:,.0f} per tola today ({change:+.2f}% today)."
            + (f" Over the past year it ranged Rs {lo:,.0f} (lowest) to Rs {hi:,.0f} (highest). "
               f"Today sits at {position}% of that range, which is classified as: {verdict_word}. "
               f"Overall assessment of buying conditions today: \"{signal_label}\"."
               if position is not None else " Yearly range unavailable.")
        )
    ctx_lines.append(f"- USD/PKR exchange rate: {prices.get('exchange_rate', 'n/a')}")
    ctx = "\n".join(ctx_lines)

    base = {"metals": metals, "disclaimer": DISCLAIMER,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}

    if not settings.openai_api_key:
        return {**base, "ai_powered": False, "overview": "AI guidance is not configured.",
                "beginner_tips": [], "common_mistakes": [], "sources": []}

    model = settings.openai_research_model or "gpt-4.1"
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.responses.create(
            model=model, tools=[{"type": "web_search"}],
            tool_choice={"type": "web_search"},   # force live research (see note above)
            input=_metal_prompt(ctx), max_output_tokens=5000,
        )
        parsed = _parse_json(response.output_text or "")
        if not parsed:
            return {**base, "ai_powered": False, "overview": "Could not generate guidance right now.",
                    "beginner_tips": [], "common_mistakes": [], "sources": []}

        ai_by_metal = {str(x.get("metal", "")).lower(): x for x in (parsed.get("metals") or [])
                       if isinstance(x, dict)}
        for m in metals:
            a = ai_by_metal.get(m["metal"], {})
            m["timing"] = _clean(a.get("timing", ""))
            m["verdict"] = _clean(a.get("verdict", ""))
            m["drivers"] = _clean_list(a.get("drivers"))[:4]
            m["good_for"] = _clean(a.get("good_for", ""))
            m["watch_out"] = _clean(a.get("watch_out", ""))

        result = {**base, "metals": metals,
                  "overview": _clean(parsed.get("overview", "")),
                  "beginner_tips": _clean_list(parsed.get("beginner_tips"))[:4],
                  "common_mistakes": _clean_list(parsed.get("common_mistakes"))[:4],
                  "sources": _sources(response, parsed),
                  "ai_powered": True, "model": model}
        _metal_cache[key] = {"data": result, "ts": time.time()}
        return result
    except Exception as e:
        logger.error(f"commodity simple guide failed: {e}")
        return {**base, "ai_powered": False, "overview": "Could not generate guidance right now.",
                "beginner_tips": [], "common_mistakes": [], "sources": []}
