export interface Market {
  id: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
  trading_hours_start: string;
  trading_hours_end: string;
  is_open: boolean;
}

export interface Sector {
  id: string;
  name: string;
  market_id: string;
  description?: string;
}

export interface MarketIndex {
  id: string;
  symbol: string;
  name: string;
  market_id: string;
  value: number;
  change: number;
  change_percent: number;
  volume?: number;
  timestamp: string;
}

export interface MarketOverview {
  indices: MarketIndex[];
  top_gainers: StockQuote[];
  top_losers: StockQuote[];
  most_active: StockQuote[];
  market_breadth: {
    advancing: number;
    declining: number;
    unchanged: number;
  };
}

export interface StockQuote {
  id: string;
  company_id?: string;
  symbol: string;
  name?: string;
  company_name?: string;
  logo_url?: string;
  sector_id?: string;
  sector_name?: string;
  sector?: string;
  market_id?: string;
  current_price: number;
  change?: number;
  change_amount?: number;
  change_percent?: number;
  change_percentage?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  market_cap?: number;
  pe_ratio?: number;
  eps?: number;
  dividend_yield?: number;
  week_52_high?: number;
  week_52_low?: number;
  avg_volume?: number;
  last_updated?: string;
  timestamp?: string;
}

export interface StockDetail extends StockQuote {
  description?: string;
  website?: string;
  logo_url?: string;
  financials?: StockFinancials;
}

export interface StockFinancials {
  revenue?: number;
  net_income?: number;
  total_assets?: number;
  total_liabilities?: number;
  cash_flow?: number;
  fiscal_year?: number;
}

export interface FinancialStatement {
  id?: string;
  company_id?: string;
  period_type: 'annual' | 'quarterly';
  fiscal_year: number;
  quarter?: number;
  // Income Statement
  revenue?: number;
  cost_of_revenue?: number;
  gross_profit?: number;
  operating_expenses?: number;
  operating_income?: number;
  ebitda?: number;
  interest_expense?: number;
  net_income?: number;
  eps?: number;
  // Balance Sheet
  total_assets?: number;
  current_assets?: number;
  non_current_assets?: number;
  total_liabilities?: number;
  current_liabilities?: number;
  non_current_liabilities?: number;
  total_equity?: number;
  // Cash Flow
  operating_cash_flow?: number;
  investing_cash_flow?: number;
  financing_cash_flow?: number;
  net_cash_change?: number;
  free_cash_flow?: number;
}

export interface RatingMetric {
  name: string;
  category: string;
  value?: string;
  display_value: string;
  status: 'good' | 'bad' | 'neutral';
  description?: string;
}

export interface StockRatings {
  stock_id: string;
  symbol: string;
  growth_metrics: RatingMetric[];
  stability_metrics: RatingMetric[];
  valuation_metrics: RatingMetric[];
  efficiency_metrics: RatingMetric[];
  cash_flow_metrics: RatingMetric[];
}

export interface StockHistoryPoint {
  id: string;
  stock_id: string;
  date: string;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  close_price?: number;
  volume?: number;
}
