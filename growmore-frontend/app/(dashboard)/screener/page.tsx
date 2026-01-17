'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TableSkeleton, CardSkeleton, ListItemSkeleton } from '@/components/common/skeletons';
import {
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  Eye,
  Plus,
  Save,
  Star,
  Trash2,
  Play,
  Loader2,
  Bell,
  Bookmark,
  Sparkles,
  Zap,
  Target,
  Shield,
  DollarSign,
  Percent,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface StockResult {
  id: string;
  company_id: string;
  symbol: string;
  name: string;
  sector: string | null;
  sector_code: string | null;
  current_price: number | null;
  change_amount: number | null;
  change_percentage: number | null;
  volume: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  eps: number | null;
  dividend_yield: number | null;
}

interface ScreenResultResponse {
  stocks: StockResult[];
  count: number;
  filters_applied: Record<string, any>;
  limit: number;
  offset: number;
}

interface Strategy {
  name: string;
  slug: string;
  description: string;
  icon: string;
  filters: Record<string, any>;
  is_featured: boolean;
}

interface SavedScreen {
  id: string;
  name: string;
  filters: Record<string, any>;
  notifications_enabled: boolean;
  created_at: string;
  last_run_at: string | null;
}

interface FilterCategory {
  name: string;
  filters: {
    name: string;
    code: string;
    data_type: string;
    description: string;
  }[];
}

interface Sector {
  id: string;
  name: string;
}

const iconMap: Record<string, any> = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'star': Star,
  'zap': Zap,
  'target': Target,
  'shield': Shield,
  'dollar-sign': DollarSign,
  'percent': Percent,
  'activity': Activity,
  'sparkles': Sparkles,
};

export default function ScreenerPage() {
  const [activeTab, setActiveTab] = useState('custom');
  const [results, setResults] = useState<StockResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Strategies
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loadingStrategies, setLoadingStrategies] = useState(true);

  // Saved Screens
  const [savedScreens, setSavedScreens] = useState<SavedScreen[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Sectors from backend
  const [sectors, setSectors] = useState<Sector[]>([]);

  // Filter state
  const [filters, setFilters] = useState<Record<string, any>>({
    sector_code: '',
    price: { min: '', max: '' },
    change_pct: { min: '', max: '' },
    market_cap: { min: '', max: '' },
    pe_ratio: { min: '', max: '' },
    div_yield: { min: '', max: '' },
    volume: { min: '', max: '' },
    sort: 'change_pct_desc',
    limit: 50,
  });

  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNotifications, setSaveNotifications] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStrategies();
    fetchSavedScreens();
    fetchSectors();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await api.get('/screener/strategies');
      setStrategies(response.data || []);
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
    } finally {
      setLoadingStrategies(false);
    }
  };

  const fetchSavedScreens = async () => {
    try {
      const response = await api.get('/screener/saved');
      setSavedScreens(response.data?.screens || []);
    } catch (error) {
      console.error('Failed to fetch saved screens:', error);
    } finally {
      setLoadingSaved(false);
    }
  };

  const fetchSectors = async () => {
    try {
      const response = await api.get('/personalization/options/sectors');
      setSectors(response.data?.sectors || []);
    } catch (error) {
      console.error('Failed to fetch sectors:', error);
    }
  };

  const runScreener = async () => {
    setIsLoading(true);
    try {
      const cleanFilters: Record<string, any> = {};

      // Add sector filter
      if (filters.sector_code) {
        cleanFilters.sector_code = filters.sector_code;
      }

      // Add range filters
      ['price', 'change_pct', 'market_cap', 'pe_ratio', 'div_yield', 'volume'].forEach((key) => {
        const range = filters[key];
        if (range?.min !== '' || range?.max !== '') {
          cleanFilters[key] = {};
          if (range.min !== '') cleanFilters[key].min = parseFloat(range.min);
          if (range.max !== '') cleanFilters[key].max = parseFloat(range.max);
        }
      });

      // Add sort and limit
      cleanFilters.sort = filters.sort;
      cleanFilters.limit = filters.limit;

      const response = await api.post<ScreenResultResponse>('/screener/run', {
        filters: cleanFilters,
        limit: filters.limit,
        offset: 0,
      });

      setResults(response.data.stocks || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Error running screener:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const runStrategy = async (slug: string) => {
    setIsLoading(true);
    setActiveTab('custom');
    try {
      const response = await api.post<ScreenResultResponse>(`/screener/strategies/${slug}/run`);
      setResults(response.data.stocks || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Error running strategy:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runSavedScreen = async (screenId: string) => {
    setIsLoading(true);
    setActiveTab('custom');
    try {
      const response = await api.post<ScreenResultResponse>(`/screener/saved/${screenId}/run`);
      setResults(response.data.stocks || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Error running saved screen:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSavedScreen = async (screenId: string) => {
    try {
      await api.delete(`/screener/saved/${screenId}`);
      setSavedScreens((prev) => prev.filter((s) => s.id !== screenId));
    } catch (error) {
      console.error('Error deleting saved screen:', error);
    }
  };

  const saveCurrentScreen = async () => {
    if (!saveName.trim()) return;

    setIsSaving(true);
    try {
      const cleanFilters: Record<string, any> = {};

      if (filters.sector_code) {
        cleanFilters.sector_code = filters.sector_code;
      }

      ['price', 'change_pct', 'market_cap', 'pe_ratio', 'div_yield', 'volume'].forEach((key) => {
        const range = filters[key];
        if (range?.min !== '' || range?.max !== '') {
          cleanFilters[key] = {};
          if (range.min !== '') cleanFilters[key].min = parseFloat(range.min);
          if (range.max !== '') cleanFilters[key].max = parseFloat(range.max);
        }
      });

      cleanFilters.sort = filters.sort;

      await api.post('/screener/saved', {
        name: saveName,
        filters: cleanFilters,
        notifications_enabled: saveNotifications,
      });

      await fetchSavedScreens();
      setSaveDialogOpen(false);
      setSaveName('');
      setSaveNotifications(false);
    } catch (error) {
      console.error('Error saving screen:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      sector_code: '',
      price: { min: '', max: '' },
      change_pct: { min: '', max: '' },
      market_cap: { min: '', max: '' },
      pe_ratio: { min: '', max: '' },
      div_yield: { min: '', max: '' },
      volume: { min: '', max: '' },
      sort: 'change_pct_desc',
      limit: 50,
    });
  };

  const formatMarketCap = (value: number | null) => {
    if (!value) return '-';
    if (value >= 1e12) {
      return `PKR ${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `PKR ${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `PKR ${(value / 1e6).toFixed(2)}M`;
    }
    return `PKR ${value.toLocaleString()}`;
  };

  const formatVolume = (value: number | null) => {
    if (!value) return '-';
    if (value >= 1e6) {
      return `${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    }
    return value.toString();
  };

  const exportResults = () => {
    const csv = [
      ['Symbol', 'Name', 'Sector', 'Price', 'Change %', 'Volume', 'Market Cap', 'P/E', 'Div Yield'].join(','),
      ...results.map((r) =>
        [
          r.symbol,
          `"${r.name}"`,
          r.sector || '',
          r.current_price || '',
          r.change_percentage || '',
          r.volume || '',
          r.market_cap || '',
          r.pe_ratio || '',
          r.dividend_yield || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screener-results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStrategyIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || BarChart3;
    return Icon;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Stock Screener</h1>
          <p className="text-muted-foreground">
            Filter and find stocks based on your investment criteria
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Save Screen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Screen</DialogTitle>
                <DialogDescription>
                  Save your current filter criteria to run it again later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="screen-name">Screen Name</Label>
                  <Input
                    id="screen-name"
                    placeholder="e.g., High Dividend Blue Chips"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when new stocks match this screen
                    </p>
                  </div>
                  <Switch checked={saveNotifications} onCheckedChange={setSaveNotifications} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCurrentScreen} disabled={!saveName.trim() || isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="custom">
            <Filter className="mr-2 h-4 w-4" />
            Custom Screen
          </TabsTrigger>
          <TabsTrigger value="strategies">
            <Sparkles className="mr-2 h-4 w-4" />
            Strategies
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Bookmark className="mr-2 h-4 w-4" />
            Saved Screens
          </TabsTrigger>
        </TabsList>

        {/* Custom Screen Tab */}
        <TabsContent value="custom" className="space-y-6">
          {/* Filters */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filter Criteria</CardTitle>
                <CardDescription>Set your criteria to find matching stocks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {/* Sector */}
                  <div className="space-y-2">
                    <Label>Sector</Label>
                    <Select
                      value={filters.sector_code}
                      onValueChange={(value) => setFilters({ ...filters, sector_code: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Sectors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Sectors</SelectItem>
                        {sectors.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-2">
                    <Label>Price Range (PKR)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.price.min}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            price: { ...filters.price, min: e.target.value },
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.price.max}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            price: { ...filters.price, max: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Change % Range */}
                  <div className="space-y-2">
                    <Label>Change % Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.change_pct.min}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            change_pct: { ...filters.change_pct, min: e.target.value },
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.change_pct.max}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            change_pct: { ...filters.change_pct, max: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Market Cap Range */}
                  <div className="space-y-2">
                    <Label>Market Cap (Millions PKR)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.market_cap.min}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            market_cap: {
                              ...filters.market_cap,
                              min: e.target.value ? parseFloat(e.target.value) * 1e6 : '',
                            },
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.market_cap.max}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            market_cap: {
                              ...filters.market_cap,
                              max: e.target.value ? parseFloat(e.target.value) * 1e6 : '',
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* P/E Ratio Range */}
                  <div className="space-y-2">
                    <Label>P/E Ratio Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.pe_ratio.min}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            pe_ratio: { ...filters.pe_ratio, min: e.target.value },
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.pe_ratio.max}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            pe_ratio: { ...filters.pe_ratio, max: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Dividend Yield Range */}
                  <div className="space-y-2">
                    <Label>Dividend Yield % Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.div_yield.min}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            div_yield: { ...filters.div_yield, min: e.target.value },
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.div_yield.max}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            div_yield: { ...filters.div_yield, max: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Volume Range */}
                  <div className="space-y-2">
                    <Label>Volume Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.volume.min}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            volume: { ...filters.volume, min: e.target.value },
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.volume.max}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            volume: { ...filters.volume, max: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select
                      value={filters.sort}
                      onValueChange={(value) => setFilters({ ...filters, sort: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="change_pct_desc">Change % (High to Low)</SelectItem>
                        <SelectItem value="change_pct_asc">Change % (Low to High)</SelectItem>
                        <SelectItem value="volume_desc">Volume (High to Low)</SelectItem>
                        <SelectItem value="market_cap_desc">Market Cap (High to Low)</SelectItem>
                        <SelectItem value="price_desc">Price (High to Low)</SelectItem>
                        <SelectItem value="price_asc">Price (Low to High)</SelectItem>
                        <SelectItem value="div_yield_desc">Dividend Yield (High to Low)</SelectItem>
                        <SelectItem value="pe_ratio_asc">P/E (Low to High)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={runScreener} className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Run Screener
                  </Button>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    {results.length > 0
                      ? `${totalCount} stocks match your criteria (showing ${results.length})`
                      : 'Run the screener to see results'}
                  </CardDescription>
                </div>
                {results.length > 0 && (
                  <Button variant="outline" size="sm" onClick={exportResults}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 flex justify-center">
                  <TableSkeleton rows={10} columns={8} />
                </div>
              ) : results.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Stock</th>
                        <th className="text-right py-3 px-4 font-medium">Price</th>
                        <th className="text-right py-3 px-4 font-medium">Change</th>
                        <th className="text-right py-3 px-4 font-medium">Volume</th>
                        <th className="text-right py-3 px-4 font-medium">Market Cap</th>
                        <th className="text-right py-3 px-4 font-medium">P/E</th>
                        <th className="text-right py-3 px-4 font-medium">Div Yield</th>
                        <th className="text-center py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((stock) => (
                        <tr key={stock.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{stock.symbol}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {stock.name}
                              </p>
                              {stock.sector && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {stock.sector}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 font-mono">
                            {stock.current_price ? `PKR ${stock.current_price.toFixed(2)}` : '-'}
                          </td>
                          <td className="text-right py-3 px-4">
                            {stock.change_percentage !== null ? (
                              <span
                                className={cn(
                                  'flex items-center justify-end gap-1',
                                  stock.change_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                                )}
                              >
                                {stock.change_percentage >= 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {stock.change_percentage >= 0 ? '+' : ''}
                                {stock.change_percentage.toFixed(2)}%
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="text-right py-3 px-4 font-mono text-sm">
                            {formatVolume(stock.volume)}
                          </td>
                          <td className="text-right py-3 px-4 font-mono text-sm">
                            {formatMarketCap(stock.market_cap)}
                          </td>
                          <td className="text-right py-3 px-4 font-mono text-sm">
                            {stock.pe_ratio?.toFixed(2) || '-'}
                          </td>
                          <td className="text-right py-3 px-4 font-mono text-sm">
                            {stock.dividend_yield ? `${stock.dividend_yield.toFixed(2)}%` : '-'}
                          </td>
                          <td className="text-center py-3 px-4">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/stocks/${stock.symbol}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Set your criteria and run the screener to find stocks</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pre-built Strategies</CardTitle>
              <CardDescription>
                Use expert-designed screening strategies to find stocks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStrategies ? (
                <div className="py-12 flex justify-center">
                  <TableSkeleton rows={10} columns={8} />
                </div>
              ) : strategies.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {strategies.map((strategy) => {
                    const Icon = getStrategyIcon(strategy.icon);
                    return (
                      <Card
                        key={strategy.slug}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          strategy.is_featured && 'border-primary/50'
                        )}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            {strategy.is_featured && (
                              <Badge variant="secondary">
                                <Star className="mr-1 h-3 w-3" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">{strategy.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {strategy.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Button
                            className="w-full"
                            onClick={() => runStrategy(strategy.slug)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-4 w-4" />
                            )}
                            Run Strategy
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No strategies available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Screens Tab */}
        <TabsContent value="saved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Saved Screens</CardTitle>
              <CardDescription>Your custom saved screening criteria</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSaved ? (
                <div className="py-12 flex justify-center">
                  <TableSkeleton rows={10} columns={8} />
                </div>
              ) : savedScreens.length > 0 ? (
                <div className="space-y-4">
                  {savedScreens.map((screen) => (
                    <div
                      key={screen.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Filter className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{screen.name}</h4>
                            {screen.notifications_enabled && (
                              <Badge variant="outline" className="text-xs">
                                <Bell className="mr-1 h-3 w-3" />
                                Alerts On
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {Object.keys(screen.filters).length} filters applied
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => runSavedScreen(screen.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Run
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSavedScreen(screen.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No saved screens yet</p>
                  <Button variant="outline" onClick={() => setActiveTab('custom')}>
                    Create Your First Screen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
