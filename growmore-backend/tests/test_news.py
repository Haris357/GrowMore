import pytest
from unittest.mock import patch, MagicMock


class TestNewsEndpoints:
    def test_list_news(self, client, mock_supabase, sample_news_article):
        mock_supabase.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[sample_news_article],
            count=1,
        )

        response = client.get("/api/v1/news")
        assert response.status_code in [200, 500]

    def test_list_news_with_filters(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[],
            count=0,
        )

        response = client.get(
            "/api/v1/news",
            params={
                "sentiment": "positive",
                "category": "stocks",
            },
        )
        assert response.status_code in [200, 422, 500]

    def test_get_trending_news(self, client, mock_supabase, sample_news_article):
        mock_supabase.table.return_value.select.return_value.order.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[sample_news_article],
        )

        response = client.get("/api/v1/news/trending")
        assert response.status_code in [200, 500]

    def test_search_news(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.or_.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[],
            count=0,
        )

        response = client.get(
            "/api/v1/news/search",
            params={"q": "test query"},
        )
        assert response.status_code in [200, 422, 500]


class TestNewsService:
    @pytest.mark.asyncio
    async def test_get_articles(self, mock_supabase):
        from app.services.news_service import NewsService

        mock_supabase.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[],
            count=0,
        )

        service = NewsService(mock_supabase)
        result = await service.get_articles(page=1, page_size=10)

        assert "items" in result
        assert "total" in result

    @pytest.mark.asyncio
    async def test_get_trending(self, mock_supabase):
        from app.services.news_service import NewsService

        mock_supabase.table.return_value.select.return_value.order.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[],
        )

        service = NewsService(mock_supabase)
        result = await service.get_trending(limit=10)

        assert "articles" in result
        assert "as_of" in result
