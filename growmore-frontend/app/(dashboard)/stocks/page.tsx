'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/skeletons';
import {
  Search,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Columns3,
  Sparkles,
  Download,
  X,
  ArrowUpDown,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StockQuote } from '@/types/market';
import { FilterModal, ScreenerFilters, defaultFilters, getActiveFiltersList, clearSingleFilter, buildScreenerFilters } from '@/components/stocks/filter-modal';
import { ColumnsModal, ColumnConfig, availableColumns } from '@/components/stocks/columns-modal';
import { StrategiesModal } from '@/components/stocks/strategies-modal';
import { StockDetailDrawer } from '@/components/stocks/stock-detail-drawer';
import { cn } from '@/lib/utils';

interface PaginationInfo {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isStrategiesModalOpen, setIsStrategiesModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);

  // Filter and column states
  const [filters, setFilters] = useState<ScreenerFilters>(defaultFilters);
  const [columns, setColumns] = useState<ColumnConfig[]>(availableColumns);

  // Sort state
  const [sortBy, setSortBy] = useState<string>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleColumns = columns.filter((col) => col.visible);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 400);
  };

  const fetchStocks = useCallback(async (page: number, size: number) => {
    try {
      setIsLoading(true);

      // Build backend filters from ScreenerFilters
      const backendFilters = buildScreenerFilters(filters);

      // Add sort
      backendFilters.sort = `${sortBy}_${sortOrder}`;

      // Add server-side search across all stocks
      if (debouncedSearch.trim()) {
        backendFilters.search = debouncedSearch.trim();
      }

      const offset = (page - 1) * size;

      const response = await api.post('/screener/run', {
        filters: backendFilters,
        limit: size,
        offset: offset,
      });

      const data = response.data;
      const stocksList = data?.stocks || [];
      const totalCount = data?.total_count || data?.count || 0;
      const totalPages = Math.max(1, Math.ceil(totalCount / size));

      setStocks(Array.isArray(stocksList) ? stocksList : []);

      setPagination({
        total: totalCount,
        page: page,
        page_size: size,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      });
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Error fetching stocks:', err);
      setError(err.response?.data?.detail || 'Failed to load stocks');
      setStocks([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy, sortOrder, debouncedSearch]);

  useEffect(() => {
    fetchStocks(1, pageSize);
  }, [fetchStocks, pageSize]);

  const processedStocks = stocks;

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (page: number) => {
    fetchStocks(page, pageSize);
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size));
  };

  const handleApplyFilters = (newFilters: ScreenerFilters) => {
    setFilters(newFilters);
  };

  const handleSelectStrategy = (strategyFilters: ScreenerFilters) => {
    setFilters(strategyFilters);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  const handleRemoveFilter = (key: string) => {
    setFilters(clearSingleFilter(filters, key));
  };

  const activeFiltersList = getActiveFiltersList(filters);

  const exportCSV = () => {
    const headers = visibleColumns.map((col) => col.label).join(',');
    const rows = processedStocks.map((stock) =>
      visibleColumns.map((col) => (stock as any)[col.key] ?? '').join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'psx-stocks.csv';
    a.click();
  };

  const formatValue = (key: string, value: any): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>;

    switch (key) {
      case 'current_price':
      case 'open_price':
      case 'high_price':
      case 'low_price':
      case 'previous_close':
      case 'week_52_high':
      case 'week_52_low':
        return <span className="font-mono">Rs. {parseFloat(String(value)).toFixed(2)}</span>;
      case 'market_cap':
        const cap = parseFloat(String(value));
        if (cap >= 10000000) return <span className="font-mono">{(cap / 10000000).toFixed(1)} Cr</span>;
        if (cap >= 100000) return <span className="font-mono">{(cap / 100000).toFixed(1)} L</span>;
        return <span className="font-mono">{cap.toLocaleString()}</span>;
      case 'volume':
      case 'avg_volume':
        return <span className="font-mono">{Number(value).toLocaleString()}</span>;
      case 'change_percentage':
      case 'dividend_yield':
      case 'roe':
      case 'roa':
        const pct = parseFloat(String(value));
        const isPositive = pct >= 0;
        return (
          <span className={cn('font-mono', isPositive ? 'text-green-600' : 'text-red-600')}>
            {isPositive ? '+' : ''}{pct.toFixed(2)}%
          </span>
        );
      case 'change_amount':
        const change = parseFloat(String(value));
        const isPos = change >= 0;
        return (
          <span className={cn('font-mono', isPos ? 'text-green-600' : 'text-red-600')}>
            {isPos ? '+' : ''}{change.toFixed(2)}
          </span>
        );
      case 'pe_ratio':
      case 'pb_ratio':
      case 'debt_to_equity':
        return <span className="font-mono">{parseFloat(String(value)).toFixed(2)}</span>;
      default:
        return <span>{String(value)}</span>;
    }
  };

  const activeFilterCount = activeFiltersList.length;

  if (error && !stocks.length) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Unable to load stocks"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">PSX Stocks</h1>
          <p className="text-sm text-muted-foreground">
            Pakistan Stock Exchange listed companies
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStrategiesModalOpen(true)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Strategies
            </Button>
            <Button
              variant={activeFilterCount > 0 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsFilterModalOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsColumnsModalOpen(true)}
            >
              <Columns3 className="h-4 w-4 mr-2" />
              Columns
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-sm">
            <span className="text-xs text-muted-foreground mr-1">Active:</span>
            {activeFiltersList.map((f) => (
              <Badge
                key={f.key}
                variant="secondary"
                className="text-xs gap-1 pr-1 cursor-pointer hover:bg-destructive/10"
              >
                <span className="font-medium">{f.label}:</span> {f.value}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveFilter(f.key); }}
                  className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-6 px-2 text-xs text-muted-foreground">
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={10} columns={6} />
          ) : (
            <>
              {/* Table with horizontal scroll */}
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {visibleColumns.map((col) => (
                        <TableHead
                          key={col.key}
                          className={cn(
                            'whitespace-nowrap cursor-pointer hover:bg-muted/80 transition-colors',
                            col.key === 'symbol' && 'sticky left-0 z-20 bg-muted/95 backdrop-blur-sm after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border',
                            col.key !== 'symbol' && col.key !== 'name' && col.key !== 'sector' && 'text-right'
                          )}
                          onClick={() => handleSort(col.key)}
                        >
                          <div className={cn(
                            'flex items-center gap-1',
                            col.key !== 'symbol' && col.key !== 'name' && col.key !== 'sector' && 'justify-end'
                          )}>
                            {col.label}
                            {sortBy === col.key && (
                              <ArrowUpDown className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedStocks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length} className="h-32 text-center">
                          <EmptyState
                            icon={Search}
                            title="No stocks found"
                            description="Try adjusting your search or filters"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      processedStocks.map((stock) => (
                        <TableRow
                          key={stock.id}
                          className="group cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedStock(stock);
                            setIsDetailDrawerOpen(true);
                          }}
                        >
                          {visibleColumns.map((col) => {
                            if (col.key === 'symbol') {
                              return (
                                <TableCell key={col.key} className="font-medium sticky left-0 z-20 bg-background group-hover:bg-muted/50 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border">
                                  <div className="flex items-center gap-2 hover:text-primary">
                                    <Avatar className="h-7 w-7">
                                      {stock.logo_url && <AvatarImage src={stock.logo_url} alt={stock.symbol} />}
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                        {stock.symbol?.slice(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-mono font-semibold">{stock.symbol}</span>
                                  </div>
                                </TableCell>
                              );
                            }
                            if (col.key === 'name') {
                              return (
                                <TableCell key={col.key} className="max-w-[200px]">
                                  <span className="truncate block text-sm">
                                    {stock.name || stock.company_name || '-'}
                                  </span>
                                </TableCell>
                              );
                            }
                            if (col.key === 'sector') {
                              return (
                                <TableCell key={col.key} className="max-w-[150px]">
                                  <span className="truncate block text-xs text-muted-foreground">
                                    {stock.sector_name || stock.sector || '-'}
                                  </span>
                                </TableCell>
                              );
                            }
                            return (
                              <TableCell key={col.key} className="text-right whitespace-nowrap">
                                {formatValue(col.key, (stock as any)[col.key])}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

              {/* Pagination */}
              {pagination && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Showing</span>
                    <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>
                      of {pagination.total} stocks
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!pagination.has_previous}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-sm font-medium">{currentPage}</span>
                      <span className="text-sm text-muted-foreground">/</span>
                      <span className="text-sm text-muted-foreground">{pagination.total_pages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!pagination.has_next}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(pagination.total_pages)}
                      disabled={currentPage === pagination.total_pages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />
      <ColumnsModal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columns={columns}
        onApply={setColumns}
      />
      <StrategiesModal
        isOpen={isStrategiesModalOpen}
        onClose={() => setIsStrategiesModalOpen(false)}
        onSelectStrategy={handleSelectStrategy}
      />
      <StockDetailDrawer
        stock={selectedStock}
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedStock(null);
        }}
      />
    </div>
  );
}
