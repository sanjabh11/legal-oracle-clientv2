"""
Jurisdiction-Specific RAG Pipeline
Based on Addendum PRD v2.2 - Parameter #7: Jurisdiction-Specific RAG

"Retrieval Augmented Generation narrowed to local court rules.
Prevents 'hallucinating' federal rules in state court cases."

Features:
- Local court rules ingestion and indexing
- Jurisdiction-aware retrieval
- Rule-specific prompts for each jurisdiction
- Procedural nuance detection
"""

import os
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

# Court rule types
class RuleType(str, Enum):
    CIVIL_PROCEDURE = "civil_procedure"
    CRIMINAL_PROCEDURE = "criminal_procedure"
    EVIDENCE = "evidence"
    LOCAL_RULES = "local_rules"
    STANDING_ORDERS = "standing_orders"
    FILING_REQUIREMENTS = "filing_requirements"
    PAGE_LIMITS = "page_limits"
    CITATION_STYLE = "citation_style"
    MOTION_PRACTICE = "motion_practice"
    DISCOVERY = "discovery"

@dataclass
class LocalRule:
    id: str
    jurisdiction: str
    court: str
    rule_number: str
    rule_title: str
    rule_text: str
    rule_type: RuleType
    effective_date: str
    last_updated: str
    citations: List[str]
    notes: Optional[str] = None

@dataclass
class JurisdictionProfile:
    jurisdiction_id: str
    name: str
    court_type: str  # federal_district, federal_appellate, state_supreme, state_trial
    parent_jurisdiction: Optional[str]  # e.g., "9th Circuit" for NDCA
    local_rules_url: str
    filing_system: str  # CM/ECF, state equivalent
    special_requirements: Dict[str, Any]

# Major jurisdiction profiles
JURISDICTION_PROFILES: Dict[str, JurisdictionProfile] = {
    "ndca": JurisdictionProfile(
        jurisdiction_id="ndca",
        name="Northern District of California",
        court_type="federal_district",
        parent_jurisdiction="ca9",
        local_rules_url="https://www.cand.uscourts.gov/rules",
        filing_system="CM/ECF",
        special_requirements={
            "page_limits": {"motion": 25, "opposition": 25, "reply": 15},
            "font_size": 12,
            "line_spacing": "double",
            "margin": "1 inch",
            "citation_format": "Bluebook",
            "discovery_conference_required": True,
            "initial_disclosures_days": 14
        }
    ),
    "sdny": JurisdictionProfile(
        jurisdiction_id="sdny",
        name="Southern District of New York",
        court_type="federal_district",
        parent_jurisdiction="ca2",
        local_rules_url="https://www.nysd.uscourts.gov/rules",
        filing_system="CM/ECF",
        special_requirements={
            "page_limits": {"motion": 25, "opposition": 25, "reply": 10},
            "font_size": 12,
            "line_spacing": "double",
            "margin": "1 inch",
            "citation_format": "Bluebook",
            "pre_motion_conference": True,
            "individual_practices": True
        }
    ),
    "cdca": JurisdictionProfile(
        jurisdiction_id="cdca",
        name="Central District of California",
        court_type="federal_district",
        parent_jurisdiction="ca9",
        local_rules_url="https://www.cacd.uscourts.gov/rules",
        filing_system="CM/ECF",
        special_requirements={
            "page_limits": {"motion": 35, "opposition": 35, "reply": 20},
            "font_size": 14,
            "line_spacing": "double",
            "margin": "1 inch",
            "joint_stipulation_required": True
        }
    ),
    "ca_state": JurisdictionProfile(
        jurisdiction_id="ca_state",
        name="California State Courts",
        court_type="state_trial",
        parent_jurisdiction=None,
        local_rules_url="https://www.courts.ca.gov/rules",
        filing_system="Various",
        special_requirements={
            "page_limits": {"motion": 15, "opposition": 15, "reply": 10},
            "format": "California Rules of Court",
            "citation_format": "California Style Manual",
            "meet_and_confer_required": True,
            "tentative_ruling_system": True
        }
    ),
    "ny_state": JurisdictionProfile(
        jurisdiction_id="ny_state",
        name="New York State Courts",
        court_type="state_trial",
        parent_jurisdiction=None,
        local_rules_url="https://www.nycourts.gov/rules",
        filing_system="NYSCEF",
        special_requirements={
            "citation_format": "NY Official Reports",
            "affirmation_vs_affidavit": "attorney affirmation preferred",
            "notice_of_motion_required": True
        }
    ),
    "tx_state": JurisdictionProfile(
        jurisdiction_id="tx_state",
        name="Texas State Courts",
        court_type="state_trial",
        parent_jurisdiction=None,
        local_rules_url="https://www.txcourts.gov/rules",
        filing_system="eFileTexas",
        special_requirements={
            "citation_format": "Texas Rules of Form",
            "verified_pleading_common": True
        }
    )
}

# Sample local rules database (in production, store in Supabase)
LOCAL_RULES_DB: List[LocalRule] = [
    LocalRule(
        id="ndca-civ-7-2",
        jurisdiction="ndca",
        court="Northern District of California",
        rule_number="Civ. L.R. 7-2",
        rule_title="Page Limitations",
        rule_text="Unless otherwise ordered, motions, oppositions, and replies shall not exceed 25, 25, and 15 pages respectively, exclusive of tables and exhibits.",
        rule_type=RuleType.PAGE_LIMITS,
        effective_date="2023-01-01",
        last_updated="2023-01-01",
        citations=["Civ. L.R. 7-2"]
    ),
    LocalRule(
        id="ndca-civ-7-4",
        jurisdiction="ndca",
        court="Northern District of California",
        rule_number="Civ. L.R. 7-4",
        rule_title="Meet and Confer Requirement",
        rule_text="Before filing any discovery motion, counsel must meet and confer in good faith to attempt to resolve the dispute.",
        rule_type=RuleType.DISCOVERY,
        effective_date="2023-01-01",
        last_updated="2023-01-01",
        citations=["Civ. L.R. 7-4", "Fed. R. Civ. P. 37"]
    ),
    LocalRule(
        id="sdny-civ-6-1",
        jurisdiction="sdny",
        court="Southern District of New York",
        rule_number="Local Civil Rule 6.1",
        rule_title="Form of Papers",
        rule_text="All papers shall be 8½ by 11 inches in size, with margins of at least one inch on all sides. Text shall be double-spaced, except that footnotes and quotations may be single-spaced.",
        rule_type=RuleType.FILING_REQUIREMENTS,
        effective_date="2023-01-01",
        last_updated="2023-01-01",
        citations=["Local Civil Rule 6.1"]
    ),
    LocalRule(
        id="sdny-civ-37-2",
        jurisdiction="sdny",
        court="Southern District of New York",
        rule_number="Local Civil Rule 37.2",
        rule_title="Pre-Motion Conference",
        rule_text="Prior to making any motion relating to discovery, counsel must request a pre-motion conference with the Court.",
        rule_type=RuleType.MOTION_PRACTICE,
        effective_date="2023-01-01",
        last_updated="2023-01-01",
        citations=["Local Civil Rule 37.2"]
    ),
    LocalRule(
        id="ca-state-crc-3-1113",
        jurisdiction="ca_state",
        court="California State Courts",
        rule_number="CRC 3.1113",
        rule_title="Memorandum Page Limits",
        rule_text="A memorandum of points and authorities in support of or in opposition to a motion must not exceed 15 pages.",
        rule_type=RuleType.PAGE_LIMITS,
        effective_date="2023-01-01",
        last_updated="2023-01-01",
        citations=["Cal. Rules of Court, rule 3.1113"]
    )
]

def get_jurisdiction_profile(jurisdiction_id: str) -> Optional[JurisdictionProfile]:
    """Get jurisdiction profile by ID."""
    return JURISDICTION_PROFILES.get(jurisdiction_id.lower())

def get_local_rules(
    jurisdiction: str,
    rule_type: Optional[RuleType] = None
) -> List[LocalRule]:
    """Get local rules for a jurisdiction, optionally filtered by type."""
    rules = [r for r in LOCAL_RULES_DB if r.jurisdiction.lower() == jurisdiction.lower()]
    
    if rule_type:
        rules = [r for r in rules if r.rule_type == rule_type]
    
    return rules

def get_filing_requirements(jurisdiction: str) -> Dict[str, Any]:
    """Get specific filing requirements for a jurisdiction."""
    profile = get_jurisdiction_profile(jurisdiction)
    if not profile:
        return {"error": f"Unknown jurisdiction: {jurisdiction}"}
    
    rules = get_local_rules(jurisdiction, RuleType.FILING_REQUIREMENTS)
    page_limit_rules = get_local_rules(jurisdiction, RuleType.PAGE_LIMITS)
    
    return {
        "jurisdiction": profile.name,
        "court_type": profile.court_type,
        "filing_system": profile.filing_system,
        "special_requirements": profile.special_requirements,
        "page_limits": profile.special_requirements.get("page_limits", {}),
        "formatting": {
            "font_size": profile.special_requirements.get("font_size"),
            "line_spacing": profile.special_requirements.get("line_spacing"),
            "margin": profile.special_requirements.get("margin"),
        },
        "citation_format": profile.special_requirements.get("citation_format"),
        "applicable_rules": [
            {"rule_number": r.rule_number, "rule_title": r.rule_title, "rule_text": r.rule_text}
            for r in rules + page_limit_rules
        ]
    }

def check_document_compliance(
    jurisdiction: str,
    document_type: str,  # motion, opposition, reply, brief
    page_count: int,
    has_table_of_contents: bool = False,
    has_table_of_authorities: bool = False
) -> Dict[str, Any]:
    """Check if a document complies with jurisdiction-specific rules."""
    profile = get_jurisdiction_profile(jurisdiction)
    if not profile:
        return {"compliant": False, "error": f"Unknown jurisdiction: {jurisdiction}"}
    
    issues = []
    warnings = []
    
    # Check page limits
    page_limits = profile.special_requirements.get("page_limits", {})
    limit = page_limits.get(document_type.lower())
    
    if limit and page_count > limit:
        issues.append(f"Document exceeds page limit: {page_count} pages (limit: {limit})")
    elif limit and page_count > limit * 0.9:
        warnings.append(f"Document approaching page limit: {page_count}/{limit} pages")
    
    # Check table requirements for longer documents
    if page_count > 10:
        if not has_table_of_contents:
            warnings.append("Consider adding table of contents for documents over 10 pages")
        if not has_table_of_authorities:
            warnings.append("Consider adding table of authorities for documents over 10 pages")
    
    return {
        "compliant": len(issues) == 0,
        "jurisdiction": profile.name,
        "document_type": document_type,
        "page_count": page_count,
        "page_limit": limit,
        "issues": issues,
        "warnings": warnings,
        "citation_format": profile.special_requirements.get("citation_format", "Bluebook")
    }

def generate_jurisdiction_prompt_context(jurisdiction: str) -> str:
    """Generate RAG context for jurisdiction-specific prompts."""
    profile = get_jurisdiction_profile(jurisdiction)
    if not profile:
        return ""
    
    rules = get_local_rules(jurisdiction)
    
    context_parts = [
        f"## Jurisdiction: {profile.name}",
        f"Court Type: {profile.court_type}",
        f"Filing System: {profile.filing_system}",
        "",
        "### Special Requirements:",
    ]
    
    for key, value in profile.special_requirements.items():
        if isinstance(value, dict):
            context_parts.append(f"- {key}:")
            for k, v in value.items():
                context_parts.append(f"  - {k}: {v}")
        else:
            context_parts.append(f"- {key}: {value}")
    
    if rules:
        context_parts.extend(["", "### Applicable Local Rules:"])
        for rule in rules:
            context_parts.append(f"\n**{rule.rule_number}: {rule.rule_title}**")
            context_parts.append(rule.rule_text)
    
    return "\n".join(context_parts)

def get_motion_checklist(jurisdiction: str, motion_type: str) -> Dict[str, Any]:
    """Get a checklist for filing a specific motion type in a jurisdiction."""
    profile = get_jurisdiction_profile(jurisdiction)
    if not profile:
        return {"error": f"Unknown jurisdiction: {jurisdiction}"}
    
    # Base checklist items
    checklist = [
        {"item": "Caption and case number", "required": True, "completed": False},
        {"item": "Certificate of service", "required": True, "completed": False},
        {"item": "Proposed order", "required": True, "completed": False},
    ]
    
    # Add jurisdiction-specific items
    if profile.special_requirements.get("meet_and_confer_required"):
        checklist.append({
            "item": "Meet and confer declaration",
            "required": True,
            "completed": False,
            "note": "Must describe good faith efforts to resolve dispute"
        })
    
    if profile.special_requirements.get("pre_motion_conference"):
        checklist.append({
            "item": "Pre-motion conference letter",
            "required": True,
            "completed": False,
            "note": "Required before filing discovery motions"
        })
    
    if profile.special_requirements.get("joint_stipulation_required") and motion_type.lower() == "discovery":
        checklist.append({
            "item": "Joint stipulation",
            "required": True,
            "completed": False,
            "note": "Must include both parties' positions"
        })
    
    # Page limit check
    page_limits = profile.special_requirements.get("page_limits", {})
    if motion_type.lower() in page_limits:
        checklist.append({
            "item": f"Page limit compliance ({page_limits[motion_type.lower()]} pages)",
            "required": True,
            "completed": False
        })
    
    return {
        "jurisdiction": profile.name,
        "motion_type": motion_type,
        "checklist": checklist,
        "filing_system": profile.filing_system,
        "citation_format": profile.special_requirements.get("citation_format", "Bluebook"),
        "local_rules_url": profile.local_rules_url
    }

# API endpoint functions
async def search_local_rules(
    query: str,
    jurisdiction: Optional[str] = None,
    rule_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Search local rules database."""
    results = []
    
    for rule in LOCAL_RULES_DB:
        # Filter by jurisdiction
        if jurisdiction and rule.jurisdiction.lower() != jurisdiction.lower():
            continue
        
        # Filter by rule type
        if rule_type:
            try:
                rt = RuleType(rule_type)
                if rule.rule_type != rt:
                    continue
            except ValueError:
                pass
        
        # Simple text matching (in production, use vector search)
        query_lower = query.lower()
        if (query_lower in rule.rule_text.lower() or 
            query_lower in rule.rule_title.lower() or
            query_lower in rule.rule_number.lower()):
            results.append({
                "id": rule.id,
                "jurisdiction": rule.jurisdiction,
                "court": rule.court,
                "rule_number": rule.rule_number,
                "rule_title": rule.rule_title,
                "rule_text": rule.rule_text,
                "rule_type": rule.rule_type.value,
                "relevance": 0.8  # Placeholder
            })
    
    return results

def get_all_jurisdictions() -> List[Dict[str, Any]]:
    """Get list of all supported jurisdictions."""
    return [
        {
            "id": j.jurisdiction_id,
            "name": j.name,
            "court_type": j.court_type,
            "parent": j.parent_jurisdiction
        }
        for j in JURISDICTION_PROFILES.values()
    ]
