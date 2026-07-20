'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList,
} from 'recharts';
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, HelpCircle, ExternalLink,
  Globe, Lightbulb, ShieldAlert, Users, Eye, Info, TrendingUp, TrendingDown,
} from 'lucide-react';

interface Source { title: string; url: string; outlet: string }
interface Check { question: string; status: 'good' | 'ok' | 'weak' | 'unknown'; answer: string }
interface Verdict {
  symbol: string; name: string; sector?: string;
  current_price?: number; change_percentage?: number;
  score: number; grade: string; verdict: string;
  tone: 'positive' | 'neutral' | 'negative';
  headline: string; summary: string;
  checks: Check[];
  debt_findings?: { debt_to_equity: number | null; plain: string };
  pros: string[]; cons: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'; risk_note: string;
  who_its_for?: string; what_to_watch?: string;
  beginner_tips: string[];
  shariah?: 'COMPLIANT' | 'NON_COMPLIANT';
  charts?: {
    score_breakdown: { label: string; key: string; value: number }[];
    financial_trend: { year: string; revenue: number; profit: number; eps?: number }[];
    price_range: { low: number; high: number; current: number; position: number } | null;
  };
  sources?: Source[];
  disclaimer: string;
  ai_powered?: boolean; model?: string;
}

const TONE = {
  positive: { text: 'text-emerald-600 dark:text-emerald-500', ring: 'stroke-emerald-500', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bar: '#10b981' },
  neutral:  { text: 'text-amber-600 dark:text-amber-500',    ring: 'stroke-amber-500',   chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',    bar: '#f59e0b' },
  negative: { text: 'text-red-600 dark:text-red-500',        ring: 'stroke-red-500',     chip: 'bg-red-500/10 text-red-600 dark:text-red-400',          bar: '#ef4444' },
};

const STATUS = {
  good:    { Icon: CheckCircle2,  color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Good' },
  ok:      { Icon: AlertTriangle, color: 'text-amber-500',   bg: 'bg-amber-500/10',   label: 'Okay' },
  weak:    { Icon: XCircle,       color: 'text-red-500',     bg: 'bg-red-500/10',     label: 'Weak' },
  unknown: { Icon: HelpCircle,    color: 'text-muted-foreground', bg: 'bg-muted',     label: 'No data' },
};

const RISK = {
  LOW:    { label: 'Low risk',    color: 'text-emerald-500', w: '33%', bg: 'bg-emerald-500' },
  MEDIUM: { label: 'Medium risk', color: 'text-amber-500',   w: '66%', bg: 'bg-amber-500' },
  HIGH:   { label: 'High risk',   color: 'text-red-500',     w: '100%', bg: 'bg-red-500' },
};

const barColor = (v: number) => (v >= 65 ? '#10b981' : v >= 40 ? '#f59e0b' : '#ef4444');
const fmtM = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}B` : `${n.toFixed(0)}M`);

/** Big circular score gauge — the first thing a beginner should see. */
function ScoreRing({ score, tone }: { score: number; tone: Verdict['tone'] }) {
  const R = 52, C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={R} className="stroke-muted" strokeWidth="10" fill="none" />
        <circle
          cx="60" cy="60" r={R} strokeWidth="10" fill="none" strokeLinecap="round"
          className={TONE[tone].ring}
          strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-bold tabular-nums', TONE[tone].text)}>{score}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

export function SimpleTab({ stockId, active }: { stockId: string; active: boolean }) {
  const [data, setData] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async (refresh = false) => {
    setLoading(true);
    try {
      const r = await api.get(`/stocks/${stockId}/verdict`, { params: refresh ? { refresh: true } : {} });
      setData(r.data);
    } catch (e) { console.error(e); } finally { setLoading(false); setLoaded(true); }
  };

  useEffect(() => { setData(null); setLoaded(false); }, [stockId]);
  useEffect(() => { if (active && !loaded && !loading) load(); /* eslint-disable-next-line */ }, [active, stockId]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-5 rounded-xl border p-5">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <p className="text-center text-xs text-muted-foreground">
          Researching this company across the web — this takes a few seconds…
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t build the simple view right now.</p>
        <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => load(true)}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    );
  }

  const tone = TONE[data.tone] ?? TONE.neutral;
  const risk = RISK[data.risk_level] ?? RISK.MEDIUM;
  const breakdown = data.charts?.score_breakdown ?? [];
  const trend = data.charts?.financial_trend ?? [];
  const range = data.charts?.price_range;

  return (
    <div className="space-y-5">
      {/* ── Verdict hero ───────────────────────────────────────────── */}
      <div className="rounded-xl border bg-gradient-to-br from-muted/40 to-transparent p-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <ScoreRing score={data.score} tone={data.tone} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className={cn('rounded-full px-3 py-1 text-sm font-bold', tone.chip)}>{data.verdict}</span>
              <span className={cn('inline-flex items-center gap-1 text-xs font-medium', risk.color)}>
                <ShieldAlert className="h-3.5 w-3.5" /> {risk.label}
              </span>
              {data.shariah === 'NON_COMPLIANT' && (
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
                  Not Shariah-compliant
                </span>
              )}
            </div>
            <p className="text-base font-semibold leading-snug">{data.headline}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.summary}</p>
          </div>
        </div>
      </div>

      {/* ── Score breakdown chart ──────────────────────────────────── */}
      {breakdown.length > 0 && (
        <div className="rounded-xl border p-4">
          <h4 className="mb-1 text-sm font-semibold">How it scores, area by area</h4>
          <p className="mb-3 text-xs text-muted-foreground">Higher bars are better. 100 means excellent.</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={breakdown} margin={{ top: 14, right: 8, left: -22, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                formatter={(v: number) => [`${v} / 100`, 'Score']}
              />
              <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={46}>
                <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                {breakdown.map((d, i) => <Cell key={i} fill={barColor(d.value)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Plain-English checks ───────────────────────────────────── */}
      <div className="rounded-xl border p-4">
        <h4 className="mb-3 text-sm font-semibold">The questions that matter</h4>
        <div className="space-y-2.5">
          {data.checks.map((c, i) => {
            const S = STATUS[c.status] ?? STATUS.unknown;
            return (
              <div key={i} className="flex gap-3 rounded-lg border bg-card/50 p-3">
                <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', S.bg)}>
                  <S.Icon className={cn('h-4 w-4', S.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{c.question}</p>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', S.bg, S.color)}>{S.label}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
        {data.debt_findings?.plain && (
          <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              What we found about its debt
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{data.debt_findings.plain}</p>
          </div>
        )}
      </div>

      {/* ── Revenue & profit trend ─────────────────────────────────── */}
      {trend.length > 1 && (
        <div className="rounded-xl border p-4">
          <h4 className="mb-1 text-sm font-semibold">Is the business growing?</h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Money coming in (sales) vs money kept (profit), over the last {trend.length} years.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
              <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtM} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                formatter={(v: number, n: string) => [`Rs ${fmtM(v)}`, n === 'revenue' ? 'Sales' : 'Profit']}
              />
              <Bar dataKey="revenue" name="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="profit" name="profit" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" /> Sales</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#10b981]" /> Profit kept</span>
          </div>
        </div>
      )}

      {/* ── Price position in 52-week range ────────────────────────── */}
      {range && (
        <div className="rounded-xl border p-4">
          <h4 className="mb-1 text-sm font-semibold">Is the price high or low right now?</h4>
          <p className="mb-4 text-xs text-muted-foreground">Where today&apos;s price sits versus the past year.</p>
          <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-500/60 via-amber-500/60 to-red-500/60">
            <div
              className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-background bg-foreground shadow"
              style={{ left: `${range.position}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>Year low<br /><b className="text-foreground">Rs {range.low.toLocaleString()}</b></span>
            <span className="text-center">Today<br /><b className="text-foreground">Rs {range.current.toLocaleString()}</b></span>
            <span className="text-right">Year high<br /><b className="text-foreground">Rs {range.high.toLocaleString()}</b></span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Today&apos;s price is about <b className="text-foreground">{range.position}%</b> of the way up its
             12-month range — {range.position >= 70 ? 'near the expensive end.' : range.position <= 30 ? 'near the cheaper end.' : 'around the middle.'}
          </p>
        </div>
      )}

      {/* ── Pros & cons ────────────────────────────────────────────── */}
      {(data.pros?.length > 0 || data.cons?.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.pros?.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" /> Good signs
              </p>
              <ul className="space-y-1.5">
                {data.pros.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.cons?.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                <TrendingDown className="h-3.5 w-3.5" /> Things to worry about
              </p>
              <ul className="space-y-1.5">
                {data.cons.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Risk meter ─────────────────────────────────────────────── */}
      <div className="rounded-xl border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">How risky is this for a beginner?</h4>
          <span className={cn('text-xs font-bold uppercase', risk.color)}>{risk.label}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full transition-all', risk.bg)} style={{ width: risk.w }} />
        </div>
        {data.risk_note && <p className="mt-2 text-sm text-muted-foreground">{data.risk_note}</p>}
      </div>

      {/* ── Who it's for / what to watch ───────────────────────────── */}
      {(data.who_its_for || data.what_to_watch) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.who_its_for && (
            <div className="rounded-xl border p-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Who might this suit?
              </p>
              <p className="text-sm text-muted-foreground">{data.who_its_for}</p>
            </div>
          )}
          {data.what_to_watch && (
            <div className="rounded-xl border p-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> Keep an eye on
              </p>
              <p className="text-sm text-muted-foreground">{data.what_to_watch}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Beginner tips ──────────────────────────────────────────── */}
      {data.beginner_tips?.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Lightbulb className="h-3.5 w-3.5" /> If you&apos;re new to investing
          </p>
          <ul className="space-y-1.5">
            {data.beginner_tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Sources ────────────────────────────────────────────────── */}
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

      {/* ── Disclaimer + refresh ───────────────────────────────────── */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{data.disclaimer}</p>
      </div>
      <div className="flex items-center justify-between pb-2">
        <span className="text-[10px] text-muted-foreground/60">
          {data.ai_powered ? 'Researched by AI from live web sources' : 'Based on stored figures only'}
        </span>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => load(true)} disabled={loading}>
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>
    </div>
  );
}
