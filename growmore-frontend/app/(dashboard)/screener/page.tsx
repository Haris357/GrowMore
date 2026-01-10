'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PriceDisplay } from '@/components/common/price-display';
import { Filter, Search, TrendingUp, TrendingDown, BarChart3, Download, Eye, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface ScreenerResult {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
  change_percentage: number;
  market_cap: number;
  pe_ratio: number;
  pb_ratio: number;
  dividend_yield: number;
  roe: number;
  debt_to_equity: number;
  revenue_growth: number;
  profit_growth: number;
  volume: number;
}

interface ScreenerFilters {
  sector: string;
  market_cap_min: number;
  market_cap_max: number;
  pe_min: number;
  pe_max: number;
  pb_min: number;
  pb_max: number;
  dividend_yield_min: number;
  roe_min: number;
  debt_to_equity_max: number;
  revenue_growth_min: number;
  profit_growth_min: number;
}

const sectors = [
  'All Sectors',
  'Banking',
  'IT',
  'Pharma',
  'Auto',
  'FMCG',
  'Energy',
  'Infrastructure',
  'Metals',
  'Telecom',
  'Realty',
];

const presetFilters = [
  { name: 'High Dividend Yield', filters: { dividend_yield_min: 3 } },
  { name: 'Low PE Value', filters: { pe_max: 15 } },
  { name: 'High Growth', filters: { revenue_growth_min: 20, profit_growth_min: 20 } },
  { name: 'Low Debt', filters: { debt_to_equity_max: 0.5 } },
  { name: 'Large Cap', filters: { market_cap_min: 50000 } },
  { name: 'High ROE', filters: { roe_min: 20 } },
];

export default function ScreenerPage() {
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<ScreenerFilters>({
    sector: 'All Sectors',
    market_cap_min: 0,
    market_cap_max: 1000000,
    pe_min: 0,
    pe_max: 100,
    pb_min: 0,
    pb_max: 20,
    dividend_yield_min: 0,
    roe_min: 0,
    debt_to_equity_max: 5,
    revenue_growth_min: -50,
    profit_growth_min: -50,
  });

  const runScreener = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (filters.sector !== 'All Sectors') {
        params.append('sector', filters.sector);
      }
      if (filters.market_cap_min > 0) {
        params.append('market_cap_min', (filters.market_cap_min * 10000000).toString());
      }
      if (filters.market_cap_max < 1000000) {
        params.append('market_cap_max', (filters.market_cap_max * 10000000).toString());
      }
      if (filters.pe_min > 0) params.append('pe_min', filters.pe_min.toString());
      if (filters.pe_max < 100) params.append('pe_max', filters.pe_max.toString());
      if (filters.pb_min > 0) params.append('pb_min', filters.pb_min.toString());
      if (filters.pb_max < 20) params.append('pb_max', filters.pb_max.toString());
      if (filters.dividend_yield_min > 0) params.append('dividend_yield_min', filters.dividend_yield_min.toString());
      if (filters.roe_min > 0) params.append('roe_min', filters.roe_min.toString());
      if (filters.debt_to_equity_max < 5) params.append('debt_to_equity_max', filters.debt_to_equity_max.toString());
      if (filters.revenue_growth_min > -50) params.append('revenue_growth_min', filters.revenue_growth_min.toString());
      if (filters.profit_growth_min > -50) params.append('profit_growth_min', filters.profit_growth_min.toString());

      const response = await api.get(`/screener?${params.toString()}`);
      // Backend might return items (paginated) or results or direct array
      const data = response.data?.items || response.data?.results || response.data || [];
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error running screener:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (preset: typeof presetFilters[0]) => {
    setFilters({
      ...filters,
      ...preset.filters,
    });
  };

  const resetFilters = () => {
    setFilters({
      sector: 'All Sectors',
      market_cap_min: 0,
      market_cap_max: 1000000,
      pe_min: 0,
      pe_max: 100,
      pb_min: 0,
      pb_max: 20,
      dividend_yield_min: 0,
      roe_min: 0,
      debt_to_equity_max: 5,
      revenue_growth_min: -50,
      profit_growth_min: -50,
    });
  };

  const formatMarketCap = (value: number) => {
    if (value >= 10000000) {
      return `Rs. ${(value / 10000000).toFixed(0)} Cr`;
    } else if (value >= 100000) {
      return `Rs. ${(value / 100000).toFixed(0)} L`;
    }
    return `Rs. ${value.toLocaleString('en-PK')}`;
  };

  const exportResults = () => {
    const csv = [
      ['Symbol', 'Name', 'Sector', 'Price', 'Change %', 'Market Cap', 'P/E', 'P/B', 'Div Yield', 'ROE', 'D/E'].join(','),
      ...results.map(r => [
        r.symbol,
        r.name,
        r.sector,
        r.current_price,
        r.change_percentage,
        r.market_cap,
        r.pe_ratio,
        r.pb_ratio,
        r.dividend_yield,
        r.roe,
        r.debt_to_equity,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screener-results.csv';
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Stock Screener</h1>
          <p className="text-muted-foreground">
            Filter stocks based on fundamental and technical criteria
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          {showFilters ? 'Hide' : 'Show'} Filters
        </Button>
      </div>

      {/* Preset Filters */}
      <div className="flex flex-wrap gap-2">
        {presetFilters.map((preset) => (
          <Button
            key={preset.name}
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset)}
          >
            {preset.name}
          </Button>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Sector */}
              <div className="space-y-2">
                <Label>Sector</Label>
                <Select
                  value={filters.sector}
                  onValueChange={(value) => setFilters({ ...filters, sector: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Market Cap */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Market Cap (Cr)</Label>
                  <span className="text-sm text-muted-foreground">
                    {filters.market_cap_min} - {filters.market_cap_max}
                  </span>
                </div>
                <div className="pt-2">
                  <Slider
                    value={[filters.market_cap_min, filters.market_cap_max]}
                    onValueChange={([min, max]) => setFilters({ ...filters, market_cap_min: min, market_cap_max: max })}
                    min={0}
                    max={1000000}
                    step={1000}
                  />
                </div>
              </div>

              {/* P/E Ratio */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>P/E Ratio</Label>
                  <span className="text-sm text-muted-foreground">
                    {filters.pe_min} - {filters.pe_max}
                  </span>
                </div>
                <div className="pt-2">
                  <Slider
                    value={[filters.pe_min, filters.pe_max]}
                    onValueChange={([min, max]) => setFilters({ ...filters, pe_min: min, pe_max: max })}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              {/* P/B Ratio */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>P/B Ratio</Label>
                  <span className="text-sm text-muted-foreground">
                    {filters.pb_min} - {filters.pb_max}
                  </span>
                </div>
                <div className="pt-2">
                  <Slider
                    value={[filters.pb_min, filters.pb_max]}
                    onValueChange={([min, max]) => setFilters({ ...filters, pb_min: min, pb_max: max })}
                    min={0}
                    max={20}
                    step={0.5}
                  />
                </div>
              </div>

              {/* Dividend Yield */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Min Dividend Yield (%)</Label>
                  <span className="text-sm text-muted-foreground">{filters.dividend_yield_min}%</span>
                </div>
                <div className="pt-2">
                  <Slider
                    value={[filters.dividend_yield_min]}
                    onValueChange={([value]) => setFilters({ ...filters, dividend_yield_min: value })}
                    min={0}
                    max={10}
                    step={0.5}
                  />
                </div>
              </div>

              {/* ROE */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Min ROE (%)</Label>
                  <span className="text-sm text-muted-foreground">{filters.roe_min}%</span>
                </div>
                <div className="pt-2">
                  <Slider
                    value={[filters.roe_min]}
                    onValueChange={([value]) => setFilters({ ...filters, roe_min: value })}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>
              </div>

              {/* Debt to Equity */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Max Debt/Equity</Label>
                  <span className="text-sm text-muted-foreground">{filters.debt_to_equity_max}</span>
                </div>
                <div className="pt-2">
                  <Slider
                    value={[filters.debt_to_equity_max]}
                    onValueChange={([value]) => setFilters({ ...filters, debt_to_equity_max: value })}
                    min={0}
                    max={5}
                    step={0.1}
                  />
                </div>
              </div>

              {/* Revenue Growth */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Min Revenue Growth (%)</Label>
                  <span className="text-sm text-muted-foreground">{filters.revenue_growth_min}%</span>
                </div>
                <div className="pt-2">
                  <Slider
                    value={[filters.revenue_growth_min]}
                    onValueChange={([value]) => setFilters({ ...filters, revenue_growth_min: value })}
                    min={-50}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={runScreener} className="flex-1">
                <Search className="mr-2 h-4 w-4" />
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
                {results.length > 0 ? `${results.length} stocks match your criteria` : 'Run the screener to see results'}
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
            <div className="py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Stock</th>
                    <th className="text-right py-3 px-4 font-medium">Price</th>
                    <th className="text-right py-3 px-4 font-medium">Change</th>
                    <th className="text-right py-3 px-4 font-medium">Market Cap</th>
                    <th className="text-right py-3 px-4 font-medium">P/E</th>
                    <th className="text-right py-3 px-4 font-medium">P/B</th>
                    <th className="text-right py-3 px-4 font-medium">Div Yield</th>
                    <th className="text-right py-3 px-4 font-medium">ROE</th>
                    <th className="text-center py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((stock) => (
                    <tr key={stock.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{stock.symbol}</p>
                          <p className="text-sm text-muted-foreground">{stock.name}</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        Rs. {stock.current_price?.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={stock.change_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {stock.change_percentage >= 0 ? '+' : ''}{stock.change_percentage?.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-sm">
                        {formatMarketCap(stock.market_cap)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-sm">
                        {stock.pe_ratio?.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-sm">
                        {stock.pb_ratio?.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-sm">
                        {stock.dividend_yield?.toFixed(2)}%
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-sm">
                        {stock.roe?.toFixed(2)}%
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
    </div>
  );
}
