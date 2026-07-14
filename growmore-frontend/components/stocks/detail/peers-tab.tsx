'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StockLogo } from '@/components/stocks/stock-logo';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { parseCompliance } from '@/lib/shariah';

interface PeerInput {
  id: string;
  symbol?: string;
  name?: string;
  company_name?: string;
  sector_name?: string;
  sector?: string;
  logo_url?: string;
  current_price?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  market_cap?: number;
  eps?: number;
}

interface PeerRow {
  id: string;
  symbol: string;
  name: string;
  logo_url?: string;
  marketCap: number | null;
  pe: number | null;
  divYield: number | null;
  revenue: number | null;
  revGrowth: number | null;
  profit: number | null;
  profitGrowth: number | null;
  eps: number | null;
  epsGrowth: number | null;
  ytd: number | null;
  isCurrent: boolean;
}

const n = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const growth = (a: number | null, b: number | null) => (a != null && b != null && b !== 0 ? (a / b - 1) * 100 : null);

const rsB = (v: number | null) => {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `Rs. ${(v / 1e9).toFixed(a >= 1e11 ? 1 : 2)} B`;
  if (a >= 1e6) return `Rs. ${(v / 1e6).toFixed(2)} M`;
  return `Rs. ${v.toFixed(0)}`;
};
const rsPerShare = (v: number | null) => (v == null ? '—' : `Rs${v.toFixed(2)}`);
const xNum = (v: number | null) => (v == null ? '—' : v.toFixed(2));
const pctPlain = (v: number | null) => (v == null ? '—' : `${v.toFixed(2)}%`);

function computeYtd(history: { date: string; close_price?: number | null }[]): number | null {
  const pts = history
    .filter((p) => p.close_price != null)
    .map((p) => ({ date: p.date, close: Number(p.close_price) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 2) return null;
  const year = new Date().getFullYear();
  const start = pts.find((p) => p.date >= `${year}-01-01`) ?? pts[0];
  const end = pts[pts.length - 1];
  if (!start.close) return null;
  return (end.close / start.close - 1) * 100;
}

function Signed({ value, suffix = '%' }: { value: number | null; suffix?: string }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const pos = value >= 0;
  return (
    <span className={cn('font-medium tabular-nums', pos ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500')}>
      {pos ? '+' : ''}
      {value.toFixed(2)}
      {suffix}
    </span>
  );
}

export function PeersTab({ stock, active }: { stock: PeerInput; active: boolean }) {
  const [rows, setRows] = useState<PeerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sector = stock.sector_name || stock.sector || '';

  useEffect(() => {
    setRows([]);
    setError(null);
  }, [stock.id]);

  useEffect(() => {
    if (!active || rows.length > 0 || loading) return;
    if (!sector) {
      setError('Sector information is not available for peer comparison.');
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.post('/screener/run', {
          filters: { sector_name: sector, sort: 'market_cap_desc' },
          limit: 12,
        });
        let list: PeerInput[] = res.data?.stocks || [];
        if (!list.find((s) => s.id === stock.id)) list = [stock, ...list];
        // dedupe by id, rank by market cap, keep the current stock + top peers
        const seen = new Set<string>();
        const unique = list.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
        unique.sort((a, b) => (n(b.market_cap) ?? 0) - (n(a.market_cap) ?? 0));
        const top = unique.slice(0, 5);
        if (!top.find((s) => s.id === stock.id)) {
          const cur = unique.find((s) => s.id === stock.id);
          if (cur) top.push(cur);
        }

        const built = await Promise.all(
          top.map(async (p): Promise<PeerRow> => {
            const [finR, histR] = await Promise.allSettled([
              api.get(`/stocks/${p.id}/financials`, { params: { period_type: 'annual', limit: 2 } }),
              api.get(`/stocks/${p.id}/history`, { params: { period: '1Y' } }),
            ]);
            const fins = finR.status === 'fulfilled' ? finR.value.data?.statements || [] : [];
            const annual = [...fins].filter((f: any) => !f.quarter).sort((a: any, b: any) => b.fiscal_year - a.fiscal_year);
            const cur = annual[0], prev = annual[1];
            const hist = histR.status === 'fulfilled' ? histR.value.data?.history || [] : [];
            const { cleanName } = parseCompliance(p.name || p.company_name || p.symbol || '');
            return {
              id: p.id,
              symbol: p.symbol || '—',
              name: cleanName,
              logo_url: p.logo_url,
              marketCap: n(p.market_cap),
              pe: n(p.pe_ratio),
              divYield: n(p.dividend_yield),
              revenue: cur?.revenue != null ? Number(cur.revenue) * 1000 : null,
              revGrowth: growth(n(cur?.revenue), n(prev?.revenue)),
              profit: cur?.net_income != null ? Number(cur.net_income) * 1000 : null,
              profitGrowth: growth(n(cur?.net_income), n(prev?.net_income)),
              eps: n(cur?.eps) ?? n(p.eps),
              epsGrowth: growth(n(cur?.eps), n(prev?.eps)),
              ytd: computeYtd(hist),
              isCurrent: p.id === stock.id,
            };
          }),
        );

        built.sort((a, b) => (a.isCurrent ? -1 : b.isCurrent ? 1 : (b.marketCap ?? 0) - (a.marketCap ?? 0)));
        if (!cancelled) setRows(built);
      } catch {
        if (!cancelled) setError('Could not load sector peers.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, sector, stock.id]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-sm text-muted-foreground py-12 border rounded-lg">{error}</div>;
  }

  const cols = ['Revenue', 'Rev Growth', 'Profit', 'Profit Growth', 'EPS', 'EPS Growth', 'P/E', 'Div Yield', 'YTD Return'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">Sector Peers</CardTitle>
        <p className="text-xs text-muted-foreground">
          Top {Math.max(rows.length - 1, 0)} peers in <span className="uppercase">{sector}</span> by market cap · latest FY
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left font-medium p-3 sticky left-0 bg-card min-w-[180px]">Company</th>
                {cols.map((c) => (
                  <th key={c} className="text-right font-medium p-3 whitespace-nowrap min-w-[90px]">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={cn('border-b border-border/40', r.isCurrent && 'bg-primary/5')}>
                  <td className={cn('p-3 sticky left-0 min-w-[180px]', r.isCurrent ? 'bg-primary/5' : 'bg-card')}>
                    <div className="flex items-center gap-2.5">
                      <StockLogo symbol={r.symbol} logoUrl={r.logo_url} className="h-7 w-7 rounded-lg" />
                      <div className="min-w-0">
                        <p className="font-semibold">{r.symbol}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[130px]">{r.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap tabular-nums">{rsB(r.revenue)}</td>
                  <td className="p-3 text-right whitespace-nowrap"><Signed value={r.revGrowth} /></td>
                  <td className="p-3 text-right whitespace-nowrap tabular-nums">{rsB(r.profit)}</td>
                  <td className="p-3 text-right whitespace-nowrap"><Signed value={r.profitGrowth} /></td>
                  <td className="p-3 text-right whitespace-nowrap tabular-nums">{rsPerShare(r.eps)}</td>
                  <td className="p-3 text-right whitespace-nowrap"><Signed value={r.epsGrowth} /></td>
                  <td className="p-3 text-right whitespace-nowrap tabular-nums">{xNum(r.pe)}</td>
                  <td className="p-3 text-right whitespace-nowrap tabular-nums">{pctPlain(r.divYield)}</td>
                  <td className="p-3 text-right whitespace-nowrap"><Signed value={r.ytd} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
