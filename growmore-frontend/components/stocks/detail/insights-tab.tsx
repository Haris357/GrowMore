'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Zap, AlertTriangle, Eye, ExternalLink, Globe } from 'lucide-react';

interface Source { title: string; url: string; outlet: string }
interface Insights {
  sentiment: 'BULLISH' | 'MIXED' | 'BEARISH' | 'QUIET';
  score: number;
  headline: string;
  summary: string;
  bull_points: string[];
  bear_points: string[];
  catalysts: string[];
  risks: string[];
  what_to_watch: string;
  sources: Source[];
  model?: string | null;
  generated_at?: string;
  _fallback?: boolean;
}

const SENTIMENT: Record<Insights['sentiment'], { label: string; ring: string; text: string; bar: string; chip: string }> = {
  BULLISH: { label: 'Bullish', ring: 'ring-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-500', bar: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  MIXED: { label: 'Mixed', ring: 'ring-amber-500/30', text: 'text-amber-600 dark:text-amber-500', bar: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  BEARISH: { label: 'Bearish', ring: 'ring-red-500/30', text: 'text-red-600 dark:text-red-500', bar: 'bg-red-500', chip: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  QUIET: { label: 'Quiet', ring: 'ring-muted', text: 'text-muted-foreground', bar: 'bg-muted-foreground', chip: 'bg-muted text-muted-foreground' },
};

export function InsightsTab({ stockId, symbol, active }: { stockId: string; symbol: string; active: boolean }) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async (refresh = false) => {
    setLoading(true);
    try {
      const res = await api.get(`/stocks/${stockId}/insights`, { params: refresh ? { refresh: true } : {}, timeout: 90000 });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  useEffect(() => { setData(null); setLoaded(false); }, [stockId]);
  useEffect(() => { if (active && !loaded && !loading) load(); /* eslint-disable-next-line */ }, [active, stockId, loaded]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse text-primary" /> Researching {symbol} across the web…
        </div>
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!data || data._fallback) {
    return (
      <div className="py-12 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />
        <p className="text-sm font-medium">{data?.summary || 'AI insights unavailable'}</p>
        <Button size="sm" className="mt-4 gap-2" onClick={() => load(true)}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    );
  }

  const s = SENTIMENT[data.sentiment] ?? SENTIMENT.MIXED;

  return (
    <div className="space-y-4">
      {/* Sentiment header */}
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide', s.chip)}>{s.label}</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> AI · live web sources
                </span>
              </div>
              <p className="text-base font-bold leading-snug">{data.headline}</p>
            </div>
            <div className="flex shrink-0 flex-col items-center">
              <div className={cn('flex h-16 w-16 items-center justify-center rounded-full ring-4', s.ring)}>
                <span className={cn('text-2xl font-bold tabular-nums', s.text)}>{data.score}</span>
              </div>
              <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Sentiment</span>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full transition-all', s.bar)} style={{ width: `${Math.max(2, Math.min(100, data.score))}%` }} />
          </div>
          {data.summary && <p className="mt-4 text-sm leading-relaxed text-foreground/90">{data.summary}</p>}
        </CardContent>
      </Card>

      {/* Bull / Bear */}
      {(data.bull_points.length > 0 || data.bear_points.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PointList title="Bull case" icon={TrendingUp} tone="good" points={data.bull_points} />
          <PointList title="Bear case" icon={TrendingDown} tone="bad" points={data.bear_points} />
        </div>
      )}

      {/* Catalysts / Risks */}
      {(data.catalysts.length > 0 || data.risks.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.catalysts.length > 0 && <PointList title="Catalysts" icon={Zap} tone="neutral" points={data.catalysts} />}
          {data.risks.length > 0 && <PointList title="Risks" icon={AlertTriangle} tone="bad" points={data.risks} />}
        </div>
      )}

      {/* What to watch */}
      {data.what_to_watch && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">What to watch</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">{data.what_to_watch}</CardContent>
        </Card>
      )}

      {/* Sources */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Globe className="h-4 w-4 text-primary" /> Sources
            <span className="text-xs font-normal text-muted-foreground">{data.sources.length}</span>
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {data.sources.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">No public sources surfaced for this stock right now.</p>
          ) : (
            data.sources.map((src, i) => (
              <a
                key={`${src.url}-${i}`}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/40"
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${src.outlet}&sz=32`}
                  alt=""
                  className="h-5 w-5 shrink-0 rounded"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{src.title}</p>
                  <p className="text-[11px] text-muted-foreground">{src.outlet}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))
          )}
        </CardContent>
      </Card>

      <p className="pt-1 text-center text-[10px] text-muted-foreground">
        Generated by AI from live web search. Not investment advice.
      </p>
    </div>
  );
}

function PointList({
  title,
  icon: Icon,
  tone,
  points,
}: {
  title: string;
  icon: React.ElementType;
  tone: 'good' | 'bad' | 'neutral';
  points: string[];
}) {
  if (points.length === 0) return null;
  const color = tone === 'good' ? 'text-emerald-500' : tone === 'bad' ? 'text-red-500' : 'text-amber-500';
  const dot = tone === 'good' ? 'bg-emerald-500' : tone === 'bad' ? 'bg-red-500' : 'bg-amber-500';
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Icon className={cn('h-4 w-4', color)} />
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {points.map((p, i) => (
          <div key={i} className="flex gap-2.5 text-sm">
            <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', dot)} />
            <span className="leading-snug text-foreground/90">{p}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
