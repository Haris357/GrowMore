'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Company/stock logo with a two-level fallback:
 *   1. tickeranalysts CDN (SVG, keyed by symbol) — covers most PSX symbols
 *   2. the stored logo_url (Clearbit / UI-Avatars) — "what it showed before"
 *   3. the symbol's initials
 *
 * Shape and size come from `className` (e.g. "h-8 w-8 rounded-lg" or
 * "h-7 w-7 rounded-full"), so it works for both square and circular usages.
 */
const tickerLogoUrl = (symbol: string) =>
  `https://www.tickeranalysts.com/images/logos/${symbol.toUpperCase()}.svg`;

interface StockLogoProps {
  symbol: string;
  logoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function StockLogo({ symbol, logoUrl, className, fallbackClassName }: StockLogoProps) {
  const sources = [symbol ? tickerLogoUrl(symbol) : null, logoUrl].filter(Boolean) as string[];
  const [index, setIndex] = useState(0);

  // Reset the fallback chain when the row is reused for a different stock.
  useEffect(() => {
    setIndex(0);
  }, [symbol, logoUrl]);

  const src = sources[index];

  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-primary/10 text-primary font-bold text-xs shrink-0',
          className,
          fallbackClassName
        )}
      >
        {symbol?.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={symbol}
      loading="lazy"
      className={cn('object-contain bg-background shrink-0', className)}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
