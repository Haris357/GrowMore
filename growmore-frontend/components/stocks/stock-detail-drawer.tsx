'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  Minus,
  BookmarkPlus,
  Share2,
  Briefcase,
  CheckCircle2,
  XCircle,
  MinusCircle,
  BarChart3,
  FileText,
  Scale,
  Activity,
  Star,
  Sparkles,
  Quote,
  AlertTriangle,
  Lightbulb,
  Target,
  MessageCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { StockQuote, FinancialStatement, RatingMetric, StockRatings, StockHistoryPoint } from '@/types/market';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StockDetailDrawerProps {
  stock: StockQuote | null;
  isOpen: boolean;
  onClose: () => void;
}

interface AiSignal { name: string; value: string; status: 'good' | 'bad' | 'neutral'; rationale: string }
interface AiTechnical { daily: string; momentum: string; trend: string; rsi_zone: string; near_52w: string }
interface AiSentimentSource { platform: string; label: string; sentiment: 'bullish' | 'bearish' | 'neutral'; quote: string }
interface AiSentiment { overall: 'BULLISH' | 'MIXED' | 'BEARISH' | 'SILENT'; bullish_pct: number; neutral_pct: number; bearish_pct: number; summary: string; sources: AiSentimentSource[] }
interface AiAnalysis {
  symbol: string; company_name: string; sector: string; logo_url?: string;
  current_price?: number; change_percentage?: number; market_cap?: number;
  week_52_high?: number; week_52_low?: number; generated_at?: string;
  verdict: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'AVOID';
  score: number; headline: string;
  fundamental_signals: AiSignal[];
  technical_signals: AiTechnical;
  social_sentiment: AiSentiment;
  thesis: string;
  reasons_to_buy: string[];
  risks: string[];
  catalysts: string[];
  social_pulse: string;
  what_to_watch: string;
  _fallback?: boolean;
}

interface ExtendedStockData extends StockQuote {
  description?: string;
  website?: string;
  listed_in?: string;
  face_value?: number;
  paid_up_capital?: number;
  outstanding_shares?: number;
  free_float?: number;
  pb_ratio?: number;
  ps_ratio?: number;
  roe?: number;
  roa?: number;
  debt_to_equity?: number;
  current_ratio?: number;
  quick_ratio?: number;
  gross_margin?: number;
  net_margin?: number;
  operating_margin?: number;
  revenue_growth?: number;
  earnings_growth?: number;
  profit_growth?: number;
  beta?: number;
  free_cash_flow?: number;
  operating_cash_flow?: number;
  ev_ebitda?: number;
  peg_ratio?: number;
  fcf_yield?: number;
}

export function StockDetailDrawer({ stock, isOpen, onClose }: StockDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<ExtendedStockData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [historyPeriod, setHistoryPeriod] = useState('1Y');
  const [priceHistory, setPriceHistory] = useState<StockHistoryPoint[]>([]);
  const [financials, setFinancials] = useState<FinancialStatement[]>([]);
  const [financialPeriod, setFinancialPeriod] = useState<'annual' | 'quarterly'>('annual');
  const [overviewFinancialPeriod, setOverviewFinancialPeriod] = useState<'annual' | 'quarterly'>('annual');
  const [overviewFinancials, setOverviewFinancials] = useState<FinancialStatement[]>([]);
  const [ratings, setRatings] = useState<StockRatings | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (isOpen && stock) {
      setActiveTab('overview');
      fetchStockDetails();
    }
  }, [isOpen, stock?.id]);

  useEffect(() => {
    if (isOpen && stock) {
      fetchPriceHistory();
    }
  }, [isOpen, stock?.id, historyPeriod]);

  useEffect(() => {
    if (isOpen && stock && (activeTab === 'income' || activeTab === 'balance' || activeTab === 'cashflow')) {
      fetchFinancials();
    }
  }, [isOpen, stock?.id, activeTab, financialPeriod]);

  useEffect(() => {
    if (isOpen && stock && activeTab === 'overview') {
      fetchOverviewFinancials();
    }
  }, [isOpen, stock?.id, activeTab, overviewFinancialPeriod]);

  useEffect(() => {
    if (isOpen && stock && activeTab === 'ratings') {
      fetchRatings();
    }
  }, [isOpen, stock?.id, activeTab]);

  useEffect(() => {
    if (isOpen && stock && activeTab === 'ai' && !aiAnalysis) {
      fetchAiAnalysis();
    }
  }, [isOpen, stock?.id, activeTab]);

  // Reset AI analysis when stock changes
  useEffect(() => {
    setAiAnalysis(null);
  }, [stock?.id]);

  const fetchStockDetails = async () => {
    if (!stock) return;
    setLoading(true);
    try {
      const response = await api.get(`/stocks/${stock.id}`);
      setStockData({ ...stock, ...response.data });
    } catch {
      setStockData(stock as ExtendedStockData);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    if (!stock) return;
    try {
      const response = await api.get(`/stocks/${stock.id}/history`, { params: { period: historyPeriod } });
      setPriceHistory(response.data?.history || []);
    } catch {
      setPriceHistory([]);
    }
  };

  const fetchFinancials = async () => {
    if (!stock) return;
    try {
      const response = await api.get(`/stocks/${stock.id}/financials`, { params: { period_type: financialPeriod, limit: 5 } });
      setFinancials(response.data?.statements || []);
    } catch {
      setFinancials([]);
    }
  };

  const fetchOverviewFinancials = async () => {
    if (!stock) return;
    try {
      const response = await api.get(`/stocks/${stock.id}/financials`, { params: { period_type: overviewFinancialPeriod, limit: 5 } });
      setOverviewFinancials(response.data?.statements || []);
    } catch {
      setOverviewFinancials([]);
    }
  };

  const fetchRatings = async () => {
    if (!stock) return;
    try {
      const response = await api.get(`/stocks/${stock.id}/ratings`);
      setRatings(response.data);
    } catch {
      setRatings(null);
    }
  };

  const fetchAiAnalysis = async (force = false) => {
    if (!stock) return;
    setAiLoading(true);
    if (force) setAiAnalysis(null);
    try {
      const response = await api.get(`/stocks/${stock.id}/ai-analysis`, {
        timeout: 60000,
      });
      setAiAnalysis(response.data);
    } catch {
      setAiAnalysis(null);
    } finally {
      setAiLoading(false);
    }
  };

  if (!stock) return null;

  const currentPrice = parseFloat(String(stockData?.current_price || stock.current_price || 0));
  const changeAmount = parseFloat(String(stockData?.change_amount || stock.change_amount || stock.change || 0));
  const changePercent = parseFloat(String(stockData?.change_percentage || stock.change_percentage || stock.change_percent || 0));
  const isPositive = changePercent >= 0;
  const isZero = changePercent === 0;
  const data = stockData || stock;

  const fmtCurrency = (v: number | undefined | null) => {
    if (v == null) return '-';
    return `Rs. ${v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtLarge = (v: number | undefined | null) => {
    if (v == null) return '-';
    if (Math.abs(v) >= 1e9) return `Rs. ${(v / 1e9).toFixed(1)}B`;
    if (Math.abs(v) >= 1e7) return `Rs. ${(v / 1e7).toFixed(1)}Cr`;
    if (Math.abs(v) >= 1e5) return `Rs. ${(v / 1e5).toFixed(1)}L`;
    if (Math.abs(v) >= 1e3) return `Rs. ${(v / 1e3).toFixed(1)}K`;
    return `Rs. ${v.toLocaleString('en-PK')}`;
  };

  const fmtPct = (v: number | undefined | null) => {
    if (v == null) return '-';
    return `${Number(v).toFixed(1)}%`;
  };

  const fmtDec = (v: number | undefined | null) => {
    if (v == null) return '-';
    return Number(v).toFixed(2);
  };

  // Overview key metrics
  const keyMetrics = [
    { label: 'Revenue', value: fmtLarge((data as ExtendedStockData).revenue_growth ? undefined : undefined), raw: null, good: null },
    { label: 'EPS', value: data.eps ? `Rs. ${Number(data.eps).toFixed(2)}` : '-', raw: data.eps, good: data.eps ? Number(data.eps) > 0 : null },
    { label: 'ROE', value: fmtPct((data as ExtendedStockData).roe), raw: (data as ExtendedStockData).roe, good: (data as ExtendedStockData).roe ? Number((data as ExtendedStockData).roe) > 15 : null },
    { label: 'P/E', value: data.pe_ratio ? `${Number(data.pe_ratio).toFixed(1)}x` : '-', raw: data.pe_ratio, good: data.pe_ratio ? Number(data.pe_ratio) > 0 && Number(data.pe_ratio) < 25 : null },
    { label: 'Dividend Yield', value: fmtPct(data.dividend_yield), raw: data.dividend_yield, good: data.dividend_yield ? Number(data.dividend_yield) > 3 : null },
    { label: 'D/E Ratio', value: fmtDec((data as ExtendedStockData).debt_to_equity), raw: (data as ExtendedStockData).debt_to_equity, good: (data as ExtendedStockData).debt_to_equity != null ? Number((data as ExtendedStockData).debt_to_equity) < 1 : null },
  ];

  const chartData = [...priceHistory]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((p) => ({
      date: new Date(p.date).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' }),
      price: p.close_price ?? 0,
      volume: p.volume ?? 0,
    }));

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b bg-gradient-to-r from-background to-muted/30">
            <SheetHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    {data.logo_url && <AvatarImage src={data.logo_url} alt={data.symbol} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {data.symbol?.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-lg font-bold flex items-center gap-2">
                      {data.symbol}
                      <Badge variant="outline" className="text-[10px] font-normal">PSX</Badge>
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      Detailed view of {data.name || data.symbol} including price, financials, ratings and AI analysis.
                    </SheetDescription>
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[250px]">
                      {data.name || data.company_name || data.symbol}
                    </p>
                    {(data.sector_name || data.sector) && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {data.sector_name || data.sector}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <BookmarkPlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-2xl font-bold tracking-tight">{fmtCurrency(currentPrice)}</p>
                  <div className={cn('flex items-center gap-1.5 mt-0.5 text-sm',
                    isPositive ? 'text-green-600' : isZero ? 'text-muted-foreground' : 'text-red-600'
                  )}>
                    {isPositive ? <ChevronUp className="h-4 w-4" /> : isZero ? <Minus className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="font-semibold">{changeAmount >= 0 ? '+' : ''}{changeAmount.toFixed(2)}</span>
                    <span className="font-semibold">({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            </SheetHeader>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-5">
              {loading ? (
                <DrawerSkeleton />
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid grid-cols-6 w-full h-9">
                    <TabsTrigger value="overview" className="text-[11px] px-1">Overview</TabsTrigger>
                    <TabsTrigger value="income" className="text-[11px] px-1">Income</TabsTrigger>
                    <TabsTrigger value="balance" className="text-[11px] px-1">Balance</TabsTrigger>
                    <TabsTrigger value="cashflow" className="text-[11px] px-1">Cash Flow</TabsTrigger>
                    <TabsTrigger value="ratings" className="text-[11px] px-1">Ratings</TabsTrigger>
                    <TabsTrigger value="ai" className="text-[11px] px-1 gap-1 data-[state=active]:text-primary">
                      <Sparkles className="h-3 w-3" /> AI
                    </TabsTrigger>
                  </TabsList>

                  {/* ===== OVERVIEW TAB ===== */}
                  <TabsContent value="overview" className="space-y-5">
                    {/* Price Chart */}
                    <Card>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Price History</CardTitle>
                        <Select value={historyPeriod} onValueChange={setHistoryPeriod}>
                          <SelectTrigger className="h-7 w-20 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['1W', '1M', '3M', '6M', '1Y', '3Y', '5Y'].map((p) => (
                              <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardHeader>
                      <CardContent className="pb-3">
                        {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                              <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" domain={['auto', 'auto']} />
                              <Tooltip
                                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                                formatter={(value: any) => [`Rs. ${Number(value).toFixed(2)}`, 'Price']}
                              />
                              <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fill="url(#priceGrad)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                            No price history available
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {keyMetrics.map((m) => (
                        <div
                          key={m.label}
                          className={cn(
                            'rounded-lg border p-3 space-y-1',
                            m.good === true && 'border-l-2 border-l-green-500',
                            m.good === false && 'border-l-2 border-l-red-500',
                            m.good === null && 'border-l-2 border-l-muted-foreground/30',
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {m.good === true && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                            {m.good === false && <XCircle className="h-3 w-3 text-red-500" />}
                            {m.good === null && <MinusCircle className="h-3 w-3 text-muted-foreground/50" />}
                            <span className="text-[11px] text-muted-foreground">{m.label}</span>
                          </div>
                          <p className="text-sm font-semibold">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Financial Bar Charts */}
                    <Card>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Financial Overview</CardTitle>
                        <PeriodToggle value={overviewFinancialPeriod} onChange={setOverviewFinancialPeriod} />
                      </CardHeader>
                      <CardContent>
                        {overviewFinancials.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4">
                            <MiniBarChart
                              title="Total Revenue"
                              data={overviewFinancials}
                              dataKey="revenue"
                              color="hsl(var(--primary))"
                            />
                            <MiniBarChart
                              title="EBITDA"
                              data={overviewFinancials}
                              dataKey="ebitda"
                              color="hsl(210, 80%, 55%)"
                            />
                            <MiniBarChart
                              title="Net Income"
                              data={overviewFinancials}
                              dataKey="net_income"
                              color="hsl(150, 60%, 45%)"
                            />
                            <MiniBarChart
                              title="EPS"
                              data={overviewFinancials}
                              dataKey="eps"
                              color="hsl(280, 60%, 55%)"
                            />
                          </div>
                        ) : (
                          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                            No financial data available yet
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Trading Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Trading Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          <InfoRow label="Open" value={fmtCurrency(data.open)} />
                          <InfoRow label="High" value={fmtCurrency(data.high)} />
                          <InfoRow label="Low" value={fmtCurrency(data.low)} />
                          <InfoRow label="Prev Close" value={fmtCurrency(data.close)} />
                          <InfoRow label="Volume" value={data.volume ? Number(data.volume).toLocaleString() : '-'} />
                          <InfoRow label="Avg Volume" value={data.avg_volume ? Number(data.avg_volume).toLocaleString() : '-'} />
                          <InfoRow label="52W High" value={fmtCurrency(data.week_52_high)} />
                          <InfoRow label="52W Low" value={fmtCurrency(data.week_52_low)} />
                          <InfoRow label="Market Cap" value={fmtLarge(data.market_cap)} />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ===== INCOME STATEMENTS TAB ===== */}
                  <TabsContent value="income" className="space-y-4">
                    <PeriodToggle value={financialPeriod} onChange={setFinancialPeriod} />
                    <FinancialTable
                      statements={financials}
                      rows={[
                        { key: 'revenue', label: 'Revenue / Sales' },
                        { key: 'cost_of_revenue', label: 'Cost of Revenue' },
                        { key: 'gross_profit', label: 'Gross Profit' },
                        { key: 'operating_expenses', label: 'Operating Expenses' },
                        { key: 'operating_income', label: 'Operating Income' },
                        { key: 'ebitda', label: 'EBITDA' },
                        { key: 'interest_expense', label: 'Interest Expense' },
                        { key: 'net_income', label: 'Net Income' },
                        { key: 'eps', label: 'EPS' },
                      ]}
                    />
                  </TabsContent>

                  {/* ===== BALANCE SHEETS TAB ===== */}
                  <TabsContent value="balance" className="space-y-4">
                    <PeriodToggle value={financialPeriod} onChange={setFinancialPeriod} />
                    <FinancialTable
                      statements={financials}
                      rows={[
                        { key: '_header_assets', label: 'ASSETS', isHeader: true },
                        { key: 'total_assets', label: 'Total Assets' },
                        { key: 'current_assets', label: 'Current Assets' },
                        { key: 'non_current_assets', label: 'Non-Current Assets' },
                        { key: '_header_liabilities', label: 'LIABILITIES', isHeader: true },
                        { key: 'total_liabilities', label: 'Total Liabilities' },
                        { key: 'current_liabilities', label: 'Current Liabilities' },
                        { key: 'non_current_liabilities', label: 'Non-Current Liabilities' },
                        { key: '_header_equity', label: 'EQUITY', isHeader: true },
                        { key: 'total_equity', label: 'Total Equity' },
                      ]}
                    />
                  </TabsContent>

                  {/* ===== CASH FLOW TAB ===== */}
                  <TabsContent value="cashflow" className="space-y-4">
                    <PeriodToggle value={financialPeriod} onChange={setFinancialPeriod} />
                    <FinancialTable
                      statements={financials}
                      rows={[
                        { key: 'operating_cash_flow', label: 'Operating Cash Flow' },
                        { key: 'investing_cash_flow', label: 'Investing Cash Flow' },
                        { key: 'financing_cash_flow', label: 'Financing Cash Flow' },
                        { key: 'net_cash_change', label: 'Net Change in Cash' },
                        { key: 'free_cash_flow', label: 'Free Cash Flow' },
                      ]}
                    />
                  </TabsContent>

                  {/* ===== RATINGS TAB ===== */}
                  <TabsContent value="ratings" className="space-y-4">
                    {ratings ? (
                      <>
                        <RatingSection title="Growth Metrics" metrics={ratings.growth_metrics} />
                        <RatingSection title="Stability Metrics" metrics={ratings.stability_metrics} />
                        <RatingSection title="Valuation Metrics" metrics={ratings.valuation_metrics} />
                        <RatingSection title="Efficiency Metrics" metrics={ratings.efficiency_metrics} />
                        <RatingSection title="Cash Flow Metrics" metrics={ratings.cash_flow_metrics} />
                      </>
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        Loading ratings...
                      </div>
                    )}
                  </TabsContent>

                  {/* ===== AI ANALYSIS TAB ===== */}
                  <TabsContent value="ai" className="space-y-4">
                    {aiLoading && !aiAnalysis ? (
                      <AiAnalysisSkeleton />
                    ) : aiAnalysis ? (
                      <AiAnalysisDashboard analysis={aiAnalysis} onRefresh={() => fetchAiAnalysis(true)} loading={aiLoading} />
                    ) : (
                      <div className="text-center py-12">
                        <Sparkles className="h-10 w-10 mx-auto text-muted-foreground opacity-40 mb-3" />
                        <p className="text-sm font-medium">AI analysis unavailable</p>
                        <p className="text-xs text-muted-foreground mt-1">Tap below to retry.</p>
                        <Button size="sm" className="mt-4 gap-2" onClick={() => fetchAiAnalysis(true)}>
                          <RefreshCw className="h-3.5 w-3.5" /> Generate analysis
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t bg-muted/30">
            <div className="flex gap-2">
              <Button className="flex-1 h-9 text-xs" variant="default">
                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                Add to Portfolio
              </Button>
              <Button className="flex-1 h-9 text-xs" variant="outline">
                <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" />
                Add to Watchlist
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Helper Components =====

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function PeriodToggle({ value, onChange }: { value: 'annual' | 'quarterly'; onChange: (v: 'annual' | 'quarterly') => void }) {
  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant={value === 'annual' ? 'default' : 'outline'}
        onClick={() => onChange('annual')}
        className="h-7 text-xs px-3"
      >
        Annual
      </Button>
      <Button
        size="sm"
        variant={value === 'quarterly' ? 'default' : 'outline'}
        onClick={() => onChange('quarterly')}
        className="h-7 text-xs px-3"
      >
        Quarterly
      </Button>
    </div>
  );
}

interface FinancialTableRow {
  key: string;
  label: string;
  isHeader?: boolean;
}

function FinancialTable({ statements, rows }: { statements: FinancialStatement[]; rows: FinancialTableRow[] }) {
  const sorted = [...statements].sort((a, b) => b.fiscal_year - a.fiscal_year);

  const fmtVal = (v: number | undefined | null) => {
    if (v == null) return '-';
    const num = Number(v);
    if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(2);
  };

  if (sorted.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8 border rounded-lg">
        No financial data available yet. Data will appear after the next scraper run.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-2 font-medium sticky left-0 bg-muted/50 min-w-[140px]">Metric</th>
            {sorted.map((s) => (
              <th key={`${s.fiscal_year}-${s.quarter || ''}`} className="text-right p-2 font-medium min-w-[80px]">
                {s.quarter ? `Q${s.quarter} ${s.fiscal_year}` : `FY${s.fiscal_year}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.isHeader) {
              return (
                <tr key={row.key} className="bg-muted/30">
                  <td colSpan={sorted.length + 1} className="p-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">
                    {row.label}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={row.key} className="border-b border-border/30 hover:bg-muted/20">
                <td className="p-2 text-muted-foreground sticky left-0 bg-background">{row.label}</td>
                {sorted.map((s) => {
                  const val = (s as any)[row.key];
                  const num = val != null ? Number(val) : null;
                  return (
                    <td key={`${s.fiscal_year}-${s.quarter || ''}`} className={cn('text-right p-2 font-mono', num != null && num < 0 && 'text-red-500')}>
                      {fmtVal(val)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RatingSection({ title, metrics }: { title: string; metrics: RatingMetric[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div
            key={m.name}
            className={cn(
              'flex items-center justify-between rounded-lg border p-2.5',
              m.status === 'good' && 'border-l-2 border-l-green-500 bg-green-500/5',
              m.status === 'bad' && 'border-l-2 border-l-red-500 bg-red-500/5',
              m.status === 'neutral' && 'border-l-2 border-l-muted-foreground/30',
            )}
          >
            <div className="flex items-center gap-2">
              {m.status === 'good' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
              {m.status === 'bad' && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
              {m.status === 'neutral' && <MinusCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
              <div>
                <p className="text-xs font-medium">{m.name}</p>
                <p className={cn('text-[10px]',
                  m.status === 'good' ? 'text-green-600' : m.status === 'bad' ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  {m.status === 'good' ? 'Good' : m.status === 'bad' ? 'Bad' : 'N/A'}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold font-mono">{m.display_value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MiniBarChart({
  title,
  data,
  dataKey,
  color,
}: {
  title: string;
  data: FinancialStatement[];
  dataKey: string;
  color: string;
}) {
  const sorted = [...data].sort((a, b) => a.fiscal_year - b.fiscal_year);
  const chartData = sorted.map((s) => ({
    label: s.quarter ? `Q${s.quarter} ${s.fiscal_year}` : `FY${s.fiscal_year}`,
    value: (s as any)[dataKey] != null ? Number((s as any)[dataKey]) : 0,
  }));

  const fmtTick = (v: number) => {
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(0)}B`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return String(v);
  };

  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtTick} className="text-muted-foreground" width={40} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
            formatter={(value: any) => {
              const v = Number(value);
              if (Math.abs(v) >= 1e9) return [`Rs. ${(v / 1e9).toFixed(1)}B`, title];
              if (Math.abs(v) >= 1e6) return [`Rs. ${(v / 1e6).toFixed(1)}M`, title];
              return [`Rs. ${v.toFixed(2)}`, title];
            }}
          />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-[200px] rounded-lg" />
      <div className="grid grid-cols-3 gap-2">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// AI ANALYSIS COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

const VERDICT_STYLES: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  STRONG_BUY: { bg: 'bg-gain', text: 'text-white', ring: 'ring-gain/40', label: 'Strong Buy' },
  BUY:        { bg: 'bg-gain/85', text: 'text-white', ring: 'ring-gain/30', label: 'Buy' },
  HOLD:       { bg: 'bg-yellow-500', text: 'text-white', ring: 'ring-yellow-400/40', label: 'Hold' },
  SELL:       { bg: 'bg-orange-500', text: 'text-white', ring: 'ring-orange-400/40', label: 'Sell' },
  AVOID:      { bg: 'bg-loss', text: 'text-white', ring: 'ring-loss/40', label: 'Avoid' },
};

const SENTIMENT_STYLES: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  BULLISH: { color: 'text-gain', label: 'Bullish', icon: TrendingUp },
  BEARISH: { color: 'text-loss', label: 'Bearish', icon: TrendingDown },
  MIXED:   { color: 'text-yellow-500', label: 'Mixed', icon: Activity },
  SILENT:  { color: 'text-muted-foreground', label: 'Silent', icon: MessageCircle },
};

const PLATFORM_COLORS: Record<string, string> = {
  reddit: 'text-orange-500 bg-orange-500/10',
  x: 'text-foreground bg-foreground/10',
  twitter: 'text-foreground bg-foreground/10',
  blog: 'text-info bg-info/10',
  youtube: 'text-red-500 bg-red-500/10',
  forum: 'text-purple-500 bg-purple-500/10',
  whatsapp: 'text-emerald-500 bg-emerald-500/10',
  telegram: 'text-sky-500 bg-sky-500/10',
};

function AiAnalysisDashboard({
  analysis,
  onRefresh,
  loading,
}: {
  analysis: AiAnalysis;
  onRefresh: () => void;
  loading: boolean;
}) {
  const v = VERDICT_STYLES[analysis.verdict] || VERDICT_STYLES.HOLD;
  const s = SENTIMENT_STYLES[analysis.social_sentiment.overall] || SENTIMENT_STYLES.SILENT;
  const SIcon = s.icon;
  const score = Math.max(0, Math.min(10, analysis.score ?? 5));

  return (
    <div className="space-y-4">
      {/* ─── Verdict Banner ──────────────────────────────────────────────── */}
      <Card className={cn('overflow-hidden border-0 shadow-md ring-2', v.ring)}>
        <div className={cn('p-4', v.bg, v.text)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">AI Verdict</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight">{v.label}</h3>
              <p className="text-xs opacity-95 mt-1 leading-snug">{analysis.headline}</p>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <div className="text-right">
                <div className="text-3xl font-black tabular-nums leading-none">{score.toFixed(1)}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-90 mt-0.5">Score / 10</div>
              </div>
              {analysis._fallback && (
                <Badge variant="secondary" className="mt-1 text-[9px] uppercase">Heuristic</Badge>
              )}
            </div>
          </div>
          {/* Score bar */}
          <div className="mt-3 h-1.5 bg-black/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/85 rounded-full transition-all" style={{ width: `${(score / 10) * 100}%` }} />
          </div>
        </div>
      </Card>

      {/* ─── Quick Snapshot ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Price', value: analysis.current_price != null ? `Rs. ${analysis.current_price.toFixed(2)}` : 'N/A' },
          { label: '52W High', value: analysis.week_52_high ? `Rs. ${analysis.week_52_high.toFixed(2)}` : 'N/A' },
          { label: '52W Low', value: analysis.week_52_low ? `Rs. ${analysis.week_52_low.toFixed(2)}` : 'N/A' },
          { label: 'Market Cap', value: analysis.market_cap ? formatBig(analysis.market_cap) : 'N/A' },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border bg-muted/30 p-2.5">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{m.label}</p>
            <p className="text-sm font-bold tabular-nums mt-0.5 truncate">{m.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Fundamental Signals ─────────────────────────────────────────── */}
      <div>
        <SectionLabel icon={BarChart3} label="Fundamental Signals" />
        <div className="grid gap-1.5 sm:grid-cols-2">
          {analysis.fundamental_signals?.length > 0 ? (
            analysis.fundamental_signals.map((sig, i) => <SignalRow key={i} signal={sig} />)
          ) : (
            <div className="col-span-2 text-center py-4 text-xs text-muted-foreground">No signals available</div>
          )}
        </div>
      </div>

      {/* ─── Technical Signals ───────────────────────────────────────────── */}
      <div>
        <SectionLabel icon={Activity} label="Technical Signals" />
        <Card>
          <CardContent className="p-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: 'Daily', value: analysis.technical_signals?.daily },
              { label: 'Momentum', value: analysis.technical_signals?.momentum },
              { label: 'Trend', value: analysis.technical_signals?.trend },
              { label: 'RSI Zone', value: analysis.technical_signals?.rsi_zone },
              { label: 'vs 52W', value: analysis.technical_signals?.near_52w },
            ].map((t) => (
              <div key={t.label}>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t.label}</p>
                <p className={cn(
                  'text-xs font-semibold mt-0.5',
                  /buy/i.test(t.value || '') && 'text-gain',
                  /sell/i.test(t.value || '') && 'text-loss',
                  /positive|over/i.test(t.value || '') && 'text-gain',
                  /negative|below/i.test(t.value || '') && 'text-loss',
                )}>
                  {t.value || '—'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ─── What People Are Saying ───────────────────────────────────────── */}
      <div>
        <SectionLabel icon={MessageCircle} label="What People Are Saying" />
        {/* Sentiment bar */}
        <div className="rounded-lg border p-3 bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <SIcon className={cn('h-4 w-4', s.color)} />
              <span className={cn('text-sm font-bold', s.color)}>{s.label}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {analysis.social_sentiment.bullish_pct ?? 0}% bull · {analysis.social_sentiment.neutral_pct ?? 0}% neutral · {analysis.social_sentiment.bearish_pct ?? 0}% bear
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden flex bg-muted">
            <div className="bg-gain h-full" style={{ width: `${analysis.social_sentiment.bullish_pct || 0}%` }} />
            <div className="bg-yellow-400 h-full" style={{ width: `${analysis.social_sentiment.neutral_pct || 0}%` }} />
            <div className="bg-loss h-full" style={{ width: `${analysis.social_sentiment.bearish_pct || 0}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">{analysis.social_sentiment.summary}</p>
        </div>

        {/* Source cards */}
        {analysis.social_sentiment.sources?.length > 0 ? (
          <div className="space-y-1.5 mt-2">
            {analysis.social_sentiment.sources.map((src, i) => (
              <SourceCard key={i} source={src} />
            ))}
          </div>
        ) : (
          <div className="mt-2 text-center py-4 text-xs text-muted-foreground bg-muted/20 rounded-lg">
            🔇 Low social activity — not widely discussed
          </div>
        )}
      </div>

      {/* ─── Investment Thesis ───────────────────────────────────────────── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent">
        <CardContent className="p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Quote className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Investment Thesis</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{analysis.thesis}</p>
        </CardContent>
      </Card>

      {/* ─── Reasons / Risks ─────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-2">
        {analysis.reasons_to_buy?.length > 0 && (
          <Card className="border-gain/30 bg-gain/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-gain" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gain">Reasons to Buy</span>
              </div>
              <ul className="space-y-1.5">
                {analysis.reasons_to_buy.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/85">
                    <CheckCircle2 className="h-3 w-3 text-gain mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {analysis.risks?.length > 0 && (
          <Card className="border-loss/30 bg-loss/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-loss" />
                <span className="text-[10px] font-black uppercase tracking-widest text-loss">Risks</span>
              </div>
              <ul className="space-y-1.5">
                {analysis.risks.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/85">
                    <XCircle className="h-3 w-3 text-loss mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Catalysts / What to Watch ────────────────────────────────────── */}
      <Card>
        <CardContent className="p-3 space-y-3">
          {analysis.catalysts?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Catalysts</span>
              </div>
              <ul className="space-y-1">
                {analysis.catalysts.slice(0, 3).map((c, i) => (
                  <li key={i} className="text-xs text-foreground/85 flex items-start gap-1.5">
                    <span className="text-primary font-bold">›</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.what_to_watch && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">What to Watch</span>
              </div>
              <p className="text-xs text-foreground/85">{analysis.what_to_watch}</p>
            </div>
          )}
          {analysis.social_pulse && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Social Pulse</span>
              </div>
              <p className="text-xs italic text-foreground/85">{analysis.social_pulse}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-[10px] text-muted-foreground italic">
          Not financial advice. Always do your own research before investing.
          {analysis.generated_at && <> · Generated {new Date(analysis.generated_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</>}
        </p>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-7 gap-1.5 text-xs shrink-0">
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{label}</h4>
    </div>
  );
}

function SignalRow({ signal }: { signal: AiSignal }) {
  const Icon = signal.status === 'good' ? CheckCircle2 : signal.status === 'bad' ? XCircle : MinusCircle;
  return (
    <div className={cn(
      'rounded-lg border p-2.5 flex items-start gap-2',
      signal.status === 'good' && 'border-l-2 border-l-gain bg-gain/5',
      signal.status === 'bad' && 'border-l-2 border-l-loss bg-loss/5',
      signal.status === 'neutral' && 'border-l-2 border-l-muted-foreground/30 bg-muted/30',
    )}>
      <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0',
        signal.status === 'good' ? 'text-gain' : signal.status === 'bad' ? 'text-loss' : 'text-muted-foreground/60'
      )} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className="text-xs font-semibold truncate">{signal.name}</span>
          <span className="text-xs font-bold tabular-nums shrink-0">{signal.value}</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">{signal.rationale}</p>
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: AiSentimentSource }) {
  const platformKey = (source.platform || '').toLowerCase().replace(/[^a-z]/g, '');
  const platformStyle = PLATFORM_COLORS[platformKey] || 'text-muted-foreground bg-muted';
  const sentimentColor =
    source.sentiment === 'bullish' ? 'text-gain border-gain/30 bg-gain/10'
    : source.sentiment === 'bearish' ? 'text-loss border-loss/30 bg-loss/10'
    : 'text-muted-foreground border-border bg-muted';

  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', platformStyle)}>
            {source.platform}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground truncate">{source.label}</span>
        </div>
        <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0', sentimentColor)}>
          {source.sentiment}
        </span>
      </div>
      <p className="text-xs text-foreground/85 italic leading-snug">"{source.quote}"</p>
    </div>
  );
}

function AiAnalysisSkeleton() {
  return (
    <div className="space-y-4">
      {/* Verdict banner skeleton */}
      <Skeleton className="h-28 rounded-lg" />
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
      {/* Fundamentals */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <div className="grid sm:grid-cols-2 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      </div>
      {/* Technicals */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      {/* Sentiment */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-20 rounded-lg" />
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
      {/* Thesis */}
      <Skeleton className="h-20 rounded-lg" />
      {/* Reasons / risks */}
      <div className="grid sm:grid-cols-2 gap-2">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <div className="text-center text-xs text-muted-foreground pt-2">
        <Sparkles className="h-4 w-4 inline mr-1.5 animate-pulse text-primary" />
        Generating AI analysis… this can take 5–15 seconds.
      </div>
    </div>
  );
}

function formatBig(n: number): string {
  if (!n) return '—';
  if (n >= 1e9) return `Rs. ${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e7) return `Rs. ${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `Rs. ${(n / 1e5).toFixed(2)}L`;
  return `Rs. ${n.toLocaleString('en-PK')}`;
}
