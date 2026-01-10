import { create } from 'zustand';
import {
  Watchlist,
  WatchlistWithItems,
  WatchlistItemCreate,
  PriceAlertUpdate
} from '@/types/watchlist';
import { api } from '@/lib/api';

interface WatchlistState {
  watchlists: Watchlist[];
  selectedWatchlist: WatchlistWithItems | null;
  isLoading: boolean;
  error: string | null;

  fetchWatchlists: () => Promise<void>;
  selectWatchlist: (id: string) => Promise<void>;
  createWatchlist: (name: string, description?: string) => Promise<void>;
  updateWatchlist: (id: string, data: Partial<Watchlist>) => Promise<void>;
  deleteWatchlist: (id: string) => Promise<void>;
  addItem: (watchlistId: string, item: WatchlistItemCreate) => Promise<void>;
  removeItem: (watchlistId: string, itemId: string) => Promise<void>;
  updateAlert: (watchlistId: string, itemId: string, alert: PriceAlertUpdate) => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  watchlists: [],
  selectedWatchlist: null,
  isLoading: false,
  error: null,

  fetchWatchlists: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/watchlists');
      const watchlists = response.data;
      set({ watchlists, isLoading: false });

      if (watchlists.length > 0 && !get().selectedWatchlist) {
        const defaultWatchlist = watchlists.find((w: Watchlist) => w.is_default) || watchlists[0];
        await get().selectWatchlist(defaultWatchlist.id);
      }
    } catch (error: any) {
      console.error('Error fetching watchlists:', error);
      set({
        error: error.response?.data?.detail || 'Failed to fetch watchlists',
        isLoading: false
      });
    }
  },

  selectWatchlist: async (id) => {
    try {
      set({ isLoading: true });
      const response = await api.get(`/watchlists/${id}`);
      set({ selectedWatchlist: response.data, isLoading: false });
    } catch (error: any) {
      console.error('Error selecting watchlist:', error);
      set({ isLoading: false });
    }
  },

  createWatchlist: async (name, description) => {
    try {
      const response = await api.post('/watchlists', { name, description });
      set({ watchlists: [...get().watchlists, response.data] });
      return response.data;
    } catch (error: any) {
      console.error('Error creating watchlist:', error);
      throw error;
    }
  },

  updateWatchlist: async (id, data) => {
    try {
      const response = await api.put(`/watchlists/${id}`, data);
      set({
        watchlists: get().watchlists.map(w =>
          w.id === id ? response.data : w
        )
      });
    } catch (error: any) {
      console.error('Error updating watchlist:', error);
      throw error;
    }
  },

  deleteWatchlist: async (id) => {
    try {
      await api.delete(`/watchlists/${id}`);
      set({
        watchlists: get().watchlists.filter(w => w.id !== id),
        selectedWatchlist: get().selectedWatchlist?.id === id ? null : get().selectedWatchlist
      });
    } catch (error: any) {
      console.error('Error deleting watchlist:', error);
      throw error;
    }
  },

  addItem: async (watchlistId, item) => {
    try {
      await api.post(`/watchlists/${watchlistId}/items`, item);
      await get().selectWatchlist(watchlistId);
    } catch (error: any) {
      console.error('Error adding item:', error);
      throw error;
    }
  },

  removeItem: async (watchlistId, itemId) => {
    try {
      await api.delete(`/watchlists/${watchlistId}/items/${itemId}`);
      await get().selectWatchlist(watchlistId);
    } catch (error: any) {
      console.error('Error removing item:', error);
      throw error;
    }
  },

  updateAlert: async (watchlistId, itemId, alert) => {
    try {
      await api.put(`/watchlists/${watchlistId}/items/${itemId}/alerts`, alert);
      await get().selectWatchlist(watchlistId);
    } catch (error: any) {
      console.error('Error updating alert:', error);
      throw error;
    }
  },
}));
