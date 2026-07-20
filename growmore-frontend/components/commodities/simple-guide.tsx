'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
} from 'recharts';
import {
  Lightbulb, RefreshCw, Globe, ExternalLink, Info, AlertTriangle,
  CheckCircle2, XCircle, Coins,
} from 'lucide-react';

interface Source { title: string; url: string; outlet: string }
interface Metal {
  metal: 'gold' | 'silver';
  label: string;
  price_per_tola: number;
  change_percentage: number;
  year_low: number | null;
  year_high: number | null;
  range_position: number | null;
  level: 'HIGH' | 'ABOVE_AVERAGE' | 'AVERAGE' | 'LOW' | 'UNKNOWN';
  history?: { date: string; price: number }[];
  buy_score?: number | null;
  signal?: 'GOOD_TIME' | 'REASONABLE' | 'NEUTRAL' | 'PRICEY' | 'EXPENSIVE' | null;
  signal_label?: string | null;
  signal_reason?: string | null;
  momentum_pct?: number | null;
  timing?: string;
  verdict?: string;
  drivers?: string[];
  good_for?: string;
  watch_out?: string;
}

const SIGNAL: Record<string, { color: string; chip: string; stroke: string }> = {
  GOOD_TIME:  { color: 'text-emerald-600 dark:text-emerald-500', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', stroke: '#10b981' },
  REASONABLE: { color: 'text-lime-600 dark:text-lime-500',       chip: 'bg-lime-500/10 text-lime-600 dark:text-lime-400',          stroke: '#84cc16' },
  NEUTRAL:    { color: 'text-blue-600 dark:text-blue-400',       chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',          stroke: '#3b82f6' },
  PRICEY:     { color: 'text-amber-600 dark:text-amber-500',     chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',       stroke: '#f59e0b' },
  EXPENSIVE:  { color: 'text-red-600 dark:text-red-500',         chip: 'bg-red-500/10 text-red-600 dark:text-red-400',             stroke: '#ef4444' },
};

/** Half-circle "buying conditions" gauge — the decisive signal. */
function BuyGauge({ score, signal }: { score: number; signal: string }) {
  const S = SIGNAL[signal] ?? SIGNAL.NEUTRAL;
  const R = 44;
  const semi = Math.PI * R;                       // length of the half-circle arc
  const filled = (Math.max(0, Math.min(100, score)) / 100) * semi;
  return (
    <div className="relative h-[62px] w-[110px] shrink-0">
      <svg viewBox="0 0 110 62" className="h-full w-full">
        <path d="M 11 55 A 44 44 0 0 1 99 55" fill="none" className="stroke-muted" strokeWidth="9" strokeLinecap="round" />
        <path
          d="M 11 55 A 44 44 0 0 1 99 55" fill="none" stroke={S.stroke} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${filled} ${semi}`}
          style={{ transition: 'stroke-dasharray 700ms ease' }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className={cn('text-xl font-bold leading-none tabular-nums', S.color)}>{score}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">out of 100</div>
      </div>
    </div>
  );
}
interface Guide {
  overview: string;
  metals: Metal[];
  beginner_tips: string[];
  common_mistakes: string[];
  sources?: Source[];
  disclaimer: string;
  ai_powered?: boolean;
  model?: string;
}

const LEVEL: Record<Metal['level'], { label: string; text: string; chip: string; plain: string }> = {
  LOW:           { label: 'Cheaper than usual', text: 'text-emerald-600 dark:text-emerald-500', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', plain: 'Prices are near the bottom of the past year.' },
  AVERAGE:       { label: 'About average',      text: 'text-blue-600 dark:text-blue-400',       chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',        plain: 'Prices are around the middle of the past year.' },
  ABOVE_AVERAGE: { label: 'A bit expensive',    text: 'text-amber-600 dark:text-amber-500',     chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',     plain: 'Prices are above the middle of the past year.' },
  HIGH:          { label: 'Expensive right now', text: 'text-red-600 dark:text-red-500',        chip: 'bg-red-500/10 text-red-600 dark:text-red-400',           plain: 'Prices are near the top of the past year.' },
  UNKNOWN:       { label: 'Not enough data',    text: 'text-muted-foreground',                  chip: 'bg-muted text-muted-foreground',                          plain: '' },
};

const fmtPKR = (n?: number | null) =>
  n == null ? '—' : 'Rs ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });

function MetalCard({ m }: { m: Metal }) {
  const L = LEVEL[m.level] ?? LEVEL.UNKNOWN;
  const up = (m.change_percentage ?? 0) >= 0;
  const isGold = m.metal === 'gold';
  const color = isGold ? '#d97706' : '#64748b';

  return (
    <div className="rounded-xl border p-4">
      {/* header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-xs font-black',
            isGold ? 'bg-amber-500/15 text-amber-600' : 'bg-slate-400/15 text-slate-500')}>
            {isGold ? 'Au' : 'Ag'}
          </div>
          <div>
            <p className="text-sm font-semibold">{m.label}</p>
            <p className="text-[11px] text-muted-foreground">per tola</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums">{fmtPKR(m.price_per_tola)}</p>
          <p className={cn('text-xs font-medium tabular-nums', up ? 'text-emerald-500' : 'text-red-500')}>
            {up ? '▲' : '▼'} {Math.abs(m.change_percentage ?? 0).toFixed(2)}% today
          </p>
        </div>
      </div>

      {/* ── Buying conditions: the decisive signal ── */}
      {m.buy_score != null && m.signal && (
        <div className="mb-3 rounded-xl border bg-gradient-to-br from-muted/40 to-transparent p-3">
          <div className="flex items-center gap-3">
            <BuyGauge score={m.buy_score} signal={m.signal} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Buying conditions today
              </p>
              <p className={cn('mt-0.5 text-base font-bold leading-tight',
                (SIGNAL[m.signal] ?? SIGNAL.NEUTRAL).color)}>
                {m.signal_label}
              </p>
              {m.signal_reason && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.signal_reason}</p>
              )}
            </div>
          </div>
          {m.verdict && (
            <p className="mt-2.5 border-t pt-2.5 text-sm leading-relaxed text-foreground/85">{m.verdict}</p>
          )}
        </div>
      )}

      {/* how the price compares to the past year */}
      <div className={cn('mb-3 rounded-lg px-3 py-2', L.chip)}>
        <p className="text-xs font-bold uppercase tracking-wider">{L.label}</p>
        {m.timing ? (
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{m.timing}</p>
        ) : L.plain ? (
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{L.plain}</p>
        ) : null}
      </div>

      {/* 1-year chart */}
      {m.history && m.history.length > 3 && (
        <>
          <p className="mb-1 text-xs text-muted-foreground">Price over the last year</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={m.history} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${m.metal}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={['dataMin', 'dataMax']} tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                formatter={(v: number) => [fmtPKR(v), 'Price']} labelFormatter={(l) => String(l)}
              />
              <ReferenceLine y={m.price_per_tola} stroke={color} strokeDasharray="3 3" strokeWidth={1} />
              <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill={`url(#g-${m.metal})`} />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}

      {/* range position */}
      {m.range_position != null && m.year_low && m.year_high && (
        <div className="mt-3">
          <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-500/60 via-blue-500/50 to-red-500/60">
            <div className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-background bg-foreground shadow"
              style={{ left: `${m.range_position}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
            <span>Cheapest<br /><b className="text-foreground">{fmtPKR(m.year_low)}</b></span>
            <span className="text-right">Dearest<br /><b className="text-foreground">{fmtPKR(m.year_high)}</b></span>
          </div>
        </div>
      )}

      {/* why prices move */}
      {m.drivers && m.drivers.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Why the price is moving</p>
          <ul className="space-y-1">
            {m.drivers.map((d, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />{d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* good for / watch out */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {m.good_for && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
            <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Good for
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{m.good_for}</p>
          </div>
        )}
        {m.watch_out && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
            <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" /> Watch out
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{m.watch_out}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CommoditiesSimpleGuide() {
  const [data, setData] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (refresh = false) => {
    setLoading(true);
    try {
      const r = await api.get('/commodities/simple', { params: refresh ? { refresh: true } : {} });
      setData(r.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-primary" />
            Should I Buy? — Simple Guide
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Plain English, no jargon — for anyone who has never invested before.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {loading && !data ? (
          <>
            <Skeleton className="h-16 w-full rounded-lg" />
            <div className="grid gap-3 lg:grid-cols-2">
              <Skeleton className="h-72 w-full rounded-xl" />
              <Skeleton className="h-72 w-full rounded-xl" />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Researching what&apos;s moving gold &amp; silver right now…
            </p>
          </>
        ) : !data ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load the guide right now.</p>
            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => load(true)}>
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </Button>
          </div>
        ) : (
          <>
            {data.overview && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">What&apos;s happening right now</p>
                <p className="text-sm leading-relaxed text-foreground/85">{data.overview}</p>
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              {data.metals?.map((m) => <MetalCard key={m.metal} m={m} />)}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {data.beginner_tips?.length > 0 && (
                <div className="rounded-xl border p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Lightbulb className="h-3.5 w-3.5" /> If you&apos;re buying for the first time
                  </p>
                  <ul className="space-y-1.5">
                    {data.beginner_tips.map((t, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />{t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.common_mistakes?.length > 0 && (
                <div className="rounded-xl border p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" /> Mistakes beginners make
                  </p>
                  <ul className="space-y-1.5">
                    {data.common_mistakes.map((t, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />{t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {data.sources && data.sources.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Globe className="h-3 w-3" /> Where this came from ({data.sources.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.title}
                      className="group inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
                      <span className="max-w-[180px] truncate">{s.outlet}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">{data.disclaimer}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
