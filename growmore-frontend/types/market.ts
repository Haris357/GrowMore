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
