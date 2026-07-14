'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BrokerAvatar } from '@/components/stocks/broker-avatar';
import { StockLogo } from '@/components/stocks/stock-logo';
import { StockDetailDrawer } from '@/components/stocks/stock-detail-drawer';
import { api } from '@/lib/api';
import type { StockQuote } from '@/types/market';
import { Search, Star, Trophy, ArrowLeft, X, Loader2 } from 'lucide-react';

// ── Hardcoded 2026 Broker Top Picks ─────────────────────────────────────────

interface Broker { code: string; name: string }

const BROKERS: Broker[] = [
  { code: 'BMA', name: 'BMA Capital' },
  { code: 'INSIGHT', name: 'Insight' },
  { code: 'TAURUS', name: 'Taurus' },
  { code: 'IIS', name: 'IIS' },
  { code: 'FOUNDATION', name: 'Foundation' },
  { code: 'IGI', name: 'IGI' },
  { code: 'TOPLINE', name: 'Topline' },
  { code: 'ALHABIB', name: 'Al-Habib' },
  { code: 'KTRADE', name: 'K-Trade' },
  { code: 'AHL', name: 'AHL' },
  { code: 'DARSON', name: 'Darson' },
  { code: 'ALPHA', name: 'Alpha' },
  { code: 'INTER', name: 'Inter' },
  { code: 'AKD', name: 'AKD' },
  { code: 'JSGLOBAL', name: 'JS Global' },
];

const BROKER_BY_NAME = Object.fromEntries(BROKERS.map((b) => [b.name, b]));

const YTD: { name: string; pct: number }[] = [
  { name: 'Inter', pct: 3.7 }, { name: 'Topline', pct: 2.6 }, { name: 'IIS', pct: 1.5 },
  { name: 'AKD', pct: 0.8 }, { name: 'IGI', pct: -0.0 }, { name: 'Darson', pct: -1.3 },
  { name: 'Insight', pct: -1.8 }, { name: 'BMA Capital', pct: -1.8 }, { name: 'Taurus', pct: -2.2 },
  { name: 'AHL', pct: -2.5 }, { name: 'JS Global', pct: -3.1 }, { name: 'K-Trade', pct: -4.4 },
  { name: 'Al-Habib', pct: -4.6 }, { name: 'Foundation', pct: -4.7 }, { name: 'Alpha', pct: -5.6 },
];

interface Pick { symbol: string; name: string; alpha?: boolean; brokers: string[] }

const PICKS: Pick[] = [
  { symbol: 'PPL', name: 'Pakistan Petroleum Limited', brokers: ['Insight', 'Taurus', 'IIS', 'Foundation', 'IGI', 'Al-Habib', 'K-Trade', 'AHL', 'Darson', 'Alpha', 'Inter', 'AKD', 'JS Global', 'Topline'] },
  { symbol: 'PSO', name: 'Pakistan State Oil Company Limited', brokers: ['Insight', 'Taurus', 'Foundation', 'IGI', 'Al-Habib', 'K-Trade', 'AHL', 'Alpha', 'Inter', 'AKD', 'JS Global'] },
  { symbol: 'FFC', name: 'Fauji Fertilizer Company Limited', brokers: ['Taurus', 'IIS', 'IGI', 'Al-Habib', 'K-Trade', 'AHL', 'Darson', 'Alpha', 'AKD', 'JS Global', 'Topline'] },
  { symbol: 'OGDC', name: 'Oil & Gas Development Company Limited', brokers: ['Taurus', 'IIS', 'Foundation', 'IGI', 'Al-Habib', 'AHL', 'Darson', 'Inter', 'AKD', 'JS Global', 'Topline'] },
  { symbol: 'FCCL', name: 'Fauji Cement Company Limited', brokers: ['BMA Capital', 'Insight', 'Taurus', 'Al-Habib', 'K-Trade', 'AHL', 'Darson', 'Alpha', 'AKD', 'JS Global'] },
  { symbol: 'LUCK', name: 'Lucky Cement Limited', brokers: ['Taurus', 'IIS', 'Foundation', 'IGI', 'Al-Habib', 'K-Trade', 'AKD', 'JS Global', 'Topline'] },
  { symbol: 'MEBL', name: 'Meezan Bank Limited', brokers: ['Taurus', 'Al-Habib', 'AHL', 'Darson', 'Inter', 'AKD', 'JS Global', 'Topline'] },
  { symbol: 'ILP', name: 'Interloop Limited', brokers: ['Taurus', 'IIS', 'Foundation', 'IGI', 'Al-Habib', 'AKD', 'JS Global'] },
  { symbol: 'UBL', name: 'United Bank Limited', brokers: ['IIS', 'Foundation', 'IGI', 'K-Trade', 'Darson', 'AKD', 'JS Global'] },
  { symbol: 'HBL', name: 'Habib Bank Limited', brokers: ['Taurus', 'Al-Habib', 'K-Trade', 'Inter', 'AKD', 'JS Global', 'Topline'] },
  { symbol: 'INDU', name: 'Indus Motor Company Limited', brokers: ['Taurus', 'IGI', 'Al-Habib', 'AHL', 'Darson', 'AKD'] },
  { symbol: 'SYS', name: 'Systems Limited', alpha: true, brokers: ['K-Trade', 'AHL', 'AKD', 'JS Global', 'Topline', 'Alpha'] },
  { symbol: 'ISL', name: 'International Steels Limited', brokers: ['BMA Capital', 'Taurus', 'Foundation', 'IGI', 'AKD'] },
  { symbol: 'DGKC', name: 'D.G. Khan Cement Company Limited', brokers: ['BMA Capital', 'AKD', 'JS Global'] },
  { symbol: 'ENGROH', name: 'Engro Holdings Limited', alpha: true, brokers: ['AKD', 'Topline', 'K-Trade'] },
  { symbol: 'NML', name: 'Nishat Mills Limited', brokers: ['AKD'] },
];

type Consensus = 'all' | 'high' | 'medium' | 'low' | 'alpha';

const CONSENSUS_TABS: { key: Consensus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High (5+)' },
  { key: 'medium', label: 'Medium (3-4)' },
  { key: 'low', label: 'Low (<3)' },
  { key: 'alpha', label: 'Alpha Only' },
];

function pctColor(v: number) {
  return v > 0 ? 'text-emerald-600 dark:text-emerald-500' : v < 0 ? 'text-red-500' : 'text-muted-foreground';
}

export default function BrokerPicksPage() {
  const [query, setQuery] = useState('');
  const [consensus, setConsensus] = useState<Consensus>('all');
  const [broker, setBroker] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingSymbol, setLoadingSymbol] = useState<string | null>(null);

  const openStock = async (p: Pick) => {
    setLoadingSymbol(p.symbol);
    try {
      const res = await api.post('/screener/run', { filters: { search: p.symbol }, limit: 5 });
      const list: StockQuote[] = res.data?.stocks || [];
      const match = list.find((s) => (s.symbol || '').toUpperCase() === p.symbol.toUpperCase()) || list[0];
      if (match) {
        setSelectedStock(match);
        setDrawerOpen(true);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingSymbol(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PICKS.filter((p) => {
      if (q && !p.symbol.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false;
      if (broker && !p.brokers.includes(broker)) return false;
      const n = p.brokers.length;
      if (consensus === 'high' && n < 5) return false;
      if (consensus === 'medium' && (n < 3 || n > 4)) return false;
      if (consensus === 'low' && n >= 3) return false;
      if (consensus === 'alpha' && !p.alpha) return false;
      return true;
    }).sort((a, b) => b.brokers.length - a.brokers.length);
  }, [query, consensus, broker]);

  const clearFilters = () => { setQuery(''); setConsensus('all'); setBroker(null); };
  const hasFilters = query || consensus !== 'all' || broker;

  return (
    <div className="mx-auto max-w-[1200px] pb-16">
      {/* ── Header ── */}
      <div className="pt-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            2026 Outlook
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Broker Top Picks
            <br />
            <span className="text-muted-foreground">for 2026</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Consensus recommendations from 15 leading Pakistan brokerage houses covering 78 stocks with 209 total
            recommendations. Target index: 210,200.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1 text-sm">
            <Stat value="78" label="Stocks" />
            <span className="h-8 w-px bg-border" />
            <Stat value="15" label="Brokers" />
            <span className="h-8 w-px bg-border" />
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="font-semibold">22</span> <span className="text-muted-foreground">High Consensus</span></span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /><span className="font-semibold">41</span> <span className="text-muted-foreground">Alpha Picks</span></span>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="mt-10 space-y-5 rounded-2xl border bg-muted/20 p-5 md:p-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by symbol or company..."
            className="h-11 rounded-xl bg-background pl-10"
          />
        </div>

        {/* Consensus */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consensus</span>
          {CONSENSUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setConsensus(t.key)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                consensus === t.key
                  ? t.key === 'all' ? 'border-foreground bg-foreground text-background' : 'border-primary/50 bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {t.key === 'alpha' && <Star className="mr-1 inline h-3 w-3" />}
              {t.label}
            </button>
          ))}
        </div>

        {/* Broker */}
        <div className="flex items-start gap-3">
          <span className="mt-2 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Broker</span>
          <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setBroker(null)}
              className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium', !broker ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
            >
              All
            </button>
            {BROKERS.map((b) => (
              <button
                key={b.name}
                onClick={() => setBroker(broker === b.name ? null : b.name)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  broker === b.name ? 'border-primary/50 bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <BrokerAvatar code={b.code} name={b.name} size={18} />
                {b.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Broker performance YTD ── */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Trophy className="h-4 w-4 text-amber-500" /> Broker Performance YTD
        </div>
        <div className="flex gap-3 overflow-x-auto rounded-2xl border bg-muted/20 p-5">
          {YTD.map((y, i) => {
            const b = BROKER_BY_NAME[y.name];
            return (
              <div key={y.name} className="flex w-[92px] shrink-0 flex-col items-center gap-1.5 text-center">
                <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                <div className={cn('rounded-full p-0.5', i < 3 && 'ring-2 ring-amber-400')}>
                  <BrokerAvatar code={b?.code ?? ''} name={y.name} size={40} />
                </div>
                <span className="truncate text-[11px] font-medium">{y.name}</span>
                <span className={cn('text-xs font-semibold tabular-nums', pctColor(y.pct))}>
                  {y.pct >= 0 ? '+' : ''}{y.pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{filtered.length} stocks · 15 brokers · sorted by consensus</span>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 hover:text-foreground">
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border">
          <div className="grid grid-cols-[1fr_1.4fr] gap-4 border-b bg-muted/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Stock</span>
            <span>Brokers</span>
          </div>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No stocks match your filters.</div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.symbol}
                onClick={() => openStock(p)}
                className="grid cursor-pointer grid-cols-[1fr_1.4fr] items-center gap-4 border-b px-5 py-4 last:border-0 hover:bg-muted/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StockLogo symbol={p.symbol} className="h-9 w-9 rounded-lg" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-bold">
                      {p.symbol}
                      {p.alpha && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      {loadingSymbol === p.symbol && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{p.name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.brokers.map((bn) => {
                    const b = BROKER_BY_NAME[bn];
                    return <BrokerAvatar key={bn} code={b?.code ?? ''} name={bn} size={26} className="border" />;
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8">
        <Link href="/stocks" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to stocks
        </Link>
      </div>

      <StockDetailDrawer
        stock={selectedStock}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedStock(null);
        }}
      />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-lg font-bold">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
