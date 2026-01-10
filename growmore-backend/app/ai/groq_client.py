import asyncio
from functools import lru_cache
from typing import Any, Dict, List, Optional

from groq import Groq, AsyncGroq

from app.config.settings import settings


class GroqClient:
    def __init__(self):
        self.client = Groq(api_key=settings.groq_api_key)
        self.async_client = AsyncGroq(api_key=settings.groq_api_key)
        self.default_model = settings.groq_model
        self.rate_limit_delay = 0.5

    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs,
    ) -> str:
        try:
            response = await self.async_client.chat.completions.create(
                model=model or self.default_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )
            await asyncio.sleep(self.rate_limit_delay)
            return response.choices[0].message.content
        except Exception as e:
            if "rate_limit" in str(e).lower():
                await asyncio.sleep(5)
                return await self.complete(messages, model, temperature, max_tokens, **kwargs)
            raise

    async def complete_json(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1024,
        **kwargs,
    ) -> Dict[str, Any]:
        import json

        response = await self.complete(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
            **kwargs,
        )

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"error": "Failed to parse JSON response", "raw": response}

    def complete_sync(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs,
    ) -> str:
        response = self.client.chat.completions.create(
            model=model or self.default_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs,
        )
        return response.choices[0].message.content


@lru_cache()
def get_groq_client() -> GroqClient:
    return GroqClient()
