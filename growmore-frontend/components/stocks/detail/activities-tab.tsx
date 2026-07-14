'use client';

import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { StockLogo } from '@/components/stocks/stock-logo';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Search, ExternalLink, Share2, FileText } from 'lucide-react';

interface Activity {
  date: string | null;
  date_label?: string;
  title: string;
  category: string;
  priority: 'critical' | 'high' | 'medium';
  document_url: string | null;
}

const PRIORITIES: Activity['priority'][] = ['critical', 'high', 'medium'];

const PRIORITY_STYLE: Record<Activity['priority'], string> = {
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
  high: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  medium: 'bg-muted text-muted-foreground',
};

function formatDate(a: Activity): string {
  if (a.date) {
    const d = new Date(a.date);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  return a.date_label || '';
}

export function ActivitiesTab({
  stockId,
  symbol,
  logoUrl,
  active,
}: {
  stockId: string;
  symbol: string;
  logoUrl?: string | null;
  active: boolean;
}) {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<Activity['priority'] | null>(null);

  useEffect(() => {
    setItems([]);
    setLoaded(false);
    setQuery('');
    setPriority(null);
  }, [stockId]);

  useEffect(() => {
    if (!active || loaded || loading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/stocks/${stockId}/activities`);
        if (!cancelled) setItems(res.data?.activities || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, stockId, loaded, loading]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (a) => (!priority || a.priority === priority) && (!q || a.title.toLowerCase().includes(q)),
    );
  }, [items, query, priority]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 rounded-lg" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activities"
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="uppercase tracking-wide text-muted-foreground">Priority</span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setPriority(priority === p ? null : p)}
              className={cn(
                'capitalize transition-colors',
                priority === p ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12 border rounded-lg">
          {items.length === 0 ? 'No recent activities for this company.' : 'No activities match your filters.'}
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {filtered.map((a, i) => (
            <div key={`${a.date}-${i}`} className="flex gap-3 py-4">
              <StockLogo symbol={symbol} logoUrl={logoUrl} className="h-9 w-9 rounded-full shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{symbol}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', PRIORITY_STYLE[a.priority])}>
                      {a.category}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{formatDate(a)}</span>
                </div>
                <p className="mt-1 text-sm text-foreground/90 leading-snug">{a.title}</p>
                <div className="mt-2 flex items-center gap-4 text-xs">
                  {a.document_url ? (
                    <a
                      href={a.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" /> View document
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground/60">
                      <FileText className="h-3.5 w-3.5" /> No document
                    </span>
                  )}
                  <button className="text-muted-foreground hover:text-foreground">
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                  {a.document_url && (
                    <a
                      href={a.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
