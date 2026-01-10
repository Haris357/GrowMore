from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.repositories.stock_repository import CompanyRepository
from app.repositories.commodity_repository import CommodityRepository
from app.repositories.bank_product_repository import BankRepository, BankProductRepository
from app.repositories.news_repository import NewsRepository
from app.db.vector_store import VectorStore
from app.ai.embeddings import EmbeddingService


class SearchService:
    def __init__(self, db: Client):
        self.db = db
        self.company_repo = CompanyRepository(db)
        self.commodity_repo = CommodityRepository(db)
        self.bank_repo = BankRepository(db)
        self.product_repo = BankProductRepository(db)
        self.news_repo = NewsRepository(db)
        self.vector_store = VectorStore(db)
        self.embedding_service = EmbeddingService()

    async def global_search(
        self,
        query: str,
        market_id: Optional[UUID] = None,
        include_stocks: bool = True,
        include_commodities: bool = True,
        include_banks: bool = True,
        include_news: bool = True,
        limit: int = 10,
    ) -> Dict[str, Any]:
        results = {
            "stocks": [],
            "commodities": [],
            "banks": [],
            "news": [],
        }

        if include_stocks and market_id:
            companies = await self.company_repo.search_companies(market_id, query, limit)
            results["stocks"] = [
                {
                    "id": str(c.id),
                    "symbol": c.symbol,
                    "name": c.name,
                    "type": "stock",
                }
                for c in companies
            ]

        if include_commodities:
            commodity_result = self.db.table("commodities").select(
                "id, name, current_price"
            ).ilike("name", f"%{query}%")

            if market_id:
                commodity_result = commodity_result.eq("market_id", str(market_id))

            commodity_result = commodity_result.limit(limit).execute()

            results["commodities"] = [
                {
                    "id": c["id"],
                    "name": c["name"],
                    "current_price": c["current_price"],
                    "type": "commodity",
                }
                for c in commodity_result.data or []
            ]

        if include_banks:
            bank_result = self.db.table("banks").select("id, name, code, logo_url").ilike(
                "name", f"%{query}%"
            )

            if market_id:
                bank_result = bank_result.eq("market_id", str(market_id))

            bank_result = bank_result.limit(limit).execute()

            results["banks"] = [
                {
                    "id": b["id"],
                    "name": b["name"],
                    "code": b["code"],
                    "logo_url": b["logo_url"],
                    "type": "bank",
                }
                for b in bank_result.data or []
            ]

        if include_news:
            news_result = await self.news_repo.search_articles(query, page=1, page_size=limit)
            results["news"] = [
                {
                    "id": n["id"],
                    "title": n["title"],
                    "summary": n.get("summary"),
                    "published_at": n.get("published_at"),
                    "type": "news",
                }
                for n in news_result.get("items", [])
            ]

        return results

    async def semantic_search(
        self,
        query: str,
        limit: int = 10,
        threshold: float = 0.7,
    ) -> List[Dict[str, Any]]:
        query_embedding = await self.embedding_service.generate_embedding(query)
        results = await self.vector_store.search_similar(query_embedding, limit, threshold)

        articles = []
        for result in results:
            article = await self.news_repo.get_by_id(result["news_id"])
            if article:
                articles.append({
                    "id": article["id"],
                    "title": article["title"],
                    "summary": article.get("summary"),
                    "url": article["url"],
                    "published_at": article.get("published_at"),
                    "similarity_score": result.get("similarity", 0),
                    "type": "news",
                })

        return articles
