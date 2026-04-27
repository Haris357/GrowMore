# Groq has been removed. This shim keeps old imports working.
from app.ai.openai_client import OpenAIClient as GroqClient, get_openai_client as get_groq_client

__all__ = ["GroqClient", "get_groq_client"]
