-- ============================================================
-- GrowMore - Stock Fundamentals Migration
-- ============================================================
-- This script adds all fundamental analysis columns to the stocks table
-- Run this in Supabase SQL Editor
-- Created: 2026-01-13
-- ============================================================

-- ============================================================
-- STOCKS TABLE - Add Fundamental Columns
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

-- ============================================================
-- Add Comments for Documentation
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

-- ============================================================
-- Create Indexes for Common Queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_stocks_pe_ratio ON stocks(pe_ratio) WHERE pe_ratio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_pb_ratio ON stocks(pb_ratio) WHERE pb_ratio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_dividend_yield ON stocks(dividend_yield) WHERE dividend_yield IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap) WHERE market_cap IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_roe ON stocks(roe) WHERE roe IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_debt_to_equity ON stocks(debt_to_equity) WHERE debt_to_equity IS NOT NULL;

-- ============================================================
-- Verification Query - Run this to check the columns were added
-- ============================================================

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'stocks'
-- ORDER BY ordinal_position;

-- ============================================================
-- After running this migration:
-- 1. Restart the backend server
-- 2. Run the fundamentals scraper:
--    POST http://localhost:8000/api/v1/admin/scrape/fundamentals
-- ============================================================
