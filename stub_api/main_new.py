import os
import json
from typing import List, Optional, Dict, Any, Tuple
from fastapi import FastAPI, HTTPException, Header, Request, Response
from pydantic import BaseModel
from datetime import datetime, timedelta
import re
from supabase import create_client, Client
import numpy as np
from sentence_transformers import SentenceTransformer
import openai
from uuid import uuid4

# -------------------------
# Configuration & clients
# -------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # server-only key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL_NAME = os.getenv("EMBED_MODEL_NAME", "all-MiniLM-L6-v2")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

# Load embedding model
embedder = SentenceTransformer(EMBED_MODEL_NAME)

app = FastAPI(title="Legal Oracle - Full API")

# -------------------------
# Helpers
# -------------------------
def require_auth(authorization: Optional[str]):
    """
    Basic server-side check for Authorization header presence.
    In production: verify token with supabase auth admin endpoint or your IAM.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.split("Bearer")[-1].strip()
    if token == "":
        raise HTTPException(status_code=401, detail="Invalid token")
    return token

def compute_embedding(text: str) -> List[float]:
    """Compute embedding vector for given text with sentence-transformers model."""
    # Truncate very long text to keep inference inexpensive
    truncated = text if len(text) < 32000 else text[:32000]
    emb = embedder.encode([truncated], show_progress_bar=False)[0]
    return emb.tolist()

def call_nn_caselaw_search(embedding: List[float], top_k: int = 5):
    """
    Call Postgres RPC 'nn_caselaw_search' that expects a vector and top_k.
    RPC should return rows with case_id, title, summary, distance.
    """
    # The supabase-py expects native types — passing Python list should work if RPC accepts float8[]
    resp = supabase.rpc("nn_caselaw_search", {"query_embedding": embedding, "top_k": top_k}).execute()
    if getattr(resp, "status_code", None) and resp.status_code >= 400:
        # supabase-py older versions may return object-like responses
        raise HTTPException(status_code=500, detail=f"NN search RPC error: {resp.text}")
    # resp.data: list of dicts
    return resp.data

def extract_candidate_citations(full_text: str) -> List[str]:
    """
    Simple heuristic to extract cited case-IDs or citations. This is domain-specific.
    If your cases use case_ids like 'CD-2024-001', allow payload to include explicit 'cites' list.
    """
    # Very simple regex for token patterns like 'CD-2024-001' or 'CASE123'
    patterns = re.findall(r"[A-Z]{1,5}-\d{4}-\d{1,6}", full_text)
    return list(set(patterns))

def simple_trend(prev: List[Tuple[datetime, float]]) -> str:
    """
    Compute a simple trend string from time-series of metric: returns 'rising', 'falling', or 'stable'.
    prev is list of (date, value).
    """
    if len(prev) < 2:
        return "stable"
    # compare last value vs average of previous half
    prev_sorted = sorted(prev, key=lambda x: x[0])
    last = prev_sorted[-1][1]
    mid = int(len(prev_sorted)/2)
    earlier_avg = np.mean([v for _,v in prev_sorted[:max(1,mid)]])
    if last > earlier_avg * 1.05:
        return "rising"
    if last < earlier_avg * 0.95:
        return "falling"
    return "stable"

# -------------------------
# Pydantic models
# -------------------------
class PredictRequest(BaseModel):
    case_id: Optional[str] = None
    key_facts: Optional[List[str]] = None
    case_text: Optional[str] = None
    jurisdiction: Optional[str] = None
    judge_id: Optional[str] = None

class PredictResponse(BaseModel):
    outcome_probabilities: Dict[str, float]
    confidence: float
    reasoning: str
    features_used: Dict[str, Any]

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    jurisdiction: Optional[str] = None

class StrategyRequest(BaseModel):
    case_id: str
    candidate_strategies: List[str]
    params: Optional[Dict[str, Any]] = None

class NashRequest(BaseModel):
    # Accept either:
    # 1) explicit payoff matrices for both players: payoff_matrix_p1, payoff_matrix_p2 (m x n)
    # 2) game_matrix: m x n matrix where each cell is [p1_payoff, p2_payoff]
    payoff_matrix_p1: Optional[List[List[float]]] = None
    payoff_matrix_p2: Optional[List[List[float]]] = None
    game_matrix: Optional[List[List[List[float]]]] = None
    metadata: Optional[Dict[str, Any]] = None

class IngestCaseRequest(BaseModel):
    case_id: str
    case_name: str
    court: Optional[str] = None
    jurisdiction: Optional[str] = None
    case_type: Optional[str] = None
    decision_date: Optional[str] = None
    outcome_label: Optional[str] = None
    damages_amount: Optional[float] = None
    citation_count: Optional[int] = 0
    summary: Optional[str] = None
    full_text: Optional[str] = None
    judges: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    # optional explicit list of cited case_ids
    cites: Optional[List[str]] = None

# -------------------------
# Endpoints
# -------------------------

@app.get("/api/v1/cases")
async def get_cases(limit: int = 20, offset: int = 0, jurisdiction: Optional[str] = None,
                    case_type: Optional[str] = None, Authorization: Optional[str] = Header(None)):
    require_auth(Authorization)
    q = supabase.table("legal_cases").select("*").order("decision_date", desc=True).limit(limit).offset(offset)
    if jurisdiction:
        q = q.eq("jurisdiction", jurisdiction)
    if case_type:
        q = q.eq("case_type", case_type)
    resp = q.execute()
    if getattr(resp, "status_code", None) and resp.status_code >= 400:
        raise HTTPException(status_code=500, detail="DB error fetching cases")
    return {"cases": resp.data, "total": len(resp.data)}

@app.get("/api/v1/cases/{case_id}")
async def get_case(case_id: str, Authorization: Optional[str] = Header(None)):
    require_auth(Authorization)
    resp = supabase.table("legal_cases").select("*").eq("case_id", case_id).maybe_single().execute()
    if getattr(resp, "status_code", None) and resp.status_code >= 400:
        raise HTTPException(status_code=500, detail="DB error fetching case")
    if not resp.data:
        raise HTTPException(status_code=404, detail="Case not found")
    return resp.data

@app.post("/api/v1/search_caselaw")
async def search_caselaw(req: SearchRequest, Authorization: Optional[str] = Header(None)):
    require_auth(Authorization)
    emb = compute_embedding(req.query)
    try:
        neighbours = call_nn_caselaw_search(emb, req.top_k)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NN search failed: {str(e)}")
    # normalize distance -> similarity (simple)
    results = []
    for r in neighbours:
        # distance likely returned as float; similarity attempt:
        distance = r.get("distance", 0.0)
        similarity = max(0.0, 1.0 - distance) if isinstance(distance, (int, float)) else 0.0
        results.append({
            "case_id": r.get("case_id"),
            "title": r.get("title"),
            "summary": r.get("summary"),
            "similarity": similarity
        })
    return {"results": results, "embeddings_used": True}

@app.post("/api/v1/predict_outcome", response_model=PredictResponse)
async def predict_outcome(payload: PredictRequest, Authorization: Optional[str] = Header(None)):
    require_auth(Authorization)
    features_used: Dict[str, Any] = {}
    case_text = payload.case_text
    jurisdiction = payload.jurisdiction
    # If case_id provided, fetch case text and metadata
    if payload.case_id and not case_text:
        resp = supabase.table("legal_cases").select("summary, full_text, jurisdiction, case_type").eq("case_id", payload.case_id).maybe_single().execute()
        if getattr(resp, "status_code", None) and resp.status_code >= 400:
            raise HTTPException(status_code=500, detail="DB error fetching case")
        if resp.data:
            case_text = (resp.data.get("summary") or "") + "\n\n" + (resp.data.get("full_text") or "")
            jurisdiction = jurisdiction or resp.data.get("jurisdiction")
    if not case_text:
        raise HTTPException(status_code=400, detail="Either case_id or case_text is required for prediction")

    # 1) nearest precedents
    try:
        q_emb = compute_embedding(case_text)
        nn = call_nn_caselaw_search(q_emb, top_k=5)
        features_used["nearest_precedents"] = nn
    except Exception as e:
        features_used["nearest_precedents"] = []
    # 2) judge priors
    if payload.judge_id:
        jresp = supabase.table("judge_patterns").select("*").eq("judge_id", payload.judge_id).maybe_single().execute()
        if getattr(jresp, "status_code", None) and jresp.status_code >= 400:
            features_used["judge"] = None
        else:
            features_used["judge"] = jresp.data

    # 3) aggregate priors by case_type/jurisdiction
    # Use simple SQL: counts per outcome_label
    try:
        stats_q = supabase.table("legal_cases").select("outcome_label, count:count(*)").execute()
        # Note: supabase-py select/grouping might need custom SQL; keep best-effort structure
        features_used["global_case_counts"] = stats_q.data if stats_q else None
    except Exception:
        features_used["global_case_counts"] = None

    # 4) Build prompt for LLM (if available) and request structured JSON
    prompt = {
        "instruction": "You are a legal prediction assistant. Given the case summary and structured features, return JSON: {outcome_probabilities:{win,settle,lose}, confidence:0-1, reasoning:'...'}",
        "case_summary": case_text[:5000],
        "features": features_used
    }
    if OPENAI_API_KEY:
        try:
            completion = openai.ChatCompletion.create(
                model="gpt-4o" if "gpt-4o" in [m.id for m in openai.Model.list().data] else "gpt-4o-mini",
                messages=[
                    {"role":"system","content":"You are a concise legal prediction assistant. Output only valid JSON."},
                    {"role":"user","content": json.dumps(prompt)}
                ],
                max_tokens=400,
                temperature=0.0
            )
            raw = completion.choices[0].message.content
            try:
                parsed = json.loads(raw)
                probs = parsed.get("outcome_probabilities", {"win":0.5,"settle":0.3,"lose":0.2})
                confidence = float(parsed.get("confidence", 0.5))
                reasoning = parsed.get("reasoning", "")
            except Exception:
                # Attempt to extract JSON substring
                m = re.search(r"\{.*\}", raw, re.DOTALL)
                if m:
                    parsed = json.loads(m.group(0))
                    probs = parsed.get("outcome_probabilities", {"win":0.5,"settle":0.3,"lose":0.2})
                    confidence = float(parsed.get("confidence", 0.5))
                    reasoning = parsed.get("reasoning", raw)
                else:
                    probs = {"win":0.5,"settle":0.3,"lose":0.2}
                    confidence = 0.5
                    reasoning = raw
        except Exception as e:
            # LLM failed — fallback heuristic
            probs = {"win":0.5,"settle":0.3,"lose":0.2}
            confidence = 0.4
            reasoning = f"LLM call failed: {str(e)} — returning statistical prior"
    else:
        # No LLM key: fallback heuristics based on nearest precedent majority and judge priors if present
        win_score = 0.5
        settle_score = 0.3
        lose_score = 0.2
        # if nearest precedents exist, adjust
        try:
            precedents = features_used.get("nearest_precedents", [])
            if precedents:
                # naive: count plaintiff_victory frequency in neighbouring titles/metadata if available
                wins = 0
                total = 0
                for p in precedents:
                    pid = p.get("case_id")
                    if pid:
                        cresp = supabase.table("legal_cases").select("outcome_label").eq("case_id", pid).maybe_single().execute()
                        if cresp.data and cresp.data.get("outcome_label"):
                            total += 1
                            if "plaintiff" in (cresp.data.get("outcome_label") or ""):
                                wins += 1
                if total > 0:
                    observed_success_rate = wins/total
                    # boost score if observed_success_rate high
                    win_score = max(0.05, min(0.95, wins/total))
                    settle_score = max(0.0, 1.0 - win_score - 0.15)
                    lose_score = 1.0 - win_score - settle_score
            # judge prior adjustments
            if features_used.get("judge"):
                jr = features_used["judge"]
                # if judge has high reversal_rate, reduce confidence
                if jr.get("reversal_rate"):
                    confidence = max(0.2, 1.0 - float(jr.get("reversal_rate")))
                else:
                    confidence = 0.5
        except Exception:
            win_score, settle_score, lose_score, confidence = 0.5,0.3,0.2,0.5
        probs = {"win": win_score, "settle": settle_score, "lose": lose_score}
        reasoning = "Statistical heuristic fallback (no LLM configured)."

    # Return response (ensure sums approx 1)
    total_p = probs.get("win",0) + probs.get("settle",0) + probs.get("lose",0)
    if total_p == 0:
        probs = {"win":0.5,"settle":0.3,"lose":0.2}
    else:
        probs = {k: float(v)/float(total_p) for k,v in probs.items()}

    return {"outcome_probabilities": probs, "confidence": float(confidence), "reasoning": reasoning, "features_used": features_used}

@app.post("/api/v1/analyze_strategy")
async def analyze_strategy(req: StrategyRequest, Authorization: Optional[str] = Header(None)):
    """
    For a given case_id and candidate_strategies[], score each strategy by historical success with similar cases,
    judge priors, and an optional LLM rationale. Returns sorted list of strategies with score & rationale.
    """
    require_auth(Authorization)
    # 1) fetch case summary
    cresp = supabase.table("legal_cases").select("summary, full_text, case_type, jurisdiction").eq("case_id", req.case_id).maybe_single().execute()
    if getattr(cresp, "status_code", None) and cresp.status_code >= 400:
        raise HTTPException(status_code=500, detail="DB error fetching case")
    if not cresp.data:
        raise HTTPException(status_code=404, detail="Case not found")

    case_text = (cresp.data.get("summary") or "") + "\n\n" + (cresp.data.get("full_text") or "")
    case_type = cresp.data.get("case_type")
    jurisdiction = cresp.data.get("jurisdiction")

    features = {}
    # nearest precedents
    try:
        emb = compute_embedding(case_text)
        nn = call_nn_caselaw_search(emb, top_k=20)
        features["nearest_precedents"] = nn
    except Exception:
        features["nearest_precedents"] = []

    # Score candidate strategies using simple heuristics:
    strategy_scores = []
    for strategy in req.candidate_strategies:
        # Heuristic: compute success rate of this strategy across nearest precedents by looking in metadata or past analysis.
        score = 0.5  # baseline
        rationale_parts = []
        # If case_type present, look for past cases with metadata.strategy_used = strategy
        try:
            # naive: count how many neighbouring precedents contain strategy in metadata (assumes metadata.analysis.strategy)
            neighbours = features["nearest_precedents"]
            match_count = 0
            total = 0
            for n in neighbours:
                pid = n.get("case_id")
                if not pid:
                    continue
                pmeta = supabase.table("legal_oracle_cases").select("analysis").eq("case_id", pid).maybe_single().execute()
                total += 1
                if pmeta.data and pmeta.data.get("analysis"):
                    analysis = pmeta.data["analysis"]
                    # if a 'strategy' key exists, check
                    if isinstance(analysis, dict) and analysis.get("strategy"):
                        if strategy.lower() in analysis.get("strategy", "").lower():
                            match_count += 1
            if total > 0:
                observed_success_rate = match_count / total
                # boost score if observed_success_rate high
                score = 0.35 + 0.5 * observed_success_rate
                rationale_parts.append(f"Observed {observed_success_rate:.2f} matching historical strategy occurrences among {total} neighbors.")
        except Exception:
            rationale_parts.append("No neighbor strategy metadata available.")

        # judge priors (if caller supplied judge in params)
        judge_id = None
        if req.params and req.params.get("judge_id"):
            judge_id = req.params.get("judge_id")
        if judge_id:
            jresp = supabase.table("judge_patterns").select("*").eq("judge_id", judge_id).maybe_single().execute()
            if jresp.data and jresp.data.get("reversal_rate"):
                rev = float(jresp.data["reversal_rate"])
                score = score * (1 - 0.1*rev)  # dampen slightly
                rationale_parts.append(f"Adjusted for judge reversal_rate {rev:.2f}")

        # Ask LLM for rationale + score adjustment (optional)
        llm_rationale = None
        if OPENAI_API_KEY:
            try:
                llm_prompt = {
                    "instruction": "Score the following legal strategy for the case and provide a short numeric score 0-1 and a brief rationale.",
                    "case_summary": case_text[:3000],
                    "strategy": strategy,
                    "features": {"case_type": case_type, "jurisdiction": jurisdiction}
                }
                completion = openai.ChatCompletion.create(
                    model="gpt-4o" if "gpt-4o" in [m.id for m in openai.Model.list().data] else "gpt-4o-mini",
                    messages=[
                        {"role":"system","content":"You are a pragmatic legal strategy advisor. Return JSON {score:0-1, rationale:'text'}."},
                        {"role":"user","content": json.dumps(llm_prompt)}
                    ],
                    max_tokens=200,
                    temperature=0.0
                )
                raw = completion.choices[0].message.content
                m = re.search(r"\{.*\}", raw, re.DOTALL)
                if m:
                    parsed = json.loads(m.group(0))
                    llm_score = float(parsed.get("score", 0.0))
                    llm_rationale = parsed.get("rationale", "")
                    # combine scores: weighted average (heuristic)
                    score = 0.6*score + 0.4*llm_score
                    rationale_parts.append("LLM rationale used.")
            except Exception:
                rationale_parts.append("LLM call failed/omitted.")
        # clamp score
        score = float(max(0.0, min(1.0, score)))
        strategy_scores.append({
            "strategy": strategy,
            "score": score,
            "rationale": " | ".join(rationale_parts) + (f" | LLM: {llm_rationale}" if llm_rationale else "")
        })

    # sort descending
    strategy_scores = sorted(strategy_scores, key=lambda x: x["score"], reverse=True)
    return {"case_id": req.case_id, "strategy_scores": strategy_scores, "features_used": features}

@app.post("/api/v1/nash_equilibrium")
async def nash_equilibrium(req: NashRequest, Authorization: Optional[str] = Header(None)):
    """
    Accepts either:
      - payoff_matrix_p1 and payoff_matrix_p2 (both m x n)
    or
      - game_matrix: m x n matrix where each cell is [p1_payoff, p2_payoff]
    Returns:
      - list of pure-strategy Nash equilibria
      - mixed-strategy equilibrium if 2x2 (probabilities and expected payoffs)
    """
    require_auth(Authorization)

    # parse matrices
    if req.payoff_matrix_p1 and req.payoff_matrix_p2:
        p1 = np.array(req.payoff_matrix_p1, dtype=float)
        p2 = np.array(req.payoff_matrix_p2, dtype=float)
    elif req.game_matrix:
        # convert game_matrix where each cell = [p1, p2]
        gm = req.game_matrix
        m = len(gm)
        n = len(gm[0]) if m>0 else 0
        p1 = np.zeros((m,n))
        p2 = np.zeros((m,n))
        for i in range(m):
            for j in range(n):
                cell = gm[i][j]
                if isinstance(cell, (list, tuple)) and len(cell) >= 2:
                    p1[i,j] = float(cell[0])
                    p2[i,j] = float(cell[1])
                else:
                    raise HTTPException(status_code=400, detail="Each game_matrix cell must be [p1_payoff, p2_payoff]")
    else:
        raise HTTPException(status_code=400, detail="Provide payoff_matrix_p1/p2 or game_matrix")

    m, n = p1.shape

    # 1) find pure strategy Nash equilibria
    pure_equilibria = []
    # For each cell (i,j), check if p1 payoff is max in row i (for column j?) Actually: p1's best response across columns? Need:
    # p1 chooses row i, p2 chooses column j.
    # Condition: p1 payoff at (i,j) >= p1 payoff at (k,j) for all k (no row deviation)
    #            p2 payoff at (i,j) >= p2 payoff at (i,l) for all l (no column deviation)
    for i in range(m):
        for j in range(n):
            p1_payoff = p1[i,j]
            p2_payoff = p2[i,j]
            # p1 best response to column j?
            p1_best = True
            for k in range(m):
                if p1[k,j] > p1_payoff + 1e-9:
                    p1_best = False
                    break
            # p2 best response to row i?
            p2_best = True
            for l in range(n):
                if p2[i,l] > p2_payoff + 1e-9:
                    p2_best = False
                    break
            if p1_best and p2_best:
                pure_equilibria.append({"row": i, "col": j, "p1_payoff": float(p1_payoff), "p2_payoff": float(p2_payoff)})

    mixed_equilibria = []
    # 2) attempt 2x2 mixed strategy solver (only)
    if m == 2 and n == 2:
        # For 2x2, compute mixed strategy where player1 mixes between rows with prob p, player2 mixes between cols with prob q.
        # Solve by equalizing expected payoffs for the other player.
        # Player1: expected payoff of row0 vs row1 given q
        # Let p1_row0 = a, a' etc:
        a = p1[0,0]; b = p1[0,1]; c = p1[1,0]; d = p1[1,1]
        # Player2: matrix for player2:
        e = p2[0,0]; f = p2[0,1]; g = p2[1,0]; h = p2[1,1]
        # Solve for q (prob player2 plays column0) from player1 indifferent condition:
        # expected payoff row0 = q*a + (1-q)*b
        # expected payoff row1 = q*c + (1-q)*d
        denom1 = (a - b) - (c - d)
        if abs(denom1) > 1e-12:
            q = (d - b) / denom1
        else:
            q = None
        # Solve for p (prob player1 plays row0) from player2 indifferent condition:
        denom2 = (e - f) - (g - h)
        if abs(denom2) > 1e-12:
            p = (h - f) / denom2
        else:
            p = None
        # Check bounds
        if q is not None and 0 <= q <= 1 and p is not None and 0 <= p <= 1:
            # compute expected payoffs for both
            p1_expected = p * (q * a + (1-q) * b) + (1-p) * (q * c + (1-q) * d)
            p2_expected = p * (q * e + (1-q) * f) + (1-p) * (q * g + (1-q) * h)
            mixed_equilibria.append({
                "type": "2x2_mixed",
                "p_player1_row0": float(p),
                "p_player2_col0": float(q),
                "expected_payoffs": {"player1": float(p1_expected), "player2": float(p2_expected)}
            })

    # For larger games we do not attempt general mixed-strategy solver here
    notes = ""
    if len(mixed_equilibria) == 0:
        notes = "Mixed-strategy solver currently supports 2x2 games only; pure-strategy equilibria enumerated."

    return {"pure_equilibria": pure_equilibria, "mixed_equilibria": mixed_equilibria, "notes": notes, "metadata": req.metadata}

@app.get("/api/v1/judge_analysis/{judge_id}")
async def judge_analysis(judge_id: str, Authorization: Optional[str] = Header(None)):
    """
    Compute judge-level aggregates:
      - reversal_rate: proportion of judge's cases marked 'reversed' or similar
      - avg_damages: average damages in cases handled by judge
      - case_count: number of cases
      - trend: simple recent trend of reversal_rate (rising/falling/stable)
    """
    require_auth(Authorization)
    # Fetch judge_patterns if exists
    jdata_resp = supabase.table("judge_patterns").select("*").eq("judge_id", judge_id).maybe_single().execute()
    judge_meta = jdata_resp.data if jdata_resp.data else {"judge_id": judge_id}

    # Compute aggregates from legal_cases where judges contains judge_id
    # Postgres array match: judges @> ARRAY['judge_id']
    # supabase-py allows .filter maybe - we'll use raw SQL for clarity
    sql = f"""
    SELECT outcome_label, COUNT(*) as cnt, AVG(damages_amount) as avg_damage
    FROM legal_cases
    WHERE judges::text[] @> ARRAY['{judge_id}']::text[]
    GROUP BY outcome_label;
    """
    raw_resp = supabase.rpc("sql", {"sql": sql}).execute() if hasattr(supabase, "rpc") else None
    # If 'sql' RPC not available, fallback to client-side filtering
    try:
        # Use supabase.table filter: works in many setups
        cases_resp = supabase.table("legal_cases").select("outcome_label, damages_amount, decision_date").execute()
        rows = cases_resp.data
        # filter rows locally for judge membership
        judge_rows = []
        for r in rows:
            if r.get("judges") and isinstance(r["judges"], list) and judge_id in r["judges"]:
                judge_rows.append(r)
        case_count = len(judge_rows)
        reversal_count = sum(1 for r in judge_rows if r.get("outcome_label") and "reversed" in r.get("outcome_label"))
        avg_damages = float(np.mean([r.get("damages_amount") for r in judge_rows if r.get("damages_amount") is not None]) ) if any(r.get("damages_amount") for r in judge_rows) else None
        reversal_rate = (reversal_count / case_count) if case_count > 0 else None

        # trend: use reversal_rate per year
        series = {}
        for r in judge_rows:
            dd = r.get("decision_date")
            if not dd:
                continue
            try:
                ddate = datetime.fromisoformat(dd) if isinstance(dd, str) else dd
                year = ddate.year
                series.setdefault(year, []).append(1 if (r.get("outcome_label") and "reversed" in r.get("outcome_label")) else 0)
            except Exception:
                continue
        timeseries = []
        for year, vals in series.items():
            timeseries.append((datetime(year,1,1), float(np.mean(vals))))
        trend = simple_trend(timeseries)
    except Exception:
        case_count = 0
        reversal_rate = None
        avg_damages = None
        trend = "stable"

    return {
        "judge_id": judge_id,
        "judge_name": judge_meta.get("judge_name"),
        "reversal_rate": reversal_rate,
        "avg_damages": avg_damages,
        "case_count": case_count,
        "trend": trend
    }

@app.post("/api/v1/ingest_case")
async def ingest_case(payload: IngestCaseRequest, Authorization: Optional[str] = Header(None)):
    """
    Upsert case into legal_cases and caselaw_cache, compute embedding, optionally create precedent_relationships.
    Requires service role key (server-side).
    """
    # This endpoint should be protected by server-side auth (service worker or admin)
    require_auth(Authorization)

    # 1) upsert into legal_cases
    case_row = {
        "case_id": payload.case_id,
        "case_name": payload.case_name,
        "court": payload.court,
        "jurisdiction": payload.jurisdiction,
        "case_type": payload.case_type,
        "decision_date": payload.decision_date,
        "outcome_label": payload.outcome_label,
        "damages_amount": payload.damages_amount,
        "citation_count": payload.citation_count or 0,
        "summary": payload.summary,
        "full_text": payload.full_text,
        "judges": payload.judges,
        "metadata": payload.metadata or {}
    }
    # Upsert
    resp = supabase.table("legal_cases").upsert(case_row).execute()
    if getattr(resp, "status_code", None) and resp.status_code >= 400:
        raise HTTPException(status_code=500, detail="DB upsert error for legal_cases")

    # 2) compute embedding and upsert caselaw_cache
    text_for_embedding = (payload.summary or "") + "\n\n" + (payload.full_text or "")
    if not text_for_embedding.strip():
        embedding = None
    else:
        embedding = compute_embedding(text_for_embedding)
    try:
        cache_row = {
            "case_id": payload.case_id,
            "title": payload.case_name,
            "summary": payload.summary,
            "embedding": embedding
        }
        cresp = supabase.table("caselaw_cache").upsert(cache_row).execute()
        if getattr(cresp, "status_code", None) and cresp.status_code >= 400:
            # log but continue
            pass
    except Exception:
        pass

    # 3) create precedent_relationships if explicit cites provided or heuristics found
    created_links = []
    try:
        cites = payload.cites if payload.cites else []
        if not cites and payload.full_text:
            cites = extract_candidate_citations(payload.full_text)
        for cited in cites:
            # upsert if both cases exist - simple insert
            if cited:
                rl = {"from_case": payload.case_id, "to_case": cited, "relation_type": "cites"}
                r = supabase.table("precedent_relationships").insert(rl).execute()
                created_links.append(rl)
    except Exception:
        pass

    return {"status": "ok", "case_id": payload.case_id, "created_links": created_links}

# -------------------------
# Run server
# -------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
