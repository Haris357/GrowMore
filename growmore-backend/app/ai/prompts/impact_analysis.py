"""
Impact Analysis Prompts for News-to-Investment Analysis.
"""

IMPACT_ANALYSIS_PROMPT = """
Analyze how this news article affects the specified investment entity.

News Article:
Title: {title}
Summary: {summary}
Full Content: {content}

Target Entity:
Type: {entity_type}
Name: {entity_name}
Additional Context: {entity_context}

Analyze the impact and return a JSON object:

{{
    "impact_direction": "bullish" | "bearish" | "neutral",
    "impact_score": 0.0 to 1.0 (0 = no impact, 1 = major impact),
    "confidence": 0.0 to 1.0 (how confident in this analysis),
    "timeframe": "immediate" | "short_term" | "medium_term" | "long_term",
    "reasoning": "2-3 sentence explanation of why this news affects the entity",
    "key_factors": ["factor1", "factor2", "factor3"],
    "risk_level": "low" | "medium" | "high",
    "action_suggestion": "hold" | "watch" | "consider_buying" | "consider_selling" | "no_action"
}}

Guidelines:
- "bullish" = positive for price/value
- "bearish" = negative for price/value
- "neutral" = no significant expected impact
- Consider both direct and indirect effects
- Factor in Pakistan market context where relevant

Return ONLY the JSON object.
"""

MULTI_ENTITY_IMPACT_PROMPT = """
Analyze how this news affects multiple investment entities simultaneously.

News Article:
Title: {title}
Summary: {summary}

Entities to Analyze:
{entities_list}

For each entity, provide impact analysis. Return a JSON array:

[
    {{
        "entity_type": "stock/commodity/sector/bank",
        "entity_name": "name",
        "entity_id": "uuid if known",
        "impact_direction": "bullish/bearish/neutral",
        "impact_score": 0.0-1.0,
        "confidence": 0.0-1.0,
        "brief_reasoning": "one sentence explanation"
    }}
]

Rank entities by impact_score (highest first).
Return ONLY the JSON array.
"""

CHAIN_REACTION_PROMPT = """
Analyze the potential chain reaction effects of this news event.

News Event:
{event_description}

Primary Impact:
{primary_impact}

Identify secondary and tertiary effects on the Pakistan investment market.

Return a JSON object:

{{
    "chain_reactions": [
        {{
            "order": 1,
            "affected_entity_type": "stock/sector/commodity/currency",
            "affected_entities": ["entity names"],
            "effect_description": "what happens",
            "expected_timeframe": "immediate/days/weeks/months",
            "probability": 0.0-1.0
        }}
    ],
    "market_wide_impact": {{
        "expected": true/false,
        "description": "if market-wide impact expected, describe it",
        "severity": "minor/moderate/major"
    }},
    "recommended_watchlist": ["entities to monitor"]
}}

Return ONLY the JSON object.
"""
