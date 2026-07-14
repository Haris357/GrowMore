'use client';

import { ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Shariah-compliance indicator: a shield icon with an explanatory tooltip.
 * Green check shield = compliant, amber alert shield = not compliant.
 * Self-contained (own TooltipProvider) so it can be dropped in anywhere.
 */
export function ShariahBadge({
  isCompliant,
  size = 16,
  className,
}: {
  isCompliant: boolean;
  size?: number;
  className?: string;
}) {
  const Icon = isCompliant ? ShieldCheck : ShieldAlert;
  const label = isCompliant ? 'Shariah compliant' : 'Not Shariah compliant';
  const tone = isCompliant ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-500';

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={label}
            className={cn('inline-flex items-center justify-center shrink-0', className)}
          >
            <Icon className={tone} style={{ width: size, height: size }} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <span className="flex items-center gap-1.5">
            <Icon className={cn('h-3.5 w-3.5', tone)} />
            {label}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
