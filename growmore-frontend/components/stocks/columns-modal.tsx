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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export interface ColumnConfig {
  key: string;
  label: string;
  category: string;
  visible: boolean;
}

export const availableColumns: ColumnConfig[] = [
  // Basic Info
  { key: 'symbol', label: 'Symbol', category: 'Basic', visible: true },
  { key: 'name', label: 'Company Name', category: 'Basic', visible: true },
  { key: 'sector', label: 'Sector', category: 'Basic', visible: true },

  // Price Data
  { key: 'current_price', label: 'Price', category: 'Price', visible: true },
  { key: 'change_amount', label: 'Change', category: 'Price', visible: true },
  { key: 'change_percentage', label: 'Change %', category: 'Price', visible: true },
  { key: 'open_price', label: 'Open', category: 'Price', visible: false },
  { key: 'high_price', label: 'High', category: 'Price', visible: false },
  { key: 'low_price', label: 'Low', category: 'Price', visible: false },
  { key: 'previous_close', label: 'Prev Close', category: 'Price', visible: false },
  { key: 'week_52_high', label: '52W High', category: 'Price', visible: false },
  { key: 'week_52_low', label: '52W Low', category: 'Price', visible: false },

  // Volume
  { key: 'volume', label: 'Volume', category: 'Volume', visible: true },
  { key: 'avg_volume', label: 'Avg Volume', category: 'Volume', visible: false },

  // Valuation
  { key: 'market_cap', label: 'Market Cap', category: 'Valuation', visible: false },
  { key: 'pe_ratio', label: 'P/E Ratio', category: 'Valuation', visible: false },
  { key: 'pb_ratio', label: 'P/B Ratio', category: 'Valuation', visible: false },
  { key: 'ps_ratio', label: 'P/S Ratio', category: 'Valuation', visible: false },
  { key: 'peg_ratio', label: 'PEG Ratio', category: 'Valuation', visible: false },
  { key: 'ev_ebitda', label: 'EV/EBITDA', category: 'Valuation', visible: false },

  // Per Share
  { key: 'eps', label: 'EPS', category: 'Per Share', visible: false },
  { key: 'book_value', label: 'Book Value', category: 'Per Share', visible: false },
  { key: 'dps', label: 'DPS', category: 'Per Share', visible: false },
  { key: 'dividend_yield', label: 'Div Yield %', category: 'Per Share', visible: false },

  // Profitability
  { key: 'roe', label: 'ROE %', category: 'Profitability', visible: false },
  { key: 'roa', label: 'ROA %', category: 'Profitability', visible: false },
  { key: 'roce', label: 'ROCE %', category: 'Profitability', visible: false },
  { key: 'gross_margin', label: 'Gross Margin %', category: 'Profitability', visible: false },
  { key: 'operating_margin', label: 'Operating Margin %', category: 'Profitability', visible: false },
  { key: 'net_margin', label: 'Net Margin %', category: 'Profitability', visible: false },

  // Leverage
  { key: 'debt_to_equity', label: 'D/E Ratio', category: 'Leverage', visible: false },
  { key: 'debt_to_assets', label: 'D/A Ratio', category: 'Leverage', visible: false },
  { key: 'current_ratio', label: 'Current Ratio', category: 'Leverage', visible: false },
  { key: 'quick_ratio', label: 'Quick Ratio', category: 'Leverage', visible: false },

  // Growth
  { key: 'revenue_growth', label: 'Revenue Growth %', category: 'Growth', visible: false },
  { key: 'earnings_growth', label: 'Earnings Growth %', category: 'Growth', visible: false },
  { key: 'profit_growth', label: 'Profit Growth %', category: 'Growth', visible: false },
];

interface ColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onApply: (columns: ColumnConfig[]) => void;
}

export function ColumnsModal({ isOpen, onClose, columns, onApply }: ColumnsModalProps) {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);

  const toggleColumn = (key: string) => {
    setLocalColumns(prev =>
      prev.map(col =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleApply = () => {
    onApply(localColumns);
    onClose();
  };

  const handleReset = () => {
    setLocalColumns(availableColumns);
  };

  const handleSelectAll = () => {
    setLocalColumns(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const handleDeselectAll = () => {
    // Keep symbol always visible
    setLocalColumns(prev => prev.map(col => ({ ...col, visible: col.key === 'symbol' })));
  };

  const categories = Array.from(new Set(localColumns.map(col => col.category)));
  const visibleCount = localColumns.filter(col => col.visible).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Select Columns
            <Badge variant="secondary">{visibleCount} selected</Badge>
          </DialogTitle>
          <DialogDescription>
            Choose which columns to display in the stock table
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 py-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            Deselect All
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category} className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  {category}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {localColumns
                    .filter((col) => col.category === category)
                    .map((column) => (
                      <div
                        key={column.key}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Checkbox
                          id={column.key}
                          checked={column.visible}
                          onCheckedChange={() => toggleColumn(column.key)}
                          disabled={column.key === 'symbol'} // Symbol always visible
                        />
                        <Label
                          htmlFor={column.key}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {column.label}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleApply}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
