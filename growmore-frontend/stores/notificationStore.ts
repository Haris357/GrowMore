import { create } from 'zustand';
import { Notification } from '@/types/notification';
import { api } from '@/lib/api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/notifications');
      set({
        notifications: response.data,
        isLoading: false
      });
      await get().fetchUnreadCount();
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      set({
        error: error.response?.data?.detail || 'Failed to fetch notifications',
        isLoading: false
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      set({ unreadCount: response.data.count });
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
    }
  },

  markAsRead: async (ids) => {
    try {
      await api.post('/notifications/mark-read', { notification_ids: ids });
      set({
        notifications: get().notifications.map(n =>
          ids.includes(n.id) ? { ...n, is_read: true } : n
        ),
      });
      await get().fetchUnreadCount();
    } catch (error: any) {
      console.error('Error marking as read:', error);
      throw error;
    }
  },

  markAllRead: async () => {
    try {
      await api.post('/notifications/mark-all-read');
      set({
        notifications: get().notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
      });
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },

  deleteNotification: async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      set({
        notifications: get().notifications.filter(n => n.id !== id),
      });
      await get().fetchUnreadCount();
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  addNotification: (notification) => {
    set({
      notifications: [notification, ...get().notifications],
      unreadCount: get().unreadCount + 1,
    });
  },
}));
