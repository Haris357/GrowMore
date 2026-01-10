"""
Investment Insight Generation Prompts.
"""

INVESTMENT_INSIGHT_PROMPT = """
Generate a clear, actionable investment insight based on this news analysis.

News Summary:
{news_summary}

Affected Entities:
{affected_entities}

Impact Analysis:
{impact_analysis}

Generate a brief investment insight (2-3 sentences) that:
1. Explains what happened in simple terms
2. Identifies who/what is affected
3. Suggests what this means for investors

Guidelines:
- Use simple language, avoid jargon
- Be specific but concise
- Focus on actionable information
- Consider Pakistan market context

Return ONLY the insight text, no JSON or formatting.
"""

DAILY_DIGEST_PROMPT = """
Create a daily investment digest summary from today's news.

Today's Key News:
{news_items}

Market Data:
{market_summary}

Create a digest with the following structure (return as JSON):

{{
    "headline": "One line summary of today's most important development",
    "market_mood": "bullish/bearish/mixed/neutral",
    "market_mood_explanation": "One sentence explaining overall market sentiment",
    "top_stories": [
        {{
            "title": "Story title",
            "impact": "Brief impact summary",
            "affected": ["entities affected"]
        }}
    ],
    "sector_highlights": [
        {{
            "sector": "Sector name",
            "trend": "up/down/stable",
            "key_development": "What happened"
        }}
    ],
    "commodity_update": {{
        "gold": "trend and brief note",
        "silver": "trend and brief note"
    }},
    "key_numbers": [
        {{"metric": "name", "value": "value", "change": "change description"}}
    ],
    "tomorrow_watch": ["Things to watch tomorrow"]
}}

Keep it concise and focused on actionable information.
Return ONLY the JSON object.
"""

PERSONALIZED_INSIGHT_PROMPT = """
Generate a personalized investment insight for a user based on their profile and portfolio.

User Profile:
- Risk Tolerance: {risk_tolerance}
- Investment Experience: {experience_level}
- Investment Horizon: {investment_horizon}
- Interested Sectors: {interested_sectors}

User's Current Holdings:
{portfolio_summary}

News/Event:
{news_summary}

Impact Analysis:
{impact_analysis}

Generate a personalized insight that:
1. Considers their risk tolerance
2. Relates to their existing holdings if applicable
3. Matches their experience level (simpler for beginners)
4. Aligns with their investment horizon

Return a JSON object:

{{
    "insight": "Personalized insight text (2-3 sentences)",
    "relevance_score": 0.0-1.0 (how relevant to this user),
    "action_items": ["Specific action suggestions if any"],
    "related_holdings": ["Holdings from their portfolio affected"],
    "priority": "high/medium/low"
}}

Return ONLY the JSON object.
"""

SECTOR_INSIGHT_PROMPT = """
Generate a sector-specific investment insight.

Sector: {sector_name}
Sector Code: {sector_code}

Recent News for this Sector:
{sector_news}

Sector Stocks Performance:
{stocks_performance}

Generate a comprehensive sector insight:

{{
    "sector_outlook": "bullish/bearish/neutral",
    "outlook_timeframe": "short_term/medium_term/long_term",
    "key_drivers": ["What's driving the sector"],
    "risks": ["Key risks to watch"],
    "opportunities": ["Investment opportunities"],
    "top_picks": [
        {{"stock": "symbol", "reason": "why this stock"}}
    ],
    "avoid_list": [
        {{"stock": "symbol", "reason": "why to avoid"}}
    ],
    "summary": "2-3 sentence sector summary"
}}

Return ONLY the JSON object.
"""
