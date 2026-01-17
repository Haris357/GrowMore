'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Target,
  Shield,
  Zap,
  Star,
  Gem,
  Rocket,
  PiggyBank,
  Building2,
  Activity,
} from 'lucide-react';
import { ScreenerFilters, defaultFilters } from './filter-modal';

interface Strategy {
  id: string;
  name: string;
  description: string;
  icon: string;
  filters: Partial<ScreenerFilters>;
  isFeatured?: boolean;
}

const PRESET_STRATEGIES: Strategy[] = [
  // Value Investing
  {
    id: 'value-pick',
    name: 'Value Picks',
    description: 'Low P/E and P/B stocks that may be undervalued',
    icon: 'gem',
    filters: { pe_max: 15, pb_max: 2 },
    isFeatured: true,
  },
  {
    id: 'deep-value',
    name: 'Deep Value',
    description: 'Extremely undervalued stocks with low multiples',
    icon: 'target',
    filters: { pe_max: 10, pb_max: 1, dividend_yield_min: 2 },
  },
  {
    id: 'graham-style',
    name: 'Graham Style',
    description: 'Benjamin Graham inspired value criteria',
    icon: 'shield',
    filters: { pe_max: 15, pb_max: 1.5, debt_to_equity_max: 0.5 },
  },

  // Growth Investing
  {
    id: 'high-growth',
    name: 'High Growth',
    description: 'Companies with strong revenue and profit growth',
    icon: 'rocket',
    filters: { revenue_growth_min: 20, profit_growth_min: 20 },
    isFeatured: true,
  },
  {
    id: 'momentum',
    name: 'Momentum Stocks',
    description: 'Stocks with strong positive price movement',
    icon: 'trending-up',
    filters: { change_pct_min: 5 },
  },

  // Income Investing
  {
    id: 'high-dividend',
    name: 'High Dividend Yield',
    description: 'Stocks with generous dividend payouts',
    icon: 'piggy-bank',
    filters: { dividend_yield_min: 5 },
    isFeatured: true,
  },
  {
    id: 'dividend-aristocrats',
    name: 'Quality Dividends',
    description: 'Stable companies with consistent dividends',
    icon: 'star',
    filters: { dividend_yield_min: 3, roe_min: 15, debt_to_equity_max: 1 },
  },

  // Quality Investing
  {
    id: 'high-roe',
    name: 'High ROE',
    description: 'Companies generating strong returns on equity',
    icon: 'zap',
    filters: { roe_min: 20 },
  },
  {
    id: 'quality-stocks',
    name: 'Quality Stocks',
    description: 'Financially strong companies with good metrics',
    icon: 'shield',
    filters: { roe_min: 15, debt_to_equity_max: 1, profit_growth_min: 10 },
  },

  // Size Based
  {
    id: 'large-cap',
    name: 'Large Cap',
    description: 'Established companies with large market capitalization',
    icon: 'building',
    filters: { market_cap_min: 50000 },
  },
  {
    id: 'small-cap-value',
    name: 'Small Cap Value',
    description: 'Smaller undervalued companies',
    icon: 'target',
    filters: { market_cap_max: 10000, pe_max: 15 },
  },

  // Low Risk
  {
    id: 'low-debt',
    name: 'Low Debt',
    description: 'Companies with minimal debt burden',
    icon: 'shield',
    filters: { debt_to_equity_max: 0.3 },
  },
  {
    id: 'defensive',
    name: 'Defensive Stocks',
    description: 'Stable stocks for uncertain markets',
    icon: 'shield',
    filters: { dividend_yield_min: 2, debt_to_equity_max: 0.5, pe_max: 20 },
  },

  // Activity Based
  {
    id: 'most-active',
    name: 'Most Active',
    description: 'High volume stocks with active trading',
    icon: 'activity',
    filters: { volume_min: 1000000 },
  },
  {
    id: 'top-gainers',
    name: 'Top Gainers',
    description: 'Stocks with highest gains today',
    icon: 'trending-up',
    filters: { change_pct_min: 3 },
  },
  {
    id: 'top-losers',
    name: 'Top Losers',
    description: 'Stocks with biggest drops today',
    icon: 'trending-down',
    filters: { change_pct_max: -3 },
  },

  // Sector Based
  {
    id: 'banking-sector',
    name: 'Banking Sector',
    description: 'Focus on commercial banks',
    icon: 'building',
    filters: { sector: 'Commercial Banks' },
  },
  {
    id: 'tech-sector',
    name: 'Technology',
    description: 'Technology & Communication sector',
    icon: 'zap',
    filters: { sector: 'Technology & Communication' },
  },
  {
    id: 'energy-sector',
    name: 'Energy',
    description: 'Oil & Gas companies',
    icon: 'activity',
    filters: { sector: 'Oil & Gas Exploration Companies' },
  },
];

const iconMap: Record<string, React.ReactNode> = {
  'trending-up': <TrendingUp className="h-5 w-5" />,
  'trending-down': <TrendingDown className="h-5 w-5" />,
  'dollar': <DollarSign className="h-5 w-5" />,
  'bar-chart': <BarChart3 className="h-5 w-5" />,
  'target': <Target className="h-5 w-5" />,
  'shield': <Shield className="h-5 w-5" />,
  'zap': <Zap className="h-5 w-5" />,
  'star': <Star className="h-5 w-5" />,
  'gem': <Gem className="h-5 w-5" />,
  'rocket': <Rocket className="h-5 w-5" />,
  'piggy-bank': <PiggyBank className="h-5 w-5" />,
  'building': <Building2 className="h-5 w-5" />,
  'activity': <Activity className="h-5 w-5" />,
};

interface StrategiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStrategy: (filters: ScreenerFilters) => void;
}

export function StrategiesModal({ isOpen, onClose, onSelectStrategy }: StrategiesModalProps) {
  const handleSelectStrategy = (strategy: Strategy) => {
    const mergedFilters = { ...defaultFilters, ...strategy.filters };
    onSelectStrategy(mergedFilters);
    onClose();
  };

  const featuredStrategies = PRESET_STRATEGIES.filter(s => s.isFeatured);
  const otherStrategies = PRESET_STRATEGIES.filter(s => !s.isFeatured);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Screening Strategies</DialogTitle>
          <DialogDescription>
            Select a pre-built strategy to quickly filter stocks
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6 py-4">
            {/* Featured Strategies */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Star className="h-4 w-4" />
                Featured Strategies
              </h4>
              <div className="grid gap-3">
                {featuredStrategies.map((strategy) => (
                  <Card
                    key={strategy.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors border-primary/20"
                    onClick={() => handleSelectStrategy(strategy)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {iconMap[strategy.icon] || <BarChart3 className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {strategy.name}
                            <Badge variant="secondary" className="text-xs">Featured</Badge>
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {strategy.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            {/* Other Strategies */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                All Strategies
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {otherStrategies.map((strategy) => (
                  <Card
                    key={strategy.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectStrategy(strategy)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                          {iconMap[strategy.icon] || <BarChart3 className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{strategy.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {strategy.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
