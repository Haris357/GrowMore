'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { StatCardSkeleton, CardSkeleton } from '@/components/common/skeletons';
import {
  TrendingUp, TrendingDown, Minus, ExternalLink, Clock,
  Globe, Sparkles, RefreshCw, Search, Newspaper,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Lightbulb,
  LineChart, Coins, Bitcoin, BarChart3,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import type { NewsArticle, MarketBrief, MarketBriefSection } from '@/types/news';

type NewsCategory = 'all' | 'stocks' | 'commodities' | 'crypto' | 'global';

const CATEGORIES: { value: NewsCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All News', icon: <Globe className="h-4 w-4" /> },
  { value: 'stocks', label: 'Stocks', icon: <LineChart className="h-4 w-4" /> },
  { value: 'commodities', label: 'Gold & Silver', icon: <Coins className="h-4 w-4" /> },
  { value: 'crypto', label: 'Crypto', icon: <Bitcoin className="h-4 w-4" /> },
  { value: 'global', label: 'Global', icon: <BarChart3 className="h-4 w-4" /> },
];

function formatDate(dateStr?: string) {
  if (!dateStr) return 'Recently';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return 'Recently';
  }
}

function getSentimentIcon(sentiment?: string) {
  switch (sentiment) {
    case 'positive': return <TrendingUp className="h-4 w-4 text-gain" />;
    case 'negative': return <TrendingDown className="h-4 w-4 text-loss" />;
    default: return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function getSentimentBadge(sentiment?: string) {
  switch (sentiment) {
    case 'positive':
      return <Badge variant="secondary" className="text-gain bg-[hsl(var(--gain)/0.1)]">Bullish</Badge>;
    case 'negative':
      return <Badge variant="secondary" className="text-loss bg-[hsl(var(--loss)/0.1)]">Bearish</Badge>;
    default:
      return <Badge variant="secondary">Neutral</Badge>;
  }
}

function getImpactLevel(score?: number) {
  if (!score) return null;
  const s = Number(score);
  if (s >= 7) return <Badge variant="outline" className="text-loss">High Impact</Badge>;
  if (s >= 4) return <Badge variant="outline" className="text-[hsl(var(--warning))]">Medium</Badge>;
  return null;
}

function getMoodLabel(mood: string) {
  switch (mood) {
    case 'bullish': return { text: 'Bullish', className: 'text-gain' };
    case 'bearish': return { text: 'Bearish', className: 'text-loss' };
    case 'mixed': return { text: 'Mixed', className: 'text-[hsl(var(--warning))]' };
    default: return { text: 'Neutral', className: 'text-muted-foreground' };
  }
}

function getSectionIcon(category: string) {
  switch (category) {
    case 'stocks': return <LineChart className="h-4 w-4" />;
    case 'commodities': return <Coins className="h-4 w-4" />;
    case 'crypto': return <Bitcoin className="h-4 w-4" />;
    case 'global': return <Globe className="h-4 w-4" />;
    default: return <BarChart3 className="h-4 w-4" />;
  }
}

export default function GrowNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<NewsArticle[]>([]);
  const [brief, setBrief] = useState<MarketBrief | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBriefLoading, setIsBriefLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [activeCategory, setActiveCategory] = useState<NewsCategory>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBrief = useCallback(async () => {
    try {
      setIsBriefLoading(true);
      const cat = activeCategory !== 'all' ? activeCategory : undefined;
      const res = await api.get('/news/brief', { params: { category: cat } });
      setBrief(res.data);
    } catch (error) {
      console.error('Error fetching brief:', error);
    } finally {
      setIsBriefLoading(false);
    }
  }, [activeCategory]);

  const fetchNews = useCallback(async (pageNum = 1) => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = { page: String(pageNum), page_size: '20' };
      if (selectedSentiment !== 'all') params.sentiment = selectedSentiment;
      if (activeCategory !== 'all') params.category = activeCategory;

      const [articlesRes, trendingRes] = await Promise.all([
        api.get('/news', { params }),
        pageNum === 1 ? api.get('/news/trending') : Promise.resolve(null),
      ]);

      const data = articlesRes.data;
      const items = data?.items || data?.articles || data || [];
      setArticles(Array.isArray(items) ? items : []);
      setTotalPages(data?.total_pages || 1);
      setPage(pageNum);

      if (trendingRes) {
        const trending = trendingRes.data?.articles || trendingRes.data || [];
        setTrendingArticles(Array.isArray(trending) ? trending : []);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSentiment, activeCategory]);

  useEffect(() => {
    fetchNews(1);
    fetchBrief();
  }, [fetchNews, fetchBrief]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) { fetchNews(1); return; }
    try {
      setIsLoading(true);
      const res = await api.get('/news/search', { params: { q: searchQuery } });
      const data = res.data?.items || res.data?.articles || res.data || [];
      setArticles(Array.isArray(data) ? data : []);
      setTotalPages(1);
    } catch { setArticles([]); }
    finally { setIsLoading(false); }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.post('/news/aggregate');
      setTimeout(() => { fetchNews(1); fetchBrief(); setIsRefreshing(false); }, 3000);
    } catch {
      setIsRefreshing(false);
    }
  };

  const sentimentCounts = {
    positive: articles.filter(a => a.sentiment_label === 'positive').length,
    neutral: articles.filter(a => !a.sentiment_label || a.sentiment_label === 'neutral').length,
    negative: articles.filter(a => a.sentiment_label === 'negative').length,
  };

  if (isLoading && isBriefLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <CardSkeleton />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const mood = brief ? getMoodLabel(brief.mood) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GrowNews Network</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered financial intelligence across markets
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* AI Market Brief */}
      {isBriefLoading ? (
        <CardSkeleton />
      ) : brief && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI Market Brief</CardTitle>
                <Badge variant="secondary" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" /> AI
                </Badge>
              </div>
              {mood && (
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize bg-muted ${mood.className}`}>
                  {brief.mood === 'bullish' && <TrendingUp className="h-3 w-3 inline mr-1" />}
                  {brief.mood === 'bearish' && <TrendingDown className="h-3 w-3 inline mr-1" />}
                  {mood.text} {brief.mood_score != null && `(${brief.mood_score}/100)`}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Headline + Summary */}
            <div>
              <p className="font-semibold text-lg mb-1">{brief.headline}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{brief.summary}</p>
            </div>

            {/* Section Cards */}
            {brief.sections && brief.sections.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {brief.sections.map((section, i) => {
                  const sectionMood = getMoodLabel(section.sentiment === 'positive' ? 'bullish' : section.sentiment === 'negative' ? 'bearish' : 'neutral');
                  return (
                    <div key={i} className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-muted-foreground">{getSectionIcon(section.category)}</span>
                        <span className="font-medium text-sm">{section.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{section.insight}</p>
                      {section.key_events && section.key_events.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {section.key_events.slice(0, 2).map((e, j) => (
                            <Badge key={j} variant="outline" className="text-[10px] py-0 font-normal">
                              {e.length > 30 ? e.slice(0, 30) + '...' : e}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Risks & Opportunities */}
            {(brief.risks?.length > 0 || brief.opportunities?.length > 0) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {brief.risks && brief.risks.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-loss mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-loss">Risks: </span>
                        <span className="text-muted-foreground">{brief.risks.join(' | ')}</span>
                      </div>
                    </div>
                  )}
                  {brief.opportunities && brief.opportunities.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-gain mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-gain">Opportunities: </span>
                        <span className="text-muted-foreground">{brief.opportunities.join(' | ')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {brief.generated_at && (
              <p className="text-xs text-muted-foreground">
                Generated {formatDate(brief.generated_at)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Tabs + Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as NewsCategory)}>
          <TabsList>
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="gap-1.5">
                {cat.icon}
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex gap-2 flex-1 justify-end">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="positive">Bullish</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Bearish</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* News Feed */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              {/* Featured Article */}
              {articles.length > 0 && (
                <Card className="overflow-hidden">
                  {articles[0].image_url && (
                    <a href={articles[0].url} target="_blank" rel="noopener noreferrer">
                      <div className="h-48 bg-muted overflow-hidden">
                        <img
                          src={articles[0].image_url}
                          alt={articles[0].title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </a>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      {getSentimentBadge(articles[0].sentiment_label)}
                      {getImpactLevel(articles[0].impact_score)}
                      <span className="text-sm text-muted-foreground">
                        {articles[0].source?.name || articles[0].author}
                      </span>
                    </div>
                    <CardTitle className="text-xl hover:text-primary transition-colors">
                      <a href={articles[0].url} target="_blank" rel="noopener noreferrer">
                        {articles[0].title}
                      </a>
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {articles[0].summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(articles[0].published_at)}
                      </div>
                      <div className="flex gap-1">
                        {articles[0].tags?.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Article List */}
              {articles.slice(1).map((article) => (
                <Card key={article.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      {article.image_url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted"
                        >
                          <img
                            src={article.image_url}
                            alt={article.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </a>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getSentimentIcon(article.sentiment_label)}
                          <span className="text-xs text-muted-foreground">
                            {article.source?.name || article.author || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(article.published_at)}
                          </span>
                          {getImpactLevel(article.impact_score)}
                        </div>
                        <h3 className="font-semibold mb-1 line-clamp-2 hover:text-primary transition-colors">
                          <a href={article.url} target="_blank" rel="noopener noreferrer">
                            {article.title}
                          </a>
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {article.summary}
                        </p>
                        {article.tags && article.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {article.tags.slice(0, 3).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Empty State */}
              {articles.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No news articles found</p>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Fetch Latest News
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={page <= 1}
                    onClick={() => fetchNews(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline" size="sm"
                    disabled={page >= totalPages}
                    onClick={() => fetchNews(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Market Sentiment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gain" />
                    <span className="text-sm">Bullish</span>
                  </div>
                  <span className="font-medium">{sentimentCounts.positive}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Neutral</span>
                  </div>
                  <span className="font-medium">{sentimentCounts.neutral}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-loss" />
                    <span className="text-sm">Bearish</span>
                  </div>
                  <span className="font-medium">{sentimentCounts.negative}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trending */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trending Now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trendingArticles.slice(0, 5).map((article, index) => (
                <div key={article.id} className="flex gap-3">
                  <span className="text-2xl font-bold text-muted-foreground/50">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors">
                      <a href={article.url} target="_blank" rel="noopener noreferrer">
                        {article.title}
                      </a>
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {getSentimentIcon(article.sentiment_label)}
                      <span className="text-xs text-muted-foreground">
                        {article.source?.name || article.author}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {trendingArticles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No trending articles
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sources</CardTitle>
              <CardDescription>12+ financial news sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Reuters', 'CNBC', 'Bloomberg', 'CoinDesk', 'CoinTelegraph',
                  'Business Recorder', 'Dawn', 'Kitco', 'Decrypt',
                ].map((source) => (
                  <Badge key={source} variant="outline" className="text-xs font-normal">
                    {source}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
