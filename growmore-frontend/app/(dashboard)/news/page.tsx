'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, Minus, Sparkles, RefreshCw, Search, Newspaper,
  LineChart, Coins, Bitcoin, BarChart3, ChevronDown, ChevronUp,
  AlertCircle, MapPin, Globe, ChevronLeft, ChevronRight, Quote,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import type {
  GrowNewsArticle, GrowNewsFeed, GrowNewsFeature,
  GrowNewsBrief, GrowNewsSentiment,
} from '@/types/news';

// ─── Constants ────────────────────────────────────────────────────────────────

type Category = 'all' | 'pakistan' | 'stocks' | 'crypto' | 'commodities' | 'global';

const CATEGORIES: { value: Category; label: string; icon: React.ReactNode }[] = [
  { value: 'all',         label: 'Front Page',  icon: <Newspaper className="h-3.5 w-3.5" /> },
  { value: 'pakistan',    label: 'Pakistan',    icon: <MapPin className="h-3.5 w-3.5" /> },
  { value: 'stocks',      label: 'Markets',     icon: <LineChart className="h-3.5 w-3.5" /> },
  { value: 'crypto',      label: 'Crypto',      icon: <Bitcoin className="h-3.5 w-3.5" /> },
  { value: 'commodities', label: 'Commodities', icon: <Coins className="h-3.5 w-3.5" /> },
  { value: 'global',      label: 'World',       icon: <BarChart3 className="h-3.5 w-3.5" /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string) {
  if (!dateStr) return 'Recently';
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); }
  catch { return 'Recently'; }
}

function articleSummary(a: GrowNewsArticle) {
  return a.ai_summary || a.summary || a.description || '';
}

function sentimentChip(s?: string) {
  if (s === 'positive')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gain">
        <TrendingUp className="h-3 w-3" /> Bullish
      </span>
    );
  if (s === 'negative')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-loss">
        <TrendingDown className="h-3 w-3" /> Bearish
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      <Minus className="h-3 w-3" /> Neutral
    </span>
  );
}

function impactPill(impact?: string) {
  if (impact === 'high')
    return (
      <span className="inline-flex items-center px-1.5 py-px rounded-sm bg-loss/10 text-loss text-[9px] font-bold uppercase tracking-wider border border-loss/30">
        High Impact
      </span>
    );
  if (impact === 'medium')
    return (
      <span className="inline-flex items-center px-1.5 py-px rounded-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[9px] font-bold uppercase tracking-wider border border-yellow-500/30">
        Medium
      </span>
    );
  return null;
}

// ─── Article Image ────────────────────────────────────────────────────────────

function ArticleImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setErr(true)}
      loading="lazy"
    />
  );
}

// ─── Section Bar ──────────────────────────────────────────────────────────────

function SectionBar({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className={`h-px flex-1 ${accent ? 'bg-primary' : 'bg-foreground/30'}`} />
      <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-foreground whitespace-nowrap">
        {label}
      </h2>
      <div className={`h-px flex-1 ${accent ? 'bg-primary' : 'bg-foreground/30'}`} />
    </div>
  );
}

// ─── Lead Story (Front Page Hero) ─────────────────────────────────────────────

function LeadStory({ article }: { article: GrowNewsArticle }) {
  const summary = articleSummary(article);
  return (
    <article className="border-y-2 border-foreground/80 py-5 md:py-6">
      <div className="grid md:grid-cols-5 gap-5 md:gap-6">
        {/* Image */}
        {article.image_url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="md:col-span-3 block group relative overflow-hidden bg-muted aspect-[16/10]"
          >
            <ArticleImage
              src={article.image_url}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
            <div className="absolute top-3 left-3 px-2 py-1 bg-background/95 backdrop-blur text-[9px] font-black uppercase tracking-widest border border-border">
              Lead Story
            </div>
          </a>
        )}

        {/* Headline + body */}
        <div className={article.image_url ? 'md:col-span-2 flex flex-col justify-center' : 'md:col-span-5'}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {sentimentChip(article.sentiment)}
            {impactPill(article.impact)}
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              · {article.source_name}
            </span>
          </div>

          <a href={article.url} target="_blank" rel="noopener noreferrer" className="group">
            <h1 className="text-2xl md:text-4xl font-black leading-[1.05] tracking-tight mb-3 group-hover:text-primary transition-colors">
              {article.title}
            </h1>
          </a>

          {summary && (
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed line-clamp-4 first-letter:font-serif first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-1.5 first-letter:mt-0.5 first-letter:text-primary">
              {summary}
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {timeAgo(article.published_at)}
            </span>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
            >
              Continue Reading →
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Column Story (Featured 3-up) ─────────────────────────────────────────────

function ColumnStory({ article }: { article: GrowNewsArticle }) {
  return (
    <article className="group">
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
        {article.image_url && (
          <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted mb-2.5">
            <ArticleImage
              src={article.image_url}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
            />
          </div>
        )}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {sentimentChip(article.sentiment)}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            · {article.source_name}
          </span>
        </div>
        <h3 className="font-black text-base leading-snug tracking-tight line-clamp-3 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1.5 uppercase tracking-wider font-medium">
          {timeAgo(article.published_at)}
        </p>
      </a>
    </article>
  );
}

// ─── Article Row (List Items) ─────────────────────────────────────────────────

function ArticleRow({ article }: { article: GrowNewsArticle }) {
  const summary = articleSummary(article);
  return (
    <article className="grid grid-cols-[1fr_auto] gap-4 py-4 border-b border-border last:border-0 group">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {sentimentChip(article.sentiment)}
          {impactPill(article.impact)}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            · {article.source_name}
          </span>
        </div>
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          <h3 className="font-bold text-base md:text-lg leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition-colors mb-1">
            {article.title}
          </h3>
        </a>
        {summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {summary}
          </p>
        )}
        <p className="text-[10px] mt-2 font-semibold uppercase tracking-wider text-muted-foreground/80">
          {timeAgo(article.published_at)}
        </p>
      </div>

      {article.image_url && (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 w-24 h-24 sm:w-32 sm:h-24 overflow-hidden bg-muted"
        >
          <ArticleImage
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </a>
      )}
    </article>
  );
}

// ─── Compact Brief Row (used in sidebar lists) ────────────────────────────────

function BriefRow({ article, index }: { article: GrowNewsArticle; index: number }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 py-3 border-b border-border last:border-0 group"
    >
      <span className="font-serif text-2xl font-black text-foreground/15 leading-none w-8 shrink-0 mt-0.5">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors tracking-tight">
          {article.title}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 font-semibold uppercase tracking-wider">
          {article.source_name} · {timeAgo(article.published_at)}
        </p>
      </div>
    </a>
  );
}

// ─── Editor's Note (AI Brief) ─────────────────────────────────────────────────

function EditorsNote({ brief }: { brief: GrowNewsBrief }) {
  const [expanded, setExpanded] = useState(false);

  const moodColor = brief.sentiment === 'bullish'
    ? 'text-gain' : brief.sentiment === 'bearish'
    ? 'text-loss' : 'text-muted-foreground';

  const moodIcon = brief.sentiment === 'bullish'
    ? <TrendingUp className="h-4 w-4" />
    : brief.sentiment === 'bearish'
    ? <TrendingDown className="h-4 w-4" />
    : <Minus className="h-4 w-4" />;

  return (
    <section className="border-2 border-foreground/80 bg-background">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm uppercase tracking-wider">Editor's Brief</span>
              <span className={`flex items-center gap-1 text-xs font-bold capitalize ${moodColor}`}>
                {moodIcon}
                {brief.sentiment}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
              {brief.article_count} stories analysed · {timeAgo(brief.generated_at)}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
          <div className="relative pl-5">
            <Quote className="h-4 w-4 absolute left-0 top-0.5 text-primary/60" />
            <p className="text-sm text-foreground/90 leading-relaxed italic">
              {brief.brief}
            </p>
          </div>

          {brief.key_points.length > 0 && (
            <div className="border-l-2 border-primary/40 pl-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Key Points</p>
              <ul className="space-y-1">
                {brief.key_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-primary font-bold mt-0.5">›</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {brief.impact_on_pakistan && (
            <div className="bg-muted/50 p-3 border-l-2 border-foreground/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground mb-1 flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Pakistan Outlook
              </p>
              <p className="text-sm text-foreground/80">{brief.impact_on_pakistan}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Sentiment Gauge ──────────────────────────────────────────────────────────

function SentimentGauge({ sentiment }: { sentiment: GrowNewsSentiment }) {
  const labelColor = sentiment.label === 'Bullish'
    ? 'text-gain' : sentiment.label === 'Bearish'
    ? 'text-loss' : 'text-muted-foreground';

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Market Pulse</p>
        <span className={`text-base font-black ${labelColor}`}>{sentiment.label}</span>
      </div>

      <div className="h-3 flex overflow-hidden border border-border">
        <div className="bg-gain h-full transition-all duration-500" style={{ width: `${sentiment.positive}%` }} />
        <div className="bg-muted-foreground/40 h-full transition-all duration-500" style={{ width: `${sentiment.neutral}%` }} />
        <div className="bg-loss h-full transition-all duration-500" style={{ width: `${sentiment.negative}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="text-base font-black text-gain">{sentiment.positive.toFixed(0)}%</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Bullish</p>
        </div>
        <div>
          <p className="text-base font-black text-muted-foreground">{sentiment.neutral.toFixed(0)}%</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Neutral</p>
        </div>
        <div>
          <p className="text-base font-black text-loss">{sentiment.negative.toFixed(0)}%</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Bearish</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center font-medium pt-1 border-t border-border">
        Based on {sentiment.total_articles} stories · 24h
      </p>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, onChange, disabled,
}: { page: number; totalPages: number; onChange: (p: number) => void; disabled?: boolean }) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const range = 2;
  for (let i = Math.max(1, page - range); i <= Math.min(totalPages, page + range); i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 pt-6 mt-4 border-t border-border">
      <Button
        variant="outline" size="sm"
        disabled={page <= 1 || disabled}
        onClick={() => onChange(page - 1)}
        className="h-8 gap-1"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Prev
      </Button>

      {pages[0] > 1 && (
        <>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 font-bold" onClick={() => onChange(1)}>1</Button>
          {pages[0] > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? 'default' : 'ghost'}
          size="sm"
          className={`h-8 w-8 p-0 font-bold ${p === page ? '' : 'hover:bg-accent'}`}
          onClick={() => onChange(p)}
          disabled={disabled}
        >
          {p}
        </Button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 font-bold" onClick={() => onChange(totalPages)}>
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="outline" size="sm"
        disabled={page >= totalPages || disabled}
        onClick={() => onChange(page + 1)}
        className="h-8 gap-1"
      >
        Next <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function GrowNewsPage() {
  const [featured, setFeatured] = useState<GrowNewsFeature | null>(null);
  const [articles, setArticles] = useState<GrowNewsArticle[]>([]);
  const [brief, setBrief] = useState<GrowNewsBrief | null>(null);
  const [trending, setTrending] = useState<GrowNewsArticle[]>([]);
  const [sentiment, setSentiment] = useState<GrowNewsSentiment | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [heroLoading, setHeroLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setHeroLoading(true);
    Promise.all([
      api.get('/news/featured').catch(() => ({ data: null })),
      api.get('/news/brief').catch(() => ({ data: null })),
      api.get('/news/trending').catch(() => ({ data: null })),
      api.get('/news/sentiment').catch(() => ({ data: null })),
    ]).then(([featRes, briefRes, trendRes, sentRes]) => {
      if (featRes.data) setFeatured(featRes.data);
      if (briefRes.data) setBrief(briefRes.data);
      if (trendRes.data?.articles) setTrending(trendRes.data.articles);
      if (sentRes.data) setSentiment(sentRes.data);
    }).finally(() => setHeroLoading(false));
  }, []);

  const loadFeed = useCallback(async (cat: Category, pg: number) => {
    setFeedLoading(true);
    try {
      const res = await api.get('/news', { params: { category: cat, page: pg, per_page: 20 } });
      const data: GrowNewsFeed = res.data;
      setArticles(data.articles || []);
      setTotalPages(data.total_pages || 1);
      setPage(pg);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setArticles([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSearching) loadFeed(activeCategory, 1);
  }, [activeCategory, loadFeed, isSearching]);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setIsSearching(false);
      loadFeed(activeCategory, 1);
      return;
    }
    setIsSearching(true);
    setFeedLoading(true);
    try {
      const res = await api.get('/news/search', { params: { q } });
      setArticles(res.data?.articles || []);
      setTotalPages(1);
      setPage(1);
    } catch {
      setArticles([]);
    } finally {
      setFeedLoading(false);
    }
  }, [activeCategory, loadFeed]);

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => handleSearch(val), 450);
  };

  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [featRes, briefRes, trendRes, sentRes, feedRes] = await Promise.all([
        api.get('/news/featured').catch(() => ({ data: null })),
        api.get('/news/brief', { params: { category: activeCategory } }).catch(() => ({ data: null })),
        api.get('/news/trending').catch(() => ({ data: null })),
        api.get('/news/sentiment').catch(() => ({ data: null })),
        api.get('/news', { params: { category: activeCategory, page: 1, per_page: 20 } }).catch(() => ({ data: null })),
      ]);
      if (featRes.data) setFeatured(featRes.data);
      if (briefRes.data) setBrief(briefRes.data);
      if (trendRes.data?.articles) setTrending(trendRes.data.articles);
      if (sentRes.data) setSentiment(sentRes.data);
      if (feedRes.data?.articles) { setArticles(feedRes.data.articles); setTotalPages(feedRes.data.total_pages || 1); setPage(1); }
    } finally {
      setRefreshing(false);
    }
  };

  const hero = activeCategory === 'all' && !isSearching
    ? (featured?.hero || articles[0] || null)
    : (articles[0] || null);

  const featuredCards = activeCategory === 'all' && !isSearching
    ? (featured?.featured || articles.slice(1, 4))
    : articles.slice(1, 4);

  const displayArticles = isSearching
    ? articles
    : activeCategory === 'all' && featured
    ? (articles.length > 0 ? articles : featured.latest)
    : articles;

  const mainFeed = displayArticles.slice(hero ? (activeCategory === 'all' && !isSearching ? 0 : 1) : 0);

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const issueNo = format(new Date(), 'yyyyMMdd');

  return (
    <div className="max-w-[1280px] mx-auto px-1 sm:px-2 animate-fade-in">

      {/* ════════════════════════════════════════════════════════════════════════
          MASTHEAD — Newspaper-style nameplate
         ════════════════════════════════════════════════════════════════════════ */}
      <header className="border-b-[3px] border-double border-foreground/80 pb-3 mb-4">
        {/* Edition strip */}
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-2 mb-3">
          <span className="hidden sm:inline">Vol. I · No. {issueNo.slice(-4)}</span>
          <span className="sm:hidden">No. {issueNo.slice(-4)}</span>
          <span className="hidden md:inline">{today}</span>
          <span className="md:hidden">{format(new Date(), 'MMM d, yyyy')}</span>
          <span className="hidden sm:inline">Pakistan Edition</span>
        </div>

        {/* Nameplate */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl md:text-6xl font-black tracking-[-0.04em] leading-none">
              <span className="text-foreground">Grow</span>
              <span className="text-primary">News</span>
            </h1>
            <p className="text-[11px] md:text-xs italic text-muted-foreground mt-1.5 font-medium tracking-wide">
              "Your daily dispatch on markets, money & macro"
            </p>
          </div>

          <div className="flex items-center gap-2 justify-center sm:justify-end">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search the paper…"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="pl-8 h-9 w-full sm:w-56 text-sm border-foreground/30"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-foreground/30 shrink-0"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION NAV — newspaper sections strip
         ════════════════════════════════════════════════════════════════════════ */}
      <nav className="border-b border-foreground/30 mb-5 -mx-1 sm:mx-0">
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none px-1 sm:px-0">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.value && !isSearching;
            return (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-foreground/40'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            );
          })}
          {isSearching && (
            <div className="ml-auto pl-3 flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground italic">"{searchQuery}"</span>
              <button
                onClick={() => { setSearchQuery(''); setIsSearching(false); loadFeed(activeCategory, 1); }}
                className="text-[10px] uppercase tracking-wider font-bold text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════════════════
          EDITOR'S BRIEF
         ════════════════════════════════════════════════════════════════════════ */}
      {brief && <div className="mb-5"><EditorsNote brief={brief} /></div>}

      {/* ════════════════════════════════════════════════════════════════════════
          LEAD STORY + COLUMN STORIES
         ════════════════════════════════════════════════════════════════════════ */}
      {!isSearching && (
        heroLoading ? (
          <div className="border-y-2 border-foreground/30 py-6 my-4">
            <div className="grid md:grid-cols-5 gap-6">
              <div className="md:col-span-3 aspect-[16/10] bg-muted animate-pulse" />
              <div className="md:col-span-2 space-y-3">
                <div className="h-3 w-24 bg-muted animate-pulse" />
                <div className="h-8 bg-muted animate-pulse" />
                <div className="h-8 bg-muted animate-pulse w-3/4" />
                <div className="h-3 bg-muted animate-pulse" />
                <div className="h-3 bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ) : hero ? (
          <>
            <LeadStory article={hero} />

            {featuredCards.length > 0 && (
              <>
                <SectionBar label="Top Stories" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6 pb-2">
                  {featuredCards.slice(0, 3).map((a, i) => (
                    <ColumnStory key={a.url || i} article={a} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : null
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MAIN GRID — Latest feed + Sidebar
         ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-3 mt-2">

        {/* LEFT: Feed */}
        <main className="lg:col-span-2">
          <SectionBar
            label={isSearching ? `Search Results` : (CATEGORIES.find(c => c.value === activeCategory)?.label || 'Latest') + ' Wire'}
            accent
          />

          {feedLoading ? (
            <div>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-4 py-4 border-b border-border">
                  <div className="space-y-2">
                    <div className="h-3 w-32 bg-muted animate-pulse" />
                    <div className="h-5 bg-muted animate-pulse" />
                    <div className="h-3 bg-muted animate-pulse w-4/5" />
                  </div>
                  <div className="w-24 h-24 bg-muted animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : mainFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-bold text-base">No stories to show</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {isSearching
                  ? 'No articles match your search. Try different keywords.'
                  : 'The wire is quiet for this section. Try another category or refresh.'}
              </p>
            </div>
          ) : (
            <>
              <div>
                {mainFeed.map((a, i) => (
                  <ArticleRow key={a.url || i} article={a} />
                ))}
              </div>

              {!isSearching && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={(p) => loadFeed(activeCategory, p)}
                  disabled={feedLoading}
                />
              )}
            </>
          )}
        </main>

        {/* RIGHT: Sidebar */}
        <aside className="space-y-6 lg:border-l lg:border-foreground/20 lg:pl-6">

          {/* Market Pulse */}
          <section>
            <SectionBar label="Market Pulse" />
            {sentiment ? (
              <SentimentGauge sentiment={sentiment} />
            ) : (
              <div className="h-24 bg-muted animate-pulse" />
            )}
          </section>

          {/* Trending */}
          <section>
            <SectionBar label="Most Read" />
            {trending.length === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 py-3 border-b border-border">
                    <div className="w-8 h-6 bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted animate-pulse" />
                      <div className="h-3 bg-muted animate-pulse w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {trending.slice(0, 8).map((a, i) => (
                  <BriefRow key={a.url || i} article={a} index={i} />
                ))}
              </div>
            )}
          </section>

          {/* Sources */}
          <section>
            <SectionBar label="Wire Services" />
            <div className="flex flex-wrap gap-1.5">
              {[
                'Reuters', 'Bloomberg', 'CNBC', 'Forbes',
                'CoinDesk', 'CoinTelegraph', 'Decrypt',
                'Business Recorder', 'Dawn', 'The News',
                'Kitco', 'CryptoPanic',
              ].map((src) => (
                <span
                  key={src}
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-border text-muted-foreground"
                >
                  {src}
                </span>
              ))}
            </div>
          </section>

          {/* Footer */}
          <section className="pt-4 border-t border-foreground/30 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <Globe className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">GrowNews Wire</span>
            </div>
            <p className="text-[10px] text-muted-foreground italic font-medium">
              AI-curated · Updated continuously
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
