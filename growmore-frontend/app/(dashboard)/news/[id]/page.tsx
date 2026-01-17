'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NewsDetailSkeleton } from '@/components/common/skeletons';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  Newspaper,
  Share2,
  Bookmark,
} from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';

interface NewsSource {
  id: string;
  name: string;
  website_url?: string;
  logo_url?: string;
  description?: string;
}

interface NewsArticleDetail {
  id: string;
  source_id: string;
  source?: NewsSource;
  market_id?: string;
  title: string;
  slug?: string;
  content?: string;
  summary?: string;
  url: string;
  image_url?: string;
  author?: string;
  published_at?: string;
  scraped_at?: string;
  sentiment_score?: number;
  sentiment_label?: 'positive' | 'negative' | 'neutral';
  impact_score?: number;
  categories?: string[];
  tags?: string[];
  is_processed?: boolean;
  created_at?: string;
}

interface RelatedArticle {
  id: string;
  title: string;
  summary?: string;
  url: string;
  image_url?: string;
  source_name?: string;
  source?: { name?: string };
  published_at?: string;
  sentiment_label?: string;
}

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<NewsArticleDetail | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchArticle(params.id as string);
    }
  }, [params.id]);

  const fetchArticle = async (articleId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const [articleRes, relatedRes] = await Promise.all([
        api.get(`/news/${articleId}`),
        api.get(`/news?page_size=5`).catch(() => ({ data: { items: [] } })),
      ]);

      setArticle(articleRes.data);

      // Filter out current article from related
      const related = (relatedRes.data?.items || [])
        .filter((a: RelatedArticle) => a.id !== articleId)
        .slice(0, 4);
      setRelatedArticles(related);
    } catch (err: any) {
      console.error('Error fetching article:', err);
      setError(err.response?.data?.detail || 'Failed to load article');
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Positive Sentiment</Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Negative Sentiment</Badge>;
      default:
        return <Badge variant="secondary">Neutral Sentiment</Badge>;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown date';
    try {
      return format(new Date(dateStr), 'MMMM d, yyyy h:mm a');
    } catch {
      return 'Unknown date';
    }
  };

  const getSourceName = (article: RelatedArticle) => {
    return article.source_name || article.source?.name || 'Unknown Source';
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article?.title,
        text: article?.summary,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return <NewsDetailSkeleton />;
  }

  if (error || !article) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to News
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Article not found</p>
            <p className="text-muted-foreground">{error || 'The article you are looking for does not exist.'}</p>
            <Button className="mt-4" onClick={() => router.push('/news')}>
              Browse All News
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to News
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Article */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            {article.image_url && (
              <div className="w-full h-64 md:h-80 overflow-hidden rounded-t-lg">
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {getSentimentBadge(article.sentiment_label)}
                {article.categories?.map((category, index) => (
                  <Badge key={index} variant="outline">
                    {category}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <CardTitle className="text-2xl md:text-3xl leading-tight">
                {article.title}
              </CardTitle>

              {/* Author & Date */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
                {article.author && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{article.author}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(article.published_at)}</span>
                </div>
                {article.source && (
                  <div className="flex items-center gap-1">
                    <Newspaper className="h-4 w-4" />
                    <span>{article.source.name}</span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Summary */}
              {article.summary && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-muted-foreground italic">{article.summary}</p>
                </div>
              )}

              {/* Content */}
              {article.content ? (
                <div className="prose dark:prose-invert max-w-none">
                  {article.content.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="mb-4 leading-relaxed">
                        {paragraph}
                      </p>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Full article content is available at the source.
                  </p>
                  <Button asChild>
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      Read Full Article <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}

              <Separator />

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Related Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button asChild>
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    Read at Source <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sentiment Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {getSentimentIcon(article.sentiment_label)}
                <div>
                  <p className="font-medium capitalize">{article.sentiment_label || 'Neutral'}</p>
                  {article.sentiment_score !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      Score: {(article.sentiment_score * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>

              {article.impact_score !== undefined && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-1">Market Impact</p>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${article.impact_score * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(article.impact_score * 100).toFixed(0)}% impact probability
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Source Info */}
          {article.source && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  {article.source.logo_url && (
                    <img
                      src={article.source.logo_url}
                      alt={article.source.name}
                      className="w-10 h-10 rounded-lg object-contain bg-muted p-1"
                    />
                  )}
                  <div>
                    <p className="font-medium">{article.source.name}</p>
                    {article.source.website_url && (
                      <a
                        href={article.source.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
                {article.source.description && (
                  <p className="text-sm text-muted-foreground">
                    {article.source.description}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related News</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/news/${related.id}`}
                    className="block group"
                  >
                    <div className="flex gap-3">
                      {related.image_url && (
                        <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
                          <img
                            src={related.image_url}
                            alt={related.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {related.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getSourceName(related)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
