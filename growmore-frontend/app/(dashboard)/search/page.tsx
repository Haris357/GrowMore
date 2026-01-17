'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockCardSkeleton, NewsCardSkeleton } from '@/components/common/skeletons';
import { EmptyState } from '@/components/common/empty-state';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Building2,
  Coins,
  Loader2,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface SearchResult {
  id: string;
  type: 'stock' | 'commodity' | 'bank' | 'news';
  symbol?: string;
  name?: string;
  title?: string;
  summary?: string;
  current_price?: number;
  code?: string;
  logo_url?: string;
  published_at?: string;
  similarity_score?: number;
  url?: string;
}

interface SearchResults {
  stocks: SearchResult[];
  commodities: SearchResult[];
  banks: SearchResult[];
  news: SearchResult[];
}

const typeColors: Record<string, string> = {
  stock: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  commodity: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  bank: 'bg-green-500/10 text-green-500 border-green-500/20',
  news: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('q', debouncedQuery);
      window.history.replaceState({}, '', url);
    } else {
      setResults(null);
      setSemanticResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const [globalRes, semanticRes] = await Promise.all([
        api.get('/search', {
          params: {
            q: searchQuery,
            include_stocks: true,
            include_commodities: true,
            include_banks: true,
            include_news: true,
            limit: 20,
          },
        }).catch(() => ({ data: null })),
        api.get('/search/semantic', {
          params: {
            q: searchQuery,
            limit: 10,
            threshold: 0.6,
          },
        }).catch(() => ({ data: [] })),
      ]);

      setResults(globalRes.data);
      setSemanticResults(Array.isArray(semanticRes.data) ? semanticRes.data : []);
    } catch (error) {
      console.error('Search error:', error);
      setResults(null);
      setSemanticResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getLink = (result: SearchResult): string => {
    switch (result.type) {
      case 'stock':
        return `/stocks/${result.symbol || result.id}`;
      case 'commodity':
        return `/commodities?id=${result.id}`;
      case 'bank':
        return `/bank-products?bank=${result.id}`;
      case 'news':
        return `/news/${result.id}`;
      default:
        return '#';
    }
  };

  const totalResults =
    (results?.stocks.length || 0) +
    (results?.commodities.length || 0) +
    (results?.banks.length || 0) +
    (results?.news.length || 0);

  const getFilteredResults = () => {
    if (!results) return [];

    switch (activeTab) {
      case 'stocks':
        return results.stocks;
      case 'commodities':
        return results.commodities;
      case 'banks':
        return results.banks;
      case 'news':
        return results.news;
      case 'ai':
        return semanticResults;
      default:
        return [
          ...results.stocks,
          ...results.commodities,
          ...results.banks,
          ...results.news,
        ];
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Search</h1>
        <p className="text-muted-foreground">
          Find stocks, commodities, banks, and news
        </p>
      </div>

      {/* Search Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for stocks, commodities, banks, or news..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {query.length >= 2 && (
        <div className="space-y-4">
          {/* Summary */}
          {!isLoading && results && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Found {totalResults} results</span>
              {semanticResults.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {semanticResults.length} AI matches
                </Badge>
              )}
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">
                All ({totalResults})
              </TabsTrigger>
              <TabsTrigger value="stocks">
                Stocks ({results?.stocks.length || 0})
              </TabsTrigger>
              <TabsTrigger value="commodities">
                Commodities ({results?.commodities.length || 0})
              </TabsTrigger>
              <TabsTrigger value="banks">
                Banks ({results?.banks.length || 0})
              </TabsTrigger>
              <TabsTrigger value="news">
                News ({results?.news.length || 0})
              </TabsTrigger>
              {semanticResults.length > 0 && (
                <TabsTrigger value="ai" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI ({semanticResults.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <StockCardSkeleton key={i} />
                  ))}
                </div>
              ) : getFilteredResults().length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No Results"
                  description={`No ${activeTab === 'all' ? 'results' : activeTab} found for "${query}"`}
                />
              ) : (
                <div className="space-y-3">
                  {activeTab === 'all' && (
                    <>
                      {/* Stocks Section */}
                      {results?.stocks && results.stocks.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Stocks
                          </h3>
                          <div className="grid gap-2 md:grid-cols-2">
                            {results.stocks.slice(0, 4).map((stock) => (
                              <Link key={stock.id} href={getLink(stock)}>
                                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={cn('p-2 rounded-lg', typeColors.stock)}>
                                        <TrendingUp className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="font-bold">{stock.symbol}</p>
                                        <p className="text-sm text-muted-foreground">{stock.name}</p>
                                      </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </CardContent>
                                </Card>
                              </Link>
                            ))}
                          </div>
                          {results.stocks.length > 4 && (
                            <Button variant="ghost" size="sm" onClick={() => setActiveTab('stocks')}>
                              View all {results.stocks.length} stocks
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Commodities Section */}
                      {results?.commodities && results.commodities.length > 0 && (
                        <div className="space-y-2 mt-6">
                          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            Commodities
                          </h3>
                          <div className="grid gap-2 md:grid-cols-2">
                            {results.commodities.slice(0, 4).map((commodity) => (
                              <Link key={commodity.id} href={getLink(commodity)}>
                                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={cn('p-2 rounded-lg', typeColors.commodity)}>
                                        <Coins className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{commodity.name}</p>
                                        {commodity.current_price && (
                                          <p className="text-sm text-muted-foreground">
                                            Rs. {commodity.current_price.toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </CardContent>
                                </Card>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Banks Section */}
                      {results?.banks && results.banks.length > 0 && (
                        <div className="space-y-2 mt-6">
                          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Banks
                          </h3>
                          <div className="grid gap-2 md:grid-cols-2">
                            {results.banks.slice(0, 4).map((bank) => (
                              <Link key={bank.id} href={getLink(bank)}>
                                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={cn('p-2 rounded-lg', typeColors.bank)}>
                                        <Building2 className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="font-bold">{bank.code}</p>
                                        <p className="text-sm text-muted-foreground">{bank.name}</p>
                                      </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </CardContent>
                                </Card>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* News Section */}
                      {results?.news && results.news.length > 0 && (
                        <div className="space-y-2 mt-6">
                          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Newspaper className="h-4 w-4" />
                            News
                          </h3>
                          <div className="space-y-2">
                            {results.news.slice(0, 4).map((article) => (
                              <Link key={article.id} href={getLink(article)}>
                                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div className={cn('p-2 rounded-lg', typeColors.news)}>
                                        <Newspaper className="h-4 w-4" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium line-clamp-1">{article.title}</p>
                                        {article.summary && (
                                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                            {article.summary}
                                          </p>
                                        )}
                                        {article.published_at && (
                                          <p className="text-xs text-muted-foreground mt-2">
                                            {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            ))}
                          </div>
                          {results.news.length > 4 && (
                            <Button variant="ghost" size="sm" onClick={() => setActiveTab('news')}>
                              View all {results.news.length} articles
                            </Button>
                          )}
                        </div>
                      )}

                      {/* AI Results Section */}
                      {semanticResults.length > 0 && (
                        <div className="space-y-2 mt-6">
                          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            AI-Powered Results
                          </h3>
                          <div className="space-y-2">
                            {semanticResults.slice(0, 3).map((result) => (
                              <Link key={result.id} href={getLink(result)}>
                                <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-purple-500/20">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium line-clamp-1">{result.title}</p>
                                          {result.similarity_score && (
                                            <Badge variant="secondary" className="text-xs">
                                              {Math.round(result.similarity_score * 100)}% match
                                            </Badge>
                                          )}
                                        </div>
                                        {result.summary && (
                                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                            {result.summary}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            ))}
                          </div>
                          {semanticResults.length > 3 && (
                            <Button variant="ghost" size="sm" onClick={() => setActiveTab('ai')}>
                              View all {semanticResults.length} AI results
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Individual Tab Contents */}
                  {activeTab !== 'all' && (
                    <div className="space-y-2">
                      {getFilteredResults().map((result) => (
                        <Link key={result.id} href={getLink(result)}>
                          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  'p-2 rounded-lg',
                                  activeTab === 'ai'
                                    ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10'
                                    : typeColors[result.type]
                                )}>
                                  {activeTab === 'stocks' && <TrendingUp className="h-4 w-4" />}
                                  {activeTab === 'commodities' && <Coins className="h-4 w-4" />}
                                  {activeTab === 'banks' && <Building2 className="h-4 w-4" />}
                                  {activeTab === 'news' && <Newspaper className="h-4 w-4" />}
                                  {activeTab === 'ai' && <Sparkles className="h-4 w-4 text-purple-500" />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {result.symbol && <span className="font-bold">{result.symbol}</span>}
                                    {result.code && <span className="font-bold">{result.code}</span>}
                                    <span className={result.symbol || result.code ? 'text-muted-foreground' : 'font-medium'}>
                                      {result.name || result.title}
                                    </span>
                                    {result.similarity_score && (
                                      <Badge variant="secondary" className="text-xs">
                                        {Math.round(result.similarity_score * 100)}% match
                                      </Badge>
                                    )}
                                  </div>
                                  {result.summary && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                      {result.summary}
                                    </p>
                                  )}
                                  {result.current_price && (
                                    <p className="text-sm font-medium mt-1">
                                      Rs. {result.current_price.toLocaleString()}
                                    </p>
                                  )}
                                  {result.published_at && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {formatDistanceToNow(new Date(result.published_at), { addSuffix: true })}
                                    </p>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty State */}
      {query.length < 2 && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Search}
              title="Start Searching"
              description="Enter at least 2 characters to search for stocks, commodities, banks, and news"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
