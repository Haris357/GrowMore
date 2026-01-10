-- ============================================================================
-- GROWMORE - SEED DATA FOR ADVANCED FEATURES
-- Run this after running migrations.sql
-- ============================================================================

-- Market Indices (Pakistan)
INSERT INTO market_indices (symbol, name, current_value, change_amount, change_percentage) VALUES
    ('KSE100', 'KSE-100 Index', 72500.00, 350.25, 0.49),
    ('KSE30', 'KSE-30 Index', 28900.00, 120.50, 0.42),
    ('KMI30', 'KSE Meezan Index', 98500.00, 480.00, 0.49),
    ('ALLSHR', 'All Share Index', 52000.00, 280.00, 0.54)
ON CONFLICT (symbol) DO UPDATE SET
    current_value = EXCLUDED.current_value,
    change_amount = EXCLUDED.change_amount,
    change_percentage = EXCLUDED.change_percentage,
    last_updated = NOW();

-- News Sources (RSS Feeds and Alternative Sources)
INSERT INTO news_sources (name, base_url, source_type, reliability_score, is_active) VALUES
    ('Business Recorder', 'https://www.brecorder.com', 'rss', 0.85, true),
    ('Dawn Business', 'https://www.dawn.com/business', 'rss', 0.90, true),
    ('The News Business', 'https://www.thenews.com.pk/business', 'rss', 0.85, true),
    ('Express Tribune Business', 'https://tribune.com.pk/business', 'rss', 0.80, true),
    ('Geo News Business', 'https://www.geo.tv/category/business', 'rss', 0.80, true),
    ('Reuters', 'https://www.reuters.com/business', 'rss', 0.95, true),
    ('Bloomberg', 'https://www.bloomberg.com/markets', 'rss', 0.95, true),
    ('CNBC', 'https://www.cnbc.com', 'rss', 0.90, true),
    ('MarketWatch', 'https://www.marketwatch.com', 'rss', 0.88, true),
    ('Yahoo Finance', 'https://finance.yahoo.com', 'rss', 0.85, true),
    ('CoinDesk', 'https://www.coindesk.com', 'rss', 0.85, true),
    ('CoinTelegraph', 'https://cointelegraph.com', 'rss', 0.80, true),
    ('Kitco News', 'https://www.kitco.com/news', 'rss', 0.85, true),
    ('Hacker News', 'https://news.ycombinator.com', 'api', 0.80, true)
ON CONFLICT (name) DO UPDATE SET
    base_url = EXCLUDED.base_url,
    source_type = EXCLUDED.source_type,
    reliability_score = EXCLUDED.reliability_score,
    is_active = EXCLUDED.is_active;

-- Sample Stocks (PSX - Top Companies by Market Cap)
-- Note: These will be linked to companies in a real setup
INSERT INTO stocks (symbol, name, sector, current_price, change_amount, change_percentage, volume, pe_ratio, dividend_yield, week_52_high, week_52_low, market_cap) VALUES
    -- Banking Sector
    ('HBL', 'Habib Bank Limited', 'Banking', 145.50, 2.30, 1.61, 5200000, 5.2, 8.5, 160.00, 95.00, 213500000000),
    ('UBL', 'United Bank Limited', 'Banking', 185.20, -1.50, -0.80, 2800000, 4.8, 9.2, 210.00, 140.00, 226000000000),
    ('MCB', 'MCB Bank Limited', 'Banking', 175.80, 3.10, 1.80, 2100000, 5.5, 7.8, 195.00, 130.00, 208600000000),
    ('NBP', 'National Bank of Pakistan', 'Banking', 35.20, 0.85, 2.47, 8500000, 3.2, 12.5, 45.00, 22.00, 75000000000),
    ('MEBL', 'Meezan Bank Limited', 'Banking', 285.00, 5.50, 1.97, 1500000, 12.5, 5.2, 310.00, 200.00, 510000000000),

    -- Oil & Gas Sector
    ('OGDC', 'Oil & Gas Development Company', 'Oil & Gas', 128.50, -0.80, -0.62, 4500000, 4.5, 10.2, 155.00, 98.00, 552000000000),
    ('PPL', 'Pakistan Petroleum Limited', 'Oil & Gas', 95.30, 1.20, 1.27, 3200000, 3.8, 11.5, 120.00, 72.00, 298000000000),
    ('PSO', 'Pakistan State Oil', 'Oil & Gas', 385.00, 8.50, 2.26, 890000, 5.2, 8.8, 420.00, 280.00, 125000000000),
    ('POL', 'Pakistan Oilfields Limited', 'Oil & Gas', 485.00, -3.20, -0.66, 450000, 6.5, 9.5, 550.00, 380.00, 115000000000),

    -- Cement Sector
    ('LUCK', 'Lucky Cement Limited', 'Cement', 785.00, 12.50, 1.62, 650000, 8.5, 6.2, 890.00, 580.00, 254000000000),
    ('DGKC', 'DG Khan Cement', 'Cement', 95.50, 1.80, 1.92, 3800000, 6.2, 5.5, 120.00, 68.00, 42000000000),
    ('MLCF', 'Maple Leaf Cement', 'Cement', 48.20, 0.65, 1.37, 5500000, 5.8, 4.8, 62.00, 35.00, 38000000000),
    ('FCCL', 'Fauji Cement Company', 'Cement', 32.50, 0.40, 1.25, 7200000, 7.5, 3.5, 42.00, 24.00, 43800000000),

    -- Fertilizer Sector
    ('ENGRO', 'Engro Corporation', 'Fertilizer', 295.00, 4.80, 1.65, 1200000, 9.5, 7.5, 340.00, 220.00, 170000000000),
    ('FFC', 'Fauji Fertilizer Company', 'Fertilizer', 125.80, 2.10, 1.70, 2500000, 7.2, 12.8, 145.00, 95.00, 160000000000),
    ('EFERT', 'Engro Fertilizers', 'Fertilizer', 98.50, 1.50, 1.55, 3100000, 6.8, 15.2, 115.00, 75.00, 131600000000),

    -- Power Sector
    ('HUBC', 'Hub Power Company', 'Power', 95.20, 1.30, 1.38, 4200000, 5.5, 18.5, 115.00, 72.00, 123500000000),
    ('KAPCO', 'K-Electric', 'Power', 32.80, 0.55, 1.71, 6500000, 4.2, 8.5, 40.00, 25.00, 28900000000),

    -- Telecom Sector
    ('PTC', 'Pakistan Telecommunication', 'Telecom', 12.50, 0.25, 2.04, 15000000, 8.5, 6.2, 16.00, 9.00, 63700000000),

    -- Automobile Sector
    ('INDU', 'Indus Motor Company', 'Automobile', 1450.00, 25.00, 1.75, 85000, 12.5, 4.5, 1680.00, 1100.00, 114200000000),
    ('PSMC', 'Pak Suzuki Motor', 'Automobile', 485.00, 8.20, 1.72, 120000, 15.2, 2.8, 580.00, 350.00, 40000000000),
    ('MTL', 'Millat Tractors Limited', 'Automobile', 950.00, 15.00, 1.60, 45000, 10.5, 8.5, 1100.00, 720.00, 30000000000),

    -- Pharmaceuticals
    ('SEARL', 'Searle Company Limited', 'Pharma', 78.50, 1.20, 1.55, 1800000, 18.5, 2.2, 95.00, 58.00, 72000000000),
    ('ABOT', 'Abbott Laboratories Pakistan', 'Pharma', 685.00, 10.50, 1.56, 95000, 25.5, 1.8, 780.00, 520.00, 67000000000),

    -- Technology
    ('SYS', 'Systems Limited', 'Technology', 485.00, 12.00, 2.54, 580000, 22.5, 1.5, 580.00, 320.00, 45000000000),
    ('TRG', 'TRG Pakistan', 'Technology', 125.50, 3.80, 3.12, 2200000, 35.0, 0.0, 165.00, 85.00, 60000000000),

    -- Food & Beverages
    ('NESTLE', 'Nestle Pakistan', 'Food', 6850.00, 85.00, 1.26, 12000, 28.5, 2.5, 7500.00, 5200.00, 310500000000),
    ('UNITY', 'Unity Foods Limited', 'Food', 28.50, 0.45, 1.61, 8500000, 8.5, 4.2, 38.00, 20.00, 24000000000),

    -- Textile
    ('NML', 'Nishat Mills Limited', 'Textile', 125.00, 2.20, 1.79, 1200000, 5.5, 8.5, 150.00, 90.00, 48000000000),
    ('NCL', 'Nishat Chunian Limited', 'Textile', 58.50, 0.95, 1.65, 2500000, 4.8, 9.2, 72.00, 42.00, 16000000000)
ON CONFLICT (symbol) DO UPDATE SET
    current_price = EXCLUDED.current_price,
    change_amount = EXCLUDED.change_amount,
    change_percentage = EXCLUDED.change_percentage,
    volume = EXCLUDED.volume,
    last_updated = NOW();

-- Commodities (Gold, Silver, etc.)
INSERT INTO commodities (symbol, name, current_price, change_amount, change_percentage, unit) VALUES
    ('GOLD24K', 'Gold 24K', 282500.00, 1500.00, 0.53, 'PKR/tola'),
    ('GOLD22K', 'Gold 22K', 258960.00, 1375.00, 0.53, 'PKR/tola'),
    ('GOLD21K', 'Gold 21K', 247190.00, 1312.00, 0.53, 'PKR/tola'),
    ('GOLD18K', 'Gold 18K', 211875.00, 1125.00, 0.53, 'PKR/tola'),
    ('SILVER', 'Silver', 3250.00, 45.00, 1.40, 'PKR/tola'),
    ('PLATINUM', 'Platinum', 85000.00, -500.00, -0.58, 'PKR/tola'),
    ('GOLD_INTL', 'Gold International', 2045.00, 12.50, 0.61, 'USD/oz'),
    ('SILVER_INTL', 'Silver International', 23.15, 0.35, 1.54, 'USD/oz'),
    ('CRUDE_OIL', 'Crude Oil (Brent)', 78.50, 0.85, 1.09, 'USD/barrel'),
    ('NATURAL_GAS', 'Natural Gas', 2.85, -0.05, -1.72, 'USD/MMBtu')
ON CONFLICT (symbol) DO UPDATE SET
    current_price = EXCLUDED.current_price,
    change_amount = EXCLUDED.change_amount,
    change_percentage = EXCLUDED.change_percentage,
    last_updated = NOW();

-- Sample Screener Strategies (stored as reference data)
-- Note: Actual strategies are defined in code, this is for user-saved screens

-- Add some demo notification types info (for reference)
COMMENT ON TABLE notifications IS 'Notification types: price_alert, news_alert, goal_achieved, portfolio_update, market_update, system';
COMMENT ON TABLE price_alerts IS 'Alert conditions: price_above, price_below, change_above, change_below, volume_spike, new_high, new_low';
COMMENT ON TABLE investment_goals IS 'Goal types: emergency_fund, retirement, house_purchase, education, wedding, vehicle, vacation, business, investment, other';
COMMENT ON TABLE user_profiles IS 'Risk profiles: conservative, moderate, aggressive. Experience: beginner, intermediate, advanced, expert';
