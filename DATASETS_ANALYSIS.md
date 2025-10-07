# Legal Oracle - Datasets & Functionalities

**Date**: 2025-10-07  
**Version**: 2.1.0

---

## 1. DATABASE TABLES & STREAMING FUNCTIONALITIES

### 1.1 Core Tables Overview

| Table Name | Records | Purpose | Data Type | Streaming Method | Current Usage |
|------------|---------|---------|-----------|------------------|---------------|
| **legal_cases** | 100+ | Core case data with outcomes, damages, precedents | Structured | Supabase Real-time | ✅ Active - All predictions |
| **caselaw_cache** | 100+ | Vector embeddings for semantic search | Vector (pgvector) | Supabase + On-demand compute | ✅ Active - Similar case matching |
| **judge_patterns** | 50+ | Judicial behavior analytics | Structured + JSONB | Supabase query | ✅ Active - Judge analysis |
| **precedent_relationships** | 200+ | Citation graph network | Relational graph | Supabase joins | ✅ Active - Impact simulation |
| **compliance_frameworks** | 6 major | Regulatory frameworks (GDPR, SOX, HIPAA, etc.) | Structured + JSONB | Supabase query | ✅ Active - Compliance optimizer |
| **compliance_controls** | 60+ | Detailed compliance requirements | Structured | Supabase query | ✅ Active - Control recommendations |
| **industry_compliance_map** | 50+ | Industry-framework mappings | Relational | Supabase joins | ✅ Active - Industry analysis |
| **strategic_patterns** | 30+ | Game theory strategy patterns | Structured + JSONB | Supabase query | ✅ Active - Strategy optimizer |
| **app_config** | 20+ | Dynamic system parameters | Key-value JSONB | Supabase query | ✅ Active - System configuration |

### 1.2 External API Data Streams

| API Source | Data Type | Refresh Rate | Purpose | Integration Status | Cost |
|------------|-----------|--------------|---------|-------------------|------|
| **Federal Register API** | Regulatory changes | Real-time | Regulatory forecasting | ✅ Implemented | Free (with rate limits) |
| **OpenAI API** (Optional) | LLM predictions | On-demand | Case predictions, strategy | ⚠️ Optional (fallback exists) | Pay-per-use |
| **Hugging Face API** (Optional) | ML embeddings | On-demand | Semantic search | ⚠️ Optional (local model works) | Free tier |
| **Supabase Real-time** | Database changes | WebSocket | Live data updates | ✅ Ready (not activated) | Included |

### 1.3 Data Functionality Matrix

| Dataset | Semantic Search | Time-Series | Graph Analysis | ML Predictions | Risk Scoring | Compliance |
|---------|----------------|-------------|----------------|----------------|--------------|------------|
| **legal_cases** | ✅ Via embeddings | ✅ Decision dates | ✅ Citations | ✅ Outcomes | ✅ Success rates | ✅ Type mapping |
| **caselaw_cache** | ✅ Vector similarity | ❌ | ❌ | ✅ Input for ML | ❌ | ❌ |
| **judge_patterns** | ❌ | ✅ Trend analysis | ❌ | ✅ Behavioral | ✅ Reversal rates | ❌ |
| **precedent_relationships** | ❌ | ✅ Citation velocity | ✅ Network centrality | ✅ Landmark prediction | ✅ Impact scoring | ❌ |
| **compliance_frameworks** | ❌ | ✅ Effective dates | ❌ | ❌ | ✅ Compliance risk | ✅ Industry mapping |
| **strategic_patterns** | ❌ | ✅ Success trends | ❌ | ✅ Strategy recommendation | ✅ Win rate | ✅ Pattern matching |

### 1.4 Real-Time Capabilities

| Feature | Implementation | Method | Latency | Status |
|---------|---------------|--------|---------|--------|
| **Case predictions** | On-demand compute | REST API | <2s | ✅ Production |
| **Regulatory updates** | Federal Register polling | HTTP polling | ~5s | ✅ Production |
| **Similar case matching** | Vector search | PostgreSQL ivfflat | <500ms | ✅ Production |
| **Judge behavior trends** | DB aggregation | SQL time-series | <1s | ✅ Production |
| **Arbitrage alerts** | Scheduled detection | Cron jobs (ready) | N/A | ⚠️ Framework ready |
| **Compliance monitoring** | Database lookup | SQL queries | <500ms | ✅ Production |

---

## 2. DATA PROCESSING PIPELINE

```
┌──────────────────────────────────────────────────┐
│           DATA INGESTION LAYER                    │
├──────────────────────────────────────────────────┤
│  • Federal Register API → regulatory_api.py       │
│  • User Input → Frontend → Backend validation    │
│  • Supabase Tables → PostgreSQL + pgvector        │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│        PROCESSING & ANALYSIS LAYER                │
├──────────────────────────────────────────────────┤
│  • ml_forecasting.py → Statistical models         │
│  • arbitrage_monitor.py → Opportunity detection   │
│  • enhanced_prompts.py → Chain-of-thought LLM    │
│  • main.py endpoints → ML scoring, aggregation    │
└──────────────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────┐
│         OUTPUT & CACHING LAYER                    │
├──────────────────────────────────────────────────┤
│  • localStorage (Frontend) → 7 caching hooks      │
│  • Real-time results → JSON API responses         │
│  • Precedent citations → Dynamic linking          │
└──────────────────────────────────────────────────┘
```

---

## 3. KEY MODULES & FUNCTIONALITY

### 3.1 regulatory_api.py (450 lines)
**Features**:
- Federal Register API integration
- Industry-agency mapping (10 industries)
- Regulation impact parsing
- Compliance timeline estimation
- Affected areas extraction

**Streaming**: HTTP polling (can upgrade to webhooks)

### 3.2 ml_forecasting.py (400 lines)
**Features**:
- Exponential smoothing forecasting
- Moving average forecasting
- Seasonality detection
- Risk score calculation
- Confidence intervals

**Streaming**: On-demand compute

### 3.3 arbitrage_monitor.py (500 lines)
**Features**:
- Sunset clause detection
- Jurisdictional conflict analysis (circuit splits)
- Temporary exemption tracking
- Transition period monitoring
- Opportunity scoring (0-1 scale)

**Streaming**: Ready for scheduled scanning

### 3.4 enhanced_prompts.py (400 lines)
**Features**:
- Chain-of-thought reasoning
- Few-shot examples from real cases
- Structured analysis frameworks
- Strategy evaluation prompts
- Nash equilibrium modeling

**Streaming**: On-demand LLM calls

---

## 4. SUMMARY STATISTICS

| Metric | Value |
|--------|-------|
| **Total Database Tables** | 9 core tables |
| **Total API Integrations** | 4 (Federal Register, OpenAI, HF, Supabase) |
| **Backend Python Modules** | 4 major (1,750+ lines) |
| **Vector Embeddings** | 384-dimensional (all-MiniLM-L6-v2) |
| **Real-time Features** | 6 active |
| **Data Streaming Methods** | REST, WebSocket (ready), Vector search |
| **Average API Response Time** | <2s (predictions), <500ms (lookups) |
