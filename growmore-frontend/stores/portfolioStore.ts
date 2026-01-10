import { create } from 'zustand';
import {
  Portfolio,
  PortfolioWithHoldings,
  HoldingCreate,
  HoldingUpdate,
  TransactionCreate,
  Transaction
} from '@/types/portfolio';
import { api } from '@/lib/api';

interface PortfolioState {
  portfolios: Portfolio[];
  selectedPortfolio: PortfolioWithHoldings | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  fetchPortfolios: () => Promise<void>;
  selectPortfolio: (id: string) => Promise<void>;
  createPortfolio: (name: string, description?: string) => Promise<void>;
  updatePortfolio: (id: string, data: Partial<Portfolio>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  addHolding: (portfolioId: string, holding: HoldingCreate) => Promise<void>;
  updateHolding: (portfolioId: string, holdingId: string, data: HoldingUpdate) => Promise<void>;
  removeHolding: (portfolioId: string, holdingId: string) => Promise<void>;
  addTransaction: (portfolioId: string, transaction: TransactionCreate) => Promise<void>;
  fetchTransactions: (portfolioId: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  selectedPortfolio: null,
  transactions: [],
  isLoading: false,
  error: null,

  fetchPortfolios: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/portfolios');
      const portfolios = response.data;
      set({ portfolios, isLoading: false });

      if (portfolios.length > 0 && !get().selectedPortfolio) {
        const defaultPortfolio = portfolios.find((p: Portfolio) => p.is_default) || portfolios[0];
        await get().selectPortfolio(defaultPortfolio.id);
      }
    } catch (error: any) {
      console.error('Error fetching portfolios:', error);
      set({
        error: error.response?.data?.detail || 'Failed to fetch portfolios',
        isLoading: false
      });
    }
  },

  selectPortfolio: async (id) => {
    try {
      set({ isLoading: true });
      const response = await api.get(`/portfolios/${id}`);
      set({ selectedPortfolio: response.data, isLoading: false });
    } catch (error: any) {
      console.error('Error selecting portfolio:', error);
      set({ isLoading: false });
    }
  },

  createPortfolio: async (name, description) => {
    try {
      const response = await api.post('/portfolios', { name, description });
      set({ portfolios: [...get().portfolios, response.data] });
      return response.data;
    } catch (error: any) {
      console.error('Error creating portfolio:', error);
      throw error;
    }
  },

  updatePortfolio: async (id, data) => {
    try {
      const response = await api.put(`/portfolios/${id}`, data);
      set({
        portfolios: get().portfolios.map(p =>
          p.id === id ? response.data : p
        )
      });
    } catch (error: any) {
      console.error('Error updating portfolio:', error);
      throw error;
    }
  },

  deletePortfolio: async (id) => {
    try {
      await api.delete(`/portfolios/${id}`);
      set({
        portfolios: get().portfolios.filter(p => p.id !== id),
        selectedPortfolio: get().selectedPortfolio?.id === id ? null : get().selectedPortfolio
      });
    } catch (error: any) {
      console.error('Error deleting portfolio:', error);
      throw error;
    }
  },

  addHolding: async (portfolioId, holding) => {
    try {
      await api.post(`/portfolios/${portfolioId}/holdings`, holding);
      await get().selectPortfolio(portfolioId);
    } catch (error: any) {
      console.error('Error adding holding:', error);
      throw error;
    }
  },

  updateHolding: async (portfolioId, holdingId, data) => {
    try {
      await api.put(`/portfolios/${portfolioId}/holdings/${holdingId}`, data);
      await get().selectPortfolio(portfolioId);
    } catch (error: any) {
      console.error('Error updating holding:', error);
      throw error;
    }
  },

  removeHolding: async (portfolioId, holdingId) => {
    try {
      await api.delete(`/portfolios/${portfolioId}/holdings/${holdingId}`);
      await get().selectPortfolio(portfolioId);
    } catch (error: any) {
      console.error('Error removing holding:', error);
      throw error;
    }
  },

  addTransaction: async (portfolioId, transaction) => {
    try {
      await api.post(`/portfolios/${portfolioId}/transactions`, transaction);
      await get().selectPortfolio(portfolioId);
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  },

  fetchTransactions: async (portfolioId) => {
    try {
      const response = await api.get(`/portfolios/${portfolioId}/transactions`);
      set({ transactions: response.data });
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
    }
  },
}));
