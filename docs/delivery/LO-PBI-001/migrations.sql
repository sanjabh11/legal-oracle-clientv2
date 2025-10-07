-- SQL Migrations for LO-PBI-001: Replace mock data with live Supabase data sources
-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables with incompatible schemas (CASCADE to handle foreign keys)
DROP TABLE IF EXISTS precedent_relationships CASCADE;
DROP TABLE IF EXISTS caselaw_cache CASCADE;

-- legal_cases table (core case data)
-- Note: Using UUID to match existing database schema
CREATE TABLE IF NOT EXISTS legal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text,
  case_name text,
  court text,
  jurisdiction text,
  case_type text,
  decision_date date,
  outcome_label text,
  damages_amount numeric,
  citation_count int,
  summary text,
  full_text text,
  judges text[],
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- caselaw_cache for embeddings and fast search
CREATE TABLE caselaw_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text,
  title text,
  summary text,
  embedding vector(384),
  source_url text,
  created_at timestamptz DEFAULT now()
);

-- Index for vector distance (pgvector)
CREATE INDEX idx_caselaw_embedding ON caselaw_cache USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- judge_patterns (judge behavioral data)
CREATE TABLE IF NOT EXISTS judge_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id text,
  judge_name text,
  reversal_rate numeric,
  avg_damages numeric,
  cases_decided int,
  pattern_json jsonb,
  updated_at timestamptz DEFAULT now()
);

-- precedent_relationships (links between cases) - RECREATED with correct UUID types
CREATE TABLE precedent_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_case UUID REFERENCES legal_cases(id) ON DELETE CASCADE,
  to_case UUID REFERENCES legal_cases(id) ON DELETE CASCADE,
  relation_type text, -- "cites", "overruled_by", etc.
  created_at timestamptz DEFAULT now()
);

-- app_config for dynamic parameters (replaces hardcoded values)
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Insert default config values
INSERT INTO app_config (key, value) VALUES ('strategy_weights', '{"caseStrength":0.7,"legalCosts":0.8,"judgeBiasWeight":0.15}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO app_config (key, value) VALUES ('mixed_strategy_fallback', '{"player1_prob":0.5,"player2_prob":0.5}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO app_config (key, value) VALUES ('risk_discount', '{"value":0.15}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- RPC function for nearest neighbor search
CREATE OR REPLACE FUNCTION nn_caselaw_search(query_embedding vector, top_k int)
RETURNS TABLE(case_id text, title text, summary text, distance float) AS $$
  SELECT case_id, title, summary, embedding <-> query_embedding AS distance
  FROM caselaw_cache
  ORDER BY distance
  LIMIT top_k;
$$ LANGUAGE sql STABLE;
