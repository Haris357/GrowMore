'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PortfolioSkeleton } from '@/components/common/skeletons';
import {
  Wallet, TrendingUp, TrendingDown, Plus, Layers, ArrowRightLeft,
  Search, Loader2, Coins, Bitcoin, LineChart, Check, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Holding {
  holding_id: string;
  holding_type: 'stock' | 'gold' | 'silver' | 'crypto';
  symbol?: string;
  name?: string;
  logo_url?: string;
  sector?: string;
  coin_id?: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  change_percentage: number;
  total_invested: number;
  current_value: number;
  profit_loss: number;
  profit_loss_pct: number;
}
interface SectorSlice { name: string; value: number; pct: number }
interface PortfolioDetail {
  id: string;
  name: string;
  total_value: number;
  total_invested: number;
  unrealized_pl: number;
  unrealized_pl_pct: number;
  today_pl: number;
  today_pl_pct: number;
  positions: number;
  holdings: Holding[];
  sectors: SectorSlice[];
}
interface Portfolio { id: string; name: string; is_default?: boolean }
interface Transaction {
  id: string;
  holding_type: string;
  transaction_type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_amount: number;
  fees: number;
  notes?: string | null;
  transaction_date: string;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const fmtPKR = (n: number, dp = 0) =>
  'Rs. ' + (Number(n) || 0).toLocaleString('en-PK', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const fmtNum = (n: number, dp = 2) =>
  (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dp });

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  stock: { label: 'Stock', icon: LineChart, color: 'text-blue-500' },
  gold: { label: 'Gold', icon: Coins, color: 'text-amber-500' },
  silver: { label: 'Silver', icon: Coins, color: 'text-slate-400' },
  crypto: { label: 'Crypto', icon: Bitcoin, color: 'text-orange-500' },
};

// ═════════════════════════════════════════════════════════════════════════════
export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PortfolioDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadPortfolios = useCallback(async () => {
    try {
      const res = await api.get('/portfolios');
      const raw = res.data?.items || res.data?.portfolios || res.data || [];
      const list: Portfolio[] = Array.isArray(raw) ? raw : [];
      setPortfolios(list);
      if (list.length) {
        const def = list.find((p) => p.is_default) || list[0];
        setSelectedId((prev) => prev && list.some((p) => p.id === prev) ? prev : def.id);
      } else {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (e) {
      console.error(e);
      setPortfolios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string, showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [d, tx] = await Promise.all([
        api.get(`/portfolios/${id}/detail`),
        api.get(`/portfolios/${id}/transactions`, { params: { page_size: 100 } }),
      ]);
      setDetail(d.data);
      const txRaw = tx.data?.items || tx.data || [];
      setTransactions(Array.isArray(txRaw) ? txRaw : []);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPortfolios(); }, [loadPortfolios]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/portfolios', { name: newName.trim() });
      setNewName('');
      setCreateOpen(false);
      await loadPortfolios();
      if (res.data?.id) setSelectedId(res.data.id);
    } catch (e) { console.error(e); } finally { setCreating(false); }
  };

  if (loading) return <PortfolioSkeleton />;

  // ── Empty state ──
  if (portfolios.length === 0) {
    return (
      <>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/10 ring-1 ring-primary/20">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Build your portfolio</h1>
            <p className="mt-2 text-muted-foreground">
              Track stocks, gold, silver and crypto together — with live prices, unrealized P&amp;L and a full transaction history.
            </p>
            <Button size="lg" className="mt-6" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Portfolio
            </Button>
          </div>
        </div>
        <CreateDialog {...{ createOpen, setCreateOpen, newName, setNewName, creating, handleCreate }} />
      </>
    );
  }

  const plUp = (detail?.unrealized_pl ?? 0) >= 0;
  const todayUp = (detail?.today_pl ?? 0) >= 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header hero ── */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 md:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {portfolios.length > 1 ? (
                <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
                  <SelectTrigger className="h-8 w-auto gap-2 border-none bg-transparent px-0 text-sm font-medium text-muted-foreground shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">{detail?.name || portfolios[0]?.name}</span>
              )}
              <button onClick={() => setCreateOpen(true)} className="text-muted-foreground/60 hover:text-primary" title="New portfolio">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Total portfolio value</p>
            <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums md:text-5xl">
              {fmtPKR(detail?.total_value ?? 0)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className={cn('inline-flex items-center gap-1 text-sm font-semibold tabular-nums', plUp ? 'text-emerald-500' : 'text-red-500')}>
                {plUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {plUp ? '+' : ''}{fmtPKR(detail?.unrealized_pl ?? 0)} ({plUp ? '+' : ''}{fmtNum(detail?.unrealized_pl_pct ?? 0)}%)
                <span className="font-normal text-muted-foreground">all-time</span>
              </span>
              <span className={cn('inline-flex items-center gap-1 text-sm font-semibold tabular-nums', todayUp ? 'text-emerald-500' : 'text-red-500')}>
                {todayUp ? '▲' : '▼'} {todayUp ? '+' : ''}{fmtPKR(detail?.today_pl ?? 0)} ({todayUp ? '+' : ''}{fmtNum(detail?.today_pl_pct ?? 0)}%)
                <span className="font-normal text-muted-foreground">today</span>
              </span>
            </div>
          </div>

          <Button size="lg" className="shrink-0 gap-2 shadow-lg shadow-primary/20" onClick={() => setTradeOpen(true)}>
            <ArrowRightLeft className="h-4 w-4" /> Buy / Sell
          </Button>
        </div>

        {/* mini stats */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t pt-5 sm:grid-cols-4">
          <MiniStat label="Invested" value={fmtPKR(detail?.total_invested ?? 0)} />
          <MiniStat label="Current Value" value={fmtPKR(detail?.total_value ?? 0)} />
          <MiniStat label="Unrealized P&L" value={`${plUp ? '+' : ''}${fmtNum(detail?.unrealized_pl_pct ?? 0)}%`} tone={plUp ? 'up' : 'down'} />
          <MiniStat label="Positions" value={String(detail?.positions ?? 0)} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="sectors">Allocation</TabsTrigger>
        </TabsList>

        {/* Holdings */}
        <TabsContent value="holdings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {refreshing && !detail ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : detail && detail.holdings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">Asset</th>
                        <th className="px-4 py-3 text-right font-medium">Qty</th>
                        <th className="px-4 py-3 text-right font-medium">Avg Cost</th>
                        <th className="px-4 py-3 text-right font-medium">Price</th>
                        <th className="px-4 py-3 text-right font-medium">Invested</th>
                        <th className="px-4 py-3 text-right font-medium">Value</th>
                        <th className="px-4 py-3 text-right font-medium">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.holdings.map((h) => {
                        const M = TYPE_META[h.holding_type] || TYPE_META.stock;
                        const up = h.profit_loss >= 0;
                        return (
                          <tr key={`${h.holding_type}-${h.holding_id}`} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <AssetAvatar holding={h} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 font-semibold">
                                    {h.symbol || M.label}
                                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-medium">{M.label}</Badge>
                                  </div>
                                  <p className="truncate text-xs text-muted-foreground max-w-[180px]">{h.name || h.sector || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtNum(h.quantity, 4)}</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">{fmtNum(h.avg_buy_price)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-mono font-semibold tabular-nums">{fmtNum(h.current_price)}</div>
                              <div className={cn('text-xs tabular-nums', h.change_percentage >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                                {h.change_percentage >= 0 ? '+' : ''}{fmtNum(h.change_percentage)}%
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">{fmtPKR(h.total_invested)}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{fmtPKR(h.current_value)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className={cn('font-mono font-semibold tabular-nums', up ? 'text-emerald-500' : 'text-red-500')}>
                                {up ? '+' : ''}{fmtPKR(h.profit_loss)}
                              </div>
                              <div className={cn('text-xs tabular-nums', up ? 'text-emerald-500' : 'text-red-500')}>
                                {up ? '+' : ''}{fmtNum(h.profit_loss_pct)}%
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyHoldings onAdd={() => setTradeOpen(true)} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Asset</th>
                        <th className="px-4 py-3 text-right font-medium">Qty</th>
                        <th className="px-4 py-3 text-right font-medium">Price</th>
                        <th className="px-4 py-3 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => {
                        const M = TYPE_META[tx.holding_type] || TYPE_META.stock;
                        const label = tx.holding_type === 'crypto'
                          ? (tx.notes || 'Crypto').toUpperCase()
                          : (tx.holding_type === 'stock' ? 'Stock' : M.label);
                        return (
                          <tr key={tx.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3 text-muted-foreground">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <Badge className={cn('font-semibold', tx.transaction_type === 'buy'
                                ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15'
                                : 'bg-red-500/15 text-red-600 hover:bg-red-500/15')}>
                                {tx.transaction_type.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium">{label}</span>
                              <Badge variant="outline" className="ml-2 h-4 px-1.5 text-[10px]">{M.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtNum(tx.quantity, 4)}</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtNum(tx.price)}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{fmtPKR(tx.total_amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-muted-foreground">No transactions yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sectors / Allocation */}
        <TabsContent value="sectors" className="mt-4">
          {detail && detail.sectors.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <Card>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={280}>
                    <RePieChart>
                      <Pie data={detail.sectors} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" nameKey="name">
                        {detail.sectors.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtPKR(v)} />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-3 pt-6">
                  {detail.sectors.map((s, i) => (
                    <div key={s.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          {s.name}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{fmtPKR(s.value)} · {fmtNum(s.pct, 1)}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">Allocation appears once you hold assets.</div>
          )}
        </TabsContent>
      </Tabs>

      {selectedId && (
        <TradeDialog
          open={tradeOpen}
          onOpenChange={setTradeOpen}
          portfolioId={selectedId}
          holdings={detail?.holdings || []}
          onDone={() => loadDetail(selectedId, true)}
        />
      )}
      <CreateDialog {...{ createOpen, setCreateOpen, newName, setNewName, creating, handleCreate }} />
    </div>
  );
}

// ─── Small pieces ─────────────────────────────────────────────────────────────
function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold tabular-nums', tone === 'up' && 'text-emerald-500', tone === 'down' && 'text-red-500')}>{value}</p>
    </div>
  );
}

const tickerLogoUrl = (symbol: string) =>
  `https://www.tickeranalysts.com/images/logos/${symbol.toUpperCase()}.svg`;

function AssetAvatar({ holding, size = 'h-9 w-9' }: {
  holding: Holding | { holding_type: string; logo_url?: string; symbol?: string };
  size?: string;
}) {
  const M = TYPE_META[holding.holding_type] || TYPE_META.stock;
  const Icon = M.icon;
  // Build a fallback chain per asset type; last resort is the colored type icon.
  const sources = (
    holding.holding_type === 'stock'
      ? [holding.symbol ? tickerLogoUrl(holding.symbol) : null, holding.logo_url]
      : holding.holding_type === 'crypto'
        ? [holding.logo_url]
        : [] // gold / silver → icon only
  ).filter(Boolean) as string[];

  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [holding.symbol, holding.logo_url, holding.holding_type]);

  const src = sources[index];
  if (!src) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border', size, M.color)}>
        <Icon className="h-4 w-4" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={src} src={src} alt={holding.symbol || M.label} loading="lazy"
      className={cn('shrink-0 rounded-full bg-white object-contain ring-1 ring-border', size)}
      onError={() => setIndex((i) => i + 1)} />
  );
}

function EmptyHoldings({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-muted"><Layers className="h-6 w-6 text-muted-foreground" /></div>
      <p className="font-medium">No holdings yet</p>
      <p className="mt-1 text-sm text-muted-foreground">Buy your first stock, gold, silver or crypto position.</p>
      <Button className="mt-4 gap-2" onClick={onAdd}><Plus className="h-4 w-4" /> Buy an asset</Button>
    </div>
  );
}

function CreateDialog({ createOpen, setCreateOpen, newName, setNewName, creating, handleCreate }: any) {
  return (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create Portfolio</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Portfolio name</Label>
            <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., My Investments"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
          </div>
          <Button className="w-full" disabled={creating || !newName.trim()} onClick={handleCreate}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Buy / Sell dialog
// ═════════════════════════════════════════════════════════════════════════════
interface AssetPick {
  holding_type: 'stock' | 'gold' | 'silver' | 'crypto';
  asset_id?: string;   // stock UUID or crypto coin id
  symbol: string;
  name: string;
  logo_url?: string;
  livePrice: number;   // PKR
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function TradeDialog({ open, onOpenChange, portfolioId, holdings, onDone }: {
  open: boolean; onOpenChange: (v: boolean) => void; portfolioId: string; holdings: Holding[]; onDone: () => void;
}) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [assetType, setAssetType] = useState<'stock' | 'gold' | 'silver' | 'crypto'>('stock');
  const [pick, setPick] = useState<AssetPick | null>(null);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [date, setDate] = useState(todayStr());
  const [step, setStep] = useState<'select' | 'review'>('select');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AssetPick[]>([]);
  const [searching, setSearching] = useState(false);
  const [fxRate, setFxRate] = useState(280);

  const reset = () => {
    setSide('buy'); setAssetType('stock'); setPick(null); setQty(''); setPrice(''); setFees('');
    setDate(todayStr()); setStep('select'); setError(null); setQuery(''); setResults([]);
  };
  useEffect(() => { if (!open) reset(); }, [open]);

  // fetch fx once (for crypto USD→PKR prefill)
  useEffect(() => {
    api.get('/commodities/prices').then((r) => { if (r.data?.exchange_rate) setFxRate(r.data.exchange_rate); }).catch(() => {});
  }, []);

  // metals: auto-select on type change
  useEffect(() => {
    setPick(null); setQuery(''); setResults([]); setError(null);
    if (assetType === 'gold' || assetType === 'silver') {
      api.get('/commodities/prices').then((r) => {
        const m = r.data?.[assetType];
        if (m) {
          const p: AssetPick = {
            holding_type: assetType, symbol: assetType.toUpperCase(),
            name: `${assetType[0].toUpperCase()}${assetType.slice(1)} (per tola)`, livePrice: Number(m.per_tola) || 0,
          };
          setPick(p); setPrice(String(p.livePrice));
        }
      }).catch(() => {});
    }
  }, [assetType]);

  // debounced search for stock / crypto
  useEffect(() => {
    if (assetType !== 'stock' && assetType !== 'crypto') return;
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        if (assetType === 'stock') {
          const r = await api.post('/screener/run', { filters: { search: query.trim() }, limit: 8 });
          const rows = r.data?.results || r.data?.stocks || r.data?.items || [];
          setResults(rows.map((s: any): AssetPick => ({
            holding_type: 'stock', asset_id: s.id, symbol: s.symbol, name: s.name,
            logo_url: s.logo_url, livePrice: Number(s.current_price) || 0,
          })));
        } else {
          const r = await api.get('/crypto/markets', { params: { search: query.trim(), per_page: 12 } });
          const coins = r.data?.coins || [];
          setResults(coins.map((c: any): AssetPick => ({
            holding_type: 'crypto', asset_id: c.id, symbol: (c.symbol || '').toUpperCase(), name: c.name,
            logo_url: c.image, livePrice: (Number(c.current_price) || 0) * fxRate,
          })));
        }
      } catch (e) { console.error(e); setResults([]); } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query, assetType, fxRate]);

  const choose = (a: AssetPick) => { setPick(a); setPrice(String(Math.round(a.livePrice * 100) / 100)); setResults([]); setQuery(a.symbol); };

  // holdings owned for the current asset type (for sell)
  const ownedForSell = useMemo(() => {
    if (side !== 'sell') return null;
    if (!pick) return null;
    const match = holdings.find((h) =>
      h.holding_type === pick.holding_type &&
      (pick.holding_type === 'crypto' ? h.coin_id === pick.asset_id
        : pick.holding_type === 'stock' ? h.holding_id === pick.asset_id : true));
    return match || null;
  }, [side, pick, holdings]);

  const qtyN = parseFloat(qty) || 0;
  const priceN = parseFloat(price) || 0;
  const feesN = parseFloat(fees) || 0;
  const total = qtyN * priceN + (side === 'buy' ? feesN : -feesN);

  const canProceed = pick && qtyN > 0 && priceN >= 0 &&
    (side === 'buy' || (ownedForSell && qtyN <= ownedForSell.quantity));

  const submit = async () => {
    if (!pick) return;
    setSubmitting(true); setError(null);
    try {
      await api.post(`/portfolios/${portfolioId}/trade`, {
        holding_type: pick.holding_type,
        asset_id: pick.asset_id,
        transaction_type: side,
        quantity: qtyN,
        price: priceN,
        fees: feesN,
        transaction_date: new Date(date).toISOString(),
      });
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Trade failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const TYPES: Array<AssetPick['holding_type']> = ['stock', 'gold', 'silver', 'crypto'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{step === 'review' ? 'Review order' : 'Buy / Sell'}</DialogTitle></DialogHeader>

        {step === 'select' ? (
          <div className="space-y-4">
            {/* Buy / Sell toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              {(['buy', 'sell'] as const).map((s) => (
                <button key={s} onClick={() => setSide(s)}
                  className={cn('rounded-md py-2 text-sm font-semibold capitalize transition-colors',
                    side === s ? (s === 'buy' ? 'bg-emerald-500 text-white shadow' : 'bg-red-500 text-white shadow') : 'text-muted-foreground hover:text-foreground')}>
                  {s}
                </button>
              ))}
            </div>

            {/* Asset type */}
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map((t) => {
                const M = TYPE_META[t]; const Icon = M.icon; const active = assetType === t;
                return (
                  <button key={t} onClick={() => setAssetType(t)}
                    className={cn('flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all',
                      active ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40 hover:bg-muted')}>
                    <Icon className={cn('h-4 w-4', active ? 'text-primary' : M.color)} />
                    {M.label}
                  </button>
                );
              })}
            </div>

            {/* Asset selector */}
            {(assetType === 'stock' || assetType === 'crypto') ? (
              <div className="space-y-2">
                <Label>{assetType === 'stock' ? 'Search stock' : 'Search coin'}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder={assetType === 'stock' ? 'e.g., OGDC' : 'e.g., Bitcoin'}
                    value={query} onChange={(e) => { setQuery(e.target.value); setPick(null); }} />
                  {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
                {results.length > 0 && !pick && (
                  <div className="max-h-56 overflow-y-auto rounded-lg border">
                    {results.map((r) => (
                      <button key={`${r.holding_type}-${r.asset_id}`} onClick={() => choose(r)}
                        className="flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-0 hover:bg-muted">
                        <AssetAvatar holding={{ holding_type: r.holding_type, logo_url: r.logo_url, symbol: r.symbol }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{r.symbol}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.name}</p>
                        </div>
                        <span className="font-mono text-sm tabular-nums">{fmtNum(r.livePrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              pick && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                  <AssetAvatar holding={{ holding_type: pick.holding_type, symbol: pick.symbol }} />
                  <div className="flex-1"><p className="text-sm font-semibold">{pick.name}</p>
                    <p className="text-xs text-muted-foreground">Live: {fmtPKR(pick.livePrice)}/tola</p></div>
                </div>
              )
            )}

            {/* Selected chip for stock/crypto */}
            {pick && (assetType === 'stock' || assetType === 'crypto') && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <AssetAvatar holding={{ holding_type: pick.holding_type, logo_url: pick.logo_url, symbol: pick.symbol }} />
                <div className="flex-1"><p className="text-sm font-semibold">{pick.symbol}</p><p className="truncate text-xs text-muted-foreground">{pick.name}</p></div>
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}

            {side === 'sell' && pick && ownedForSell && (
              <p className="text-xs text-muted-foreground">You hold <span className="font-semibold text-foreground">{fmtNum(ownedForSell.quantity, 4)}</span> — avg {fmtPKR(ownedForSell.avg_buy_price)}</p>
            )}
            {side === 'sell' && pick && !ownedForSell && (
              <p className="text-xs text-red-500">You don&apos;t hold this asset.</p>
            )}

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity {(assetType === 'gold' || assetType === 'silver') && <span className="text-muted-foreground">(tola)</span>}</Label>
                <Input type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Price <span className="text-muted-foreground">(PKR)</span></Label>
                <Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Commission <span className="text-muted-foreground">(opt.)</span></Label>
                <Input type="number" inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
              <span className="text-sm text-muted-foreground">Estimated total</span>
              <span className="text-lg font-bold tabular-nums">{fmtPKR(total, 2)}</span>
            </div>

            <Button className="w-full gap-1" disabled={!canProceed} onClick={() => setStep('review')}>
              Review order <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          // ── Review ──
          <div className="space-y-4">
            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-3">
                <AssetAvatar holding={{ holding_type: pick!.holding_type, logo_url: pick!.logo_url, symbol: pick!.symbol }} />
                <div className="flex-1"><p className="font-semibold">{pick!.symbol}</p><p className="text-xs text-muted-foreground">{pick!.name}</p></div>
                <Badge className={cn('font-semibold', side === 'buy' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600')}>{side.toUpperCase()}</Badge>
              </div>
              <dl className="space-y-2 text-sm">
                <Row label="Quantity" value={fmtNum(qtyN, 4)} />
                <Row label="Price" value={fmtPKR(priceN, 2)} />
                <Row label="Commission" value={fmtPKR(feesN, 2)} />
                <Row label="Date" value={new Date(date).toLocaleDateString()} />
                <div className="mt-2 border-t pt-2">
                  <Row label={<span className="font-semibold text-foreground">Total {side === 'buy' ? 'cost' : 'proceeds'}</span>}
                    value={<span className="text-base font-bold">{fmtPKR(total, 2)}</span>} />
                </div>
              </dl>
            </div>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('select')} disabled={submitting}>Back</Button>
              <Button className={cn('flex-1', side === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700')}
                onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm ${side}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
