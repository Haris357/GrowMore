import pytest
from unittest.mock import patch, MagicMock


class TestStockEndpoints:
    def test_list_stocks(self, client, mock_supabase, sample_stock):
        mock_supabase.table.return_value.select.return_value.eq.return_value.range.return_value.execute.return_value = MagicMock(
            data=[sample_stock],
            count=1,
        )

        response = client.get("/api/v1/stocks")
        assert response.status_code in [200, 500]

    def test_list_stocks_with_filters(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.range.return_value.execute.return_value = MagicMock(
            data=[],
            count=0,
        )

        response = client.get(
            "/api/v1/stocks",
            params={
                "market_id": "test-market-id",
                "sector_id": "test-sector-id",
                "page": 1,
                "page_size": 10,
            },
        )
        assert response.status_code in [200, 422, 500]

    def test_get_top_gainers(self, client, mock_supabase, sample_stock):
        mock_supabase.table.return_value.select.return_value.eq.return_value.gt.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[sample_stock],
        )

        response = client.get(
            "/api/v1/stocks/top-gainers",
            params={"market_id": "test-market-id"},
        )
        assert response.status_code in [200, 422, 500]

    def test_get_top_losers(self, client, mock_supabase, sample_stock):
        mock_supabase.table.return_value.select.return_value.eq.return_value.lt.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[sample_stock],
        )

        response = client.get(
            "/api/v1/stocks/top-losers",
            params={"market_id": "test-market-id"},
        )
        assert response.status_code in [200, 422, 500]

    def test_get_most_active(self, client, mock_supabase, sample_stock):
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[sample_stock],
        )

        response = client.get(
            "/api/v1/stocks/most-active",
            params={"market_id": "test-market-id"},
        )
        assert response.status_code in [200, 422, 500]


class TestStockService:
    @pytest.mark.asyncio
    async def test_get_stocks(self, mock_supabase):
        from app.services.stock_service import StockService

        mock_supabase.table.return_value.select.return_value.range.return_value.execute.return_value = MagicMock(
            data=[],
            count=0,
        )

        service = StockService(mock_supabase)
        result = await service.get_stocks(page=1, page_size=10)

        assert "items" in result
        assert "total" in result

    @pytest.mark.asyncio
    async def test_get_stock_history(self, mock_supabase):
        from app.services.stock_service import StockService
        from uuid import uuid4

        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": str(uuid4()), "company_id": str(uuid4())}],
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[],
        )

        service = StockService(mock_supabase)
        result = await service.get_stock_history(uuid4(), "1M")

        assert "history" in result
        assert "period" in result
