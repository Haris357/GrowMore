export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: string;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

export type SortOrder = 'asc' | 'desc';

export interface DateRange {
  from_date?: string;
  to_date?: string;
}

export type Period = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume?: number;
  timestamp: string;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
