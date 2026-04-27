'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp, TrendingDown, Search, RefreshCw, Globe,
  Flame, BarChart2, Newspaper, ChevronUp, ChevronDown,
  ExternalLink, Bitcoin, ChevronLeft, ChevronRight,
  Activity, Layers, X, ArrowUpDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_1h: number;
  circulating_supply: number;
  sparkline_in_7d?: { price: number[] };
}

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  image: string;
  market_cap_rank: number;
  data: { price_change_percentage_24h?: { usd?: number }; price?: string };
}

interface GlobalStats {
  active_cryptocurrencies: number;
  markets: number;
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  market_cap_percentage: { btc: number; eth: number };
  market_cap_change_percentage_24h_usd: number;
}

interface NewsArticle {
  id: number;
  title: string;
  url: string;
  source_name: string;
  domain: string;
  published_at: string;
  currencies: string[];
  votes_positive: number;
  votes_negative: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  kind: string;
}

interface Sentiment {
  bullish: number;
  bearish: number;
  neutral: number;
  label: string;
}

interface ChartPoint { time: string; price: number }

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 2) =>
  n == null ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: decimals });

const fmtPrice = (n: number) => {
  if (n == null) return '—';
  if (n >= 1) return `$${fmt(n, 2)}`;
  if (n >= 0.01) return `$${fmt(n, 4)}`;
  return `$${n.toFixed(8)}`;
};

const fmtBig = (n: number) => {
  if (!n) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${fmt(n)}`;
};

const pctColor = (v: number) =>
  v > 0 ? 'text-gain' : v < 0 ? 'text-loss' : 'text-muted-foreground';

const PctBadge = ({ value, size = 'sm' }: { value: number; size?: 'xs' | 'sm' }) => {
  if (value == null || isNaN(value)) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn(
      'inline-flex items-center font-semibold',
      pctColor(value),
      size === 'xs' ? 'text-xs gap-px' : 'text-sm gap-0.5',
    )}>
      {value > 0 ? <ChevronUp className="h-3 w-3" /> : value < 0 ? <ChevronDown className="h-3 w-3" /> : null}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
};

const MiniSparkline = ({ prices, positive }: { prices: number[]; positive: boolean }) => {
  if (!prices?.length) return <div className="w-20 h-8" />;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 80, h = 28;
  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ─── Pagination ─────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, onChange, disabled,
}: { page: number; totalPages: number; onChange: (p: number) => void; disabled?: boolean }) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const range = 1;
  for (let i = Math.max(1, page - range); i <= Math.min(totalPages, page + range); i++) pages.push(i);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline" size="sm"
        disabled={page <= 1 || disabled}
        onClick={() => onChange(page - 1)}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages[0] > 1 && (
        <>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onChange(1)}>1</Button>
          {pages[0] > 2 && <span className="px-1 text-xs text-muted-foreground">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0 font-semibold"
          onClick={() => onChange(p)}
          disabled={disabled}
        >
          {p}
        </Button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onChange(totalPages)}>
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="outline" size="sm"
        disabled={page >= totalPages || disabled}
        onClick={() => onChange(page + 1)}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

const PER_PAGE = 25;
const TOTAL_PAGES = 20; // CoinGecko returns ~10K coins, 25 per page = ~400 pages, but cap at 20 for UX

export default function CryptoPage() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [chartDays, setChartDays] = useState(7);
  const [newsFilter, setNewsFilter] = useState('hot');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('market_cap_desc');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarketsLoading, setIsMarketsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(v); setPage(1); }, 400);
  };

  const loadMarkets = useCallback(async () => {
    setIsMarketsLoading(true);
    try {
      const res = await api.get('/crypto/markets', {
        params: { page, per_page: PER_PAGE, sort, search: debouncedSearch || undefined },
      });
      const list: Coin[] = res.data?.coins || [];
      setCoins(list);
      if (!selectedCoin && list.length) setSelectedCoin(list[0]);
    } catch {
      setCoins([]);
    } finally {
      setIsMarketsLoading(false);
    }
  }, [page, sort, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadChart = useCallback(async (coinId: string, days: number) => {
    setIsChartLoading(true);
    try {
      const res = await api.get(`/crypto/coin/${coinId}/chart`, { params: { days } });
      const prices: [number, number][] = res.data?.prices || [];
      const fmtTime = (ts: number) => {
        const d = new Date(ts);
        if (days <= 1) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        if (days <= 90) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      };
      setChart(prices.map(([ts, price]) => ({
        time: fmtTime(ts),
        price: +price.toFixed(price >= 1 ? 4 : 8),
      })));
    } catch { setChart([]); } finally { setIsChartLoading(false); }
  }, []);

  const loadNews = useCallback(async (filter: string) => {
    setIsNewsLoading(true);
    try {
      const res = await api.get('/crypto/news', { params: { filter } });
      setNews(res.data?.results || []);
    } catch { setNews([]); } finally { setIsNewsLoading(false); }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [globalRes, trendingRes, sentimentRes] = await Promise.all([
          api.get('/crypto/global').catch(() => ({ data: null })),
          api.get('/crypto/trending').catch(() => ({ data: { coins: [] } })),
          api.get('/crypto/sentiment').catch(() => ({ data: null })),
        ]);
        setGlobalStats(globalRes.data);
        setTrending(trendingRes.data?.coins || []);
        setSentiment(sentimentRes.data);
      } finally { setIsLoading(false); }
    };
    init();
    loadNews('hot');
  }, [loadNews]);

  useEffect(() => { loadMarkets(); }, [loadMarkets]);

  useEffect(() => {
    if (selectedCoin) loadChart(selectedCoin.id, chartDays);
  }, [selectedCoin, chartDays, loadChart]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [globalRes, trendingRes, sentimentRes] = await Promise.all([
        api.get('/crypto/global').catch(() => ({ data: null })),
        api.get('/crypto/trending').catch(() => ({ data: { coins: [] } })),
        api.get('/crypto/sentiment').catch(() => ({ data: null })),
      ]);
      if (globalRes.data) setGlobalStats(globalRes.data);
      if (trendingRes.data?.coins) setTrending(trendingRes.data.coins);
      if (sentimentRes.data) setSentiment(sentimentRes.data);
      await Promise.all([loadMarkets(), loadNews(newsFilter)]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalMcap = globalStats?.total_market_cap?.usd;
  const totalVol = globalStats?.total_volume?.usd;
  const mcapChange = globalStats?.market_cap_change_percentage_24h_usd ?? 0;
  const btcDom = globalStats?.market_cap_percentage?.btc ?? 0;
  const ethDom = globalStats?.market_cap_percentage?.eth ?? 0;

  const btc = coins.find(c => c.id === 'bitcoin') || trending.find(t => t.id === 'bitcoin');
  const eth = coins.find(c => c.id === 'ethereum') || trending.find(t => t.id === 'ethereum');

  return (
    <div className="flex flex-col gap-5 pb-10 animate-fade-in">

      {/* ════ Header ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Bitcoin className="h-5 w-5 text-orange-500" />
            </div>
            Crypto Market
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 ml-0 sm:ml-12">
            Live prices, charts, news & market sentiment
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* ════ Global Market Snapshot ═══════════════════════════════════════ */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 lg:divide-y-0 divide-border">
          {[
            {
              label: 'Total Market Cap',
              value: fmtBig(totalMcap!),
              sub: <PctBadge value={mcapChange} size="xs" />,
              icon: Globe,
            },
            { label: '24h Volume', value: fmtBig(totalVol!), icon: Activity },
            {
              label: 'BTC Dominance',
              value: `${btcDom?.toFixed(1)}%`,
              icon: Bitcoin,
              sub: <span className="text-xs text-muted-foreground">Bitcoin</span>,
            },
            {
              label: 'ETH Dominance',
              value: `${ethDom?.toFixed(1)}%`,
              icon: Layers,
              sub: <span className="text-xs text-muted-foreground">Ethereum</span>,
            },
            { label: 'Active Coins', value: fmt(globalStats?.active_cryptocurrencies ?? 0, 0), icon: TrendingUp },
            { label: 'Markets', value: fmt(globalStats?.markets ?? 0, 0), icon: BarChart2 },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="p-4 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground truncate">
                  {label}
                </span>
              </div>
              <div className="font-bold text-base sm:text-lg tracking-tight truncate">
                {isLoading ? <span className="inline-block h-5 w-20 bg-muted animate-pulse rounded" /> : value}
              </div>
              {sub && <div className="mt-0.5">{sub}</div>}
            </div>
          ))}
        </div>
      </Card>

      {/* ════ BTC / ETH Quick Cards (mobile-friendly hero) ════════════════ */}
      {(btc || eth) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { coin: btc as Coin, color: 'from-orange-500/15 to-orange-500/0', accent: 'text-orange-500' },
            { coin: eth as Coin, color: 'from-indigo-500/15 to-indigo-500/0', accent: 'text-indigo-500' },
          ].filter(({ coin }) => coin).map(({ coin, color, accent }) => {
            const isFullCoin = 'current_price' in coin;
            return (
              <Card
                key={coin.id}
                onClick={() => isFullCoin && setSelectedCoin(coin as Coin)}
                className={cn(
                  'p-4 cursor-pointer hover:border-primary/40 transition-colors relative overflow-hidden',
                  `bg-gradient-to-br ${color}`,
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {coin.image && (
                      <img src={coin.image} alt={coin.name} className="h-10 w-10 rounded-full" />
                    )}
                    <div>
                      <div className="font-bold tracking-tight">{coin.name}</div>
                      <div className={cn('text-xs uppercase font-semibold', accent)}>{coin.symbol}</div>
                    </div>
                  </div>
                  {isFullCoin && (
                    <div className="text-right">
                      <div className="text-xl font-bold tracking-tight">
                        {fmtPrice((coin as Coin).current_price)}
                      </div>
                      <PctBadge value={(coin as Coin).price_change_percentage_24h ?? 0} />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ════ Trending Strip ═══════════════════════════════════════════════ */}
      {trending.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-sm">Trending Now</span>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold">
                Live
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {trending.map((t) => {
              const pct = t.data?.price_change_percentage_24h?.usd ?? 0;
              return (
                <button
                  key={t.id}
                  onClick={() => { const c = coins.find(c => c.id === t.id); if (c) setSelectedCoin(c); }}
                  className="flex-none bg-muted/40 hover:bg-muted border border-border hover:border-primary/40 rounded-lg px-3 py-2 flex items-center gap-2.5 transition-colors min-w-[150px]"
                >
                  {t.image ? (
                    <img src={t.image} alt={t.name} className="h-7 w-7 rounded-full" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {t.symbol?.charAt(0)}
                    </div>
                  )}
                  <div className="text-left min-w-0">
                    <div className="text-sm font-semibold truncate">{t.symbol?.toUpperCase()}</div>
                    <div className={cn('text-xs font-medium', pctColor(pct))}>
                      {pct >= 0 ? '+' : ''}{pct?.toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* ════ Main Grid ════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ─── Left: Markets Table ─────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-4 min-w-0">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coins by name or symbol…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="pl-9 pr-9 h-9"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <Select value={sort} onValueChange={v => { setSort(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-52 h-9">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market_cap_desc">Market Cap ↓</SelectItem>
                <SelectItem value="market_cap_asc">Market Cap ↑</SelectItem>
                <SelectItem value="volume_desc">Volume ↓</SelectItem>
                <SelectItem value="price_desc">Price ↓</SelectItem>
                <SelectItem value="price_asc">Price ↑</SelectItem>
                <SelectItem value="price_change_percentage_24h_desc">Top Gainers</SelectItem>
                <SelectItem value="price_change_percentage_24h_asc">Top Losers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-10">#</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coin</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">1h</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">24h</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">7d</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Market Cap</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Volume</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">7d Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {isMarketsLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-3 py-3"><div className="h-3 w-4 bg-muted rounded animate-pulse" /></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 bg-muted rounded-full animate-pulse" />
                            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                          </div>
                        </td>
                        <td className="px-3 py-3"><div className="h-3 w-16 bg-muted rounded animate-pulse ml-auto" /></td>
                        <td className="px-3 py-3 hidden sm:table-cell"><div className="h-3 w-12 bg-muted rounded animate-pulse ml-auto" /></td>
                        <td className="px-3 py-3"><div className="h-3 w-12 bg-muted rounded animate-pulse ml-auto" /></td>
                        <td className="px-3 py-3 hidden sm:table-cell"><div className="h-3 w-12 bg-muted rounded animate-pulse ml-auto" /></td>
                        <td className="px-3 py-3 hidden md:table-cell"><div className="h-3 w-20 bg-muted rounded animate-pulse ml-auto" /></td>
                        <td className="px-3 py-3 hidden lg:table-cell"><div className="h-3 w-20 bg-muted rounded animate-pulse ml-auto" /></td>
                        <td className="px-3 py-3 hidden lg:table-cell"><div className="h-7 w-20 bg-muted rounded animate-pulse ml-auto" /></td>
                      </tr>
                    ))
                  ) : coins.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">No coins found</p>
                        <p className="text-xs mt-0.5">Try a different search or sort option</p>
                      </td>
                    </tr>
                  ) : coins.map((coin) => {
                    const isSelected = selectedCoin?.id === coin.id;
                    const sparkPrices = coin.sparkline_in_7d?.price ?? [];
                    const pct7d = coin.price_change_percentage_7d ?? 0;
                    return (
                      <tr
                        key={coin.id}
                        onClick={() => setSelectedCoin(coin)}
                        className={cn(
                          'border-b cursor-pointer transition-colors hover:bg-muted/40',
                          isSelected && 'bg-primary/5 hover:bg-primary/10',
                        )}
                      >
                        <td className="px-3 py-3 text-muted-foreground text-xs font-medium">{coin.market_cap_rank}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {coin.image ? (
                              <img src={coin.image} alt={coin.name} className="h-7 w-7 rounded-full shrink-0" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                                {coin.symbol?.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{coin.name}</div>
                              <div className="text-[11px] text-muted-foreground uppercase font-medium">{coin.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{fmtPrice(coin.current_price)}</td>
                        <td className="px-3 py-3 text-right hidden sm:table-cell"><PctBadge value={coin.price_change_percentage_1h ?? 0} /></td>
                        <td className="px-3 py-3 text-right"><PctBadge value={coin.price_change_percentage_24h ?? 0} /></td>
                        <td className="px-3 py-3 text-right hidden sm:table-cell"><PctBadge value={pct7d} /></td>
                        <td className="px-3 py-3 text-right hidden md:table-cell text-muted-foreground tabular-nums">{fmtBig(coin.market_cap)}</td>
                        <td className="px-3 py-3 text-right hidden lg:table-cell text-muted-foreground tabular-nums">{fmtBig(coin.total_volume)}</td>
                        <td className="px-3 py-3 text-right hidden lg:table-cell">
                          <div className="flex justify-end">
                            <MiniSparkline prices={sparkPrices} positive={pct7d >= 0} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {coins.length > 0 && !debouncedSearch && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Page <span className="font-semibold text-foreground">{page}</span> of {TOTAL_PAGES} · Showing {coins.length} coins
                </span>
                <Pagination
                  page={page}
                  totalPages={TOTAL_PAGES}
                  onChange={(p) => { setPage(p); }}
                  disabled={isMarketsLoading}
                />
              </div>
            )}
          </Card>
        </div>

        {/* ─── Right: Chart + Sentiment + News ──────────────────────────── */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* Selected Coin Chart */}
          {selectedCoin && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedCoin.image && (
                      <img src={selectedCoin.image} alt={selectedCoin.name} className="h-8 w-8 rounded-full shrink-0" />
                    )}
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{selectedCoin.name}</CardTitle>
                      <p className="text-[11px] uppercase font-semibold text-muted-foreground">
                        {selectedCoin.symbol} · Rank #{selectedCoin.market_cap_rank}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-base tabular-nums">{fmtPrice(selectedCoin.current_price)}</div>
                    <PctBadge value={selectedCoin.price_change_percentage_24h ?? 0} />
                  </div>
                </div>

                <Tabs value={String(chartDays)} onValueChange={v => setChartDays(+v)} className="mt-3">
                  <TabsList className="h-8 grid grid-cols-5 w-full">
                    {[['1', '24h'], ['7', '7D'], ['30', '1M'], ['90', '3M'], ['365', '1Y']].map(([v, l]) => (
                      <TabsTrigger key={v} value={v} className="text-xs px-2 h-7">{l}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="pt-0">
                {isChartLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={selectedCoin.price_change_percentage_24h >= 0 ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={selectedCoin.price_change_percentage_24h >= 0 ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                        interval={Math.floor(chart.length / 4)} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} tickLine={false}
                        axisLine={false} width={56}
                        tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : v >= 1 ? `$${v.toFixed(0)}` : `$${v.toFixed(3)}`} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [fmtPrice(v), 'Price']}
                      />
                      <Area type="monotone" dataKey="price"
                        stroke={selectedCoin.price_change_percentage_24h >= 0 ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
                        strokeWidth={2} fill="url(#cg)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    No chart data available
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[
                    { label: '24h High', value: fmtPrice(selectedCoin.high_24h) },
                    { label: '24h Low', value: fmtPrice(selectedCoin.low_24h) },
                    { label: 'Market Cap', value: fmtBig(selectedCoin.market_cap) },
                    { label: 'Volume 24h', value: fmtBig(selectedCoin.total_volume) },
                    { label: 'Circulating', value: `${fmt(selectedCoin.circulating_supply, 0)}` },
                    { label: '7d Change', value: <PctBadge value={selectedCoin.price_change_percentage_7d ?? 0} /> },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted/40 rounded-lg p-2.5">
                      <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{label}</div>
                      <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sentiment */}
          {sentiment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {sentiment.label === 'Bullish'
                    ? <TrendingUp className="h-4 w-4 text-gain" />
                    : sentiment.label === 'Bearish'
                    ? <TrendingDown className="h-4 w-4 text-loss" />
                    : <BarChart2 className="h-4 w-4 text-yellow-500" />}
                  Market Sentiment
                  <span className={cn(
                    'ml-auto text-xs font-bold uppercase tracking-wider',
                    sentiment.label === 'Bullish' ? 'text-gain'
                    : sentiment.label === 'Bearish' ? 'text-loss'
                    : 'text-yellow-500',
                  )}>{sentiment.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {[
                  { label: 'Bullish', value: sentiment.bullish, color: 'bg-gain' },
                  { label: 'Bearish', value: sentiment.bearish, color: 'bg-loss' },
                  { label: 'Neutral', value: sentiment.neutral, color: 'bg-yellow-400' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground font-medium">{label}</span>
                      <span className="font-semibold">{value}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* News */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Newspaper className="h-4 w-4" /> Crypto News
                </CardTitle>
                <Select value={newsFilter} onValueChange={v => { setNewsFilter(v); loadNews(v); }}>
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="rising">Rising</SelectItem>
                    <SelectItem value="bullish">Bullish</SelectItem>
                    <SelectItem value="bearish">Bearish</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-1 max-h-[480px] overflow-y-auto">
              {isNewsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5 py-2">
                    <div className="h-3 bg-muted rounded animate-pulse w-full" />
                    <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                  </div>
                ))
              ) : news.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No news available</p>
                  <p className="text-xs mt-0.5">Try a different filter</p>
                </div>
              ) : news.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="flex gap-2 items-start hover:bg-muted/50 rounded-lg p-2 transition-colors">
                    <div className={cn(
                      'mt-1.5 h-2 w-2 rounded-full shrink-0',
                      article.sentiment === 'positive' ? 'bg-gain'
                      : article.sentiment === 'negative' ? 'bg-loss'
                      : 'bg-yellow-400',
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug font-medium group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{article.source_name}</span>
                        {article.currencies?.slice(0, 3).map(c => (
                          <Badge key={c} variant="outline" className="text-[9px] px-1 py-0 h-4 font-bold">{c}</Badge>
                        ))}
                        <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
