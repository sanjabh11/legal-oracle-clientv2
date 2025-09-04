-- LO-PBI-001-T20: Provision Supabase core tables for Legal Oracle
-- This script creates the required tables and minimal RLS policies used by the client app.
-- Apply via Supabase SQL editor.

-- Extensions
create extension if not exists pgcrypto;

-- 1) legal_cases
create table if not exists public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  case_title text not null,
  case_summary text,
  jurisdiction text,
  court text,
  date_decided date,
  case_type text,
  case_status text,
  created_at timestamptz not null default now()
);

alter table public.legal_cases enable row level security;
-- Allow public read access for the SPA (anon key)
create policy if not exists "Allow read legal_cases to anon" on public.legal_cases
  for select using (true);

-- 2) judge_patterns
create table if not exists public.judge_patterns (
  id bigserial primary key,
  judge_name text not null,
  court text,
  appointment_date date,
  judicial_philosophy text,
  political_leanings text,
  cases_decided integer default 0,
  reversal_rate numeric,
  precedent_adherence_score numeric,
  decision_patterns jsonb,
  case_types_handled text[],
  average_sentence_length text,
  created_at timestamptz not null default now()
);

alter table public.judge_patterns enable row level security;
create policy if not exists "Allow read judge_patterns to anon" on public.judge_patterns
  for select using (true);

-- 3) strategic_patterns
create table if not exists public.strategic_patterns (
  id bigserial primary key,
  name text not null,
  effectiveness numeric,
  created_at timestamptz not null default now()
);

alter table public.strategic_patterns enable row level security;
create policy if not exists "Allow read strategic_patterns to anon" on public.strategic_patterns
  for select using (true);

-- 4) legal_oracle_caselaw_cache
-- Includes a text column for raw case text and a generated tsvector for FTS
create table if not exists public.legal_oracle_caselaw_cache (
  id uuid primary key default gen_random_uuid(),
  case_title text,
  case_summary text,
  jurisdiction text,
  court text,
  date_decided date,
  fetch_timestamp timestamptz not null default now(),
  case_text_raw text,
  case_text tsvector generated always as (
    to_tsvector('english', coalesce(case_text_raw, ''))
  ) stored
);

create index if not exists legal_oracle_caselaw_cache_case_text_gin
  on public.legal_oracle_caselaw_cache using gin (case_text);

alter table public.legal_oracle_caselaw_cache enable row level security;
create policy if not exists "Allow read caselaw_cache to anon" on public.legal_oracle_caselaw_cache
  for select using (true);

-- Optional minimal seeds (comment/uncomment as needed)
-- insert into public.strategic_patterns (name, effectiveness) values
--   ('Aggressive Litigation', 0.62),
--   ('Settlement Priority', 0.78),
--   ('Collaborative Negotiation', 0.71)
-- on conflict do nothing;

-- Done
