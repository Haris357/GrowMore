# GrowMore Backend

Production-ready Python FastAPI backend for GrowMore - a multi-asset investment platform for Pakistan market.

## Features

- **Multi-Asset Support**: Stocks (PSX), Gold/Silver/Commodities, Bank Investment Products
- **AI-Powered News Analysis**: GrowNews Network with sentiment analysis, summarization, and impact prediction
- **Real-time Data**: Automated scrapers for stock prices, commodity rates, and news
- **User Portfolio Management**: Track investments across asset classes
- **Watchlists with Alerts**: Monitor assets with price alerts
- **Semantic Search**: AI-powered search using vector embeddings

## Tech Stack

- **Framework**: FastAPI
- **Database**: Supabase (PostgreSQL)
- **Vector Database**: Supabase pgvector
- **Authentication**: Firebase Auth
- **AI/LLM**: Groq API (Llama/Mixtral)
- **Scraping**: BeautifulSoup, PRAW (Reddit)
- **Scheduling**: APScheduler
- **Hosting**: Railway

## Project Structure

```
growmore-backend/
├── app/
│   ├── api/v1/endpoints/    # API endpoints
│   ├── ai/                  # AI modules (Groq, sentiment, etc.)
│   ├── config/              # Configuration
│   ├── core/                # Security, dependencies, exceptions
│   ├── db/                  # Database clients
│   ├── models/              # Pydantic models
│   ├── repositories/        # Data access layer
│   ├── schemas/             # Request/Response schemas
│   ├── scrapers/            # Web scrapers
│   ├── services/            # Business logic
│   └── utils/               # Utilities
├── scripts/                 # Seed scripts
├── tests/                   # Test files
├── Dockerfile
├── railway.toml
└── requirements.txt
```

## Setup Instructions

### 1. Clone and Setup Virtual Environment

```bash
cd growmore-backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

- **Supabase**: Get from Supabase dashboard
- **Firebase**: Download service account JSON from Firebase Console
- **Groq**: Get API key from Groq Console
- **Reddit** (optional): Create app at reddit.com/prefs/apps

### 4. Setup Database

Run the following SQL in Supabase SQL Editor:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create all tables (see schema in project documentation)
```

Then create the vector similarity function:

```sql
CREATE OR REPLACE FUNCTION match_news_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  news_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ne.news_id,
    1 - (ne.embedding <=> query_embedding) as similarity
  FROM news_embeddings ne
  WHERE 1 - (ne.embedding <=> query_embedding) > match_threshold
  ORDER BY ne.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 5. Seed Initial Data

```bash
python scripts/seed_markets.py
python scripts/seed_sample_data.py
```

### 6. Run Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

API will be available at `http://localhost:8000`
Documentation at `http://localhost:8000/docs`

## Running Scrapers Manually

```python
from app.scrapers.scheduler import get_scheduler
import asyncio

scheduler = get_scheduler()

# Run specific scraper
asyncio.run(scheduler.run_manual_scrape("news"))
asyncio.run(scheduler.run_manual_scrape("stocks"))
asyncio.run(scheduler.run_manual_scrape("commodities"))
asyncio.run(scheduler.run_manual_scrape("process"))

# Run all
asyncio.run(scheduler.run_manual_scrape("all"))
```

## Running Tests

```bash
pytest tests/ -v
pytest tests/ -v --cov=app
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/verify` - Verify Firebase token
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/me` - Update profile
- `PUT /api/v1/auth/preferences` - Update preferences

### Markets
- `GET /api/v1/markets` - List markets
- `GET /api/v1/markets/{id}` - Get market
- `GET /api/v1/markets/{id}/sectors` - Get sectors

### Stocks
- `GET /api/v1/stocks` - List stocks
- `GET /api/v1/stocks/{id}` - Get stock
- `GET /api/v1/stocks/{id}/history` - Price history
- `GET /api/v1/stocks/top-gainers` - Top gainers
- `GET /api/v1/stocks/top-losers` - Top losers
- `GET /api/v1/stocks/most-active` - Most active

### Commodities
- `GET /api/v1/commodities` - List commodities
- `GET /api/v1/commodities/{id}` - Get commodity
- `GET /api/v1/commodities/gold` - Gold rates
- `GET /api/v1/commodities/silver` - Silver rates

### Bank Products
- `GET /api/v1/bank-products` - List products
- `GET /api/v1/bank-products/{id}` - Get product
- `GET /api/v1/bank-products/banks` - List banks

### News
- `GET /api/v1/news` - List articles
- `GET /api/v1/news/{id}` - Get article
- `GET /api/v1/news/trending` - Trending news
- `GET /api/v1/news/search` - Search articles

### Portfolio (Auth Required)
- `GET /api/v1/portfolios` - List portfolios
- `POST /api/v1/portfolios` - Create portfolio
- `GET /api/v1/portfolios/{id}` - Get portfolio
- `POST /api/v1/portfolios/{id}/holdings` - Add holding
- `POST /api/v1/portfolios/{id}/transactions` - Record transaction

### Watchlist (Auth Required)
- `GET /api/v1/watchlists` - List watchlists
- `POST /api/v1/watchlists` - Create watchlist
- `POST /api/v1/watchlists/{id}/items` - Add item
- `PUT /api/v1/watchlists/{id}/items/{item_id}/alerts` - Set alerts

### Analytics
- `GET /api/v1/analytics/market-overview` - Market summary
- `GET /api/v1/analytics/sector-performance` - Sector performance
- `GET /api/v1/analytics/portfolio-summary` - Portfolio summary

### Search
- `GET /api/v1/search` - Global search
- `GET /api/v1/search/semantic` - AI semantic search

## Deployment

### Railway

1. Connect GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically on push

### Docker

```bash
docker build -t growmore-backend .
docker run -p 8000:8000 --env-file .env growmore-backend
```

## License

Proprietary - All rights reserved
