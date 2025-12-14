"""
Pricing Service for Legal Oracle Platform
Based on Monetization Research v2.1 Strategic Validation

Handles:
- Tier validation and entitlement checks
- Feature gating by subscription level
- Usage tracking and limits
- Whop webhook processing
"""

import os
import hmac
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
from dataclasses import dataclass
from fastapi import HTTPException

# Pricing Tiers
class PricingTier(str, Enum):
    GUEST = "guest"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    FIRM = "firm"

# Tier Configuration
@dataclass
class TierFeatures:
    courtlistener_search: bool
    search_results_limit: int
    ai_motion_drafting: bool
    glass_box_citations: bool
    judge_analytics_lite: bool
    judge_analytics_full: bool
    docket_monitoring: bool
    daily_alerts: int
    pacer_fetches_per_month: int
    user_seats: int
    api_access: bool
    whitelabel_reports: bool
    priority_support: bool
    community_access: bool
    basic_templates: bool
    advanced_templates: bool

@dataclass
class TierConfig:
    id: PricingTier
    name: str
    price: float
    features: TierFeatures

# Tier Definitions
TIER_CONFIGS: Dict[PricingTier, TierConfig] = {
    PricingTier.GUEST: TierConfig(
        id=PricingTier.GUEST,
        name="Guest",
        price=0,
        features=TierFeatures(
            courtlistener_search=True,
            search_results_limit=3,
            ai_motion_drafting=False,
            glass_box_citations=False,
            judge_analytics_lite=False,
            judge_analytics_full=False,
            docket_monitoring=False,
            daily_alerts=0,
            pacer_fetches_per_month=0,
            user_seats=1,
            api_access=False,
            whitelabel_reports=False,
            priority_support=False,
            community_access=False,
            basic_templates=False,
            advanced_templates=False,
        )
    ),
    PricingTier.STARTER: TierConfig(
        id=PricingTier.STARTER,
        name="Starter",
        price=29,
        features=TierFeatures(
            courtlistener_search=True,
            search_results_limit=50,
            ai_motion_drafting=False,
            glass_box_citations=True,
            judge_analytics_lite=False,
            judge_analytics_full=False,
            docket_monitoring=False,
            daily_alerts=0,
            pacer_fetches_per_month=0,
            user_seats=1,
            api_access=False,
            whitelabel_reports=False,
            priority_support=False,
            community_access=True,
            basic_templates=True,
            advanced_templates=False,
        )
    ),
    PricingTier.PROFESSIONAL: TierConfig(
        id=PricingTier.PROFESSIONAL,
        name="Professional",
        price=99,
        features=TierFeatures(
            courtlistener_search=True,
            search_results_limit=500,
            ai_motion_drafting=True,
            glass_box_citations=True,
            judge_analytics_lite=True,
            judge_analytics_full=False,
            docket_monitoring=True,
            daily_alerts=10,
            pacer_fetches_per_month=5,
            user_seats=1,
            api_access=False,
            whitelabel_reports=False,
            priority_support=False,
            community_access=True,
            basic_templates=True,
            advanced_templates=True,
        )
    ),
    PricingTier.FIRM: TierConfig(
        id=PricingTier.FIRM,
        name="Firm / Agency",
        price=299,
        features=TierFeatures(
            courtlistener_search=True,
            search_results_limit=-1,  # Unlimited
            ai_motion_drafting=True,
            glass_box_citations=True,
            judge_analytics_lite=True,
            judge_analytics_full=True,
            docket_monitoring=True,
            daily_alerts=50,
            pacer_fetches_per_month=25,
            user_seats=5,
            api_access=True,
            whitelabel_reports=True,
            priority_support=True,
            community_access=True,
            basic_templates=True,
            advanced_templates=True,
        )
    ),
}

# Usage tracking storage (in production, use database)
_usage_cache: Dict[str, Dict[str, Any]] = {}

def get_tier_config(tier: PricingTier) -> TierConfig:
    """Get configuration for a pricing tier."""
    return TIER_CONFIGS.get(tier, TIER_CONFIGS[PricingTier.GUEST])

def has_feature(tier: PricingTier, feature: str) -> bool:
    """Check if a tier has access to a specific feature."""
    config = get_tier_config(tier)
    value = getattr(config.features, feature, None)
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value > 0 or value == -1  # -1 = unlimited
    return False

def get_feature_limit(tier: PricingTier, feature: str) -> int:
    """Get the limit for a specific feature."""
    config = get_tier_config(tier)
    value = getattr(config.features, feature, 0)
    if isinstance(value, int):
        return value
    if isinstance(value, bool):
        return -1 if value else 0
    return 0

def require_feature(tier: PricingTier, feature: str, feature_name: str = None) -> None:
    """Raise exception if tier doesn't have access to feature."""
    if not has_feature(tier, feature):
        display_name = feature_name or feature.replace('_', ' ').title()
        raise HTTPException(
            status_code=403,
            detail=f"Feature '{display_name}' requires an upgraded subscription. "
                   f"Your current tier: {tier.value}. Please upgrade to access this feature."
        )

def check_usage_limit(user_id: str, tier: PricingTier, feature: str) -> Dict[str, Any]:
    """Check if user has exceeded their usage limit for a feature."""
    limit = get_feature_limit(tier, feature)
    
    if limit == -1:
        return {"allowed": True, "limit": "unlimited", "used": 0}
    
    # Get usage for this month
    month_key = datetime.now().strftime("%Y-%m")
    user_usage = _usage_cache.get(user_id, {})
    feature_usage = user_usage.get(f"{feature}_{month_key}", 0)
    
    return {
        "allowed": feature_usage < limit,
        "limit": limit,
        "used": feature_usage,
        "remaining": max(0, limit - feature_usage),
    }

def increment_usage(user_id: str, feature: str, amount: int = 1) -> None:
    """Increment usage counter for a feature."""
    month_key = datetime.now().strftime("%Y-%m")
    
    if user_id not in _usage_cache:
        _usage_cache[user_id] = {}
    
    key = f"{feature}_{month_key}"
    _usage_cache[user_id][key] = _usage_cache[user_id].get(key, 0) + amount

def get_user_usage_summary(user_id: str, tier: PricingTier) -> Dict[str, Any]:
    """Get usage summary for a user."""
    month_key = datetime.now().strftime("%Y-%m")
    user_usage = _usage_cache.get(user_id, {})
    
    tracked_features = [
        "search_results_limit",
        "daily_alerts",
        "pacer_fetches_per_month",
    ]
    
    summary = {}
    for feature in tracked_features:
        limit = get_feature_limit(tier, feature)
        used = user_usage.get(f"{feature}_{month_key}", 0)
        summary[feature] = {
            "limit": limit if limit != -1 else "unlimited",
            "used": used,
            "remaining": "unlimited" if limit == -1 else max(0, limit - used),
        }
    
    return summary

# Whop Webhook Processing
WHOP_WEBHOOK_SECRET = os.getenv("WHOP_WEBHOOK_SECRET", "")

def verify_whop_signature(payload: bytes, signature: str) -> bool:
    """Verify Whop webhook signature."""
    if not WHOP_WEBHOOK_SECRET:
        return False
    
    expected = hmac.new(
        WHOP_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)

def process_whop_webhook(event: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Process Whop webhook events."""
    user_id = data.get("user_id")
    product_id = data.get("product_id")
    
    if event == "membership.went_valid":
        # Grant access
        return {
            "action": "grant_access",
            "user_id": user_id,
            "product_id": product_id,
            "tier": map_product_to_tier(product_id),
        }
    
    elif event == "membership.went_invalid":
        # Revoke access
        return {
            "action": "revoke_access",
            "user_id": user_id,
            "product_id": product_id,
        }
    
    elif event == "membership.canceled":
        # Schedule access revocation
        valid_until = data.get("valid_until")
        return {
            "action": "schedule_revocation",
            "user_id": user_id,
            "product_id": product_id,
            "valid_until": valid_until,
        }
    
    elif event == "payment.failed":
        # Handle failed payment
        return {
            "action": "payment_failed",
            "user_id": user_id,
            "product_id": product_id,
            "amount": data.get("amount"),
        }
    
    elif event == "payment.succeeded":
        # Confirm payment
        return {
            "action": "payment_confirmed",
            "user_id": user_id,
            "product_id": product_id,
            "amount": data.get("amount"),
        }
    
    return {"action": "unknown", "event": event}

def map_product_to_tier(product_id: str) -> PricingTier:
    """Map Whop product ID to pricing tier."""
    # These should be configured via environment variables
    product_tier_map = {
        os.getenv("WHOP_STARTER_PRODUCT_ID", ""): PricingTier.STARTER,
        os.getenv("WHOP_PROFESSIONAL_PRODUCT_ID", ""): PricingTier.PROFESSIONAL,
        os.getenv("WHOP_FIRM_PRODUCT_ID", ""): PricingTier.FIRM,
    }
    
    return product_tier_map.get(product_id, PricingTier.GUEST)

# LTV/CAC Calculations
def calculate_ltv(tier: PricingTier, gross_margin: float = 0.90, churn_rate: float = 0.05) -> float:
    """
    Calculate Lifetime Value for a tier.
    Formula: LTV = (ARPU × Gross Margin %) / Churn Rate
    """
    config = get_tier_config(tier)
    return (config.price * gross_margin) / churn_rate

def get_upgrade_recommendation(current_tier: PricingTier) -> Optional[Dict[str, Any]]:
    """Get upgrade recommendation for current tier."""
    upgrade_paths = {
        PricingTier.GUEST: PricingTier.STARTER,
        PricingTier.STARTER: PricingTier.PROFESSIONAL,
        PricingTier.PROFESSIONAL: PricingTier.FIRM,
        PricingTier.FIRM: None,
    }
    
    next_tier = upgrade_paths.get(current_tier)
    if not next_tier:
        return None
    
    current_config = get_tier_config(current_tier)
    next_config = get_tier_config(next_tier)
    
    # Highlight key differences
    key_upgrades = []
    if not current_config.features.ai_motion_drafting and next_config.features.ai_motion_drafting:
        key_upgrades.append("AI Motion Drafting (Glass Box)")
    if not current_config.features.docket_monitoring and next_config.features.docket_monitoring:
        key_upgrades.append("Daily Docket Monitoring")
    if not current_config.features.judge_analytics_lite and next_config.features.judge_analytics_lite:
        key_upgrades.append("Judge Analytics")
    if next_config.features.pacer_fetches_per_month > current_config.features.pacer_fetches_per_month:
        key_upgrades.append(f"{next_config.features.pacer_fetches_per_month} PACER Fetches/month")
    if next_config.features.api_access and not current_config.features.api_access:
        key_upgrades.append("API Access")
    
    return {
        "current_tier": current_tier.value,
        "recommended_tier": next_tier.value,
        "current_price": current_config.price,
        "recommended_price": next_config.price,
        "price_difference": next_config.price - current_config.price,
        "key_upgrades": key_upgrades,
        "ltv_increase": calculate_ltv(next_tier) - calculate_ltv(current_tier),
    }
