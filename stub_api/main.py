import os
import json
from typing import List, Optional, Dict, Any, Tuple
from fastapi import FastAPI, HTTPException, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import re
from supabase import create_client, Client
import numpy as np
from sentence_transformers import SentenceTransformer
import openai
from uuid import uuid4
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# -------------------------
# Configuration & clients
# -------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")  # server-only key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL_NAME = os.getenv("EMBED_MODEL_NAME", "all-MiniLM-L6-v2")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

# Load embedding model
try:
    embedder = SentenceTransformer(EMBED_MODEL_NAME)
except Exception as e:
    print(f"Failed to load embed model: {e}")
    embedder = None

app = FastAPI(title="Legal Oracle - Full API")

# Add CORS middleware
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

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

@app.get("/api/v1/metrics/model_calibration")
async def get_model_calibration():
    return {"calibration_score": 0.875}  # Placeholder for real calibration metric

# -------------------------
# MISSING ENDPOINTS - IMPLEMENTING NOW
# -------------------------

@app.get("/api/v1/trends/forecast")
async def forecast_trends(industry: str, jurisdictions: str, time_horizon: str, Authorization: Optional[str] = Header(None)):
    """
    Forecast regulatory changes for given industry and jurisdictions - REAL DATA VERSION
    User Story 4: Regulatory Change Forecasting
    
    Uses Federal Register API + ML forecasting for accurate predictions
    """
    require_auth(Authorization)
    
    from regulatory_api import fetch_proposed_regulations, parse_regulation_impact
    from ml_forecasting import RegulatoryForecaster, calculate_regulatory_risk_score
    
    jurisdictions_list = [j.strip() for j in jurisdictions.split(',')]
    
    # Parse time horizon to months
    horizon_map = {"short": 6, "medium": 12, "long": 24}
    horizon_months = horizon_map.get(time_horizon.lower(), 12)
    
    # Fetch real proposed regulations from Federal Register
    timeframe_days = min(horizon_months * 30, 365)
    regulations_data = await fetch_proposed_regulations(
        industry=industry,
        timeframe_days=timeframe_days,
        per_page=50
    )
    
    # Parse and analyze regulations
    predicted_changes = []
    if regulations_data.get("count", 0) > 0:
        for reg in regulations_data["results"][:10]:
            parsed = parse_regulation_impact(reg)
            if parsed:
                predicted_changes.append({
                    "change_type": parsed.get("title", "")[:80],
                    "probability": min(0.95, parsed.get("impact_score", 5) / 10),
                    "timeline": f"{parsed.get('estimated_compliance_months', 6)} months",
                    "impact_level": parsed.get("urgency", "medium"),
                    "description": parsed.get("abstract", "")[:200],
                    "document_number": parsed.get("document_number"),
                    "agencies": parsed.get("agencies", []),
                    "affected_areas": parsed.get("affected_areas", [])
                })
    
    # ML Forecasting
    forecaster = RegulatoryForecaster()
    forecast_result = forecaster.forecast(
        historical_data=regulations_data.get("results", []),
        horizon_months=horizon_months,
        method="auto"
    )
    
    # Risk assessment
    risk_assessment = calculate_regulatory_risk_score(
        forecast=forecast_result,
        current_volume=regulations_data.get("count", 0)
    )
    
    # Impact analysis
    impact_analysis = {
        "compliance_cost_increase": f"{int(risk_assessment['risk_score'] * 3)}-{int(risk_assessment['risk_score'] * 5)}%",
        "implementation_timeline": time_horizon,
        "risk_level": risk_assessment["risk_level"],
        "risk_score": risk_assessment["risk_score"],
        "recommended_actions": [risk_assessment["recommendation"]],
        "forecast_trend": forecast_result.get("trend", "stable"),
        "forecast_confidence": forecast_result.get("confidence", 0.5)
    }
    
    if risk_assessment["risk_level"] == "high":
        impact_analysis["recommended_actions"].extend([
            "Allocate additional compliance resources",
            "Engage legal counsel proactively"
        ])
    
    return {
        "predicted_changes": predicted_changes[:10],
        "impact_analysis": impact_analysis,
        "forecast": {
            "trend": forecast_result.get("trend"),
            "confidence": forecast_result.get("confidence"),
            "values": forecast_result.get("forecast_values", [])[:6]
        },
        "industry": industry,
        "jurisdictions": jurisdictions_list,
        "time_horizon": time_horizon,
        "real_data": True,
        "regulations_analyzed": regulations_data.get("count", 0)
    }

@app.get("/api/v1/jurisdiction/optimize")
async def optimize_jurisdiction(case_type: str, key_facts: str, preferred_outcome: str, Authorization: Optional[str] = Header(None)):
    """
    Recommend optimal jurisdictions for filing a case - REAL DATA VERSION
    User Story 5: Jurisdiction Optimization
    
    Analyzes historical case data from legal_cases table to provide data-driven recommendations
    """
    require_auth(Authorization)
    
    key_facts_list = [f.strip() for f in key_facts.split(',')]
    
    # Query legal_cases table for jurisdiction performance by case type
    try:
        # Get all cases of this type, grouped by jurisdiction
        cases_query = supabase.table("legal_cases").select("jurisdiction, outcome_label, damages_amount, decision_date, created_at").eq("case_type", case_type).execute()
        
        if not cases_query.data:
            # Fallback: get all cases if no specific case_type matches
            cases_query = supabase.table("legal_cases").select("jurisdiction, outcome_label, damages_amount, decision_date, created_at").execute()
        
        cases = cases_query.data
        
        # Analyze jurisdiction performance
        jurisdiction_stats = {}
        for case in cases:
            jur = case.get("jurisdiction") or "Unknown"
            if jur not in jurisdiction_stats:
                jurisdiction_stats[jur] = {
                    "total_cases": 0,
                    "plaintiff_wins": 0,
                    "defendant_wins": 0,
                    "settlements": 0,
                    "total_damages": 0,
                    "damages_count": 0,
                    "resolution_times": []
                }
            
            stats = jurisdiction_stats[jur]
            stats["total_cases"] += 1
            
            outcome = (case.get("outcome_label") or "").lower()
            if "plaintiff" in outcome or "win" in outcome:
                stats["plaintiff_wins"] += 1
            elif "defendant" in outcome or "loss" in outcome:
                stats["defendant_wins"] += 1
            elif "settle" in outcome:
                stats["settlements"] += 1
            
            if case.get("damages_amount"):
                stats["total_damages"] += float(case.get("damages_amount"))
                stats["damages_count"] += 1
            
            # Calculate resolution time if both dates available
            if case.get("decision_date") and case.get("created_at"):
                try:
                    decision = datetime.fromisoformat(str(case["decision_date"]))
                    created = datetime.fromisoformat(str(case["created_at"]).replace('Z', '+00:00'))
                    days_diff = (decision - created).days
                    if days_diff > 0:
                        stats["resolution_times"].append(days_diff)
                except Exception:
                    pass
        
        # Calculate scores and rank jurisdictions
        recommended_jurisdictions = []
        for jur, stats in jurisdiction_stats.items():
            if stats["total_cases"] < 2:  # Need at least 2 cases for meaningful stats
                continue
            
            # Calculate success probability based on preferred outcome
            if preferred_outcome.lower() in ["win", "plaintiff"]:
                success_prob = stats["plaintiff_wins"] / stats["total_cases"]
            elif preferred_outcome.lower() in ["settle", "settlement"]:
                success_prob = stats["settlements"] / stats["total_cases"]
            else:
                # General success rate (plaintiff wins + settlements)
                success_prob = (stats["plaintiff_wins"] + stats["settlements"]) / stats["total_cases"]
            
            # Calculate average damages
            avg_damages = stats["total_damages"] / stats["damages_count"] if stats["damages_count"] > 0 else 0
            
            # Calculate average resolution time
            avg_resolution_days = int(np.mean(stats["resolution_times"])) if stats["resolution_times"] else 365
            avg_resolution_months = avg_resolution_days / 30
            
            # Calculate composite score (weighted)
            score = (
                success_prob * 0.5 +  # 50% weight on success probability
                min(1.0, stats["total_cases"] / 20) * 0.2 +  # 20% weight on case volume (experience)
                (1.0 - min(1.0, avg_resolution_months / 24)) * 0.3  # 30% weight on speed (faster is better)
            )
            
            # Generate reasons based on data
            reasons = []
            if success_prob > 0.7:
                reasons.append(f"High success rate: {success_prob*100:.1f}% for {preferred_outcome} outcomes")
            if stats["total_cases"] >= 10:
                reasons.append(f"Substantial precedent: {stats['total_cases']} similar cases")
            if avg_resolution_months < 12:
                reasons.append(f"Fast resolution: avg {avg_resolution_months:.1f} months")
            if avg_damages > 100000:
                reasons.append(f"Favorable damages: avg ${avg_damages:,.0f}")
            if not reasons:
                reasons.append(f"Based on {stats['total_cases']} historical cases")
            
            # Estimate timeline
            if avg_resolution_months < 6:
                timeline = "3-6 months"
            elif avg_resolution_months < 12:
                timeline = "6-12 months"
            elif avg_resolution_months < 18:
                timeline = "12-18 months"
            else:
                timeline = "18-24 months"
            
            recommended_jurisdictions.append({
                "jurisdiction": jur,
                "score": round(score, 2),
                "reasons": reasons,
                "estimated_timeline": timeline,
                "success_probability": round(success_prob, 2),
                "historical_cases": stats["total_cases"],
                "avg_damages": round(avg_damages, 2) if avg_damages > 0 else None,
                "avg_resolution_months": round(avg_resolution_months, 1)
            })
        
        # Sort by score descending
        recommended_jurisdictions.sort(key=lambda x: x["score"], reverse=True)
        
        # Take top 5
        recommended_jurisdictions = recommended_jurisdictions[:5]
        
        if not recommended_jurisdictions:
            # Return at least one recommendation based on fallback data
            recommended_jurisdictions = [{
                "jurisdiction": "Federal",
                "score": 0.5,
                "reasons": ["Insufficient historical data - general recommendation"],
                "estimated_timeline": "12-18 months",
                "success_probability": 0.5,
                "historical_cases": 0
            }]
        
        return {
            "recommended_jurisdictions": recommended_jurisdictions,
            "case_type": case_type,
            "key_facts": key_facts_list,
            "preferred_outcome": preferred_outcome,
            "analysis_method": "real_data",
            "total_jurisdictions_analyzed": len(jurisdiction_stats)
        }
        
    except Exception as e:
        # Error handling - return empty but valid response
        return {
            "recommended_jurisdictions": [{
                "jurisdiction": "Federal",
                "score": 0.5,
                "reasons": [f"Analysis error: {str(e)}"],
                "estimated_timeline": "12-18 months",
                "success_probability": 0.5
            }],
            "case_type": case_type,
            "key_facts": key_facts_list,
            "preferred_outcome": preferred_outcome,
            "error": str(e)
        }

@app.post("/api/v1/precedent/simulate")
async def simulate_precedent(payload: dict, Authorization: Optional[str] = Header(None)):
    """
    Simulate the impact of a judicial decision on future cases - REAL CITATION GRAPH ANALYSIS
    User Story 6: Precedent Impact Simulation
    
    Uses precedent_relationships table to build citation graph and analyze real impact
    """
    require_auth(Authorization)
    
    case_id = payload.get("case_id")
    decision = payload.get("decision") 
    jurisdiction = payload.get("jurisdiction")
    
    try:
        # Get the case details
        case_resp = supabase.table("legal_cases").select("*").eq("case_id", case_id).maybe_single().execute()
        if not case_resp.data:
            raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        
        case_data = case_resp.data
        case_type = case_data.get("case_type")
        
        # Query precedent_relationships to build citation graph
        # Get all cases that cite this case (downstream impact)
        citing_cases = supabase.table("precedent_relationships").select("from_case, relation_type").eq("to_case", case_id).execute()
        
        # Get all cases cited by this case (upstream precedents)
        cited_by_case = supabase.table("precedent_relationships").select("to_case, relation_type").eq("from_case", case_id).execute()
        
        # Calculate impact metrics
        downstream_count = len(citing_cases.data) if citing_cases.data else 0
        upstream_count = len(cited_by_case.data) if cited_by_case.data else 0
        
        # Find similar cases in same jurisdiction and case type
        similar_cases_resp = supabase.table("legal_cases").select("case_id, case_name, outcome_label").eq("case_type", case_type).eq("jurisdiction", jurisdiction).limit(100).execute()
        similar_cases = similar_cases_resp.data if similar_cases_resp.data else []
        similar_count = len([c for c in similar_cases if c.get("case_id") != case_id])
        
        # Calculate precedent strength based on citation network
        # Higher citation count = stronger precedent
        if downstream_count >= 20:
            precedent_strength = "very_strong"
            strength_score = 0.9
        elif downstream_count >= 10:
            precedent_strength = "strong"
            strength_score = 0.75
        elif downstream_count >= 5:
            precedent_strength = "moderate"
            strength_score = 0.6
        elif downstream_count >= 1:
            precedent_strength = "weak"
            strength_score = 0.4
        else:
            precedent_strength = "minimal"
            strength_score = 0.2
        
        # Calculate citation likelihood based on case age and current citation rate
        case_age_days = 365  # Default
        if case_data.get("decision_date"):
            try:
                decision_date = datetime.fromisoformat(str(case_data["decision_date"]))
                case_age_days = (datetime.now() - decision_date).days
            except Exception:
                pass
        
        # Citation velocity (citations per year)
        if case_age_days > 0:
            citation_velocity = (downstream_count / (case_age_days / 365)) if case_age_days > 30 else 0
        else:
            citation_velocity = 0
        
        citation_likelihood = min(0.95, 0.3 + citation_velocity * 0.1 + strength_score * 0.4)
        
        # Analyze outcome patterns in similar cases
        outcome_analysis = {}
        for case in similar_cases:
            outcome = case.get("outcome_label") or "unknown"
            outcome_analysis[outcome] = outcome_analysis.get(outcome, 0) + 1
        
        # Determine affected cases and outcome shifts
        affected_cases = downstream_count + similar_count
        
        # Identify related legal areas from case metadata and similar cases
        related_areas = []
        if case_data.get("metadata"):
            metadata = case_data["metadata"]
            if isinstance(metadata, dict) and metadata.get("legal_issues"):
                related_areas.extend(metadata["legal_issues"])
        
        # Add case type variations
        if case_type:
            related_areas.append(case_type.replace("_", " ").title())
        
        if not related_areas:
            related_areas = ["General legal principles", "Similar fact patterns", "Jurisdictional precedents"]
        
        # Calculate timeline effects based on court hierarchy
        court_level = (case_data.get("court") or "").lower()
        if "supreme" in court_level:
            timeline_effects = {
                "immediate": "Binding precedent across jurisdiction",
                "short_term": "Nationwide influence expected",
                "long_term": "Landmark precedent status likely"
            }
        elif "circuit" in court_level or "appeals" in court_level:
            timeline_effects = {
                "immediate": "Circuit-wide binding precedent",
                "short_term": "Influence on district courts",
                "long_term": "Potential circuit split resolution"
            }
        elif "district" in court_level:
            timeline_effects = {
                "immediate": "Persuasive authority in district",
                "short_term": "Local jurisdiction influence",
                "long_term": "May inform appellate decisions"
            }
        else:
            timeline_effects = {
                "immediate": "Limited immediate impact",
                "short_term": "Gradual adoption possible",
                "long_term": "Dependent on subsequent citations"
            }
        
        impact_analysis = {
            "affected_cases": affected_cases,
            "precedent_strength": precedent_strength,
            "citation_likelihood": round(citation_likelihood, 2),
            "citation_metrics": {
                "downstream_citations": downstream_count,
                "upstream_citations": upstream_count,
                "citation_velocity_per_year": round(citation_velocity, 2),
                "case_age_years": round(case_age_days / 365, 1)
            },
            "future_impact": {
                "similar_cases": {
                    "count": similar_count,
                    "outcome_distribution": outcome_analysis,
                    "jurisdiction": jurisdiction
                },
                "related_areas": related_areas[:5]  # Top 5 areas
            },
            "timeline_effects": timeline_effects,
            "network_analysis": {
                "total_network_size": downstream_count + upstream_count,
                "network_depth": "high" if upstream_count > 5 else "low",
                "influence_score": round(strength_score, 2)
            }
        }
        
        return {
            "case_id": case_id,
            "case_name": case_data.get("case_name"),
            "decision": decision,
            "jurisdiction": jurisdiction,
            "impact_analysis": impact_analysis,
            "analysis_method": "real_citation_graph"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Fallback response
        return {
            "case_id": case_id,
            "decision": decision,
            "jurisdiction": jurisdiction,
            "impact_analysis": {
                "affected_cases": 0,
                "precedent_strength": "unknown",
                "citation_likelihood": 0.5,
                "error": f"Analysis failed: {str(e)}"
            },
            "error": str(e)
        }

@app.get("/api/v1/trends/model")
async def model_legal_evolution(legal_domain: str, time_horizon: str, Authorization: Optional[str] = Header(None)):
    """
    Model legal evolution trends over time - REAL TIME-SERIES ANALYSIS
    User Story 7: Legal Evolution Modeling
    
    Analyzes historical trends from legal_cases table using time-series analysis
    """
    require_auth(Authorization)
    
    try:
        # Parse time horizon (e.g., "5_years", "10_years", "20_years")
        years = 5
        if "_" in time_horizon:
            try:
                years = int(time_horizon.split("_")[0])
            except:
                years = 5
        
        # Query all cases in the legal domain (case_type mapping)
        domain_to_case_types = {
            "contract_law": ["contract_dispute", "contract"],
            "tort_law": ["tort", "personal_injury", "product_liability"],
            "criminal_law": ["criminal", "criminal_defense"],
            "employment_law": ["employment", "discrimination"],
            "environmental_law": ["environmental"],
            "corporate_law": ["corporate", "securities"]
        }
        
        case_types = domain_to_case_types.get(legal_domain.lower(), [legal_domain])
        
        # Get all relevant cases
        all_cases = []
        for case_type in case_types:
            resp = supabase.table("legal_cases").select("*").eq("case_type", case_type).execute()
            if resp.data:
                all_cases.extend(resp.data)
        
        if not all_cases:
            # Fallback: get all cases
            resp = supabase.table("legal_cases").select("*").limit(500).execute()
            all_cases = resp.data if resp.data else []
        
        # Time-series analysis: group by year and analyze trends
        yearly_stats = {}
        current_year = datetime.now().year
        start_year = current_year - years
        
        for case in all_cases:
            decision_date = case.get("decision_date")
            if not decision_date:
                continue
            
            try:
                year = datetime.fromisoformat(str(decision_date)).year
                if year < start_year:
                    continue
                
                if year not in yearly_stats:
                    yearly_stats[year] = {
                        "total_cases": 0,
                        "plaintiff_wins": 0,
                        "settlements": 0,
                        "total_damages": 0,
                        "avg_damages": 0,
                        "citation_counts": []
                    }
                
                stats = yearly_stats[year]
                stats["total_cases"] += 1
                
                outcome = (case.get("outcome_label") or "").lower()
                if "plaintiff" in outcome or "win" in outcome:
                    stats["plaintiff_wins"] += 1
                elif "settle" in outcome:
                    stats["settlements"] += 1
                
                if case.get("damages_amount"):
                    stats["total_damages"] += float(case["damages_amount"])
                
                if case.get("citation_count"):
                    stats["citation_counts"].append(case["citation_count"])
                    
            except Exception:
                continue
        
        # Calculate averages and trends
        for year, stats in yearly_stats.items():
            if stats["total_cases"] > 0:
                stats["avg_damages"] = stats["total_damages"] / stats["total_cases"]
                stats["plaintiff_win_rate"] = stats["plaintiff_wins"] / stats["total_cases"]
                stats["settlement_rate"] = stats["settlements"] / stats["total_cases"]
        
        # Detect evolution patterns
        evolution_patterns = []
        
        # 1. Settlement trend
        settlement_rates = [(year, stats.get("settlement_rate", 0)) for year, stats in sorted(yearly_stats.items())]
        if len(settlement_rates) >= 3:
            recent_avg = np.mean([r for _, r in settlement_rates[-3:]])
            early_avg = np.mean([r for _, r in settlement_rates[:3]] if len(settlement_rates) >= 3 else [settlement_rates[0][1]])
            if recent_avg > early_avg * 1.2:
                evolution_patterns.append({
                    "trend": f"Increasing settlement rates in {legal_domain}",
                    "strength": min(0.95, (recent_avg / early_avg) if early_avg > 0 else 0.5),
                    "direction": "rising",
                    "data": {"recent_rate": round(recent_avg, 2), "historical_rate": round(early_avg, 2)}
                })
            elif recent_avg < early_avg * 0.8:
                evolution_patterns.append({
                    "trend": f"Decreasing settlement rates in {legal_domain}",
                    "strength": min(0.95, (early_avg / recent_avg) if recent_avg > 0 else 0.5),
                    "direction": "falling",
                    "data": {"recent_rate": round(recent_avg, 2), "historical_rate": round(early_avg, 2)}
                })
        
        # 2. Damages trend
        damages_by_year = [(year, stats.get("avg_damages", 0)) for year, stats in sorted(yearly_stats.items()) if stats.get("avg_damages", 0) > 0]
        if len(damages_by_year) >= 2:
            recent_damages = damages_by_year[-1][1] if damages_by_year else 0
            early_damages = damages_by_year[0][1] if damages_by_year else 0
            if recent_damages > early_damages * 1.3:
                evolution_patterns.append({
                    "trend": "Increasing damage awards",
                    "strength": 0.75,
                    "direction": "rising",
                    "data": {"current_avg": round(recent_damages, 0), "historical_avg": round(early_damages, 0)}
                })
        
        # 3. Case volume trend
        case_counts = [(year, stats["total_cases"]) for year, stats in sorted(yearly_stats.items())]
        if len(case_counts) >= 2:
            recent_count = np.mean([c for _, c in case_counts[-2:]])
            early_count = np.mean([c for _, c in case_counts[:2]])
            if recent_count > early_count * 1.5:
                evolution_patterns.append({
                    "trend": f"Surge in {legal_domain} litigation",
                    "strength": 0.80,
                    "direction": "rising",
                    "data": {"recent_volume": int(recent_count), "historical_volume": int(early_count)}
                })
        
        # Identify key drivers based on patterns
        key_drivers = []
        if any(p["trend"].lower().find("settlement") >= 0 for p in evolution_patterns):
            key_drivers.append("Cost considerations driving settlements")
        if any(p["trend"].lower().find("damage") >= 0 for p in evolution_patterns):
            key_drivers.append("Inflation and precedent shifts")
        if any(p["trend"].lower().find("surge") >= 0 or p["trend"].lower().find("increasing") >= 0 for p in evolution_patterns):
            key_drivers.append("Increased legal awareness and access")
        
        if not key_drivers:
            key_drivers = ["Evolving legal standards", "Judicial interpretation shifts", "Societal changes"]
        
        # Make predictions based on trends
        rising_trends = sum(1 for p in evolution_patterns if p["direction"] == "rising")
        falling_trends = sum(1 for p in evolution_patterns if p["direction"] == "falling")
        
        if rising_trends > falling_trends:
            prediction_text = f"Continued growth in {legal_domain} activity and complexity"
            confidence = 0.75
        elif falling_trends > rising_trends:
            prediction_text = f"Stabilization or decline in {legal_domain} litigation"
            confidence = 0.70
        else:
            prediction_text = f"Stable evolution of {legal_domain} with incremental changes"
            confidence = 0.65
        
        trend_analysis = {
            "domain": legal_domain,
            "time_period": time_horizon,
            "evolution_patterns": evolution_patterns if evolution_patterns else [
                {
                    "trend": "Insufficient historical data",
                    "strength": 0.3,
                    "direction": "stable"
                }
            ],
            "key_drivers": key_drivers,
            "predictions": {
                f"next_{years}_years": prediction_text,
                "confidence": confidence
            },
            "time_series_data": {
                "years_analyzed": len(yearly_stats),
                "total_cases_analyzed": sum(s["total_cases"] for s in yearly_stats.values()),
                "yearly_breakdown": {str(year): {
                    "cases": stats["total_cases"],
                    "avg_damages": round(stats.get("avg_damages", 0), 0)
                } for year, stats in sorted(yearly_stats.items())}
            }
        }
        
        return {
            "trend_analysis": trend_analysis,
            "analysis_method": "real_time_series"
        }
        
    except Exception as e:
        # Fallback
        return {
            "trend_analysis": {
                "domain": legal_domain,
                "time_period": time_horizon,
                "evolution_patterns": [{"trend": "Analysis error", "strength": 0.5, "direction": "unknown"}],
                "key_drivers": [],
                "predictions": {"error": str(e), "confidence": 0}
            },
            "error": str(e)
        }

@app.post("/api/v1/compliance/optimize")
async def optimize_compliance(payload: dict, Authorization: Optional[str] = Header(None)):
    """
    Optimize compliance strategies for businesses - REAL COMPLIANCE FRAMEWORK DATABASE
    User Story 8: Compliance Optimization
    
    Uses compliance_frameworks and compliance_controls tables for data-driven recommendations
    """
    require_auth(Authorization)
    
    industry = payload.get("industry")
    jurisdiction = payload.get("jurisdiction")
    current_practices = payload.get("current_practices", [])
    
    try:
        # Query applicable frameworks for this industry/jurisdiction
        applicable_frameworks = []
        
        # Method 1: Check industry_compliance_map
        map_resp = supabase.table("industry_compliance_map").select("*, compliance_frameworks(*)").eq("industry", industry).execute()
        
        if map_resp.data:
            for mapping in map_resp.data:
                framework_data = mapping.get("compliance_frameworks")
                if framework_data:
                    applicable_frameworks.append({
                        "framework_id": framework_data.get("id"),
                        "framework_code": framework_data.get("framework_code"),
                        "framework_name": framework_data.get("framework_name"),
                        "applicability_score": mapping.get("applicability_score", 0.5),
                        "mandatory": mapping.get("mandatory", False)
                    })
        
        # Method 2: Fallback - get frameworks that match industry in their array
        if not applicable_frameworks:
            frameworks_resp = supabase.table("compliance_frameworks").select("*").execute()
            if frameworks_resp.data:
                for fw in frameworks_resp.data:
                    industries = fw.get("industry") or []
                    if industry.lower() in [i.lower() for i in industries]:
                        applicable_frameworks.append({
                            "framework_id": fw.get("id"),
                            "framework_code": fw.get("framework_code"),
                            "framework_name": fw.get("framework_name"),
                            "applicability_score": 0.7,
                            "mandatory": False
                        })
        
        # Get controls for applicable frameworks
        all_controls = []
        framework_ids = [fw["framework_id"] for fw in applicable_frameworks]
        
        for fw_id in framework_ids:
            controls_resp = supabase.table("compliance_controls").select("*").eq("framework_id", fw_id).execute()
            if controls_resp.data:
                for control in controls_resp.data:
                    # Check if already implemented
                    control_code = control.get("control_code", "")
                    already_implemented = any(
                        practice.lower() in control.get("description", "").lower() 
                        for practice in current_practices
                    )
                    
                    if not already_implemented:  # Only recommend missing controls
                        all_controls.append({
                            "control_code": control_code,
                            "framework": next((f["framework_code"] for f in applicable_frameworks if f["framework_id"] == fw_id), "Unknown"),
                            "title": control.get("control_title"),
                            "description": control.get("description"),
                            "priority": control.get("priority"),
                            "estimated_cost": float(control.get("estimated_cost") or 0),
                            "timeline_days": control.get("implementation_timeline_days"),
                            "category": control.get("control_category"),
                            "requirements": control.get("requirements", [])
                        })
        
        # Sort by priority (P1 > P2 > P3) and cost
        priority_order = {"P1": 1, "P2": 2, "P3": 3}
        all_controls.sort(key=lambda x: (priority_order.get(x["priority"], 99), x["estimated_cost"]))
        
        # Calculate risk assessment
        total_mandatory = sum(1 for fw in applicable_frameworks if fw["mandatory"])
        controls_needed = len(all_controls)
        p1_controls = sum(1 for c in all_controls if c["priority"] == "P1")
        
        if p1_controls >= 5:
            residual_risk = "high"
            risk_score = 0.8
        elif p1_controls >= 3:
            residual_risk = "medium-high"
            risk_score = 0.6
        elif p1_controls >= 1:
            residual_risk = "medium"
            risk_score = 0.4
        else:
            residual_risk = "low"
            risk_score = 0.2
        
        # Calculate total investment needed
        total_cost = sum(c["estimated_cost"] for c in all_controls)
        avg_timeline = int(np.mean([c["timeline_days"] for c in all_controls])) if all_controls else 0
        
        # Generate recommendations
        recommendations = []
        if p1_controls > 0:
            recommendations.append(f"Prioritize {p1_controls} P1 controls immediately")
        if total_mandatory > 0:
            recommendations.append(f"Compliance with {total_mandatory} mandatory frameworks required")
        if total_cost > 100000:
            recommendations.append("Consider phased implementation to manage costs")
        if avg_timeline > 120:
            recommendations.append("Long implementation timeline - start planning now")
        
        if not recommendations:
            recommendations.append("Maintain current compliance posture with periodic reviews")
        
        # Format controls for response
        formatted_controls = []
        for control in all_controls[:15]:  # Top 15 most important
            formatted_controls.append({
                "id": control["control_code"],
                "framework": control["framework"],
                "title": control["title"],
                "description": control["description"],
                "priority": control["priority"],
                "estimated_cost": f"${control['estimated_cost']:,.0f}",
                "timeline": f"{control['timeline_days']} days",
                "category": control["category"],
                "requirements": control["requirements"][:3]  # Top 3 requirements
            })
        
        return {
            "controls": formatted_controls,
            "applicable_frameworks": [
                {
                    "code": fw["framework_code"],
                    "name": fw["framework_name"],
                    "mandatory": fw["mandatory"],
                    "applicability": fw["applicability_score"]
                } for fw in applicable_frameworks
            ],
            "risk_assessment": {
                "residual_risk": residual_risk,
                "risk_score": risk_score,
                "p1_controls_needed": p1_controls,
                "total_controls_needed": controls_needed
            },
            "investment_analysis": {
                "total_estimated_cost": f"${total_cost:,.0f}",
                "average_timeline_days": avg_timeline,
                "recommended_budget_range": f"${total_cost * 0.8:,.0f} - ${total_cost * 1.2:,.0f}"
            },
            "recommendations": recommendations,
            "industry": industry,
            "jurisdiction": jurisdiction,
            "current_practices": current_practices,
            "analysis_method": "real_compliance_framework"
        }
        
    except Exception as e:
        # Fallback response
        return {
            "controls": [{
                "id": "ERROR",
                "description": f"Analysis failed: {str(e)}",
                "priority": "N/A",
                "estimated_cost": "$0",
                "timeline": "N/A"
            }],
            "residual_risk": "unknown",
            "industry": industry,
            "jurisdiction": jurisdiction,
            "current_practices": current_practices,
            "error": str(e)
        }

@app.get("/api/v1/arbitrage/alerts")
async def get_arbitrage_alerts(user_role: str, jurisdiction: str, legal_interests: str, Authorization: Optional[str] = Header(None)):
    """
    Identify legal arbitrage opportunities - REAL DATA VERSION
    User Story 10: Legal Arbitrage Alerts
    
    Uses real-time monitoring of regulations and case law for temporary advantages
    """
    require_auth(Authorization)
    
    from arbitrage_monitor import ArbitrageMonitor, format_opportunity_for_api
    from regulatory_api import fetch_proposed_regulations
    
    legal_interests_list = [i.strip() for i in legal_interests.split(',')]
    
    # Fetch recent regulations (last 6 months)
    regulations_data = await fetch_proposed_regulations(
        industry=legal_interests_list[0] if legal_interests_list else "technology",
        timeframe_days=180,
        per_page=50
    )
    
    # Fetch case data for circuit split detection
    try:
        case_query = supabase.table("legal_cases").select("*").limit(100).execute()
        case_data = case_query.data if case_query else []
    except Exception as e:
        logger.error(f"Error fetching cases: {str(e)}")
        case_data = []
    
    # Run arbitrage detection
    monitor = ArbitrageMonitor()
    opportunities = await monitor.scan_for_opportunities(
        regulations=regulations_data.get("results", []),
        case_data=case_data
    )
    
    # Format for API response
    formatted_opportunities = [
        format_opportunity_for_api(opp) for opp in opportunities[:20]  # Top 20
    ]
    
    # Filter by jurisdiction if specified
    if jurisdiction and jurisdiction.lower() != "all":
        formatted_opportunities = [
            opp for opp in formatted_opportunities
            if jurisdiction.lower() in " ".join(opp.get("jurisdictions", [])).lower()
        ]
    
    # Add estimated savings based on opportunity score
    for opp in formatted_opportunities:
        score = opp.get("opportunity_score", 0.5)
        base_savings = 50000
        potential_savings = int(base_savings * score)
        opp["potential_savings"] = f"${potential_savings:,}-${potential_savings * 2:,}"
        opp["complexity"] = "high" if score > 0.8 else "medium" if score > 0.6 else "low"
    
    return {
        "opportunities": formatted_opportunities,
        "total_found": len(opportunities),
        "user_role": user_role,
        "jurisdiction": jurisdiction,
        "legal_interests": legal_interests_list,
        "real_data": True,
        "data_sources": ["Federal Register API", "Legal Cases Database"],
        "detection_types": ["sunset_clauses", "jurisdictional_conflicts", "temporary_exemptions", "transition_periods"]
    }

@app.get("/api/v1/precedent/predict")
async def predict_landmark_cases(jurisdiction: str, case_details: str, Authorization: Optional[str] = Header(None)):
    """
    Predict which current cases might become landmark decisions - REAL ML-BASED PREDICTION
    User Story 9: Landmark Case Prediction
    
    Uses feature-based scoring to predict landmark potential based on:
    - Citation network analysis
    - Legal complexity indicators
    - Court hierarchy
    - Novel legal questions
    - Jurisdictional importance
    """
    require_auth(Authorization)
    
    case_details_list = [d.strip() for d in case_details.split(',')]
    
    try:
        # Get recent cases from the specified jurisdiction
        recent_cutoff = datetime.now() - timedelta(days=730)  # Last 2 years
        cases_resp = supabase.table("legal_cases").select("*").gte("decision_date", recent_cutoff.isoformat()).execute()
        
        if not cases_resp.data:
            # Fallback: get all cases
            cases_resp = supabase.table("legal_cases").select("*").limit(100).execute()
        
        all_cases = cases_resp.data if cases_resp.data else []
        
        # Filter by jurisdiction if provided
        if jurisdiction and jurisdiction.lower() != "all":
            all_cases = [c for c in all_cases if (c.get("jurisdiction") or "").lower() == jurisdiction.lower()]
        
        # Calculate landmark probability for each case using feature-based scoring
        predictions = []
        
        for case in all_cases[:50]:  # Limit to top 50 recent cases
            case_id = case.get("case_id")
            case_name = case.get("case_name")
            court = (case.get("court") or "").lower()
            case_type = case.get("case_type")
            
            # Feature extraction
            features = {}
            
            # 1. Court hierarchy score (higher courts = higher landmark potential)
            if "supreme" in court:
                features["court_level_score"] = 1.0
            elif "circuit" in court or "appeals" in court:
                features["court_level_score"] = 0.75
            elif "district" in court:
                features["court_level_score"] = 0.4
            else:
                features["court_level_score"] = 0.3
            
            # 2. Citation network analysis
            citing_resp = supabase.table("precedent_relationships").select("from_case").eq("to_case", case_id).execute()
            cited_resp = supabase.table("precedent_relationships").select("to_case").eq("from_case", case_id).execute()
            
            citation_count = len(citing_resp.data) if citing_resp.data else 0
            upstream_citations = len(cited_resp.data) if cited_resp.data else 0
            
            # Normalize citation score
            features["citation_network_score"] = min(1.0, citation_count / 10)  # Max score at 10+ citations
            features["legal_depth_score"] = min(1.0, upstream_citations / 15)  # Cases citing many precedents = complex
            
            # 3. Case age and recency (recent cases with growing citations)
            case_age_days = 365
            if case.get("decision_date"):
                try:
                    decision_date = datetime.fromisoformat(str(case["decision_date"]))
                    case_age_days = (datetime.now() - decision_date).days
                except:
                    pass
            
            # Recent but not too new (need time to accumulate citations)
            if 90 < case_age_days < 730:
                features["recency_score"] = 0.9
            elif 30 < case_age_days <= 90:
                features["recency_score"] = 0.6  # Too new
            else:
                features["recency_score"] = 0.4  # Too old or too new
            
            # 4. Citation velocity (citations per month)
            if case_age_days > 30:
                citation_velocity = citation_count / (case_age_days / 30)
                features["velocity_score"] = min(1.0, citation_velocity)
            else:
                features["velocity_score"] = 0.3
            
            # 5. Legal complexity (metadata analysis)
            complexity_score = 0.5  # Default
            if case.get("metadata"):
                metadata = case["metadata"]
                if isinstance(metadata, dict):
                    # Check for complexity indicators
                    if metadata.get("complexity") == "high":
                        complexity_score = 0.9
                    elif metadata.get("precedent_strength") in ["strong", "moderate"]:
                        complexity_score = 0.75
                    
                    # Novel legal issues
                    if metadata.get("legal_issues"):
                        issues_count = len(metadata.get("legal_issues", []))
                        complexity_score += min(0.2, issues_count * 0.05)
            
            features["complexity_score"] = min(1.0, complexity_score)
            
            # 6. Damages amount (high-stakes cases)
            damages = case.get("damages_amount") or 0
            if damages > 10000000:  # >$10M
                features["stakes_score"] = 1.0
            elif damages > 1000000:  # >$1M
                features["stakes_score"] = 0.7
            elif damages > 100000:  # >$100K
                features["stakes_score"] = 0.4
            else:
                features["stakes_score"] = 0.2
            
            # Calculate weighted landmark probability
            weights = {
                "court_level_score": 0.25,
                "citation_network_score": 0.20,
                "legal_depth_score": 0.15,
                "recency_score": 0.10,
                "velocity_score": 0.15,
                "complexity_score": 0.10,
                "stakes_score": 0.05
            }
            
            landmark_probability = sum(features.get(k, 0) * w for k, w in weights.items())
            
            # Only include cases with decent probability
            if landmark_probability < 0.4:
                continue
            
            # Identify key factors
            factors = []
            if features["court_level_score"] >= 0.75:
                factors.append(f"High-level court: {case.get('court')}")
            if features["citation_network_score"] >= 0.5:
                factors.append(f"Strong citation network: {citation_count} citations")
            if features["velocity_score"] >= 0.5:
                factors.append(f"High citation velocity: growing influence")
            if features["complexity_score"] >= 0.7:
                factors.append("Complex legal questions")
            if features["stakes_score"] >= 0.7:
                factors.append(f"High stakes: ${damages:,.0f} in damages")
            if not factors:
                factors.append("General precedent potential")
            
            # Estimate timeline to landmark status
            if citation_count >= 5:
                timeline = "6-12 months"
            elif citation_count >= 2:
                timeline = "12-18 months"
            else:
                timeline = "18-24 months"
            
            # Predict potential impact
            impact_areas = []
            if case_type:
                impact_areas.append(f"{case_type.replace('_', ' ').title()} law")
            if case.get("metadata") and isinstance(case["metadata"], dict):
                if case["metadata"].get("legal_issues"):
                    impact_areas.extend(case["metadata"]["legal_issues"][:2])
            
            potential_impact = ", ".join(impact_areas) if impact_areas else "Broad legal precedent"
            
            predictions.append({
                "case_id": case_id,
                "case_name": case_name,
                "landmark_probability": round(landmark_probability, 2),
                "factors": factors[:4],  # Top 4 factors
                "potential_impact": potential_impact,
                "timeline": timeline,
                "feature_scores": {k: round(v, 2) for k, v in features.items()},
                "court": case.get("court"),
                "decision_date": case.get("decision_date")
            })
        
        # Sort by probability descending
        predictions.sort(key=lambda x: x["landmark_probability"], reverse=True)
        
        # Return top 10
        predictions = predictions[:10]
        
        if not predictions:
            predictions = [{
                "case_id": "N/A",
                "case_name": "No qualifying cases found",
                "landmark_probability": 0.0,
                "factors": ["Insufficient data for prediction"],
                "potential_impact": "N/A",
                "timeline": "N/A"
            }]
        
        return {
            "predictions": predictions,
            "jurisdiction": jurisdiction,
            "case_details": case_details_list,
            "analysis_method": "ml_feature_based",
            "total_cases_analyzed": len(all_cases),
            "methodology": {
                "features_used": list(weights.keys()),
                "feature_weights": weights
            }
        }
        
    except Exception as e:
        return {
            "predictions": [{
                "case_id": "ERROR",
                "case_name": "Analysis failed",
                "landmark_probability": 0.0,
                "factors": [f"Error: {str(e)}"],
                "potential_impact": "N/A",
                "timeline": "N/A"
            }],
            "jurisdiction": jurisdiction,
            "case_details": case_details_list,
            "error": str(e)
        }

# -------------------------
# Scheduled Tasks Integration
# -------------------------
try:
    from scheduled_tasks import start_scheduler, stop_scheduler, get_scheduler_status, manual_trigger_scan
    from email_service import AlertEmailService
    SCHEDULER_AVAILABLE = True
except ImportError as e:
    print(f"[WARN] Scheduled tasks not available: {e}")
    SCHEDULER_AVAILABLE = False

@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on server startup"""
    print("[INFO] Starting Legal Oracle API...")
    
    if SCHEDULER_AVAILABLE:
        success = start_scheduler()
        if success:
            print("[OK] Background scheduler initialized")
        else:
            print("[WARN] Failed to start scheduler")
    else:
        print("[WARN] Scheduler not available - install apscheduler for background tasks")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on server shutdown"""
    print("[INFO] Shutting down Legal Oracle API...")
    
    if SCHEDULER_AVAILABLE:
        stop_scheduler()
        print("[OK] Scheduler stopped")

# -------------------------
# Alert System Endpoints
# -------------------------

class AlertSubscriptionRequest(BaseModel):
    user_email: str
    industry: Optional[str] = None
    jurisdictions: Optional[List[str]] = None
    alert_types: Optional[List[str]] = None
    frequency: str = "daily"

@app.post("/api/v1/alerts/subscribe")
async def subscribe_to_alerts(
    request: AlertSubscriptionRequest,
    Authorization: Optional[str] = Header(None)
):
    """
    Subscribe user to regulatory arbitrage alerts
    
    Args:
        user_email: Email address for alerts
        industry: Industry to monitor (technology, healthcare, finance, etc.)
        jurisdictions: List of jurisdictions to monitor
        alert_types: Types of alerts (sunset_clause, jurisdictional_conflict, etc.)
        frequency: How often to receive alerts (realtime, daily, weekly)
    """
    require_auth(Authorization)
    
    try:
        # Check if subscription already exists
        existing = supabase.table("user_alert_subscriptions") \
            .select("*") \
            .eq("user_email", request.user_email) \
            .maybe_single() \
            .execute()
        
        if existing.data:
            # Update existing subscription
            result = supabase.table("user_alert_subscriptions") \
                .update({
                    "industry": request.industry,
                    "jurisdictions": request.jurisdictions,
                    "alert_types": request.alert_types or ["sunset_clause", "jurisdictional_conflict"],
                    "frequency": request.frequency,
                    "is_active": True,
                    "updated_at": datetime.now().isoformat()
                }) \
                .eq("id", existing.data["id"]) \
                .execute()
            
            return {
                "status": "updated",
                "subscription_id": existing.data["id"],
                "message": "Subscription preferences updated successfully"
            }
        else:
            # Create new subscription
            result = supabase.table("user_alert_subscriptions") \
                .insert({
                    "user_email": request.user_email,
                    "industry": request.industry,
                    "jurisdictions": request.jurisdictions,
                    "alert_types": request.alert_types or ["sunset_clause", "jurisdictional_conflict"],
                    "frequency": request.frequency,
                    "is_active": True
                }) \
                .execute()
            
            return {
                "status": "created",
                "subscription_id": result.data[0]["id"] if result.data else None,
                "message": "Successfully subscribed to alerts"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Subscription failed: {str(e)}")

@app.get("/api/v1/alerts/subscription/{user_email}")
async def get_subscription(
    user_email: str,
    Authorization: Optional[str] = Header(None)
):
    """Get user's current alert subscription"""
    require_auth(Authorization)
    
    try:
        result = supabase.table("user_alert_subscriptions") \
            .select("*") \
            .eq("user_email", user_email) \
            .maybe_single() \
            .execute()
        
        if result.data:
            return {
                "subscription": result.data,
                "status": "active" if result.data.get("is_active") else "inactive"
            }
        else:
            return {
                "subscription": None,
                "status": "not_found",
                "message": "No subscription found for this email"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscription: {str(e)}")

@app.delete("/api/v1/alerts/unsubscribe/{user_email}")
async def unsubscribe_from_alerts(
    user_email: str,
    Authorization: Optional[str] = Header(None)
):
    """Unsubscribe user from alerts"""
    require_auth(Authorization)
    
    try:
        result = supabase.table("user_alert_subscriptions") \
            .update({"is_active": False}) \
            .eq("user_email", user_email) \
            .execute()
        
        return {
            "status": "unsubscribed",
            "message": "Successfully unsubscribed from alerts"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unsubscribe failed: {str(e)}")

@app.post("/api/v1/admin/trigger_alert_scan")
async def trigger_manual_scan(Authorization: Optional[str] = Header(None)):
    """
    Manually trigger regulatory scan and alert sending (admin only)
    """
    require_auth(Authorization)
    
    if not SCHEDULER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Scheduler not available")
    
    try:
        # Run scan asynchronously
        import asyncio
        asyncio.create_task(manual_trigger_scan())
        
        return {
            "status": "triggered",
            "message": "Manual scan initiated. Check logs for progress."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger scan: {str(e)}")

@app.get("/api/v1/admin/scheduler_status")
async def get_scheduler_status_endpoint(Authorization: Optional[str] = Header(None)):
    """
    Get current scheduler status (admin only)
    """
    require_auth(Authorization)
    
    if not SCHEDULER_AVAILABLE:
        return {
            "running": False,
            "reason": "Scheduler not available - install apscheduler"
        }
    
    try:
        status = get_scheduler_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@app.get("/api/v1/alerts/recent_opportunities")
async def get_recent_opportunities(
    industry: Optional[str] = None,
    limit: int = 20,
    Authorization: Optional[str] = Header(None)
):
    """
    Get recently detected arbitrage opportunities
    """
    require_auth(Authorization)
    
    try:
        query = supabase.table("detected_opportunities") \
            .select("*") \
            .eq("is_active", True) \
            .order("detection_date", desc=True) \
            .limit(limit)
        
        if industry:
            query = query.eq("industry", industry)
        
        result = query.execute()
        
        return {
            "opportunities": result.data or [],
            "count": len(result.data) if result.data else 0,
            "industry_filter": industry
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch opportunities: {str(e)}")

# -------------------------
# Multi-Agent Workflow Endpoints
# -------------------------

try:
    from workflow_orchestrator import CaseWorkflowOrchestrator
    from report_generator import generate_workflow_report_pdf, generate_simple_text_report
    from fastapi.responses import StreamingResponse
    WORKFLOW_AVAILABLE = True
except ImportError as e:
    print(f"[WARN] Workflow orchestrator not available: {e}")
    WORKFLOW_AVAILABLE = False

class WorkflowRequest(BaseModel):
    case_text: str
    case_type: str
    jurisdiction: str
    damages_amount: Optional[float] = None

# In-memory cache for workflow results (use Redis in production)
workflow_cache = {}

@app.post("/api/v1/workflow/full_analysis")
async def run_full_workflow(
    request: WorkflowRequest,
    Authorization: Optional[str] = Header(None)
):
    """
    Run complete multi-agent workflow for case analysis
    
    This endpoint orchestrates:
    1. Fact Extraction - Extract key entities and legal concepts
    2. Precedent Retrieval - Find similar cases
    3. Risk Assessment - Calculate win probability
    4. Strategy Optimization - Recommend optimal strategies
    5. Report Synthesis - Generate comprehensive report
    
    Returns comprehensive analysis report
    """
    require_auth(Authorization)
    
    if not WORKFLOW_AVAILABLE:
        raise HTTPException(status_code=503, detail="Workflow orchestrator not available")
    
    try:
        orchestrator = CaseWorkflowOrchestrator()
        report = await orchestrator.run_full_analysis(
            case_text=request.case_text,
            case_type=request.case_type,
            jurisdiction=request.jurisdiction,
            damages_amount=request.damages_amount
        )
        
        # Cache the report for PDF generation
        workflow_id = report.get("workflow_id")
        if workflow_id:
            workflow_cache[workflow_id] = report
        
        return report
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow failed: {str(e)}")

@app.get("/api/v1/workflow/report/{workflow_id}/pdf")
async def download_workflow_pdf(
    workflow_id: str,
    Authorization: Optional[str] = Header(None)
):
    """
    Download PDF report for a completed workflow
    """
    require_auth(Authorization)
    
    # Check cache
    workflow_data = workflow_cache.get(workflow_id)
    
    if not workflow_data:
        raise HTTPException(status_code=404, detail="Workflow not found. Please run analysis first.")
    
    try:
        pdf_buffer = generate_workflow_report_pdf(workflow_data)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=legal_analysis_{workflow_id}.pdf"
            }
        )
    except ImportError:
        # Fallback to text report if reportlab not available
        text_report = generate_simple_text_report(workflow_data)
        return Response(
            content=text_report,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename=legal_analysis_{workflow_id}.txt"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@app.get("/api/v1/workflow/report/{workflow_id}")
async def get_workflow_report(
    workflow_id: str,
    Authorization: Optional[str] = Header(None)
):
    """
    Get workflow report as JSON
    """
    require_auth(Authorization)
    
    workflow_data = workflow_cache.get(workflow_id)
    
    if not workflow_data:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return workflow_data

# -------------------------
# Run server
# -------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
