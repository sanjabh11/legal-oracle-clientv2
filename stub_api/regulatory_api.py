"""
Regulatory Forecasting API Integration
Federal Register API + ML Forecasting for Legal Oracle

Author: Legal Oracle Team
Date: 2025-10-07
"""

import requests
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json
import logging
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Federal Register API Configuration
FEDERAL_REGISTER_API_BASE = "https://www.federalregister.gov/api/v1"
FEDERAL_REGISTER_API_KEY = os.getenv("FEDERAL_REGISTER_API_KEY", "")  # Optional, increases rate limits

# Industry to Agency Mapping
INDUSTRY_AGENCY_MAP = {
    "technology": [
        "federal-communications-commission",
        "federal-trade-commission",
        "commerce-department"
    ],
    "healthcare": [
        "food-and-drug-administration",
        "centers-for-medicare-medicaid-services",
        "health-and-human-services-department"
    ],
    "finance": [
        "securities-and-exchange-commission",
        "commodity-futures-trading-commission",
        "treasury-department",
        "federal-reserve-system"
    ],
    "energy": [
        "department-of-energy",
        "environmental-protection-agency",
        "federal-energy-regulatory-commission"
    ],
    "pharmaceuticals": [
        "food-and-drug-administration",
        "centers-for-medicare-medicaid-services"
    ],
    "telecommunications": [
        "federal-communications-commission"
    ],
    "banking": [
        "federal-reserve-system",
        "comptroller-of-the-currency",
        "federal-deposit-insurance-corporation"
    ],
    "insurance": [
        "treasury-department",
        "state-regulatory-agencies"
    ],
    "manufacturing": [
        "environmental-protection-agency",
        "occupational-safety-and-health-administration",
        "commerce-department"
    ],
    "retail": [
        "federal-trade-commission",
        "consumer-product-safety-commission"
    ]
}


async def fetch_proposed_regulations(
    industry: str,
    timeframe_days: int = 180,
    page: int = 1,
    per_page: int = 20
) -> Dict:
    """
    Fetch proposed regulations from Federal Register API
    
    Args:
        industry: Industry category (technology, healthcare, finance, etc.)
        timeframe_days: Number of days to look back
        page: Pagination page number
        per_page: Results per page (max 1000)
    
    Returns:
        Dict with regulations and metadata
    """
    try:
        industry_lower = industry.lower()
        agencies = INDUSTRY_AGENCY_MAP.get(industry_lower, [])
        
        if not agencies:
            logger.warning(f"No agencies mapped for industry: {industry}")
            # Try to search by keyword instead
            return await fetch_regulations_by_keyword(industry, timeframe_days, page, per_page)
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=timeframe_days)
        
        all_regulations = []
        
        for agency in agencies:
            params = {
                "conditions[agencies][]": agency,
                "conditions[type][]": ["PRORULE", "RULE"],  # Proposed rules and final rules
                "conditions[publication_date][gte]": start_date.strftime("%Y-%m-%d"),
                "conditions[publication_date][lte]": end_date.strftime("%Y-%m-%d"),
                "per_page": per_page,
                "page": page,
                "order": "newest"
            }
            
            headers = {}
            if FEDERAL_REGISTER_API_KEY:
                headers["X-Api-Key"] = FEDERAL_REGISTER_API_KEY
            
            response = requests.get(
                f"{FEDERAL_REGISTER_API_BASE}/documents.json",
                params=params,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                regulations = data.get("results", [])
                all_regulations.extend(regulations)
                logger.info(f"Fetched {len(regulations)} regulations for agency: {agency}")
            else:
                logger.error(f"API error for {agency}: {response.status_code}")
        
        # Sort by publication date (newest first)
        all_regulations.sort(key=lambda x: x.get("publication_date", ""), reverse=True)
        
        # Limit to per_page after combining
        all_regulations = all_regulations[:per_page]
        
        return {
            "count": len(all_regulations),
            "industry": industry,
            "timeframe_days": timeframe_days,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "agencies_searched": agencies,
            "results": all_regulations
        }
        
    except requests.exceptions.Timeout:
        logger.error("Federal Register API timeout")
        return {
            "error": "API timeout",
            "count": 0,
            "results": []
        }
    except Exception as e:
        logger.error(f"Error fetching regulations: {str(e)}")
        return {
            "error": str(e),
            "count": 0,
            "results": []
        }


async def fetch_regulations_by_keyword(
    keyword: str,
    timeframe_days: int = 180,
    page: int = 1,
    per_page: int = 20
) -> Dict:
    """
    Fetch regulations by keyword search (fallback method)
    """
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=timeframe_days)
        
        params = {
            "conditions[term]": keyword,
            "conditions[type][]": ["PRORULE", "RULE"],
            "conditions[publication_date][gte]": start_date.strftime("%Y-%m-%d"),
            "conditions[publication_date][lte]": end_date.strftime("%Y-%m-%d"),
            "per_page": per_page,
            "page": page,
            "order": "newest"
        }
        
        headers = {}
        if FEDERAL_REGISTER_API_KEY:
            headers["X-Api-Key"] = FEDERAL_REGISTER_API_KEY
        
        response = requests.get(
            f"{FEDERAL_REGISTER_API_BASE}/documents.json",
            params=params,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "count": data.get("count", 0),
                "keyword": keyword,
                "timeframe_days": timeframe_days,
                "results": data.get("results", [])
            }
        else:
            logger.error(f"Keyword search error: {response.status_code}")
            return {"error": "API error", "count": 0, "results": []}
            
    except Exception as e:
        logger.error(f"Error in keyword search: {str(e)}")
        return {"error": str(e), "count": 0, "results": []}


def parse_regulation_impact(regulation: Dict) -> Dict:
    """
    Parse regulation data and extract impact indicators
    """
    try:
        impact_score = 5  # Default medium impact
        
        # Check for high-impact indicators
        title = regulation.get("title", "").lower()
        abstract = regulation.get("abstract", "").lower()
        
        high_impact_keywords = [
            "significant", "major", "substantial", "critical", "mandatory",
            "compliance", "penalty", "enforcement", "prohibition", "requirement"
        ]
        
        for keyword in high_impact_keywords:
            if keyword in title or keyword in abstract:
                impact_score += 1
        
        impact_score = min(impact_score, 10)  # Cap at 10
        
        # Extract effective date
        effective_on = regulation.get("effective_on", None)
        comments_close_on = regulation.get("comments_close_on", None)
        
        # Calculate urgency
        urgency = "medium"
        if comments_close_on:
            try:
                close_date = datetime.strptime(comments_close_on, "%Y-%m-%d")
                days_until_close = (close_date - datetime.now()).days
                if days_until_close < 30:
                    urgency = "high"
                elif days_until_close < 60:
                    urgency = "medium"
                else:
                    urgency = "low"
            except:
                pass
        
        return {
            "document_number": regulation.get("document_number"),
            "title": regulation.get("title"),
            "type": regulation.get("type"),
            "publication_date": regulation.get("publication_date"),
            "effective_on": effective_on,
            "comments_close_on": comments_close_on,
            "agencies": [agency.get("name") for agency in regulation.get("agencies", [])],
            "abstract": regulation.get("abstract", "")[:500],  # First 500 chars
            "html_url": regulation.get("html_url"),
            "pdf_url": regulation.get("pdf_url"),
            "impact_score": impact_score,
            "urgency": urgency,
            "estimated_compliance_months": estimate_compliance_timeline(regulation),
            "affected_areas": extract_affected_areas(regulation)
        }
        
    except Exception as e:
        logger.error(f"Error parsing regulation: {str(e)}")
        return {}


def estimate_compliance_timeline(regulation: Dict) -> int:
    """
    Estimate compliance timeline in months based on regulation complexity
    """
    try:
        # Base timeline
        timeline_months = 6
        
        title = regulation.get("title", "").lower()
        abstract = regulation.get("abstract", "").lower()
        
        # Complex indicators
        if any(word in title + abstract for word in ["comprehensive", "framework", "system-wide"]):
            timeline_months += 6
        
        # Technical indicators
        if any(word in title + abstract for word in ["technical", "cybersecurity", "data protection"]):
            timeline_months += 3
        
        # Financial indicators
        if any(word in title + abstract for word in ["financial", "reporting", "disclosure"]):
            timeline_months += 4
        
        return min(timeline_months, 18)  # Cap at 18 months
        
    except:
        return 6  # Default


def extract_affected_areas(regulation: Dict) -> List[str]:
    """
    Extract affected business areas from regulation
    """
    areas = []
    title = regulation.get("title", "").lower()
    abstract = regulation.get("abstract", "").lower()
    content = title + " " + abstract
    
    area_keywords = {
        "Data Privacy": ["privacy", "data protection", "personal information"],
        "Cybersecurity": ["cybersecurity", "security", "breach", "vulnerability"],
        "Financial Reporting": ["reporting", "disclosure", "financial", "accounting"],
        "Operations": ["operational", "procedures", "processes"],
        "Compliance": ["compliance", "regulatory", "requirement"],
        "Risk Management": ["risk", "management", "control"],
        "Human Resources": ["employment", "labor", "workplace"],
        "Environmental": ["environmental", "emissions", "sustainability"]
    }
    
    for area, keywords in area_keywords.items():
        if any(keyword in content for keyword in keywords):
            areas.append(area)
    
    return areas if areas else ["General Compliance"]


async def get_regulation_details(document_number: str) -> Optional[Dict]:
    """
    Get detailed information about a specific regulation
    """
    try:
        headers = {}
        if FEDERAL_REGISTER_API_KEY:
            headers["X-Api-Key"] = FEDERAL_REGISTER_API_KEY
        
        response = requests.get(
            f"{FEDERAL_REGISTER_API_BASE}/documents/{document_number}.json",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Failed to fetch document {document_number}: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Error fetching regulation details: {str(e)}")
        return None


# Convenience function for testing
if __name__ == "__main__":
    import asyncio
    
    async def test():
        print("Testing Federal Register API integration...")
        result = await fetch_proposed_regulations("technology", timeframe_days=90)
        print(f"\nFound {result['count']} regulations")
        
        if result['count'] > 0:
            print("\nFirst regulation:")
            parsed = parse_regulation_impact(result['results'][0])
            print(json.dumps(parsed, indent=2))
    
    asyncio.run(test())
