export type NotificationType = 'price_alert' | 'news_alert' | 'portfolio_update' | 'goal_milestone' | 'security_alert' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  watchlist_item_id?: string;
  asset_type: 'stock' | 'commodity';
  asset_id: string;
  symbol: string;
  name: string;
  condition_type: 'price_above' | 'price_below' | 'change_percent_above' | 'change_percent_below';
  threshold_value: number;
  current_value?: number;
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  price_alerts_enabled: boolean;
  news_alerts_enabled: boolean;
  portfolio_updates_enabled: boolean;
  goal_reminders_enabled: boolean;
  market_updates_enabled: boolean;
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface PriceAlertCreate {
  watchlist_item_id?: string;
  asset_type: 'stock' | 'commodity';
  asset_id: string;
  symbol: string;
  name: string;
  condition_type: 'price_above' | 'price_below' | 'change_percent_above' | 'change_percent_below';
  threshold_value: number;
}
