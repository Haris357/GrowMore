'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/common/loading-spinner';
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
  preferred_sectors: string[];
  risk_score?: number;
}

export function RecommendationsWidget({ compact = false }: { compact?: boolean }) {
  const [stocks, setStocks] = useState<RecommendedStock[]>([]);
  const [strategy, setStrategy] = useState<RecommendedStrategy | null>(null);
  const [news, setNews] = useState<PersonalizedNews[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('stocks');

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const [profileRes, stocksRes, strategyRes, newsRes] = await Promise.all([
        api.get('/personalization/profile').catch(() => ({ data: { profile: null } })),
        api.get('/personalization/recommendations/stocks', { params: { limit: compact ? 5 : 10 } }).catch(() => ({ data: { recommendations: [] } })),
        api.get('/personalization/recommendations/strategy').catch(() => ({ data: { strategy: null } })),
        api.get('/personalization/recommendations/news', { params: { limit: compact ? 5 : 10 } }).catch(() => ({ data: { news: [] } })),
      ]);

      setProfile(profileRes.data?.profile);
      setStocks(stocksRes.data?.recommendations || []);
      setStrategy(strategyRes.data?.strategy);
      setNews(newsRes.data?.news || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchRecommendations();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Personalized Recommendations
          </CardTitle>
          <CardDescription>
            Complete your profile to get personalized investment recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Lightbulb}
            title="Profile Not Set Up"
            description="Take our risk assessment quiz to get recommendations tailored to your investment style"
            action={
              <Button asChild>
                <Link href="/onboarding">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              For You
            </CardTitle>
            <CardDescription>
              Based on your {profile.risk_profile} profile
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {stocks.slice(0, 3).map((stock) => (
            <Link key={stock.id} href={`/stocks/${stock.symbol}`}>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-primary/10">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{stock.symbol}</p>
                    <p className="text-xs text-muted-foreground">{stock.sector}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">Rs. {stock.current_price?.toLocaleString()}</p>
                  {stock.change_percentage !== undefined && (
                    <p className={cn(
                      'text-xs',
                      stock.change_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {stock.change_percentage >= 0 ? '+' : ''}{stock.change_percentage.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/recommendations">
              View All Recommendations
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Personalized Recommendations
          </CardTitle>
          <CardDescription>
            Tailored for your {profile.risk_profile} risk profile
            {profile.risk_score && ` (Score: ${profile.risk_score})`}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stocks" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Stocks
            </TabsTrigger>
            <TabsTrigger value="strategy" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Strategy
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              News
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stocks" className="mt-4 space-y-3">
            {stocks.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No Recommendations"
                description="We're analyzing your preferences to find suitable stocks"
              />
            ) : (
              <>
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
                        <p className="text-xs text-muted-foreground">{stock.sector}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="strategy" className="mt-4">
            {!strategy ? (
              <EmptyState
                icon={PieChart}
                title="No Strategy Found"
                description="Complete your profile to get a recommended investment strategy"
              />
            ) : (
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{strategy.name}</h3>
                    <p className="text-muted-foreground mt-1">{strategy.description}</p>
                    <div className="mt-4">
                      <Button asChild>
                        <Link href={`/screener?strategy=${strategy.slug}`}>
                          Apply This Strategy
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="news" className="mt-4 space-y-3">
            {news.length === 0 ? (
              <EmptyState
                icon={Newspaper}
                title="No Personalized News"
                description="News will be curated based on your interests"
              />
            ) : (
              <>
                {news.map((article) => (
                  <Link key={article.id} href={`/news/${article.id}`}>
                    <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Newspaper className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium line-clamp-2">{article.title}</p>
                            {article.relevance_score && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {Math.round(article.relevance_score * 100)}% relevant
                              </Badge>
                            )}
                          </div>
                          {article.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {article.summary}
                            </p>
                          )}
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
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Standalone page component
export function RecommendationsPage() {
  return <RecommendationsWidget compact={false} />;
}
