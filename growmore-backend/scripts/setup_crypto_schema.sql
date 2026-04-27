-- ============================================================
-- Crypto Market Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS crypto_coins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id TEXT UNIQUE NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    image TEXT,
    current_price NUMERIC,
    market_cap NUMERIC,
    market_cap_rank INTEGER,
    fully_diluted_valuation NUMERIC,
    total_volume NUMERIC,
    high_24h NUMERIC,
    low_24h NUMERIC,
    price_change_24h NUMERIC,
    price_change_percentage_24h NUMERIC,
    price_change_percentage_7d NUMERIC,
    price_change_percentage_1h NUMERIC,
    market_cap_change_percentage_24h NUMERIC,
    circulating_supply NUMERIC,
    total_supply NUMERIC,
    max_supply NUMERIC,
    ath NUMERIC,
    ath_change_percentage NUMERIC,
    ath_date TIMESTAMPTZ,
    atl NUMERIC,
    atl_change_percentage NUMERIC,
    atl_date TIMESTAMPTZ,
    sparkline_7d JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crypto_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    price NUMERIC,
    market_cap NUMERIC,
    volume NUMERIC,
    UNIQUE(coin_id, timestamp)
);

CREATE TABLE IF NOT EXISTS crypto_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    source_name TEXT,
    published_at TIMESTAMPTZ,
    currencies JSONB,
    votes_positive INTEGER DEFAULT 0,
    votes_negative INTEGER DEFAULT 0,
    votes_important INTEGER DEFAULT 0,
    kind TEXT DEFAULT 'news',
    sentiment TEXT DEFAULT 'neutral',
    domain TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crypto_global (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_cryptocurrencies INTEGER,
    markets INTEGER,
    total_market_cap_usd NUMERIC,
    total_volume_usd NUMERIC,
    market_cap_percentage JSONB,
    market_cap_change_24h NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crypto_coins_rank ON crypto_coins(market_cap_rank);
CREATE INDEX IF NOT EXISTS idx_crypto_coins_symbol ON crypto_coins(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_history_coin_ts ON crypto_history(coin_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_crypto_news_published ON crypto_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_news_sentiment ON crypto_news(sentiment);

-- RLS
ALTER TABLE crypto_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_global ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read crypto_coins" ON crypto_coins;
    CREATE POLICY "Public read crypto_coins" ON crypto_coins FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Service full crypto_coins" ON crypto_coins;
    CREATE POLICY "Service full crypto_coins" ON crypto_coins FOR ALL USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Public read crypto_history" ON crypto_history;
    CREATE POLICY "Public read crypto_history" ON crypto_history FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Service full crypto_history" ON crypto_history;
    CREATE POLICY "Service full crypto_history" ON crypto_history FOR ALL USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Public read crypto_news" ON crypto_news;
    CREATE POLICY "Public read crypto_news" ON crypto_news FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Service full crypto_news" ON crypto_news;
    CREATE POLICY "Service full crypto_news" ON crypto_news FOR ALL USING (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Public read crypto_global" ON crypto_global;
    CREATE POLICY "Public read crypto_global" ON crypto_global FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Service full crypto_global" ON crypto_global;
    CREATE POLICY "Service full crypto_global" ON crypto_global FOR ALL USING (auth.role() = 'service_role');
END $$;
