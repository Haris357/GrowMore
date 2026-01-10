export interface CommodityType {
  id: string;
  name: string;
  symbol: string;
  unit: string;
}

export interface Commodity {
  id: string;
  name: string;
  symbol: string;
  type_id: string;
  market_id: string;
  price: number;
  change: number;
  change_percent: number;
  unit: string;
  timestamp: string;
}

export interface GoldPrice {
  purity_24k_per_tola: number;
  purity_22k_per_tola: number;
  purity_21k_per_tola: number;
  purity_18k_per_tola: number;
  purity_24k_per_gram: number;
  purity_22k_per_gram: number;
  purity_21k_per_gram: number;
  purity_18k_per_gram: number;
  change: number;
  change_percent: number;
  timestamp: string;
}

export interface SilverPrice {
  price_per_tola: number;
  price_per_gram: number;
  change: number;
  change_percent: number;
  timestamp: string;
}

export interface CommodityHistory {
  date: string;
  price: number;
  high?: number;
  low?: number;
}
