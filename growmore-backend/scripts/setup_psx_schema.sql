-- ============================================================
-- GrowMore PSX Schema Setup — Fully Idempotent
-- ============================================================
-- Safe to run multiple times. Uses IF NOT EXISTS / IF EXISTS
-- checks everywhere so it won't error on re-run.
--
-- Covers: markets, sectors, companies, stocks (with all
-- fundamental columns), stock_history, financial_statements.
-- ============================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. MARKETS
-- ============================================================
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

-- ============================================================
-- 2. SECTORS
-- ============================================================
CREATE TABLE IF NOT EXISTS sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(market_id, code)
);

-- ============================================================
-- 3. COMPANIES
-- ============================================================
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

-- ============================================================
-- 4. STOCKS (base table)
-- ============================================================
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

-- ============================================================
-- 4a. STOCKS — Fundamental Columns (ADD IF NOT EXISTS)
-- ============================================================

-- Valuation Metrics
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS pb_ratio DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS ps_ratio DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS peg_ratio DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS ev_ebitda DECIMAL;

-- Per Share Data
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS book_value DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS dps DECIMAL;

-- Profitability Ratios
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS roe DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS roa DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS roce DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS gross_margin DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS operating_margin DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS net_margin DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS profit_margin DECIMAL;

-- Leverage Ratios
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS debt_to_equity DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS debt_to_assets DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS current_ratio DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS quick_ratio DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS interest_coverage DECIMAL;

-- Growth Metrics
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS revenue_growth DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS earnings_growth DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS profit_growth DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS asset_growth DECIMAL;

-- Cash Flow Metrics
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS free_cash_flow DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS operating_cash_flow DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS fcf_yield DECIMAL;

-- Other Metrics
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS beta DECIMAL;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS shares_outstanding BIGINT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS float_shares BIGINT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS payout_ratio DECIMAL;

-- Legacy convenience columns (used by some endpoints)
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS symbol VARCHAR(20);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS sector VARCHAR(100);

-- ============================================================
-- 5. STOCK_HISTORY
-- ============================================================
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

-- ============================================================
-- 6. FINANCIAL_STATEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL CHECK (period_type IN ('annual', 'quarterly')),
    fiscal_year INTEGER NOT NULL,
    quarter INTEGER CHECK (quarter IN (1, 2, 3, 4)),

    -- Income Statement
    revenue DECIMAL,
    cost_of_revenue DECIMAL,
    gross_profit DECIMAL,
    operating_expenses DECIMAL,
    operating_income DECIMAL,
    ebitda DECIMAL,
    interest_expense DECIMAL,
    net_income DECIMAL,
    eps DECIMAL,

    -- Balance Sheet
    total_assets DECIMAL,
    current_assets DECIMAL,
    non_current_assets DECIMAL,
    total_liabilities DECIMAL,
    current_liabilities DECIMAL,
    non_current_liabilities DECIMAL,
    total_equity DECIMAL,

    -- Cash Flow
    operating_cash_flow DECIMAL,
    investing_cash_flow DECIMAL,
    financing_cash_flow DECIMAL,
    net_cash_change DECIMAL,
    free_cash_flow DECIMAL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. INDEXES
-- ============================================================

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_symbol ON companies(symbol);
CREATE INDEX IF NOT EXISTS idx_companies_market_id ON companies(market_id);

-- Stocks — base
CREATE INDEX IF NOT EXISTS idx_stocks_company_id ON stocks(company_id);
CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);

-- Stocks — fundamentals (partial indexes for screener performance)
CREATE INDEX IF NOT EXISTS idx_stocks_pe_ratio ON stocks(pe_ratio) WHERE pe_ratio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_pb_ratio ON stocks(pb_ratio) WHERE pb_ratio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_dividend_yield ON stocks(dividend_yield) WHERE dividend_yield IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap) WHERE market_cap IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_roe ON stocks(roe) WHERE roe IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_debt_to_equity ON stocks(debt_to_equity) WHERE debt_to_equity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_change_pct ON stocks(change_percentage) WHERE change_percentage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_volume ON stocks(volume) WHERE volume IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_current_price ON stocks(current_price) WHERE current_price IS NOT NULL;

-- Stock History
CREATE INDEX IF NOT EXISTS idx_stock_history_stock_id_date ON stock_history(stock_id, date);

-- Financial Statements
CREATE INDEX IF NOT EXISTS idx_financial_statements_company_id ON financial_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_statements_company_period ON financial_statements(company_id, period_type, fiscal_year);

-- Unique constraint for financial statements upsert (idempotent via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_financial_statements_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_financial_statements_unique
            ON financial_statements(company_id, period_type, fiscal_year, COALESCE(quarter, 0));
    END IF;
END $$;

-- ============================================================
-- 8. ROW LEVEL SECURITY (idempotent)
-- ============================================================

-- Financial Statements — enable RLS
ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;

-- Drop + recreate policies (idempotent pattern)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public read access on financial_statements" ON financial_statements;
    CREATE POLICY "Allow public read access on financial_statements"
        ON financial_statements FOR SELECT
        USING (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow service role full access on financial_statements" ON financial_statements;
    CREATE POLICY "Allow service role full access on financial_statements"
        ON financial_statements FOR ALL
        USING (auth.role() = 'service_role');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- 9. COLUMN COMMENTS
-- ============================================================

COMMENT ON COLUMN stocks.pb_ratio IS 'Price to Book ratio';
COMMENT ON COLUMN stocks.ps_ratio IS 'Price to Sales ratio';
COMMENT ON COLUMN stocks.peg_ratio IS 'Price/Earnings to Growth ratio';
COMMENT ON COLUMN stocks.ev_ebitda IS 'Enterprise Value to EBITDA ratio';
COMMENT ON COLUMN stocks.book_value IS 'Book value per share';
COMMENT ON COLUMN stocks.dps IS 'Dividend per share';
COMMENT ON COLUMN stocks.roe IS 'Return on Equity (%)';
COMMENT ON COLUMN stocks.roa IS 'Return on Assets (%)';
COMMENT ON COLUMN stocks.roce IS 'Return on Capital Employed (%)';
COMMENT ON COLUMN stocks.gross_margin IS 'Gross profit margin (%)';
COMMENT ON COLUMN stocks.operating_margin IS 'Operating profit margin (%)';
COMMENT ON COLUMN stocks.net_margin IS 'Net profit margin (%)';
COMMENT ON COLUMN stocks.profit_margin IS 'Overall profit margin (%)';
COMMENT ON COLUMN stocks.debt_to_equity IS 'Debt to Equity ratio';
COMMENT ON COLUMN stocks.debt_to_assets IS 'Debt to Assets ratio';
COMMENT ON COLUMN stocks.current_ratio IS 'Current assets / Current liabilities';
COMMENT ON COLUMN stocks.quick_ratio IS 'Quick assets / Current liabilities';
COMMENT ON COLUMN stocks.interest_coverage IS 'EBIT / Interest expense';
COMMENT ON COLUMN stocks.revenue_growth IS 'Year-over-year revenue growth (%)';
COMMENT ON COLUMN stocks.earnings_growth IS 'Year-over-year earnings growth (%)';
COMMENT ON COLUMN stocks.profit_growth IS 'Year-over-year profit growth (%)';
COMMENT ON COLUMN stocks.asset_growth IS 'Year-over-year asset growth (%)';
COMMENT ON COLUMN stocks.free_cash_flow IS 'Free cash flow';
COMMENT ON COLUMN stocks.operating_cash_flow IS 'Operating cash flow';
COMMENT ON COLUMN stocks.fcf_yield IS 'Free cash flow yield (%)';
COMMENT ON COLUMN stocks.beta IS 'Stock beta (volatility measure)';
COMMENT ON COLUMN stocks.shares_outstanding IS 'Total shares outstanding';
COMMENT ON COLUMN stocks.float_shares IS 'Publicly tradeable shares';
COMMENT ON COLUMN stocks.payout_ratio IS 'Dividend payout ratio (%)';

COMMENT ON TABLE financial_statements IS 'Financial statement data (income, balance sheet, cash flow) per company per period';
COMMENT ON COLUMN financial_statements.period_type IS 'annual or quarterly';
COMMENT ON COLUMN financial_statements.fiscal_year IS 'Fiscal year (e.g. 2024)';
COMMENT ON COLUMN financial_statements.quarter IS 'Quarter number (1-4), NULL for annual';

-- ============================================================
-- 10. SEED PSX MARKET (if not exists)
-- ============================================================
INSERT INTO markets (code, name, country, country_code, currency, currency_symbol, timezone)
SELECT 'PSX', 'Pakistan Stock Exchange', 'Pakistan', 'PK', 'PKR', 'Rs', 'Asia/Karachi'
WHERE NOT EXISTS (SELECT 1 FROM markets WHERE code = 'PSX');

-- ============================================================
-- 11. SEED PSX SECTORS (if not exist)
-- ============================================================
DO $$
DECLARE
    psx_market_id UUID;
BEGIN
    SELECT id INTO psx_market_id FROM markets WHERE code = 'PSX';
    IF psx_market_id IS NULL THEN
        RAISE NOTICE 'PSX market not found, skipping sector seed';
        RETURN;
    END IF;

    -- Insert each sector only if it doesn't already exist for this market
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Automobile Assembler', 'AUTO') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Automobile Parts & Accessories', 'AUTOPART') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Cable & Electrical Goods', 'ENGG') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Cement', 'CEMENT') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Chemical', 'CHEM') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Commercial Banks', 'BANK') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Fertilizer', 'FERT') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Food & Personal Care Products', 'FOOD') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Glass & Ceramics', 'GLASS') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Insurance', 'INS') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Inv. Banks / Inv. Cos. / Securities Cos.', 'INVBANK') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Leather & Tanneries', 'LEATHER') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Miscellaneous', 'MISC') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Oil & Gas Exploration Companies', 'OIL') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Oil & Gas Marketing Companies', 'OILMKT') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Paper & Board', 'PAPER') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Pharmaceuticals', 'PHARMA') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Power Generation & Distribution', 'POWER') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Refinery', 'REF') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Sugar Allied Industries', 'SUGAR') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Synthetic & Rayon', 'SYNTH') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Technology & Communication', 'TECH') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Textile Composite', 'TEXTILE') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Textile Spinning', 'TEXSPIN') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Textile Weaving', 'TEXWEAVE') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Tobacco', 'TOBACCO') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Transport', 'TRANS') ON CONFLICT (market_id, code) DO NOTHING;
    INSERT INTO sectors (market_id, name, code) VALUES (psx_market_id, 'Real Estate Investment Trust', 'PROP') ON CONFLICT (market_id, code) DO NOTHING;

    RAISE NOTICE 'PSX sectors seeded (% market_id)', psx_market_id;
END $$;

-- ============================================================
-- DONE
-- ============================================================
-- Verification query (uncomment to check):
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'stocks'
-- ORDER BY ordinal_position;
