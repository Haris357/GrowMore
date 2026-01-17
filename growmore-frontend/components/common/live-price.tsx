'use client';

import { useStockPrice, useMarketStream } from '@/hooks/useWebSocket';
import { TrendingUp, TrendingDown, Wifi, WifiOff, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LivePriceProps {
  symbol: string;
  showChange?: boolean;
  showVolume?: boolean;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LivePrice({
  symbol,
  showChange = true,
  showVolume = false,
  showStatus = false,
  size = 'md',
  className,
}: LivePriceProps) {
  const { isConnected, currentPrice, change, changePct, volume, lastUpdate } = useStockPrice(symbol);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl font-bold',
  };

  const formatPrice = (price: number | undefined) => {
    if (!price) return '-';
    return `PKR ${price.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVolume = (vol: number | undefined) => {
    if (!vol) return '-';
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
    return vol.toString();
  };

  const isPositive = (changePct || 0) >= 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showStatus && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              {isConnected ? (
                <Activity className="h-3 w-3 text-green-500 animate-pulse" />
              ) : (
                <WifiOff className="h-3 w-3 text-muted-foreground" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              <p>{isConnected ? 'Live prices connected' : 'Connecting...'}</p>
              {lastUpdate && <p className="text-xs text-muted-foreground">Last update: {new Date(lastUpdate).toLocaleTimeString()}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <span className={cn(sizeClasses[size], 'font-mono')}>
        {formatPrice(currentPrice)}
      </span>

      {showChange && changePct !== undefined && (
        <span
          className={cn(
            'flex items-center gap-1',
            isPositive ? 'text-green-600' : 'text-red-600',
            size === 'sm' && 'text-xs',
            size === 'lg' && 'text-lg'
          )}
        >
          {isPositive ? (
            <TrendingUp className={cn('h-3 w-3', size === 'lg' && 'h-5 w-5')} />
          ) : (
            <TrendingDown className={cn('h-3 w-3', size === 'lg' && 'h-5 w-5')} />
          )}
          {isPositive ? '+' : ''}
          {changePct.toFixed(2)}%
        </span>
      )}

      {showVolume && volume && (
        <span className="text-sm text-muted-foreground">
          Vol: {formatVolume(volume)}
        </span>
      )}
    </div>
  );
}

// Connection status indicator
export function ConnectionStatus() {
  const { isConnected } = useMarketStream();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={cn(
              'cursor-pointer',
              isConnected && 'bg-green-500/10 text-green-600 border-green-500/20'
            )}
          >
            {isConnected ? (
              <>
                <Activity className="mr-1 h-3 w-3 animate-pulse" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="mr-1 h-3 w-3" />
                Offline
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isConnected ? 'Real-time prices active' : 'Reconnecting...'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Market indices ticker
export function MarketTicker() {
  const { isConnected, indices } = useMarketStream();

  if (!isConnected || indices.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-6 overflow-x-auto py-2 px-4 bg-muted/50 rounded-lg">
      {indices.map((index) => (
        <div key={index.symbol} className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-sm font-medium">{index.name || index.symbol}</span>
          <span className="text-sm font-mono">
            {(index.value || index.price)?.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
          </span>
          {index.change_pct !== undefined && (
            <span
              className={cn(
                'text-xs flex items-center gap-0.5',
                index.change_pct >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {index.change_pct >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {index.change_pct >= 0 ? '+' : ''}
              {index.change_pct.toFixed(2)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Compact price display for lists
export function CompactLivePrice({ symbol }: { symbol: string }) {
  const { currentPrice, changePct } = useStockPrice(symbol);

  const isPositive = (changePct || 0) >= 0;

  return (
    <div className="text-right">
      <div className="font-mono text-sm">
        {currentPrice ? `PKR ${currentPrice.toFixed(2)}` : '-'}
      </div>
      {changePct !== undefined && (
        <div className={cn('text-xs', isPositive ? 'text-green-600' : 'text-red-600')}>
          {isPositive ? '+' : ''}
          {changePct.toFixed(2)}%
        </div>
      )}
    </div>
  );
}
