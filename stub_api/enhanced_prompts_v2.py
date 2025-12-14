"""
Enhanced LLM Prompts v2.0 for Legal Oracle
Implements 5x effectiveness improvements with:
- Glass Box citation integration
- Confidence interval calculation
- Chain-of-thought with explicit reasoning
- Jurisdiction-specific context injection
- Multi-party game theory considerations

Author: Legal Oracle Team
Date: 2025-12-15
Version: 2.0
"""

from typing import Dict, List, Optional, Tuple
import json

# ========================================
# GLASS BOX CASE PREDICTION PROMPTS (5x Enhanced)
# ========================================

GLASS_BOX_PREDICTION_SYSTEM = """You are a senior legal AI assistant with expertise in litigation analytics and outcome prediction.

YOUR MISSION: Provide TRANSPARENT, AUDITABLE predictions with GLASS BOX reasoning.

CRITICAL REQUIREMENTS:
1. EVERY probability MUST cite a source case or statistic
2. Confidence intervals required (not just point estimates)
3. Explicit reasoning chain visible to user
4. Acknowledge uncertainty and data gaps
5. Never hallucinate case names - use provided precedents only

OUTPUT FORMAT: Valid JSON with Glass Box structure
"""

def build_glass_box_prediction_prompt(
    case_text: str,
    case_type: str,
    jurisdiction: str,
    judge_name: Optional[str] = None,
    judge_stats: Optional[Dict] = None,
    similar_cases: Optional[List[Dict]] = None,
    jurisdiction_stats: Optional[Dict] = None
) -> str:
    """
    Build enhanced Glass Box prediction prompt with full transparency
    """
    
    # Build precedent context
    precedent_context = ""
    if similar_cases and len(similar_cases) > 0:
        precedent_context = "\n\nRELEVANT PRECEDENTS (Use these for citations):\n"
        for i, case in enumerate(similar_cases[:5], 1):
            precedent_context += f"""
{i}. {case.get('case_name', 'Unknown v. Unknown')} ({case.get('year', 'N/A')})
   - Court: {case.get('court', 'Unknown')}
   - Outcome: {case.get('outcome', 'Unknown')}
   - Similarity Score: {case.get('similarity', 0):.2f}
   - Key Facts: {case.get('summary', 'N/A')[:200]}
"""
    
    # Build judge context
    judge_context = ""
    if judge_name and judge_stats:
        judge_context = f"""
\nJUDGE PROFILE: {judge_name}
- Win Rate (Plaintiff): {judge_stats.get('plaintiff_win_rate', 0.5)*100:.1f}%
- Reversal Rate: {judge_stats.get('reversal_rate', 0)*100:.1f}%
- Avg Damages Awarded: ${judge_stats.get('avg_damages', 0):,.0f}
- Case Volume: {judge_stats.get('case_count', 0)} cases
- Tendencies: {judge_stats.get('tendencies', 'Standard')}
"""
    
    # Build jurisdiction context
    jurisdiction_context = ""
    if jurisdiction_stats:
        jurisdiction_context = f"""
\nJURISDICTION STATISTICS ({jurisdiction}):
- Historical Win Rate: {jurisdiction_stats.get('win_rate', 0.5)*100:.1f}%
- Median Resolution Time: {jurisdiction_stats.get('median_months', 18)} months
- Settlement Rate: {jurisdiction_stats.get('settlement_rate', 0.6)*100:.1f}%
- Median Damages: ${jurisdiction_stats.get('median_damages', 0):,.0f}
"""

    prompt = f"""{GLASS_BOX_PREDICTION_SYSTEM}

GLASS BOX ANALYSIS FRAMEWORK:

STEP 1: PRECEDENT ANALYSIS
- Identify the 3 most relevant precedents from the provided list
- For each, explain WHY it's relevant (fact pattern, legal issues)
- Calculate weighted outcome distribution

STEP 2: JUDGE FACTOR (if available)
- How does this judge's history affect the prediction?
- Cite specific statistics

STEP 3: JURISDICTION BASELINE
- What is the base rate for this case type in this jurisdiction?
- How does this case deviate from typical?

STEP 4: CASE STRENGTH ASSESSMENT
- Key strengths (with evidence)
- Key weaknesses (with evidence)
- Net adjustment to baseline

STEP 5: CONFIDENCE CALIBRATION
- Point estimate with 90% confidence interval
- Identify sources of uncertainty

CASE DETAILS:
- Type: {case_type}
- Jurisdiction: {jurisdiction}{judge_context}{jurisdiction_context}{precedent_context}

CASE FACTS:
{case_text[:4000]}

OUTPUT (Valid JSON with Glass Box format):
{{
  "prediction": {{
    "outcome_probabilities": {{
      "plaintiff_victory": 0.XX,
      "settlement": 0.XX,
      "defendant_victory": 0.XX
    }},
    "confidence_interval": {{
      "low": 0.XX,
      "high": 0.XX
    }},
    "confidence_score": 0.XX
  }},
  "glass_box": {{
    "precedent_analysis": [
      {{
        "case_name": "...",
        "relevance": "...",
        "outcome_impact": "..."
      }}
    ],
    "judge_factor": {{
      "adjustment": 0.XX,
      "reasoning": "..."
    }},
    "jurisdiction_baseline": {{
      "base_rate": 0.XX,
      "deviation_factors": ["..."]
    }},
    "strength_assessment": {{
      "strengths": ["..."],
      "weaknesses": ["..."],
      "net_adjustment": 0.XX
    }},
    "uncertainty_sources": ["..."]
  }},
  "estimated_damages": {{
    "range_low": XXXXX,
    "range_high": XXXXX,
    "expected": XXXXX
  }},
  "timeline_months": XX,
  "key_recommendation": "..."
}}
"""
    return prompt


# ========================================
# ENHANCED SETTLEMENT NEGOTIATION PROMPTS
# ========================================

SETTLEMENT_SYSTEM_PROMPT = """You are a strategic legal negotiation expert specializing in settlement optimization using game theory.

YOUR MISSION: Calculate optimal settlement ranges with FULL TRANSPARENCY on how values are derived.

REQUIREMENTS:
1. Show mathematical derivation of settlement zone
2. Model both parties' BATNA (Best Alternative to Negotiated Agreement)
3. Calculate ZOPA (Zone of Possible Agreement)
4. Provide negotiation tactics based on game theory
5. Cite precedent settlements for similar cases
"""

def build_settlement_prompt(
    case_facts: str,
    plaintiff_demand: float,
    defendant_offer: float,
    win_probability: float,
    expected_judgment: float,
    trial_costs_plaintiff: float,
    trial_costs_defendant: float,
    similar_settlements: Optional[List[Dict]] = None
) -> str:
    """
    Build enhanced settlement analysis prompt with game theory
    """
    
    # Calculate basic values
    plaintiff_ev = (win_probability * expected_judgment) - trial_costs_plaintiff
    defendant_ev = (win_probability * expected_judgment) + trial_costs_defendant
    
    settlements_context = ""
    if similar_settlements:
        settlements_context = "\n\nSIMILAR CASE SETTLEMENTS:\n"
        for i, s in enumerate(similar_settlements[:5], 1):
            settlements_context += f"{i}. {s.get('case_type', 'Unknown')}: ${s.get('amount', 0):,.0f} ({s.get('year', 'N/A')})\n"
    
    prompt = f"""SETTLEMENT NEGOTIATION ANALYSIS

CURRENT POSITIONS:
- Plaintiff Demand: ${plaintiff_demand:,.0f}
- Defendant Offer: ${defendant_offer:,.0f}
- Gap: ${plaintiff_demand - defendant_offer:,.0f}

CASE PARAMETERS:
- Win Probability (Plaintiff): {win_probability*100:.1f}%
- Expected Judgment if Win: ${expected_judgment:,.0f}
- Plaintiff Trial Costs: ${trial_costs_plaintiff:,.0f}
- Defendant Trial Costs: ${trial_costs_defendant:,.0f}

PRE-CALCULATED VALUES:
- Plaintiff Expected Value (Trial): ${plaintiff_ev:,.0f}
- Defendant Expected Cost (Trial): ${defendant_ev:,.0f}
{settlements_context}

CASE FACTS:
{case_facts[:2000]}

ANALYSIS FRAMEWORK:
1. BATNA ANALYSIS
   - Plaintiff's BATNA = Expected Trial Value = ${plaintiff_ev:,.0f}
   - Defendant's BATNA = Expected Trial Cost = ${defendant_ev:,.0f}

2. ZOPA CALCULATION
   - If Plaintiff BATNA < Defendant BATNA, ZOPA exists
   - ZOPA Range: [Plaintiff BATNA, Defendant BATNA]

3. NASH BARGAINING SOLUTION
   - Optimal settlement = midpoint of ZOPA (equal bargaining power)
   - Adjust for relative bargaining power

4. TACTICAL RECOMMENDATIONS
   - First-mover advantage considerations
   - Anchoring strategies
   - Information asymmetry exploitation

OUTPUT (Valid JSON):
{{
  "settlement_analysis": {{
    "zopa_exists": true/false,
    "zopa_range": {{"low": XXXXX, "high": XXXXX}},
    "nash_solution": XXXXX,
    "recommended_target": XXXXX
  }},
  "glass_box": {{
    "plaintiff_batna": {{
      "value": XXXXX,
      "calculation": "..."
    }},
    "defendant_batna": {{
      "value": XXXXX,
      "calculation": "..."
    }},
    "adjustment_factors": ["..."]
  }},
  "negotiation_tactics": {{
    "for_plaintiff": ["..."],
    "for_defendant": ["..."]
  }},
  "risk_analysis": {{
    "walk_away_scenarios": ["..."],
    "deal_breakers": ["..."]
  }},
  "confidence": 0.XX
}}
"""
    return prompt


# ========================================
# ENHANCED NASH EQUILIBRIUM PROMPTS
# ========================================

NASH_SYSTEM_V2 = """You are a game theory expert specializing in legal strategy modeling.

YOUR MISSION: Model litigation as a strategic game with TRANSPARENT payoff derivation.

REQUIREMENTS:
1. Construct payoff matrix with explicit value calculations
2. Identify all Nash equilibria (pure and mixed)
3. Explain strategic implications in plain language
4. Consider information asymmetries
5. Provide actionable recommendations
"""

def build_enhanced_nash_prompt(
    case_description: str,
    plaintiff_options: List[str],
    defendant_options: List[str],
    win_probability: float,
    stakes: float,
    costs: Dict[str, float]
) -> str:
    """
    Build enhanced Nash equilibrium prompt with full payoff derivation
    """
    
    prompt = f"""GAME THEORY ANALYSIS - LEGAL STRATEGY

SCENARIO:
{case_description}

PLAYERS AND OPTIONS:
- Plaintiff Options: {', '.join(plaintiff_options)}
- Defendant Options: {', '.join(defendant_options)}

PARAMETERS:
- Win Probability (Plaintiff): {win_probability*100:.1f}%
- Stakes (Expected Judgment): ${stakes:,.0f}
- Plaintiff Litigation Costs: ${costs.get('plaintiff', 50000):,.0f}
- Defendant Litigation Costs: ${costs.get('defendant', 50000):,.0f}
- Settlement Transaction Costs: ${costs.get('settlement', 10000):,.0f}

ANALYSIS FRAMEWORK:

STEP 1: PAYOFF MATRIX CONSTRUCTION
For each strategy combination (P_i, D_j), calculate:
- Plaintiff Payoff = f(outcome probability, stakes, costs)
- Defendant Payoff = f(outcome probability, stakes, costs)

Show your work for each cell.

STEP 2: DOMINANT STRATEGY ANALYSIS
- Check if any player has a dominant strategy
- Identify dominated strategies to eliminate

STEP 3: NASH EQUILIBRIUM IDENTIFICATION
- Find pure strategy Nash equilibria (if any)
- Calculate mixed strategy equilibrium

STEP 4: STRATEGIC INSIGHTS
- What does the equilibrium tell us about optimal play?
- How do information asymmetries affect strategy?
- Commitment strategies and credibility

OUTPUT (Valid JSON):
{{
  "payoff_matrix": {{
    "strategies_p1": ["..."],
    "strategies_p2": ["..."],
    "payoffs_p1": [[...], [...]],
    "payoffs_p2": [[...], [...]]
  }},
  "derivation": {{
    "cell_calculations": [
      {{"p1_strategy": "...", "p2_strategy": "...", "p1_payoff": X, "p2_payoff": X, "reasoning": "..."}}
    ]
  }},
  "nash_equilibria": {{
    "pure": [{{"p1": "...", "p2": "...", "payoffs": [X, X]}}],
    "mixed": {{
      "p1_probabilities": [...],
      "p2_probabilities": [...],
      "expected_payoffs": [X, X]
    }}
  }},
  "dominant_strategies": {{
    "p1": "..." or null,
    "p2": "..." or null
  }},
  "strategic_insights": {{
    "optimal_play": "...",
    "commitment_opportunities": ["..."],
    "information_value": "..."
  }},
  "recommendation": "...",
  "confidence": 0.XX
}}
"""
    return prompt


# ========================================
# NEW: DOCUMENT RISK ANALYSIS PROMPT
# ========================================

DOCUMENT_ANALYSIS_SYSTEM = """You are a legal document analyst specializing in contract risk assessment and clause analysis.

YOUR MISSION: Analyze legal documents for risks, obligations, and strategic implications with FULL TRANSPARENCY.

REQUIREMENTS:
1. Identify all material clauses
2. Flag high-risk provisions with severity scores
3. Compare against standard market terms
4. Provide negotiation leverage points
5. Cite specific clause locations
"""

def build_document_analysis_prompt(
    document_text: str,
    document_type: str,
    party_role: str,  # 'buyer', 'seller', 'licensee', etc.
    jurisdiction: str
) -> str:
    """
    Build document risk analysis prompt
    """
    
    prompt = f"""LEGAL DOCUMENT ANALYSIS

DOCUMENT TYPE: {document_type}
YOUR CLIENT'S ROLE: {party_role}
GOVERNING LAW: {jurisdiction}

DOCUMENT TEXT:
{document_text[:6000]}

ANALYSIS FRAMEWORK:

1. KEY TERMS EXTRACTION
   - Identify all material obligations
   - Note financial terms and caps
   - Flag unusual or non-standard provisions

2. RISK ASSESSMENT (Score 1-10)
   - Liability exposure
   - Indemnification scope
   - Termination triggers
   - IP ownership/licensing risks
   - Confidentiality concerns

3. LEVERAGE ANALYSIS
   - Which clauses favor your client?
   - Which clauses need negotiation?
   - Industry-standard comparisons

4. RECOMMENDATIONS
   - Must-change items
   - Nice-to-have changes
   - Acceptable as-is items

OUTPUT (Valid JSON):
{{
  "document_summary": {{
    "type": "...",
    "parties": ["..."],
    "effective_date": "...",
    "term": "..."
  }},
  "key_terms": [
    {{
      "clause": "...",
      "location": "Section X.X",
      "summary": "...",
      "standard_market": true/false
    }}
  ],
  "risk_assessment": {{
    "overall_score": X,
    "high_risk_items": [
      {{
        "clause": "...",
        "risk_type": "...",
        "severity": X,
        "mitigation": "..."
      }}
    ]
  }},
  "negotiation_points": {{
    "must_change": ["..."],
    "should_change": ["..."],
    "acceptable": ["..."]
  }},
  "client_leverage": {{
    "strong_points": ["..."],
    "weak_points": ["..."]
  }},
  "recommendation": "..."
}}
"""
    return prompt


# ========================================
# PROMPT REGISTRY V2
# ========================================

PROMPT_REGISTRY_V2 = {
    "glass_box_prediction": {
        "system": GLASS_BOX_PREDICTION_SYSTEM,
        "builder": build_glass_box_prediction_prompt,
        "temperature": 0.1,
        "max_tokens": 1200,
        "version": "2.0"
    },
    "settlement_analysis": {
        "system": SETTLEMENT_SYSTEM_PROMPT,
        "builder": build_settlement_prompt,
        "temperature": 0.1,
        "max_tokens": 800,
        "version": "2.0"
    },
    "nash_equilibrium_v2": {
        "system": NASH_SYSTEM_V2,
        "builder": build_enhanced_nash_prompt,
        "temperature": 0.1,
        "max_tokens": 1000,
        "version": "2.0"
    },
    "document_analysis": {
        "system": DOCUMENT_ANALYSIS_SYSTEM,
        "builder": build_document_analysis_prompt,
        "temperature": 0.2,
        "max_tokens": 1500,
        "version": "2.0"
    }
}


def get_enhanced_prompt(prompt_type: str, **kwargs) -> Dict:
    """
    Get enhanced prompt configuration for specific type
    """
    if prompt_type not in PROMPT_REGISTRY_V2:
        # Fall back to v1 prompts
        from enhanced_prompts import PROMPT_REGISTRY, get_prompt
        return get_prompt(prompt_type, **kwargs)
    
    config = PROMPT_REGISTRY_V2[prompt_type]
    
    return {
        "system_prompt": config["system"],
        "user_prompt": config["builder"](**kwargs),
        "temperature": config["temperature"],
        "max_tokens": config["max_tokens"],
        "version": config["version"]
    }
