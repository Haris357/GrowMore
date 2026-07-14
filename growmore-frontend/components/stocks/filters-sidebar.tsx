'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── model ─────────────────────────────────────────────────────────────────────

export type Shariah = 'all' | 'compliant' | 'non_compliant';

export interface AdvancedFilters {
  shariah: Shariah;
  sectors: string[];
  ranges: Record<string, { min?: number; max?: number }>;
}

export const defaultAdvancedFilters: AdvancedFilters = { shariah: 'all', sectors: [], ranges: {} };

interface RangeDef {
  key: string;
  label: string;
  backend: string;
  group: string;
  scale?: number; // display → backend multiplier
}

const RANGE_DEFS: RangeDef[] = [
  // Valuation
  { key: 'pe', label: 'P/E (TTM)', backend: 'pe_ratio', group: 'Valuation' },
  { key: 'pb', label: 'P/B', backend: 'pb_ratio', group: 'Valuation' },
  { key: 'ps', label: 'P/S (TTM)', backend: 'ps_ratio', group: 'Valuation' },
  { key: 'peg', label: 'PEG', backend: 'peg_ratio', group: 'Valuation' },
  { key: 'ev_ebitda', label: 'EV / EBITDA', backend: 'ev_ebitda', group: 'Valuation' },
  { key: 'div_yield', label: 'Dividend Yield (%)', backend: 'div_yield', group: 'Valuation' },
  { key: 'fcf_yield', label: 'FCF Yield (%)', backend: 'fcf_yield', group: 'Valuation' },
  // Profitability
  { key: 'gross_margin', label: 'Gross Margin (%)', backend: 'gross_margin', group: 'Profitability' },
  { key: 'operating_margin', label: 'Operating Margin (%)', backend: 'operating_margin', group: 'Profitability' },
  { key: 'net_margin', label: 'Net Margin (%)', backend: 'net_margin', group: 'Profitability' },
  { key: 'roe', label: 'Return on Equity (%)', backend: 'roe', group: 'Profitability' },
  { key: 'roa', label: 'Return on Assets (%)', backend: 'roa', group: 'Profitability' },
  { key: 'roce', label: 'Return on Capital Employed (%)', backend: 'roce', group: 'Profitability' },
  { key: 'interest_coverage', label: 'Interest Coverage', backend: 'interest_coverage', group: 'Profitability' },
  // Financial Health
  { key: 'debt_equity', label: 'Debt to Equity', backend: 'debt_equity', group: 'Financial Health' },
  { key: 'debt_assets', label: 'Debt to Assets', backend: 'debt_assets', group: 'Financial Health' },
  { key: 'current_ratio', label: 'Current Ratio', backend: 'current_ratio', group: 'Financial Health' },
  { key: 'quick_ratio', label: 'Quick Ratio', backend: 'quick_ratio', group: 'Financial Health' },
  // Growth
  { key: 'revenue_growth', label: 'Revenue Growth YoY (%)', backend: 'revenue_growth', group: 'Growth' },
  { key: 'earnings_growth', label: 'Earnings Growth YoY (%)', backend: 'earnings_growth', group: 'Growth' },
  { key: 'profit_growth', label: 'Profit Growth YoY (%)', backend: 'profit_growth', group: 'Growth' },
  // Per Share
  { key: 'eps', label: 'EPS (Rs.)', backend: 'eps', group: 'Per Share' },
  { key: 'dps', label: 'DPS (Rs.)', backend: 'dps', group: 'Per Share' },
  { key: 'book_value', label: 'Book Value / Share (Rs.)', backend: 'book_value', group: 'Per Share' },
  // Market & Trading
  { key: 'market_cap', label: 'Market Cap (Rs. bn)', backend: 'market_cap', group: 'Market & Trading', scale: 1e9 },
  { key: 'price', label: 'Price (Rs.)', backend: 'price', group: 'Market & Trading' },
  { key: 'change_pct', label: 'Price Change (%)', backend: 'change_pct', group: 'Market & Trading' },
  { key: 'volume', label: 'Volume', backend: 'volume', group: 'Market & Trading' },
  { key: 'week_52_high', label: '52W High (Rs.)', backend: 'week_52_high', group: 'Market & Trading' },
  { key: 'week_52_low', label: '52W Low (Rs.)', backend: 'week_52_low', group: 'Market & Trading' },
  { key: 'beta', label: 'Beta', backend: 'beta', group: 'Market & Trading' },
];

const GROUP_ORDER = ['Valuation', 'Profitability', 'Financial Health', 'Growth', 'Per Share', 'Market & Trading'];

export const SECTORS = [
  'Automobile Assembler', 'Automobile Parts & Accessories', 'Cable & Electrical Goods', 'Cement',
  'Chemical', 'Close-End Mutual Fund', 'Commercial Banks', 'Engineering', 'Exchange Traded Funds',
  'Fertilizer', 'Food & Personal Care Products', 'Glass & Ceramics', 'Insurance',
  'Inv. Banks / Inv. Cos. / Securities Cos.', 'Jute', 'Leasing Companies', 'Leather & Tanneries',
  'Miscellaneous', 'Modarabas', 'Oil & Gas Exploration Companies', 'Oil & Gas Marketing Companies',
  'Paper & Board', 'Pharmaceuticals', 'Power Generation & Distribution', 'Real Estate Investment Trust',
  'Refinery', 'Sugar & Allied Industries', 'Synthetic & Rayon', 'Technology & Communication',
  'Textile Composite', 'Textile Spinning', 'Textile Weaving', 'Tobacco', 'Transport',
  'Vanaspati & Allied Industries', 'Woollen',
];

const SECTOR_CODE_TO_NAME: Record<string, string> = {
  BANK: 'Commercial Banks', CEMENT: 'Cement', FERT: 'Fertilizer', OIL: 'Oil & Gas Exploration Companies',
  OILM: 'Oil & Gas Marketing Companies', POWER: 'Power Generation & Distribution', PHARMA: 'Pharmaceuticals',
  TECH: 'Technology & Communication', AUTO: 'Automobile Assembler', CHEM: 'Chemical',
  TEXTILE: 'Textile Composite', SUGAR: 'Sugar & Allied Industries', FOOD: 'Food & Personal Care Products',
  INS: 'Insurance', REFINERY: 'Refinery', TRANSPORT: 'Transport',
};

// ── mapping helpers ───────────────────────────────────────────────────────────

export function buildBackendFilters(f: AdvancedFilters): Record<string, any> {
  const backend: Record<string, any> = {};
  if (f.shariah !== 'all') backend.shariah = f.shariah;
  if (f.sectors.length) backend.sector_names = f.sectors;
  for (const def of RANGE_DEFS) {
    const r = f.ranges[def.key];
    if (!r) continue;
    const scale = def.scale ?? 1;
    const out: { min?: number; max?: number } = {};
    if (r.min != null) out.min = r.min * scale;
    if (r.max != null) out.max = r.max * scale;
    if (out.min != null || out.max != null) backend[def.backend] = out;
  }
  return backend;
}

export function backendToAdvanced(backend: Record<string, any>): AdvancedFilters {
  const f: AdvancedFilters = { shariah: 'all', sectors: [], ranges: {} };
  if (backend.shariah === 'compliant' || backend.shariah === 'non_compliant') f.shariah = backend.shariah;
  if (Array.isArray(backend.sector_names)) f.sectors = [...backend.sector_names];
  else if (backend.sector_name) f.sectors = [backend.sector_name];
  else if (backend.sector_code && SECTOR_CODE_TO_NAME[backend.sector_code]) f.sectors = [SECTOR_CODE_TO_NAME[backend.sector_code]];
  for (const def of RANGE_DEFS) {
    const v = backend[def.backend];
    if (v && typeof v === 'object') {
      const scale = def.scale ?? 1;
      const r: { min?: number; max?: number } = {};
      if (v.min != null) r.min = v.min / scale;
      if (v.max != null) r.max = v.max / scale;
      if (r.min != null || r.max != null) f.ranges[def.key] = r;
    }
  }
  return f;
}

export function getActiveChips(f: AdvancedFilters): { key: string; label: string; value: string }[] {
  const chips: { key: string; label: string; value: string }[] = [];
  if (f.shariah === 'compliant') chips.push({ key: 'shariah', label: 'Shariah', value: 'Compliant' });
  if (f.shariah === 'non_compliant') chips.push({ key: 'shariah', label: 'Shariah', value: 'Non-compliant' });
  for (const s of f.sectors) chips.push({ key: `sector:${s}`, label: 'Sector', value: s });
  for (const def of RANGE_DEFS) {
    const r = f.ranges[def.key];
    if (!r) continue;
    const parts: string[] = [];
    if (r.min != null) parts.push(`≥ ${r.min}`);
    if (r.max != null) parts.push(`≤ ${r.max}`);
    if (parts.length) chips.push({ key: `range:${def.key}`, label: def.label, value: parts.join('  ') });
  }
  return chips;
}

export function clearChip(f: AdvancedFilters, key: string): AdvancedFilters {
  const nf: AdvancedFilters = { ...f, sectors: [...f.sectors], ranges: { ...f.ranges } };
  if (key === 'shariah') nf.shariah = 'all';
  else if (key.startsWith('sector:')) nf.sectors = nf.sectors.filter((s) => s !== key.slice(7));
  else if (key.startsWith('range:')) delete nf.ranges[key.slice(6)];
  return nf;
}

// ── component ─────────────────────────────────────────────────────────────────

export function FiltersSidebar({
  isOpen,
  onClose,
  filters,
  onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onApply: (f: AdvancedFilters) => void;
}) {
  const [draft, setDraft] = useState<AdvancedFilters>(filters);
  const [sectorList, setSectorList] = useState<string[]>(SECTORS);

  useEffect(() => {
    if (isOpen) setDraft(filters);
  }, [isOpen, filters]);

  // Fetch the real (exact) sector names so filtering matches the DB.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/screener/sectors')
      .then((res) => {
        const list: string[] = res.data?.sectors || [];
        if (!cancelled && list.length) setSectorList(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setRange = (key: string, side: 'min' | 'max', raw: string) => {
    setDraft((d) => {
      const ranges = { ...d.ranges };
      const r = { ...(ranges[key] || {}) };
      const num = raw === '' ? undefined : Number(raw);
      if (num == null || Number.isNaN(num)) delete r[side];
      else r[side] = num;
      if (r.min == null && r.max == null) delete ranges[key];
      else ranges[key] = r;
      return { ...d, ranges };
    });
  };

  const toggleSector = (s: string) =>
    setDraft((d) => ({
      ...d,
      sectors: d.sectors.includes(s) ? d.sectors.filter((x) => x !== s) : [...d.sectors, s],
    }));

  const activeCount = getActiveChips(draft).length;

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="p-5 border-b space-y-0 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Filter stocks by various criteria</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-5">
            {/* Shariah */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Shariah Compliant</span>
                <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400 text-[10px]">Islamic Finance</Badge>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['all', 'compliant', 'non_compliant'] as Shariah[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setDraft((d) => ({ ...d, shariah: v }))}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                      draft.shariah === v
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {v === 'all' ? 'All' : v === 'compliant' ? 'Compliant' : 'Non-compliant'}
                  </button>
                ))}
              </div>
            </div>

            <Accordion type="multiple" defaultValue={['Sector', 'Valuation']} className="w-full">
              {/* Sector */}
              <AccordionItem value="Sector">
                <AccordionTrigger className="text-sm font-semibold">
                  Sector{draft.sectors.length > 0 && <span className="ml-1 text-xs text-muted-foreground">({draft.sectors.length})</span>}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="max-h-64 overflow-y-auto pr-1 space-y-0.5">
                    {sectorList.map((s) => (
                      <label key={s} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-muted cursor-pointer">
                        <Checkbox checked={draft.sectors.includes(s)} onCheckedChange={() => toggleSector(s)} />
                        <span className="text-xs uppercase">{s}</span>
                      </label>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Range groups */}
              {GROUP_ORDER.map((group) => (
                <AccordionItem key={group} value={group}>
                  <AccordionTrigger className="text-sm font-semibold">{group}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {RANGE_DEFS.filter((d) => d.group === group).map((def) => {
                        const r = draft.ranges[def.key] || {};
                        return (
                          <div key={def.key} className="space-y-1.5">
                            <p className="text-xs font-medium">{def.label}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="Min"
                                value={r.min ?? ''}
                                onChange={(e) => setRange(def.key, 'min', e.target.value)}
                                className="h-9"
                              />
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="Max"
                                value={r.max ?? ''}
                                onChange={(e) => setRange(def.key, 'max', e.target.value)}
                                className="h-9"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 border-t p-4">
          <Button variant="outline" className="flex-1" onClick={() => setDraft(defaultAdvancedFilters)}>
            Reset all
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Show results{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
