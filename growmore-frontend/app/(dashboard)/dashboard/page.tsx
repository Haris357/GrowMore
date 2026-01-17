'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/stat-card';
import { PriceDisplay } from '@/components/common/price-display';
import { EmptyState } from '@/components/common/empty-state';
import { DashboardSkeleton } from '@/components/common/skeletons';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Wallet, Target, Activity, Briefcase, Coins, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { ConnectionStatus, MarketTicker } from '@/components/common/live-price';

// Match the actual backend response structure
interface DashboardData {
  portfolio: {
    total_value: number;
    total_gain_loss: number;
    gain_loss_pct: number;
    holdings_count: number;
  };
  market: {
    indices: Array<{
      name: string;
      symbol: string;
      value: number;
      change: number;
      change_percentage: number;
      updated_at?: string;
    }>;
    breadth: string;
  };
  goals: {
    active: number;
    achieved: number;
    overall_progress: number;
  };
  notifications: {
    unread_count: number;
    active_alerts: number;
  };
  timestamp: string;
}

interface StockMover {
  symbol: string;
  name: string;
  current_price: number;
  change_percentage: number;
  volume?: number;
}

interface SectorData {
  sector: string;
  average_change: number;
  advancing: number;
  declining: number;
  stocks_count: number;
}

interface CommodityData {
  name: string;
  symbol: string;
  price: number;
  unit: string;
  change?: number;
  change_percentage?: number;
}

interface MarketMoversData {
  top_gainers: StockMover[];
  top_losers: StockMover[];
  most_active: StockMover[];
}

interface MarketIndex {
  id: string;
  name: string;
  symbol: string;
  value: number;
  change: number;
  change_percentage: number;
  previous_close?: number;
  updated_at?: string;
}

interface QuickStats {
  market: {
    total_stocks: number;
    advancing: number;
    declining: number;
  };
  portfolio: {
    value: number;
    invested: number;
    gain_loss: number;
  };
  notifications: {
    unread: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [movers, setMovers] = useState<MarketMoversData | null>(null);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // Fetch all data in parallel
        const [summaryRes, moversRes, sectorsRes, commoditiesRes, indicesRes, quickStatsRes] = await Promise.all([
          api.get<DashboardData>('/dashboard/summary'),
          api.get<MarketMoversData>('/dashboard/movers').catch(() => ({ data: null })),
          api.get<{ sectors: SectorData[] }>('/dashboard/sectors').catch(() => ({ data: { sectors: [] } })),
          api.get<{ commodities: CommodityData[] }>('/dashboard/commodities').catch(() => ({ data: { commodities: [] } })),
          api.get<{ indices: MarketIndex[] }>('/dashboard/indices').catch(() => ({ data: { indices: [] } })),
          api.get<QuickStats>('/dashboard/quick-stats').catch(() => ({ data: null })),
        ]);

        setData(summaryRes.data);
        setMovers(moversRes.data);
        setSectors(sectorsRes.data?.sectors || []);
        setCommodities(commoditiesRes.data?.commodities || []);
        setIndices(indicesRes.data?.indices || []);
        setQuickStats(quickStatsRes.data);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.response?.data?.detail || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={Activity}
        title="Unable to load dashboard"
        description={error}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No data available"
        description="Start by adding investments to your portfolio"
      />
    );
  }

  const { portfolio, market, goals, notifications } = data;
  const kseIndex = market.indices?.find(i => i.symbol === 'KSE100' || i.name?.includes('KSE') || i.name?.includes('100')) || market.indices?.[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Market Ticker */}
      <MarketTicker />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your investments.
          </p>
        </div>
        <ConnectionStatus />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Portfolio Value"
          value={`Rs. ${(portfolio?.total_value || 0).toLocaleString('en-PK')}`}
          change={portfolio?.gain_loss_pct || 0}
          icon={Wallet}
          trend={portfolio?.total_gain_loss > 0 ? 'up' : portfolio?.total_gain_loss < 0 ? 'down' : 'neutral'}
        />
        <StatCard
          title="Profit/Loss"
          value={`Rs. ${(portfolio?.total_gain_loss || 0).toLocaleString('en-PK')}`}
          change={portfolio?.gain_loss_pct || 0}
          icon={portfolio?.total_gain_loss >= 0 ? TrendingUp : TrendingDown}
          trend={portfolio?.total_gain_loss > 0 ? 'up' : portfolio?.total_gain_loss < 0 ? 'down' : 'neutral'}
        />
        <StatCard
          title="Holdings"
          value={`${portfolio?.holdings_count || 0}`}
          changeLabel="Active positions"
          icon={Briefcase}
        />
        <StatCard
          title="Goals Progress"
          value={`${goals?.active || 0} Active`}
          changeLabel={`${goals?.achieved || 0} achieved`}
          icon={Target}
          trend="up"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{kseIndex?.name || 'Market Index'}</CardTitle>
            <CardDescription>Pakistan Stock Exchange</CardDescription>
          </CardHeader>
          <CardContent>
            {kseIndex ? (
              <>
                <PriceDisplay
                  value={kseIndex.value || 0}
                  currency=""
                  change={kseIndex.change || 0}
                  changePercent={kseIndex.change_percentage || 0}
                  size="lg"
                />
                {kseIndex.updated_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last updated: {new Date(kseIndex.updated_at).toLocaleTimeString()}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No index data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Status</CardTitle>
            <CardDescription>Current market conditions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Market Breadth</span>
              <span className={`font-medium capitalize ${
                market?.breadth === 'bullish' ? 'text-green-500' :
                market?.breadth === 'bearish' ? 'text-red-500' : 'text-yellow-500'
              }`}>
                {market?.breadth || 'Unknown'}
              </span>
            </div>
            {quickStats?.market && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Advancing</span>
                  <span className="font-medium text-green-500">{quickStats.market.advancing}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Declining</span>
                  <span className="font-medium text-red-500">{quickStats.market.declining}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Stocks</span>
                  <span className="font-medium">{quickStats.market.total_stocks}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm">Unread Notifications</span>
              <span className="font-medium">{quickStats?.notifications?.unread || notifications?.unread_count || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Alerts</span>
              <span className="font-medium">{notifications?.active_alerts || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goals Overview</CardTitle>
          <CardDescription>Track your investment goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{goals?.active || 0}</p>
              <p className="text-xs text-muted-foreground">Active Goals</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{goals?.achieved || 0}</p>
              <p className="text-xs text-muted-foreground">Achieved</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{goals?.overall_progress || 0}%</p>
              <p className="text-xs text-muted-foreground">Overall Progress</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Movers */}
      {movers && (movers.top_gainers?.length > 0 || movers.top_losers?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Market Movers
            </CardTitle>
            <CardDescription>Top performers today</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="gainers">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="gainers">Gainers</TabsTrigger>
                <TabsTrigger value="losers">Losers</TabsTrigger>
                <TabsTrigger value="active">Most Active</TabsTrigger>
              </TabsList>
              <TabsContent value="gainers" className="space-y-2 mt-4">
                {movers.top_gainers?.slice(0, 5).map((stock) => (
                  <div key={stock.symbol} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <div>
                      <p className="font-medium">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {stock.current_price?.toFixed(2)}</p>
                      <p className="text-xs text-green-500">+{stock.change_percentage?.toFixed(2)}%</p>
                    </div>
                  </div>
                ))}
                {(!movers.top_gainers || movers.top_gainers.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">No data available</p>
                )}
              </TabsContent>
              <TabsContent value="losers" className="space-y-2 mt-4">
                {movers.top_losers?.slice(0, 5).map((stock) => (
                  <div key={stock.symbol} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <div>
                      <p className="font-medium">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {stock.current_price?.toFixed(2)}</p>
                      <p className="text-xs text-red-500">{stock.change_percentage?.toFixed(2)}%</p>
                    </div>
                  </div>
                ))}
                {(!movers.top_losers || movers.top_losers.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">No data available</p>
                )}
              </TabsContent>
              <TabsContent value="active" className="space-y-2 mt-4">
                {movers.most_active?.slice(0, 5).map((stock) => (
                  <div key={stock.symbol} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <div>
                      <p className="font-medium">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {stock.current_price?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{stock.volume?.toLocaleString()} vol</p>
                    </div>
                  </div>
                ))}
                {(!movers.most_active || movers.most_active.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">No data available</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Sector Performance & Commodities */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Market Indices */}
        {indices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Market Indices
              </CardTitle>
              <CardDescription>Key market indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {indices.slice(0, 5).map((index) => (
                  <div key={index.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{index.name}</p>
                      <p className="text-xs text-muted-foreground">{index.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{index.value?.toLocaleString()}</p>
                      <p className={`text-xs ${index.change_percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {index.change_percentage >= 0 ? '+' : ''}{index.change_percentage?.toFixed(2)}%
                        {' '}({index.change >= 0 ? '+' : ''}{index.change?.toFixed(2)})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sector Performance */}
        {sectors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sector Performance</CardTitle>
              <CardDescription>How sectors are performing today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sectors.slice(0, 6).map((sector) => (
                  <div key={sector.sector} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium capitalize">{sector.sector}</p>
                      <p className="text-xs text-muted-foreground">
                        {sector.advancing} up / {sector.declining} down
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        sector.average_change > 0
                          ? 'bg-green-500/20 text-green-600'
                          : sector.average_change < 0
                          ? 'bg-red-500/20 text-red-600'
                          : ''
                      }
                    >
                      {sector.average_change > 0 ? '+' : ''}{sector.average_change?.toFixed(2)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commodities */}
        {commodities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                Commodities
              </CardTitle>
              <CardDescription>Gold, Silver & more</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {commodities.map((commodity) => (
                  <div key={commodity.symbol} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{commodity.name}</p>
                      <p className="text-xs text-muted-foreground">{commodity.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {commodity.price?.toLocaleString()}</p>
                      {commodity.change_percentage !== undefined && (
                        <p className={`text-xs ${commodity.change_percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {commodity.change_percentage >= 0 ? '+' : ''}{commodity.change_percentage?.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
