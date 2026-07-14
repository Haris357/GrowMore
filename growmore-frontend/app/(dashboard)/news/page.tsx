'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Search, RefreshCw, Sparkles, TrendingUp, TrendingDown, Minus,
  Globe, Landmark, Swords, Gem, Bitcoin, Building2, Newspaper, ArrowUpRight, ExternalLink,
} from 'lucide-react';

interface NewsItem {
  category: string;
  headline: string;
  summary: string;
  content?: string;
  sentiment: string;
  source_url: string;
  source_name: string;
  published?: string;
  image_url: string | null;
}
interface Brief {
  mood: string;
  headline: string;
  summary: string;
  key_points: string[];
  impact_on_pakistan: string;
}
interface Feed {
  brief: Brief;
  items: NewsItem[];
  generated_at?: string;
  model?: string;
}

const CATS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  markets: { label: 'Markets', icon: Landmark, color: 'text-emerald-500' },
  global: { label: 'Global', icon: Globe, color: 'text-sky-500' },
  geopolitics: { label: 'Geopolitics', icon: Swords, color: 'text-red-500' },
  commodities: { label: 'Commodities', icon: Gem, color: 'text-amber-500' },
  crypto: { label: 'Crypto', icon: Bitcoin, color: 'text-orange-500' },
  economy: { label: 'Economy', icon: Building2, color: 'text-violet-500' },
};

const TABS = ['all', 'markets', 'global', 'geopolitics', 'commodities', 'crypto', 'economy'];

function sentiment(s: string) {
  if (s === 'bullish') return { chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: TrendingUp, label: 'Bullish' };
  if (s === 'bearish') return { chip: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: TrendingDown, label: 'Bearish' };
  return { chip: 'bg-muted text-muted-foreground', icon: Minus, label: 'Neutral' };
}

export default function NewsPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<NewsItem | null>(null);

  const load = async (refresh = false) => {
    setLoading(true);
    try {
      const res = await api.get('/news/ai', { params: { count: 16, ...(refresh ? { refresh: true } : {}) }, timeout: 120000 });
      setFeed(res.data);
    } catch {
      setFeed(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const items = feed?.items || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (tab !== 'all' && it.category !== tab) return false;
      if (q && !it.headline.toLowerCase().includes(q) && !it.summary.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, tab, query]);

  const catCount = (c: string) => (c === 'all' ? items.length : items.filter((i) => i.category === c).length);

  return (
    <div className="mx-auto max-w-[1200px] pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI News Desk
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">GrowNews</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Market news researched live by AI — PSX, global markets, geopolitics, commodities and crypto — summarized with sentiment and linked to real sources.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => load(true)} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {/* Loading banner */}
      {loading && (
        <div className="mt-8 flex items-center gap-3 rounded-xl border bg-primary/[0.04] px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">
            {feed ? (
              <>
                <span className="font-medium text-foreground">Researching the latest news live across the web…</span>{' '}
                this takes ~15 seconds.
              </>
            ) : (
              'Loading the latest saved market news…'
            )}
          </p>
        </div>
      )}

      {/* Market brief */}
      <div className="mt-8">
        {loading && !feed ? (
          <Skeleton className="h-44 rounded-2xl" />
        ) : feed?.brief ? (
          <MarketBrief brief={feed.brief} />
        ) : null}
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const meta = CATS[t];
            const Icon = meta?.icon;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium capitalize transition-colors',
                  tab === t ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {t === 'all' ? 'All' : meta?.label || t}
                <span className={cn('text-xs', tab === t ? 'text-background/70' : 'text-muted-foreground/60')}>{catCount(t)}</span>
              </button>
            );
          })}
        </div>
        <div className="relative lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search news…" className="h-10 rounded-full pl-9" />
        </div>
      </div>

      {/* Grid */}
      <div className="mt-6">
        {loading && !feed ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            <Newspaper className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No stories in this category right now.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((it, i) => <NewsCard key={`${it.headline}-${i}`} item={it} onOpen={() => setSelected(it)} />)}
          </div>
        )}
      </div>

      {feed?.model && (
        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          Researched by AI from live web sources · {feed.model}. Not investment advice.
        </p>
      )}

      <NewsDetail item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NewsDetail({ item, onClose }: { item: NewsItem | null; onClose: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => setImgOk(true), [item]);
  if (!item) return null;
  const cat = CATS[item.category] || { label: item.category, icon: Newspaper, color: 'text-muted-foreground' };
  const CatIcon = cat.icon;
  const sen = sentiment(item.sentiment);
  const paragraphs = (item.content || item.summary || '').split(/\n{2,}/).filter((p) => p.trim());

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        {item.image_url && imgOk && (
          <div className="relative aspect-[16/8] w-full overflow-hidden bg-muted">
            <img src={item.image_url} alt="" onError={() => setImgOk(false)} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              <CatIcon className={cn('h-3 w-3', cat.color)} /> {cat.label}
            </span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium', sen.chip)}>
              <sen.icon className="h-3 w-3" /> {sen.label}
            </span>
            {item.published && <span className="text-xs text-muted-foreground">{item.published}</span>}
          </div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight">{item.headline}</h2>
          <div className="mt-4 space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-foreground/90">{p}</p>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Source · {item.source_name}</span>
            {item.source_url && (
              <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Read original <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MarketBrief({ brief }: { brief: Brief }) {
  const mood = brief.mood === 'bullish'
    ? { chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: TrendingUp }
    : brief.mood === 'bearish'
      ? { chip: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: TrendingDown }
      : { chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: Minus };
  const MoodIcon = mood.icon;
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/[0.06] via-card to-card p-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> AI Market Brief
        </span>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize', mood.chip)}>
          <MoodIcon className="h-3.5 w-3.5" /> {brief.mood}
        </span>
      </div>
      <h2 className="mt-3 text-xl font-bold tracking-tight">{brief.headline}</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{brief.summary}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {brief.key_points.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Key points</p>
            <ul className="space-y-1.5">
              {brief.key_points.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/85">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {brief.impact_on_pakistan && (
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Landmark className="h-3.5 w-3.5" /> Impact on Pakistan
            </p>
            <p className="text-sm text-foreground/85">{brief.impact_on_pakistan}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NewsCard({ item, onOpen }: { item: NewsItem; onOpen: () => void }) {
  const cat = CATS[item.category] || { label: item.category, icon: Newspaper, color: 'text-muted-foreground' };
  const CatIcon = cat.icon;
  const sen = sentiment(item.sentiment);
  const SenIcon = sen.icon;
  const [imgOk, setImgOk] = useState(true);

  return (
    <button
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {item.image_url && imgOk ? (
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40">
            <CatIcon className={cn('h-10 w-10 opacity-40', cat.color)} />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
          <CatIcon className={cn('h-3 w-3', cat.color)} /> {cat.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', sen.chip)}>
            <SenIcon className="h-3 w-3" /> {sen.label}
          </span>
        </div>
        <h3 className="text-sm font-bold leading-snug line-clamp-2">{item.headline}</h3>
        <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">{item.summary}</p>
        <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[11px] text-muted-foreground">
          <span className="truncate">{item.source_name}</span>
          <span className="inline-flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Read <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </button>
  );
}
