'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StockLogo } from '@/components/stocks/stock-logo';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Search, FileText, Share2, ArrowLeft, TrendingUp, Users, Megaphone, Coins, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

const PER_PAGE = 20;

interface Item {
  date: string;
  time?: string;
  title: string;
  category: 'earnings' | 'insider' | 'announcement' | 'payout';
  symbol?: string | null;
  document_url?: string | null;
}

const CATS = {
  earnings: { label: 'Earnings', color: 'text-amber-500', dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: TrendingUp },
  insider: { label: 'Insider', color: 'text-violet-500', dot: 'bg-violet-500', chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', icon: Users },
  announcement: { label: 'Announcement', color: 'text-sky-500', dot: 'bg-sky-500', chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', icon: Megaphone },
  payout: { label: 'Payout', color: 'text-emerald-500', dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: Coins },
} as const;

type Tab = 'all' | 'earnings' | 'insider' | 'announcement' | 'payout';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All Updates' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'insider', label: 'Insider Activity' },
  { key: 'announcement', label: 'Announcements' },
  { key: 'payout', label: 'Payouts' },
];

export default function MarketActivityPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // Reset to first page whenever the filter changes
  useEffect(() => { setPage(1); }, [tab, query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/market/activity', { params: { count: 200 } });
        if (!cancelled) {
          setItems(res.data?.items || []);
          setCounts(res.data?.counts || {});
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (tab !== 'all' && it.category !== tab) return false;
      if (q && !it.title.toLowerCase().includes(q) && !(it.symbol || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, tab, query]);

  const tabCount = (t: Tab) => (t === 'all' ? counts.all ?? items.length : counts[t] ?? 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="mx-auto max-w-[1100px] pb-16">
      {/* Header */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live Feed
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Market Activity</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Announcements, insider trades, and payouts from the <span className="font-semibold text-foreground">Pakistan Stock Exchange</span>,
          categorized and linked to source documents.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-sm">
          <span className="text-lg font-bold">{counts.all ?? items.length}</span>
          <span className="h-6 w-px bg-border" />
          {(['earnings', 'insider', 'announcement', 'payout'] as const).map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', CATS[c].dot)} />
              <span className="font-semibold">{counts[c] ?? 0}</span>
              <span className="text-muted-foreground">{CATS[c].label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Feed card */}
      <div className="mt-8 rounded-2xl border">
        {/* Controls */}
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  tab === t.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {t.label}
                <span className={cn('text-xs', tab === t.key ? 'text-background/70' : 'text-muted-foreground/70')}>{tabCount(t.key)}</span>
              </button>
            ))}
          </div>
          <div className="relative lg:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company or keyword..." className="h-10 rounded-full pl-9" />
          </div>
        </div>

        {/* Items */}
        {loading ? (
          <div className="divide-y">
            {[...Array(6)].map((_, i) => <div key={i} className="p-5"><Skeleton className="h-14 w-full rounded-lg" /></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            <Activity className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No activity matches your filters.
          </div>
        ) : (
          <div className="divide-y">
            {paged.map((it, i) => {
              const cat = CATS[it.category] ?? CATS.announcement;
              const Icon = cat.icon;
              return (
                <div key={`${it.title}-${i}`} className="flex gap-3.5 p-5 hover:bg-muted/20">
                  {it.symbol ? (
                    <StockLogo symbol={it.symbol} className="h-9 w-9 shrink-0 rounded-full" />
                  ) : (
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', cat.chip)}>
                      <Icon className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {it.symbol && <span className="text-sm font-bold">{it.symbol}</span>}
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', cat.chip)}>{cat.label}</span>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                        {it.date}{it.time ? ` · ${it.time}` : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-snug text-foreground/90">{it.title}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      {it.document_url ? (
                        <a href={it.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <FileText className="h-3.5 w-3.5" /> View document
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground/50"><FileText className="h-3.5 w-3.5" /> No document</span>
                      )}
                      <button className="text-muted-foreground hover:text-foreground"><Share2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PER_PAGE && (
          <div className="flex items-center justify-between gap-4 border-t p-4">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-sm font-medium disabled:opacity-40 enabled:hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-sm font-medium disabled:opacity-40 enabled:hover:bg-muted"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link href="/stocks" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to stocks
        </Link>
      </div>
    </div>
  );
}
