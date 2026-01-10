import hashlib
from typing import List, Optional

from app.ai.groq_client import get_groq_client


class EmbeddingService:
    def __init__(self):
        self.groq_client = get_groq_client()
        self.embedding_dim = 1536
        self._cache: dict = {}

    async def generate_embedding(self, text: str) -> List[float]:
        cache_key = hashlib.md5(text.encode()).hexdigest()

        if cache_key in self._cache:
            return self._cache[cache_key]

        embedding = await self._generate_pseudo_embedding(text)
        self._cache[cache_key] = embedding
        return embedding

    async def _generate_pseudo_embedding(self, text: str) -> List[float]:
        import hashlib
        import math

        text_hash = hashlib.sha512(text.encode()).hexdigest()

        embedding = []
        for i in range(0, len(text_hash), 4):
            chunk = text_hash[i:i+4]
            value = int(chunk, 16) / 65535.0
            embedding.append(value * 2 - 1)

        while len(embedding) < self.embedding_dim:
            extended_hash = hashlib.sha512(
                (text + str(len(embedding))).encode()
            ).hexdigest()
            for i in range(0, len(extended_hash), 4):
                if len(embedding) >= self.embedding_dim:
                    break
                chunk = extended_hash[i:i+4]
                value = int(chunk, 16) / 65535.0
                embedding.append(value * 2 - 1)

        magnitude = math.sqrt(sum(x**2 for x in embedding))
        if magnitude > 0:
            embedding = [x / magnitude for x in embedding]

        return embedding[:self.embedding_dim]

    async def generate_embeddings_batch(
        self, texts: List[str]
    ) -> List[List[float]]:
        embeddings = []
        for text in texts:
            embedding = await self.generate_embedding(text)
            embeddings.append(embedding)
        return embeddings

    def clear_cache(self):
        self._cache.clear()
