'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Brokerage logo (tickeranalysts CDN) with a clean initials fallback for the
 * codes that don't have a hosted image.
 */
export function BrokerAvatar({
  code,
  name,
  size = 28,
  className,
}: {
  code: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [code]);

  const initials = name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?';

  if (err || !code) {
    return (
      <div
        title={name}
        className={cn('flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold shrink-0', className)}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`https://www.tickeranalysts.com/images/brokers-logo/${code}.png`}
      alt={name}
      title={name}
      loading="lazy"
      onError={() => setErr(true)}
      className={cn('rounded-full object-contain bg-white shrink-0', className)}
      style={{ width: size, height: size }}
    />
  );
}
