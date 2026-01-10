import { create } from 'zustand';
import { User, UserPreferences } from '@/types/user';
import { subscribeToAuthChanges, signOut as firebaseSignOut } from '@/lib/firebase';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setPreferences: (preferences: UserPreferences) => void;
  verifyAndSyncUser: (firebaseToken: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  preferences: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setPreferences: (preferences) => set({ preferences }),

  verifyAndSyncUser: async (firebaseToken) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/auth/verify', { token: firebaseToken });
      const { user, preferences } = response.data;
      set({
        user,
        preferences,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Error verifying user:', error);
      set({
        error: error.response?.data?.detail || 'Failed to verify user',
        isLoading: false
      });
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await api.put('/auth/me', data);
      set({ user: response.data });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  updatePreferences: async (prefs) => {
    try {
      const response = await api.put('/auth/preferences', prefs);
      set({ preferences: response.data });
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await firebaseSignOut();
      set({
        user: null,
        preferences: null,
        isAuthenticated: false,
        error: null
      });
    } catch (error: any) {
      console.error('Error logging out:', error);
      throw error;
    }
  },

  initAuth: () => {
    subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        await get().verifyAndSyncUser(token);
      } else {
        set({
          user: null,
          preferences: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    });
  },
}));
