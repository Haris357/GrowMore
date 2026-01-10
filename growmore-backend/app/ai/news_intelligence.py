"""
News Intelligence - Core AI Engine for GrowNews Network.
Orchestrates entity extraction, impact analysis, and insight generation.
"""

import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
import time

from app.ai.groq_client import GroqClient
from app.ai.entity_extractor import EntityExtractor
from app.ai.impact_analyzer import ImpactAnalyzer, ImpactResult
from app.ai.news_correlator import NewsCorrelator, AffectedEntity
from app.ai.prompts.investment_insight import (
    INVESTMENT_INSIGHT_PROMPT,
    DAILY_DIGEST_PROMPT,
    PERSONALIZED_INSIGHT_PROMPT,
    SECTOR_INSIGHT_PROMPT,
)

logger = logging.getLogger(__name__)


class AnalysisResult:
    """Complete analysis result for a news article."""

    def __init__(
        self,
        news_id: str,
        entities_extracted: Dict[str, Any],
        categories_detected: List[str],
        event_types: List[str],
        affected_entities: List[AffectedEntity],
        impact_summary: str,
        investment_insight: str,
        processing_time_ms: int,
    ):
        self.news_id = news_id
        self.entities_extracted = entities_extracted
        self.categories_detected = categories_detected
        self.event_types = event_types
        self.affected_entities = affected_entities
        self.impact_summary = impact_summary
        self.investment_insight = investment_insight
        self.processing_time_ms = processing_time_ms

    def to_dict(self) -> Dict[str, Any]:
        return {
            "news_id": self.news_id,
            "entities_extracted": self.entities_extracted,
            "categories_detected": self.categories_detected,
            "event_types": self.event_types,
            "affected_entities": [e.to_dict() for e in self.affected_entities],
            "impact_summary": self.impact_summary,
            "investment_insight": self.investment_insight,
            "processing_time_ms": self.processing_time_ms,
        }


class NewsIntelligence:
    """
    Core AI engine for news analysis.
    Orchestrates all AI modules for comprehensive news intelligence.
    """

    def __init__(self):
        self.groq_client = GroqClient()
        self.entity_extractor = EntityExtractor()
        self.impact_analyzer = ImpactAnalyzer()
        self.news_correlator = NewsCorrelator()

    async def analyze_article(
        self,
        article: Dict[str, Any],
        known_companies: Optional[List[Dict]] = None,
        known_sectors: Optional[List[Dict]] = None,
        known_commodities: Optional[List[Dict]] = None,
    ) -> AnalysisResult:
        """
        Perform comprehensive analysis on a news article.

        Args:
            article: News article dict with title, summary, content
            known_companies: List of companies from database
            known_sectors: List of sectors from database
            known_commodities: List of commodities from database

        Returns:
            AnalysisResult with all extracted insights
        """
        start_time = time.time()

        news_id = article.get("id", "")
        title = article.get("title", "")
        summary = article.get("summary", "")
        content = article.get("content", summary)

        known_companies = known_companies or []
        known_sectors = known_sectors or []
        known_commodities = known_commodities or []

        # Step 1: Extract entities
        entities = await self.entity_extractor.extract_entities(
            title=title,
            content=content,
            use_llm=True,
        )

        # Step 2: Detect categories and events
        categories = self._extract_categories(entities)
        event_types = [e.get("type", "") for e in entities.get("events", []) if e.get("type")]

        # Step 3: Find affected entities
        affected_entities = []

        # Find affected stocks
        if known_companies:
            affected_stocks = await self.news_correlator.find_affected_stocks(
                title=title,
                summary=summary,
                content=content,
                known_companies=known_companies,
            )
            affected_entities.extend(affected_stocks)

        # Find affected commodities
        if known_commodities:
            affected_commodities = await self.news_correlator.find_affected_commodities(
                title=title,
                summary=summary,
                content=content,
                known_commodities=known_commodities,
            )
            affected_entities.extend(affected_commodities)

        # Find affected sectors
        if known_sectors:
            affected_sectors = await self.news_correlator.find_affected_sectors(
                title=title,
                summary=summary,
                content=content,
                known_sectors=known_sectors,
            )
            affected_entities.extend(affected_sectors)

        # Step 4: Generate impact summary
        impact_summary = self._generate_impact_summary(affected_entities)

        # Step 5: Generate investment insight
        investment_insight = await self._generate_investment_insight(
            news_summary=summary or title,
            affected_entities=affected_entities,
        )

        processing_time = int((time.time() - start_time) * 1000)

        return AnalysisResult(
            news_id=news_id,
            entities_extracted=entities,
            categories_detected=categories,
            event_types=event_types,
            affected_entities=affected_entities,
            impact_summary=impact_summary,
            investment_insight=investment_insight,
            processing_time_ms=processing_time,
        )

    def _extract_categories(self, entities: Dict[str, Any]) -> List[str]:
        """Extract news categories from entities."""
        categories = set()

        # From sectors
        for sector in entities.get("sectors", []):
            name = sector.get("name", "").lower()
            if name:
                categories.add(name)

        # From commodities
        for commodity in entities.get("commodities", []):
            ctype = commodity.get("type", "").lower()
            if ctype:
                categories.add(ctype)

        # From events
        for event in entities.get("events", []):
            etype = event.get("type", "").lower()
            if etype in ["ipo", "merger", "acquisition"]:
                categories.add("corporate_action")
            elif etype in ["earnings", "dividend"]:
                categories.add("financial_results")
            elif etype in ["policy"]:
                categories.add("regulatory")

        return list(categories)

    def _generate_impact_summary(self, affected_entities: List[AffectedEntity]) -> str:
        """Generate a brief impact summary from affected entities."""
        if not affected_entities:
            return "No significant impact detected on tracked investments."

        # Group by impact direction
        bullish = []
        bearish = []
        neutral = []

        for entity in affected_entities:
            if entity.impact:
                if entity.impact.impact_direction == "bullish":
                    bullish.append(entity.entity_name)
                elif entity.impact.impact_direction == "bearish":
                    bearish.append(entity.entity_name)
                else:
                    neutral.append(entity.entity_name)

        parts = []
        if bullish:
            parts.append(f"Positive for: {', '.join(bullish[:3])}")
        if bearish:
            parts.append(f"Negative for: {', '.join(bearish[:3])}")
        if neutral and not bullish and not bearish:
            parts.append(f"Limited impact on: {', '.join(neutral[:3])}")

        return " | ".join(parts) if parts else "Mixed or unclear impact."

    async def _generate_investment_insight(
        self,
        news_summary: str,
        affected_entities: List[AffectedEntity],
    ) -> str:
        """Generate actionable investment insight."""
        if not affected_entities:
            return "This news doesn't appear to directly impact any tracked investments."

        # Prepare affected entities summary
        entities_summary = []
        for entity in affected_entities[:5]:
            impact_str = ""
            if entity.impact:
                impact_str = f" ({entity.impact.impact_direction}, score: {entity.impact.impact_score:.2f})"
            entities_summary.append(f"- {entity.entity_type}: {entity.entity_name}{impact_str}")

        # Prepare impact analysis summary
        impact_data = []
        for entity in affected_entities[:5]:
            if entity.impact:
                impact_data.append({
                    "entity": entity.entity_name,
                    "direction": entity.impact.impact_direction,
                    "reasoning": entity.impact.reasoning,
                })

        prompt = INVESTMENT_INSIGHT_PROMPT.format(
            news_summary=news_summary[:500],
            affected_entities="\n".join(entities_summary),
            impact_analysis=json.dumps(impact_data, indent=2) if impact_data else "No detailed analysis",
        )

        try:
            response = await self.groq_client.generate(
                prompt=prompt,
                max_tokens=300,
                temperature=0.3,
            )
            return response.strip()
        except Exception as e:
            logger.error(f"Failed to generate investment insight: {e}")
            return self._generate_impact_summary(affected_entities)

    async def generate_daily_digest(
        self,
        news_items: List[Dict],
        market_summary: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate daily investment digest from news.
        """
        # Prepare news items summary
        news_summary = []
        for item in news_items[:10]:
            news_summary.append({
                "title": item.get("title", ""),
                "sentiment": item.get("sentiment_label", "neutral"),
                "impact_score": item.get("impact_score", 0.5),
            })

        prompt = DAILY_DIGEST_PROMPT.format(
            news_items=json.dumps(news_summary, indent=2),
            market_summary=json.dumps(market_summary, indent=2),
        )

        try:
            response = await self.groq_client.generate(
                prompt=prompt,
                max_tokens=1500,
                temperature=0.3,
            )

            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())

        except Exception as e:
            logger.error(f"Failed to generate daily digest: {e}")

        return {
            "headline": "Market Update",
            "market_mood": "mixed",
            "top_stories": [],
            "sector_highlights": [],
        }

    async def generate_personalized_insight(
        self,
        news_summary: str,
        impact_analysis: Dict,
        user_profile: Dict,
        portfolio_summary: List[Dict],
    ) -> Dict[str, Any]:
        """
        Generate personalized insight for a user.
        """
        portfolio_str = "\n".join([
            f"- {h.get('name', '')}: {h.get('quantity', 0)} units"
            for h in portfolio_summary[:10]
        ])

        prompt = PERSONALIZED_INSIGHT_PROMPT.format(
            risk_tolerance=user_profile.get("risk_tolerance", "moderate"),
            experience_level=user_profile.get("investment_experience", "beginner"),
            investment_horizon=user_profile.get("investment_horizon", "medium_term"),
            interested_sectors=", ".join(user_profile.get("interested_sectors", [])),
            portfolio_summary=portfolio_str or "No holdings",
            news_summary=news_summary,
            impact_analysis=json.dumps(impact_analysis, indent=2),
        )

        try:
            response = await self.groq_client.generate(
                prompt=prompt,
                max_tokens=500,
                temperature=0.3,
            )

            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())

        except Exception as e:
            logger.error(f"Failed to generate personalized insight: {e}")

        return {
            "insight": news_summary[:200],
            "relevance_score": 0.5,
            "action_items": [],
            "priority": "medium",
        }

    async def generate_sector_insight(
        self,
        sector_name: str,
        sector_code: str,
        sector_news: List[Dict],
        stocks_performance: List[Dict],
    ) -> Dict[str, Any]:
        """
        Generate sector-specific insight.
        """
        news_str = "\n".join([
            f"- {n.get('title', '')}"
            for n in sector_news[:5]
        ])

        perf_str = "\n".join([
            f"- {s.get('symbol', '')}: {s.get('change_percentage', 0):.2f}%"
            for s in stocks_performance[:10]
        ])

        prompt = SECTOR_INSIGHT_PROMPT.format(
            sector_name=sector_name,
            sector_code=sector_code,
            sector_news=news_str or "No recent news",
            stocks_performance=perf_str or "No performance data",
        )

        try:
            response = await self.groq_client.generate(
                prompt=prompt,
                max_tokens=800,
                temperature=0.3,
            )

            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())

        except Exception as e:
            logger.error(f"Failed to generate sector insight: {e}")

        return {
            "sector_outlook": "neutral",
            "summary": f"Analysis for {sector_name} sector",
        }

    async def get_market_mood(
        self,
        recent_news: List[Dict],
    ) -> Dict[str, Any]:
        """
        Analyze overall market mood from recent news.
        """
        bullish_count = 0
        bearish_count = 0
        neutral_count = 0

        for news in recent_news:
            sentiment = news.get("sentiment_label", "neutral").lower()
            if sentiment == "positive":
                bullish_count += 1
            elif sentiment == "negative":
                bearish_count += 1
            else:
                neutral_count += 1

        total = len(recent_news) or 1
        bullish_pct = bullish_count / total
        bearish_pct = bearish_count / total

        if bullish_pct > 0.5:
            mood = "bullish"
        elif bearish_pct > 0.5:
            mood = "bearish"
        elif bullish_pct > bearish_pct:
            mood = "slightly_bullish"
        elif bearish_pct > bullish_pct:
            mood = "slightly_bearish"
        else:
            mood = "neutral"

        return {
            "mood": mood,
            "bullish_percentage": round(bullish_pct * 100, 1),
            "bearish_percentage": round(bearish_pct * 100, 1),
            "neutral_percentage": round((neutral_count / total) * 100, 1),
            "sample_size": len(recent_news),
        }
