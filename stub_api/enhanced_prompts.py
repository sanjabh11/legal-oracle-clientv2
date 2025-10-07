"""
Enhanced LLM Prompts for Legal Oracle
Implements chain-of-thought, few-shot examples, and structured reasoning

Author: Legal Oracle Team
Date: 2025-10-07
"""

from typing import Dict, List, Optional


# ========================================
# CASE OUTCOME PREDICTION PROMPTS
# ========================================

CASE_PREDICTION_SYSTEM_PROMPT = """You are a senior legal AI assistant with 20+ years of litigation experience.

Your task is to predict case outcomes using systematic legal analysis.

ANALYSIS FRAMEWORK:
1. Jurisdictional Precedent Analysis
2. Judge Behavioral Patterns
3. Case Strength Assessment
4. Procedural Posture Evaluation
5. Settlement Likelihood Calculation

OUTPUT FORMAT: Valid JSON only
"""

def build_case_prediction_prompt(
    case_text: str,
    case_type: str,
    jurisdiction: str,
    judge_name: Optional[str] = None,
    similar_cases: Optional[List[Dict]] = None
) -> str:
    """
    Build enhanced case prediction prompt with chain-of-thought reasoning
    """
    
    # Few-shot examples
    few_shot_examples = """
EXAMPLE 1:
Case: Contract Dispute - Tech Company vs Supplier
Jurisdiction: California
Judge: Hon. Maria Rodriguez (Reversal Rate: 12%, Avg Damages: $450k)

REASONING:
Step 1: Precedents - California follows strict contract interpretation (Cal. Code). 3 binding precedents favor written contracts.
Step 2: Judge Tendency - Hon. Rodriguez has 75% plaintiff win rate in contract disputes. Prefers clear evidence.
Step 3: Case Strength - Written contract present, clear breach documented. Strong plaintiff position.
Step 4: Statistical Baseline - 125 similar cases: 68% plaintiff victory, 20% settlement, 12% defendant victory
Step 5: Adjustments - Clear documentation +10% plaintiff, experienced judge +5% predictability

PREDICTION:
{
  "outcome_probabilities": {"plaintiff_victory": 0.75, "settlement": 0.15, "defendant_victory": 0.10},
  "confidence": 0.85,
  "reasoning": {
    "precedent_analysis": "California contract law strongly favors written agreements with clear terms",
    "judge_factor": "Hon. Rodriguez has consistent pro-plaintiff record in contract disputes",
    "key_strengths": ["Written contract", "Clear breach", "Documentation"],
    "key_weaknesses": ["Minor procedural issues"]
  },
  "estimated_damages": {"range": [300000, 600000], "expected": 450000},
  "timeline_months": 18
}

EXAMPLE 2:
Case: Personal Injury - Slip and Fall
Jurisdiction: Texas
Judge: Hon. James Carter (Reversal Rate: 22%, Avg Damages: $180k)

REASONING:
Step 1: Precedents - Texas has comparative negligence standard. Mixed precedents.
Step 2: Judge Tendency - Hon. Carter shows 45% defense win rate in premises liability.
Step 3: Case Strength - Liability unclear, contributory negligence likely.
Step 4: Statistical Baseline - 87 similar cases: 35% plaintiff, 40% settlement, 25% defense
Step 5: Adjustments - Unclear liability -15% plaintiff, experienced defense counsel -10%

PREDICTION:
{
  "outcome_probabilities": {"plaintiff_victory": 0.25, "settlement": 0.55, "defendant_victory": 0.20},
  "confidence": 0.72,
  "reasoning": {
    "precedent_analysis": "Texas comparative negligence creates settlement pressure",
    "judge_factor": "Hon. Carter leans defense but encourages settlement",
    "key_strengths": ["Injury documented"],
    "key_weaknesses": ["Contributory negligence", "Weak liability proof"]
  },
  "estimated_damages": {"range": [80000, 250000], "expected": 165000},
  "timeline_months": 14
}
"""
    
    # Build similar cases summary
    similar_cases_summary = ""
    if similar_cases and len(similar_cases) > 0:
        similar_cases_summary = f"\n\nSIMILAR CASES ({len(similar_cases)} found):\n"
        for i, case in enumerate(similar_cases[:3], 1):
            similar_cases_summary += f"{i}. {case.get('case_type', 'Unknown')} - Outcome: {case.get('outcome', 'Unknown')}\n"
    
    # Build judge info
    judge_info = ""
    if judge_name:
        judge_info = f"\nJudge: {judge_name}"
    
    prompt = f"""{few_shot_examples}

NOW ANALYZE THIS CASE:

CONTEXT:
- Case Type: {case_type}
- Jurisdiction: {jurisdiction}{judge_info}{similar_cases_summary}

CASE FACTS:
{case_text[:3000]}

ANALYSIS FRAMEWORK - Think step by step:
Step 1: Identify controlling precedents in {jurisdiction}
Step 2: Evaluate factual alignment with favorable precedents
Step 3: Assess judge's historical patterns (if known)
Step 4: Calculate statistical baseline from similar cases
Step 5: Adjust for case-specific factors

OUTPUT (Valid JSON only):
"""
    
    return prompt


# ========================================
# STRATEGY OPTIMIZATION PROMPTS
# ========================================

STRATEGY_SYSTEM_PROMPT = """You are a strategic legal consultant specializing in litigation strategy optimization using game theory and data analysis.

Your task is to evaluate legal strategies against alternatives using:
- Expected value analysis
- Game theoretic modeling  
- Risk assessment
- Cost-benefit analysis

OUTPUT FORMAT: Valid JSON only
"""

def build_strategy_prompt(
    case_text: str,
    case_type: str,
    jurisdiction: str,
    proposed_strategy: str,
    damages_amount: Optional[int] = None
) -> str:
    """
    Build enhanced strategy evaluation prompt
    """
    
    damages_info = f"${damages_amount:,}" if damages_amount else "$500,000 (estimated)"
    
    few_shot_example = """
EXAMPLE:
Case: Patent Infringement
Jurisdiction: Federal (Eastern District of Texas)
Stakes: $2,500,000
Proposed Strategy: Aggressive Litigation

EVALUATION:
1. Expected Value = (Win Prob × Damages) - (Costs + Risk Premium)
   = (0.65 × $2,500,000) - ($450,000 + $150,000)
   = $1,625,000 - $600,000 = $1,025,000

2. Risk Profile:
   - Best case: $2.5M award (25% probability)
   - Worst case: $600k costs (15% probability)  
   - Most likely: $1.2M settlement (60% probability)

3. Time-to-Resolution: 22 months (aggressive path)

4. Alternative Strategies Comparison:
   - Early Settlement: EV = $800k, Time = 4 months
   - Mediation: EV = $950k, Time = 8 months
   - Summary Judgment: EV = $1.1M, Time = 12 months

5. Game Theory: Opponent likely to counter-sue. Nash equilibrium suggests mediation.

RECOMMENDATION:
{
  "strategy_score": 0.75,
  "expected_value": 1025000,
  "risk_assessment": {
    "best_case": {"outcome": "$2.5M award", "probability": 0.25},
    "worst_case": {"outcome": "$600k costs only", "probability": 0.15},
    "most_likely": {"outcome": "$1.2M settlement", "probability": 0.60}
  },
  "costs": {"legal_fees": 450000, "total_costs": 600000, "roi": 1.71},
  "timeline": {"best_case_months": 18, "likely_months": 22, "worst_case_months": 30},
  "recommendations": {
    "primary": "Pursue aggressive litigation but maintain settlement optionality",
    "rationale": "High EV justifies costs, but monitor for settlement signals",
    "alternatives": ["Mediation as backup", "Summary judgment motion"],
    "risk_mitigation": ["Cap discovery costs", "Insurance coverage"]
  },
  "game_theory_insight": "Opponent has weaker patent portfolio, settlement pressure after Markman hearing",
  "confidence": 0.82
}
"""
    
    prompt = f"""{few_shot_example}

NOW EVALUATE THIS STRATEGY:

CASE CONTEXT:
- Dispute: {case_type}
- Jurisdiction: {jurisdiction}
- Stakes: {damages_info}

PROPOSED STRATEGY:
{proposed_strategy}

CASE FACTS:
{case_text[:2000]}

EVALUATION FRAMEWORK - Analyze systematically:
1. Expected Value: Calculate (Win Prob × Damages) - (Costs + Risk)
2. Risk Profile: Model best/worst/likely scenarios with probabilities
3. Time-to-Resolution: Estimate timeline for each outcome
4. Cost Analysis: Legal fees, expert fees, opportunity costs
5. Alternative Strategies: Compare against settlement, mediation, summary judgment
6. Game Theory: Model opponent's responses and Nash equilibrium
7. Recommendation: Data-driven optimal strategy

OUTPUT (Valid JSON only):
"""
    
    return prompt


# ========================================
# NASH EQUILIBRIUM PROMPTS
# ========================================

NASH_SYSTEM_PROMPT = """You are a game theory expert specializing in legal strategy modeling.

Your task is to model litigation as a strategic game and identify Nash equilibria.

OUTPUT FORMAT: Valid JSON with payoff matrices and equilibrium analysis
"""

def build_nash_prompt(
    case_description: str,
    plaintiff_options: List[str],
    defendant_options: List[str]
) -> str:
    """
    Build Nash equilibrium analysis prompt
    """
    
    prompt = f"""MODEL THIS LEGAL SCENARIO AS A GAME:

CASE: {case_description}

PLAINTIFF OPTIONS: {', '.join(plaintiff_options)}
DEFENDANT OPTIONS: {', '.join(defendant_options)}

GAME THEORY ANALYSIS:
1. Construct payoff matrix for all strategy combinations
2. Identify dominated strategies (if any)
3. Find pure strategy Nash equilibria
4. Calculate mixed strategy equilibria if needed
5. Assess credible commitment strategies
6. Recommend optimal play

Consider:
- Litigation costs vs settlement savings
- Information asymmetries
- Reputation effects
- Future relationship value

OUTPUT (Valid JSON):
{{
  "payoff_matrix": {{}},
  "nash_equilibria": [],
  "dominant_strategies": {{}},
  "recommendation": "",
  "confidence": 0.0
}}
"""
    
    return prompt


# ========================================
# HELPER FUNCTIONS
# ========================================

def build_few_shot_examples(
    example_cases: List[Dict],
    max_examples: int = 3
) -> str:
    """
    Build few-shot examples from similar cases
    """
    examples = []
    
    for i, case in enumerate(example_cases[:max_examples], 1):
        example = f"""
EXAMPLE {i}:
Case: {case.get('case_type', 'Unknown')}
Outcome: {case.get('outcome', 'Unknown')}
Reasoning: {case.get('reasoning', 'Based on precedent and facts')}
"""
        examples.append(example)
    
    return "\n".join(examples)


def extract_json_from_response(response_text: str) -> Optional[Dict]:
    """
    Extract JSON from LLM response (handles markdown code blocks)
    """
    import json
    import re
    
    # Try direct JSON parse first
    try:
        return json.loads(response_text)
    except:
        pass
    
    # Try to find JSON in markdown code block
    json_pattern = r"```(?:json)?\s*(\{.*?\})\s*```"
    match = re.search(json_pattern, response_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except:
            pass
    
    # Try to find raw JSON
    json_pattern = r"\{.*\}"
    match = re.search(json_pattern, response_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except:
            pass
    
    return None


# ========================================
# PROMPT TEMPLATES REGISTRY
# ========================================

PROMPT_REGISTRY = {
    "case_prediction": {
        "system": CASE_PREDICTION_SYSTEM_PROMPT,
        "builder": build_case_prediction_prompt,
        "temperature": 0.0,  # Deterministic
        "max_tokens": 500
    },
    "strategy_optimization": {
        "system": STRATEGY_SYSTEM_PROMPT,
        "builder": build_strategy_prompt,
        "temperature": 0.2,  # Slightly creative
        "max_tokens": 600
    },
    "nash_equilibrium": {
        "system": NASH_SYSTEM_PROMPT,
        "builder": build_nash_prompt,
        "temperature": 0.1,
        "max_tokens": 400
    }
}


def get_prompt(prompt_type: str, **kwargs) -> Dict:
    """
    Get prompt configuration for specific type
    
    Args:
        prompt_type: Type of prompt (case_prediction, strategy_optimization, etc.)
        **kwargs: Parameters for prompt builder
    
    Returns:
        Dict with system_prompt, user_prompt, temperature, max_tokens
    """
    if prompt_type not in PROMPT_REGISTRY:
        raise ValueError(f"Unknown prompt type: {prompt_type}")
    
    config = PROMPT_REGISTRY[prompt_type]
    
    return {
        "system_prompt": config["system"],
        "user_prompt": config["builder"](**kwargs),
        "temperature": config["temperature"],
        "max_tokens": config["max_tokens"]
    }
