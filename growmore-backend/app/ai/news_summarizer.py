from typing import Dict, Any, List, Optional

from app.ai.groq_client import get_groq_client
from app.ai.prompts.summary import SUMMARY_SYSTEM_PROMPT, SUMMARY_USER_PROMPT


class NewsSummarizer:
    def __init__(self):
        self.groq_client = get_groq_client()

    async def summarize(
        self,
        title: str,
        content: str,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": SUMMARY_USER_PROMPT.format(
                title=title,
                content=content[:4000],
            )},
        ]

        result = await self.groq_client.complete_json(
            messages=messages,
            model=model,
            temperature=0.5,
            max_tokens=512,
        )

        if "error" in result:
            return self._default_result(title)

        return self._normalize_result(result)

    def _normalize_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        summary = result.get("summary", "")
        if len(summary) > 500:
            summary = summary[:497] + "..."

        key_points = result.get("key_points", [])
        if not isinstance(key_points, list):
            key_points = []
        key_points = key_points[:5]

        categories = result.get("categories", [])
        if not isinstance(categories, list):
            categories = []
        valid_categories = [
            "stocks", "commodities", "banking", "economy", "policy",
            "currency", "trade", "energy", "technology", "real_estate"
        ]
        categories = [c for c in categories if c in valid_categories][:3]

        tags = result.get("tags", [])
        if not isinstance(tags, list):
            tags = []
        tags = tags[:10]

        return {
            "summary": summary,
            "key_points": key_points,
            "categories": categories,
            "tags": tags,
        }

    def _default_result(self, title: str) -> Dict[str, Any]:
        return {
            "summary": title,
            "key_points": [],
            "categories": [],
            "tags": [],
        }

    async def summarize_batch(
        self,
        articles: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        results = []
        for article in articles:
            result = await self.summarize(
                title=article.get("title", ""),
                content=article.get("content", ""),
            )
            results.append({
                "article_id": article.get("id"),
                **result,
            })
        return results
