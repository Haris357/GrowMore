"""
News Correlator - Connect news to investments.
Finds affected entities and builds relationship graphs.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from collections import defaultdict

from app.ai.entity_extractor import EntityExtractor
from app.ai.impact_analyzer import ImpactAnalyzer, ImpactResult

logger = logging.getLogger(__name__)


class AffectedEntity:
    """Represents an entity affected by news."""

    def __init__(
        self,
        entity_type: str,
        entity_id: str,
        entity_name: str,
        relevance_score: float,
        impact: Optional[ImpactResult] = None,
    ):
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.entity_name = entity_name
        self.relevance_score = relevance_score
        self.impact = impact

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "relevance_score": self.relevance_score,
            "impact": self.impact.to_dict() if self.impact else None,
        }


class NewsCorrelator:
    """
    Connect news articles to affected investments.
    """

    def __init__(self):
        self.entity_extractor = EntityExtractor()
        self.impact_analyzer = ImpactAnalyzer()

    async def find_affected_stocks(
        self,
        title: str,
        summary: str,
        content: str,
        known_companies: List[Dict],
    ) -> List[AffectedEntity]:
        """
        Find stocks affected by a news article.
        """
        affected = []

        # Extract entities from news
        entities = await self.entity_extractor.extract_entities(
            title=title,
            content=content,
            use_llm=True,
        )

        # Match extracted companies to known companies
        extracted_companies = entities.get("companies", [])

        for company in known_companies:
            company_name = company.get("name", "").lower()
            company_symbol = company.get("symbol", "").upper()

            # Check for matches
            relevance = 0.0

            for extracted in extracted_companies:
                ext_name = extracted.get("name", "").lower()
                ext_ticker = extracted.get("ticker", "").upper()

                if ext_ticker == company_symbol:
                    relevance = max(relevance, 0.95)
                elif company_name in ext_name or ext_name in company_name:
                    relevance = max(relevance, 0.8)
                elif any(word in company_name for word in ext_name.split() if len(word) > 3):
                    relevance = max(relevance, 0.5)

            # Also check direct text mentions
            full_text = f"{title} {summary} {content}".lower()
            if company_symbol.lower() in full_text:
                relevance = max(relevance, 0.9)
            if company_name in full_text:
                relevance = max(relevance, 0.85)

            if relevance > 0.3:
                # Get impact analysis for high-relevance matches
                impact = None
                if relevance > 0.5:
                    impact = await self.impact_analyzer.analyze_stock_impact(
                        title=title,
                        summary=summary,
                        content=content,
                        company_name=company.get("name", ""),
                        company_symbol=company.get("symbol", ""),
                        company_id=company.get("id"),
                    )

                affected.append(AffectedEntity(
                    entity_type="stock",
                    entity_id=company.get("id", ""),
                    entity_name=company.get("name", ""),
                    relevance_score=relevance,
                    impact=impact,
                ))

        # Sort by relevance
        affected.sort(key=lambda x: x.relevance_score, reverse=True)
        return affected[:10]  # Return top 10

    async def find_affected_commodities(
        self,
        title: str,
        summary: str,
        content: str,
        known_commodities: List[Dict],
    ) -> List[AffectedEntity]:
        """
        Find commodities affected by a news article.
        """
        affected = []
        full_text = f"{title} {summary} {content}".lower()

        # Commodity detection keywords
        commodity_keywords = {
            "gold": ["gold", "bullion", "yellow metal", "precious metal", "sona", "24k", "22k"],
            "silver": ["silver", "chandi", "white metal"],
            "oil": ["oil", "crude", "petroleum", "brent", "wti", "opec"],
        }

        for commodity in known_commodities:
            commodity_name = commodity.get("name", "").lower()
            commodity_type = commodity.get("type", "").lower()

            relevance = 0.0

            # Check commodity-specific keywords
            for ctype, keywords in commodity_keywords.items():
                if ctype in commodity_type or ctype in commodity_name:
                    for keyword in keywords:
                        if keyword in full_text:
                            relevance = max(relevance, 0.8)
                            break

            # Direct name mention
            if commodity_name in full_text:
                relevance = max(relevance, 0.9)

            if relevance > 0.3:
                impact = None
                if relevance > 0.5:
                    impact = await self.impact_analyzer.analyze_commodity_impact(
                        title=title,
                        summary=summary,
                        content=content,
                        commodity_type=commodity_type or commodity_name,
                        commodity_id=commodity.get("id"),
                    )

                affected.append(AffectedEntity(
                    entity_type="commodity",
                    entity_id=commodity.get("id", ""),
                    entity_name=commodity.get("name", ""),
                    relevance_score=relevance,
                    impact=impact,
                ))

        affected.sort(key=lambda x: x.relevance_score, reverse=True)
        return affected[:5]

    async def find_affected_sectors(
        self,
        title: str,
        summary: str,
        content: str,
        known_sectors: List[Dict],
    ) -> List[AffectedEntity]:
        """
        Find sectors affected by a news article.
        """
        affected = []
        full_text = f"{title} {summary} {content}".lower()

        # Sector detection keywords
        sector_keywords = {
            "BANK": ["bank", "banking", "financial", "sbp", "interest rate", "monetary"],
            "CEMENT": ["cement", "construction", "infrastructure", "housing"],
            "OIL": ["oil", "gas", "petroleum", "energy", "exploration", "ogdc", "ppl"],
            "TECH": ["technology", "software", "it", "digital", "tech", "systems"],
            "TEXTILE": ["textile", "garment", "fabric", "cotton", "export"],
            "PHARMA": ["pharma", "pharmaceutical", "medicine", "healthcare", "drug"],
            "FERT": ["fertilizer", "urea", "agriculture", "farming"],
            "POWER": ["power", "electricity", "generation", "distribution", "energy"],
            "AUTO": ["automobile", "car", "vehicle", "auto", "assembler"],
            "SUGAR": ["sugar", "mills", "cane"],
        }

        for sector in known_sectors:
            sector_name = sector.get("name", "").lower()
            sector_code = sector.get("code", "").upper()

            relevance = 0.0

            # Check sector-specific keywords
            keywords = sector_keywords.get(sector_code, [])
            for keyword in keywords:
                if keyword in full_text:
                    relevance = max(relevance, 0.7)

            # Direct sector name mention
            if sector_name in full_text:
                relevance = max(relevance, 0.85)

            if relevance > 0.3:
                impact = None
                if relevance > 0.5:
                    impact = await self.impact_analyzer.analyze_sector_impact(
                        title=title,
                        summary=summary,
                        content=content,
                        sector_name=sector.get("name", ""),
                        sector_id=sector.get("id"),
                    )

                affected.append(AffectedEntity(
                    entity_type="sector",
                    entity_id=sector.get("id", ""),
                    entity_name=sector.get("name", ""),
                    relevance_score=relevance,
                    impact=impact,
                ))

        affected.sort(key=lambda x: x.relevance_score, reverse=True)
        return affected[:5]

    def find_related_news(
        self,
        news_article: Dict,
        other_articles: List[Dict],
        max_results: int = 5,
    ) -> List[Tuple[Dict, float]]:
        """
        Find news articles related to a given article.
        Returns list of (article, similarity_score) tuples.
        """
        related = []
        source_title = news_article.get("title", "").lower()
        source_summary = news_article.get("summary", "").lower()
        source_tags = set(news_article.get("tags", []))
        source_categories = set(news_article.get("categories", []))

        for article in other_articles:
            if article.get("id") == news_article.get("id"):
                continue

            similarity = 0.0

            # Tag overlap
            article_tags = set(article.get("tags", []))
            if source_tags and article_tags:
                tag_overlap = len(source_tags & article_tags) / max(len(source_tags | article_tags), 1)
                similarity += tag_overlap * 0.3

            # Category overlap
            article_categories = set(article.get("categories", []))
            if source_categories and article_categories:
                cat_overlap = len(source_categories & article_categories) / max(len(source_categories | article_categories), 1)
                similarity += cat_overlap * 0.2

            # Title similarity (simple word overlap)
            article_title = article.get("title", "").lower()
            source_words = set(source_title.split())
            article_words = set(article_title.split())
            if source_words and article_words:
                word_overlap = len(source_words & article_words) / max(len(source_words | article_words), 1)
                similarity += word_overlap * 0.5

            if similarity > 0.2:
                related.append((article, similarity))

        # Sort by similarity and return top results
        related.sort(key=lambda x: x[1], reverse=True)
        return related[:max_results]

    def build_news_graph(
        self,
        articles: List[Dict],
        affected_entities_map: Dict[str, List[AffectedEntity]],
    ) -> Dict[str, Any]:
        """
        Build a graph of news articles and affected entities.
        """
        nodes = []
        edges = []

        # Add article nodes
        for article in articles:
            nodes.append({
                "id": f"news_{article.get('id')}",
                "type": "news",
                "label": article.get("title", "")[:50],
                "data": {
                    "id": article.get("id"),
                    "title": article.get("title"),
                    "sentiment": article.get("sentiment_label"),
                },
            })

        # Add entity nodes and edges
        entity_set = set()
        for article_id, affected in affected_entities_map.items():
            for entity in affected:
                entity_key = f"{entity.entity_type}_{entity.entity_id}"

                if entity_key not in entity_set:
                    nodes.append({
                        "id": entity_key,
                        "type": entity.entity_type,
                        "label": entity.entity_name,
                        "data": {
                            "id": entity.entity_id,
                            "name": entity.entity_name,
                        },
                    })
                    entity_set.add(entity_key)

                # Add edge from news to entity
                edges.append({
                    "source": f"news_{article_id}",
                    "target": entity_key,
                    "weight": entity.relevance_score,
                    "impact": entity.impact.impact_direction if entity.impact else "unknown",
                })

        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "total_news": len(articles),
                "total_entities": len(entity_set),
                "total_connections": len(edges),
            },
        }

    async def get_entity_news_history(
        self,
        entity_type: str,
        entity_id: str,
        articles: List[Dict],
        days: int = 30,
    ) -> List[Dict]:
        """
        Get news history for a specific entity.
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        relevant = []

        for article in articles:
            pub_date = article.get("published_at")
            if isinstance(pub_date, str):
                try:
                    pub_date = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
                except:
                    continue

            if pub_date and pub_date < cutoff:
                continue

            # Check if entity is mentioned
            text = f"{article.get('title', '')} {article.get('summary', '')}".lower()
            entity_name = article.get("entity_name", "").lower() if entity_type == "custom" else ""

            # Simple mention check - in production, use stored entity mentions
            if entity_id.lower() in text or entity_name in text:
                relevant.append({
                    **article,
                    "relevance": 0.8,
                })

        return sorted(relevant, key=lambda x: x.get("published_at", ""), reverse=True)
