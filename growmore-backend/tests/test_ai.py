import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from decimal import Decimal


class TestSentimentAnalyzer:
    @pytest.mark.asyncio
    async def test_analyze_positive_sentiment(self):
        from app.ai.sentiment_analyzer import SentimentAnalyzer

        with patch("app.ai.groq_client.get_groq_client") as mock_groq:
            mock_client = MagicMock()
            mock_client.complete_json = AsyncMock(return_value={
                "sentiment_score": 0.8,
                "sentiment_label": "positive",
                "confidence": 0.9,
                "key_factors": ["growth", "profit"],
            })
            mock_groq.return_value = mock_client

            analyzer = SentimentAnalyzer()
            analyzer.groq_client = mock_client

            result = await analyzer.analyze(
                "Stock prices surge on positive earnings",
                "Company reports record profits...",
            )

            assert result["sentiment_label"] == "positive"
            assert result["sentiment_score"] > 0

    @pytest.mark.asyncio
    async def test_analyze_negative_sentiment(self):
        from app.ai.sentiment_analyzer import SentimentAnalyzer

        with patch("app.ai.groq_client.get_groq_client") as mock_groq:
            mock_client = MagicMock()
            mock_client.complete_json = AsyncMock(return_value={
                "sentiment_score": -0.7,
                "sentiment_label": "negative",
                "confidence": 0.85,
                "key_factors": ["decline", "loss"],
            })
            mock_groq.return_value = mock_client

            analyzer = SentimentAnalyzer()
            analyzer.groq_client = mock_client

            result = await analyzer.analyze(
                "Market crashes amid economic concerns",
                "Investors panic as prices fall...",
            )

            assert result["sentiment_label"] == "negative"
            assert result["sentiment_score"] < 0

    @pytest.mark.asyncio
    async def test_analyze_error_handling(self):
        from app.ai.sentiment_analyzer import SentimentAnalyzer

        with patch("app.ai.groq_client.get_groq_client") as mock_groq:
            mock_client = MagicMock()
            mock_client.complete_json = AsyncMock(return_value={"error": "API error"})
            mock_groq.return_value = mock_client

            analyzer = SentimentAnalyzer()
            analyzer.groq_client = mock_client

            result = await analyzer.analyze("Test", "Test content")

            assert result["sentiment_label"] == "neutral"
            assert result["sentiment_score"] == Decimal("0")


class TestNewsSummarizer:
    @pytest.mark.asyncio
    async def test_summarize_article(self):
        from app.ai.news_summarizer import NewsSummarizer

        with patch("app.ai.groq_client.get_groq_client") as mock_groq:
            mock_client = MagicMock()
            mock_client.complete_json = AsyncMock(return_value={
                "summary": "Test summary of the article.",
                "key_points": ["Point 1", "Point 2"],
                "categories": ["stocks"],
                "tags": ["test", "article"],
            })
            mock_groq.return_value = mock_client

            summarizer = NewsSummarizer()
            summarizer.groq_client = mock_client

            result = await summarizer.summarize(
                "Test Article Title",
                "Long article content here...",
            )

            assert "summary" in result
            assert len(result["summary"]) > 0
            assert "key_points" in result
            assert "categories" in result


class TestImpactPredictor:
    @pytest.mark.asyncio
    async def test_predict_impact(self):
        from app.ai.impact_predictor import ImpactPredictor

        with patch("app.ai.groq_client.get_groq_client") as mock_groq:
            mock_client = MagicMock()
            mock_client.complete_json = AsyncMock(return_value={
                "impact_score": 0.8,
                "impact_level": "high",
                "affected_sectors": ["banking"],
                "mentioned_entities": [
                    {"name": "HBL", "type": "stock", "impact": "positive", "relevance": 0.9}
                ],
                "time_horizon": "short_term",
                "analysis": "Significant market impact expected.",
            })
            mock_groq.return_value = mock_client

            predictor = ImpactPredictor()
            predictor.groq_client = mock_client

            result = await predictor.predict(
                "Bank announces major expansion",
                "HBL to open 100 new branches...",
            )

            assert result["impact_level"] == "high"
            assert result["impact_score"] > 0
            assert len(result["mentioned_entities"]) > 0


class TestEmbeddingService:
    @pytest.mark.asyncio
    async def test_generate_embedding(self):
        from app.ai.embeddings import EmbeddingService

        service = EmbeddingService()
        embedding = await service.generate_embedding("Test text for embedding")

        assert len(embedding) == 1536
        assert all(isinstance(x, float) for x in embedding)

    @pytest.mark.asyncio
    async def test_embedding_caching(self):
        from app.ai.embeddings import EmbeddingService

        service = EmbeddingService()

        text = "Same text for caching test"
        embedding1 = await service.generate_embedding(text)
        embedding2 = await service.generate_embedding(text)

        assert embedding1 == embedding2
