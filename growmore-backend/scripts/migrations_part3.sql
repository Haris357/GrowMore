-- GrowMore Part 3: Email, Newsletters, Logging & Exports
-- Database Migrations for Supabase
-- NOTE: This references the 'users' table from migrations.sql

-- ============================================
-- NEWSLETTER SYSTEM TABLES
-- ============================================

-- Newsletter Subscriptions
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_newsletter_subs_email ON newsletter_subscriptions(email);
CREATE INDEX idx_newsletter_subs_user ON newsletter_subscriptions(user_id);
CREATE INDEX idx_newsletter_subs_active ON newsletter_subscriptions(is_active) WHERE is_active = TRUE;

-- Newsletters
CREATE TABLE IF NOT EXISTS newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    preview_text VARCHAR(200),
    status VARCHAR(20) DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_newsletters_status ON newsletters(status);
CREATE INDEX idx_newsletters_scheduled ON newsletters(scheduled_at) WHERE status = 'scheduled';

-- Newsletter Queue
CREATE TABLE IF NOT EXISTS newsletter_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    newsletter_id UUID REFERENCES newsletters(id) ON DELETE CASCADE,
    subscriber_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_newsletter_queue_newsletter ON newsletter_queue(newsletter_id);
CREATE INDEX idx_newsletter_queue_status ON newsletter_queue(status);
CREATE INDEX idx_newsletter_queue_pending ON newsletter_queue(newsletter_id, status) WHERE status = 'pending';

-- Newsletter Templates
CREATE TABLE IF NOT EXISTS newsletter_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    html_content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ============================================
-- SECURITY & DEVICE TRACKING TABLES
-- ============================================

-- User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(100) NOT NULL UNIQUE,
    device_id VARCHAR(64),
    ip_address VARCHAR(45),
    user_agent TEXT,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- User Devices
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20),
    browser VARCHAR(100),
    os VARCHAR(100),
    is_trusted BOOLEAN DEFAULT FALSE,
    last_ip VARCHAR(45),
    last_location VARCHAR(255),
    last_used TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_user_devices_device ON user_devices(device_id);

-- Login History
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_id VARCHAR(64),
    location VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    failure_reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_history_user ON login_history(user_id);
CREATE INDEX idx_login_history_status ON login_history(status);
CREATE INDEX idx_login_history_created ON login_history(created_at DESC);

-- Security Events
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    description TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created ON security_events(created_at DESC);

-- ============================================
-- LOGGING TABLES
-- ============================================

-- API Logs
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    request_body JSONB,
    response_body JSONB,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_logs_path ON api_logs(path);
CREATE INDEX idx_api_logs_status ON api_logs(status_code);
CREATE INDEX idx_api_logs_user ON api_logs(user_id);
CREATE INDEX idx_api_logs_created ON api_logs(created_at DESC);

-- Partitioning api_logs by month (optional - for high-volume)
-- CREATE INDEX idx_api_logs_created_month ON api_logs(date_trunc('month', created_at));

-- Error Logs
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    endpoint VARCHAR(500),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_data JSONB,
    severity VARCHAR(20) DEFAULT 'error',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Scraper Logs
CREATE TABLE IF NOT EXISTS scraper_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scraper_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER DEFAULT 0,
    metadata JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scraper_logs_name ON scraper_logs(scraper_name);
CREATE INDEX idx_scraper_logs_status ON scraper_logs(status);
CREATE INDEX idx_scraper_logs_created ON scraper_logs(created_at DESC);

-- AI Logs
CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_estimate DECIMAL(10,6),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feature VARCHAR(50),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    duration_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_logs_service ON ai_logs(service);
CREATE INDEX idx_ai_logs_user ON ai_logs(user_id);
CREATE INDEX idx_ai_logs_feature ON ai_logs(feature);
CREATE INDEX idx_ai_logs_created ON ai_logs(created_at DESC);

-- Job Logs
CREATE TABLE IF NOT EXISTS job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    parameters JSONB,
    result JSONB,
    error_message TEXT,
    duration_ms INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_logs_name ON job_logs(job_name);
CREATE INDEX idx_job_logs_status ON job_logs(status);
CREATE INDEX idx_job_logs_created ON job_logs(created_at DESC);

-- ============================================
-- TRANSACTIONS TABLE (for export feature)
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(15,4) NOT NULL,
    total DECIMAL(15,4) NOT NULL,
    fees DECIMAL(10,4) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_portfolio ON transactions(portfolio_id);
CREATE INDEX idx_transactions_symbol ON transactions(symbol);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- ============================================
-- ADD notification_preferences TO USERS
-- ============================================

-- Add notification_preferences column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'notification_preferences'
    ) THEN
        ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{}';
    END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
-- NOTE: Since we use service_role key for backend operations,
-- RLS is optional. These policies are for direct Supabase client access.

-- Enable RLS on new tables (optional - backend uses service_role)
-- Uncomment if you want RLS enabled:
-- ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to clean up old logs (call via scheduled job)
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
    -- Clean up API logs older than specified days
    DELETE FROM api_logs WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    -- Clean up resolved error logs older than specified days
    DELETE FROM error_logs WHERE resolved = TRUE AND created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    -- Clean up scraper logs older than specified days
    DELETE FROM scraper_logs WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    -- Clean up AI logs older than specified days
    DELETE FROM ai_logs WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    -- Clean up job logs older than specified days
    DELETE FROM job_logs WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    -- Clean up inactive sessions older than 90 days
    DELETE FROM user_sessions WHERE is_active = FALSE AND created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    -- Clean up expired sessions
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE newsletter_subscriptions IS 'Email newsletter subscription management';
COMMENT ON TABLE newsletters IS 'Newsletter campaigns and content';
COMMENT ON TABLE newsletter_queue IS 'Queue for newsletter sending';
COMMENT ON TABLE user_sessions IS 'Active user sessions for multi-device support';
COMMENT ON TABLE user_devices IS 'Registered user devices for security';
COMMENT ON TABLE login_history IS 'Login attempt history for security monitoring';
COMMENT ON TABLE security_events IS 'Security-related events and alerts';
COMMENT ON TABLE api_logs IS 'API request/response logs for monitoring';
COMMENT ON TABLE error_logs IS 'Application error logs';
COMMENT ON TABLE audit_logs IS 'Audit trail for entity changes';
COMMENT ON TABLE scraper_logs IS 'Data scraper execution logs';
COMMENT ON TABLE ai_logs IS 'AI service usage tracking';
COMMENT ON TABLE job_logs IS 'Background job execution logs';
COMMENT ON TABLE transactions IS 'User trading transactions';
