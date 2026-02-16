'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Filter, RotateCcw } from 'lucide-react';

export interface ScreenerFilters {
  sector: string;
  market_cap_min: number;
  market_cap_max: number;
  pe_min: number;
  pe_max: number;
  pb_min: number;
  pb_max: number;
  dividend_yield_min: number;
  roe_min: number;
  debt_to_equity_max: number;
  revenue_growth_min: number;
  profit_growth_min: number;
  eps_min: number;
  eps_max: number;
  price_min: number;
  price_max: number;
  volume_min: number;
  change_pct_min: number;
  change_pct_max: number;
}

export const defaultFilters: ScreenerFilters = {
  sector: 'All Sectors',
  market_cap_min: 0,
  market_cap_max: 1000000,
  pe_min: 0,
  pe_max: 100,
  pb_min: 0,
  pb_max: 20,
  dividend_yield_min: 0,
  roe_min: 0,
  debt_to_equity_max: 5,
  revenue_growth_min: -50,
  profit_growth_min: -50,
  eps_min: -100,
  eps_max: 1000,
  price_min: 0,
  price_max: 10000,
  volume_min: 0,
  change_pct_min: -100,
  change_pct_max: 100,
};

const PSX_SECTORS = [
  'All Sectors',
  'Automobile Assembler',
  'Automobile Parts & Accessories',
  'Banking',
  'Cable & Electrical Goods',
  'Cement',
  'Chemical',
  'Close-End Mutual Fund',
  'Commercial Banks',
  'Engineering',
  'Fertilizer',
  'Food & Personal Care Products',
  'Glass & Ceramics',
  'Insurance',
  'Inv. Banks / Inv. Cos. / Securities Cos.',
  'Jute',
  'Leasing Companies',
  'Leather & Tanneries',
  'Miscellaneous',
  'Modarabas',
  'Oil & Gas Exploration Companies',
  'Oil & Gas Marketing Companies',
  'Paper & Board',
  'Pharmaceuticals',
  'Power Generation & Distribution',
  'Real Estate Investment Trust',
  'Refinery',
  'Sugar & Allied Industries',
  'Synthetic & Rayon',
  'Technology & Communication',
  'Textile Composite',
  'Textile Spinning',
  'Textile Weaving',
  'Tobacco',
  'Transport',
  'Vanaspati & Allied Industries',
  'Woollen',
];

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ScreenerFilters;
  onApply: (filters: ScreenerFilters) => void;
}

export function getActiveFiltersList(filters: ScreenerFilters): { key: string; label: string; value: string }[] {
  const active: { key: string; label: string; value: string }[] = [];
  if (filters.sector !== 'All Sectors') active.push({ key: 'sector', label: 'Sector', value: filters.sector });
  if (filters.price_min > 0 || filters.price_max < 10000) active.push({ key: 'price', label: 'Price', value: `Rs.${filters.price_min}-${filters.price_max}` });
  if (filters.change_pct_min > -100 || filters.change_pct_max < 100) active.push({ key: 'change_pct', label: 'Change%', value: `${filters.change_pct_min}% to ${filters.change_pct_max}%` });
  if (filters.volume_min > 0) active.push({ key: 'volume', label: 'Volume', value: `>${filters.volume_min.toLocaleString()}` });
  if (filters.market_cap_min > 0 || filters.market_cap_max < 1000000) active.push({ key: 'market_cap', label: 'Mkt Cap', value: `${filters.market_cap_min}-${filters.market_cap_max} Cr` });
  if (filters.pe_min > 0 || filters.pe_max < 100) active.push({ key: 'pe', label: 'P/E', value: `${filters.pe_min}-${filters.pe_max}` });
  if (filters.pb_min > 0 || filters.pb_max < 20) active.push({ key: 'pb', label: 'P/B', value: `${filters.pb_min}-${filters.pb_max}` });
  if (filters.eps_min > -100 || filters.eps_max < 1000) active.push({ key: 'eps', label: 'EPS', value: `${filters.eps_min}-${filters.eps_max}` });
  if (filters.dividend_yield_min > 0) active.push({ key: 'dividend_yield', label: 'Div Yield', value: `>${filters.dividend_yield_min}%` });
  if (filters.roe_min > 0) active.push({ key: 'roe', label: 'ROE', value: `>${filters.roe_min}%` });
  if (filters.debt_to_equity_max < 5) active.push({ key: 'de', label: 'D/E', value: `<${filters.debt_to_equity_max}` });
  if (filters.revenue_growth_min > -50) active.push({ key: 'rev_growth', label: 'Rev Growth', value: `>${filters.revenue_growth_min}%` });
  if (filters.profit_growth_min > -50) active.push({ key: 'profit_growth', label: 'Profit Growth', value: `>${filters.profit_growth_min}%` });
  return active;
}

export function clearSingleFilter(filters: ScreenerFilters, key: string): ScreenerFilters {
  const updated = { ...filters };
  switch (key) {
    case 'sector': updated.sector = defaultFilters.sector; break;
    case 'price': updated.price_min = defaultFilters.price_min; updated.price_max = defaultFilters.price_max; break;
    case 'change_pct': updated.change_pct_min = defaultFilters.change_pct_min; updated.change_pct_max = defaultFilters.change_pct_max; break;
    case 'volume': updated.volume_min = defaultFilters.volume_min; break;
    case 'market_cap': updated.market_cap_min = defaultFilters.market_cap_min; updated.market_cap_max = defaultFilters.market_cap_max; break;
    case 'pe': updated.pe_min = defaultFilters.pe_min; updated.pe_max = defaultFilters.pe_max; break;
    case 'pb': updated.pb_min = defaultFilters.pb_min; updated.pb_max = defaultFilters.pb_max; break;
    case 'eps': updated.eps_min = defaultFilters.eps_min; updated.eps_max = defaultFilters.eps_max; break;
    case 'dividend_yield': updated.dividend_yield_min = defaultFilters.dividend_yield_min; break;
    case 'roe': updated.roe_min = defaultFilters.roe_min; break;
    case 'de': updated.debt_to_equity_max = defaultFilters.debt_to_equity_max; break;
    case 'rev_growth': updated.revenue_growth_min = defaultFilters.revenue_growth_min; break;
    case 'profit_growth': updated.profit_growth_min = defaultFilters.profit_growth_min; break;
  }
  return updated;
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="relative">
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder={placeholder || '0'}
          className="h-8 text-xs pr-8"
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function MinMaxRow({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
  suffix,
}: {
  label: string;
  minValue: number;
  maxValue: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Min" value={minValue} onChange={onMinChange} placeholder={minPlaceholder} suffix={suffix} />
        <NumberInput label="Max" value={maxValue} onChange={onMaxChange} placeholder={maxPlaceholder} suffix={suffix} />
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
      <Separator className="flex-1" />
    </div>
  );
}

export function FilterModal({ isOpen, onClose, filters, onApply }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<ScreenerFilters>(filters);

  useEffect(() => {
    if (isOpen) setLocalFilters(filters);
  }, [isOpen, filters]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters(defaultFilters);
  };

  const update = (partial: Partial<ScreenerFilters>) => {
    setLocalFilters((prev) => ({ ...prev, ...partial }));
  };

  const activeCount = getActiveFiltersList(localFilters).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filter Stocks
            {activeCount > 0 && (
              <Badge variant="secondary" className="text-xs">{activeCount} active</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Set criteria to narrow down stocks
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[460px] pr-3">
          <div className="space-y-4 py-2">
            {/* Sector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sector</Label>
              <Select
                value={localFilters.sector}
                onValueChange={(value) => update({ sector: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PSX_SECTORS.map((sector) => (
                    <SelectItem key={sector} value={sector} className="text-xs">
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price & Trading */}
            <SectionHeader title="Price & Trading" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <MinMaxRow
                label="Price (Rs.)"
                minValue={localFilters.price_min}
                maxValue={localFilters.price_max}
                onMinChange={(v) => update({ price_min: v })}
                onMaxChange={(v) => update({ price_max: v })}
                minPlaceholder="0"
                maxPlaceholder="10,000"
              />
              <MinMaxRow
                label="Change %"
                minValue={localFilters.change_pct_min}
                maxValue={localFilters.change_pct_max}
                onMinChange={(v) => update({ change_pct_min: v })}
                onMaxChange={(v) => update({ change_pct_max: v })}
                suffix="%"
                minPlaceholder="-100"
                maxPlaceholder="100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Min Volume</Label>
              <NumberInput value={localFilters.volume_min} onChange={(v) => update({ volume_min: v })} placeholder="0" />
            </div>

            {/* Valuation */}
            <SectionHeader title="Valuation" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <MinMaxRow
                label="P/E Ratio"
                minValue={localFilters.pe_min}
                maxValue={localFilters.pe_max}
                onMinChange={(v) => update({ pe_min: v })}
                onMaxChange={(v) => update({ pe_max: v })}
                minPlaceholder="0"
                maxPlaceholder="100"
              />
              <MinMaxRow
                label="P/B Ratio"
                minValue={localFilters.pb_min}
                maxValue={localFilters.pb_max}
                onMinChange={(v) => update({ pb_min: v })}
                onMaxChange={(v) => update({ pb_max: v })}
                minPlaceholder="0"
                maxPlaceholder="20"
              />
              <MinMaxRow
                label="Market Cap (Cr)"
                minValue={localFilters.market_cap_min}
                maxValue={localFilters.market_cap_max}
                onMinChange={(v) => update({ market_cap_min: v })}
                onMaxChange={(v) => update({ market_cap_max: v })}
                minPlaceholder="0"
                maxPlaceholder="1,000,000"
              />
              <MinMaxRow
                label="EPS (Rs.)"
                minValue={localFilters.eps_min}
                maxValue={localFilters.eps_max}
                onMinChange={(v) => update({ eps_min: v })}
                onMaxChange={(v) => update({ eps_max: v })}
                minPlaceholder="-100"
                maxPlaceholder="1,000"
              />
            </div>

            {/* Profitability & Returns */}
            <SectionHeader title="Profitability & Returns" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Min Dividend Yield</Label>
                <NumberInput value={localFilters.dividend_yield_min} onChange={(v) => update({ dividend_yield_min: v })} placeholder="0" suffix="%" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Min ROE</Label>
                <NumberInput value={localFilters.roe_min} onChange={(v) => update({ roe_min: v })} placeholder="0" suffix="%" />
              </div>
            </div>

            {/* Leverage */}
            <SectionHeader title="Leverage" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Max Debt/Equity</Label>
                <NumberInput value={localFilters.debt_to_equity_max} onChange={(v) => update({ debt_to_equity_max: v })} placeholder="5" />
              </div>
            </div>

            {/* Growth */}
            <SectionHeader title="Growth" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Min Revenue Growth</Label>
                <NumberInput value={localFilters.revenue_growth_min} onChange={(v) => update({ revenue_growth_min: v })} placeholder="-50" suffix="%" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Min Profit Growth</Label>
                <NumberInput value={localFilters.profit_growth_min} onChange={(v) => update({ profit_growth_min: v })} placeholder="-50" suffix="%" />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
            <RotateCcw className="h-3 w-3 mr-1.5" />
            Reset All
          </Button>
          <Button size="sm" onClick={handleApply} className="text-xs">
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
