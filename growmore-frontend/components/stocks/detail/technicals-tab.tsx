'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  computeTechnicals,
  gaugeAngle,
  SIGNAL_LABEL,
  type Candle,
  type GaugeSummary,
  type IndicatorRow,
  type Signal,
  type RangeInfo,
} from '@/lib/technicals';
import type { StockHistoryPoint } from '@/types/market';

// ── formatting ────────────────────────────────────────────────────────────────
const num = (v: number | null | undefined, dp = 2) => (v == null ? 'N/A' : v.toFixed(dp));
const pct = (v: number | null | undefined, dp = 1) => (v == null ? 'N/A' : `${v.toFixed(dp)}%`);
const big = (v: number | null | undefined) => {
  if (v == null) return 'N/A';
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(0);
};

const SIGNAL_STYLE: Record<Signal, string> = {
  strong_buy: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  buy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  neutral: 'bg-muted text-muted-foreground',
  sell: 'bg-red-500/10 text-red-600 dark:text-red-400',
  strong_sell: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

function SignalBadge({ signal }: { signal: Signal }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap', SIGNAL_STYLE[signal])}>
      {SIGNAL_LABEL[signal]}
    </span>
  );
}

// ── gauge ─────────────────────────────────────────────────────────────────────
function Gauge({ title, summary }: { title: string; summary: GaugeSummary }) {
  const angle = gaugeAngle(summary);
  const gradId = `g-${title.replace(/\s+/g, '')}`;
  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <svg viewBox="0 0 180 108" className="w-full max-w-[190px]">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path d="M 16 92 A 74 74 0 0 1 164 92" fill="none" stroke={`url(#${gradId})`} strokeWidth="12" strokeLinecap="round" />
        <g transform={`rotate(${angle} 90 92)`}>
          <line x1="90" y1="92" x2="90" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="90" cy="92" r="5" fill="currentColor" />
      </svg>
      <p className="text-sm font-bold -mt-1">{SIGNAL_LABEL[summary.signal]}</p>
      <div className="mt-1 flex items-center gap-2 text-[10px]">
        <span className="text-red-500 font-medium">SELL {summary.sell}</span>
        <span className="text-muted-foreground">NEUTRAL {summary.neutral}</span>
        <span className="text-emerald-600 dark:text-emerald-500 font-medium">BUY {summary.buy}</span>
      </div>
    </div>
  );
}

// ── indicator list ────────────────────────────────────────────────────────────
function IndicatorList({ title, count, rows }: { title: string; count: number; rows: IndicatorRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
        <span className="text-[10px] text-muted-foreground">{count} indicators</span>
      </CardHeader>
      <CardContent className="divide-y divide-border/50 p-0">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-xs font-medium">{r.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{r.display}</span>
              <SignalBadge signal={r.signal} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── range bar ─────────────────────────────────────────────────────────────────
function RangeBar({ label, range, current }: { label: string; range: RangeInfo; current: number | null }) {
  const posRaw = range.position;
  const pos = posRaw == null ? 0 : Math.max(0, Math.min(100, posRaw));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span>{posRaw == null ? '—' : `${Math.round(posRaw)}% of range`}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full bg-foreground" style={{ width: `${pos}%` }} />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span className="text-muted-foreground">{num(range.low)}</span>
        <span>{num(current)}</span>
        <span className="text-muted-foreground">{num(range.high)}</span>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-bold tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export function TechnicalsTab({ history, loading }: { history: StockHistoryPoint[]; loading: boolean }) {
  const t = useMemo(() => {
    const candles: Candle[] = history
      .filter((p) => p.close_price != null)
      .map((p) => ({
        date: p.date,
        open: p.open_price ?? null,
        high: p.high_price ?? null,
        low: p.low_price ?? null,
        close: Number(p.close_price),
        volume: p.volume ?? null,
      }));
    return computeTechnicals(candles);
  }, [history]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!t.enoughData) {
    return (
      <div className="text-center text-sm text-muted-foreground py-12 border rounded-lg">
        Not enough price history to compute technical indicators yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary gauges */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Technical Summary</CardTitle>
          <p className="text-xs text-muted-foreground">
            Aggregated signal from <span className="font-semibold text-foreground">{t.overallSummary.total} indicators</span>
            {t.asOf && ` · ${new Date(t.asOf).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`}
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Gauge title="Oscillators" summary={t.oscillatorSummary} />
          <Gauge title="Summary" summary={t.overallSummary} />
          <Gauge title="Moving Averages" summary={t.movingAverageSummary} />
        </CardContent>
      </Card>

      {/* Indicator lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <IndicatorList title="Oscillators" count={t.oscillators.length} rows={t.oscillators} />
        <IndicatorList title="Moving Averages" count={t.movingAverages.length} rows={t.movingAverages} />
      </div>

      {/* Support/Resistance + Bollinger */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Support & Resistance</CardTitle>
            <p className="text-xs text-muted-foreground">Where price sits within recent ranges</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <RangeBar label="52-Week Range" range={t.range52w} current={t.price} />
            <RangeBar label="20-Day Range" range={t.range20d} current={t.price} />
            <RangeBar label="30-Day Range" range={t.range30d} current={t.price} />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg border p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dist. from 52W High</p>
                <p className={cn('text-base font-bold', (t.distFrom52wHigh ?? 0) < 0 ? 'text-red-500' : 'text-emerald-600')}>{pct(t.distFrom52wHigh, 2)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dist. from 52W Low</p>
                <p className={cn('text-base font-bold', (t.distFrom52wLow ?? 0) < 0 ? 'text-red-500' : 'text-emerald-600')}>+{pct(t.distFrom52wLow, 2).replace('+', '')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bollinger Bands · 20, 2σ</CardTitle>
            <p className="text-xs text-muted-foreground">Volatility envelope around the 20-period mean</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <RangeBar
              label="Position in Band"
              range={{ low: t.bollinger.lower, high: t.bollinger.upper, position: t.bollinger.position }}
              current={t.price}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Middle Band</p>
                <p className="text-base font-bold">{num(t.bollinger.middle)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Width</p>
                <p className="text-base font-bold">{pct(t.bollinger.width, 2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volatility & Volume */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Volatility & Volume</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-x-4 gap-y-5">
          <StatTile label="ATR (14)" value={num(t.volatility.atr14)} sub={t.volatility.atrTrendPct != null ? `${t.volatility.atrTrendPct >= 0 ? '▲' : '▼'} ${Math.abs(t.volatility.atrTrendPct).toFixed(1)}%` : undefined} />
          <StatTile label="ATR (7)" value={num(t.volatility.atr7)} />
          <StatTile label="ATR (21)" value={num(t.volatility.atr21)} />
          <StatTile label="Hist. Vol 20D" value={pct(t.volatility.histVol20)} />
          <StatTile label="Hist. Vol 50D" value={pct(t.volatility.histVol50)} />
          <StatTile label="Rel Vol (20)" value={t.volatility.relVol20 != null ? `${t.volatility.relVol20.toFixed(2)}x` : 'N/A'} />
          <StatTile label="Rel Vol (50)" value={t.volatility.relVol50 != null ? `${t.volatility.relVol50.toFixed(2)}x` : 'N/A'} />
          <StatTile label="OBV" value={big(t.volatility.obv)} />
          <StatTile label="A/D Line" value={big(t.volatility.adLine)} />
          <StatTile label="Vol SMA (10)" value={big(t.volatility.volSma10)} />
          <StatTile label="Vol SMA (20)" value={big(t.volatility.volSma20)} />
          <StatTile label="Vol SMA (50)" value={big(t.volatility.volSma50)} />
          <StatTile label="VWAP" value={num(t.volatility.vwap)} />
          <StatTile label="Parabolic SAR" value={num(t.volatility.psar)} />
        </CardContent>
      </Card>

      {/* Pattern signals */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pattern Signals</CardTitle>
            <p className="text-xs text-muted-foreground">Active breakout, breakdown and volatility flags</p>
          </div>
          <span className="text-xs font-semibold">{t.patterns.filter((p) => p.active).length} active</span>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {t.patterns.map((p) => (
            <span
              key={p.label}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium',
                p.active ? 'border-foreground/30 bg-foreground/5 text-foreground' : 'text-muted-foreground',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', p.active ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
              {p.label}
            </span>
          ))}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center pt-1">
        Indicators are computed from end-of-day data. Signals are heuristics, not investment advice.
      </p>
    </div>
  );
}
