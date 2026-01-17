import { useState } from 'react';
import { api } from '@/lib/api';

type ExportFormat = 'pdf' | 'csv' | 'excel';
type ExportType = 'portfolio' | 'transactions' | 'watchlist' | 'goals' | 'alerts';

interface ExportOptions {
  portfolioId?: string;
  watchlistId?: string;
  startDate?: Date;
  endDate?: Date;
}

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getContentType = (format: ExportFormat): string => {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'csv':
        return 'text/csv';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/octet-stream';
    }
  };

  const getFileExtension = (format: ExportFormat): string => {
    switch (format) {
      case 'pdf':
        return 'pdf';
      case 'csv':
        return 'csv';
      case 'excel':
        return 'xlsx';
      default:
        return 'bin';
    }
  };

  const exportPortfolio = async (format: ExportFormat, portfolioId?: string) => {
    setIsExporting(true);
    setExportType(`portfolio-${format}`);
    try {
      const response = await api.get(`/exports/portfolio/${format}`, {
        params: { portfolio_id: portfolioId },
        responseType: 'blob',
      });

      const filename = `portfolio_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
      downloadFile(new Blob([response.data], { type: getContentType(format) }), filename);
    } catch (error) {
      console.error('Error exporting portfolio:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const exportTransactions = async (format: ExportFormat, options?: { startDate?: Date; endDate?: Date }) => {
    setIsExporting(true);
    setExportType(`transactions-${format}`);
    try {
      const response = await api.get(`/exports/transactions/${format}`, {
        params: {
          start_date: options?.startDate?.toISOString(),
          end_date: options?.endDate?.toISOString(),
        },
        responseType: 'blob',
      });

      const filename = `transactions_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
      downloadFile(new Blob([response.data], { type: getContentType(format) }), filename);
    } catch (error) {
      console.error('Error exporting transactions:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const exportWatchlist = async (format: ExportFormat, watchlistId: string) => {
    setIsExporting(true);
    setExportType(`watchlist-${format}`);
    try {
      const response = await api.get(`/exports/watchlist/${watchlistId}/${format}`, {
        responseType: 'blob',
      });

      const filename = `watchlist_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
      downloadFile(new Blob([response.data], { type: getContentType(format) }), filename);
    } catch (error) {
      console.error('Error exporting watchlist:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const exportGoals = async (format: 'csv' | 'excel') => {
    setIsExporting(true);
    setExportType(`goals-${format}`);
    try {
      const response = await api.get(`/exports/goals/${format}`, {
        responseType: 'blob',
      });

      const filename = `goals_${new Date().toISOString().split('T')[0]}.${getFileExtension(format)}`;
      downloadFile(new Blob([response.data], { type: getContentType(format) }), filename);
    } catch (error) {
      console.error('Error exporting goals:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const exportAlerts = async () => {
    setIsExporting(true);
    setExportType('alerts-csv');
    try {
      const response = await api.get('/exports/alerts/csv', {
        responseType: 'blob',
      });

      const filename = `alerts_${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(new Blob([response.data], { type: 'text/csv' }), filename);
    } catch (error) {
      console.error('Error exporting alerts:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return {
    isExporting,
    exportType,
    exportPortfolio,
    exportTransactions,
    exportWatchlist,
    exportGoals,
    exportAlerts,
  };
}
