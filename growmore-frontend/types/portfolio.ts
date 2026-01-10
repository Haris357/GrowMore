export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AssetType = 'stock' | 'commodity' | 'bank_product' | 'other';

export interface Holding {
  id: string;
  portfolio_id: string;
  asset_type: AssetType;
  asset_id: string;
  symbol?: string;
  name: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  invested_value: number;
  current_value: number;
  profit_loss: number;
  profit_loss_percent: number;
  allocation_percent: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioWithHoldings extends Portfolio {
  holdings: Holding[];
  total_value: number;
  total_invested: number;
  total_profit_loss: number;
  total_profit_loss_percent: number;
  today_change: number;
  today_change_percent: number;
}

export type TransactionType = 'buy' | 'sell' | 'dividend' | 'other';

export interface Transaction {
  id: string;
  portfolio_id: string;
  holding_id?: string;
  transaction_type: TransactionType;
  asset_type: AssetType;
  asset_id: string;
  symbol?: string;
  name: string;
  quantity: number;
  price: number;
  total_amount: number;
  fees?: number;
  notes?: string;
  transaction_date: string;
  created_at: string;
}

export interface PortfolioPerformance {
  portfolio_id: string;
  total_value: number;
  total_invested: number;
  total_return: number;
  total_return_percent: number;
  today_change: number;
  today_change_percent: number;
  best_performer?: {
    symbol: string;
    name: string;
    return_percent: number;
  };
  worst_performer?: {
    symbol: string;
    name: string;
    return_percent: number;
  };
  allocation_by_type: {
    asset_type: AssetType;
    value: number;
    percent: number;
  }[];
  allocation_by_sector?: {
    sector: string;
    value: number;
    percent: number;
  }[];
  historical_performance: {
    date: string;
    value: number;
  }[];
}

export interface HoldingCreate {
  asset_type: AssetType;
  asset_id: string;
  symbol?: string;
  name: string;
  quantity: number;
  avg_cost: number;
}

export interface HoldingUpdate {
  quantity?: number;
  avg_cost?: number;
}

export interface TransactionCreate {
  holding_id?: string;
  transaction_type: TransactionType;
  asset_type: AssetType;
  asset_id: string;
  symbol?: string;
  name: string;
  quantity: number;
  price: number;
  fees?: number;
  notes?: string;
  transaction_date: string;
}
