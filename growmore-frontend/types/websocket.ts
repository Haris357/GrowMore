export type WebSocketAction = 'subscribe' | 'unsubscribe' | 'ping' | 'get_snapshot';
export type WebSocketTopic = 'prices' | 'news' | 'alerts' | 'market' | 'portfolio';
export type WebSocketMessageType = 'price_update' | 'news_update' | 'alert' | 'market_update' | 'connected' | 'subscribed' | 'unsubscribed' | 'error' | 'pong';

export interface WebSocketClientMessage {
  action: WebSocketAction;
  topic?: WebSocketTopic;
  symbols?: string[];
  data?: any;
}

export interface WebSocketServerMessage {
  type: WebSocketMessageType;
  data?: any;
  timestamp: string;
  error?: string;
}

export interface PriceUpdateData {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume?: number;
  high?: number;
  low?: number;
  timestamp: string;
}

export interface NewsUpdateData {
  article_id: string;
  title: string;
  summary?: string;
  sentiment?: string;
  published_at: string;
}

export interface AlertData {
  alert_id: string;
  symbol: string;
  alert_type: string;
  message: string;
  triggered_at: string;
}

export interface MarketUpdateData {
  market_id: string;
  is_open: boolean;
  indices: {
    symbol: string;
    value: number;
    change: number;
    change_percent: number;
  }[];
}
