'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/empty-state';
import { ConnectionStatus, MarketTicker } from '@/components/common/live-price';
import {
  TrendingUp, TrendingDown, Wallet, Target, Activity, Briefcase,
  Coins, BarChart3, Newspaper, Bitcoin, ArrowUpRight, ArrowDownRight,
  Minus, RefreshCw, Sparkles, Flame, ChevronRight, ExternalLink,
  Globe, LineChart, MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ─── Types (kept compact, only what we use) ─────────────────────────────────

interface DashboardData {
  portfolio: { total_value: number; total_gain_loss: number; gain_loss_pct: number; holdings_count: number };
  market: { indices: Array<{ name: string; symbol: string; value: number; change: number; change_percentage: number; updated_at?: string }>; breadth: string };
  goals: { active: number; achieved: number; overall_progress: number };
  notifications: { unread_count: number; active_alerts: number };
  timestamp: string;
}

interface StockMover { symbol: string; name: string; current_price: number; change_percentage: number; volume?: number; logo_url?: string }
interface SectorData { sector: string; avg_change_pct: number; advancing: number; declining: number; stock_count: number }
interface MarketIndex { id?: string; name: string; symbol: string; value: number; change: number; change_percentage: number; updated_at?: string }
interface QuickStats {
  market: { total_stocks: number; advancing: number; declining: number };
  portfolio: { value: number; invested: number; gain_loss: number };
  notifications: { unread: number };
}

interface Coin {
  id: string; symbol: string; name: string; image: string;
  current_price: number; market_cap: number; market_cap_rank: number;
  price_change_percentage_24h: number; sparkline_in_7d?: { price: number[] };
}
interface CryptoGlobal {
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  market_cap_percentage: { btc: number; eth: number };
  market_cap_change_percentage_24h_usd: number;
}

interface NewsArticle {
  title: string; url: string; source_name?: string; image_url?: string;
  published_at?: string; sentiment?: 'positive' | 'negative' | 'neutral';
  ai_summary?: string; summary?: string; description?: string;
}
interface NewsBrief {
  brief: string; sentiment: 'bullish' | 'bearish' | 'neutral';
  key_points: string[]; impact_on_pakistan: string;
  generated_at: string; article_count: number;
}

interface CommodityPrice {
  per_tola: number; per_gram: number; price_usd_oz: number;
  change_amount: number; change_percentage: number;
}
interface CommoditiesData {
  gold: CommodityPrice; silver: CommodityPrice; exchange_rate: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtPKR = (n: number) => n == null ? 'Rs. 0' : `Rs. ${Math.abs(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
const fmtBig = (n: number) => {
  if (!n) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
};
const fmtPrice = (n: number) => {
  if (n == null) return '—';
  if (n >= 1) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
};
const pctColor = (v: number) => v > 0 ? 'text-gain' : v < 0 ? 'text-loss' : 'text-muted-foreground';

const PctChip = ({ value }: { value: number }) => {
  if (value == null || isNaN(value)) return <span className="text-xs text-muted-foreground">—</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', pctColor(value))}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(2)}%
    </span>
  );
};

const timeAgo = (ts?: string) => {
  if (!ts) return '';
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); }
  catch { return ''; }
};

// ─── Mini Sparkline ──────────────────────────────────────────────────────────

const MiniSpark = ({ prices, positive, w = 60, h = 24 }: { prices: number[]; positive: boolean; w?: number; h?: number }) => {
  if (!prices?.length) return <div style={{ width: w, height: h }} />;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={positive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

// ─── Stat Card (custom for dashboard) ────────────────────────────────────────

function HeroStatCard({
  title, value, icon: Icon, trend, sub, accent, href,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  sub?: React.ReactNode;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <Card className={cn(
      'p-4 hover:shadow-md transition-all hover:border-foreground/20 group cursor-pointer',
      accent,
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'h-9 w-9 rounded-xl flex items-center justify-center',
          trend === 'up' ? 'bg-gain/10 text-gain'
          : trend === 'down' ? 'bg-loss/10 text-loss'
          : 'bg-primary/10 text-primary',
        )}>
          <Icon className="h-4 w-4" />
        </div>
        {href && <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{title}</p>
      <p className="text-xl md:text-2xl font-bold tracking-tight tabular-nums mt-1 truncate">{value}</p>
      {sub && <div className="mt-1.5 text-xs">{sub}</div>}
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHead({
  icon: Icon, title, sub, href, accent,
}: {
  icon: React.ElementType;
  title: string;
  sub?: string;
  href?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', accent || 'bg-primary/10 text-primary')}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-base tracking-tight truncate">{title}</h2>
          {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
        </div>
      </div>
      {href && (
        <Link href={href}>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 -mr-2">
            View all <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [movers, setMovers] = useState<{ top_gainers: StockMover[]; top_losers: StockMover[]; most_active: StockMover[] } | null>(null);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [cryptoGlobal, setCryptoGlobal] = useState<CryptoGlobal | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [brief, setBrief] = useState<NewsBrief | null>(null);
  const [commodities, setCommodities] = useState<CommoditiesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAll = useCallback(async (background = false) => {
    if (!background) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [
        summaryRes, moversRes, sectorsRes, indicesRes, quickStatsRes,
        coinsRes, cryptoGlobalRes, featuredRes, briefRes, commoditiesRes,
      ] = await Promise.all([
        api.get<DashboardData>('/dashboard/summary').catch(() => ({ data: null })),
        api.get('/dashboard/movers').catch(() => ({ data: null })),
        api.get<{ sectors: SectorData[] }>('/dashboard/sectors').catch(() => ({ data: { sectors: [] } })),
        api.get<{ indices: MarketIndex[] }>('/dashboard/indices').catch(() => ({ data: { indices: [] } })),
        api.get<QuickStats>('/dashboard/quick-stats').catch(() => ({ data: null })),
        api.get<{ coins: Coin[] }>('/crypto/markets', { params: { page: 1, per_page: 6 } }).catch(() => ({ data: { coins: [] } })),
        api.get<CryptoGlobal>('/crypto/global').catch(() => ({ data: null })),
        api.get<{ hero: NewsArticle | null; featured: NewsArticle[]; latest: NewsArticle[] }>('/news/featured').catch(() => ({ data: null })),
        api.get<NewsBrief>('/news/brief').catch(() => ({ data: null })),
        api.get<CommoditiesData>('/commodities/prices').catch(() => ({ data: null })),
      ]);

      setData(summaryRes.data);
      setMovers(moversRes.data as any);
      setSectors(sectorsRes.data?.sectors || []);
      setIndices(indicesRes.data?.indices || []);
      setQuickStats(quickStatsRes.data);
      setCoins(coinsRes.data?.coins || []);
      setCryptoGlobal(cryptoGlobalRes.data);
      const feat = featuredRes.data;
      const featList: NewsArticle[] = feat
        ? [feat.hero, ...feat.featured, ...feat.latest].filter(Boolean) as NewsArticle[]
        : [];
      setNews(featList.slice(0, 5));
      setBrief(briefRes.data);
      setCommodities(commoditiesRes.data);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const portfolio = data?.portfolio;
  const market = data?.market;
  const goals = data?.goals;
  const notifications = data?.notifications;
  const kseIndex = market?.indices?.find(i => i.symbol === 'KSE100' || i.name?.includes('KSE') || i.name?.includes('100')) || market?.indices?.[0] || indices[0];
  const heroNews = news[0];
  const sideNews = news.slice(1, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-5 pb-10 animate-fade-in">

      {/* ════ Live Market Ticker ════════════════════════════════════════════ */}
      <MarketTicker />

      {/* ════ Header ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {greeting} <span className="text-primary">·</span> Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll(true)}
            disabled={isRefreshing || isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ════ Hero Stats ═══════════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <Card key={i} className="p-4">
              <div className="h-9 w-9 rounded-xl bg-muted animate-pulse mb-3" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded mb-2" />
              <div className="h-7 w-32 bg-muted animate-pulse rounded mb-1.5" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <HeroStatCard
            title="Portfolio Value"
            value={fmtPKR(portfolio?.total_value || 0)}
            icon={Wallet}
            trend={portfolio?.total_gain_loss && portfolio.total_gain_loss > 0 ? 'up' : portfolio?.total_gain_loss && portfolio.total_gain_loss < 0 ? 'down' : 'neutral'}
            sub={<PctChip value={portfolio?.gain_loss_pct || 0} />}
            href="/portfolio"
          />
          <HeroStatCard
            title="P/L Today"
            value={`${(portfolio?.total_gain_loss || 0) >= 0 ? '+' : '−'} ${fmtPKR(portfolio?.total_gain_loss || 0)}`}
            icon={(portfolio?.total_gain_loss || 0) >= 0 ? TrendingUp : TrendingDown}
            trend={portfolio?.total_gain_loss && portfolio.total_gain_loss > 0 ? 'up' : portfolio?.total_gain_loss && portfolio.total_gain_loss < 0 ? 'down' : 'neutral'}
            sub={<span className="text-muted-foreground">{portfolio?.holdings_count || 0} holdings</span>}
            href="/portfolio"
          />
          <HeroStatCard
            title={kseIndex?.name || 'KSE 100'}
            value={kseIndex?.value?.toLocaleString('en-PK', { maximumFractionDigits: 2 }) || '—'}
            icon={LineChart}
            trend={(kseIndex?.change_percentage || 0) > 0 ? 'up' : (kseIndex?.change_percentage || 0) < 0 ? 'down' : 'neutral'}
            sub={<PctChip value={kseIndex?.change_percentage || 0} />}
            href="/stocks"
          />
          <HeroStatCard
            title="Goals Progress"
            value={`${goals?.overall_progress?.toFixed(0) || 0}%`}
            icon={Target}
            sub={<span className="text-muted-foreground">{goals?.active || 0} active · {goals?.achieved || 0} done</span>}
            href="/goals"
          />
        </div>
      )}

      {/* ════ Market Snapshot Strip ════════════════════════════════════════ */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-y sm:divide-y-0 lg:divide-y-0 divide-border">
          {[
            { label: 'Market', value: <span className={cn('capitalize', market?.breadth === 'bullish' ? 'text-gain' : market?.breadth === 'bearish' ? 'text-loss' : 'text-yellow-500')}>{market?.breadth || 'Neutral'}</span>, icon: Activity },
            { label: 'Advancing', value: <span className="text-gain">{quickStats?.market?.advancing ?? '—'}</span>, icon: TrendingUp },
            { label: 'Declining', value: <span className="text-loss">{quickStats?.market?.declining ?? '—'}</span>, icon: TrendingDown },
            { label: 'Total Stocks', value: quickStats?.market?.total_stocks ?? '—', icon: BarChart3 },
            { label: 'Crypto Cap', value: cryptoGlobal ? fmtBig(cryptoGlobal.total_market_cap?.usd) : '—', icon: Bitcoin, sub: cryptoGlobal ? <PctChip value={cryptoGlobal.market_cap_change_percentage_24h_usd} /> : null },
            { label: 'Gold/Tola', value: commodities?.gold ? fmtPKR(commodities.gold.per_tola) : '—', icon: Coins, sub: commodities?.gold ? <PctChip value={commodities.gold.change_percentage} /> : null },
            { label: 'USD/PKR', value: commodities?.exchange_rate?.toFixed(2) || '—', icon: Globe },
          ].map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="p-3 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate">{label}</span>
              </div>
              <div className="font-bold text-sm tracking-tight tabular-nums truncate">{value}</div>
              {sub && <div className="mt-0.5">{sub}</div>}
            </div>
          ))}
        </div>
      </Card>

      {/* ════ Editor's Brief (AI Market Brief) ═════════════════════════════ */}
      {brief && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    AI Market Brief
                    <Badge variant="outline" className={cn(
                      'text-[10px] uppercase tracking-wider font-bold',
                      brief.sentiment === 'bullish' ? 'text-gain border-gain/40'
                      : brief.sentiment === 'bearish' ? 'text-loss border-loss/40'
                      : 'text-muted-foreground',
                    )}>
                      {brief.sentiment === 'bullish' && <TrendingUp className="h-3 w-3 mr-1" />}
                      {brief.sentiment === 'bearish' && <TrendingDown className="h-3 w-3 mr-1" />}
                      {brief.sentiment}
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    {brief.article_count} stories · {timeAgo(brief.generated_at)}
                  </p>
                </div>
              </div>
              <Link href="/news">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 shrink-0">
                  Read more <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <p className="text-sm text-foreground/90 leading-relaxed">{brief.brief}</p>
            {brief.key_points?.length > 0 && (
              <div className="grid gap-1.5 sm:grid-cols-2 pt-2 border-t border-border">
                {brief.key_points.slice(0, 4).map((pt, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-foreground/80">{pt}</span>
                  </div>
                ))}
              </div>
            )}
            {brief.impact_on_pakistan && (
              <div className="flex items-start gap-2 text-sm bg-primary/5 rounded-lg p-2.5 border border-primary/15">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground/80">{brief.impact_on_pakistan}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════ News + Crypto Row ═════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* News Column (2/3) */}
        <div className="lg:col-span-2 space-y-3">
          <SectionHead
            icon={Newspaper}
            title="Latest News"
            sub="From the GrowNews wire"
            href="/news"
            accent="bg-foreground/10 text-foreground"
          />
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-5">
              <Card className="sm:col-span-3 overflow-hidden">
                <div className="aspect-[16/9] bg-muted animate-pulse" />
                <div className="p-3.5 space-y-2">
                  <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-5 w-full bg-muted animate-pulse rounded" />
                  <div className="h-5 w-4/5 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                </div>
              </Card>
              <Card className="sm:col-span-2 p-2 space-y-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex gap-2.5 p-2">
                    <div className="w-16 h-16 bg-muted animate-pulse rounded shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-full bg-muted animate-pulse rounded" />
                      <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                      <div className="h-2.5 w-1/2 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ) : heroNews ? (
            <div className="grid gap-3 sm:grid-cols-5">
              {/* Hero news */}
              <Card className="sm:col-span-3 overflow-hidden group hover:border-primary/30 transition-colors">
                <a href={heroNews.url} target="_blank" rel="noopener noreferrer" className="block">
                  {heroNews.image_url && (
                    <div className="aspect-[16/9] bg-muted overflow-hidden">
                      <img
                        src={heroNews.image_url}
                        alt={heroNews.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className={cn(
                        'text-[10px] uppercase tracking-wider font-bold',
                        heroNews.sentiment === 'positive' ? 'text-gain border-gain/40'
                        : heroNews.sentiment === 'negative' ? 'text-loss border-loss/40'
                        : '',
                      )}>
                        {heroNews.sentiment === 'positive' ? 'Bullish' : heroNews.sentiment === 'negative' ? 'Bearish' : 'Neutral'}
                      </Badge>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate">
                        {heroNews.source_name} · {timeAgo(heroNews.published_at)}
                      </span>
                    </div>
                    <h3 className="font-bold text-base leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition-colors mb-1">
                      {heroNews.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {heroNews.ai_summary || heroNews.summary || heroNews.description}
                    </p>
                  </div>
                </a>
              </Card>

              {/* Side news list */}
              <Card className="sm:col-span-2 p-2">
                <div className="divide-y divide-border">
                  {sideNews.map((a, i) => (
                    <a
                      key={a.url || i}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-2.5 p-2 hover:bg-muted/40 rounded-lg group"
                    >
                      {a.image_url && (
                        <div className="w-16 h-16 shrink-0 overflow-hidden rounded bg-muted">
                          <img src={a.image_url} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors tracking-tight">
                          {a.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
                          {a.source_name} · {timeAgo(a.published_at)}
                        </p>
                      </div>
                    </a>
                  ))}
                  {sideNews.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground">No more stories</div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Newspaper className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No news available</p>
            </Card>
          )}
        </div>

        {/* Crypto Column (1/3) */}
        <div className="space-y-3">
          <SectionHead
            icon={Bitcoin}
            title="Crypto Market"
            sub={cryptoGlobal ? `BTC ${cryptoGlobal.market_cap_percentage?.btc?.toFixed(1)}% · ETH ${cryptoGlobal.market_cap_percentage?.eth?.toFixed(1)}%` : 'Live prices'}
            href="/crypto"
            accent="bg-orange-500/10 text-orange-500"
          />
          <Card className="p-2">
            {isLoading ? (
              <div className="space-y-1">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-2.5 p-2">
                    <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                      <div className="h-2.5 w-20 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="w-12 h-5 bg-muted animate-pulse rounded" />
                    <div className="space-y-1.5 text-right">
                      <div className="h-3 w-14 bg-muted animate-pulse rounded ml-auto" />
                      <div className="h-2.5 w-10 bg-muted animate-pulse rounded ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : coins.length > 0 ? (
              <div className="divide-y divide-border">
                {coins.slice(0, 6).map((coin) => (
                  <Link key={coin.id} href="/crypto">
                    <div className="flex items-center gap-2.5 p-2 hover:bg-muted/40 rounded-lg cursor-pointer">
                      {coin.image && <img src={coin.image} alt={coin.name} className="h-7 w-7 rounded-full shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold uppercase tabular-nums">{coin.symbol}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{coin.name}</div>
                      </div>
                      <MiniSpark
                        prices={coin.sparkline_in_7d?.price || []}
                        positive={(coin.price_change_percentage_24h || 0) >= 0}
                        w={50}
                        h={20}
                      />
                      <div className="text-right shrink-0 min-w-[64px]">
                        <div className="text-xs font-bold tabular-nums">{fmtPrice(coin.current_price)}</div>
                        <PctChip value={coin.price_change_percentage_24h || 0} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <Bitcoin className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No crypto data</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ════ Market Movers + Sectors Row ══════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Market Movers */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" /> Market Movers
              </CardTitle>
              <Link href="/stocks">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  All stocks <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="gainers">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="gainers" className="text-xs h-7">Gainers</TabsTrigger>
                <TabsTrigger value="losers" className="text-xs h-7">Losers</TabsTrigger>
                <TabsTrigger value="active" className="text-xs h-7">Most Active</TabsTrigger>
              </TabsList>

              {(['gainers', 'losers', 'active'] as const).map((tab) => {
                const list = tab === 'gainers' ? movers?.top_gainers
                  : tab === 'losers' ? movers?.top_losers
                  : movers?.most_active;
                return (
                  <TabsContent key={tab} value={tab} className="mt-3 space-y-1">
                    {isLoading ? (
                      <div className="space-y-1">
                        {[0, 1, 2, 3, 4].map(i => (
                          <div key={i} className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse shrink-0" />
                              <div className="space-y-1.5 flex-1">
                                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                                <div className="h-2.5 w-32 bg-muted animate-pulse rounded" />
                              </div>
                            </div>
                            <div className="text-right space-y-1.5">
                              <div className="h-3 w-16 bg-muted animate-pulse rounded ml-auto" />
                              <div className="h-2.5 w-12 bg-muted animate-pulse rounded ml-auto" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : list && list.filter(s => s.symbol).length > 0 ? (
                      list.filter(s => s.symbol).slice(0, 5).map((stock, i) => (
                        <Link
                          key={stock.symbol ?? `${tab}-${i}`}
                          href={`/stocks?q=${stock.symbol}`}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {stock.logo_url ? (
                              <img
                                src={stock.logo_url}
                                alt={stock.symbol}
                                className="h-8 w-8 rounded-lg shrink-0 object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                {stock.symbol?.slice(0, 3)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold tracking-tight truncate">{stock.symbol}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{stock.name || stock.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-sm font-semibold tabular-nums">Rs. {stock.current_price?.toFixed(2) ?? '—'}</p>
                            {tab === 'active' ? (
                              <p className="text-[11px] text-muted-foreground tabular-nums">{stock.volume?.toLocaleString() || '0'} vol</p>
                            ) : (
                              <PctChip value={stock.change_percentage || 0} />
                            )}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <Activity className="h-6 w-6 mx-auto mb-2 opacity-40" />
                        No {tab === 'active' ? 'active stocks' : tab} right now
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* Sectors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Sector Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                      <div className="h-2.5 w-20 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : sectors.length > 0 ? (
              <div className="space-y-2">
                {sectors.slice(0, 6).map((sector, i) => {
                  const change = sector.avg_change_pct || 0;
                  const positive = change >= 0;
                  const intensity = Math.min(Math.abs(change) / 5, 1);
                  return (
                    <div key={sector.sector ?? `s-${i}`} className="relative overflow-hidden rounded-lg p-2.5 bg-muted/30">
                      <div
                        className={cn('absolute inset-y-0 left-0', positive ? 'bg-gain/15' : 'bg-loss/15')}
                        style={{ width: `${intensity * 100}%` }}
                      />
                      <div className="relative flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold capitalize truncate">{sector.sector}</p>
                          <p className="text-[10px] text-muted-foreground">
                            <span className="text-gain font-semibold">{sector.advancing}</span>
                            {' up / '}
                            <span className="text-loss font-semibold">{sector.declining}</span>
                            {' down · '}
                            <span className="font-semibold">{sector.stock_count}</span>
                          </p>
                        </div>
                        <PctChip value={change} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <BarChart3 className="h-6 w-6 mx-auto mb-2 opacity-40" />
                No sector data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ════ Indices + Commodities + Goals ════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Market Indices */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="h-4 w-4 text-info" /> Market Indices
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="divide-y divide-border">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      <div className="h-2.5 w-12 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="text-right space-y-1.5">
                      <div className="h-3 w-16 bg-muted animate-pulse rounded ml-auto" />
                      <div className="h-2.5 w-10 bg-muted animate-pulse rounded ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : indices.length > 0 ? (
              <div className="divide-y divide-border">
                {indices.slice(0, 5).map((idx, i) => (
                  <div key={idx.id ?? idx.symbol ?? `idx-${i}`} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{idx.name}</p>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{idx.symbol}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums">{idx.value?.toLocaleString()}</p>
                      <PctChip value={idx.change_percentage || 0} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No indices data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commodities */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="h-4 w-4 text-[hsl(var(--gold))]" /> Precious Metals
              </CardTitle>
              <Link href="/commodities">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  More <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {isLoading ? (
              <>
                {[0, 1].map(i => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                        <div className="h-2.5 w-14 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="text-right space-y-1.5">
                      <div className="h-3 w-20 bg-muted animate-pulse rounded ml-auto" />
                      <div className="h-2.5 w-12 bg-muted animate-pulse rounded ml-auto" />
                    </div>
                  </div>
                ))}
              </>
            ) : commodities ? (
              <>
                {[
                  { name: 'Gold 24K', symbol: 'Au', data: commodities.gold, accent: 'text-[hsl(var(--gold))] bg-[hsl(var(--gold))/0.12]' },
                  { name: 'Silver', symbol: 'Ag', data: commodities.silver, accent: 'text-foreground/70 bg-muted' },
                ].filter(({ data }) => data).map(({ name, symbol, data, accent }) => (
                  <div key={name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-xs font-black', accent)}>
                        {symbol}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          ${data.price_usd_oz?.toFixed(2)}/oz
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{fmtPKR(data.per_tola)}</p>
                      <PctChip value={data.change_percentage || 0} />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Coins className="h-6 w-6 mx-auto mb-2 opacity-40" />
                Loading commodities…
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals & Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Goals & Alerts
              </CardTitle>
              <Link href="/goals">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  Open <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-primary/5 rounded-lg p-2.5">
                <p className="text-2xl font-black text-primary tabular-nums">{goals?.active || 0}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">Active</p>
              </div>
              <div className="bg-gain/5 rounded-lg p-2.5">
                <p className="text-2xl font-black text-gain tabular-nums">{goals?.achieved || 0}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">Achieved</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-2.5">
                <p className="text-2xl font-black tabular-nums">{goals?.overall_progress?.toFixed(0) || 0}%</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">Progress</p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                <span>Overall Progress</span>
                <span>{goals?.overall_progress?.toFixed(0) || 0}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(goals?.overall_progress || 0, 100)}%` }}
                />
              </div>
            </div>

            {/* Notifications row */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <div className="text-center">
                <p className="text-base font-bold tabular-nums">{notifications?.unread_count ?? quickStats?.notifications?.unread ?? 0}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Unread</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold tabular-nums">{notifications?.active_alerts || 0}</p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ════ Footer ═════════════════════════════════════════════════════ */}
      <div className="text-center text-xs text-muted-foreground pt-2">
        {data?.timestamp ? `Last refreshed ${timeAgo(data.timestamp)}` : ''}
      </div>
    </div>
  );
}
