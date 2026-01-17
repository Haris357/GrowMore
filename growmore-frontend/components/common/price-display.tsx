import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PriceDisplayProps {
  value: number;
  currency?: string;
  change?: number;
  changePercent?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showValue?: boolean;
  className?: string;
}

export function PriceDisplay({
  value,
  currency = 'Rs.',
  change,
  changePercent,
  size = 'md',
  showIcon = true,
  showValue = true,
  className,
}: PriceDisplayProps) {
  // Ensure values are numbers (API might return strings)
  const numValue = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  const numChange = typeof change === 'string' ? parseFloat(change) : (change ?? 0);
  const numChangePercent = typeof changePercent === 'string' ? parseFloat(changePercent) : (changePercent ?? 0);

  const isPositive = numChange > 0;
  const isNegative = numChange < 0;
  const isNeutral = numChange === 0;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl font-semibold',
  };

  const changeColor = isPositive
    ? 'text-gain'
    : isNegative
    ? 'text-loss'
    : 'text-muted-foreground';

  const Icon = isPositive
    ? TrendingUp
    : isNegative
    ? TrendingDown
    : Minus;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showValue && (
        <span className={cn('font-mono', sizeClasses[size])}>
          {currency} {numValue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )}
      {change !== undefined && changePercent !== undefined && (
        <span
          className={cn(
            'flex items-center gap-1 font-medium transition-smooth',
            changeColor,
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base'
          )}
        >
          {showIcon && <Icon className="h-3 w-3" />}
          <span>
            {isPositive && '+'}{numChange.toFixed(2)} ({isPositive && '+'}{numChangePercent.toFixed(2)}%)
          </span>
        </span>
      )}
    </div>
  );
}
