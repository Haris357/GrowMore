'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PriceDisplay } from '@/components/common/price-display';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { EmptyState } from '@/components/common/empty-state';
import { Search, TrendingUp, ChevronDown, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { StockQuote } from '@/types/market';

interface PaginationInfo {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 100;

  const fetchStocks = useCallback(async (page: number, append: boolean = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const response = await api.get('/stocks', {
        params: {
          page,
          page_size: PAGE_SIZE,
        },
      });

      // Backend returns PaginatedResponse with 'items' key
      const data = response.data?.items || response.data?.stocks || response.data || [];
      const newStocks = Array.isArray(data) ? data : [];

      if (append) {
        setStocks(prev => [...prev, ...newStocks]);
      } else {
        setStocks(newStocks);
      }

      // Store pagination info
      setPagination({
        total: response.data?.total || 0,
        page: response.data?.page || page,
        page_size: response.data?.page_size || PAGE_SIZE,
        total_pages: response.data?.total_pages || 1,
        has_next: response.data?.has_next || false,
      });
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Error fetching stocks:', err);
      setError(err.response?.data?.detail || 'Failed to load stocks');
      if (!append) {
        setStocks([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks(1);
  }, [fetchStocks]);

  const handleLoadMore = () => {
    if (pagination?.has_next && !isLoadingMore) {
      fetchStocks(currentPage + 1, true);
    }
  };

  const filteredStocks = stocks.filter(stock =>
    (stock.symbol || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (stock.name || stock.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Unable to load stocks"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">PSX Stocks</h1>
        <p className="text-muted-foreground">
          Browse and track stocks from the Pakistan Stock Exchange
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stock List</CardTitle>
              <CardDescription>
                Showing {stocks.length} of {pagination?.total || stocks.length} stocks
              </CardDescription>
            </div>
            <div className="w-72">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by symbol or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Symbol</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Company</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Change</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Volume</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8">
                      <EmptyState
                        icon={Search}
                        title="No stocks found"
                        description="Try adjusting your search"
                      />
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((stock) => (
                    <tr key={stock.id} className="border-b last:border-0 hover:bg-muted/50 transition-smooth">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {stock.logo_url ? (
                              <AvatarImage src={stock.logo_url} alt={stock.symbol} />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {stock.symbol?.slice(0, 2) || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-mono font-semibold">{stock.symbol}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-sm">{stock.name || stock.company_name || '-'}</p>
                          <p className="text-xs text-muted-foreground">{stock.sector_name || stock.sector || ''}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono">Rs. {parseFloat(String(stock.current_price || 0)).toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <PriceDisplay
                          value={0}
                          currency=""
                          change={stock.change_amount ?? stock.change}
                          changePercent={stock.change_percentage ?? stock.change_percent}
                          size="sm"
                          showIcon={false}
                          className="justify-end"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-muted-foreground">
                          {stock.volume ? Number(stock.volume).toLocaleString() : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {pagination?.has_next && (
            <div className="flex justify-center pt-4 border-t mt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Load More Stocks ({pagination.total - stocks.length} remaining)
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
