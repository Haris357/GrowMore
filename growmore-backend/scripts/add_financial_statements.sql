-- ============================================================
-- GrowMore - Financial Statements Table
-- ============================================================
-- Creates the financial_statements table for storing
-- income statement, balance sheet, and cash flow data per company.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- FINANCIAL_STATEMENTS TABLE
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

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_financial_statements_company_id
    ON financial_statements(company_id);

CREATE INDEX IF NOT EXISTS idx_financial_statements_company_period
    ON financial_statements(company_id, period_type, fiscal_year);

-- Unique constraint: one record per company + period + year + quarter
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_statements_unique
    ON financial_statements(company_id, period_type, fiscal_year, COALESCE(quarter, 0));

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE financial_statements IS 'Financial statement data (income, balance sheet, cash flow) per company per period';
COMMENT ON COLUMN financial_statements.period_type IS 'annual or quarterly';
COMMENT ON COLUMN financial_statements.fiscal_year IS 'Fiscal year (e.g. 2024)';
COMMENT ON COLUMN financial_statements.quarter IS 'Quarter number (1-4), NULL for annual';
COMMENT ON COLUMN financial_statements.revenue IS 'Total revenue / sales';
COMMENT ON COLUMN financial_statements.cost_of_revenue IS 'Cost of goods sold';
COMMENT ON COLUMN financial_statements.gross_profit IS 'Revenue minus cost of revenue';
COMMENT ON COLUMN financial_statements.operating_expenses IS 'Total operating expenses';
COMMENT ON COLUMN financial_statements.operating_income IS 'Operating profit';
COMMENT ON COLUMN financial_statements.ebitda IS 'Earnings Before Interest, Taxes, Depreciation, and Amortization';
COMMENT ON COLUMN financial_statements.interest_expense IS 'Interest expense';
COMMENT ON COLUMN financial_statements.net_income IS 'Net profit / income';
COMMENT ON COLUMN financial_statements.eps IS 'Earnings per share';
COMMENT ON COLUMN financial_statements.total_assets IS 'Total assets';
COMMENT ON COLUMN financial_statements.current_assets IS 'Current (short-term) assets';
COMMENT ON COLUMN financial_statements.non_current_assets IS 'Non-current (long-term) assets';
COMMENT ON COLUMN financial_statements.total_liabilities IS 'Total liabilities';
COMMENT ON COLUMN financial_statements.current_liabilities IS 'Current (short-term) liabilities';
COMMENT ON COLUMN financial_statements.non_current_liabilities IS 'Non-current (long-term) liabilities';
COMMENT ON COLUMN financial_statements.total_equity IS 'Shareholders equity';
COMMENT ON COLUMN financial_statements.operating_cash_flow IS 'Cash flow from operations';
COMMENT ON COLUMN financial_statements.investing_cash_flow IS 'Cash flow from investing activities';
COMMENT ON COLUMN financial_statements.financing_cash_flow IS 'Cash flow from financing activities';
COMMENT ON COLUMN financial_statements.net_cash_change IS 'Net change in cash';
COMMENT ON COLUMN financial_statements.free_cash_flow IS 'Free cash flow (OCF - CapEx)';

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS but allow public read access (stock data is public)
ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on financial_statements"
    ON financial_statements FOR SELECT
    USING (true);

CREATE POLICY "Allow service role full access on financial_statements"
    ON financial_statements FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- Verification Query
-- ============================================================
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'financial_statements'
-- ORDER BY ordinal_position;
-- ============================================================
