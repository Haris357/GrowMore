export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  asset_type: 'stock' | 'commodity' | 'other';
  asset_id: string;
  symbol?: string;
  name: string;
  current_price: number;
  change: number;
  change_percent: number;
  volume?: number;
  price_alert_enabled: boolean;
  alert_price_above?: number;
  alert_price_below?: number;
  alert_change_percent_above?: number;
  alert_change_percent_below?: number;
  added_at: string;
}

export interface WatchlistWithItems extends Watchlist {
  items: WatchlistItem[];
}

export interface WatchlistItemCreate {
  asset_type: 'stock' | 'commodity' | 'other';
  asset_id: string;
  symbol?: string;
  name: string;
}

export interface PriceAlertUpdate {
  price_alert_enabled: boolean;
  alert_price_above?: number;
  alert_price_below?: number;
  alert_change_percent_above?: number;
  alert_change_percent_below?: number;
}
