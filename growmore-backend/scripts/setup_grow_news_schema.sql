-- GrowNews: AI-powered financial news articles
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS grow_news (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    title       TEXT        NOT NULL,
    description TEXT,
    url         TEXT        UNIQUE,
    image_url   TEXT,
    source_name TEXT,
    published_at TIMESTAMPTZ,
    category    TEXT        DEFAULT 'general',
    sentiment   TEXT        DEFAULT 'neutral'
                    CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    ai_summary  TEXT,
    impact      TEXT        DEFAULT 'low'
                    CHECK (impact IN ('high', 'medium', 'low')),
    currencies  JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grow_news_category     ON grow_news(category);
CREATE INDEX IF NOT EXISTS idx_grow_news_published_at ON grow_news(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_grow_news_sentiment    ON grow_news(sentiment);

ALTER TABLE grow_news ENABLE ROW LEVEL SECURITY;

-- Public read access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'grow_news' AND policyname = 'grow_news_read_all'
    ) THEN
        CREATE POLICY grow_news_read_all ON grow_news FOR SELECT USING (true);
    END IF;
END$$;

-- Service role write access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'grow_news' AND policyname = 'grow_news_service_write'
    ) THEN
        CREATE POLICY grow_news_service_write ON grow_news
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END$$;
