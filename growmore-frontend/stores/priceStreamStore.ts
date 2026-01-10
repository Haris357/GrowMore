import { create } from 'zustand';
import { PriceData } from '@/types/common';
import {
  WebSocketClientMessage,
  WebSocketServerMessage,
  PriceUpdateData
} from '@/types/websocket';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/ws';

interface PriceStreamState {
  prices: Record<string, PriceData>;
  isConnected: boolean;
  error: string | null;
  ws: WebSocket | null;
  subscribedSymbols: Set<string>;

  connect: (token?: string) => void;
  disconnect: () => void;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  updatePrice: (symbol: string, price: PriceData) => void;
}

export const usePriceStreamStore = create<PriceStreamState>((set, get) => ({
  prices: {},
  isConnected: false,
  error: null,
  ws: null,
  subscribedSymbols: new Set(),

  connect: (token) => {
    const state = get();
    if (state.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = token ? `${WS_URL}/stream?token=${token}` : `${WS_URL}/stream`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        set({ isConnected: true, error: null, ws });

        if (state.subscribedSymbols.size > 0) {
          const message: WebSocketClientMessage = {
            action: 'subscribe',
            topic: 'prices',
            symbols: Array.from(state.subscribedSymbols),
          };
          ws.send(JSON.stringify(message));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketServerMessage = JSON.parse(event.data);

          if (message.type === 'price_update' && message.data) {
            const priceUpdate = message.data as PriceUpdateData;
            get().updatePrice(priceUpdate.symbol, {
              symbol: priceUpdate.symbol,
              price: priceUpdate.price,
              change: priceUpdate.change,
              change_percent: priceUpdate.change_percent,
              volume: priceUpdate.volume,
              timestamp: priceUpdate.timestamp,
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        set({ error: 'WebSocket connection error', isConnected: false });
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        set({ isConnected: false, ws: null });

        setTimeout(() => {
          if (get().subscribedSymbols.size > 0) {
            get().connect(token);
          }
        }, 5000);
      };

      set({ ws });
    } catch (error: any) {
      console.error('Error connecting WebSocket:', error);
      set({ error: error.message, isConnected: false });
    }
  },

  disconnect: () => {
    const state = get();
    if (state.ws) {
      state.ws.close();
      set({ ws: null, isConnected: false, subscribedSymbols: new Set() });
    }
  },

  subscribe: (symbols) => {
    const state = get();
    const newSymbols = new Set([...Array.from(state.subscribedSymbols), ...symbols]);
    set({ subscribedSymbols: newSymbols });

    if (state.ws?.readyState === WebSocket.OPEN) {
      const message: WebSocketClientMessage = {
        action: 'subscribe',
        topic: 'prices',
        symbols,
      };
      state.ws.send(JSON.stringify(message));
    }
  },

  unsubscribe: (symbols) => {
    const state = get();
    const newSymbols = new Set(state.subscribedSymbols);
    symbols.forEach(symbol => newSymbols.delete(symbol));
    set({ subscribedSymbols: newSymbols });

    if (state.ws?.readyState === WebSocket.OPEN) {
      const message: WebSocketClientMessage = {
        action: 'unsubscribe',
        topic: 'prices',
        symbols,
      };
      state.ws.send(JSON.stringify(message));
    }
  },

  updatePrice: (symbol, price) => {
    set(state => ({
      prices: {
        ...state.prices,
        [symbol]: price,
      },
    }));
  },
}));
