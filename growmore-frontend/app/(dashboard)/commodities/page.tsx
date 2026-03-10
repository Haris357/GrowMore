'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { StatCardSkeleton, CardSkeleton } from '@/components/common/skeletons';
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  DollarSign,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { PreciousMetalsPrices, MetalHistory, MarketAnalysis } from '@/types/commodity';

type ActiveMetal = 'gold' | 'silver';

export default function CommoditiesPage() {
  const [prices, setPrices] = useState<PreciousMetalsPrices | null>(null);
  const [history, setHistory] = useState<MetalHistory[]>([]);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);
  const [activeMetal, setActiveMetal] = useState<ActiveMetal>('gold');
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  // Calculator state
  const [calcWeight, setCalcWeight] = useState('1');
  const [calcUnit, setCalcUnit] = useState<'tola' | 'gram'>('tola');
  const [calcPurity, setCalcPurity] = useState('24k');

  useEffect(() => {
    fetchPrices();
    fetchAnalysis();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [activeMetal, selectedPeriod]);

  const fetchPrices = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/commodities/prices');
      setPrices(response.data);
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get(`/commodities/history/${activeMetal}?period=${selectedPeriod}`);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    }
  };

  const fetchAnalysis = async () => {
    try {
      setIsAnalysisLoading(true);
      const response = await api.get('/commodities/analysis');
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const calculateValue = () => {
    if (!prices?.gold) return 0;
    const weight = parseFloat(calcWeight) || 0;
    const purityData = prices.gold.purities?.[calcPurity];
    if (!purityData) return 0;
    if (calcUnit === 'tola') return weight * purityData.per_tola;
    return weight * purityData.per_gram;
  };

  const calculateZakat = () => calculateValue() * 0.025;

  const formatPrice = (val: number) => {
    if (!val) return 'Rs. 0';
    return `Rs. ${val.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
  };

  const trendIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const trendColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><CardSkeleton /></div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const gold = prices?.gold;
  const silver = prices?.silver;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Precious Metals</h1>
          <p className="text-muted-foreground mt-1">
            Live gold & silver prices in Pakistan
          </p>
        </div>
        <div className="flex items-center gap-3">
          {prices?.exchange_rate && (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
              <DollarSign className="h-3 w-3" />
              USD/PKR {prices.exchange_rate.toFixed(2)}
            </Badge>
          )}
          <Button variant="outline" size="icon" onClick={fetchPrices}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Price Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gold Card */}
        {gold && (
          <Card
            className={`cursor-pointer transition-all ${activeMetal === 'gold' ? 'ring-2 ring-yellow-500/50 border-yellow-500/30' : 'hover:border-yellow-500/20'}`}
            onClick={() => setActiveMetal('gold')}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <span className="text-yellow-500 text-sm font-bold">Au</span>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Gold 24K</p>
                      <p className="text-xs text-muted-foreground">${gold.price_usd_oz}/oz</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatPrice(gold.per_tola)}</p>
                  <div className={`flex items-center justify-end gap-1 ${trendColor(gold.change_percentage)}`}>
                    {trendIcon(gold.change_percentage)}
                    <span className="text-sm font-medium">
                      {gold.change_percentage > 0 ? '+' : ''}{gold.change_percentage}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">per tola</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Per Gram</p>
                  <p className="font-medium">{formatPrice(gold.per_gram)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">22K / Tola</p>
                  <p className="font-medium">{formatPrice(gold.purities?.['22k']?.per_tola || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">21K / Tola</p>
                  <p className="font-medium">{formatPrice(gold.purities?.['21k']?.per_tola || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Silver Card */}
        {silver && (
          <Card
            className={`cursor-pointer transition-all ${activeMetal === 'silver' ? 'ring-2 ring-gray-400/50 border-gray-400/30' : 'hover:border-gray-400/20'}`}
            onClick={() => setActiveMetal('silver')}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded-full bg-gray-400/10 flex items-center justify-center">
                      <span className="text-gray-400 text-sm font-bold">Ag</span>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Silver</p>
                      <p className="text-xs text-muted-foreground">${silver.price_usd_oz}/oz</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatPrice(silver.per_tola)}</p>
                  <div className={`flex items-center justify-end gap-1 ${trendColor(silver.change_percentage)}`}>
                    {trendIcon(silver.change_percentage)}
                    <span className="text-sm font-medium">
                      {silver.change_percentage > 0 ? '+' : ''}{silver.change_percentage}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">per tola</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Per Gram</p>
                  <p className="font-medium">{formatPrice(silver.per_gram)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Per 10 Gram</p>
                  <p className="font-medium">{formatPrice(silver.per_10_gram)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Change</p>
                  <p className={`font-medium ${trendColor(silver.change_amount)}`}>
                    {silver.change_amount > 0 ? '+' : ''}{formatPrice(Math.abs(silver.change_amount))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chart + Calculator */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Price Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="capitalize">{activeMetal} Price History</CardTitle>
                <CardDescription>PKR per tola</CardDescription>
              </div>
              <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <TabsList className="h-8">
                  {['1W', '1M', '3M', '6M', '1Y'].map((p) => (
                    <TabsTrigger key={p} value={p} className="text-xs px-2.5 h-7">{p}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={activeMetal === 'gold' ? '#eab308' : '#9ca3af'}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor={activeMetal === 'gold' ? '#eab308' : '#9ca3af'}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Price/Tola']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                    contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={activeMetal === 'gold' ? '#eab308' : '#9ca3af'}
                    strokeWidth={2}
                    fill="url(#colorPrice)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                No historical data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gold Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Gold Calculator
            </CardTitle>
            <CardDescription>Calculate value & zakat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                value={calcWeight}
                onChange={(e) => setCalcWeight(e.target.value)}
                placeholder="Enter weight"
                min="0"
                step="0.1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={calcUnit} onValueChange={(v: 'tola' | 'gram') => setCalcUnit(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tola">Tola</SelectItem>
                    <SelectItem value="gram">Gram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Purity</Label>
                <Select value={calcPurity} onValueChange={setCalcPurity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24k">24K</SelectItem>
                    <SelectItem value="22k">22K</SelectItem>
                    <SelectItem value="21k">21K</SelectItem>
                    <SelectItem value="18k">18K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="font-bold text-lg">
                  {formatPrice(calculateValue())}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Scale className="h-3 w-3" /> Zakat (2.5%)
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatPrice(calculateZakat())}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Market Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <CardTitle>Market Insights</CardTitle>
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" /> AI
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchAnalysis} disabled={isAnalysisLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isAnalysisLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isAnalysisLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
            </div>
          ) : analysis ? (
            <div className="space-y-5">
              {/* Summary + Trend */}
              <div className="flex items-start gap-4">
                <div className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${
                  analysis.trend === 'bullish' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                  analysis.trend === 'bearish' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                  'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                }`}>
                  {analysis.trend === 'bullish' && <TrendingUp className="h-3 w-3 inline mr-1" />}
                  {analysis.trend === 'bearish' && <TrendingDown className="h-3 w-3 inline mr-1" />}
                  {analysis.trend}
                </div>
                <p className="text-sm leading-relaxed">{analysis.summary}</p>
              </div>

              {/* Key Factors */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Factors</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {analysis.key_factors.map((factor, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                      {factor}
                    </div>
                  ))}
                </div>
              </div>

              {/* Metal Insights */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/10 p-3">
                  <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-1">Gold</p>
                  <p className="text-sm">{analysis.gold_insight}</p>
                </div>
                <div className="rounded-lg bg-gray-400/5 border border-gray-400/10 p-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Silver</p>
                  <p className="text-sm">{analysis.silver_insight}</p>
                </div>
              </div>

              {/* Outlook */}
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Outlook</p>
                <p className="text-sm">{analysis.outlook}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load market analysis.</p>
          )}
        </CardContent>
      </Card>

      {/* All Prices Table */}
      {gold?.purities && (
        <Card>
          <CardHeader>
            <CardTitle>All Gold & Silver Rates</CardTitle>
            <CardDescription>Current prices in Pakistani Rupees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Metal</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Per Tola</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Per Gram</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Per 10 Gram</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gold.purities).map(([karat, data]) => (
                    <tr key={karat} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <span className="text-yellow-500 text-xs font-bold">Au</span>
                          </div>
                          <span className="font-medium">Gold {karat.toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-mono font-medium">{formatPrice(data.per_tola)}</td>
                      <td className="text-right py-3 px-4 font-mono text-sm">{formatPrice(data.per_gram)}</td>
                      <td className="text-right py-3 px-4 font-mono text-sm">{formatPrice(data.per_10_gram)}</td>
                    </tr>
                  ))}
                  {silver && (
                    <tr className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gray-400/10 flex items-center justify-center">
                            <span className="text-gray-400 text-xs font-bold">Ag</span>
                          </div>
                          <span className="font-medium">Silver</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-mono font-medium">{formatPrice(silver.per_tola)}</td>
                      <td className="text-right py-3 px-4 font-mono text-sm">{formatPrice(silver.per_gram)}</td>
                      <td className="text-right py-3 px-4 font-mono text-sm">{formatPrice(silver.per_10_gram)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      {prices?.last_updated && (
        <p className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(prices.last_updated).toLocaleString('en-PK')}
        </p>
      )}
    </div>
  );
}
