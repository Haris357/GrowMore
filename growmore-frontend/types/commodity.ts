export interface MetalPurity {
  per_tola: number;
  per_gram: number;
  per_10_gram: number;
}

export interface MetalPrice {
  name: string;
  price_usd_oz: number;
  per_tola: number;
  per_gram: number;
  per_10_gram: number;
  change_amount: number;
  change_percentage: number;
  purities?: Record<string, MetalPurity>;
}

export interface PreciousMetalsPrices {
  gold: MetalPrice;
  silver: MetalPrice;
  exchange_rate: number;
  last_updated: string;
}

export interface MetalHistory {
  date: string;
  price: number;
}

export interface MetalHistoryResponse {
  metal: string;
  period: string;
  history: MetalHistory[];
}

export interface MarketAnalysis {
  summary: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  key_factors: string[];
  outlook: string;
  gold_insight: string;
  silver_insight: string;
  generated_at: string;
}
