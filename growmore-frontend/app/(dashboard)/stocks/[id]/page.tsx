'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { StockDetailSkeleton, TableSkeleton } from '@/components/common/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Building2,
  Calendar,
  DollarSign,
  Percent,
  LineChart,
  PieChart,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CompanyInfo {
  id: string;
  name: string;
  symbol: string;
  logo_url?: string;
  description?: string;
  market_id: string;
  sector_id?: string;
  sector?: {
    id: string;
    name: string;
  };
}

interface StockDetail {
  id: string;
  company_id: string;
  company: CompanyInfo;
  current_price?: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  close_price?: number;
  previous_close?: number;
  change_amount?: number;
  change_percentage?: number;
  volume?: number;
  avg_volume?: number;
  market_cap?: number;
  pe_ratio?: number;
  eps?: number;
  dividend_yield?: number;
  week_52_high?: number;
  week_52_low?: number;
  last_updated?: string;
  created_at?: string;
}

interface PriceHistory {
  date: string;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  close_price?: number;
  volume?: number;
}

interface StockHistoryResponse {
  stock_id: string;
  symbol: string;
  history: PriceHistory[];
  period: string;
}

export default function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [period, setPeriod] = useState('1M');
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<StockDetail>(`/stocks/${resolvedParams.id}`);
        setStock(response.data);
      } catch (err: any) {
        console.error('Error fetching stock:', err);
        setError(err.response?.data?.detail || 'Failed to load stock details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStock();
  }, [resolvedParams.id]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!stock) return;
      try {
        setIsHistoryLoading(true);
        const response = await api.get<StockHistoryResponse>(
          `/stocks/${resolvedParams.id}/history`,
          { params: { period } }
        );
        setHistory(response.data.history || []);
      } catch (err: any) {
        console.error('Error fetching price history:', err);
        setHistory([]);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [resolvedParams.id, stock, period]);

  if (isLoading) {
    return <StockDetailSkeleton />;
  }

  if (error || !stock) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <EmptyState
          icon={AlertCircle}
          title="Stock not found"
          description={error || 'Unable to load stock details'}
        />
      </div>
    );
  }

  const company = stock.company;
  const isPositive = (stock.change_percentage || 0) >= 0;

  // Calculate 52-week position
  const week52High = stock.week_52_high || stock.current_price || 0;
  const week52Low = stock.week_52_low || stock.current_price || 0;
  const currentPrice = stock.current_price || 0;
  const week52Position = week52High !== week52Low
    ? ((currentPrice - week52Low) / (week52High - week52Low)) * 100
    : 50;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-14 w-14">
            {company.logo_url && <AvatarImage src={company.logo_url} alt={company.symbol} />}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
              {company.symbol?.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{company.symbol}</h1>
              {company.sector && (
                <Badge variant="secondary">{company.sector.name}</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{company.name}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold font-mono">
              Rs. {currentPrice.toFixed(2)}
            </p>
            <div className={cn(
              'flex items-center justify-end gap-1 text-lg font-medium',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              <span>
                {isPositive ? '+' : ''}{(stock.change_amount || 0).toFixed(2)}
                ({isPositive ? '+' : ''}{(stock.change_percentage || 0).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open</p>
            <p className="text-lg font-semibold font-mono">
              Rs. {(stock.open_price || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">High</p>
            <p className="text-lg font-semibold font-mono text-green-600">
              Rs. {(stock.high_price || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Low</p>
            <p className="text-lg font-semibold font-mono text-red-600">
              Rs. {(stock.low_price || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Prev Close</p>
            <p className="text-lg font-semibold font-mono">
              Rs. {(stock.previous_close || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="text-lg font-semibold font-mono">
              {(stock.volume || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Volume</p>
            <p className="text-lg font-semibold font-mono">
              {(stock.avg_volume || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Price History</TabsTrigger>
          <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 52 Week Range */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  52 Week Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Rs. {week52Low.toFixed(2)}</span>
                    <span>Rs. {week52High.toFixed(2)}</span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                      style={{ width: '100%' }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary border-2 border-white rounded-full shadow"
                      style={{ left: `calc(${Math.min(Math.max(week52Position, 0), 100)}% - 8px)` }}
                    />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Current: Rs. {currentPrice.toFixed(2)} ({week52Position.toFixed(1)}% of range)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Market Cap</p>
                    <p className="font-semibold">
                      {stock.market_cap
                        ? stock.market_cap >= 10000000
                          ? `Rs. ${(stock.market_cap / 10000000).toFixed(1)} Cr`
                          : `Rs. ${(stock.market_cap / 100000).toFixed(1)} L`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">P/E Ratio</p>
                    <p className="font-semibold">
                      {stock.pe_ratio?.toFixed(2) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">EPS</p>
                    <p className="font-semibold">
                      {stock.eps ? `Rs. ${stock.eps.toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dividend Yield</p>
                    <p className="font-semibold">
                      {stock.dividend_yield ? `${stock.dividend_yield.toFixed(2)}%` : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company Info */}
          {company.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  About {company.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{company.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Last Updated */}
          {stock.last_updated && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last updated: {new Date(stock.last_updated).toLocaleString()}
            </p>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Price History
                </CardTitle>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1W">1 Week</SelectItem>
                    <SelectItem value="1M">1 Month</SelectItem>
                    <SelectItem value="3M">3 Months</SelectItem>
                    <SelectItem value="6M">6 Months</SelectItem>
                    <SelectItem value="1Y">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CardDescription>
                Historical price data for {company.symbol}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isHistoryLoading ? (
                <TableSkeleton rows={10} columns={6} />
              ) : history.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No history data"
                  description="Price history is not available for this period"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Date</th>
                        <th className="text-right py-2 px-2">Open</th>
                        <th className="text-right py-2 px-2">High</th>
                        <th className="text-right py-2 px-2">Low</th>
                        <th className="text-right py-2 px-2">Close</th>
                        <th className="text-right py-2 px-2">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 30).map((item, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="text-right py-2 px-2 font-mono">
                            {item.open_price?.toFixed(2) || '-'}
                          </td>
                          <td className="text-right py-2 px-2 font-mono text-green-600">
                            {item.high_price?.toFixed(2) || '-'}
                          </td>
                          <td className="text-right py-2 px-2 font-mono text-red-600">
                            {item.low_price?.toFixed(2) || '-'}
                          </td>
                          <td className="text-right py-2 px-2 font-mono font-medium">
                            {item.close_price?.toFixed(2) || '-'}
                          </td>
                          <td className="text-right py-2 px-2 font-mono">
                            {item.volume?.toLocaleString() || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {history.length > 30 && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Showing 30 of {history.length} records
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fundamentals" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Valuation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" />
                  Valuation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="font-medium">
                    {stock.market_cap
                      ? stock.market_cap >= 10000000
                        ? `Rs. ${(stock.market_cap / 10000000).toFixed(1)} Cr`
                        : `Rs. ${(stock.market_cap / 100000).toFixed(1)} L`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P/E Ratio</span>
                  <span className="font-medium">{stock.pe_ratio?.toFixed(2) || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EPS</span>
                  <span className="font-medium">
                    {stock.eps ? `Rs. ${stock.eps.toFixed(2)}` : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Dividends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Percent className="h-4 w-4" />
                  Dividends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dividend Yield</span>
                  <span className="font-medium">
                    {stock.dividend_yield ? `${stock.dividend_yield.toFixed(2)}%` : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Price Range */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChart className="h-4 w-4" />
                  52 Week Price Range
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">52 Week High</span>
                  <span className="font-medium text-green-600">
                    Rs. {week52High.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">52 Week Low</span>
                  <span className="font-medium text-red-600">
                    Rs. {week52Low.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From 52W High</span>
                  <span className={cn(
                    'font-medium',
                    currentPrice < week52High ? 'text-red-600' : 'text-green-600'
                  )}>
                    {week52High > 0
                      ? `${(((currentPrice - week52High) / week52High) * 100).toFixed(2)}%`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From 52W Low</span>
                  <span className={cn(
                    'font-medium',
                    currentPrice > week52Low ? 'text-green-600' : 'text-red-600'
                  )}>
                    {week52Low > 0
                      ? `+${(((currentPrice - week52Low) / week52Low) * 100).toFixed(2)}%`
                      : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Volume Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Volume Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Today's Volume</span>
                  <span className="font-medium">
                    {(stock.volume || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Volume</span>
                  <span className="font-medium">
                    {(stock.avg_volume || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vol vs Avg</span>
                  <span className={cn(
                    'font-medium',
                    (stock.volume || 0) > (stock.avg_volume || 0) ? 'text-green-600' : 'text-red-600'
                  )}>
                    {stock.avg_volume && stock.avg_volume > 0
                      ? `${(((stock.volume || 0) / stock.avg_volume - 1) * 100).toFixed(1)}%`
                      : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
