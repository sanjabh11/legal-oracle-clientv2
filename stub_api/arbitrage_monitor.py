"""
Legal Arbitrage Alert System
Real-time monitoring for temporary legal advantages

Author: Legal Oracle Team
Date: 2025-10-07
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
from dataclasses import dataclass
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ArbitrageOpportunity:
    """Data class for arbitrage opportunities"""
    id: str
    type: str
    title: str
    description: str
    opportunity_score: float
    window_days: int
    expiration_date: Optional[datetime]
    jurisdictions: List[str]
    recommendation: str
    risk_level: str
    detected_at: datetime


class ArbitrageMonitor:
    """
    Monitor for legal arbitrage opportunities
    """
    
    def __init__(self):
        self.monitored_topics = []
        self.alert_subscriptions = {}
        self.opportunities_cache = []
    
    def detect_sunset_clauses(self, regulations: List[Dict]) -> List[ArbitrageOpportunity]:
        """
        Detect regulations with sunset/expiration clauses
        
        Args:
            regulations: List of regulation documents
        
        Returns:
            List of arbitrage opportunities
        """
        opportunities = []
        
        for reg in regulations:
            title = reg.get("title", "").lower()
            abstract = reg.get("abstract", "").lower()
            content = title + " " + abstract
            
            # Look for sunset indicators
            sunset_keywords = [
                "sunset", "expiration", "expire", "temporary",
                "pilot program", "interim", "transition period"
            ]
            
            has_sunset = any(keyword in content for keyword in sunset_keywords)
            
            if has_sunset:
                # Try to extract expiration date
                expiration_date = self._extract_expiration_date(reg)
                
                if expiration_date:
                    window_days = (expiration_date - datetime.now()).days
                    
                    if window_days > 0 and window_days <= 365:  # Only if within next year
                        opportunity_score = self._calculate_opportunity_score(
                            window_days=window_days,
                            impact_level=reg.get("type", "RULE")
                        )
                        
                        opportunities.append(ArbitrageOpportunity(
                            id=reg.get("document_number", ""),
                            type="sunset_clause",
                            title=reg.get("title", "")[:100],
                            description=f"Temporary legal framework expiring in {window_days} days",
                            opportunity_score=opportunity_score,
                            window_days=window_days,
                            expiration_date=expiration_date,
                            jurisdictions=self._extract_jurisdictions(reg),
                            recommendation=f"Act before {expiration_date.strftime('%Y-%m-%d')} to leverage current rules",
                            risk_level=self._assess_risk_level(window_days),
                            detected_at=datetime.now()
                        ))
        
        return opportunities
    
    def detect_jurisdictional_conflicts(
        self, 
        case_data: List[Dict]
    ) -> List[ArbitrageOpportunity]:
        """
        Detect conflicting rulings across jurisdictions (circuit splits)
        
        Args:
            case_data: List of case outcomes
        
        Returns:
            List of arbitrage opportunities
        """
        opportunities = []
        
        # Group cases by legal issue
        issue_groups = {}
        for case in case_data:
            issue = case.get("case_type", "Unknown")
            if issue not in issue_groups:
                issue_groups[issue] = []
            issue_groups[issue].append(case)
        
        # Check for conflicts
        for issue, cases in issue_groups.items():
            jurisdictions = set(c.get("jurisdiction", "") for c in cases)
            
            if len(jurisdictions) > 1:
                # Check if outcomes differ
                outcomes = [c.get("outcome", "") for c in cases]
                
                if len(set(outcomes)) > 1:  # Conflicting outcomes
                    # Calculate opportunity score
                    favorable_jurisdictions = [
                        c.get("jurisdiction") 
                        for c in cases 
                        if c.get("outcome") in ["Plaintiff Victory", "Settlement (Favorable)"]
                    ]
                    
                    if favorable_jurisdictions:
                        opportunity_score = min(0.95, 0.6 + (len(favorable_jurisdictions) * 0.1))
                        
                        opportunities.append(ArbitrageOpportunity(
                            id=f"conflict_{issue}_{datetime.now().timestamp()}",
                            type="jurisdictional_conflict",
                            title=f"Circuit Split: {issue}",
                            description=f"Different rulings on {issue} across {len(jurisdictions)} jurisdictions",
                            opportunity_score=opportunity_score,
                            window_days=180,  # Estimated window before harmonization
                            expiration_date=datetime.now() + timedelta(days=180),
                            jurisdictions=favorable_jurisdictions[:3],
                            recommendation=f"File in {favorable_jurisdictions[0]} before circuit split is resolved",
                            risk_level="medium",
                            detected_at=datetime.now()
                        ))
        
        return opportunities
    
    def detect_temporary_exemptions(self, regulations: List[Dict]) -> List[ArbitrageOpportunity]:
        """
        Detect temporary regulatory exemptions
        """
        opportunities = []
        
        for reg in regulations:
            content = (reg.get("title", "") + " " + reg.get("abstract", "")).lower()
            
            # Look for exemption keywords
            exemption_keywords = [
                "exemption", "exception", "waiver", "relief",
                "temporary relief", "interim relief"
            ]
            
            if any(keyword in content for keyword in exemption_keywords):
                # This is a potential exemption
                expiration_date = self._extract_expiration_date(reg)
                
                if expiration_date:
                    window_days = (expiration_date - datetime.now()).days
                    
                    if 0 < window_days <= 365:
                        opportunities.append(ArbitrageOpportunity(
                            id=reg.get("document_number", ""),
                            type="temporary_exemption",
                            title=reg.get("title", "")[:100],
                            description="Temporary regulatory relief available",
                            opportunity_score=0.75,
                            window_days=window_days,
                            expiration_date=expiration_date,
                            jurisdictions=self._extract_jurisdictions(reg),
                            recommendation="Apply for exemption before window closes",
                            risk_level=self._assess_risk_level(window_days),
                            detected_at=datetime.now()
                        ))
        
        return opportunities
    
    def detect_transition_periods(self, regulations: List[Dict]) -> List[ArbitrageOpportunity]:
        """
        Detect regulatory transition periods with dual-regime advantages
        """
        opportunities = []
        
        for reg in regulations:
            content = (reg.get("title", "") + " " + reg.get("abstract", "")).lower()
            
            # Look for transition indicators
            transition_keywords = [
                "transition", "grandfathered", "phase-in",
                "implementation period", "compliance deadline"
            ]
            
            if any(keyword in content for keyword in transition_keywords):
                effective_date = reg.get("effective_on")
                comments_close = reg.get("comments_close_on")
                
                # Estimate transition window
                if effective_date:
                    try:
                        effective_dt = datetime.strptime(effective_date, "%Y-%m-%d")
                        window_days = (effective_dt - datetime.now()).days
                        
                        if 0 < window_days <= 365:
                            opportunities.append(ArbitrageOpportunity(
                                id=reg.get("document_number", ""),
                                type="transition_period",
                                title=reg.get("title", "")[:100],
                                description="Regulatory transition period offers dual-regime flexibility",
                                opportunity_score=0.70,
                                window_days=window_days,
                                expiration_date=effective_dt,
                                jurisdictions=self._extract_jurisdictions(reg),
                                recommendation="Leverage old rules during transition before new requirements take effect",
                                risk_level="low",
                                detected_at=datetime.now()
                            ))
                    except:
                        pass
        
        return opportunities
    
    def _extract_expiration_date(self, regulation: Dict) -> Optional[datetime]:
        """
        Try to extract expiration date from regulation
        """
        # Check structured fields first
        if regulation.get("effective_on"):
            try:
                return datetime.strptime(regulation["effective_on"], "%Y-%m-%d")
            except:
                pass
        
        if regulation.get("comments_close_on"):
            try:
                # Use comments close as proxy
                return datetime.strptime(regulation["comments_close_on"], "%Y-%m-%d")
            except:
                pass
        
        # Try to parse from text
        content = regulation.get("abstract", "")
        
        # Look for date patterns
        date_patterns = [
            r"expire[sd]?\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})",
            r"until\s+(\w+\s+\d{1,2},?\s+\d{4})",
            r"through\s+(\w+\s+\d{1,2},?\s+\d{4})"
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                try:
                    date_str = match.group(1)
                    # Try to parse (simplified)
                    return datetime.strptime(date_str, "%B %d, %Y")
                except:
                    continue
        
        return None
    
    def _extract_jurisdictions(self, regulation: Dict) -> List[str]:
        """Extract affected jurisdictions"""
        jurisdictions = []
        
        # Get from agencies
        agencies = regulation.get("agencies", [])
        for agency in agencies:
            name = agency.get("name", "")
            if "Federal" in name or "National" in name:
                jurisdictions.append("Federal")
            else:
                jurisdictions.append(name[:30])
        
        return jurisdictions if jurisdictions else ["Federal"]
    
    def _calculate_opportunity_score(
        self, 
        window_days: int,
        impact_level: str
    ) -> float:
        """
        Calculate opportunity score (0-1)
        """
        # Base score
        score = 0.5
        
        # Window factor (shorter window = higher urgency)
        if window_days < 30:
            score += 0.3
        elif window_days < 90:
            score += 0.2
        elif window_days < 180:
            score += 0.1
        
        # Impact factor
        if impact_level == "PRORULE":  # Proposed rule
            score += 0.1
        elif impact_level == "RULE":  # Final rule
            score += 0.2
        
        return min(score, 1.0)
    
    def _assess_risk_level(self, window_days: int) -> str:
        """Assess risk level based on window"""
        if window_days < 30:
            return "high"  # Urgent
        elif window_days < 90:
            return "medium"
        else:
            return "low"
    
    async def scan_for_opportunities(
        self,
        regulations: List[Dict],
        case_data: List[Dict]
    ) -> List[ArbitrageOpportunity]:
        """
        Main scanning method - detect all types of opportunities
        
        Args:
            regulations: Recent regulations
            case_data: Historical case data
        
        Returns:
            List of opportunities sorted by score
        """
        all_opportunities = []
        
        # Run all detection methods
        all_opportunities.extend(self.detect_sunset_clauses(regulations))
        all_opportunities.extend(self.detect_jurisdictional_conflicts(case_data))
        all_opportunities.extend(self.detect_temporary_exemptions(regulations))
        all_opportunities.extend(self.detect_transition_periods(regulations))
        
        # Sort by opportunity score
        all_opportunities.sort(key=lambda x: x.opportunity_score, reverse=True)
        
        # Cache for future reference
        self.opportunities_cache = all_opportunities
        
        logger.info(f"Detected {len(all_opportunities)} arbitrage opportunities")
        
        return all_opportunities


def format_opportunity_for_api(opp: ArbitrageOpportunity) -> Dict:
    """Format opportunity for API response"""
    return {
        "id": opp.id,
        "type": opp.type,
        "title": opp.title,
        "description": opp.description,
        "opportunity_score": round(opp.opportunity_score, 2),
        "window_days": opp.window_days,
        "expiration_date": opp.expiration_date.strftime("%Y-%m-%d") if opp.expiration_date else None,
        "jurisdictions": opp.jurisdictions,
        "recommendation": opp.recommendation,
        "risk_level": opp.risk_level,
        "detected_at": opp.detected_at.isoformat()
    }


# Testing
if __name__ == "__main__":
    import asyncio
    
    async def test():
        monitor = ArbitrageMonitor()
        
        # Sample regulation data
        sample_regs = [
            {
                "document_number": "2024-12345",
                "title": "Temporary Relief for Technology Startups",
                "abstract": "This rule provides temporary exemption until December 31, 2025",
                "type": "RULE",
                "agencies": [{"name": "Securities and Exchange Commission"}],
                "comments_close_on": "2025-12-31"
            }
        ]
        
        opportunities = await monitor.scan_for_opportunities(sample_regs, [])
        
        print(f"Found {len(opportunities)} opportunities:")
        for opp in opportunities:
            print(f"- {opp.type}: {opp.title} (score: {opp.opportunity_score})")
    
    asyncio.run(test())
