from typing import Dict, Any, Optional
from decimal import Decimal

from app.ai.groq_client import get_groq_client
from app.ai.prompts.sentiment import SENTIMENT_SYSTEM_PROMPT, SENTIMENT_USER_PROMPT


class SentimentAnalyzer:
    def __init__(self):
        self.groq_client = get_groq_client()

    async def analyze(
        self,
        title: str,
        content: str,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": SENTIMENT_SYSTEM_PROMPT},
            {"role": "user", "content": SENTIMENT_USER_PROMPT.format(
                title=title,
                content=content[:4000],
            )},
        ]

        result = await self.groq_client.complete_json(
            messages=messages,
            model=model,
            temperature=0.3,
            max_tokens=512,
        )

        if "error" in result:
            return self._default_result()

        return self._normalize_result(result)

    def _normalize_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        sentiment_score = result.get("sentiment_score", 0)
        if isinstance(sentiment_score, str):
            try:
                sentiment_score = float(sentiment_score)
            except ValueError:
                sentiment_score = 0

        sentiment_score = max(-1, min(1, sentiment_score))

        if sentiment_score > 0.3:
            sentiment_label = "positive"
        elif sentiment_score < -0.3:
            sentiment_label = "negative"
        else:
            sentiment_label = "neutral"

        return {
            "sentiment_score": Decimal(str(round(sentiment_score, 3))),
            "sentiment_label": sentiment_label,
            "confidence": result.get("confidence", 0.5),
            "key_factors": result.get("key_factors", []),
        }

    def _default_result(self) -> Dict[str, Any]:
        return {
            "sentiment_score": Decimal("0"),
            "sentiment_label": "neutral",
            "confidence": 0,
            "key_factors": [],
        }

    async def analyze_batch(
        self,
        articles: list,
    ) -> list:
        results = []
        for article in articles:
            result = await self.analyze(
                title=article.get("title", ""),
                content=article.get("content", ""),
            )
            results.append({
                "article_id": article.get("id"),
                **result,
            })
        return results
