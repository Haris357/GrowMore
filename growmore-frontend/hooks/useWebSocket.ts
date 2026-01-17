'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
  connection_id?: string;
  authenticated?: boolean;
  message?: string;
  topic?: string;
  symbols?: string[];
}

interface PriceData {
  type: 'stock' | 'commodity' | 'index';
  symbol: string;
  name?: string;
  price?: number;
  value?: number;
  change?: number;
  change_pct?: number;
  volume?: number;
  timestamp?: string;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const { isAuthenticated: userAuthenticated } = useAuthStore();

  const getWebSocketUrl = useCallback(async () => {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/ws';

    if (userAuthenticated) {
      const { getFirebaseToken } = await import('@/lib/firebase');
      const token = await getFirebaseToken();
      if (token) {
        return `${baseUrl}/stream?token=${token}`;
      }
    }

    return `${baseUrl}/stream`;
  }, [userAuthenticated]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastMessage(message);

    switch (message.type) {
      case 'connected':
        setConnectionId(message.connection_id || null);
        setIsAuthenticated(message.authenticated || false);
        break;

      case 'price_update':
        if (Array.isArray(message.data)) {
          setPrices((prev) => {
            const newPrices = new Map(prev);
            message.data.forEach((item: PriceData) => {
              if (item.symbol) {
                newPrices.set(item.symbol, item);
              }
            });
            return newPrices;
          });
        } else if (message.data?.symbol) {
          setPrices((prev) => {
            const newPrices = new Map(prev);
            newPrices.set(message.data.symbol, message.data);
            return newPrices;
          });
        }
        break;

      case 'price_snapshot':
        if (message.data) {
          setPrices((prev) => {
            const newPrices = new Map(prev);
            Object.entries(message.data).forEach(([symbol, data]) => {
              if (data) {
                newPrices.set(symbol, data as PriceData);
              }
            });
            return newPrices;
          });
        }
        break;
    }

    // Call user-provided callback
    onMessage?.(message);
  }, [onMessage]);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      const url = await getWebSocketUrl();
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setIsAuthenticated(false);
        setConnectionId(null);
        setConnectionStatus('disconnected');
        onDisconnect?.();

        // Attempt to reconnect
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        setConnectionStatus('error');
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [getWebSocketUrl, handleMessage, onConnect, onDisconnect, onError, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectCountRef.current = reconnectAttempts; // Prevent auto-reconnect

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsAuthenticated(false);
    setConnectionId(null);
    setConnectionStatus('disconnected');
  }, [reconnectAttempts]);

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((topic: string, symbols?: string[]) => {
    send({
      action: 'subscribe',
      topic,
      symbols: symbols || [],
    });
  }, [send]);

  const unsubscribe = useCallback((topic: string, symbols?: string[]) => {
    send({
      action: 'unsubscribe',
      topic,
      symbols: symbols || [],
    });
  }, [send]);

  const getSnapshot = useCallback((symbols: string[]) => {
    send({
      action: 'get_snapshot',
      symbols,
    });
  }, [send]);

  const ping = useCallback(() => {
    send({
      action: 'ping',
      timestamp: new Date().toISOString(),
    });
  }, [send]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    isAuthenticated,
    connectionId,
    connectionStatus,
    prices,
    lastMessage,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    getSnapshot,
    ping,
    getPrice: (symbol: string) => prices.get(symbol),
  };
}

// Simpler hook for just price streaming
export function usePriceStream(symbols: string[]) {
  const symbolsKey = symbols.sort().join(',');

  const {
    isConnected,
    prices,
    subscribe,
    unsubscribe,
    getSnapshot,
    getPrice
  } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    if (isConnected && symbols.length > 0) {
      subscribe('prices', symbols);
      getSnapshot(symbols);

      return () => {
        unsubscribe('prices', symbols);
      };
    }
  }, [isConnected, symbolsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    prices: symbols.map((s) => prices.get(s)).filter(Boolean) as PriceData[],
    getPrice,
  };
}

// Hook for market-wide updates (indices, commodities)
export function useMarketStream() {
  const {
    isConnected,
    prices,
    subscribe,
    unsubscribe,
    getPrice
  } = useWebSocket({ autoConnect: true });

  useEffect(() => {
    if (isConnected) {
      subscribe('market');
      subscribe('prices');

      return () => {
        unsubscribe('market');
        unsubscribe('prices');
      };
    }
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const pricesArray = Array.from(prices.values());
  const indices = pricesArray.filter((p) => p.type === 'index');
  const commodities = pricesArray.filter((p) => p.type === 'commodity');
  const stocks = pricesArray.filter((p) => p.type === 'stock');

  return {
    isConnected,
    indices,
    commodities,
    stocks,
    getPrice,
  };
}

// Hook for single stock real-time price
export function useStockPrice(symbol: string | undefined) {
  const { isConnected, prices, subscribe, unsubscribe, getSnapshot, getPrice } = useWebSocket({
    autoConnect: !!symbol
  });

  useEffect(() => {
    if (isConnected && symbol) {
      subscribe('prices', [symbol]);
      getSnapshot([symbol]);

      return () => {
        unsubscribe('prices', [symbol]);
      };
    }
  }, [isConnected, symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  const price = symbol ? prices.get(symbol) : undefined;

  return {
    isConnected,
    price,
    currentPrice: price?.price || price?.value,
    change: price?.change,
    changePct: price?.change_pct,
    volume: price?.volume,
    lastUpdate: price?.timestamp,
  };
}

// Hook for portfolio real-time value
export function usePortfolioStream() {
  const {
    isConnected,
    isAuthenticated,
    prices,
    lastMessage,
    subscribe,
    unsubscribe
  } = useWebSocket({ autoConnect: true });

  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [portfolioChange, setPortfolioChange] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected && isAuthenticated) {
      subscribe('portfolio');

      return () => {
        unsubscribe('portfolio');
      };
    }
  }, [isConnected, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lastMessage?.type === 'portfolio_update') {
      setPortfolioValue(lastMessage.data?.value || null);
      setPortfolioChange(lastMessage.data?.change || null);
    }
  }, [lastMessage]);

  return {
    isConnected,
    isAuthenticated,
    portfolioValue,
    portfolioChange,
    prices,
  };
}

// Hook for real-time alerts
export function useAlertStream() {
  const {
    isConnected,
    isAuthenticated,
    lastMessage,
    subscribe,
    unsubscribe
  } = useWebSocket({ autoConnect: true });

  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected && isAuthenticated) {
      subscribe('alerts');

      return () => {
        unsubscribe('alerts');
      };
    }
  }, [isConnected, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lastMessage?.type === 'alert') {
      setAlerts((prev) => [lastMessage.data, ...prev].slice(0, 50));
    }
  }, [lastMessage]);

  return {
    isConnected,
    isAuthenticated,
    alerts,
    latestAlert: alerts[0] || null,
  };
}
