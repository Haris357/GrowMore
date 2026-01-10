-- GrowMore Database Schema
-- Run this in Supabase SQL Editor

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Markets
CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    country_code VARCHAR(5) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    currency_symbol VARCHAR(5) NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    trading_hours JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    photo_url TEXT,
    auth_provider VARCHAR(20) NOT NULL,
    preferred_market_id UUID REFERENCES markets(id),
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sectors
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_id, code)
);

-- 4. Companies
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    sector_id UUID REFERENCES sectors(id),
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    website VARCHAR(255),
    founded_year INTEGER,
    employees INTEGER,
    headquarters VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_id, symbol)
);

-- 5. Stocks
CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    current_price DECIMAL(18, 4),
    open_price DECIMAL(18, 4),
    high_price DECIMAL(18, 4),
    low_price DECIMAL(18, 4),
    close_price DECIMAL(18, 4),
    previous_close DECIMAL(18, 4),
    change_amount DECIMAL(18, 4),
    change_percentage DECIMAL(8, 4),
    volume BIGINT,
    avg_volume BIGINT,
    market_cap DECIMAL(24, 2),
    pe_ratio DECIMAL(10, 4),
    eps DECIMAL(18, 4),
    dividend_yield DECIMAL(8, 4),
    week_52_high DECIMAL(18, 4),
    week_52_low DECIMAL(18, 4),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Stock History
CREATE TABLE IF NOT EXISTS stock_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open_price DECIMAL(18, 4),
    high_price DECIMAL(18, 4),
    low_price DECIMAL(18, 4),
    close_price DECIMAL(18, 4),
    volume BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, date)
);

-- 7. Commodity Types
CREATE TABLE IF NOT EXISTS commodity_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Commodities
CREATE TABLE IF NOT EXISTS commodities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    commodity_type_id UUID NOT NULL REFERENCES commodity_types(id),
    name VARCHAR(100) NOT NULL,
    current_price DECIMAL(18, 4),
    price_per_unit VARCHAR(20),
    change_amount DECIMAL(18, 4),
    change_percentage DECIMAL(8, 4),
    high_24h DECIMAL(18, 4),
    low_24h DECIMAL(18, 4),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_id, commodity_type_id, name)
);

-- 9. Commodity History
CREATE TABLE IF NOT EXISTS commodity_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    price DECIMAL(18, 4),
    high_price DECIMAL(18, 4),
    low_price DECIMAL(18, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(commodity_id, date)
);

-- 10. Bank Product Types
CREATE TABLE IF NOT EXISTS bank_product_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Banks
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    logo_url TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_id, code)
);

-- 12. Bank Products
CREATE TABLE IF NOT EXISTS bank_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    product_type_id UUID NOT NULL REFERENCES bank_product_types(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    interest_rate DECIMAL(6, 4),
    min_deposit DECIMAL(18, 2),
    max_deposit DECIMAL(18, 2),
    tenure_min_days INTEGER,
    tenure_max_days INTEGER,
    features JSONB DEFAULT '[]',
    terms_conditions TEXT,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. News Sources
CREATE TABLE IF NOT EXISTS news_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    base_url VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    reliability_score DECIMAL(3, 2) DEFAULT 0.5,
    is_active BOOLEAN DEFAULT true,
    scrape_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. News Articles
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES news_sources(id),
    market_id UUID REFERENCES markets(id),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(550) UNIQUE,
    content TEXT,
    summary TEXT,
    url VARCHAR(500) UNIQUE NOT NULL,
    image_url TEXT,
    author VARCHAR(100),
    published_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    sentiment_score DECIMAL(4, 3),
    sentiment_label VARCHAR(20),
    impact_score DECIMAL(4, 3),
    categories VARCHAR(50)[] DEFAULT '{}',
    tags VARCHAR(50)[] DEFAULT '{}',
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. News Embeddings (Vector Store)
CREATE TABLE IF NOT EXISTS news_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    news_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_embeddings_embedding_idx ON news_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 16. News Entity Mentions
CREATE TABLE IF NOT EXISTS news_entity_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    news_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    relevance_score DECIMAL(4, 3),
    sentiment_score DECIMAL(4, 3),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Portfolios
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    total_invested DECIMAL(18, 2) DEFAULT 0,
    current_value DECIMAL(18, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Portfolio Holdings
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    holding_type VARCHAR(20) NOT NULL,
    holding_id UUID NOT NULL,
    quantity DECIMAL(18, 6) NOT NULL,
    avg_buy_price DECIMAL(18, 4) NOT NULL,
    total_invested DECIMAL(18, 2) NOT NULL,
    current_value DECIMAL(18, 2),
    profit_loss DECIMAL(18, 2),
    profit_loss_percentage DECIMAL(8, 4),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Portfolio Transactions
CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    holding_type VARCHAR(20) NOT NULL,
    holding_id UUID NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    quantity DECIMAL(18, 6) NOT NULL,
    price DECIMAL(18, 4) NOT NULL,
    total_amount DECIMAL(18, 2) NOT NULL,
    fees DECIMAL(18, 2) DEFAULT 0,
    notes TEXT,
    transaction_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Watchlist Items
CREATE TABLE IF NOT EXISTS watchlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL,
    item_id UUID NOT NULL,
    price_alert_above DECIMAL(18, 4),
    price_alert_below DECIMAL(18, 4),
    notes TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(watchlist_id, item_type, item_id)
);

-- 22. User Alerts
CREATE TABLE IF NOT EXISTS user_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(20),
    entity_id UUID,
    condition JSONB NOT NULL,
    message TEXT,
    is_triggered BOOLEAN DEFAULT false,
    triggered_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector Similarity Search Function
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_companies_symbol ON companies(symbol);
CREATE INDEX IF NOT EXISTS idx_companies_market_id ON companies(market_id);
CREATE INDEX IF NOT EXISTS idx_stocks_company_id ON stocks(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_stock_id_date ON stock_history(stock_id, date);
CREATE INDEX IF NOT EXISTS idx_commodities_market_id ON commodities(market_id);
CREATE INDEX IF NOT EXISTS idx_commodity_history_commodity_id_date ON commodity_history(commodity_id, date);
CREATE INDEX IF NOT EXISTS idx_news_articles_source_id ON news_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_is_processed ON news_articles(is_processed);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);

-- Enable Row Level Security (Optional - configure as needed)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: ADVANCED FEATURES TABLES
-- ============================================================================

-- 23. User Profiles (Personalization)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    risk_profile VARCHAR(20) DEFAULT 'moderate',
    experience_level VARCHAR(20) DEFAULT 'beginner',
    investment_horizon VARCHAR(20) DEFAULT 'medium_term',
    preferred_sectors VARCHAR(50)[] DEFAULT '{}',
    preferred_asset_types VARCHAR(50)[] DEFAULT '{}',
    monthly_investment_capacity DECIMAL(18, 2),
    financial_goals TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. Investment Goals
CREATE TABLE IF NOT EXISTS investment_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(18, 2) NOT NULL,
    current_amount DECIMAL(18, 2) DEFAULT 0,
    target_date DATE,
    goal_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    linked_portfolio_id UUID REFERENCES portfolios(id),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. Goal Contributions
CREATE TABLE IF NOT EXISTS goal_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES investment_goals(id) ON DELETE CASCADE,
    amount DECIMAL(18, 2) NOT NULL,
    contribution_date DATE NOT NULL,
    source VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. Price Alerts
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    target_value DECIMAL(18, 4) NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMPTZ,
    triggered_value DECIMAL(18, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    price_alerts BOOLEAN DEFAULT true,
    news_alerts BOOLEAN DEFAULT true,
    portfolio_updates BOOLEAN DEFAULT true,
    goal_reminders BOOLEAN DEFAULT true,
    market_updates BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. Saved Screens (Stock Screener)
CREATE TABLE IF NOT EXISTS saved_screens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    filters JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. Market Indices
CREATE TABLE IF NOT EXISTS market_indices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID REFERENCES markets(id),
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    current_value DECIMAL(18, 4),
    open_value DECIMAL(18, 4),
    high_value DECIMAL(18, 4),
    low_value DECIMAL(18, 4),
    previous_close DECIMAL(18, 4),
    change_amount DECIMAL(18, 4),
    change_percentage DECIMAL(8, 4),
    volume BIGINT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 31. Portfolio Snapshots (Historical tracking)
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_value DECIMAL(18, 2) NOT NULL,
    total_invested DECIMAL(18, 2) NOT NULL,
    total_gain_loss DECIMAL(18, 2),
    holdings_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, portfolio_id, snapshot_date)
);

-- 32. Holdings (simplified for direct stock tracking)
CREATE TABLE IF NOT EXISTS holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    average_price DECIMAL(18, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, portfolio_id, symbol)
);

-- 33. News Analysis Results
CREATE TABLE IF NOT EXISTS news_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    news_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE UNIQUE,
    entities JSONB DEFAULT '[]',
    affected_symbols VARCHAR(20)[] DEFAULT '{}',
    impact_analysis JSONB,
    investment_insight TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional indexes for new tables
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_goals_user_id ON investment_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_goals_status ON investment_goals(status);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_is_active ON price_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_screens_user_id ON saved_screens(user_id);
CREATE INDEX IF NOT EXISTS idx_market_indices_symbol ON market_indices(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_id_date ON portfolio_snapshots(user_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_news_analysis_news_id ON news_analysis(news_id);

-- Add symbol column to stocks table if using simplified model
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS symbol VARCHAR(20);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS sector VARCHAR(100);

-- Update stocks to have direct symbol reference
CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);

-- Add columns to commodities for simpler querying
ALTER TABLE commodities ADD COLUMN IF NOT EXISTS symbol VARCHAR(20);
ALTER TABLE commodities ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_commodities_symbol ON commodities(symbol);
