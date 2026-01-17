'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  TrendingUp,
  Newspaper,
  Building2,
  Coins,
  Loader2,
  History,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks';
import { cn } from '@/lib/utils';

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
}

interface SearchResults {
  stocks: SearchResult[];
  commodities: SearchResult[];
  banks: SearchResult[];
  news: SearchResult[];
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  stock: TrendingUp,
  commodity: Coins,
  bank: Building2,
  news: Newspaper,
};

const typeColors: Record<string, string> = {
  stock: 'bg-blue-500/10 text-blue-500',
  commodity: 'bg-yellow-500/10 text-yellow-500',
  bank: 'bg-green-500/10 text-green-500',
  news: 'bg-purple-500/10 text-purple-500',
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();

  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      setSemanticResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        // Run both searches in parallel
        const [globalRes, semanticRes] = await Promise.all([
          api.get('/search', {
            params: {
              q: debouncedQuery,
              include_stocks: true,
              include_commodities: true,
              include_banks: true,
              include_news: true,
              limit: 5,
            },
          }).catch(() => ({ data: null })),
          api.get('/search/semantic', {
            params: {
              q: debouncedQuery,
              limit: 3,
              threshold: 0.7,
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

    search();
  }, [debouncedQuery]);

  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(result.name || result.title || result.symbol || '');
    setOpen(false);
    setQuery('');

    switch (result.type) {
      case 'stock':
        router.push(`/stocks/${result.symbol || result.id}`);
        break;
      case 'commodity':
        router.push(`/commodities?id=${result.id}`);
        break;
      case 'bank':
        router.push(`/bank-products?bank=${result.id}`);
        break;
      case 'news':
        router.push(`/news/${result.id}`);
        break;
    }
  };

  const handleRecentSearch = (searchTerm: string) => {
    setQuery(searchTerm);
  };

  const hasResults = results && (
    results.stocks.length > 0 ||
    results.commodities.length > 0 ||
    results.banks.length > 0 ||
    results.news.length > 0 ||
    semanticResults.length > 0
  );

  const totalResults =
    (results?.stocks.length || 0) +
    (results?.commodities.length || 0) +
    (results?.banks.length || 0) +
    (results?.news.length || 0);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search stocks, commodities, banks, news..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && !query && recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((search, index) => (
                <CommandItem
                  key={index}
                  onSelect={() => handleRecentSearch(search)}
                  className="cursor-pointer"
                >
                  <History className="mr-2 h-4 w-4 text-muted-foreground" />
                  {search}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!isLoading && query.length >= 2 && !hasResults && (
            <CommandEmpty>No results found for "{query}"</CommandEmpty>
          )}

          {!isLoading && hasResults && (
            <>
              {/* Stocks */}
              {results?.stocks && results.stocks.length > 0 && (
                <CommandGroup heading="Stocks">
                  {results.stocks.map((stock) => (
                    <CommandItem
                      key={stock.id}
                      onSelect={() => handleSelect(stock)}
                      className="cursor-pointer"
                    >
                      <div className={cn('p-1 rounded mr-2', typeColors.stock)}>
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div className="flex flex-1 items-center justify-between">
                        <div>
                          <span className="font-medium">{stock.symbol}</span>
                          <span className="ml-2 text-muted-foreground">{stock.name}</span>
                        </div>
                        <Badge variant="outline" className="ml-2">Stock</Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Commodities */}
              {results?.commodities && results.commodities.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Commodities">
                    {results.commodities.map((commodity) => (
                      <CommandItem
                        key={commodity.id}
                        onSelect={() => handleSelect(commodity)}
                        className="cursor-pointer"
                      >
                        <div className={cn('p-1 rounded mr-2', typeColors.commodity)}>
                          <Coins className="h-4 w-4" />
                        </div>
                        <div className="flex flex-1 items-center justify-between">
                          <span>{commodity.name}</span>
                          <div className="flex items-center gap-2">
                            {commodity.current_price && (
                              <span className="text-sm font-medium">
                                Rs. {commodity.current_price.toLocaleString()}
                              </span>
                            )}
                            <Badge variant="outline">Commodity</Badge>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Banks */}
              {results?.banks && results.banks.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Banks">
                    {results.banks.map((bank) => (
                      <CommandItem
                        key={bank.id}
                        onSelect={() => handleSelect(bank)}
                        className="cursor-pointer"
                      >
                        <div className={cn('p-1 rounded mr-2', typeColors.bank)}>
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="flex flex-1 items-center justify-between">
                          <div>
                            <span className="font-medium">{bank.code}</span>
                            <span className="ml-2 text-muted-foreground">{bank.name}</span>
                          </div>
                          <Badge variant="outline">Bank</Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* News */}
              {results?.news && results.news.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="News">
                    {results.news.map((article) => (
                      <CommandItem
                        key={article.id}
                        onSelect={() => handleSelect(article)}
                        className="cursor-pointer"
                      >
                        <div className={cn('p-1 rounded mr-2', typeColors.news)}>
                          <Newspaper className="h-4 w-4" />
                        </div>
                        <div className="flex flex-1 items-center justify-between">
                          <span className="line-clamp-1">{article.title}</span>
                          <Badge variant="outline">News</Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Semantic Search Results */}
              {semanticResults.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="AI-Powered Results">
                    {semanticResults.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        <div className="p-1 rounded mr-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="flex flex-1 items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <span className="line-clamp-1">{result.title}</span>
                            {result.similarity_score && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {Math.round(result.similarity_score * 100)}% match
                              </span>
                            )}
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* View All Results */}
              {totalResults > 5 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        saveRecentSearch(query);
                        router.push(`/search?q=${encodeURIComponent(query)}`);
                        setOpen(false);
                      }}
                      className="cursor-pointer justify-center"
                    >
                      <span className="text-muted-foreground">View all {totalResults} results</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

// Search Page Component for full results
export function SearchPage({ initialQuery }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const router = useRouter();

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      setSemanticResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const [globalRes, semanticRes] = await Promise.all([
          api.get('/search', {
            params: {
              q: debouncedQuery,
              include_stocks: true,
              include_commodities: true,
              include_banks: true,
              include_news: true,
              limit: 20,
            },
          }).catch(() => ({ data: null })),
          api.get('/search/semantic', {
            params: {
              q: debouncedQuery,
              limit: 10,
              threshold: 0.6,
            },
          }).catch(() => ({ data: [] })),
        ]);

        setResults(globalRes.data);
        setSemanticResults(Array.isArray(semanticRes.data) ? semanticRes.data : []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const handleNavigate = (result: SearchResult) => {
    switch (result.type) {
      case 'stock':
        router.push(`/stocks/${result.symbol || result.id}`);
        break;
      case 'commodity':
        router.push(`/commodities?id=${result.id}`);
        break;
      case 'bank':
        router.push(`/bank-products?bank=${result.id}`);
        break;
      case 'news':
        router.push(`/news/${result.id}`);
        break;
    }
  };

  return {
    query,
    setQuery,
    isLoading,
    results,
    semanticResults,
    handleNavigate,
  };
}
