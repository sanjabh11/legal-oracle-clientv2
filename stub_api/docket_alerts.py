"""
Reactive Docket Alerts Service
Based on Addendum PRD v2.2 - Parameter #9: Reactive Docket Alerts

"Re-runs the Game Theory calculation when a new document is filed (via Webhooks).
Keeps the strategy dynamic, not static."

Features:
- Docket monitoring subscriptions
- Webhook-triggered Nash recalculation
- Alert delivery (email, in-app, webhook)
- Rolling window filtering
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio

# Alert types
class AlertType(str, Enum):
    NEW_FILING = "new_filing"
    MOTION_FILED = "motion_filed"
    ORDER_ISSUED = "order_issued"
    HEARING_SCHEDULED = "hearing_scheduled"
    DEADLINE_APPROACHING = "deadline_approaching"
    NASH_RECALCULATION = "nash_recalculation"
    STRATEGY_CHANGE = "strategy_change"

class AlertPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class DeliveryMethod(str, Enum):
    EMAIL = "email"
    IN_APP = "in_app"
    WEBHOOK = "webhook"
    SMS = "sms"

@dataclass
class DocketSubscription:
    id: str
    user_id: str
    case_id: str
    case_name: str
    court: str
    jurisdiction: str
    docket_number: str
    alert_types: List[AlertType]
    delivery_methods: List[DeliveryMethod]
    webhook_url: Optional[str]
    game_theory_params: Optional[Dict[str, Any]]  # For Nash recalculation
    created_at: str
    last_checked: str
    active: bool = True

@dataclass
class DocketAlert:
    id: str
    subscription_id: str
    user_id: str
    case_id: str
    alert_type: AlertType
    priority: AlertPriority
    title: str
    message: str
    filing_details: Optional[Dict[str, Any]]
    nash_update: Optional[Dict[str, Any]]  # New Nash equilibrium if recalculated
    created_at: str
    read: bool = False
    delivered: bool = False

# In-memory storage (use database in production)
_subscriptions: Dict[str, DocketSubscription] = {}
_alerts: Dict[str, DocketAlert] = {}
_alert_queue: List[DocketAlert] = []

def generate_id(prefix: str = "alert") -> str:
    """Generate unique ID."""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_part = hashlib.md5(f"{timestamp}{os.urandom(8).hex()}".encode()).hexdigest()[:8]
    return f"{prefix}_{timestamp}_{random_part}"

# Subscription Management
def create_subscription(
    user_id: str,
    case_id: str,
    case_name: str,
    court: str,
    jurisdiction: str,
    docket_number: str,
    alert_types: List[str],
    delivery_methods: List[str],
    webhook_url: Optional[str] = None,
    game_theory_params: Optional[Dict[str, Any]] = None
) -> DocketSubscription:
    """Create a new docket monitoring subscription."""
    sub_id = generate_id("sub")
    
    subscription = DocketSubscription(
        id=sub_id,
        user_id=user_id,
        case_id=case_id,
        case_name=case_name,
        court=court,
        jurisdiction=jurisdiction,
        docket_number=docket_number,
        alert_types=[AlertType(t) for t in alert_types],
        delivery_methods=[DeliveryMethod(m) for m in delivery_methods],
        webhook_url=webhook_url,
        game_theory_params=game_theory_params,
        created_at=datetime.now().isoformat(),
        last_checked=datetime.now().isoformat(),
        active=True
    )
    
    _subscriptions[sub_id] = subscription
    return subscription

def get_user_subscriptions(user_id: str) -> List[DocketSubscription]:
    """Get all subscriptions for a user."""
    return [s for s in _subscriptions.values() if s.user_id == user_id and s.active]

def get_subscription(subscription_id: str) -> Optional[DocketSubscription]:
    """Get a specific subscription."""
    return _subscriptions.get(subscription_id)

def update_subscription(
    subscription_id: str,
    updates: Dict[str, Any]
) -> Optional[DocketSubscription]:
    """Update a subscription."""
    sub = _subscriptions.get(subscription_id)
    if not sub:
        return None
    
    for key, value in updates.items():
        if hasattr(sub, key):
            if key == "alert_types":
                value = [AlertType(t) for t in value]
            elif key == "delivery_methods":
                value = [DeliveryMethod(m) for m in value]
            setattr(sub, key, value)
    
    return sub

def delete_subscription(subscription_id: str) -> bool:
    """Delete (deactivate) a subscription."""
    sub = _subscriptions.get(subscription_id)
    if sub:
        sub.active = False
        return True
    return False

# Alert Generation
def create_alert(
    subscription: DocketSubscription,
    alert_type: AlertType,
    title: str,
    message: str,
    filing_details: Optional[Dict[str, Any]] = None,
    nash_update: Optional[Dict[str, Any]] = None
) -> DocketAlert:
    """Create a new alert."""
    alert_id = generate_id("alert")
    
    # Determine priority
    priority = AlertPriority.MEDIUM
    if alert_type in [AlertType.ORDER_ISSUED, AlertType.NASH_RECALCULATION]:
        priority = AlertPriority.HIGH
    elif alert_type == AlertType.STRATEGY_CHANGE:
        priority = AlertPriority.URGENT
    elif alert_type == AlertType.DEADLINE_APPROACHING:
        priority = AlertPriority.HIGH
    
    alert = DocketAlert(
        id=alert_id,
        subscription_id=subscription.id,
        user_id=subscription.user_id,
        case_id=subscription.case_id,
        alert_type=alert_type,
        priority=priority,
        title=title,
        message=message,
        filing_details=filing_details,
        nash_update=nash_update,
        created_at=datetime.now().isoformat()
    )
    
    _alerts[alert_id] = alert
    _alert_queue.append(alert)
    
    return alert

def get_user_alerts(
    user_id: str,
    unread_only: bool = False,
    limit: int = 50
) -> List[DocketAlert]:
    """Get alerts for a user."""
    alerts = [a for a in _alerts.values() if a.user_id == user_id]
    
    if unread_only:
        alerts = [a for a in alerts if not a.read]
    
    # Sort by created_at descending
    alerts.sort(key=lambda x: x.created_at, reverse=True)
    
    return alerts[:limit]

def mark_alert_read(alert_id: str) -> bool:
    """Mark an alert as read."""
    alert = _alerts.get(alert_id)
    if alert:
        alert.read = True
        return True
    return False

def mark_all_read(user_id: str) -> int:
    """Mark all alerts for a user as read."""
    count = 0
    for alert in _alerts.values():
        if alert.user_id == user_id and not alert.read:
            alert.read = True
            count += 1
    return count

# Nash Recalculation on New Filing
async def process_new_filing(
    case_id: str,
    filing_type: str,
    filing_details: Dict[str, Any]
) -> List[DocketAlert]:
    """Process a new filing and trigger Nash recalculation if needed."""
    alerts_created = []
    
    # Find all subscriptions for this case
    subscriptions = [s for s in _subscriptions.values() 
                    if s.case_id == case_id and s.active]
    
    for sub in subscriptions:
        # Create basic filing alert
        if AlertType.NEW_FILING in sub.alert_types:
            alert = create_alert(
                subscription=sub,
                alert_type=AlertType.NEW_FILING,
                title=f"New Filing: {filing_type}",
                message=f"A new {filing_type} was filed in {sub.case_name}",
                filing_details=filing_details
            )
            alerts_created.append(alert)
        
        # Check if Nash recalculation is needed
        if (AlertType.NASH_RECALCULATION in sub.alert_types and 
            sub.game_theory_params and
            should_recalculate_nash(filing_type, filing_details)):
            
            # Recalculate Nash equilibrium
            nash_result = await recalculate_nash(sub, filing_details)
            
            if nash_result:
                # Check if strategy changed
                strategy_changed = nash_result.get("strategy_changed", False)
                
                alert = create_alert(
                    subscription=sub,
                    alert_type=AlertType.STRATEGY_CHANGE if strategy_changed else AlertType.NASH_RECALCULATION,
                    title="Strategy Update" if strategy_changed else "Nash Equilibrium Recalculated",
                    message=nash_result.get("summary", "Game theory analysis updated based on new filing"),
                    filing_details=filing_details,
                    nash_update=nash_result
                )
                alerts_created.append(alert)
    
    return alerts_created

def should_recalculate_nash(filing_type: str, filing_details: Dict[str, Any]) -> bool:
    """Determine if a filing should trigger Nash recalculation."""
    # Filing types that significantly impact case strategy
    significant_filings = [
        "motion_for_summary_judgment",
        "motion_to_dismiss",
        "settlement_offer",
        "expert_report",
        "deposition_transcript",
        "order",
        "ruling",
        "verdict",
        "damages_calculation",
        "amended_complaint"
    ]
    
    filing_type_lower = filing_type.lower().replace(" ", "_")
    return any(sf in filing_type_lower for sf in significant_filings)

async def recalculate_nash(
    subscription: DocketSubscription,
    filing_details: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Recalculate Nash equilibrium based on new filing."""
    if not subscription.game_theory_params:
        return None
    
    params = subscription.game_theory_params
    previous_strategy = params.get("previous_optimal_strategy")
    
    # Adjust parameters based on filing
    filing_type = filing_details.get("type", "").lower()
    
    # Update win probability based on filing
    win_prob_adjustment = 0
    if "summary_judgment" in filing_type:
        if filing_details.get("granted"):
            win_prob_adjustment = 0.3 if filing_details.get("movant") == "plaintiff" else -0.3
        else:
            win_prob_adjustment = 0.1 if filing_details.get("movant") == "defendant" else -0.1
    elif "settlement" in filing_type:
        # Settlement offer changes the game
        new_offer = filing_details.get("amount", params.get("settlement_offer", 0))
        params["settlement_offer"] = new_offer
    elif "expert" in filing_type:
        # Expert reports affect damages estimate
        damages_adjustment = filing_details.get("damages_opinion_change", 0)
        current_judgment = params.get("expected_judgment", 100000)
        params["expected_judgment"] = current_judgment + damages_adjustment
    
    # Apply win probability adjustment
    current_win_prob = params.get("win_probability", 0.5)
    new_win_prob = max(0.05, min(0.95, current_win_prob + win_prob_adjustment))
    params["win_probability"] = new_win_prob
    
    # Calculate new Nash equilibrium
    settlement = params.get("settlement_offer", 50000)
    judgment = params.get("expected_judgment", 100000)
    trial_costs = params.get("trial_costs", 25000)
    
    trial_ev = (new_win_prob * judgment) - trial_costs
    
    # Determine optimal strategy
    if trial_ev > settlement:
        new_strategy = "trial"
        recommendation = f"Continue to trial. Expected value (${trial_ev:,.0f}) exceeds settlement (${settlement:,.0f})."
    else:
        new_strategy = "settle"
        recommendation = f"Accept settlement. Settlement (${settlement:,.0f}) exceeds trial EV (${trial_ev:,.0f})."
    
    strategy_changed = previous_strategy and previous_strategy != new_strategy
    
    # Update stored params
    params["previous_optimal_strategy"] = new_strategy
    subscription.game_theory_params = params
    
    return {
        "optimal_strategy": new_strategy,
        "previous_strategy": previous_strategy,
        "strategy_changed": strategy_changed,
        "win_probability": new_win_prob,
        "trial_expected_value": trial_ev,
        "settlement_value": settlement,
        "recommendation": recommendation,
        "summary": f"Strategy {'changed to' if strategy_changed else 'remains'} {new_strategy}. "
                   f"Win probability: {new_win_prob:.0%}, Trial EV: ${trial_ev:,.0f}, Settlement: ${settlement:,.0f}",
        "triggered_by": filing_details.get("type", "unknown filing"),
        "recalculated_at": datetime.now().isoformat()
    }

# Alert Delivery
async def deliver_alerts():
    """Process and deliver queued alerts."""
    while _alert_queue:
        alert = _alert_queue.pop(0)
        subscription = _subscriptions.get(alert.subscription_id)
        
        if not subscription:
            continue
        
        for method in subscription.delivery_methods:
            try:
                if method == DeliveryMethod.IN_APP:
                    # Already stored in _alerts
                    pass
                elif method == DeliveryMethod.EMAIL:
                    await send_email_alert(alert, subscription)
                elif method == DeliveryMethod.WEBHOOK:
                    await send_webhook_alert(alert, subscription)
                elif method == DeliveryMethod.SMS:
                    await send_sms_alert(alert, subscription)
            except Exception as e:
                print(f"Failed to deliver alert {alert.id} via {method}: {e}")
        
        alert.delivered = True

async def send_email_alert(alert: DocketAlert, subscription: DocketSubscription):
    """Send alert via email."""
    # Integration with SendGrid or similar
    print(f"[EMAIL] Would send alert to user {subscription.user_id}: {alert.title}")

async def send_webhook_alert(alert: DocketAlert, subscription: DocketSubscription):
    """Send alert via webhook."""
    if not subscription.webhook_url:
        return
    
    import httpx
    async with httpx.AsyncClient() as client:
        await client.post(
            subscription.webhook_url,
            json={
                "alert_id": alert.id,
                "alert_type": alert.alert_type.value,
                "case_id": alert.case_id,
                "title": alert.title,
                "message": alert.message,
                "nash_update": alert.nash_update,
                "created_at": alert.created_at
            },
            timeout=10.0
        )

async def send_sms_alert(alert: DocketAlert, subscription: DocketSubscription):
    """Send alert via SMS."""
    # Integration with Twilio or similar
    print(f"[SMS] Would send alert to user {subscription.user_id}: {alert.title}")

# Deadline Monitoring
def check_deadlines(days_ahead: int = 7) -> List[DocketAlert]:
    """Check for approaching deadlines and create alerts."""
    alerts = []
    # In production, query database for cases with upcoming deadlines
    return alerts

# API Response Helpers
def subscription_to_dict(sub: DocketSubscription) -> Dict[str, Any]:
    """Convert subscription to dict for API response."""
    return {
        "id": sub.id,
        "user_id": sub.user_id,
        "case_id": sub.case_id,
        "case_name": sub.case_name,
        "court": sub.court,
        "jurisdiction": sub.jurisdiction,
        "docket_number": sub.docket_number,
        "alert_types": [t.value for t in sub.alert_types],
        "delivery_methods": [m.value for m in sub.delivery_methods],
        "webhook_url": sub.webhook_url,
        "has_game_theory": sub.game_theory_params is not None,
        "created_at": sub.created_at,
        "last_checked": sub.last_checked,
        "active": sub.active
    }

def alert_to_dict(alert: DocketAlert) -> Dict[str, Any]:
    """Convert alert to dict for API response."""
    return {
        "id": alert.id,
        "subscription_id": alert.subscription_id,
        "case_id": alert.case_id,
        "alert_type": alert.alert_type.value,
        "priority": alert.priority.value,
        "title": alert.title,
        "message": alert.message,
        "filing_details": alert.filing_details,
        "nash_update": alert.nash_update,
        "created_at": alert.created_at,
        "read": alert.read
    }
