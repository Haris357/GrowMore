from typing import Dict, Any, List, Optional
from decimal import Decimal

from app.ai.groq_client import get_groq_client
from app.ai.prompts.impact import IMPACT_SYSTEM_PROMPT, IMPACT_USER_PROMPT


class ImpactPredictor:
    def __init__(self):
        self.groq_client = get_groq_client()

    async def predict(
        self,
        title: str,
        content: str,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": IMPACT_SYSTEM_PROMPT},
            {"role": "user", "content": IMPACT_USER_PROMPT.format(
                title=title,
                content=content[:4000],
            )},
        ]

        result = await self.groq_client.complete_json(
            messages=messages,
            model=model,
            temperature=0.4,
            max_tokens=1024,
        )

        if "error" in result:
            return self._default_result()

        return self._normalize_result(result)

    def _normalize_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        impact_score = result.get("impact_score", 0)
        if isinstance(impact_score, str):
            try:
                impact_score = float(impact_score)
            except ValueError:
                impact_score = 0

        impact_score = max(0, min(1, impact_score))

        if impact_score >= 0.7:
            impact_level = "high"
        elif impact_score >= 0.4:
            impact_level = "medium"
        else:
            impact_level = "low"

        mentioned_entities = result.get("mentioned_entities", [])
        if not isinstance(mentioned_entities, list):
            mentioned_entities = []

        normalized_entities = []
        for entity in mentioned_entities[:10]:
            if not isinstance(entity, dict):
                continue
            normalized_entities.append({
                "name": entity.get("name", "Unknown"),
                "type": entity.get("type", "stock"),
                "symbol": entity.get("symbol"),
                "impact": entity.get("impact", "neutral"),
                "relevance": min(1, max(0, entity.get("relevance", 0.5))),
            })

        return {
            "impact_score": Decimal(str(round(impact_score, 3))),
            "impact_level": impact_level,
            "affected_sectors": result.get("affected_sectors", [])[:5],
            "mentioned_entities": normalized_entities,
            "time_horizon": result.get("time_horizon", "short_term"),
            "analysis": result.get("analysis", "")[:500],
        }

    def _default_result(self) -> Dict[str, Any]:
        return {
            "impact_score": Decimal("0"),
            "impact_level": "low",
            "affected_sectors": [],
            "mentioned_entities": [],
            "time_horizon": "short_term",
            "analysis": "",
        }

    async def predict_batch(
        self,
        articles: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        results = []
        for article in articles:
            result = await self.predict(
                title=article.get("title", ""),
                content=article.get("content", ""),
            )
            results.append({
                "article_id": article.get("id"),
                **result,
            })
        return results
