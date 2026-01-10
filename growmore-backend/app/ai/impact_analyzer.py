"""
Impact Analyzer for News-to-Investment Analysis.
Analyzes how news affects stocks, commodities, and sectors.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional
from decimal import Decimal

from app.ai.groq_client import GroqClient
from app.ai.prompts.impact_analysis import (
    IMPACT_ANALYSIS_PROMPT,
    MULTI_ENTITY_IMPACT_PROMPT,
    CHAIN_REACTION_PROMPT,
)

logger = logging.getLogger(__name__)


class ImpactResult:
    """Result of impact analysis."""

    def __init__(
        self,
        entity_type: str,
        entity_id: Optional[str],
        entity_name: str,
        impact_direction: str,
        impact_score: float,
        confidence: float,
        timeframe: str,
        reasoning: str,
        key_factors: List[str],
        risk_level: str = "medium",
        action_suggestion: str = "watch",
    ):
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.entity_name = entity_name
        self.impact_direction = impact_direction
        self.impact_score = impact_score
        self.confidence = confidence
        self.timeframe = timeframe
        self.reasoning = reasoning
        self.key_factors = key_factors
        self.risk_level = risk_level
        self.action_suggestion = action_suggestion

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "impact_direction": self.impact_direction,
            "impact_score": self.impact_score,
            "confidence": self.confidence,
            "timeframe": self.timeframe,
            "reasoning": self.reasoning,
            "key_factors": self.key_factors,
            "risk_level": self.risk_level,
            "action_suggestion": self.action_suggestion,
        }


class ImpactAnalyzer:
    """
    Analyze the impact of news on investment entities.
    """

    def __init__(self):
        self.groq_client = GroqClient()

        # Impact keywords for rule-based analysis
        self.positive_keywords = [
            "growth", "profit", "increase", "surge", "rally", "bullish",
            "record high", "expansion", "dividend", "acquisition", "upgrade",
            "strong", "exceed", "beat expectations", "breakthrough", "deal",
        ]
        self.negative_keywords = [
            "loss", "decline", "decrease", "fall", "drop", "bearish",
            "record low", "contraction", "cut", "downgrade", "weak",
            "miss expectations", "lawsuit", "scandal", "bankruptcy", "default",
        ]

    async def analyze_stock_impact(
        self,
        title: str,
        summary: str,
        content: str,
        company_name: str,
        company_symbol: str,
        company_id: Optional[str] = None,
    ) -> ImpactResult:
        """
        Analyze how news impacts a specific stock.
        """
        # First, do rule-based quick analysis
        rule_based = self._rule_based_impact(title, summary, content)

        # Then enhance with LLM
        try:
            llm_result = await self._llm_impact_analysis(
                title=title,
                summary=summary,
                content=content,
                entity_type="stock",
                entity_name=f"{company_name} ({company_symbol})",
                entity_context=f"PSX listed company",
            )

            return ImpactResult(
                entity_type="stock",
                entity_id=company_id,
                entity_name=company_name,
                impact_direction=llm_result.get("impact_direction", rule_based["direction"]),
                impact_score=float(llm_result.get("impact_score", rule_based["score"])),
                confidence=float(llm_result.get("confidence", 0.5)),
                timeframe=llm_result.get("timeframe", "short_term"),
                reasoning=llm_result.get("reasoning", ""),
                key_factors=llm_result.get("key_factors", []),
                risk_level=llm_result.get("risk_level", "medium"),
                action_suggestion=llm_result.get("action_suggestion", "watch"),
            )

        except Exception as e:
            logger.error(f"LLM impact analysis failed: {e}")
            return ImpactResult(
                entity_type="stock",
                entity_id=company_id,
                entity_name=company_name,
                impact_direction=rule_based["direction"],
                impact_score=rule_based["score"],
                confidence=0.5,
                timeframe="short_term",
                reasoning="Analysis based on keyword matching",
                key_factors=[],
                risk_level="medium",
                action_suggestion="watch",
            )

    async def analyze_commodity_impact(
        self,
        title: str,
        summary: str,
        content: str,
        commodity_type: str,
        commodity_id: Optional[str] = None,
    ) -> ImpactResult:
        """
        Analyze how news impacts a commodity (gold, silver, oil).
        """
        rule_based = self._rule_based_impact(title, summary, content)

        # Commodity-specific context
        context_map = {
            "gold": "Safe haven asset, affected by USD, interest rates, and global uncertainty",
            "silver": "Industrial and precious metal, follows gold but more volatile",
            "oil": "Energy commodity, affected by OPEC decisions and global demand",
        }

        try:
            llm_result = await self._llm_impact_analysis(
                title=title,
                summary=summary,
                content=content,
                entity_type="commodity",
                entity_name=commodity_type.title(),
                entity_context=context_map.get(commodity_type.lower(), ""),
            )

            return ImpactResult(
                entity_type="commodity",
                entity_id=commodity_id,
                entity_name=commodity_type,
                impact_direction=llm_result.get("impact_direction", rule_based["direction"]),
                impact_score=float(llm_result.get("impact_score", rule_based["score"])),
                confidence=float(llm_result.get("confidence", 0.5)),
                timeframe=llm_result.get("timeframe", "short_term"),
                reasoning=llm_result.get("reasoning", ""),
                key_factors=llm_result.get("key_factors", []),
                risk_level=llm_result.get("risk_level", "medium"),
                action_suggestion=llm_result.get("action_suggestion", "watch"),
            )

        except Exception as e:
            logger.error(f"LLM commodity impact analysis failed: {e}")
            return ImpactResult(
                entity_type="commodity",
                entity_id=commodity_id,
                entity_name=commodity_type,
                impact_direction=rule_based["direction"],
                impact_score=rule_based["score"],
                confidence=0.5,
                timeframe="short_term",
                reasoning="Analysis based on keyword matching",
                key_factors=[],
            )

    async def analyze_sector_impact(
        self,
        title: str,
        summary: str,
        content: str,
        sector_name: str,
        sector_id: Optional[str] = None,
    ) -> ImpactResult:
        """
        Analyze how news impacts an entire sector.
        """
        rule_based = self._rule_based_impact(title, summary, content)

        try:
            llm_result = await self._llm_impact_analysis(
                title=title,
                summary=summary,
                content=content,
                entity_type="sector",
                entity_name=sector_name,
                entity_context="PSX market sector",
            )

            return ImpactResult(
                entity_type="sector",
                entity_id=sector_id,
                entity_name=sector_name,
                impact_direction=llm_result.get("impact_direction", rule_based["direction"]),
                impact_score=float(llm_result.get("impact_score", rule_based["score"])),
                confidence=float(llm_result.get("confidence", 0.5)),
                timeframe=llm_result.get("timeframe", "short_term"),
                reasoning=llm_result.get("reasoning", ""),
                key_factors=llm_result.get("key_factors", []),
                risk_level=llm_result.get("risk_level", "medium"),
                action_suggestion=llm_result.get("action_suggestion", "watch"),
            )

        except Exception as e:
            logger.error(f"LLM sector impact analysis failed: {e}")
            return ImpactResult(
                entity_type="sector",
                entity_id=sector_id,
                entity_name=sector_name,
                impact_direction=rule_based["direction"],
                impact_score=rule_based["score"],
                confidence=0.5,
                timeframe="short_term",
                reasoning="Analysis based on keyword matching",
                key_factors=[],
            )

    async def analyze_multiple_entities(
        self,
        title: str,
        summary: str,
        entities: List[Dict[str, Any]],
    ) -> List[ImpactResult]:
        """
        Analyze impact on multiple entities at once.
        More efficient than analyzing one by one.
        """
        if not entities:
            return []

        entities_list = "\n".join([
            f"- {e.get('type', 'unknown')}: {e.get('name', 'unknown')}"
            for e in entities
        ])

        prompt = MULTI_ENTITY_IMPACT_PROMPT.format(
            title=title,
            summary=summary,
            entities_list=entities_list,
        )

        try:
            response = await self.groq_client.generate(
                prompt=prompt,
                max_tokens=2000,
                temperature=0.1,
            )

            # Parse JSON array response
            json_match = re.search(r'\[[\s\S]*\]', response)
            if json_match:
                results_data = json.loads(json_match.group())
                results = []
                for data in results_data:
                    results.append(ImpactResult(
                        entity_type=data.get("entity_type", "unknown"),
                        entity_id=data.get("entity_id"),
                        entity_name=data.get("entity_name", ""),
                        impact_direction=data.get("impact_direction", "neutral"),
                        impact_score=float(data.get("impact_score", 0.5)),
                        confidence=float(data.get("confidence", 0.5)),
                        timeframe="short_term",
                        reasoning=data.get("brief_reasoning", ""),
                        key_factors=[],
                    ))
                return results

        except Exception as e:
            logger.error(f"Multi-entity impact analysis failed: {e}")

        return []

    async def predict_chain_reaction(
        self,
        event_description: str,
        primary_impact: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Predict secondary and tertiary effects of a news event.
        """
        prompt = CHAIN_REACTION_PROMPT.format(
            event_description=event_description,
            primary_impact=json.dumps(primary_impact),
        )

        try:
            response = await self.groq_client.generate(
                prompt=prompt,
                max_tokens=1500,
                temperature=0.2,
            )

            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())

        except Exception as e:
            logger.error(f"Chain reaction prediction failed: {e}")

        return {
            "chain_reactions": [],
            "market_wide_impact": {"expected": False},
            "recommended_watchlist": [],
        }

    def _rule_based_impact(
        self,
        title: str,
        summary: str,
        content: str,
    ) -> Dict[str, Any]:
        """
        Quick rule-based impact assessment.
        """
        text = f"{title} {summary} {content}".lower()

        positive_count = sum(1 for kw in self.positive_keywords if kw in text)
        negative_count = sum(1 for kw in self.negative_keywords if kw in text)

        if positive_count > negative_count:
            direction = "bullish"
            score = min(0.3 + (positive_count * 0.1), 0.8)
        elif negative_count > positive_count:
            direction = "bearish"
            score = min(0.3 + (negative_count * 0.1), 0.8)
        else:
            direction = "neutral"
            score = 0.3

        return {
            "direction": direction,
            "score": score,
            "positive_count": positive_count,
            "negative_count": negative_count,
        }

    async def _llm_impact_analysis(
        self,
        title: str,
        summary: str,
        content: str,
        entity_type: str,
        entity_name: str,
        entity_context: str,
    ) -> Dict[str, Any]:
        """
        LLM-based impact analysis.
        """
        prompt = IMPACT_ANALYSIS_PROMPT.format(
            title=title,
            summary=summary,
            content=content[:2000],  # Limit content
            entity_type=entity_type,
            entity_name=entity_name,
            entity_context=entity_context,
        )

        response = await self.groq_client.generate(
            prompt=prompt,
            max_tokens=800,
            temperature=0.1,
        )

        # Parse JSON response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            return json.loads(json_match.group())

        return {}

    def get_correlation_score(
        self,
        news_text: str,
        entity_name: str,
    ) -> float:
        """
        Calculate how strongly news correlates with an entity.
        Simple text-based correlation.
        """
        text = news_text.lower()
        entity = entity_name.lower()

        # Direct mention
        if entity in text:
            return 0.9

        # Partial match
        entity_words = entity.split()
        matches = sum(1 for word in entity_words if word in text and len(word) > 2)
        if matches > 0:
            return min(0.3 + (matches * 0.2), 0.8)

        return 0.1
