export interface FilterCategory {
  id: string;
  name: string;
  filters: FilterDefinition[];
}

export interface FilterDefinition {
  id: string;
  name: string;
  description?: string;
  type: 'range' | 'multiselect' | 'select';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  unit?: string;
}

export interface ScreenerFilters {
  market_id?: string;
  sector_ids?: string[];
  price_min?: number;
  price_max?: number;
  change_percent_min?: number;
  change_percent_max?: number;
  volume_min?: number;
  volume_max?: number;
  market_cap_min?: number;
  market_cap_max?: number;
  pe_ratio_min?: number;
  pe_ratio_max?: number;
  eps_min?: number;
  eps_max?: number;
  dividend_yield_min?: number;
  dividend_yield_max?: number;
}

export interface ScreenerStrategy {
  id: string;
  name: string;
  slug: string;
  description: string;
  filters: ScreenerFilters;
  is_preset: boolean;
}

export interface ScreenerResult {
  stocks: StockQuote[];
  total_matches: number;
  filters_applied: ScreenerFilters;
}

export interface SavedScreen {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  filters: ScreenerFilters;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedScreenCreate {
  name: string;
  description?: string;
  filters: ScreenerFilters;
  notifications_enabled?: boolean;
}

import { StockQuote } from './market';
