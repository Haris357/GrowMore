export type NewsSentiment = 'positive' | 'negative' | 'neutral';
export type NewsImpact = 'high' | 'medium' | 'low';
export type NewsMood = 'bullish' | 'bearish' | 'neutral';

// ─── GrowNews (new AI-powered service) ────────────────────────────────────────

export interface GrowNewsArticle {
  id?: string;
  title: string;
  description?: string;
  url: string;
  image_url?: string;
  source_name?: string;
  published_at?: string;
  category?: string;
  sentiment?: NewsSentiment;
  impact?: NewsImpact;
  summary?: string;
  ai_summary?: string;
  content_snippet?: string;
  // Crypto (CryptoPanic)
  votes_positive?: number;
  votes_negative?: number;
  currencies?: string[];
}

export interface GrowNewsFeed {
  articles: GrowNewsArticle[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  category: string;
}

export interface GrowNewsFeature {
  hero: GrowNewsArticle | null;
  featured: GrowNewsArticle[];
  latest: GrowNewsArticle[];
}

export interface GrowNewsBrief {
  brief: string;
  sentiment: NewsMood;
  key_points: string[];
  impact_on_pakistan: string;
  category: string;
  generated_at: string;
  article_count: number;
}

export interface GrowNewsSentiment {
  positive: number;
  negative: number;
  neutral: number;
  total_articles: number;
  by_category: Record<string, { positive: number; negative: number; neutral: number }>;
  label: 'Bullish' | 'Bearish' | 'Neutral';
}

// ─── Legacy types (for any remaining references) ──────────────────────────────

export interface NewsSource {
  id: string;
  name: string;
  base_url?: string;
  source_type?: string;
  is_active?: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug?: string;
  summary?: string;
  content?: string;
  url: string;
  image_url?: string;
  source_id?: string;
  source?: NewsSource;
  author?: string;
  published_at?: string;
  sentiment_label?: NewsSentiment;
  sentiment_score?: number;
  impact_score?: number;
  categories?: string[];
  tags?: string[];
  created_at?: string;
}

export interface MarketBriefSection {
  category: string;
  title: string;
  insight: string;
  sentiment: NewsSentiment;
  key_events: string[];
}

export interface MarketBrief {
  headline: string;
  summary: string;
  mood: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  mood_score: number;
  sections: MarketBriefSection[];
  risks: string[];
  opportunities: string[];
  generated_at: string;
}
