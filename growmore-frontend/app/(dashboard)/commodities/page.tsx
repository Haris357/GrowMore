'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, DollarSign, Sparkles,
  Calculator, Scale, Coins, Quote, AlertCircle, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import type { PreciousMetalsPrices, MetalHistory, MarketAnalysis, MetalPrice } from '@/types/commodity';

type ActiveMetal = 'gold' | 'silver';
type Period = '1W' | '1M' | '3M' | '6M' | '1Y';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPKR = (val: number) => {
  if (val == null) return 'Rs. 0';
  return `Rs. ${val.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

const pctColor = (v: number) =>
  v > 0 ? 'text-gain' : v < 0 ? 'text-loss' : 'text-muted-foreground';

const TrendChip = ({ change, percent }: { change: number; percent: number }) => {
  const Icon = percent > 0 ? TrendingUp : percent < 0 ? TrendingDown : Minus;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
      percent > 0 ? 'bg-gain/10 text-gain'
      : percent < 0 ? 'bg-loss/10 text-loss'
      : 'bg-muted text-muted-foreground',
    )}>
      <Icon className="h-3 w-3" />
      {percent > 0 ? '+' : ''}{percent?.toFixed(2)}%
    </span>
  );
};

// ─── Metal Spotlight Card ────────────────────────────────────────────────────

function MetalCard({
  metal, data, active, onClick, accent, symbol, tone,
}: {
  metal: ActiveMetal;
  data: MetalPrice;
  active: boolean;
  onClick: () => void;
  accent: string;
  symbol: string;
  tone: { bg: string; text: string; ring: string; gradient: string };
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all relative overflow-hidden border',
        active ? `ring-2 ${tone.ring} ${tone.gradient}` : 'hover:border-foreground/30',
      )}
    >
      <CardContent className="p-5">
        {/* Top row: identity + trend */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
              tone.bg,
            )}>
              <span className={cn('text-base font-black', tone.text)}>{symbol}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-base capitalize">{metal} {metal === 'gold' ? '24K' : ''}</p>
                {active && <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold h-4 px-1.5">Selected</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                ${data.price_usd_oz?.toFixed(2)}/oz · International
              </p>
            </div>
          </div>
          <TrendChip change={data.change_amount} percent={data.change_percentage} />
        </div>

        {/* Big price */}
        <div className="mb-3">
          <p className="text-3xl font-black tracking-tight tabular-nums">{formatPKR(data.per_tola)}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Per Tola</p>
        </div>

        {/* Sub stats grid */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Per Gram</p>
            <p className="text-sm font-bold tabular-nums mt-0.5">{formatPKR(data.per_gram)}</p>
          </div>
          {metal === 'gold' ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">22K Tola</p>
                <p className="text-sm font-bold tabular-nums mt-0.5">{formatPKR(data.purities?.['22k']?.per_tola || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">21K Tola</p>
                <p className="text-sm font-bold tabular-nums mt-0.5">{formatPKR(data.purities?.['21k']?.per_tola || 0)}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">10 Gram</p>
                <p className="text-sm font-bold tabular-nums mt-0.5">{formatPKR(data.per_10_gram)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">24h Δ</p>
                <p className={cn('text-sm font-bold tabular-nums mt-0.5', pctColor(data.change_amount))}>
                  {data.change_amount > 0 ? '+' : ''}{formatPKR(Math.abs(data.change_amount))}
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CommoditiesPage() {
  const [prices, setPrices] = useState<PreciousMetalsPrices | null>(null);
  const [history, setHistory] = useState<MetalHistory[]>([]);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMetal, setActiveMetal] = useState<ActiveMetal>('gold');
  const [period, setPeriod] = useState<Period>('1M');

  // Calculator state
  const [calcMetal, setCalcMetal] = useState<ActiveMetal>('gold');
  const [calcWeight, setCalcWeight] = useState('1');
  const [calcUnit, setCalcUnit] = useState<'tola' | 'gram'>('tola');
  const [calcPurity, setCalcPurity] = useState('24k');

  const fetchPrices = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/commodities/prices');
      setPrices(res.data);
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, []);

  const fetchHistory = useCallback(async (metal: ActiveMetal, p: Period) => {
    try {
      setIsHistoryLoading(true);
      const res = await api.get(`/commodities/history/${metal}?period=${p}`);
      setHistory(res.data?.history || []);
    } catch {
      setHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    try {
      setIsAnalysisLoading(true);
      const res = await api.get('/commodities/analysis');
      setAnalysis(res.data);
    } catch { /* silent */ } finally { setIsAnalysisLoading(false); }
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchAnalysis();
  }, [fetchPrices, fetchAnalysis]);

  useEffect(() => {
    fetchHistory(activeMetal, period);
  }, [activeMetal, period, fetchHistory]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchPrices(), fetchHistory(activeMetal, period), fetchAnalysis()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const calculateValue = () => {
    if (!prices) return 0;
    const metal = prices[calcMetal];
    if (!metal) return 0;
    const weight = parseFloat(calcWeight) || 0;
    if (calcMetal === 'gold') {
      const purityData = metal.purities?.[calcPurity];
      if (!purityData) return 0;
      return calcUnit === 'tola' ? weight * purityData.per_tola : weight * purityData.per_gram;
    }
    return calcUnit === 'tola' ? weight * metal.per_tola : weight * metal.per_gram;
  };

  const calcValue = calculateValue();
  const zakat = calcValue * 0.025;

  const gold = prices?.gold;
  const silver = prices?.silver;

  // ─── Chart styling (theme-aware) ────────────────────────────────────────
  const chartColor = activeMetal === 'gold' ? 'hsl(var(--gold))' : 'hsl(var(--muted-foreground))';
  const chartGradId = `metal-gradient-${activeMetal}`;

  return (
    <div className="space-y-5 pb-10 animate-fade-in">

      {/* ════ Header ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="h-9 w-9 rounded-xl bg-[hsl(var(--gold))/0.1] flex items-center justify-center">
              <Coins className="h-5 w-5 text-[hsl(var(--gold))]" />
            </div>
            Precious Metals
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 ml-0 sm:ml-12">
            Live gold &amp; silver rates · Pakistan market
          </p>
        </div>
        <div className="flex items-center gap-2">
          {prices?.exchange_rate && (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs font-semibold">
              <DollarSign className="h-3 w-3" />
              USD/PKR <span className="tabular-nums">{prices.exchange_rate.toFixed(2)}</span>
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ════ Spotlight Cards ══════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map(i => (
            <Card key={i} className="p-5 h-44 animate-pulse">
              <div className="flex gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {gold && (
            <MetalCard
              metal="gold"
              data={gold}
              active={activeMetal === 'gold'}
              onClick={() => setActiveMetal('gold')}
              accent="gold"
              symbol="Au"
              tone={{
                bg: 'bg-[hsl(var(--gold))/0.12]',
                text: 'text-[hsl(var(--gold))]',
                ring: 'ring-[hsl(var(--gold))/0.5]',
                gradient: 'bg-gradient-to-br from-[hsl(var(--gold))/0.08] to-transparent',
              }}
            />
          )}
          {silver && (
            <MetalCard
              metal="silver"
              data={silver}
              active={activeMetal === 'silver'}
              onClick={() => setActiveMetal('silver')}
              accent="silver"
              symbol="Ag"
              tone={{
                bg: 'bg-muted',
                text: 'text-foreground/70',
                ring: 'ring-foreground/30',
                gradient: 'bg-gradient-to-br from-muted to-transparent',
              }}
            />
          )}
        </div>
      )}

      {/* ════ Chart + Calculator ═══════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Price Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base capitalize flex items-center gap-2">
                  {activeMetal === 'gold'
                    ? <span className="h-5 w-5 rounded-full bg-[hsl(var(--gold))/0.15] flex items-center justify-center text-[10px] font-black text-[hsl(var(--gold))]">Au</span>
                    : <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-black">Ag</span>}
                  {activeMetal} Price History
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">PKR per tola · {period}</p>
              </div>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList className="h-8 grid grid-cols-5 w-full sm:w-auto">
                  {(['1W', '1M', '3M', '6M', '1Y'] as Period[]).map((p) => (
                    <TabsTrigger key={p} value={p} className="text-xs px-3 h-7">{p}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isHistoryLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={chartGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatPKR(value), 'Price/Tola']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-PK', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={chartColor}
                    strokeWidth={2}
                    fill={`url(#${chartGradId})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                <p className="text-sm font-medium text-muted-foreground">No historical data available</p>
                <p className="text-xs text-muted-foreground/80 mt-0.5">Try a different period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calculator */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Value &amp; Zakat
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Calculate worth and zakat due</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Metal toggle */}
            <Tabs value={calcMetal} onValueChange={(v) => setCalcMetal(v as ActiveMetal)}>
              <TabsList className="grid grid-cols-2 w-full h-8">
                <TabsTrigger value="gold" className="text-xs h-7">Gold</TabsTrigger>
                <TabsTrigger value="silver" className="text-xs h-7">Silver</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-1.5">
              <Label htmlFor="weight" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Weight</Label>
              <Input
                id="weight"
                type="number"
                value={calcWeight}
                onChange={(e) => setCalcWeight(e.target.value)}
                placeholder="Enter weight"
                min="0"
                step="0.1"
                className="h-9 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Unit</Label>
                <Select value={calcUnit} onValueChange={(v: 'tola' | 'gram') => setCalcUnit(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tola">Tola</SelectItem>
                    <SelectItem value="gram">Gram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Purity
                </Label>
                <Select
                  value={calcPurity}
                  onValueChange={setCalcPurity}
                  disabled={calcMetal === 'silver'}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24k">24K</SelectItem>
                    <SelectItem value="22k">22K</SelectItem>
                    <SelectItem value="21k">21K</SelectItem>
                    <SelectItem value="18k">18K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results */}
            <div className="rounded-xl border border-border overflow-hidden mt-3">
              <div className="flex items-center justify-between px-3 py-2.5 bg-[hsl(var(--gold))/0.06]">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total Value</span>
                <span className="font-black text-base tabular-nums">{formatPKR(calcValue)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 border-t border-border bg-primary/5">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1">
                  <Scale className="h-3 w-3" /> Zakat (2.5%)
                </span>
                <span className="font-black text-base tabular-nums text-primary">{formatPKR(zakat)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ════ AI Market Analysis ════════════════════════════════════════════ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Market Insights
              {analysis && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] uppercase tracking-wider font-bold ml-1',
                    analysis.trend === 'bullish' ? 'text-gain border-gain/40'
                    : analysis.trend === 'bearish' ? 'text-loss border-loss/40'
                    : 'text-muted-foreground',
                  )}
                >
                  {analysis.trend === 'bullish' && <TrendingUp className="h-3 w-3 mr-1" />}
                  {analysis.trend === 'bearish' && <TrendingDown className="h-3 w-3 mr-1" />}
                  {analysis.trend === 'neutral' && <Minus className="h-3 w-3 mr-1" />}
                  {analysis.trend}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAnalysis}
              disabled={isAnalysisLoading}
              className="gap-1.5 h-8"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isAnalysisLoading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isAnalysisLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Summary as quote */}
              <div className="relative pl-5 border-l-2 border-primary/40">
                <Quote className="h-4 w-4 absolute -left-px top-0 -translate-x-1/2 bg-card text-primary/70" />
                <p className="text-sm text-foreground/90 leading-relaxed italic">{analysis.summary}</p>
              </div>

              {/* Key Factors */}
              {analysis.key_factors?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Key Factors</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {analysis.key_factors.map((factor, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm bg-muted/40 rounded-lg p-2.5">
                        <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-foreground/80">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-metal insights */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[hsl(var(--gold))/0.06] border border-[hsl(var(--gold))/0.2] p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--gold))] mb-1.5 inline-flex items-center gap-1">
                    <span className="h-4 w-4 rounded-full bg-[hsl(var(--gold))/0.2] flex items-center justify-center text-[8px] font-black">Au</span>
                    Gold Outlook
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{analysis.gold_insight}</p>
                </div>
                <div className="rounded-xl bg-muted/50 border border-border p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/60 mb-1.5 inline-flex items-center gap-1">
                    <span className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-black">Ag</span>
                    Silver Outlook
                  </p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{analysis.silver_insight}</p>
                </div>
              </div>

              {/* Outlook */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Forward Outlook</p>
                <p className="text-sm text-foreground/85 leading-relaxed">{analysis.outlook}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground">Market analysis unavailable</p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">Tap refresh to try again</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ════ All Rates Matrix ══════════════════════════════════════════════ */}
      {(gold?.purities || silver) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Rates Today</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Current prices in PKR by purity and unit</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Metal</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Per Tola</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Per Gram</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Per 10g</th>
                  </tr>
                </thead>
                <tbody>
                  {gold?.purities && Object.entries(gold.purities).map(([karat, data]) => (
                    <tr key={karat} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-[hsl(var(--gold))/0.12] flex items-center justify-center shrink-0">
                            <span className="text-[hsl(var(--gold))] text-[10px] font-black">Au</span>
                          </div>
                          <span className="font-semibold">Gold {karat.toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="text-right px-3 py-3 font-semibold tabular-nums">{formatPKR(data.per_tola)}</td>
                      <td className="text-right px-3 py-3 text-muted-foreground tabular-nums">{formatPKR(data.per_gram)}</td>
                      <td className="text-right px-3 py-3 text-muted-foreground tabular-nums hidden sm:table-cell">{formatPKR(data.per_10_gram)}</td>
                    </tr>
                  ))}
                  {silver && (
                    <tr className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <span className="text-foreground/70 text-[10px] font-black">Ag</span>
                          </div>
                          <span className="font-semibold">Silver</span>
                        </div>
                      </td>
                      <td className="text-right px-3 py-3 font-semibold tabular-nums">{formatPKR(silver.per_tola)}</td>
                      <td className="text-right px-3 py-3 text-muted-foreground tabular-nums">{formatPKR(silver.per_gram)}</td>
                      <td className="text-right px-3 py-3 text-muted-foreground tabular-nums hidden sm:table-cell">{formatPKR(silver.per_10_gram)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════ Footer: Last Updated ════════════════════════════════════════ */}
      {prices?.last_updated && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
          <Clock className="h-3 w-3" />
          <span>Last updated: {new Date(prices.last_updated).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
      )}
    </div>
  );
}
