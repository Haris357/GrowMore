export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string;
  photo_url?: string;
  preferred_market_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  default_currency: string;
  language: 'en' | 'ur';
  number_format: string;
  date_format: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface UserProfile {
  user: User;
  preferences: UserPreferences;
}

export interface Session {
  id: string;
  device_name: string;
  browser: string;
  ip_address: string;
  location?: string;
  last_active: string;
  is_current: boolean;
}

export interface LoginHistory {
  id: string;
  timestamp: string;
  ip_address: string;
  location?: string;
  device: string;
  browser: string;
  status: 'success' | 'failed';
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  trusted_devices: string[];
}
