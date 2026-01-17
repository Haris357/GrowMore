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
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Globe,
  Calendar,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  BookmarkPlus,
  Share2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Minus,
  Info,
  LineChart,
  Briefcase,
  Target,
  Percent,
  Scale,
  Users,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { StockQuote } from '@/types/market';

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
  roe?: number;
  roa?: number;
  debt_to_equity?: number;
  current_ratio?: number;
  quick_ratio?: number;
  gross_margin?: number;
  net_margin?: number;
  revenue_growth?: number;
  earnings_growth?: number;
  beta?: number;
  price_history?: { date: string; close: number }[];
}

export function StockDetailDrawer({ stock, isOpen, onClose }: StockDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<ExtendedStockData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && stock) {
      fetchStockDetails();
    }
  }, [isOpen, stock?.id]);

  const fetchStockDetails = async () => {
    if (!stock) return;
    setLoading(true);
    try {
      const response = await api.get(`/stocks/${stock.id}`);
      setStockData({ ...stock, ...response.data });
    } catch (error) {
      console.error('Error fetching stock details:', error);
      setStockData(stock as ExtendedStockData);
    } finally {
      setLoading(false);
    }
  };

  if (!stock) return null;

  const currentPrice = parseFloat(String(stockData?.current_price || stock.current_price || 0));
  const changeAmount = parseFloat(String(stockData?.change_amount || stock.change_amount || stock.change || 0));
  const changePercent = parseFloat(String(stockData?.change_percentage || stock.change_percentage || stock.change_percent || 0));
  const isPositive = changePercent >= 0;
  const isZero = changePercent === 0;

  const formatCurrency = (value: number | undefined | null) => {
    if (value === null || value === undefined) return '-';
    return `Rs. ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: number | undefined | null) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('en-PK');
  };

  const formatPercent = (value: number | undefined | null) => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const formatPercentSimple = (value: number | string | undefined | null) => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return `${num.toFixed(2)}%`;
  };

  const formatDecimal = (value: number | string | undefined | null, decimals: number = 2) => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return num.toFixed(decimals);
  };

  const formatLargeNumber = (value: number | undefined | null) => {
    if (value === null || value === undefined) return '-';
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)} K`;
    return value.toLocaleString('en-PK');
  };

  const week52High = stockData?.week_52_high || 0;
  const week52Low = stockData?.week_52_low || 0;
  const pricePosition = week52High > week52Low
    ? ((currentPrice - week52Low) / (week52High - week52Low)) * 100
    : 50;

  const data = stockData || stock;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b bg-gradient-to-r from-background to-muted/30">
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    {data.logo_url && <AvatarImage src={data.logo_url} alt={data.symbol} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                      {data.symbol?.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                      {data.symbol}
                      <Badge variant="outline" className="text-xs font-normal">
                        PSX
                      </Badge>
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground line-clamp-1 max-w-[300px]">
                      {data.name || data.company_name || data.symbol}
                    </p>
                    {(data.sector_name || data.sector) && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {data.sector_name || data.sector}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <BookmarkPlus className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Price Display */}
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-3xl font-bold tracking-tight">
                    {formatCurrency(currentPrice)}
                  </p>
                  <div className={cn(
                    'flex items-center gap-2 mt-1',
                    isPositive ? 'text-green-600' : isZero ? 'text-muted-foreground' : 'text-red-600'
                  )}>
                    {isPositive ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : isZero ? (
                      <Minus className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                    <span className="font-semibold">
                      {changeAmount >= 0 ? '+' : ''}{changeAmount.toFixed(2)}
                    </span>
                    <span className="font-semibold">
                      ({formatPercent(changePercent)})
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground ml-auto">
                  Last updated: {data.last_updated ? new Date(data.last_updated).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
            </SheetHeader>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {loading ? (
                <StockDetailSkeleton />
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">
                      <Info className="h-4 w-4 mr-1 hidden sm:inline" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="fundamentals" className="text-xs sm:text-sm">
                      <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
                      Fundamentals
                    </TabsTrigger>
                    <TabsTrigger value="financials" className="text-xs sm:text-sm">
                      <PieChart className="h-4 w-4 mr-1 hidden sm:inline" />
                      Financials
                    </TabsTrigger>
                    <TabsTrigger value="company" className="text-xs sm:text-sm">
                      <Building2 className="h-4 w-4 mr-1 hidden sm:inline" />
                      Company
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard label="Open" value={formatCurrency(data.open)} icon={<Activity className="h-4 w-4" />} />
                      <StatCard label="High" value={formatCurrency(data.high)} icon={<TrendingUp className="h-4 w-4 text-green-500" />} />
                      <StatCard label="Low" value={formatCurrency(data.low)} icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
                      <StatCard label="Volume" value={formatLargeNumber(data.volume)} icon={<BarChart3 className="h-4 w-4" />} />
                    </div>

                    {/* 52 Week Range */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <LineChart className="h-4 w-4" />
                          52 Week Range
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{formatCurrency(week52Low)}</span>
                          <span className="text-muted-foreground">{formatCurrency(week52High)}</span>
                        </div>
                        <div className="relative">
                          <Progress value={pricePosition} className="h-2" />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow"
                            style={{ left: `calc(${pricePosition}% - 6px)` }}
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          Current price is {pricePosition.toFixed(0)}% from 52-week low
                        </p>
                      </CardContent>
                    </Card>

                    {/* Trading Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Trading Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow label="Previous Close" value={formatCurrency(data.close)} />
                          <InfoRow label="Day Range" value={`${formatCurrency(data.low)} - ${formatCurrency(data.high)}`} />
                          <InfoRow label="Avg Volume" value={formatLargeNumber(data.avg_volume)} />
                          <InfoRow label="Market Cap" value={formatLargeNumber(data.market_cap)} />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Fundamentals Tab */}
                  <TabsContent value="fundamentals" className="space-y-6">
                    {/* Valuation Metrics */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          Valuation Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow
                            label="P/E Ratio"
                            value={formatDecimal(data.pe_ratio)}
                            tooltip="Price to Earnings Ratio"
                          />
                          <InfoRow
                            label="P/B Ratio"
                            value={formatDecimal((data as ExtendedStockData).pb_ratio)}
                            tooltip="Price to Book Ratio"
                          />
                          <InfoRow
                            label="EPS"
                            value={data.eps ? formatCurrency(data.eps) : '-'}
                            tooltip="Earnings Per Share"
                          />
                          <InfoRow
                            label="Dividend Yield"
                            value={formatPercentSimple(data.dividend_yield)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Performance Metrics */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Performance Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow
                            label="ROE"
                            value={formatPercentSimple((data as ExtendedStockData).roe)}
                            tooltip="Return on Equity"
                          />
                          <InfoRow
                            label="ROA"
                            value={formatPercentSimple((data as ExtendedStockData).roa)}
                            tooltip="Return on Assets"
                          />
                          <InfoRow
                            label="Beta"
                            value={formatDecimal((data as ExtendedStockData).beta)}
                            tooltip="Stock volatility relative to market"
                          />
                          <InfoRow
                            label="Debt/Equity"
                            value={formatDecimal((data as ExtendedStockData).debt_to_equity)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Liquidity Ratios */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Liquidity Ratios
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow
                            label="Current Ratio"
                            value={formatDecimal((data as ExtendedStockData).current_ratio)}
                          />
                          <InfoRow
                            label="Quick Ratio"
                            value={formatDecimal((data as ExtendedStockData).quick_ratio)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Financials Tab */}
                  <TabsContent value="financials" className="space-y-6">
                    {/* Profitability */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Profitability
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow
                            label="Gross Margin"
                            value={formatPercentSimple((data as ExtendedStockData).gross_margin)}
                          />
                          <InfoRow
                            label="Net Margin"
                            value={formatPercentSimple((data as ExtendedStockData).net_margin)}
                          />
                          <InfoRow
                            label="Revenue Growth"
                            value={formatPercentSimple((data as ExtendedStockData).revenue_growth)}
                          />
                          <InfoRow
                            label="Earnings Growth"
                            value={formatPercentSimple((data as ExtendedStockData).earnings_growth)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Share Information */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Share Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow
                            label="Outstanding Shares"
                            value={formatLargeNumber((data as ExtendedStockData).outstanding_shares)}
                          />
                          <InfoRow
                            label="Free Float"
                            value={(data as ExtendedStockData).free_float ? `${(data as ExtendedStockData).free_float}%` : '-'}
                          />
                          <InfoRow
                            label="Face Value"
                            value={formatCurrency((data as ExtendedStockData).face_value)}
                          />
                          <InfoRow
                            label="Paid-up Capital"
                            value={formatLargeNumber((data as ExtendedStockData).paid_up_capital)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Company Tab */}
                  <TabsContent value="company" className="space-y-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Company Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <p className="font-medium">{data.name || data.company_name || data.symbol}</p>
                          {(data as ExtendedStockData).description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {(data as ExtendedStockData).description}
                            </p>
                          )}
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                          <InfoRow label="Sector" value={data.sector_name || data.sector || '-'} />
                          <InfoRow label="Listed In" value={(data as ExtendedStockData).listed_in || 'PSX'} />
                        </div>

                        {(data as ExtendedStockData).website && (
                          <Button variant="outline" className="w-full" asChild>
                            <a href={(data as ExtendedStockData).website} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4 mr-2" />
                              Visit Website
                              <ExternalLink className="h-3 w-3 ml-auto" />
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {/* Quick Links */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Quick Links
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <a
                            href={`https://dps.psx.com.pk/company/${data.symbol}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on PSX
                          </a>
                        </Button>
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <a
                            href={`https://financials.psx.com.pk/company/${data.symbol}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Financial Reports
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex gap-3">
              <Button className="flex-1" variant="default">
                <Briefcase className="h-4 w-4 mr-2" />
                Add to Portfolio
              </Button>
              <Button className="flex-1" variant="outline">
                <BookmarkPlus className="h-4 w-4 mr-2" />
                Add to Watchlist
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Helper Components
function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground" title={tooltip}>
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function StockDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}
