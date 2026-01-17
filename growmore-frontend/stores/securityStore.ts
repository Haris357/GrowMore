import { create } from 'zustand';
import { api } from '@/lib/api';

// Types based on backend schemas
export interface Session {
  id: string;
  device_name: string | null;
  device_type: string | null;
  browser: string | null;
  ip_address: string | null;
  location: string | null;
  is_current: boolean;
  last_activity: string;
  created_at: string;
}

export interface Device {
  id: string;
  device_id: string;
  device_name: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  is_trusted: boolean;
  last_ip: string | null;
  last_location: string | null;
  last_used: string;
  created_at: string;
}

export interface LoginHistory {
  id: string;
  ip_address: string | null;
  location: string | null;
  device_type: string | null;
  browser: string | null;
  status: string;
  failure_reason: string | null;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  login_alerts_enabled: boolean;
  new_device_alerts_enabled: boolean;
  trusted_devices_count: number;
  active_sessions_count: number;
  last_password_change: string | null;
}

export interface SuspiciousActivityCheck {
  has_suspicious_activity: boolean;
  warnings: string[];
  last_checked: string;
}

interface SecurityState {
  // Data
  sessions: Session[];
  devices: Device[];
  loginHistory: LoginHistory[];
  securityEvents: SecurityEvent[];
  securitySettings: SecuritySettings | null;
  suspiciousActivity: SuspiciousActivityCheck | null;

  // Pagination
  loginHistoryTotal: number;
  loginHistoryPage: number;
  eventsTotal: number;
  eventsPage: number;

  // Loading states
  isLoadingSessions: boolean;
  isLoadingDevices: boolean;
  isLoadingHistory: boolean;
  isLoadingEvents: boolean;
  isLoadingSettings: boolean;

  // Actions - Sessions
  fetchSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllSessions: (exceptCurrent?: boolean) => Promise<void>;

  // Actions - Devices
  fetchDevices: () => Promise<void>;
  trustDevice: (deviceId: string, trust: boolean, deviceName?: string) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;

  // Actions - Login History
  fetchLoginHistory: (page?: number, pageSize?: number) => Promise<void>;

  // Actions - Security Events
  fetchSecurityEvents: (page?: number, pageSize?: number, eventType?: string) => Promise<void>;

  // Actions - Security Settings
  fetchSecuritySettings: () => Promise<void>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;

  // Actions - Activity Check
  checkSuspiciousActivity: () => Promise<void>;

  // Fetch all security data
  fetchAllSecurityData: () => Promise<void>;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  // Initial state
  sessions: [],
  devices: [],
  loginHistory: [],
  securityEvents: [],
  securitySettings: null,
  suspiciousActivity: null,

  loginHistoryTotal: 0,
  loginHistoryPage: 1,
  eventsTotal: 0,
  eventsPage: 1,

  isLoadingSessions: false,
  isLoadingDevices: false,
  isLoadingHistory: false,
  isLoadingEvents: false,
  isLoadingSettings: false,

  // Sessions
  fetchSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const response = await api.get('/security/sessions');
      set({ sessions: response.data.sessions });
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  revokeSession: async (sessionId: string) => {
    try {
      await api.delete(`/security/sessions/${sessionId}`);
      // Refresh sessions list
      await get().fetchSessions();
    } catch (error) {
      console.error('Error revoking session:', error);
      throw error;
    }
  },

  revokeAllSessions: async (exceptCurrent = true) => {
    try {
      await api.delete('/security/sessions', {
        params: { except_current: exceptCurrent },
      });
      await get().fetchSessions();
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      throw error;
    }
  },

  // Devices
  fetchDevices: async () => {
    set({ isLoadingDevices: true });
    try {
      const response = await api.get('/security/devices');
      set({ devices: response.data.devices });
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      set({ isLoadingDevices: false });
    }
  },

  trustDevice: async (deviceId: string, trust: boolean, deviceName?: string) => {
    try {
      await api.post('/security/devices/trust', {
        device_id: deviceId,
        trust,
        device_name: deviceName,
      });
      await get().fetchDevices();
    } catch (error) {
      console.error('Error trusting device:', error);
      throw error;
    }
  },

  removeDevice: async (deviceId: string) => {
    try {
      await api.delete(`/security/devices/${deviceId}`);
      await get().fetchDevices();
    } catch (error) {
      console.error('Error removing device:', error);
      throw error;
    }
  },

  // Login History
  fetchLoginHistory: async (page = 1, pageSize = 20) => {
    set({ isLoadingHistory: true });
    try {
      const response = await api.get('/security/login-history', {
        params: { page, page_size: pageSize },
      });
      set({
        loginHistory: response.data.history,
        loginHistoryTotal: response.data.total,
        loginHistoryPage: response.data.page,
      });
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  // Security Events
  fetchSecurityEvents: async (page = 1, pageSize = 20, eventType?: string) => {
    set({ isLoadingEvents: true });
    try {
      const response = await api.get('/security/events', {
        params: { page, page_size: pageSize, event_type: eventType },
      });
      set({
        securityEvents: response.data.events,
        eventsTotal: response.data.total,
        eventsPage: response.data.page,
      });
    } catch (error) {
      console.error('Error fetching security events:', error);
    } finally {
      set({ isLoadingEvents: false });
    }
  },

  // Security Settings
  fetchSecuritySettings: async () => {
    set({ isLoadingSettings: true });
    try {
      const response = await api.get('/security/settings');
      set({ securitySettings: response.data });
    } catch (error) {
      console.error('Error fetching security settings:', error);
    } finally {
      set({ isLoadingSettings: false });
    }
  },

  updateSecuritySettings: async (settings: Partial<SecuritySettings>) => {
    try {
      await api.put('/security/settings', settings);
      await get().fetchSecuritySettings();
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw error;
    }
  },

  // Suspicious Activity Check
  checkSuspiciousActivity: async () => {
    try {
      const response = await api.get('/security/check-activity');
      set({ suspiciousActivity: response.data });
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
    }
  },

  // Fetch all security data at once
  fetchAllSecurityData: async () => {
    const { fetchSessions, fetchDevices, fetchLoginHistory, fetchSecurityEvents, fetchSecuritySettings, checkSuspiciousActivity } = get();

    await Promise.all([
      fetchSessions(),
      fetchDevices(),
      fetchLoginHistory(),
      fetchSecurityEvents(),
      fetchSecuritySettings(),
      checkSuspiciousActivity(),
    ]);
  },
}));
