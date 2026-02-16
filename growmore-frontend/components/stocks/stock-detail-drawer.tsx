'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
                  <TabsList className="grid grid-cols-5 w-full h-9">
                    <TabsTrigger value="overview" className="text-[11px] px-1">Overview</TabsTrigger>
                    <TabsTrigger value="income" className="text-[11px] px-1">Income</TabsTrigger>
                    <TabsTrigger value="balance" className="text-[11px] px-1">Balance</TabsTrigger>
                    <TabsTrigger value="cashflow" className="text-[11px] px-1">Cash Flow</TabsTrigger>
                    <TabsTrigger value="ratings" className="text-[11px] px-1">Ratings</TabsTrigger>
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
