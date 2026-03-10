export interface NewsSource {
  id: string;
  name: string;
  base_url?: string;
  source_type?: string;
  is_active?: boolean;
}

export type NewsSentiment = 'positive' | 'negative' | 'neutral';

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
