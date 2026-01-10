import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  const getTrendColor = () => {
    if (!trend) return 'text-muted-foreground';
    if (trend === 'up') return 'text-gain';
    if (trend === 'down') return 'text-loss';
    return 'text-muted-foreground';
  };

  return (
    <Card className={cn('transition-smooth hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">{value}</div>
        {(change !== undefined || changeLabel) && (
          <p className={cn('text-xs mt-1 font-medium', getTrendColor())}>
            {change !== undefined && (
              <span>
                {change > 0 && '+'}{change}%
              </span>
            )}
            {changeLabel && <span className="ml-1">{changeLabel}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
