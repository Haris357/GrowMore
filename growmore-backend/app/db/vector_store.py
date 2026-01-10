from typing import List, Optional, Dict, Any
from uuid import UUID

from supabase import Client

from app.db.supabase import get_supabase_service_client


class VectorStore:
    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_supabase_service_client()

    async def store_embedding(
        self,
        news_id: UUID,
        embedding: List[float],
    ) -> Dict[str, Any]:
        result = self.client.table("news_embeddings").insert({
            "news_id": str(news_id),
            "embedding": embedding,
        }).execute()

        return result.data[0] if result.data else None

    async def search_similar(
        self,
        query_embedding: List[float],
        limit: int = 10,
        threshold: float = 0.7,
    ) -> List[Dict[str, Any]]:
        result = self.client.rpc(
            "match_news_embeddings",
            {
                "query_embedding": query_embedding,
                "match_threshold": threshold,
                "match_count": limit,
            }
        ).execute()

        return result.data if result.data else []

    async def delete_embedding(self, news_id: UUID) -> bool:
        result = self.client.table("news_embeddings").delete().eq(
            "news_id", str(news_id)
        ).execute()

        return len(result.data) > 0 if result.data else False

    async def update_embedding(
        self,
        news_id: UUID,
        embedding: List[float],
    ) -> Dict[str, Any]:
        result = self.client.table("news_embeddings").update({
            "embedding": embedding,
        }).eq("news_id", str(news_id)).execute()

        return result.data[0] if result.data else None

    async def get_embedding(self, news_id: UUID) -> Optional[Dict[str, Any]]:
        result = self.client.table("news_embeddings").select("*").eq(
            "news_id", str(news_id)
        ).execute()

        return result.data[0] if result.data else None
