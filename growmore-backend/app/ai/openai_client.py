"""
OpenAI client — the project-wide AI client for all LLM calls.
Drop-in replacement for the former Groq client; same interface.
Default model: gpt-4.1-mini  (override via OPENAI_MODEL env var)
"""
import json
from functools import lru_cache
from typing import Any, Dict, List, Optional

from openai import OpenAI, AsyncOpenAI

from app.config.settings import settings


class OpenAIClient:
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.async_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.default_model = settings.openai_model

    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs,
    ) -> str:
        response = await self.async_client.chat.completions.create(
            model=model or self.default_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs,
        )
        return response.choices[0].message.content

    async def complete_json(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1024,
        **kwargs,
    ) -> Dict[str, Any]:
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

    async def generate(
        self,
        prompt: str,
        system: str = "You are a helpful financial analyst.",
        model: Optional[str] = None,
        temperature: float = 0.5,
        max_tokens: int = 1024,
    ) -> str:
        """Convenience wrapper: single prompt string → response string."""
        return await self.complete(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )


@lru_cache()
def get_openai_client() -> OpenAIClient:
    return OpenAIClient()
