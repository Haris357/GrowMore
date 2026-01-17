'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NewsPageSkeleton } from '@/components/common/skeletons';
import { Newspaper, Search, TrendingUp, TrendingDown, Minus, ExternalLink, Clock, Globe, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface NewsSource {
  id: string;
  name: string;
  website_url?: string;
  logo_url?: string;
  description?: string;
  is_active?: boolean;
}

interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  url: string;
  image_url?: string;
  source_name?: string;
  source?: NewsSource;
  author?: string;
  published_at?: string;
  sentiment_label?: 'positive' | 'negative' | 'neutral';
  sentiment_score?: number;
  categories?: string[];
  tags?: string[];
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<NewsArticle[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchNews();
    fetchSources();
  }, [selectedSentiment, selectedCategory]);

  const fetchSources = async () => {
    try {
      const response = await api.get('/news/sources');
      setSources(response.data || []);
    } catch (error) {
      console.error('Error fetching sources:', error);
      setSources([]);
    }
  };

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedSentiment !== 'all') params.append('sentiment', selectedSentiment);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const [articlesRes, trendingRes] = await Promise.all([
        api.get(`/news?${params.toString()}`),
        api.get('/news/trending'),
      ]);

      // Backend returns PaginatedResponse with 'items' key for main news, 'articles' for trending
      const articlesData = articlesRes.data?.items || articlesRes.data?.articles || articlesRes.data || [];
      const trendingData = trendingRes.data?.articles || trendingRes.data || [];
      setArticles(Array.isArray(articlesData) ? articlesData : []);
      setTrendingArticles(Array.isArray(trendingData) ? trendingData : []);
    } catch (error) {
      console.error('Error fetching news:', error);
      setArticles([]);
      setTrendingArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchNews();
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get(`/news/search?q=${encodeURIComponent(searchQuery)}`);
      // Backend returns PaginatedResponse with 'items' key
      const data = response.data?.items || response.data?.articles || response.data || [];
      setArticles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching news:', error);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Positive</Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Negative</Badge>;
      default:
        return <Badge variant="secondary">Neutral</Badge>;
    }
  };

  const getSourceName = (article: NewsArticle) => {
    return article.source_name || article.source?.name || 'Unknown';
  };

  const getSourceLogo = (article: NewsArticle) => {
    return article.source?.logo_url;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (isLoading) {
    return <NewsPageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Market News</h1>
        <p className="text-muted-foreground">
          Latest financial news with AI-powered sentiment analysis
        </p>
      </div>

      {/* Tabs for News/Sources */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All News</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-6">
          {/* Search & Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search news..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch}>Search</Button>
                </div>

                <div className="flex gap-2">
                  <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiment</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="stocks">Stocks</SelectItem>
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="banking">Banking</SelectItem>
                      <SelectItem value="commodities">Commodities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main News Feed */}
            <div className="lg:col-span-2 space-y-4">
              {/* Featured Article */}
              {articles.length > 0 && (
                <Card className="overflow-hidden">
                  <Link href={`/news/${articles[0].id}`} className="block">
                    {articles[0].image_url && (
                      <div className="h-48 bg-muted overflow-hidden">
                        <img
                          src={articles[0].image_url}
                          alt={articles[0].title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                  </Link>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      {getSentimentBadge(articles[0].sentiment_label)}
                      <span className="text-sm text-muted-foreground">
                        {getSourceName(articles[0])}
                      </span>
                    </div>
                    <CardTitle className="text-xl hover:text-primary transition-colors">
                      <Link href={`/news/${articles[0].id}`}>
                        {articles[0].title}
                      </Link>
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
                      <Link
                        href={`/news/${articles[0].id}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Read More <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Articles List */}
              <div className="space-y-4">
                {articles.slice(1).map((article) => (
                  <Card key={article.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        {article.image_url && (
                          <Link href={`/news/${article.id}`} className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                            <img
                              src={article.image_url}
                              alt={article.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          </Link>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getSentimentIcon(article.sentiment_label)}
                            <span className="text-xs text-muted-foreground">
                              {getSourceName(article)}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(article.published_at)}
                            </span>
                          </div>
                          <h3 className="font-semibold mb-1 line-clamp-2 hover:text-primary transition-colors">
                            <Link href={`/news/${article.id}`}>
                              {article.title}
                            </Link>
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {article.summary}
                          </p>
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {article.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {articles.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No news articles found</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Trending */}
            <div className="space-y-6">
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
                          <Link href={`/news/${article.id}`}>
                            {article.title}
                          </Link>
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {getSentimentIcon(article.sentiment_label)}
                          <span className="text-xs text-muted-foreground">
                            {getSourceName(article)}
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

              {/* Sentiment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Market Sentiment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Positive</span>
                      </div>
                      <span className="font-medium">
                        {articles.filter(a => a.sentiment_label === 'positive').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Minus className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Neutral</span>
                      </div>
                      <span className="font-medium">
                        {articles.filter(a => a.sentiment_label === 'neutral' || !a.sentiment_label).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Negative</span>
                      </div>
                      <span className="font-medium">
                        {articles.filter(a => a.sentiment_label === 'negative').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sources.length > 0 ? (
              sources.map((source) => (
                <Card key={source.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {source.logo_url ? (
                        <img
                          src={source.logo_url}
                          alt={source.name}
                          className="w-12 h-12 rounded-lg object-contain bg-muted p-1"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Globe className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{source.name}</h3>
                        {source.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {source.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {source.is_active !== false && (
                            <Badge variant="secondary" className="text-xs">Active</Badge>
                          )}
                          {source.website_url && (
                            <a
                              href={source.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              Visit <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full">
                <Card>
                  <CardContent className="py-12 text-center">
                    <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No news sources available</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
