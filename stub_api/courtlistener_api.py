"""
CourtListener API Integration
Based on Monetization Research v2.1 - Data Pipeline Strategy

Features:
- Opinions search and retrieval
- Docket monitoring with relative date filtering
- ETL pipeline for case ingestion
- Rate limiting and caching

CourtListener API: https://www.courtlistener.com/api/rest/v3/
Free tier: 5,000 requests/day
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import httpx
from dataclasses import dataclass
from enum import Enum

# Configuration
COURTLISTENER_API_BASE = "https://www.courtlistener.com/api/rest/v3"
COURTLISTENER_API_TOKEN = os.getenv("COURTLISTENER_API_TOKEN", "")

# Rate limiting cache (in production, use Redis)
_request_cache: Dict[str, Dict[str, Any]] = {}
_rate_limit_counter = {"count": 0, "reset_time": datetime.now()}
DAILY_RATE_LIMIT = 5000

class CourtType(str, Enum):
    FEDERAL_APPELLATE = "federal-appellate"
    FEDERAL_DISTRICT = "federal-district"
    STATE_SUPREME = "state-supreme"
    STATE_APPELLATE = "state-appellate"
    STATE_TRIAL = "state-trial"

@dataclass
class Opinion:
    id: str
    case_name: str
    court: str
    court_id: str
    date_filed: str
    docket_number: str
    citation_count: int
    status: str
    precedential_status: str
    absolute_url: str
    text_excerpt: Optional[str] = None
    judges: Optional[List[str]] = None
    
@dataclass
class Docket:
    id: str
    case_name: str
    court: str
    court_id: str
    date_filed: str
    date_last_filing: str
    docket_number: str
    nature_of_suit: str
    assigned_to_str: str
    referred_to_str: str
    absolute_url: str

@dataclass
class SearchResult:
    opinions: List[Opinion]
    count: int
    next_page: Optional[str]
    previous_page: Optional[str]

def _get_cache_key(endpoint: str, params: Dict[str, Any]) -> str:
    """Generate cache key from endpoint and params."""
    param_str = json.dumps(params, sort_keys=True)
    return hashlib.md5(f"{endpoint}:{param_str}".encode()).hexdigest()

def _check_rate_limit() -> bool:
    """Check if we're within rate limits."""
    now = datetime.now()
    
    # Reset counter if new day
    if now.date() > _rate_limit_counter["reset_time"].date():
        _rate_limit_counter["count"] = 0
        _rate_limit_counter["reset_time"] = now
    
    return _rate_limit_counter["count"] < DAILY_RATE_LIMIT

def _increment_rate_limit():
    """Increment rate limit counter."""
    _rate_limit_counter["count"] += 1

async def _make_request(
    endpoint: str, 
    params: Optional[Dict[str, Any]] = None,
    use_cache: bool = True,
    cache_ttl: int = 3600  # 1 hour default
) -> Dict[str, Any]:
    """Make authenticated request to CourtListener API."""
    
    if not _check_rate_limit():
        raise Exception("CourtListener API daily rate limit exceeded (5,000 requests)")
    
    # Check cache
    cache_key = _get_cache_key(endpoint, params or {})
    if use_cache and cache_key in _request_cache:
        cached = _request_cache[cache_key]
        if datetime.now().timestamp() - cached["timestamp"] < cache_ttl:
            return cached["data"]
    
    # Build request
    url = f"{COURTLISTENER_API_BASE}/{endpoint}"
    headers = {}
    
    if COURTLISTENER_API_TOKEN:
        headers["Authorization"] = f"Token {COURTLISTENER_API_TOKEN}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers, timeout=30.0)
        response.raise_for_status()
        data = response.json()
    
    _increment_rate_limit()
    
    # Cache response
    if use_cache:
        _request_cache[cache_key] = {
            "data": data,
            "timestamp": datetime.now().timestamp()
        }
    
    return data

async def search_opinions(
    query: str,
    court: Optional[str] = None,
    court_type: Optional[CourtType] = None,
    date_filed_after: Optional[str] = None,
    date_filed_before: Optional[str] = None,
    filed_after_relative: Optional[int] = None,  # Days ago
    status: Optional[str] = None,
    citation_count_min: Optional[int] = None,
    order_by: str = "-date_filed",
    page: int = 1,
    page_size: int = 20
) -> SearchResult:
    """
    Search CourtListener opinions.
    
    Args:
        query: Search query text
        court: Specific court ID (e.g., 'ca9' for 9th Circuit)
        court_type: Type of court to filter
        date_filed_after: ISO date string
        date_filed_before: ISO date string
        filed_after_relative: Days ago (for rolling window)
        status: Opinion status
        citation_count_min: Minimum citation count
        order_by: Sort order
        page: Page number
        page_size: Results per page
    """
    
    params = {
        "q": query,
        "order_by": order_by,
        "page": page,
        "page_size": min(page_size, 100),  # API max is 100
    }
    
    if court:
        params["court"] = court
    
    if court_type:
        params["court__jurisdiction"] = court_type.value
    
    # Handle relative date filtering (unique to CourtListener)
    if filed_after_relative:
        relative_date = (datetime.now() - timedelta(days=filed_after_relative)).strftime("%Y-%m-%d")
        params["date_filed__gte"] = relative_date
    elif date_filed_after:
        params["date_filed__gte"] = date_filed_after
    
    if date_filed_before:
        params["date_filed__lte"] = date_filed_before
    
    if status:
        params["status"] = status
    
    if citation_count_min:
        params["citation_count__gte"] = citation_count_min
    
    data = await _make_request("search/", params)
    
    opinions = []
    for result in data.get("results", []):
        opinions.append(Opinion(
            id=str(result.get("id")),
            case_name=result.get("caseName", ""),
            court=result.get("court", ""),
            court_id=result.get("court_id", ""),
            date_filed=result.get("dateFiled", ""),
            docket_number=result.get("docketNumber", ""),
            citation_count=result.get("citeCount", 0),
            status=result.get("status", ""),
            precedential_status=result.get("precedentialStatus", ""),
            absolute_url=result.get("absolute_url", ""),
            text_excerpt=result.get("snippet", ""),
            judges=result.get("judge", "").split(",") if result.get("judge") else None
        ))
    
    return SearchResult(
        opinions=opinions,
        count=data.get("count", 0),
        next_page=data.get("next"),
        previous_page=data.get("previous")
    )

async def get_opinion(opinion_id: str) -> Optional[Opinion]:
    """Get a specific opinion by ID."""
    try:
        data = await _make_request(f"opinions/{opinion_id}/")
        
        return Opinion(
            id=str(data.get("id")),
            case_name=data.get("case_name", ""),
            court=data.get("court", ""),
            court_id=data.get("court_id", ""),
            date_filed=data.get("date_filed", ""),
            docket_number=data.get("docket_number", ""),
            citation_count=data.get("citation_count", 0),
            status=data.get("status", ""),
            precedential_status=data.get("precedential_status", ""),
            absolute_url=data.get("absolute_url", ""),
            text_excerpt=data.get("plain_text", "")[:500] if data.get("plain_text") else None
        )
    except Exception as e:
        print(f"Error fetching opinion {opinion_id}: {e}")
        return None

async def search_dockets(
    query: str,
    court: Optional[str] = None,
    nature_of_suit: Optional[str] = None,
    date_filed_after: Optional[str] = None,
    date_last_filing_after: Optional[str] = None,
    filed_after_relative: Optional[int] = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    """
    Search CourtListener dockets for monitoring.
    
    Supports relative date filtering for "rolling window" alerts.
    """
    
    params = {
        "q": query,
        "order_by": "-date_filed",
        "page": page,
        "page_size": min(page_size, 100),
    }
    
    if court:
        params["court"] = court
    
    if nature_of_suit:
        params["nature_of_suit"] = nature_of_suit
    
    if filed_after_relative:
        relative_date = (datetime.now() - timedelta(days=filed_after_relative)).strftime("%Y-%m-%d")
        params["date_filed__gte"] = relative_date
    elif date_filed_after:
        params["date_filed__gte"] = date_filed_after
    
    if date_last_filing_after:
        params["date_last_filing__gte"] = date_last_filing_after
    
    data = await _make_request("dockets/", params)
    
    dockets = []
    for result in data.get("results", []):
        dockets.append(Docket(
            id=str(result.get("id")),
            case_name=result.get("case_name", ""),
            court=result.get("court", ""),
            court_id=result.get("court_id", ""),
            date_filed=result.get("date_filed", ""),
            date_last_filing=result.get("date_last_filing", ""),
            docket_number=result.get("docket_number", ""),
            nature_of_suit=result.get("nature_of_suit", ""),
            assigned_to_str=result.get("assigned_to_str", ""),
            referred_to_str=result.get("referred_to_str", ""),
            absolute_url=result.get("absolute_url", "")
        ))
    
    return {
        "dockets": dockets,
        "count": data.get("count", 0),
        "next_page": data.get("next"),
        "previous_page": data.get("previous")
    }

async def get_recent_filings(
    days: int = 7,
    court: Optional[str] = None,
    case_types: Optional[List[str]] = None
) -> List[Docket]:
    """
    Get recent filings using relative date filtering.
    This is a key differentiator per the monetization research.
    """
    
    result = await search_dockets(
        query="*",
        court=court,
        filed_after_relative=days,
        page_size=50
    )
    
    return result["dockets"]

async def get_court_list() -> List[Dict[str, Any]]:
    """Get list of all courts in CourtListener."""
    data = await _make_request("courts/", {"page_size": 500})
    return data.get("results", [])

async def get_judge_info(judge_id: str) -> Optional[Dict[str, Any]]:
    """Get judge information from CourtListener."""
    try:
        data = await _make_request(f"people/{judge_id}/")
        return data
    except Exception:
        return None

# ETL Functions for Database Ingestion

async def fetch_opinions_for_etl(
    jurisdiction: str,
    case_type: str = "civil",
    days_back: int = 30,
    batch_size: int = 100
) -> List[Dict[str, Any]]:
    """
    Fetch opinions for ETL pipeline.
    
    Args:
        jurisdiction: State or federal circuit (e.g., 'ca' for California)
        case_type: Type of cases ('civil', 'criminal', etc.)
        days_back: How many days back to fetch
        batch_size: Number of results per batch
    """
    
    all_opinions = []
    page = 1
    
    while True:
        result = await search_opinions(
            query=f"type:{case_type}",
            court=jurisdiction,
            filed_after_relative=days_back,
            page=page,
            page_size=batch_size
        )
        
        for opinion in result.opinions:
            all_opinions.append({
                "case_id": f"CL-{opinion.id}",
                "case_name": opinion.case_name,
                "court": opinion.court,
                "jurisdiction": jurisdiction,
                "case_type": case_type,
                "decision_date": opinion.date_filed,
                "citation_count": opinion.citation_count,
                "summary": opinion.text_excerpt,
                "source_url": f"https://www.courtlistener.com{opinion.absolute_url}",
                "judges": opinion.judges,
                "metadata": {
                    "courtlistener_id": opinion.id,
                    "docket_number": opinion.docket_number,
                    "precedential_status": opinion.precedential_status,
                    "status": opinion.status
                }
            })
        
        if not result.next_page:
            break
        
        page += 1
        
        # Safety limit
        if page > 10:
            break
    
    return all_opinions

def get_rate_limit_status() -> Dict[str, Any]:
    """Get current rate limit status."""
    return {
        "requests_used": _rate_limit_counter["count"],
        "requests_remaining": DAILY_RATE_LIMIT - _rate_limit_counter["count"],
        "daily_limit": DAILY_RATE_LIMIT,
        "reset_time": _rate_limit_counter["reset_time"].isoformat(),
        "has_api_token": bool(COURTLISTENER_API_TOKEN)
    }

def clear_cache():
    """Clear the request cache."""
    _request_cache.clear()
