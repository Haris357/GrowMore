'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wand2,
  ChevronDown,
  Star,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Target,
  Shield,
  ShieldCheck,
  Zap,
  Gem,
  Rocket,
  PiggyBank,
  Building2,
  Activity,
  BookOpen,
  Brain,
  Banknote,
  Landmark,
  Percent,
  Factory,
  Leaf,
  Fuel,
  Pill,
  Laptop,
  ArrowUpCircle,
  ArrowDownCircle,
  Coins,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AdvancedFilters, backendToAdvanced } from './filters-sidebar';

interface ApiStrategy {
  name: string;
  slug: string;
  description: string;
  icon: string;
  filters: Record<string, any>;
  is_featured: boolean;
}

const ICONS: Record<string, React.ElementType> = {
  'trending-up': TrendingUp, 'trending-down': TrendingDown, dollar: DollarSign,
  'bar-chart': BarChart3, target: Target, shield: Shield, 'shield-check': ShieldCheck,
  zap: Zap, star: Star, gem: Gem, rocket: Rocket, 'piggy-bank': PiggyBank,
  building: Building2, activity: Activity, book: BookOpen, brain: Brain,
  banknote: Banknote, landmark: Landmark, percent: Percent, factory: Factory,
  leaf: Leaf, fuel: Fuel, pill: Pill, laptop: Laptop,
  'arrow-up-circle': ArrowUpCircle, 'arrow-down-circle': ArrowDownCircle, coins: Coins,
};

function StrategyRow({ strategy, onSelect }: { strategy: ApiStrategy; onSelect: () => void }) {
  const Icon = ICONS[strategy.icon] || BarChart3;
  return (
    <button
      onClick={onSelect}
      className="w-full text-left flex items-start gap-3 rounded-md px-2.5 py-2 hover:bg-muted transition-colors"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{strategy.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{strategy.description}</p>
      </div>
    </button>
  );
}

export function StrategiesDropdown({
  onSelectStrategy,
  className,
}: {
  onSelectStrategy: (filters: AdvancedFilters) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [strategies, setStrategies] = useState<ApiStrategy[]>([]);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && strategies.length === 0 && !loading) {
      setLoading(true);
      try {
        const res = await api.get('/screener/strategies');
        setStrategies(res.data || []);
      } catch {
        setStrategies([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const select = (s: ApiStrategy) => {
    onSelectStrategy(backendToAdvanced(s.filters));
    setOpen(false);
  };

  const featured = strategies.filter((s) => s.is_featured);
  const others = strategies.filter((s) => !s.is_featured);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <Wand2 className="h-4 w-4" />
          Strategies
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 max-h-[70vh] overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
          </div>
        ) : strategies.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No strategies available</div>
        ) : (
          <>
            {featured.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Star className="h-3.5 w-3.5" /> Featured
                </p>
                {featured.map((s) => <StrategyRow key={s.slug} strategy={s} onSelect={() => select(s)} />)}
              </>
            )}
            {others.length > 0 && (
              <>
                {featured.length > 0 && <div className="my-2 h-px bg-border" />}
                <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  All strategies
                </p>
                {others.map((s) => <StrategyRow key={s.slug} strategy={s} onSelect={() => select(s)} />)}
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
