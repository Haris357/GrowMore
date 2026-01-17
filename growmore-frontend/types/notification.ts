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

// Alert condition types from backend
export type AlertCondition =
  | 'price_above'
  | 'price_below'
  | 'change_above'
  | 'change_below'
  | 'volume_spike'
  | 'new_high'
  | 'new_low';

export interface AlertConditionInfo {
  id: AlertCondition;
  description: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  condition: AlertCondition;
  target_value: number;
  notes?: string;
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface PriceAlertCreate {
  symbol: string;
  condition: AlertCondition;
  target_value: number;
  notes?: string;
}

export interface NotificationPreferences {
  price_alerts: boolean;
  news_alerts: boolean;
  portfolio_updates: boolean;
  goal_reminders: boolean;
  market_updates: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}
