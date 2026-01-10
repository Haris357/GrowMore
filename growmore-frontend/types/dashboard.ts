import { MarketIndex, StockQuote } from './market';
import { GoldPrice, SilverPrice } from './commodity';

export interface DashboardSummary {
  portfolio_summary: {
    total_value: number;
    total_invested: number;
    total_profit_loss: number;
    total_profit_loss_percent: number;
    today_change: number;
    today_change_percent: number;
    advancing_holdings: number;
    declining_holdings: number;
    unchanged_holdings: number;
  };
  market_overview: {
    kse_100_index: MarketIndex;
    kse_30_index?: MarketIndex;
    top_gainers: StockQuote[];
    top_losers: StockQuote[];
    most_active: StockQuote[];
  };
  watchlist_preview: WatchlistItem[];
  goals_preview: {
    total_goals: number;
    on_track: number;
    behind: number;
    nearest_goal?: GoalWithProgress;
  };
  recent_news: NewsArticle[];
}

export interface QuickStats {
  total_stocks: number;
  total_volume: number;
  advancing: number;
  declining: number;
  unchanged: number;
  new_highs: number;
  new_lows: number;
}

export interface MarketMovers {
  top_gainers: StockQuote[];
  top_losers: StockQuote[];
  most_active: StockQuote[];
}

export interface CommodityPrices {
  gold: GoldPrice;
  silver: SilverPrice;
}

import { WatchlistItem } from './watchlist';
import { GoalWithProgress } from './goal';
import { NewsArticle } from './news';
