import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch


@pytest.fixture
def mock_supabase():
    with patch("app.db.supabase.get_supabase_client") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_firebase():
    with patch("app.config.firebase.get_firebase_app") as mock:
        mock.return_value = MagicMock()
        yield mock


@pytest.fixture
def mock_groq():
    with patch("app.ai.groq_client.get_groq_client") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def client(mock_supabase, mock_firebase):
    from app.main import app
    return TestClient(app)


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test_token"}


@pytest.fixture
def mock_current_user():
    from app.models.user import User
    from uuid import uuid4
    from datetime import datetime

    return User(
        id=uuid4(),
        firebase_uid="test_firebase_uid",
        email="test@example.com",
        display_name="Test User",
        auth_provider="email",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


@pytest.fixture
def sample_market():
    from uuid import uuid4
    from datetime import datetime

    return {
        "id": str(uuid4()),
        "code": "PSX",
        "name": "Pakistan Stock Exchange",
        "country": "Pakistan",
        "country_code": "PK",
        "currency": "PKR",
        "currency_symbol": "Rs",
        "timezone": "Asia/Karachi",
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def sample_stock():
    from uuid import uuid4
    from datetime import datetime

    return {
        "id": str(uuid4()),
        "company_id": str(uuid4()),
        "current_price": 100.50,
        "change_amount": 2.50,
        "change_percentage": 2.55,
        "volume": 1000000,
        "market_cap": 50000000000,
        "last_updated": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def sample_news_article():
    from uuid import uuid4
    from datetime import datetime

    return {
        "id": str(uuid4()),
        "source_id": str(uuid4()),
        "title": "Test News Article",
        "slug": "test-news-article",
        "summary": "This is a test news article summary.",
        "url": "https://example.com/test-article",
        "published_at": datetime.utcnow().isoformat(),
        "sentiment_score": 0.5,
        "sentiment_label": "positive",
        "impact_score": 0.7,
        "categories": ["stocks", "economy"],
        "tags": ["test", "article"],
        "is_processed": True,
        "created_at": datetime.utcnow().isoformat(),
    }
