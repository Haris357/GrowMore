'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CardSkeleton, StatCardSkeleton } from '@/components/common/skeletons';
import { EmptyState } from '@/components/common/empty-state';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Target,
  ArrowRight,
  RefreshCw,
  Loader2,
  ChevronRight,
  Lightbulb,
  PieChart,
  Shield,
  Zap,
  BarChart3,
  User,
  Settings,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface RecommendedStock {
  id: string;
  symbol: string;
  name: string;
  sector?: string;
  current_price: number;
  change_percentage?: number;
  recommendation_reason?: string;
  match_score?: number;
}

interface RecommendedStrategy {
  slug: string;
  name: string;
  description: string;
  filters?: Record<string, any>;
}

interface PersonalizedNews {
  id: string;
  title: string;
  summary?: string;
  source?: string;
  published_at?: string;
  relevance_score?: number;
}

interface UserProfile {
  risk_profile: string;
  experience_level: string;
  investment_horizon: string;
  preferred_sectors: string[];
  preferred_asset_types: string[];
  monthly_investment_capacity?: number;
  financial_goals: string[];
  risk_score?: number;
}

interface AnalyticsSummary {
  market_overview?: {
    total_stocks: number;
    advancing: number;
    declining: number;
    unchanged: number;
    market_cap: number;
    total_volume: number;
  };
  portfolio_summary?: {
    total_value: number;
    total_invested: number;
    total_gain_loss: number;
    gain_loss_percentage: number;
    holdings_count: number;
    best_performer?: { symbol: string; gain_percentage: number };
    worst_performer?: { symbol: string; loss_percentage: number };
  };
}

const riskProfileInfo: Record<string, { color: string; icon: typeof Shield; description: string }> = {
  conservative: {
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: Shield,
    description: 'Focus on capital preservation with steady returns',
  },
  moderate: {
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    icon: BarChart3,
    description: 'Balance between growth and stability',
  },
  aggressive: {
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    icon: Zap,
    description: 'Maximum growth potential with higher volatility',
  },
};

export default function RecommendationsPage() {
  const [stocks, setStocks] = useState<RecommendedStock[]>([]);
  const [strategy, setStrategy] = useState<RecommendedStrategy | null>(null);
  const [news, setNews] = useState<PersonalizedNews[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [profileRes, stocksRes, strategyRes, newsRes, analyticsRes] = await Promise.all([
        api.get('/personalization/profile').catch(() => ({ data: { profile: null } })),
        api.get('/personalization/recommendations/stocks', { params: { limit: 20 } }).catch(() => ({ data: { recommendations: [] } })),
        api.get('/personalization/recommendations/strategy').catch(() => ({ data: { strategy: null } })),
        api.get('/personalization/recommendations/news', { params: { limit: 20 } }).catch(() => ({ data: { news: [] } })),
        api.get('/analytics/portfolio-summary').catch(() => ({ data: null })),
      ]);

      setProfile(profileRes.data?.profile);
      setStocks(stocksRes.data?.recommendations || []);
      setStrategy(strategyRes.data?.strategy);
      setNews(newsRes.data?.news || []);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Personalized Recommendations</h1>
          <p className="text-muted-foreground">
            Get investment recommendations tailored to your profile
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-12">
            <EmptyState
              icon={Lightbulb}
              title="Set Up Your Profile"
              description="Complete our personalization questionnaire to receive AI-powered investment recommendations based on your risk tolerance, goals, and preferences."
              action={
                <Button size="lg" asChild>
                  <Link href="/onboarding">
                    Start Personalization
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const profileInfo = riskProfileInfo[profile.risk_profile] || riskProfileInfo.moderate;
  const ProfileIcon = profileInfo.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Personalized Recommendations</h1>
          <p className="text-muted-foreground">
            AI-powered suggestions based on your investment profile
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Update Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Profile Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={cn('border-2', profileInfo.color.replace('bg-', 'border-').replace('/10', '/30'))}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={cn('p-3 rounded-full', profileInfo.color)}>
                <ProfileIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Risk Profile</p>
                <p className="text-xl font-bold capitalize">{profile.risk_profile}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <User className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Experience</p>
                <p className="text-xl font-bold capitalize">{profile.experience_level?.replace('_', ' ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Target className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investment Horizon</p>
                <p className="text-xl font-bold capitalize">{profile.investment_horizon?.replace('_', ' ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Sparkles className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Risk Score</p>
                <p className="text-xl font-bold">{profile.risk_score || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Strategy */}
      {strategy && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Recommended Strategy
            </CardTitle>
            <CardDescription>
              Based on your {profile.risk_profile} profile, we recommend this investment approach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{strategy.name}</h3>
                <p className="text-muted-foreground">{strategy.description}</p>
              </div>
              <Button asChild>
                <Link href={`/screener?strategy=${strategy.slug}`}>
                  Apply Strategy
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recommended Stocks */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Recommended Stocks
              </CardTitle>
              <CardDescription>
                Stocks that match your risk profile and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stocks.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No Recommendations Yet"
                  description="We're analyzing market data to find stocks that match your profile"
                />
              ) : (
                <div className="space-y-3">
                  {stocks.map((stock) => (
                    <Link key={stock.id} href={`/stocks/${stock.symbol}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-lg',
                            stock.change_percentage && stock.change_percentage >= 0
                              ? 'bg-green-500/10'
                              : 'bg-red-500/10'
                          )}>
                            {stock.change_percentage && stock.change_percentage >= 0 ? (
                              <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold">{stock.symbol}</p>
                              {stock.match_score && (
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round(stock.match_score * 100)}% match
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{stock.name}</p>
                            {stock.recommendation_reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {stock.recommendation_reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Rs. {stock.current_price?.toLocaleString()}</p>
                          {stock.change_percentage !== undefined && (
                            <p className={cn(
                              'text-sm',
                              stock.change_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {stock.change_percentage >= 0 ? '+' : ''}{stock.change_percentage.toFixed(2)}%
                            </p>
                          )}
                          {stock.sector && (
                            <Badge variant="outline" className="text-xs mt-1">{stock.sector}</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Personalized News */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-purple-500" />
                For You
              </CardTitle>
              <CardDescription>
                News relevant to your interests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {news.length === 0 ? (
                <EmptyState
                  icon={Newspaper}
                  title="No News"
                  description="Personalized news will appear here"
                />
              ) : (
                <div className="space-y-3">
                  {news.slice(0, 5).map((article) => (
                    <Link key={article.id} href={`/news/${article.id}`}>
                      <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <p className="font-medium text-sm line-clamp-2">{article.title}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {article.source && <span>{article.source}</span>}
                          {article.published_at && (
                            <>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {news.length > 5 && (
                    <Button variant="ghost" className="w-full" asChild>
                      <Link href="/news">
                        View All News
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Preferences */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Your Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.preferred_sectors && profile.preferred_sectors.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Preferred Sectors</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.preferred_sectors.map((sector) => (
                      <Badge key={sector} variant="outline" className="text-xs">
                        {sector}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.financial_goals && profile.financial_goals.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Financial Goals</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.financial_goals.slice(0, 3).map((goal) => (
                      <Badge key={goal} variant="secondary" className="text-xs">
                        {goal}
                      </Badge>
                    ))}
                    {profile.financial_goals.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{profile.financial_goals.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {profile.monthly_investment_capacity && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Monthly Investment</p>
                  <p className="font-medium">Rs. {profile.monthly_investment_capacity.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
