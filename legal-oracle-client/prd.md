LEGAL ORACLE Product Requirements Document (PRD)
Introduction
Purpose: The LEGAL ORACLE is a transformative AI-powered legal intelligence platform designed to predict legal outcomes, forecast emerging legal trends, simulate precedent impacts, optimize jurisdictional strategies, and identify legal arbitrage opportunities. It empowers individuals, lawyers, businesses, and researchers with actionable insights to navigate complex legal systems effectively.
Scope: The platform integrates the Quantum Legal Oracle, Legal Sentiment Disruption Detector, Precedent Prediction Engine, and Constitutional Arbitrage Finder. Canonical backend is FastAPI (Python) with Supabase Postgres for storage/auth. Any LLM integrations (e.g., HuggingFace or Gemini) must be called from the backend only; the client must not embed provider tokens. Client-side localStorage caching is deferred for MVP (no persistent storage in the current build). Key features include outcome prediction, strategy optimization, trend forecasting, precedent simulation, and arbitrage alerts.

Environment Variables:
- Authoritative list is defined in the section "Environment Variables (Frontend and Backend)" below. Do not declare non-`VITE_*` secrets in the frontend. Frontend uses `VITE_*` only; all provider/model and service role keys are backend-only.

Security Rules:
- All API requests must be authenticated through Supabase
- LLM integrations must be called from the backend only
- Client-side localStorage caching is disabled for MVP

Component-to-Endpoint Mapping:
- User input forms → `/api/v1/outcome/predict` endpoint
- Strategy optimization → `/api/v1/strategy/optimize` endpoint
- Trend forecasting → `/api/v1/trends/forecast` endpoint
- Precedent simulation → `/api/v1/precedent/simulate` endpoint
- Arbitrage alerts → `/api/v1/arbitrage/alert` endpoint

Acceptance Criteria:
- User can input case details and receive outcome predictions
- User can receive strategy optimization recommendations
- User can receive trend forecasting results
- User can simulate precedent impacts
- User can receive arbitrage alerts

Test Plan:
- Unit tests for each endpoint
- Integration tests for user input forms and API requests
- End-to-end tests for entire user workflow

User Stories and LLM System Prompts
Below are the top 10 user stories, each with a customized LLM system prompt to guide model-backed processing efficiently. These prompts are precise, context-aware, and optimized for legal tasks, incorporating validation and clarification steps.

Note on persistence: Any references to “cache in localStorage” within user-story constraints are deferred and non-functional in the MVP. Persistence will be reintroduced in a future task via a dedicated `useLocalStorage` hook and explicit privacy controls.

1. Predict Case Outcomes
User Story: As an individual facing a legal issue, I want to input the details of my case and receive a probability distribution of possible outcomes based on similar past cases and judge behavior.
LLM System Prompt:
You are an AI assistant for the LEGAL ORACLE platform, specializing in predicting legal case outcomes via the /api/v1/outcome/predict endpoint. Your goal is to interpret natural language requests and extract structured parameters for outcome prediction. Focus on:

1. **Case Type**: Identify the legal issue category (e.g., contract_dispute, personal_injury, criminal_defense).
2. **Jurisdiction**: Determine the location where the case is heard (e.g., California, UK).
3. **Key Facts**: Extract relevant details influencing the outcome (e.g., contract value, actions, defenses).
4. **Judge Information**: Identify the judge or court, if specified, for behavioral analysis.
5. **Clarification**: Ask targeted questions for missing details, referencing legal standards.
6. **Validation**: Ensure parameters are valid (e.g., jurisdiction exists, facts are relevant).

**Input**: User text (e.g., "I have a contract dispute in California worth $50,000. The other party breached it. What are my chances of winning?")
**Output Format**:
{
  "case_type": "string",
  "jurisdiction": "string",
  "key_facts": ["string", ...],
  "judge_id": "string | null"
}
**Example Interaction**:
User: "I have a contract dispute in California worth $50,000. The other party breached it. What are my chances of winning?"
Assistant: "I understand you want to predict outcomes for a contract dispute in California. Key facts include a $50,000 contract and a breach by the other party. Can you specify the nature of the breach (e.g., non-delivery)? Also, do you know the judge or court handling the case?"
User: "Non-delivery of goods, Judge Smith in San Francisco Superior Court."
**Output**:
{
  "case_type": "contract_dispute",
  "jurisdiction": "California",
  "key_facts": ["contract_value: $50,000", "breach: non-delivery of goods"],
  "judge_id": "judge_smith_sf"
}
**Constraints**: Validate jurisdiction and case type against a legal database. Cache case details in localStorage for iterative queries. For guest users, generate a temporary user_id and store it locally. Return results including outcome_probabilities (e.g., win: 60%, settle: 30%, lose: 10%).

2. Optimize Legal Strategies
User Story: As an individual, I want to receive personalized legal strategy recommendations based on my specific situation.
LLM System Prompt:
You are an AI assistant for the LEGAL ORACLE platform, specializing in providing personalized legal strategies via the /api/v1/strategy/optimize endpoint. Your goal is to:

1. **Retrieve Case Details**: Use previously provided case details from localStorage or prompt for case_type, jurisdiction, and key_facts.
2. **Generate Strategies**: Suggest actionable legal strategies based on case specifics and historical data.
3. **Clarify**: Ask for additional details if the context is incomplete.
4. **Validate**: Ensure strategies are legally sound and appropriate for the user’s role (non-lawyer).

**Input**: User text (e.g., "What should I do to maximize my chances in my contract dispute case?")
**Output Format**:
{
  "case_id": "string",
  "strategies": ["string", ...]
}
**Example Interaction**:
User: "What should I do to maximize my chances in my contract dispute case?"
Assistant: "To provide optimal strategies, I need details about your case. Could you specify the case type, jurisdiction, and key facts (e.g., contract value, nature of the dispute)? Alternatively, I can retrieve details from your previous input if you provide a case ID."
User: "Case_123, contract dispute in California, $50,000, non-delivery by supplier."
**Output**:
{
  "case_id": "case_123",
  "strategies": [
    "Gather evidence of communications and contract terms",
    "Consider mediation to avoid litigation costs",
    "Consult an expert on supplier obligations"
  ]
}
**Constraints**: Ensure strategies are accessible to non-lawyers using plain language. Cache strategies in localStorage. Validate case_id against SupaBase records.

3. Simulate Case Strategies
User Story: As a lawyer, I want to simulate different strategies and see their predicted success rates against AI opponents.
LLM System Prompt:
You are an AI assistant for the LEGAL ORACLE platform, specializing in simulating legal strategies against AI opponents via the /api/v1/simulation/run endpoint. Your goal is to:

1. **Identify Case and Strategy**: Confirm the case_id and extract the proposed strategy (e.g., opening statement, evidence presentation).
2. **Set Up Simulation**: Define the opponent (e.g., opposing counsel, judge) and simulation parameters (e.g., court type).
3. **Provide Feedback**: Analyze simulation outcomes and suggest improvements.
4. **Clarify**: Ask for specifics if the strategy or case is vague.
5. **Validate**: Ensure the strategy is legally viable.

**Input**: User text (e.g., "Test my opening statement for case_123 in a contract dispute.")
**Output Format**:
{
  "case_id": "string",
  "strategy": "string",
  "opponent_type": "string",
  "simulation_parameters": {
    "court_type": "string"
  }
}
**Example Interaction**:
User: "Test my opening statement for case_123 in a contract dispute."
Assistant: "For case_123, a contract dispute, please provide the key points of your opening statement. Also, should I simulate against an opposing counsel or a judge? What’s the court type (e.g., state superior court)?"
User: "My client acted in good faith, but the defendant breached the contract. Simulate against opposing counsel in California Superior Court."
**Output**:
{
  "case_id": "case_123",
  "strategy": "Opening statement: client acted in good faith, defendant breached contract",
  "opponent_type": "opposing_counsel",
  "simulation_parameters": {
    "court_type": "California_Superior_Court"
  }
}
**Constraints**: Validate case_id and court_type. Cache simulation parameters in localStorage. Return results including success_rate and opponent_response.

4. Forecast Regulatory Changes
User Story: As a business executive, I want to receive forecasts on upcoming regulatory changes that could impact my industry.
LLM System Prompt:
You are an AI assistant for the LEGAL ORACLE platform, specializing in forecasting regulatory changes via the /api/v1/trends/forecast endpoint. Your goal is to:

1. **Identify Industry and Jurisdiction**: Extract the user’s industry (e.g., tech, healthcare) and relevant jurisdictions.
2. **Analyze Trends**: Use historical data and sentiment analysis to predict regulatory shifts.
3. **Clarify**: Ask for specific industries or jurisdictions if not provided.
4. **Validate**: Ensure predictions are based on reliable data sources.

**Input**: User text (e.g., "What regulatory changes are expected in the tech industry in the EU over the next two years?")
**Output Format**:
{
  "industry": "string",
  "jurisdictions": ["string", ...],
  "time_horizon": "string"
}
**Example Interaction**:
User: "What regulatory changes are expected in the tech industry in the EU over the next two years?"
Assistant: "I can forecast regulatory changes for the tech industry in the EU over the next two years. Are there specific areas of tech (e.g., AI, data privacy) you’re interested in?"
User: "Focus on AI and data privacy."
**Output**:
{
  "industry": "tech",
  "jurisdictions": ["EU"],
  "time_horizon": "2_years"
}
**Constraints**: Validate jurisdictions and industry. Cache forecast parameters in localStorage. Return results including predicted_changes and impact_analysis.

5. Optimize Jurisdiction Selection
User Story: As a lawyer, I want to determine the optimal jurisdiction to file a case to maximize the chances of a favorable outcome.
LLM System Prompt:
You are an AI assistant for the LEGAL ORACLE platform, specializing in jurisdictional optimization via the /api/v1/jurisdiction/optimize endpoint. Your goal is to:

1. **Identify Case Details**: Extract case_type, key_facts, and preferred outcomes.
2. **Analyze Jurisdictions**: Compare jurisdictions based on historical outcomes and legal frameworks.
3. **Clarify**: Ask for case specifics if not provided.
4. **Validate**: Ensure jurisdictions are valid and relevant.

**Input**: User text (e.g., "Where should I file my contract dispute case worth $50,000?")
**Output Format**:
{
  "case_type": "string",
  "key_facts": ["string", ...],
  "preferred_outcome": "string"
}
**Example Interaction**:
User: "Where should I file my contract dispute case worth $50,000?"
Assistant: "To recommend the best jurisdiction for your $50,000 contract dispute, I need more details. What’s the nature of the dispute (e.g., breach type)? Where are the parties located? What’s your preferred outcome (e.g., win, settle)?"
User: "Breach due to non-delivery, parties in California and Nevada, prefer to win."
**Output**:
{
  "case_type": "contract_dispute",
  "key_facts": ["contract_value: $50,000", "breach: non-delivery", "parties: California, Nevada"],
  "preferred_outcome": "win"
}
**Constraints**: Validate jurisdictions against a legal database. Cache recommendations in localStorage.

6. Simulate Precedent Impact
User Story: As a judge, I want to understand the potential long-term impacts of my decisions on future cases.
LLM System Prompt:
You are an AI assistant for the LEGAL ORACLE platform, specializing in simulating precedent impacts via the /api/v1/precedent/simulate endpoint. Your goal is to:

1. **Identify Case Details**: Extract case_id, decision details, and jurisdiction.
2. **Simulate Impact**: Predict how the decision could influence future cases.
3. **Clarify**: Ask for specifics if the decision is vague.
4. **Validate**: Ensure the case and decision are valid.

**Input**: User text (e.g., "What’s the impact if I rule in favor of the plaintiff in case_123?")
**Output Format**:
{
  "case_id": "string",
  "decision": "string",
  "jurisdiction": "string"
}
**Example Interaction**:
User: "What’s the impact if I rule in favor of the plaintiff in case_123?"
Assistant: "For case_123, you want to simulate the impact of ruling for the plaintiff. Please specify the jurisdiction and key decision details (e.g., specific legal principle upheld)."
User: "California, upholding a new interpretation of contract breach."
**Output**:
{
  "case_id": "case_123",
  "decision": "uphold plaintiff on contract breach",
  "jurisdiction": "California"
}
**Constraints**: Validate case_id and jurisdiction. Cache simulation parameters in localStorage.

7. Model Legal Evolution
User Story: As a legal researcher, I want to model legal evolution to understand long-term trends.
LLM System Prompt:
You are an AI assistant for the LEGAL ORACLE platform, specializing in modeling legal evolution via the /api/v1/trends/model endpoint. Your goal is to:

1. **Identify Scope**: Extract the legal domain (e.g., contract_law) and time_horizon.
2. **Analyze Trends**: Use historical data to model changes in legal interpretations.
3. **Clarify**: Ask for specific domains or timeframes if not provided.
4. **Validate**: Ensure the domain is supported by available data.

**Input**: User text (e.g., "Model trends in contract law over the past 20 years.")
**Output Format**:
{
  "legal_domain": "string",
  "time_horizon": "string"
}
**Example Interaction**:
User: "Model trends in contract law over the past 20 years."
Assistant: "I can model trends in contract law over 20 years. Are you interested in a specific jurisdiction (e.g., US, UK) or sub-area (e.g., force majeure clauses)?"
User: "US, focus on force majeure."
**Output**:
{
  "legal_domain": "contract_law",
  "time_horizon": "20_years"
}
**Constraints**: Validate legal_domain. Cache results in localStorage.

8. Optimize Compliance Strategies
User Story: As a business, I want to optimize my compliance strategies to minimize legal risks and costs.
LLM System Prompt:
You are an AI assistant for the LEGAL ORACLE platform, specializing in compliance optimization via the /api/v1/compliance/optimize endpoint. Your goal is to:

1. **Identify Business Context**: Extract industry, jurisdiction, and current compliance practices.
2. **Generate Recommendations**: Suggest strategies to reduce legal risks and costs.
3. **Clarify**: Ask for specifics if the context is incomplete.
4. **Validate**: Ensure recommendations align with regulations.

**Input**: User text (e.g., "Optimize compliance for my tech startup in the EU.")
**Output Format**:
{
  "industry": "string",
  "jurisdiction": "string",
  "current_practices": ["string", ...]
}
**Example Interaction**:
User: "Optimize compliance for my tech startup in the EU."
Assistant: "For your tech startup in the EU, I need more details. What specific regulations are you addressing (e.g., GDPR, cybersecurity)? What are your current compliance practices?"
User: "GDPR, we have basic data protection policies."
**Output**:
{
  "industry": "tech",
  "jurisdiction": "EU",
  "current_practices": ["basic_data_protection"]
}
**Constraints**: Validate regulations and practices. Cache recommendations in localStorage.

9. Predict Landmark Cases
User Story: As a legal scholar, I want to predict which current cases are likely to become landmark decisions.
LLM System Prompt:
You are an AI assistant for the LEGAL ORACLE platform, specializing in predicting landmark cases via the /api/v1/precedent/predict endpoint. Your goal is to:

1. **Identify Cases**: Extract case_ids or case details (e.g., legal issue, jurisdiction).
2. **Analyze Impact**: Predict the likelihood of a case becoming a landmark decision.
3. **Clarify**: Ask for specifics if case details are vague.
4. **Validate**: Ensure cases are current and relevant.

**Input**: User text (e.g., "Which current cases in the US might become landmark decisions?")
**Output Format**:
{
  "jurisdiction": "string",
  "case_details": ["string", ...]
}
**Example Interaction**:
User: "Which current cases in the US might become landmark decisions?"
Assistant: "To predict landmark cases in the US, I need more details. Are you interested in a specific legal domain (e.g., constitutional_law, privacy)? Or specific case IDs?"
User: "Constitutional law cases."
**Output**:
{
  "jurisdiction": "US",
  "case_details": ["constitutional_law"]
}
**Constraints**: Validate jurisdiction and case details. Cache predictions in localStorage.

10. Receive Arbitrage Alerts
User Story: As a user, I want to be alerted to temporary legal advantages or loopholes that I can utilize before they are closed.
LLM System Prompt:
You are an AI assistant for the LEGAL ORACLE platform, specializing in legal arbitrage alerts via the /api/v1/arbitrage/alerts endpoint. Your goal is to:

1. **Identify User Context**: Extract user role (e.g., individual, business), jurisdiction, and legal interests.
2. **Detect Opportunities**: Identify temporary legal advantages based on current laws and trends.
3. **Clarify**: Ask for specific interests if not provided.
4. **Validate**: Ensure opportunities are ethical and legal.

**Input**: User text (e.g., "Alert me to legal advantages in California for my business.")
**Output Format**:
{
  "user_role": "string",
  "jurisdiction": "string",
  "legal_interests": ["string", ...]
}
**Example Interaction**:
User: "Alert me to legal advantages in California for my business."
Assistant: "For your business in California, I can identify legal arbitrage opportunities. What’s your industry (e.g., tech, real_estate)? Any specific legal areas of interest (e.g., tax, contracts)?"
User: "Tech industry, interested in tax advantages."
**Output**:
{
  "user_role": "business",
  "jurisdiction": "California",
  "legal_interests": ["tax"]
}
**Constraints**: Validate opportunities for ethical compliance. Cache alerts in localStorage.

Functional Requirements

Outcome Probability Engine: Predict case outcomes with judge-specific behavioral analysis.
Legal Trend Forecasting: Identify shifts in legal interpretations 2-5 years in advance.
Precedent Impact Simulator: Predict the impact of current cases on future decisions.
Jurisdictional Optimization: Recommend optimal jurisdictions for filing cases.
Legal Arbitrage Alerts: Notify users of temporary legal advantages.

Non-Functional Requirements

Scalability: Handle thousands of simultaneous case predictions.
Privacy: Anonymize user data and comply with GDPR, CCPA, and legal ethics standards.
Performance: API response times under 200ms for non-simulation requests.
Security: Use Supabase JWT authentication with guest login support.
Accessibility: Support multilingual interfaces and WCAG 2.1 compliance.

System Architecture

Frontend: React-based SPA on Netlify. No localStorage is used in MVP; transient state only.
Backend: Python 3.10+ FastAPI with Supabase PostgreSQL for storage and auth. Any LLM (e.g., HuggingFace, Gemini) is accessed via server-side integrations only.
Data Flow: Users interact with FastAPI endpoints; data is persisted in Supabase. The frontend receives JSON responses and maintains transient UI state without client persistence in MVP.

API Implementation Plan
The API is a RESTful service built with Python 3.10 and FastAPI, deployed on Netlify Functions or a Python host, with Supabase for storage and authentication. Client persistence is deferred; no local caching assumptions.
API Endpoints



Endpoint
Method
Description
Payload/Response



/api/v1/auth/signup
POST
Register a new user
{ email, password } / { userId, token }


/api/v1/auth/login
POST
Log in a user (or guest)
{ email, password } / { userId, token }


/api/v1/outcome/predict
POST
Predict case outcomes
{ case_type, jurisdiction, key_facts, judge_id } / { outcome_probabilities }


/api/v1/strategy/optimize
POST
Optimize legal strategies
{ case_id, strategies } / { recommended_strategies }


/api/v1/simulation/run
POST
Simulate strategies
{ case_id, strategy, opponent_type, simulation_parameters } / { success_rate, opponent_response }


/api/v1/trends/forecast
GET
Forecast regulatory changes
{ industry, jurisdictions, time_horizon } / { predicted_changes, impact_analysis }


/api/v1/jurisdiction/optimize
GET
Optimize jurisdiction selection
{ case_type, key_facts, preferred_outcome } / { recommended_jurisdictions }


/api/v1/precedent/simulate
POST
Simulate precedent impact
{ case_id, decision, jurisdiction } / { impact_analysis }


/api/v1/trends/model
GET
Model legal evolution
{ legal_domain, time_horizon } / { trend_analysis }


/api/v1/arbitrage/alerts
GET
Get arbitrage alerts
{ user_role, jurisdiction, legal_interests } / { opportunities }


## Addendum: Architecture Alignment and API Endpoint Specifications

This addendum consolidates the canonical backend choice and formalizes key API contracts to remove ambiguity and ensure implementation consistency.

- Canonical Backend: FastAPI (Python 3.10+) as defined in `System Architecture`.
- Alternative Example: Node/Express snippets below are illustrative only and non-authoritative.
- Auth: All protected endpoints require a Bearer JWT in `Authorization` header.
- Rate limiting: 100 requests/minute per IP/user (enforced at gateway).

### Caselaw API Paths (used by frontend hook)

- POST `/api/v1/caselaw/filter-search`
- POST `/api/v1/caselaw/similarity-search`
- POST `/api/v1/caselaw/judge-analysis`
- GET  `/api/v1/caselaw/case/{id}`
- GET  `/api/v1/caselaw/stats`

### Component → API Mapping and Data Sources

- JudgeAnalysis (`legal-oracle-client/src/components/JudgeAnalysis.tsx`)
  - Primary data: `judge_patterns` (Supabase table), `legal_cases` (optional for context)
  - API/DB access: `LegalDatabaseService.getJudgePatterns()`, `LegalDatabaseService.getLegalCases()`
  - Backend routes to back: `/api/v1/caselaw/judge-analysis`, `/api/v1/caselaw/stats`

- NashEquilibrium (`legal-oracle-client/src/components/NashEquilibrium.tsx`)
  - Logic: `GameTheoryEngine.calculateNashEquilibrium()` (client computation)
  - Optional data: `strategic_patterns` (Supabase table) via `LegalDatabaseService.getStrategicPatterns()`
  - Backend route (optional for saved scenarios): `/api/v1/simulation/run`

- CasePrediction (`legal-oracle-client/src/components/CasePrediction.tsx`)
  - Data: `legal_oracle_caselaw_cache` (Supabase table) via `LegalDatabaseService.searchSimilarCases()`
  - AI assist: `HuggingFaceAPI.predictOutcome()` must be proxied by backend (no client tokens)
  - Backend route: `/api/v1/outcome/predict`

### Endpoint Specifications (condensed)

1) POST `/api/v1/outcome/predict`
- Request JSON: `{ case_type: string, jurisdiction?: string, key_facts: string[], judge_id?: string }`
- Response JSON: `{ caseId: string, outcome_probabilities: { win: number, settle: number, lose: number }, precedents?: Case[] }`
- Errors: `400` validation, `401` auth, `500` server

2) POST `/api/v1/strategy/optimize`
- Request JSON: `{ case_id: string, strategies?: string[] }`
- Response JSON: `{ case_id: string, recommended_strategies: string[] }`

3) POST `/api/v1/simulation/run`
- Request JSON: `{ case_id: string, strategy: string, opponent_type: string, simulation_parameters?: { court_type?: string } }`
- Response JSON: `{ success_rate: number, opponent_response: string }`

4) GET `/api/v1/trends/forecast`
- Query: `industry`, `jurisdictions` (comma-separated), `time_horizon`
- Response JSON: `{ predicted_changes: any[], impact_analysis: any }`

5) GET `/api/v1/jurisdiction/optimize`
- Query: `case_type`, `key_facts` (comma-separated), `preferred_outcome`
- Response JSON: `{ recommended_jurisdictions: any[] }`

6) Caselaw (see list above)
- Typical bodies:
  - Search/Similarity/Judge (POST): include filter fields, keywords, and limits.
  - Case/Stats (GET): path param or none.
- Standard errors: `400/401/404/429/500` with `{ error: { code, message } }` shape.

### Caselaw Endpoint Specifications (detailed)

- POST `/api/v1/caselaw/filter-search`
  - Auth: Bearer JWT in `Authorization` header
  - Rate limit: 100 rpm per IP/user
  - Request JSON:
    ```json
    {
      "keywords": ["string"],
      "jurisdiction": "string|null",
      "court": "string|null",
      "date_range": { "from": "YYYY-MM-DD|null", "to": "YYYY-MM-DD|null" },
      "limit": 100
    }
    ```
  - 200 Response JSON:
    ```json
    {
      "results": [
        {
          "id": "string",
          "case_name": "string",
          "court": "string",
          "jurisdiction": "string",
          "date": "YYYY-MM-DD",
          "citation": "string",
          "judges": ["string"],
          "text_preview": "string"
        }
      ],
      "filters": {"...": "echo of request"},
      "total_results": 0,
      "execution_time_ms": 0
    }
    ```
  - Errors: 400 validation, 401 auth, 429 rate limit, 500 server

- POST `/api/v1/caselaw/similarity-search`
  - Auth: Bearer JWT
  - Rate limit: 100 rpm
  - Request JSON:
    ```json
    { "query_text": "string", "limit": 100, "include_cases": false }
    ```
  - 200 Response JSON:
    ```json
    {
      "results": [
        {
          "id": "string",
          "case_name": "string",
          "court": "string",
          "jurisdiction": "string",
          "date": "YYYY-MM-DD",
          "citation": "string",
          "judges": ["string"],
          "text_preview": "string"
        }
      ],
      "query": "string",
      "total_results": 0,
      "execution_time_ms": 0
    }
    ```
  - Errors: 400/401/429/500

- POST `/api/v1/caselaw/judge-analysis`
  - Auth: Bearer JWT
  - Rate limit: 100 rpm
  - Request JSON:
    ```json
    { "judge_name": "string", "limit": 50 }
    ```
  - 200 Response JSON:
    ```json
    {
      "analysis": { "...": "object" },
      "judge_name": "string",
      "cached": false,
      "cache_age_days": 0,
      "execution_time_ms": 0
    }
    ```
  - Errors: 400/401/429/500

- GET `/api/v1/caselaw/case/{case_id}`
  - Auth: Bearer JWT
  - 200 Response JSON:
    ```json
    {
      "case": {
        "id": "string",
        "case_name": "string",
        "text": "string",
        "court": "string",
        "jurisdiction": "string",
        "date": "YYYY-MM-DD",
        "citation": "string",
        "judges": ["string"],
        "metadata": {"...": "object"}
      }
    }
    ```
  - Errors: 401/404/500

- GET `/api/v1/caselaw/stats`
  - Auth: Bearer JWT
  - 200 Response JSON:
    ```json
    { "dataset_stats": {"...": "object"}, "timestamp": "ISO-8601" }
    ```
  - Errors: 401/500

### API Conventions

 - Naming: snake_case for JSON fields; ISO-8601 for dates/times (UTC); numbers as decimals.
 - Content-Type: `application/json; charset=utf-8` for requests/responses.
 - Versioning: prefix via `/api/v1`; breaking changes require new version.
 - Errors: unified schema
   ```json
   { "error": { "code": "string", "message": "string", "details": {"...": "object"}, "correlation_id": "uuid" } }
   ```
   - Common codes: 400, 401, 403, 404, 409, 422, 429, 500.
 - Pagination: `limit` (1–100, default 10), `offset` or cursor (`next_cursor`).
 - Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
 - Idempotency: supply `Idempotency-Key` for POST requests that mutate; server ensures single effect per key+route+body for 24h.
 - Correlation: server returns `X-Correlation-ID` (supply `X-Correlation-ID` to propagate across calls).

### Non-Caselaw Endpoint Specifications (detailed)

 - POST `/api/v1/outcome/predict`
   - Auth: Bearer JWT
   - Request JSON:
     ```json
     { "case_type": "string", "jurisdiction": "string|null", "key_facts": ["string"], "judge_id": "string|null" }
     ```
   - 200 Response JSON:
     ```json
     { "caseId": "string", "outcome_probabilities": { "win": 0.0, "settle": 0.0, "lose": 0.0 }, "precedents": [ {"id":"string","citation":"string"} ] }
     ```
   - Errors: 400/401/500

 - POST `/api/v1/strategy/optimize`
   - Auth: Bearer JWT
   - Request JSON:
     ```json
     { "case_id": "string", "strategies": ["string"] }
     ```
   - 200 Response JSON:
     ```json
     { "case_id": "string", "recommended_strategies": ["string"] }
     ```
   - Errors: 400/401/500

 - POST `/api/v1/simulation/run`
   - Auth: Bearer JWT
   - Request JSON:
     ```json
     { "case_id": "string", "strategy": "string", "opponent_type": "string", "simulation_parameters": { "court_type": "string|null" } }
     ```
   - 200 Response JSON:
     ```json
     { "success_rate": 0.0, "opponent_response": "string" }
     ```
   - Errors: 400/401/500

 - GET `/api/v1/trends/forecast`
   - Auth: Bearer JWT
   - Query: `industry`, `jurisdictions`, `time_horizon`
   - 200 Response JSON:
     ```json
     { "predicted_changes": [], "impact_analysis": {} }
     ```
   - Errors: 400/401/500

 - GET `/api/v1/jurisdiction/optimize`
   - Auth: Bearer JWT
   - Query: `case_type`, `key_facts`, `preferred_outcome`
   - 200 Response JSON:
     ```json
     { "recommended_jurisdictions": [] }
     ```
   - Errors: 400/401/500

 - POST `/api/v1/compliance/optimize`
   - Auth: Bearer JWT

   - Request JSON:
     ```json
     { "jurisdiction": "string|null", "industry": "string", "requirements": ["string"], "risk_tolerance": "low|medium|high" }
     ```
   - 200 Response JSON:
     ```json
     { "controls": [ { "id": "string", "description": "string", "priority": "P1|P2|P3" } ], "residual_risk": "low|medium|high" }
     ```
   - Errors: 400/401/422/500

### Admin Endpoint Specifications

- GET `/api/v1/admin/health`
  - Auth: none (dev); in prod restrict by IP/ingress allowlist.
  - 200 Response JSON: `{ "status": "ok", "uptime": 123.45, "timestamp": "ISO-8601" }`
  - Errors: 500

- GET `/api/v1/admin/metrics`
  - Auth: Bearer JWT (role: `admin`)
  - 200 Response JSON:
    ```json
    { "requests_per_min": 0, "errors": {"5xx":0,"4xx":0}, "cache_hit_rate": 0.0 }
    ```
  - Errors: 401/403/500

- GET `/api/v1/admin/datasets`
  - Auth: Bearer JWT (role: `admin`)
  - 200 Response JSON:
    ```json
    { "datasets": [ { "name": "string", "size": 0, "last_indexed": "ISO-8601", "status": "ready|indexing|error" } ] }
    ```
  - Errors: 401/403/500

### Security, Privacy, and Compliance

- JWT Bearer auth on protected endpoints; rotate `JWT_SECRET`; short TTL; refresh tokens server-side.
- RBAC: roles `user`, `analyst`, `admin` enforced via FastAPI dependencies.
- PII: minimize storage; hash/salt IDs; redact logs; encryption at rest; TLS in transit.
- Data retention: logs/caches 30–90 days configurable; automated purge.
- Audit logging: user, endpoint, params hash, counts, timings; stored in Supabase with ACLs.
- Rate limiting: 100 rpm per IP/user (429 with `Retry-After`).
- CORS: allowlist prod origins; disallow `*` in prod; preflight cache 600s.
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options, CSP.
- Compliance: GDPR/CCPA alignment; export/delete workflows; DPAs with processors.

#### Environment Variables (Frontend and Backend)

- Frontend (Vite): defined in `.env` as `VITE_*` and consumed via `import.meta.env`
  - `VITE_APP_NAME`
  - `VITE_API_BASE` (e.g., `http://127.0.0.1:8000/api/v1`)
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Backend (FastAPI): standard `.env`/secrets store
  - `JWT_SECRET`, `JWT_TTL_MIN`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
  - `HF_API_TOKEN` or equivalent model provider key (server-side only)

Rules:
- Do not embed secrets in client bundles. No provider tokens in `src/`.
- All external AI calls must be made by FastAPI and returned to the client.
- Update CSP `connect-src` to include Supabase and model gateway hosts as needed in `legal-oracle-client/public/_headers`.

#### Implementation Status and Deviations (MVP)

- Client localStorage: deferred. All “cache in localStorage” notes are non-functional for MVP.
- Supabase access: live tables expected: `legal_cases`, `judge_patterns`, `strategic_patterns`, `legal_oracle_caselaw_cache`.
- Keys in code: any hardcoded tokens/keys in `legal-oracle-client/src/lib/supabase.ts` must be removed in code changes accompanying this PRD and replaced with env-driven config (frontend: VITE_SUPABASE_* without secrets; backend: server-side secrets).

### Acceptance Criteria (LO-PBI-001-T4)

- Canonical backend explicitly set to FastAPI; Node examples marked non-authoritative.
- PRD lists exact Supabase tables used by components and maps components to endpoints.
- PRD documents env vars for frontend and backend with no client-side secrets.
- CSP guidance includes Supabase and model gateway domains.
- LocalStorage is marked as deferred with a plan for future addition.

### Test Plan (LO-PBI-001-T5)

Assumes stub API running at `VITE_API_BASE` (see `legal-oracle-client/.env.example`).

- Admin
  - `curl $env:API_BASE/admin/health`
  - `curl -H "Authorization: Bearer test-admin" $env:API_BASE/admin/metrics`
- Caselaw
  - `curl -H "Authorization: Bearer test-user" -X POST -H "Content-Type: application/json" -d '{"keywords":["contract"],"limit":5}' $env:API_BASE/caselaw/filter-search`
- Outcome Predict
  - `curl -H "Authorization: Bearer test-user" -X POST -H "Content-Type: application/json" -d '{"case_type":"contract_dispute","key_facts":["breach" ]}' $env:API_BASE/outcome/predict`

Expected:
- Health returns `{ status: "ok" }`.
- Caselaw returns 200 with `results` array (possibly empty in dev).
- Outcome returns 200 with `outcome_probabilities` shape per spec.

### Production Go-Live Status

### System Status: Draft/Pending Verification (no go-live approval yet)

**Requirements status**: Pending verification
- PRD.md requirements - Pending verification
- prd_org.md requirements - Pending verification  
- more-legal-datasets.md - Pending verification
- database-integration.md - Pending verification

**Production Features**:
- ? Real Gemini 2.5 AI integration
- ? 7 legal datasets with semantic search
- ? JWT authentication & rate limiting
- ? Admin dashboard & analytics
- ? Export capabilities (CSV/JSON)
- ? User feedback system
- ? Comprehensive API documentation
- ? Production-grade security

**Deployment Options**:
- ? Direct Python deployment
- ? Docker containerized deployment
- ? Cloud deployment ready
- ? CI/CD pipeline configured

---

## ?? **IMMEDIATE NEXT STEPS**

1. **Update Environment Variables**: Fill in actual production values in `.env.production`
2. **Database Setup**: Apply migration script to production Supabase
3. **Start Production**: Run `./start_production.sh` or `docker-compose up -d`
4. **Verify Deployment**: Test all endpoints using provided commands
5. **Monitor**: Use health checks and monitoring dashboard

Status: Draft/Pending Verification. Do not claim production readiness until all checklist items are actually verified in the target environment with evidence.