"""
CourtListener ETL Pipeline for Judge Data Population
Fetches real judge behavioral data from CourtListener API and populates Supabase.

Usage:
    python courtlistener_etl.py --judges       # Fetch judge data
    python courtlistener_etl.py --opinions     # Fetch recent opinions
    python courtlistener_etl.py --full         # Full ETL pipeline
    
Environment:
    COURTLISTENER_API_TOKEN - API token from courtlistener.com
    SUPABASE_URL - Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY - Service role key for writes
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
import requests
from dotenv import load_dotenv

load_dotenv()

# Configuration
COURTLISTENER_BASE_URL = "https://www.courtlistener.com/api/rest/v3"
COURTLISTENER_TOKEN = os.getenv("COURTLISTENER_API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Rate limiting
REQUESTS_PER_MINUTE = 50  # Conservative limit
REQUEST_DELAY = 60 / REQUESTS_PER_MINUTE

# Federal Courts mapping
FEDERAL_COURTS = {
    "scotus": "Supreme Court of the United States",
    "ca1": "First Circuit Court of Appeals",
    "ca2": "Second Circuit Court of Appeals",
    "ca3": "Third Circuit Court of Appeals",
    "ca4": "Fourth Circuit Court of Appeals",
    "ca5": "Fifth Circuit Court of Appeals",
    "ca6": "Sixth Circuit Court of Appeals",
    "ca7": "Seventh Circuit Court of Appeals",
    "ca8": "Eighth Circuit Court of Appeals",
    "ca9": "Ninth Circuit Court of Appeals",
    "ca10": "Tenth Circuit Court of Appeals",
    "ca11": "Eleventh Circuit Court of Appeals",
    "cadc": "D.C. Circuit Court of Appeals",
    "cafc": "Federal Circuit Court of Appeals",
}

@dataclass
class JudgeData:
    judge_id: str
    name: str
    court: str
    jurisdiction: str
    appointed_by: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    case_count: int = 0
    plaintiff_win_rate: float = 0.5
    reversal_rate: float = 0.0
    avg_damages: float = 0.0
    tendencies: Optional[str] = None
    metadata: Optional[Dict] = None

@dataclass
class OpinionData:
    opinion_id: str
    case_name: str
    court: str
    jurisdiction: str
    decision_date: str
    judges: List[str]
    outcome: Optional[str] = None
    case_type: Optional[str] = None
    citation_count: int = 0
    summary: Optional[str] = None
    full_text: Optional[str] = None

class CourtListenerClient:
    """Client for CourtListener API"""
    
    def __init__(self, api_token: str):
        self.token = api_token
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Token {api_token}",
            "Content-Type": "application/json"
        })
        self.last_request_time = 0
    
    def _rate_limit(self):
        """Enforce rate limiting"""
        elapsed = time.time() - self.last_request_time
        if elapsed < REQUEST_DELAY:
            time.sleep(REQUEST_DELAY - elapsed)
        self.last_request_time = time.time()
    
    def _get(self, endpoint: str, params: Dict = None) -> Optional[Dict]:
        """Make GET request with rate limiting"""
        self._rate_limit()
        url = f"{COURTLISTENER_BASE_URL}/{endpoint}"
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"API Error: {e}")
            return None
    
    def get_judges(self, court: str = None, limit: int = 100) -> List[Dict]:
        """Fetch judges from CourtListener"""
        params = {"page_size": min(limit, 100)}
        if court:
            params["court"] = court
        
        judges = []
        result = self._get("people/", params)
        
        if result and "results" in result:
            judges.extend(result["results"])
            
            # Paginate if needed
            while result.get("next") and len(judges) < limit:
                self._rate_limit()
                try:
                    response = self.session.get(result["next"], timeout=30)
                    result = response.json()
                    judges.extend(result.get("results", []))
                except:
                    break
        
        return judges[:limit]
    
    def get_judge_opinions(self, judge_id: str, limit: int = 50) -> List[Dict]:
        """Fetch opinions authored by a specific judge"""
        params = {
            "author": judge_id,
            "page_size": min(limit, 100),
            "order_by": "-date_filed"
        }
        
        result = self._get("opinions/", params)
        if result and "results" in result:
            return result["results"][:limit]
        return []
    
    def get_recent_opinions(
        self, 
        court: str = None, 
        days_back: int = 30,
        limit: int = 100
    ) -> List[Dict]:
        """Fetch recent opinions from a court"""
        since_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        
        params = {
            "date_filed__gte": since_date,
            "page_size": min(limit, 100),
            "order_by": "-date_filed"
        }
        if court:
            params["court"] = court
        
        result = self._get("opinions/", params)
        if result and "results" in result:
            return result["results"][:limit]
        return []
    
    def get_clusters(self, opinion_ids: List[str]) -> Dict[str, Dict]:
        """Fetch cluster data for opinions (contains metadata)"""
        clusters = {}
        for oid in opinion_ids[:20]:  # Limit to avoid rate limits
            result = self._get(f"clusters/{oid}/")
            if result:
                clusters[oid] = result
        return clusters
    
    def search_opinions(
        self,
        query: str,
        court: str = None,
        case_type: str = None,
        limit: int = 20
    ) -> List[Dict]:
        """Search opinions by query"""
        params = {
            "q": query,
            "page_size": min(limit, 100)
        }
        if court:
            params["court"] = court
        
        result = self._get("search/", params)
        if result and "results" in result:
            return result["results"][:limit]
        return []


class SupabaseClient:
    """Simple Supabase client for ETL"""
    
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self.session = requests.Session()
        self.session.headers.update({
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        })
    
    def upsert(self, table: str, data: List[Dict], on_conflict: str = "id") -> bool:
        """Upsert data into table"""
        url = f"{self.url}/rest/v1/{table}"
        headers = {"Prefer": f"resolution=merge-duplicates"}
        
        try:
            response = self.session.post(url, json=data, headers=headers)
            return response.status_code in [200, 201, 204]
        except Exception as e:
            print(f"Supabase Error: {e}")
            return False
    
    def insert(self, table: str, data: List[Dict]) -> bool:
        """Insert data into table"""
        url = f"{self.url}/rest/v1/{table}"
        
        try:
            response = self.session.post(url, json=data)
            return response.status_code in [200, 201]
        except Exception as e:
            print(f"Supabase Error: {e}")
            return False
    
    def query(self, table: str, filters: Dict = None) -> List[Dict]:
        """Query table"""
        url = f"{self.url}/rest/v1/{table}"
        params = {"select": "*"}
        if filters:
            for key, value in filters.items():
                params[key] = f"eq.{value}"
        
        try:
            response = self.session.get(url, params=params)
            return response.json() if response.status_code == 200 else []
        except:
            return []


def extract_judge_stats(opinions: List[Dict]) -> Dict[str, Any]:
    """Calculate judge statistics from opinions"""
    if not opinions:
        return {
            "case_count": 0,
            "plaintiff_win_rate": 0.5,
            "reversal_rate": 0.0,
            "avg_damages": 0.0
        }
    
    case_count = len(opinions)
    
    # Analyze outcomes (simplified heuristic)
    plaintiff_wins = 0
    reversals = 0
    
    for op in opinions:
        text = (op.get("plain_text") or op.get("html") or "").lower()
        
        # Check for plaintiff-favorable language
        if any(term in text for term in ["granted", "plaintiff prevails", "judgment for plaintiff", "affirmed"]):
            plaintiff_wins += 1
        
        # Check for reversals
        if any(term in text for term in ["reversed", "vacated", "remanded"]):
            reversals += 1
    
    return {
        "case_count": case_count,
        "plaintiff_win_rate": plaintiff_wins / case_count if case_count > 0 else 0.5,
        "reversal_rate": reversals / case_count if case_count > 0 else 0.0,
        "avg_damages": 0.0  # Would need more sophisticated extraction
    }


def run_judge_etl(cl_client: CourtListenerClient, sb_client: SupabaseClient, courts: List[str] = None):
    """Run ETL for judge data"""
    print("=" * 60)
    print("JUDGE DATA ETL PIPELINE")
    print("=" * 60)
    
    if not courts:
        courts = list(FEDERAL_COURTS.keys())[:5]  # Start with major circuits
    
    all_judges = []
    
    for court in courts:
        print(f"\nFetching judges from {court}...")
        judges_raw = cl_client.get_judges(court=court, limit=20)
        
        for j in judges_raw:
            judge_id = str(j.get("id", ""))
            name = f"{j.get('name_first', '')} {j.get('name_last', '')}".strip()
            
            if not name or not judge_id:
                continue
            
            print(f"  Processing: {name}")
            
            # Get judge's opinions for stats
            opinions = cl_client.get_judge_opinions(judge_id, limit=30)
            stats = extract_judge_stats(opinions)
            
            judge_data = JudgeData(
                judge_id=f"cl_{judge_id}",
                name=name,
                court=FEDERAL_COURTS.get(court, court),
                jurisdiction=court,
                appointed_by=j.get("appointer", {}).get("name_last") if isinstance(j.get("appointer"), dict) else None,
                start_date=j.get("date_start"),
                end_date=j.get("date_retirement"),
                case_count=stats["case_count"],
                plaintiff_win_rate=stats["plaintiff_win_rate"],
                reversal_rate=stats["reversal_rate"],
                avg_damages=stats["avg_damages"],
                tendencies="Standard" if 0.4 <= stats["plaintiff_win_rate"] <= 0.6 else (
                    "Pro-Plaintiff" if stats["plaintiff_win_rate"] > 0.6 else "Pro-Defense"
                ),
                metadata={"source": "courtlistener", "raw_id": judge_id}
            )
            
            all_judges.append(asdict(judge_data))
    
    # Insert into Supabase
    print(f"\nInserting {len(all_judges)} judges into database...")
    
    if all_judges:
        # Transform for judge_patterns table
        judge_patterns = [
            {
                "judge_id": j["judge_id"],
                "judge_name": j["name"],
                "court": j["court"],
                "jurisdiction": j["jurisdiction"],
                "total_cases": j["case_count"],
                "reversal_rate": j["reversal_rate"],
                "avg_damages": j["avg_damages"],
                "case_type_breakdown": json.dumps({"general": j["case_count"]}),
                "updated_at": datetime.now().isoformat()
            }
            for j in all_judges
        ]
        
        success = sb_client.insert("judge_patterns", judge_patterns)
        print(f"Insert {'succeeded' if success else 'failed'}")
    
    return all_judges


def run_opinions_etl(cl_client: CourtListenerClient, sb_client: SupabaseClient, days_back: int = 30):
    """Run ETL for recent opinions"""
    print("=" * 60)
    print("OPINIONS ETL PIPELINE")
    print("=" * 60)
    
    all_opinions = []
    courts = list(FEDERAL_COURTS.keys())[:5]
    
    for court in courts:
        print(f"\nFetching opinions from {court}...")
        opinions_raw = cl_client.get_recent_opinions(court=court, days_back=days_back, limit=20)
        
        for op in opinions_raw:
            opinion_id = str(op.get("id", ""))
            
            opinion_data = {
                "case_id": f"cl_op_{opinion_id}",
                "case_name": op.get("case_name", "Unknown"),
                "court": FEDERAL_COURTS.get(court, court),
                "jurisdiction": court,
                "decision_date": op.get("date_filed"),
                "case_type": op.get("type", "opinion"),
                "citation_count": op.get("citation_count", 0),
                "summary": (op.get("plain_text") or "")[:500],
                "metadata": json.dumps({"source": "courtlistener", "raw_id": opinion_id})
            }
            
            all_opinions.append(opinion_data)
    
    print(f"\nInserting {len(all_opinions)} opinions into database...")
    
    if all_opinions:
        success = sb_client.insert("legal_cases", all_opinions)
        print(f"Insert {'succeeded' if success else 'failed'}")
    
    return all_opinions


def main():
    parser = argparse.ArgumentParser(description="CourtListener ETL Pipeline")
    parser.add_argument("--judges", action="store_true", help="Fetch judge data")
    parser.add_argument("--opinions", action="store_true", help="Fetch recent opinions")
    parser.add_argument("--full", action="store_true", help="Run full ETL")
    parser.add_argument("--days", type=int, default=30, help="Days back for opinions")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to database")
    
    args = parser.parse_args()
    
    # Validate credentials
    if not COURTLISTENER_TOKEN:
        print("ERROR: COURTLISTENER_API_TOKEN not set")
        print("Get your free API token at: https://www.courtlistener.com/api/")
        sys.exit(1)
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
        sys.exit(1)
    
    # Initialize clients
    cl_client = CourtListenerClient(COURTLISTENER_TOKEN)
    sb_client = SupabaseClient(SUPABASE_URL, SUPABASE_KEY) if not args.dry_run else None
    
    print("\n" + "=" * 60)
    print("COURTLISTENER ETL PIPELINE")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)
    
    if args.judges or args.full:
        judges = run_judge_etl(cl_client, sb_client)
        print(f"\nProcessed {len(judges)} judges")
    
    if args.opinions or args.full:
        opinions = run_opinions_etl(cl_client, sb_client, args.days)
        print(f"\nProcessed {len(opinions)} opinions")
    
    if not (args.judges or args.opinions or args.full):
        print("No action specified. Use --judges, --opinions, or --full")
        parser.print_help()
    
    print("\n" + "=" * 60)
    print(f"Completed: {datetime.now().isoformat()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
