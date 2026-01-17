'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useExport } from '@/hooks/useExport';

interface ExportDropdownProps {
  type: 'portfolio' | 'transactions' | 'watchlist' | 'goals' | 'alerts';
  portfolioId?: string;
  watchlistId?: string;
  startDate?: Date;
  endDate?: Date;
}

export function ExportDropdown({
  type,
  portfolioId,
  watchlistId,
  startDate,
  endDate,
}: ExportDropdownProps) {
  const {
    isExporting,
    exportType,
    exportPortfolio,
    exportTransactions,
    exportWatchlist,
    exportGoals,
    exportAlerts,
  } = useExport();

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      switch (type) {
        case 'portfolio':
          await exportPortfolio(format, portfolioId);
          break;
        case 'transactions':
          await exportTransactions(format, { startDate, endDate });
          break;
        case 'watchlist':
          if (watchlistId) {
            await exportWatchlist(format, watchlistId);
          }
          break;
        case 'goals':
          if (format !== 'pdf') {
            await exportGoals(format);
          }
          break;
        case 'alerts':
          await exportAlerts();
          break;
      }
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
    }
  };

  const getExportOptions = () => {
    switch (type) {
      case 'portfolio':
      case 'transactions':
      case 'watchlist':
        return [
          { format: 'pdf', label: 'PDF Report', icon: FileText },
          { format: 'csv', label: 'CSV File', icon: Table },
          { format: 'excel', label: 'Excel File', icon: FileSpreadsheet },
        ];
      case 'goals':
        return [
          { format: 'csv', label: 'CSV File', icon: Table },
          { format: 'excel', label: 'Excel File', icon: FileSpreadsheet },
        ];
      case 'alerts':
        return [
          { format: 'csv', label: 'CSV File', icon: Table },
        ];
      default:
        return [];
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export As</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {getExportOptions().map(({ format, label, icon: Icon }) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleExport(format as 'pdf' | 'csv' | 'excel')}
            disabled={isExporting && exportType === `${type}-${format}`}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
            {isExporting && exportType === `${type}-${format}` && (
              <Loader2 className="ml-2 h-3 w-3 animate-spin" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
