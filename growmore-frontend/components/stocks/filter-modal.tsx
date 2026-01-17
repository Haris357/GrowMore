'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';

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

export function FilterModal({ isOpen, onClose, filters, onApply }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<ScreenerFilters>(filters);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters(defaultFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.sector !== 'All Sectors') count++;
    if (localFilters.market_cap_min > 0 || localFilters.market_cap_max < 1000000) count++;
    if (localFilters.pe_min > 0 || localFilters.pe_max < 100) count++;
    if (localFilters.pb_min > 0 || localFilters.pb_max < 20) count++;
    if (localFilters.dividend_yield_min > 0) count++;
    if (localFilters.roe_min > 0) count++;
    if (localFilters.debt_to_equity_max < 5) count++;
    if (localFilters.revenue_growth_min > -50) count++;
    if (localFilters.profit_growth_min > -50) count++;
    if (localFilters.price_min > 0 || localFilters.price_max < 10000) count++;
    if (localFilters.volume_min > 0) count++;
    if (localFilters.change_pct_min > -100 || localFilters.change_pct_max < 100) count++;
    return count;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Filter Stocks
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary">{getActiveFilterCount()} active</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Set your criteria to filter stocks
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6 py-4">
            {/* Sector */}
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select
                value={localFilters.sector}
                onValueChange={(value) => setLocalFilters({ ...localFilters, sector: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PSX_SECTORS.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Price Range (Rs.)</Label>
                <span className="text-sm text-muted-foreground">
                  {localFilters.price_min} - {localFilters.price_max}
                </span>
              </div>
              <Slider
                value={[localFilters.price_min, localFilters.price_max]}
                onValueChange={([min, max]) => setLocalFilters({ ...localFilters, price_min: min, price_max: max })}
                min={0}
                max={10000}
                step={10}
              />
            </div>

            {/* Change % */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Change %</Label>
                <span className="text-sm text-muted-foreground">
                  {localFilters.change_pct_min}% - {localFilters.change_pct_max}%
                </span>
              </div>
              <Slider
                value={[localFilters.change_pct_min, localFilters.change_pct_max]}
                onValueChange={([min, max]) => setLocalFilters({ ...localFilters, change_pct_min: min, change_pct_max: max })}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            {/* Market Cap */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Market Cap (Cr)</Label>
                <span className="text-sm text-muted-foreground">
                  {localFilters.market_cap_min} - {localFilters.market_cap_max}
                </span>
              </div>
              <Slider
                value={[localFilters.market_cap_min, localFilters.market_cap_max]}
                onValueChange={([min, max]) => setLocalFilters({ ...localFilters, market_cap_min: min, market_cap_max: max })}
                min={0}
                max={1000000}
                step={1000}
              />
            </div>

            {/* P/E Ratio */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>P/E Ratio</Label>
                <span className="text-sm text-muted-foreground">
                  {localFilters.pe_min} - {localFilters.pe_max}
                </span>
              </div>
              <Slider
                value={[localFilters.pe_min, localFilters.pe_max]}
                onValueChange={([min, max]) => setLocalFilters({ ...localFilters, pe_min: min, pe_max: max })}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {/* P/B Ratio */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>P/B Ratio</Label>
                <span className="text-sm text-muted-foreground">
                  {localFilters.pb_min} - {localFilters.pb_max}
                </span>
              </div>
              <Slider
                value={[localFilters.pb_min, localFilters.pb_max]}
                onValueChange={([min, max]) => setLocalFilters({ ...localFilters, pb_min: min, pb_max: max })}
                min={0}
                max={20}
                step={0.5}
              />
            </div>

            {/* Dividend Yield */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Min Dividend Yield (%)</Label>
                <span className="text-sm text-muted-foreground">{localFilters.dividend_yield_min}%</span>
              </div>
              <Slider
                value={[localFilters.dividend_yield_min]}
                onValueChange={([value]) => setLocalFilters({ ...localFilters, dividend_yield_min: value })}
                min={0}
                max={20}
                step={0.5}
              />
            </div>

            {/* ROE */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Min ROE (%)</Label>
                <span className="text-sm text-muted-foreground">{localFilters.roe_min}%</span>
              </div>
              <Slider
                value={[localFilters.roe_min]}
                onValueChange={([value]) => setLocalFilters({ ...localFilters, roe_min: value })}
                min={0}
                max={50}
                step={1}
              />
            </div>

            {/* Debt to Equity */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max Debt/Equity</Label>
                <span className="text-sm text-muted-foreground">{localFilters.debt_to_equity_max}</span>
              </div>
              <Slider
                value={[localFilters.debt_to_equity_max]}
                onValueChange={([value]) => setLocalFilters({ ...localFilters, debt_to_equity_max: value })}
                min={0}
                max={5}
                step={0.1}
              />
            </div>

            {/* Min Volume */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Min Volume</Label>
                <span className="text-sm text-muted-foreground">{localFilters.volume_min.toLocaleString()}</span>
              </div>
              <Slider
                value={[localFilters.volume_min]}
                onValueChange={([value]) => setLocalFilters({ ...localFilters, volume_min: value })}
                min={0}
                max={10000000}
                step={10000}
              />
            </div>

            {/* Revenue Growth */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Min Revenue Growth (%)</Label>
                <span className="text-sm text-muted-foreground">{localFilters.revenue_growth_min}%</span>
              </div>
              <Slider
                value={[localFilters.revenue_growth_min]}
                onValueChange={([value]) => setLocalFilters({ ...localFilters, revenue_growth_min: value })}
                min={-50}
                max={100}
                step={5}
              />
            </div>

            {/* Profit Growth */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Min Profit Growth (%)</Label>
                <span className="text-sm text-muted-foreground">{localFilters.profit_growth_min}%</span>
              </div>
              <Slider
                value={[localFilters.profit_growth_min]}
                onValueChange={([value]) => setLocalFilters({ ...localFilters, profit_growth_min: value })}
                min={-50}
                max={100}
                step={5}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset}>
            Reset All
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
