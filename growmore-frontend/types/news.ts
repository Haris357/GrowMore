export interface NewsSource {
  id: string;
  name: string;
  website?: string;
  logo_url?: string;
}

export type NewsSentiment = 'positive' | 'negative' | 'neutral';

export interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  url: string;
  image_url?: string;
  source_id: string;
  source_name: string;
  source_logo_url?: string;
  category?: string;
  sentiment?: NewsSentiment;
  sentiment_score?: number;
  impact_score?: number;
  related_stocks?: string[];
  related_entities?: string[];
  published_at: string;
  scraped_at: string;
}

export interface TrendingTopic {
  topic: string;
  count: number;
  sentiment: NewsSentiment;
}
