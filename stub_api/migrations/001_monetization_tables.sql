-- Migration: 001_monetization_tables
-- Created: 2025-12-15
-- Purpose: Add tables for monetization features (Whop integration, subscriptions, alerts, templates)

-- =============================================
-- 1. User Subscriptions (Whop Integration)
-- =============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    whop_user_id TEXT,
    whop_membership_id TEXT,
    email TEXT,
    tier TEXT DEFAULT 'guest' CHECK (tier IN ('guest', 'starter', 'professional', 'firm')),
    product_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'past_due')),
    valid_until TIMESTAMPTZ,
    features_used JSONB DEFAULT '{}',
    usage_this_month JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_id UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subs_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_whop ON user_subscriptions(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_tier ON user_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_user_subs_status ON user_subscriptions(status);

-- =============================================
-- 2. Docket Subscriptions (Alert Monitoring)
-- =============================================
CREATE TABLE IF NOT EXISTS docket_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    case_id TEXT NOT NULL,
    case_name TEXT,
    court TEXT,
    jurisdiction TEXT,
    docket_number TEXT,
    alert_types TEXT[] DEFAULT '{}',
    delivery_methods TEXT[] DEFAULT '{}',
    webhook_url TEXT,
    game_theory_params JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    last_alert_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_docket_subs_user ON docket_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_docket_subs_case ON docket_subscriptions(case_id);
CREATE INDEX IF NOT EXISTS idx_docket_subs_active ON docket_subscriptions(active) WHERE active = true;

-- =============================================
-- 3. Docket Alerts
-- =============================================
CREATE TABLE IF NOT EXISTS docket_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES docket_subscriptions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    case_id TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('new_filing', 'motion_filed', 'order_issued', 'hearing_scheduled', 'deadline_approaching', 'nash_recalculation', 'strategy_change')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    title TEXT NOT NULL,
    message TEXT,
    filing_details JSONB,
    nash_update JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    delivered BOOLEAN DEFAULT false,
    delivered_at TIMESTAMPTZ,
    delivery_method TEXT
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON docket_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON docket_alerts(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_created ON docket_alerts(created_at DESC);

-- =============================================
-- 4. Community Templates
-- =============================================
CREATE TABLE IF NOT EXISTS community_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('civil_litigation', 'contract_disputes', 'employment_law', 'personal_injury', 'real_estate', 'family_law', 'criminal_defense', 'intellectual_property', 'immigration', 'bankruptcy', 'other')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
    pricing_model TEXT DEFAULT 'free' CHECK (pricing_model IN ('free', 'one_time', 'subscription')),
    price DECIMAL(10,2) DEFAULT 0,
    game_matrix JSONB NOT NULL,
    metadata JSONB,
    instructions TEXT,
    sample_scenario TEXT,
    version TEXT DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    downloads INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    revenue_share DECIMAL(3,2) DEFAULT 0.70
);

CREATE INDEX IF NOT EXISTS idx_templates_author ON community_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON community_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_status ON community_templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_published ON community_templates(status, published_at DESC) WHERE status = 'published';

-- =============================================
-- 5. Template Reviews
-- =============================================
CREATE TABLE IF NOT EXISTS template_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES community_templates(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_review UNIQUE (template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_template ON template_reviews(template_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON template_reviews(rating);

-- =============================================
-- 6. Template Purchases
-- =============================================
CREATE TABLE IF NOT EXISTS template_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES community_templates(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    price_paid DECIMAL(10,2) NOT NULL,
    author_revenue DECIMAL(10,2) NOT NULL,
    platform_revenue DECIMAL(10,2) NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_purchase UNIQUE (template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON template_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_template ON template_purchases(template_id);

-- =============================================
-- 7. Jurisdiction Rules Cache
-- =============================================
CREATE TABLE IF NOT EXISTS jurisdiction_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction TEXT NOT NULL,
    court TEXT NOT NULL,
    rule_number TEXT NOT NULL,
    rule_title TEXT NOT NULL,
    rule_text TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('civil_procedure', 'criminal_procedure', 'evidence', 'local_rules', 'standing_orders', 'filing_requirements', 'page_limits', 'citation_style', 'motion_practice', 'discovery')),
    effective_date DATE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    citations TEXT[],
    notes TEXT,
    embedding vector(384),
    CONSTRAINT unique_rule UNIQUE (jurisdiction, rule_number)
);

CREATE INDEX IF NOT EXISTS idx_rules_jurisdiction ON jurisdiction_rules(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_rules_type ON jurisdiction_rules(rule_type);

-- =============================================
-- 8. Usage Tracking (for tier limits)
-- =============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    feature TEXT NOT NULL,
    month TEXT NOT NULL, -- Format: YYYY-MM
    count INTEGER DEFAULT 0,
    last_used TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_usage UNIQUE (user_id, feature, month)
);

CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_month ON usage_tracking(month);

-- =============================================
-- Functions & Triggers
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_templates_updated_at
    BEFORE UPDATE ON community_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update template rating on review insert/update
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE community_templates 
    SET 
        rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM template_reviews WHERE template_id = NEW.template_id),
        review_count = (SELECT COUNT(*) FROM template_reviews WHERE template_id = NEW.template_id)
    WHERE id = NEW.template_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rating_on_review
    AFTER INSERT OR UPDATE ON template_reviews
    FOR EACH ROW EXECUTE FUNCTION update_template_rating();

-- Increment download count on purchase
CREATE OR REPLACE FUNCTION increment_template_downloads()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE community_templates 
    SET downloads = downloads + 1
    WHERE id = NEW.template_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_downloads_on_purchase
    AFTER INSERT ON template_purchases
    FOR EACH ROW EXECUTE FUNCTION increment_template_downloads();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE docket_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE docket_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
CREATE POLICY user_subscriptions_policy ON user_subscriptions
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY docket_subscriptions_policy ON docket_subscriptions
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY docket_alerts_policy ON docket_alerts
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY template_purchases_policy ON template_purchases
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY usage_tracking_policy ON usage_tracking
    FOR ALL USING (auth.uid()::text = user_id);

-- Public read access to published templates
CREATE POLICY templates_public_read ON community_templates
    FOR SELECT USING (status = 'published');

-- Authors can manage their own templates
CREATE POLICY templates_author_policy ON community_templates
    FOR ALL USING (auth.uid()::text = author_id);

-- =============================================
-- Seed Sample Data (Optional - Remove in production)
-- =============================================

-- Insert sample jurisdiction rules
INSERT INTO jurisdiction_rules (jurisdiction, court, rule_number, rule_title, rule_text, rule_type, effective_date, citations)
VALUES 
    ('ndca', 'Northern District of California', 'Civ. L.R. 7-2', 'Page Limitations', 'Unless otherwise ordered, motions, oppositions, and replies shall not exceed 25, 25, and 15 pages respectively, exclusive of tables and exhibits.', 'page_limits', '2023-01-01', ARRAY['Civ. L.R. 7-2']),
    ('ndca', 'Northern District of California', 'Civ. L.R. 7-4', 'Meet and Confer Requirement', 'Before filing any discovery motion, counsel must meet and confer in good faith to attempt to resolve the dispute.', 'discovery', '2023-01-01', ARRAY['Civ. L.R. 7-4', 'Fed. R. Civ. P. 37']),
    ('sdny', 'Southern District of New York', 'Local Civil Rule 6.1', 'Form of Papers', 'All papers shall be 8½ by 11 inches in size, with margins of at least one inch on all sides. Text shall be double-spaced.', 'filing_requirements', '2023-01-01', ARRAY['Local Civil Rule 6.1'])
ON CONFLICT DO NOTHING;

COMMENT ON TABLE user_subscriptions IS 'Stores user subscription data linked to Whop payments';
COMMENT ON TABLE docket_subscriptions IS 'Docket monitoring subscriptions for alerts';
COMMENT ON TABLE docket_alerts IS 'Generated alerts from docket monitoring';
COMMENT ON TABLE community_templates IS 'User-created game theory templates for marketplace';
COMMENT ON TABLE jurisdiction_rules IS 'Cached local court rules for RAG pipeline';
