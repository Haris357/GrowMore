'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Newspaper, Search, TrendingUp, TrendingDown, Minus, ExternalLink, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  url: string;
  image_url?: string;
  source_name?: string;
  source?: { name?: string };
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchNews();
  }, [selectedSentiment, selectedCategory]);

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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Market News</h1>
        <p className="text-muted-foreground">
          Latest financial news with AI-powered sentiment analysis
        </p>
      </div>

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
              {articles[0].image_url && (
                <div className="h-48 bg-muted overflow-hidden">
                  <img
                    src={articles[0].image_url}
                    alt={articles[0].title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {getSentimentBadge(articles[0].sentiment_label)}
                  <span className="text-sm text-muted-foreground">
                    {getSourceName(articles[0])}
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
                  <a
                    href={articles[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Read More <ExternalLink className="h-4 w-4" />
                  </a>
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
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
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
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                          {article.title}
                        </a>
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
                      <a href={article.url} target="_blank" rel="noopener noreferrer">
                        {article.title}
                      </a>
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
    </div>
  );
}
