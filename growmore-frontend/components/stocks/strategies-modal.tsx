'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  BookOpen,
  Brain,
  Banknote,
  ShieldCheck,
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
import { ScreenerFilters, backendFiltersToScreener } from './filter-modal';

interface ApiStrategy {
  name: string;
  slug: string;
  description: string;
  icon: string;
  filters: Record<string, any>;
  is_featured: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'trending-up': <TrendingUp className="h-5 w-5" />,
  'trending-down': <TrendingDown className="h-5 w-5" />,
  'dollar': <DollarSign className="h-5 w-5" />,
  'bar-chart': <BarChart3 className="h-5 w-5" />,
  'target': <Target className="h-5 w-5" />,
  'shield': <Shield className="h-5 w-5" />,
  'shield-check': <ShieldCheck className="h-5 w-5" />,
  'zap': <Zap className="h-5 w-5" />,
  'star': <Star className="h-5 w-5" />,
  'gem': <Gem className="h-5 w-5" />,
  'rocket': <Rocket className="h-5 w-5" />,
  'piggy-bank': <PiggyBank className="h-5 w-5" />,
  'building': <Building2 className="h-5 w-5" />,
  'activity': <Activity className="h-5 w-5" />,
  'book': <BookOpen className="h-5 w-5" />,
  'brain': <Brain className="h-5 w-5" />,
  'banknote': <Banknote className="h-5 w-5" />,
  'landmark': <Landmark className="h-5 w-5" />,
  'percent': <Percent className="h-5 w-5" />,
  'factory': <Factory className="h-5 w-5" />,
  'leaf': <Leaf className="h-5 w-5" />,
  'fuel': <Fuel className="h-5 w-5" />,
  'pill': <Pill className="h-5 w-5" />,
  'laptop': <Laptop className="h-5 w-5" />,
  'arrow-up-circle': <ArrowUpCircle className="h-5 w-5" />,
  'arrow-down-circle': <ArrowDownCircle className="h-5 w-5" />,
  'coins': <Coins className="h-5 w-5" />,
};

interface StrategiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStrategy: (filters: ScreenerFilters) => void;
}

export function StrategiesModal({ isOpen, onClose, onSelectStrategy }: StrategiesModalProps) {
  const [strategies, setStrategies] = useState<ApiStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || strategies.length > 0) return;

    const fetchStrategies = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/screener/strategies');
        setStrategies(response.data || []);
      } catch (err) {
        console.error('Failed to load strategies:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStrategies();
  }, [isOpen, strategies.length]);

  const handleSelectStrategy = (strategy: ApiStrategy) => {
    const screenerFilters = backendFiltersToScreener(strategy.filters);
    onSelectStrategy(screenerFilters);
    onClose();
  };

  const featuredStrategies = strategies.filter(s => s.is_featured);
  const otherStrategies = strategies.filter(s => !s.is_featured);

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
          {isLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Featured Strategies */}
              {featuredStrategies.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Featured Strategies
                  </h4>
                  <div className="grid gap-3">
                    {featuredStrategies.map((strategy) => (
                      <Card
                        key={strategy.slug}
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
              )}

              {/* Other Strategies */}
              {otherStrategies.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    All Strategies
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {otherStrategies.map((strategy) => (
                      <Card
                        key={strategy.slug}
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
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
