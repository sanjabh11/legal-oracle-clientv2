-- =====================================================
-- Legal Oracle: Arbitrage Alert System Schema
-- =====================================================
-- Purpose: Store user subscriptions and alert history
-- Created: 2025-10-07
-- Version: 1.0
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: user_alert_subscriptions
-- Purpose: Store user email alert preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS user_alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL,
    industry TEXT,
    jurisdictions TEXT[],
    alert_types TEXT[] DEFAULT ARRAY['sunset_clause', 'jurisdictional_conflict', 'temporary_exemption', 'transition_period'],
    frequency TEXT DEFAULT 'daily',  -- 'realtime', 'daily', 'weekly'
    is_active BOOLEAN DEFAULT true,
    last_alert_sent TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_alert_subscriptions_email ON user_alert_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_alert_subscriptions_active ON user_alert_subscriptions(is_active, frequency);
CREATE INDEX IF NOT EXISTS idx_user_alert_subscriptions_industry ON user_alert_subscriptions(industry);

-- Comments
COMMENT ON TABLE user_alert_subscriptions IS 'Stores user preferences for regulatory arbitrage alerts';
COMMENT ON COLUMN user_alert_subscriptions.frequency IS 'Alert frequency: realtime, daily, or weekly';
COMMENT ON COLUMN user_alert_subscriptions.alert_types IS 'Types of alerts to receive (sunset_clause, jurisdictional_conflict, etc.)';

-- =====================================================
-- Table: alert_scan_log
-- Purpose: Track scheduled scan activity
-- =====================================================

CREATE TABLE IF NOT EXISTS alert_scan_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_timestamp TIMESTAMP DEFAULT NOW(),
    opportunities_found INTEGER DEFAULT 0,
    alerts_sent INTEGER DEFAULT 0,
    industries_scanned TEXT[],
    scan_duration_seconds DECIMAL,
    errors TEXT[],
    metadata JSONB
);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_alert_scan_log_timestamp ON alert_scan_log(scan_timestamp DESC);

COMMENT ON TABLE alert_scan_log IS 'Logs scheduled regulatory scan activity and results';

-- =====================================================
-- Table: alert_delivery_log
-- Purpose: Track individual alert deliveries
-- =====================================================

CREATE TABLE IF NOT EXISTS alert_delivery_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES user_alert_subscriptions(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    opportunities_count INTEGER DEFAULT 0,
    delivery_status TEXT,  -- 'sent', 'failed', 'bounced'
    provider TEXT,  -- 'sendgrid', 'smtp'
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_delivery_log_email ON alert_delivery_log(user_email);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_log_status ON alert_delivery_log(delivery_status);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_log_sent_at ON alert_delivery_log(sent_at DESC);

COMMENT ON TABLE alert_delivery_log IS 'Tracks individual alert email deliveries for monitoring and debugging';

-- =====================================================
-- Table: detected_opportunities
-- Purpose: Store detected arbitrage opportunities
-- =====================================================

CREATE TABLE IF NOT EXISTS detected_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    opportunity_type TEXT,  -- 'sunset_clause', 'jurisdictional_conflict', etc.
    opportunity_score DECIMAL(3, 2),
    industry TEXT,
    jurisdiction TEXT,
    window_days INTEGER,
    impact_level TEXT,  -- 'high', 'medium', 'low'
    source_url TEXT,
    source_document_id TEXT,
    detection_date TIMESTAMP DEFAULT NOW(),
    expiration_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_detected_opportunities_type ON detected_opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_detected_opportunities_industry ON detected_opportunities(industry);
CREATE INDEX IF NOT EXISTS idx_detected_opportunities_score ON detected_opportunities(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_detected_opportunities_active ON detected_opportunities(is_active, detection_date DESC);

COMMENT ON TABLE detected_opportunities IS 'Stores detected regulatory arbitrage opportunities for tracking and alerts';

-- =====================================================
-- Functions: Update timestamp trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_alert_subscriptions
DROP TRIGGER IF EXISTS update_user_alert_subscriptions_updated_at ON user_alert_subscriptions;
CREATE TRIGGER update_user_alert_subscriptions_updated_at
    BEFORE UPDATE ON user_alert_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Sample Data (for testing)
-- =====================================================

-- Insert test subscription (replace with real email for testing)
-- INSERT INTO user_alert_subscriptions (user_email, industry, frequency, alert_types)
-- VALUES 
--     ('test@example.com', 'technology', 'daily', ARRAY['sunset_clause', 'jurisdictional_conflict']);

-- =====================================================
-- Views: Alert Analytics
-- =====================================================

-- View: Recent scan activity
CREATE OR REPLACE VIEW v_recent_scan_activity AS
SELECT 
    scan_timestamp,
    opportunities_found,
    alerts_sent,
    industries_scanned,
    ROUND((alerts_sent::DECIMAL / NULLIF(opportunities_found, 0) * 100), 2) as alert_rate_percentage
FROM alert_scan_log
ORDER BY scan_timestamp DESC
LIMIT 30;

COMMENT ON VIEW v_recent_scan_activity IS 'Shows recent scan activity with alert conversion rates';

-- View: Subscription summary
CREATE OR REPLACE VIEW v_subscription_summary AS
SELECT 
    industry,
    frequency,
    COUNT(*) as subscriber_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    COUNT(*) FILTER (WHERE last_alert_sent IS NOT NULL) as received_alert_count
FROM user_alert_subscriptions
GROUP BY industry, frequency
ORDER BY subscriber_count DESC;

COMMENT ON VIEW v_subscription_summary IS 'Summarizes subscriptions by industry and frequency';

-- View: Opportunity trends
CREATE OR REPLACE VIEW v_opportunity_trends AS
SELECT 
    DATE(detection_date) as detection_day,
    opportunity_type,
    industry,
    COUNT(*) as opportunities_count,
    AVG(opportunity_score) as avg_score,
    COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM detected_opportunities
WHERE detection_date >= NOW() - INTERVAL '30 days'
GROUP BY DATE(detection_date), opportunity_type, industry
ORDER BY detection_day DESC, opportunities_count DESC;

COMMENT ON VIEW v_opportunity_trends IS 'Shows daily trends in detected opportunities';

-- =====================================================
-- Permissions (adjust as needed)
-- =====================================================

-- Grant access to authenticated users
-- GRANT SELECT, INSERT, UPDATE ON user_alert_subscriptions TO authenticated;
-- GRANT SELECT ON alert_scan_log TO authenticated;
-- GRANT SELECT ON detected_opportunities TO authenticated;

-- Grant full access to service role
-- GRANT ALL ON user_alert_subscriptions TO service_role;
-- GRANT ALL ON alert_scan_log TO service_role;
-- GRANT ALL ON alert_delivery_log TO service_role;
-- GRANT ALL ON detected_opportunities TO service_role;

-- =====================================================
-- Completion Message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Arbitrage Alert System schema created successfully!';
    RAISE NOTICE 'Tables created: user_alert_subscriptions, alert_scan_log, alert_delivery_log, detected_opportunities';
    RAISE NOTICE 'Views created: v_recent_scan_activity, v_subscription_summary, v_opportunity_trends';
END $$;
