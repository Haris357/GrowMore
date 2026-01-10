import { create } from 'zustand';
import { Market, Sector } from '@/types/market';
import { api } from '@/lib/api';

interface MarketState {
  markets: Market[];
  selectedMarket: Market | null;
  sectors: Sector[];
  isLoading: boolean;
  error: string | null;

  fetchMarkets: () => Promise<void>;
  setSelectedMarket: (market: Market) => void;
  fetchSectors: (marketId: string) => Promise<void>;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  markets: [],
  selectedMarket: null,
  sectors: [],
  isLoading: false,
  error: null,

  fetchMarkets: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/markets');
      const markets = response.data;
      set({
        markets,
        selectedMarket: markets[0] || null,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Error fetching markets:', error);
      set({
        error: error.response?.data?.detail || 'Failed to fetch markets',
        isLoading: false
      });
    }
  },

  setSelectedMarket: (market) => {
    set({ selectedMarket: market });
    get().fetchSectors(market.id);
  },

  fetchSectors: async (marketId) => {
    try {
      const response = await api.get(`/markets/${marketId}/sectors`);
      set({ sectors: response.data });
    } catch (error: any) {
      console.error('Error fetching sectors:', error);
    }
  },
}));
