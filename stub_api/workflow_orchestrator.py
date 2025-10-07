"""
Multi-Agent Workflow Orchestrator for Legal Oracle
Chains multiple analysis steps into one comprehensive workflow
"""

import os
import json
from typing import Dict, List, Optional
from datetime import datetime
import re
from dotenv import load_dotenv
from supabase import create_client
import time

load_dotenv()

# Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("[WARN] Supabase credentials not found")
    supabase = None
else:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


class CaseWorkflowOrchestrator:
    """
    Orchestrates end-to-end case analysis workflow
    
    Workflow Steps:
    1. Fact Extraction - Extract key entities and legal concepts
    2. Precedent Retrieval - Find similar cases and relevant precedents
    3. Risk Assessment - Calculate win probability and risk factors
    4. Strategy Optimization - Recommend optimal legal strategies
    5. Report Synthesis - Generate comprehensive analysis report
    """
    
    def __init__(self):
        self.workflow_steps = []
        self.start_time = None
    
    async def run_full_analysis(
        self,
        case_text: str,
        case_type: str,
        jurisdiction: str,
        damages_amount: Optional[float] = None
    ) -> Dict:
        """
        Execute complete multi-agent workflow
        
        Args:
            case_text: Full case description
            case_type: Type of case (contract_dispute, tort, etc.)
            jurisdiction: Legal jurisdiction
            damages_amount: Claimed damages if applicable
            
        Returns:
            Comprehensive report with all analysis components
        """
        self.start_time = time.time()
        
        report = {
            "workflow_id": f"WF-{int(time.time())}",
            "input": {
                "case_type": case_type,
                "jurisdiction": jurisdiction,
                "damages_amount": damages_amount,
                "text_length": len(case_text)
            },
            "steps": [],
            "final_report": {},
            "metadata": {
                "started_at": datetime.now().isoformat(),
                "version": "1.0"
            }
        }
        
        try:
            # STEP 1: Fact Extraction
            print(f"[WORKFLOW] Step 1/5: Extracting key facts...")
            facts = await self._extract_facts(case_text, case_type)
            report["steps"].append({
                "step": 1,
                "name": "fact_extraction",
                "status": "complete",
                "duration_seconds": round(time.time() - self.start_time, 2),
                "output_summary": f"Extracted {len(facts.get('key_terms', []))} key terms, {len(facts.get('parties', []))} parties"
            })
            
            # STEP 2: Precedent Retrieval
            print(f"[WORKFLOW] Step 2/5: Finding similar precedents...")
            precedents = await self._retrieve_precedents(case_text, jurisdiction, case_type)
            report["steps"].append({
                "step": 2,
                "name": "precedent_retrieval",
                "status": "complete",
                "duration_seconds": round(time.time() - self.start_time, 2),
                "output_summary": f"Found {len(precedents)} similar precedents"
            })
            
            # STEP 3: Risk Assessment
            print(f"[WORKFLOW] Step 3/5: Assessing risks...")
            risk_analysis = await self._assess_risk(precedents, jurisdiction, case_type, damages_amount)
            report["steps"].append({
                "step": 3,
                "name": "risk_assessment",
                "status": "complete",
                "duration_seconds": round(time.time() - self.start_time, 2),
                "output_summary": f"Risk level: {risk_analysis.get('risk_level', 'unknown')}, Success probability: {risk_analysis.get('success_probability', 0):.1%}"
            })
            
            # STEP 4: Strategy Optimization
            print(f"[WORKFLOW] Step 4/5: Optimizing legal strategy...")
            strategy = await self._optimize_strategy(
                case_text, facts, precedents, risk_analysis, damages_amount, case_type
            )
            report["steps"].append({
                "step": 4,
                "name": "strategy_optimization",
                "status": "complete",
                "duration_seconds": round(time.time() - self.start_time, 2),
                "output_summary": f"Recommended: {strategy.get('recommended_strategy', 'N/A')}"
            })
            
            # STEP 5: Report Synthesis
            print(f"[WORKFLOW] Step 5/5: Generating comprehensive report...")
            final_report = await self._synthesize_report(
                facts, precedents, risk_analysis, strategy, case_text, case_type, jurisdiction
            )
            report["final_report"] = final_report
            report["status"] = "complete"
            report["metadata"]["completed_at"] = datetime.now().isoformat()
            report["metadata"]["total_duration_seconds"] = round(time.time() - self.start_time, 2)
            
            print(f"[WORKFLOW] ✅ Complete! Duration: {report['metadata']['total_duration_seconds']}s")
            
            return report
            
        except Exception as e:
            print(f"[WORKFLOW] ❌ Error: {str(e)}")
            report["status"] = "error"
            report["error"] = str(e)
            report["metadata"]["failed_at"] = datetime.now().isoformat()
            return report
    
    async def _extract_facts(self, case_text: str, case_type: str) -> Dict:
        """
        Extract key entities and facts from case text
        Uses simple NLP heuristics (can be enhanced with spaCy later)
        """
        # Extract monetary amounts
        amounts = re.findall(r'\$[\d,]+(?:\.\d{2})?', case_text)
        
        # Extract dates
        dates = re.findall(r'\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}', case_text, re.IGNORECASE)
        
        # Extract parties (simple heuristic for "X v. Y")
        parties = []
        if " v. " in case_text or " vs " in case_text or " vs. " in case_text:
            split_text = re.split(r' v\.? | vs\.? ', case_text, maxsplit=1)
            if len(split_text) >= 2:
                # Get last 3 words before "v." and first 3 words after
                before = split_text[0].strip().split()[-3:]
                after = split_text[1].strip().split()[:3]
                parties = [' '.join(before), ' '.join(after)]
        
        # Extract legal terms
        legal_terms = self._extract_legal_terms(case_text)
        
        # Estimate case complexity
        complexity_score = (
            len(case_text) / 1000 +  # Length factor
            len(legal_terms) * 0.5 +  # Legal term factor
            len(parties) * 2  # Party factor
        )
        
        if complexity_score > 10:
            complexity = "high"
        elif complexity_score > 5:
            complexity = "medium"
        else:
            complexity = "low"
        
        return {
            "monetary_amounts": amounts[:10],  # Limit to 10
            "dates": dates[:10],
            "parties": parties,
            "key_terms": legal_terms,
            "text_length": len(case_text),
            "word_count": len(case_text.split()),
            "complexity": complexity,
            "complexity_score": round(complexity_score, 2),
            "case_type": case_type
        }
    
    def _extract_legal_terms(self, text: str) -> List[str]:
        """Extract legal terminology from text"""
        legal_terms_dict = {
            "contract": ["breach", "contract", "agreement", "covenant", "consideration", "obligation"],
            "tort": ["negligence", "duty of care", "causation", "damages", "liability", "injury"],
            "property": ["title", "deed", "easement", "lien", "foreclosure", "eviction"],
            "corporate": ["shareholder", "fiduciary", "merger", "acquisition", "securities"],
            "constitutional": ["due process", "equal protection", "first amendment", "fundamental right"],
            "criminal": ["prosecution", "defense", "evidence", "plea", "sentence"],
            "civil_procedure": ["jurisdiction", "venue", "discovery", "motion", "summary judgment", "appeal"],
        }
        
        text_lower = text.lower()
        found_terms = []
        
        for category, terms in legal_terms_dict.items():
            for term in terms:
                if term in text_lower:
                    found_terms.append(term)
        
        return list(set(found_terms))[:15]  # Return unique terms, max 15
    
    async def _retrieve_precedents(self, case_text: str, jurisdiction: str, case_type: str) -> List[Dict]:
        """
        Find similar precedents using database queries
        Simplified version - can enhance with vector search
        """
        if not supabase:
            return []
        
        try:
            # Query similar cases by jurisdiction and case type
            query = supabase.table("legal_cases") \
                .select("case_id, case_name, outcome_label, damages_amount, court, decision_date, summary") \
                .eq("jurisdiction", jurisdiction) \
                .limit(10)
            
            if case_type:
                query = query.eq("case_type", case_type)
            
            result = query.execute()
            
            cases = result.data if result.data else []
            
            # Enrich with relevance score (simple heuristic)
            enriched = []
            for case in cases:
                relevance_score = 0.5  # Base relevance
                
                # Boost if same case type
                if case.get("case_type") == case_type:
                    relevance_score += 0.2
                
                # Boost if recent case
                if case.get("decision_date"):
                    try:
                        decision_year = int(case["decision_date"][:4])
                        current_year = datetime.now().year
                        age = current_year - decision_year
                        if age < 5:
                            relevance_score += 0.2
                        elif age < 10:
                            relevance_score += 0.1
                    except:
                        pass
                
                enriched.append({
                    **case,
                    "relevance_score": min(relevance_score, 1.0)
                })
            
            # Sort by relevance
            enriched.sort(key=lambda x: x["relevance_score"], reverse=True)
            
            return enriched[:5]  # Return top 5
            
        except Exception as e:
            print(f"[ERROR] Precedent retrieval failed: {str(e)}")
            return []
    
    async def _assess_risk(
        self,
        precedents: List[Dict],
        jurisdiction: str,
        case_type: str,
        damages_amount: Optional[float]
    ) -> Dict:
        """
        Calculate risk scores based on precedents and case factors
        """
        if not precedents:
            return {
                "risk_level": "unknown",
                "success_probability": 0.5,
                "confidence": 0.3,
                "recommendation": "Insufficient precedent data for accurate risk assessment"
            }
        
        # Calculate success rate from precedents
        favorable_outcomes = 0
        total_with_outcome = 0
        
        for p in precedents:
            outcome = p.get("outcome_label", "").lower()
            if outcome:
                total_with_outcome += 1
                if "plaintiff" in outcome or "granted" in outcome or "favor" in outcome:
                    favorable_outcomes += 1
        
        success_rate = favorable_outcomes / total_with_outcome if total_with_outcome > 0 else 0.5
        
        # Adjust for damages amount if available
        damages_factor = 1.0
        if damages_amount:
            avg_precedent_damages = sum(p.get("damages_amount", 0) for p in precedents if p.get("damages_amount")) / max(len(precedents), 1)
            if avg_precedent_damages > 0:
                damages_ratio = damages_amount / avg_precedent_damages
                if damages_ratio > 2:  # Claiming much more than precedent
                    damages_factor = 0.9
                elif damages_ratio < 0.5:  # Claiming less
                    damages_factor = 1.1
        
        adjusted_success_rate = min(success_rate * damages_factor, 1.0)
        
        # Determine risk level
        if adjusted_success_rate >= 0.7:
            risk_level = "low"
            recommendation = "Strong case with good precedent support"
        elif adjusted_success_rate >= 0.4:
            risk_level = "medium"
            recommendation = "Moderate case strength, consider settlement options"
        else:
            risk_level = "high"
            recommendation = "Weak case based on precedents, strongly recommend alternative resolution"
        
        # Calculate confidence based on number of precedents
        confidence = min(0.5 + (len(precedents) * 0.1), 0.95)
        
        return {
            "risk_level": risk_level,
            "success_probability": round(adjusted_success_rate, 3),
            "precedent_count": len(precedents),
            "favorable_precedents": favorable_outcomes,
            "total_precedents_with_outcome": total_with_outcome,
            "recommendation": recommendation,
            "confidence": round(confidence, 2),
            "damages_adjustment_factor": round(damages_factor, 2)
        }
    
    async def _optimize_strategy(
        self,
        case_text: str,
        facts: Dict,
        precedents: List[Dict],
        risk_analysis: Dict,
        damages_amount: Optional[float],
        case_type: str
    ) -> Dict:
        """
        Recommend optimal legal strategies using game theory principles
        """
        success_prob = risk_analysis.get("success_probability", 0.5)
        risk_level = risk_analysis.get("risk_level", "medium")
        
        strategies = []
        
        # Strategy 1: Aggressive Litigation
        if success_prob >= 0.6:
            expected_value = (damages_amount * success_prob) if damages_amount else None
            trial_cost = damages_amount * 0.15 if damages_amount else 50000  # Assume 15% of claim or $50k
            
            strategies.append({
                "name": "Aggressive Litigation",
                "description": "Pursue full trial with maximum damages claim",
                "score": round(0.65 + (success_prob - 0.6) * 0.7, 2),
                "pros": [
                    "High precedent support" if success_prob > 0.7 else "Moderate precedent support",
                    "Strong case facts",
                    "Potential for maximum damages"
                ],
                "cons": [
                    "Higher costs (~15% of claim)",
                    "Longer timeline (12-24 months)",
                    "Risk of adverse precedent if lost"
                ],
                "expected_value": round(expected_value, 2) if expected_value else None,
                "expected_cost": round(trial_cost, 2) if trial_cost else None,
                "net_expected_value": round(expected_value - trial_cost, 2) if expected_value and trial_cost else None,
                "timeline_months": 18,
                "risk_level": "medium-high"
            })
        
        # Strategy 2: Mediation/Alternative Dispute Resolution
        mediation_success_rate = 0.70  # Industry average
        mediation_recovery_rate = 0.60  # Typically 60% of claim value
        mediation_cost = damages_amount * 0.05 if damages_amount else 15000  # 5% or $15k
        
        mediation_expected_value = (damages_amount * mediation_recovery_rate * mediation_success_rate) if damages_amount else None
        
        strategies.append({
            "name": "Mediation/ADR",
            "description": "Pursue mediated settlement before trial",
            "score": 0.75,  # Generally good option
            "pros": [
                "Faster resolution (3-6 months)",
                "Lower costs (~5% of claim)",
                "Preserves business relationships",
                "High success rate (70%+)"
            ],
            "cons": [
                "May receive less than full damages (~60% average)",
                "Requires cooperation from other party",
                "No precedent-setting value"
            ],
            "expected_value": round(mediation_expected_value, 2) if mediation_expected_value else None,
            "expected_cost": round(mediation_cost, 2) if mediation_cost else None,
            "net_expected_value": round(mediation_expected_value - mediation_cost, 2) if mediation_expected_value and mediation_cost else None,
            "timeline_months": 5,
            "risk_level": "low-medium"
        })
        
        # Strategy 3: Early Settlement
        if success_prob < 0.6 or risk_level == "high":
            settlement_rate = 0.40  # Assume 40% of claim
            settlement_cost = damages_amount * 0.02 if damages_amount else 5000  # 2% or $5k
            settlement_expected_value = (damages_amount * settlement_rate) if damages_amount else None
            
            strategies.append({
                "name": "Early Settlement",
                "description": "Negotiate quick settlement to minimize costs and risk",
                "score": 0.80 if risk_level == "high" else 0.60,
                "pros": [
                    "Minimize costs (~2% of claim)",
                    "Quick resolution (1-3 months)",
                    "Certainty of outcome",
                    "Minimal disruption"
                ],
                "cons": [
                    "Lower payout (~40% of claim)",
                    "May appear weak",
                    "Limited negotiation leverage"
                ],
                "expected_value": round(settlement_expected_value, 2) if settlement_expected_value else None,
                "expected_cost": round(settlement_cost, 2) if settlement_cost else None,
                "net_expected_value": round(settlement_expected_value - settlement_cost, 2) if settlement_expected_value and settlement_cost else None,
                "timeline_months": 2,
                "risk_level": "low"
            })
        
        # Sort strategies by score
        strategies.sort(key=lambda x: x["score"], reverse=True)
        
        # Generate rationale
        rationale = f"Based on {success_prob:.1%} success probability from {len(precedents)} similar precedents"
        if risk_level == "low":
            rationale += ", aggressive litigation recommended due to strong case."
        elif risk_level == "high":
            rationale += ", early settlement recommended to minimize risk."
        else:
            rationale += ", mediation offers best balance of risk and reward."
        
        return {
            "recommended_strategy": strategies[0]["name"],
            "all_strategies": strategies,
            "rationale": rationale,
            "decision_factors": {
                "success_probability": success_prob,
                "risk_level": risk_level,
                "precedent_strength": len(precedents),
                "case_complexity": facts.get("complexity", "unknown")
            }
        }
    
    async def _synthesize_report(
        self,
        facts: Dict,
        precedents: List[Dict],
        risk: Dict,
        strategy: Dict,
        case_text: str,
        case_type: str,
        jurisdiction: str
    ) -> Dict:
        """
        Generate comprehensive final report combining all analyses
        """
        # Executive summary
        exec_summary = {
            "case_strength": risk["risk_level"],
            "success_probability": f"{risk['success_probability']:.1%}",
            "confidence": f"{risk['confidence']:.0%}",
            "recommended_action": strategy["recommended_strategy"],
            "key_precedents": len(precedents),
            "case_complexity": facts.get("complexity", "unknown")
        }
        
        # Detailed analysis
        detailed_analysis = {
            "facts_extracted": {
                "parties": facts.get("parties", []),
                "key_terms": facts.get("key_terms", [])[:5],  # Top 5 terms
                "monetary_amounts": facts.get("monetary_amounts", [])[:5],
                "dates": facts.get("dates", [])[:5],
                "complexity": facts.get("complexity"),
                "word_count": facts.get("word_count")
            },
            "precedent_analysis": {
                "total_precedents": len(precedents),
                "favorable": risk.get("favorable_precedents", 0),
                "success_rate": f"{risk.get('success_probability', 0):.1%}",
                "top_3_cases": [
                    {
                        "name": p.get("case_name"),
                        "outcome": p.get("outcome_label"),
                        "court": p.get("court"),
                        "relevance": f"{p.get('relevance_score', 0):.0%}"
                    }
                    for p in precedents[:3]
                ]
            },
            "risk_assessment": risk,
            "strategy_comparison": strategy["all_strategies"]
        }
        
        # Recommendations
        recommendations = {
            "primary": strategy["recommended_strategy"],
            "alternative_paths": [s["name"] for s in strategy["all_strategies"][1:3]],
            "next_steps": [
                "Review detailed precedent analysis and case law",
                f"Consult with counsel specialized in {case_type.replace('_', ' ')}",
                "Prepare comprehensive evidence documentation",
                "Consider settlement optionality and timing",
                "Evaluate cost-benefit analysis of each strategy"
            ],
            "risk_mitigation": [
                "Ensure all evidence is well-documented",
                "Identify potential weaknesses in case",
                "Prepare for discovery process",
                "Consider insurance coverage implications"
            ]
        }
        
        return {
            "executive_summary": exec_summary,
            "detailed_analysis": detailed_analysis,
            "recommendations": recommendations,
            "case_metadata": {
                "jurisdiction": jurisdiction,
                "case_type": case_type,
                "analysis_date": datetime.now().isoformat()
            },
            "confidence_score": risk.get("confidence", 0.75),
            "methodology": "Multi-agent workflow with precedent analysis, risk modeling, and game theory optimization"
        }


# Convenience function
async def run_workflow(case_text: str, case_type: str, jurisdiction: str, damages_amount: Optional[float] = None) -> Dict:
    """
    Convenience function to run workflow
    
    Usage:
        from workflow_orchestrator import run_workflow
        result = await run_workflow("case description...", "contract_dispute", "California", 500000)
    """
    orchestrator = CaseWorkflowOrchestrator()
    return await orchestrator.run_full_analysis(case_text, case_type, jurisdiction, damages_amount)
