-- SQL Migrations for LO-PBI-001: Replace mock data with live Supabase data sources
-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- legal_cases table (core case data)
CREATE TABLE IF NOT EXISTS legal_cases (
  case_id text PRIMARY KEY,
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
CREATE TABLE IF NOT EXISTS caselaw_cache (
  case_id text PRIMARY KEY,
  title text,
  summary text,
  embedding vector(384),
  source_url text,
  created_at timestamptz DEFAULT now()
);

-- Index for vector distance (pgvector)
CREATE INDEX IF NOT EXISTS idx_caselaw_embedding ON caselaw_cache USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- judge_patterns (judge behavioral data)
CREATE TABLE IF NOT EXISTS judge_patterns (
  judge_id text PRIMARY KEY,
  judge_name text,
  reversal_rate numeric,
  avg_damages numeric,
  cases_decided int,
  pattern_json jsonb,
  updated_at timestamptz DEFAULT now()
);

-- precedent_relationships (links between cases)
CREATE TABLE IF NOT EXISTS precedent_relationships (
  id bigserial PRIMARY KEY,
  from_case text REFERENCES legal_cases(case_id),
  to_case text REFERENCES legal_cases(case_id),
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
