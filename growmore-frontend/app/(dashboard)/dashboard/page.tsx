'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/stat-card';
import { PriceDisplay } from '@/components/common/price-display';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { EmptyState } from '@/components/common/empty-state';
import { TrendingUp, TrendingDown, Wallet, Target, Activity, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<DashboardData>('/dashboard/summary');
        setData(response.data);
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
    return <LoadingSpinner size="lg" />;
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your investments.
        </p>
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
            <div className="flex items-center justify-between">
              <span className="text-sm">Unread Notifications</span>
              <span className="font-medium">{notifications?.unread_count || 0}</span>
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
    </div>
  );
}
