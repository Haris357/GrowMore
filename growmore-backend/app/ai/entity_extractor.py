"""
Entity Extractor for News Articles.
Extracts companies, commodities, sectors, events, and other entities from news text.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.ai.groq_client import GroqClient
from app.ai.prompts.entity_extraction import ENTITY_EXTRACTION_PROMPT, ENTITY_LINKING_PROMPT

logger = logging.getLogger(__name__)


class EntityExtractor:
    """
    Extract investment-relevant entities from news articles using LLM.
    """

    def __init__(self):
        self.groq_client = GroqClient()

        # Pakistan-specific company patterns
        self.pakistan_companies = {
            "HBL": "Habib Bank Limited",
            "UBL": "United Bank Limited",
            "MCB": "MCB Bank Limited",
            "ABL": "Allied Bank Limited",
            "MEBL": "Meezan Bank Limited",
            "LUCK": "Lucky Cement",
            "DGKC": "DG Khan Cement",
            "OGDC": "Oil & Gas Development Company",
            "PPL": "Pakistan Petroleum Limited",
            "PSO": "Pakistan State Oil",
            "SYS": "Systems Limited",
            "TRG": "TRG Pakistan",
            "ENGRO": "Engro Corporation",
            "FFC": "Fauji Fertilizer Company",
            "HUBC": "Hub Power Company",
            "KEL": "K-Electric",
            "PTCL": "Pakistan Telecommunication",
            "PTC": "Pakistan Tobacco Company",
            "NESTLE": "Nestle Pakistan",
            "UNILEVER": "Unilever Pakistan",
        }

        # Commodity keywords
        self.commodity_keywords = {
            "gold": ["gold", "bullion", "24k", "22k", "tola", "sona"],
            "silver": ["silver", "chandi"],
            "oil": ["oil", "crude", "petroleum", "brent", "wti"],
            "gas": ["gas", "natural gas", "lng"],
        }

        # Sector keywords
        self.sector_keywords = {
            "banking": ["bank", "banking", "financial", "sbp", "interest rate"],
            "cement": ["cement", "construction", "infrastructure"],
            "oil_gas": ["oil", "gas", "petroleum", "energy", "exploration"],
            "technology": ["tech", "software", "it", "digital", "fintech"],
            "textile": ["textile", "garment", "fabric", "cotton"],
            "pharma": ["pharma", "pharmaceutical", "medicine", "drug"],
            "fertilizer": ["fertilizer", "urea", "agriculture"],
            "power": ["power", "electricity", "energy", "generation"],
            "auto": ["automobile", "car", "vehicle", "auto"],
            "telecom": ["telecom", "telecommunication", "mobile", "5g"],
        }

        # Event type keywords
        self.event_keywords = {
            "merger": ["merger", "acquisition", "takeover", "buyout"],
            "ipo": ["ipo", "initial public offering", "listing", "float"],
            "earnings": ["earnings", "profit", "loss", "quarterly results", "annual results"],
            "dividend": ["dividend", "payout", "distribution"],
            "policy": ["policy", "sbp", "government", "regulation", "budget"],
            "appointment": ["appointed", "ceo", "chairman", "director", "resign"],
        }

    async def extract_entities(
        self,
        title: str,
        content: str,
        use_llm: bool = True
    ) -> Dict[str, Any]:
        """
        Extract entities from news article.

        Args:
            title: Article title
            content: Article content
            use_llm: Whether to use LLM for extraction (more accurate but slower)

        Returns:
            Dictionary of extracted entities
        """
        # Start with rule-based extraction
        entities = self._rule_based_extraction(title, content)

        # Enhance with LLM if enabled
        if use_llm:
            try:
                llm_entities = await self._llm_extraction(title, content)
                entities = self._merge_entities(entities, llm_entities)
            except Exception as e:
                logger.error(f"LLM extraction failed: {e}")

        return entities

    def _rule_based_extraction(self, title: str, content: str) -> Dict[str, Any]:
        """Extract entities using rule-based patterns."""
        text = f"{title} {content}".lower()
        entities = {
            "companies": [],
            "commodities": [],
            "sectors": [],
            "events": [],
            "currencies": [],
            "financial_metrics": [],
        }

        # Extract companies
        for symbol, name in self.pakistan_companies.items():
            if symbol.lower() in text or name.lower() in text:
                entities["companies"].append({
                    "name": name,
                    "ticker": symbol,
                    "confidence": 0.9,
                })

        # Extract commodities
        for commodity_type, keywords in self.commodity_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    entities["commodities"].append({
                        "type": commodity_type,
                        "mention_context": keyword,
                        "confidence": 0.8,
                    })
                    break

        # Extract sectors
        for sector, keywords in self.sector_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    entities["sectors"].append({
                        "name": sector,
                        "confidence": 0.7,
                    })
                    break

        # Extract events
        for event_type, keywords in self.event_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    entities["events"].append({
                        "type": event_type,
                        "description": keyword,
                        "confidence": 0.75,
                    })
                    break

        # Extract currencies
        currency_patterns = [
            (r"pkr|rupee|rs\.?", "PKR"),
            (r"usd|dollar|\$", "USD"),
            (r"eur|euro|€", "EUR"),
            (r"gbp|pound|£", "GBP"),
        ]
        for pattern, code in currency_patterns:
            if re.search(pattern, text):
                entities["currencies"].append({"code": code, "context": "mentioned"})

        # Extract financial metrics
        metrics_patterns = [
            (r"revenue", "revenue"),
            (r"profit|earnings", "profit"),
            (r"loss", "loss"),
            (r"growth", "growth"),
            (r"eps", "eps"),
            (r"pe ratio|p/e", "pe_ratio"),
        ]
        for pattern, metric in metrics_patterns:
            if re.search(pattern, text):
                entities["financial_metrics"].append({
                    "metric": metric,
                    "value": None,
                    "change": "mentioned",
                })

        # Deduplicate
        for key in entities:
            entities[key] = self._deduplicate_list(entities[key])

        return entities

    async def _llm_extraction(self, title: str, content: str) -> Dict[str, Any]:
        """Extract entities using LLM."""
        prompt = ENTITY_EXTRACTION_PROMPT.format(
            title=title,
            content=content[:3000]  # Limit content length
        )

        try:
            response = await self.groq_client.generate(
                prompt=prompt,
                max_tokens=1500,
                temperature=0.1,
            )

            # Parse JSON response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            return {}

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            return {}
        except Exception as e:
            logger.error(f"LLM extraction error: {e}")
            return {}

    def _merge_entities(
        self,
        rule_based: Dict[str, Any],
        llm_based: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Merge rule-based and LLM-based extractions."""
        merged = rule_based.copy()

        for key, llm_items in llm_based.items():
            if key not in merged:
                merged[key] = []

            if not isinstance(llm_items, list):
                continue

            existing_names = set()
            for item in merged[key]:
                if isinstance(item, dict):
                    name = item.get("name") or item.get("type") or item.get("ticker")
                    if name:
                        existing_names.add(name.lower())

            for item in llm_items:
                if isinstance(item, dict):
                    name = item.get("name") or item.get("type") or item.get("ticker")
                    if name and name.lower() not in existing_names:
                        merged[key].append(item)
                        existing_names.add(name.lower())

        return merged

    def _deduplicate_list(self, items: List[Dict]) -> List[Dict]:
        """Remove duplicate items from list."""
        seen = set()
        unique = []
        for item in items:
            if isinstance(item, dict):
                key = item.get("name") or item.get("type") or item.get("ticker") or str(item)
                if key not in seen:
                    seen.add(key)
                    unique.append(item)
        return unique

    async def link_entities_to_database(
        self,
        entities: Dict[str, Any],
        known_companies: List[Dict],
        known_sectors: List[Dict],
        known_commodities: List[Dict],
    ) -> Dict[str, Any]:
        """
        Link extracted entities to database records.

        Returns matched entity IDs for database relationships.
        """
        linked = {
            "company_matches": [],
            "sector_matches": [],
            "commodity_matches": [],
        }

        # Link companies
        for company in entities.get("companies", []):
            company_name = company.get("name", "").lower()
            company_ticker = company.get("ticker", "").upper()

            for known in known_companies:
                known_name = known.get("name", "").lower()
                known_symbol = known.get("symbol", "").upper()

                if company_ticker == known_symbol or company_name in known_name or known_name in company_name:
                    linked["company_matches"].append({
                        "extracted_name": company.get("name"),
                        "db_id": known.get("id"),
                        "db_name": known.get("name"),
                        "confidence": 0.9 if company_ticker == known_symbol else 0.7,
                    })
                    break

        # Link sectors
        for sector in entities.get("sectors", []):
            sector_name = sector.get("name", "").lower()

            for known in known_sectors:
                known_name = known.get("name", "").lower()
                known_code = known.get("code", "").lower()

                if sector_name in known_name or sector_name == known_code:
                    linked["sector_matches"].append({
                        "extracted_name": sector.get("name"),
                        "db_id": known.get("id"),
                        "db_code": known.get("code"),
                        "confidence": 0.8,
                    })
                    break

        # Link commodities
        for commodity in entities.get("commodities", []):
            commodity_type = commodity.get("type", "").lower()

            for known in known_commodities:
                known_name = known.get("name", "").lower()

                if commodity_type in known_name:
                    linked["commodity_matches"].append({
                        "extracted_type": commodity.get("type"),
                        "db_id": known.get("id"),
                        "db_name": known.get("name"),
                        "confidence": 0.85,
                    })
                    break

        return linked
