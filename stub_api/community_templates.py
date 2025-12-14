"""
Community Templates Service
Based on Addendum PRD v2.2 - Parameter #8: Community Templates

"Users can sell their own 'Game Matrices' (e.g., 'NY Tenant Eviction Strategy') on the platform.
Leverages Whop's community marketplace aspect."

Features:
- Template creation and management
- Marketplace listing and discovery
- Revenue sharing model
- Template versioning and ratings
"""

import os
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib

class TemplateCategory(str, Enum):
    CIVIL_LITIGATION = "civil_litigation"
    CONTRACT_DISPUTES = "contract_disputes"
    EMPLOYMENT_LAW = "employment_law"
    PERSONAL_INJURY = "personal_injury"
    REAL_ESTATE = "real_estate"
    FAMILY_LAW = "family_law"
    CRIMINAL_DEFENSE = "criminal_defense"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    IMMIGRATION = "immigration"
    BANKRUPTCY = "bankruptcy"
    OTHER = "other"

class TemplateStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"

class PricingModel(str, Enum):
    FREE = "free"
    ONE_TIME = "one_time"
    SUBSCRIPTION = "subscription"

@dataclass
class GameMatrix:
    """Represents the game theory matrix in a template"""
    players: List[str]
    strategies: List[List[str]]  # [[P1 strategies], [P2 strategies]]
    payoff_matrix_p1: List[List[float]]
    payoff_matrix_p2: List[List[float]]
    variables: Dict[str, Any]  # Configurable variables
    default_values: Dict[str, float]

@dataclass
class TemplateMetadata:
    jurisdiction: str
    case_types: List[str]
    complexity: str  # simple, medium, complex
    estimated_time: str  # e.g., "15 minutes"
    prerequisites: List[str]
    tags: List[str]

@dataclass
class CommunityTemplate:
    id: str
    author_id: str
    author_name: str
    title: str
    description: str
    category: TemplateCategory
    status: TemplateStatus
    pricing_model: PricingModel
    price: float  # 0 for free
    game_matrix: GameMatrix
    metadata: TemplateMetadata
    instructions: str  # How to use the template
    sample_scenario: Optional[str]
    version: str
    created_at: str
    updated_at: str
    published_at: Optional[str]
    downloads: int
    rating: float
    review_count: int
    revenue_share: float  # Platform takes 30%, author gets 70%

@dataclass 
class TemplateReview:
    id: str
    template_id: str
    user_id: str
    user_name: str
    rating: int  # 1-5
    review_text: str
    helpful_count: int
    created_at: str

@dataclass
class TemplatePurchase:
    id: str
    template_id: str
    user_id: str
    price_paid: float
    author_revenue: float
    platform_revenue: float
    purchased_at: str

# In-memory storage (use database in production)
_templates: Dict[str, CommunityTemplate] = {}
_reviews: Dict[str, List[TemplateReview]] = {}
_purchases: Dict[str, List[TemplatePurchase]] = {}
_user_templates: Dict[str, List[str]] = {}

# Platform revenue share (70% to author, 30% to platform)
AUTHOR_REVENUE_SHARE = 0.70
PLATFORM_REVENUE_SHARE = 0.30

def generate_id(prefix: str = "tpl") -> str:
    """Generate unique ID."""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_part = hashlib.md5(f"{timestamp}{os.urandom(8).hex()}".encode()).hexdigest()[:8]
    return f"{prefix}_{timestamp}_{random_part}"

# Sample templates
def _init_sample_templates():
    """Initialize with sample community templates."""
    sample_templates = [
        CommunityTemplate(
            id="tpl_sample_001",
            author_id="author_001",
            author_name="Legal Strategy Pro",
            title="NY Tenant Eviction Defense Matrix",
            description="Comprehensive game theory matrix for tenant defense in NYC eviction proceedings. Covers holdover, non-payment, and lease violation scenarios.",
            category=TemplateCategory.REAL_ESTATE,
            status=TemplateStatus.PUBLISHED,
            pricing_model=PricingModel.ONE_TIME,
            price=29.99,
            game_matrix=GameMatrix(
                players=["Tenant", "Landlord"],
                strategies=[
                    ["Contest Eviction", "Negotiate Settlement", "Vacate Voluntarily"],
                    ["Proceed with Eviction", "Offer Cash for Keys", "Negotiate Lease Terms"]
                ],
                payoff_matrix_p1=[
                    [70, 85, 60],
                    [50, 75, 40],
                    [20, 30, 35]
                ],
                payoff_matrix_p2=[
                    [30, 40, 80],
                    [60, 50, 70],
                    [90, 85, 75]
                ],
                variables={
                    "rent_arrears": "Amount of unpaid rent",
                    "lease_term_remaining": "Months left on lease",
                    "market_rate_delta": "Current rent vs market rate %"
                },
                default_values={
                    "rent_arrears": 5000,
                    "lease_term_remaining": 6,
                    "market_rate_delta": 0.15
                }
            ),
            metadata=TemplateMetadata(
                jurisdiction="ny_state",
                case_types=["eviction", "landlord_tenant"],
                complexity="medium",
                estimated_time="20 minutes",
                prerequisites=["Basic lease terms", "Eviction notice type"],
                tags=["NYC", "tenant rights", "eviction defense", "housing court"]
            ),
            instructions="1. Enter the current rent arrears amount.\n2. Specify remaining lease term.\n3. Estimate market rate difference.\n4. Review Nash equilibrium for optimal strategy.",
            sample_scenario="Tenant with $5,000 in arrears, 6 months left on lease, rent 15% below market rate.",
            version="1.2.0",
            created_at="2024-06-15T10:00:00Z",
            updated_at="2024-11-20T14:30:00Z",
            published_at="2024-06-20T09:00:00Z",
            downloads=1247,
            rating=4.6,
            review_count=89,
            revenue_share=AUTHOR_REVENUE_SHARE
        ),
        CommunityTemplate(
            id="tpl_sample_002",
            author_id="author_002",
            author_name="Settlement Strategist",
            title="Personal Injury Settlement Calculator",
            description="Data-driven game theory matrix for PI settlement negotiations. Factors in medical costs, lost wages, pain & suffering multipliers.",
            category=TemplateCategory.PERSONAL_INJURY,
            status=TemplateStatus.PUBLISHED,
            pricing_model=PricingModel.ONE_TIME,
            price=49.99,
            game_matrix=GameMatrix(
                players=["Plaintiff", "Insurance Company"],
                strategies=[
                    ["Demand Full Value", "Accept Settlement", "File Lawsuit"],
                    ["Lowball Offer", "Fair Settlement", "Deny Claim"]
                ],
                payoff_matrix_p1=[
                    [40, 70, 30],
                    [60, 80, 50],
                    [85, 65, 20]
                ],
                payoff_matrix_p2=[
                    [80, 50, 90],
                    [60, 40, 70],
                    [30, 55, 95]
                ],
                variables={
                    "medical_expenses": "Total medical bills",
                    "lost_wages": "Lost income to date",
                    "pain_multiplier": "Pain & suffering multiplier (1.5-5x)",
                    "liability_strength": "Strength of liability case (0-1)"
                },
                default_values={
                    "medical_expenses": 25000,
                    "lost_wages": 10000,
                    "pain_multiplier": 2.5,
                    "liability_strength": 0.75
                }
            ),
            metadata=TemplateMetadata(
                jurisdiction="federal",
                case_types=["personal_injury", "insurance"],
                complexity="medium",
                estimated_time="25 minutes",
                prerequisites=["Medical records", "Wage documentation"],
                tags=["PI", "insurance", "settlement", "negotiation"]
            ),
            instructions="1. Enter total medical expenses.\n2. Calculate lost wages.\n3. Select appropriate pain multiplier.\n4. Rate liability strength.\n5. Run Nash analysis.",
            sample_scenario="Car accident victim with $25K medical bills, $10K lost wages, clear liability.",
            version="2.0.1",
            created_at="2024-03-10T08:00:00Z",
            updated_at="2024-10-15T16:00:00Z",
            published_at="2024-03-15T12:00:00Z",
            downloads=2834,
            rating=4.8,
            review_count=156,
            revenue_share=AUTHOR_REVENUE_SHARE
        ),
        CommunityTemplate(
            id="tpl_sample_003",
            author_id="author_003",
            author_name="Contract Law Expert",
            title="Breach of Contract Remedies Matrix",
            description="Strategic analysis for breach of contract disputes. Covers specific performance, damages, and rescission options.",
            category=TemplateCategory.CONTRACT_DISPUTES,
            status=TemplateStatus.PUBLISHED,
            pricing_model=PricingModel.FREE,
            price=0,
            game_matrix=GameMatrix(
                players=["Non-Breaching Party", "Breaching Party"],
                strategies=[
                    ["Sue for Damages", "Seek Specific Performance", "Negotiate Settlement"],
                    ["Defend on Merits", "Offer Cure", "Settle"]
                ],
                payoff_matrix_p1=[
                    [65, 55, 40],
                    [80, 70, 50],
                    [75, 85, 60]
                ],
                payoff_matrix_p2=[
                    [35, 45, 60],
                    [20, 30, 50],
                    [45, 35, 55]
                ],
                variables={
                    "contract_value": "Total contract value",
                    "breach_severity": "Severity of breach (0-1)",
                    "mitigation_costs": "Costs to mitigate damages"
                },
                default_values={
                    "contract_value": 100000,
                    "breach_severity": 0.5,
                    "mitigation_costs": 15000
                }
            ),
            metadata=TemplateMetadata(
                jurisdiction="federal",
                case_types=["contract", "commercial"],
                complexity="simple",
                estimated_time="15 minutes",
                prerequisites=["Contract terms", "Breach details"],
                tags=["contract", "breach", "damages", "remedies"]
            ),
            instructions="1. Enter contract value.\n2. Rate breach severity.\n3. Calculate mitigation costs.\n4. Analyze optimal remedy strategy.",
            sample_scenario="$100K service contract, partial non-performance, $15K mitigation costs.",
            version="1.0.0",
            created_at="2024-08-01T11:00:00Z",
            updated_at="2024-08-01T11:00:00Z",
            published_at="2024-08-05T10:00:00Z",
            downloads=567,
            rating=4.3,
            review_count=42,
            revenue_share=AUTHOR_REVENUE_SHARE
        )
    ]
    
    for template in sample_templates:
        _templates[template.id] = template

# Initialize sample data
_init_sample_templates()

# Template CRUD Operations
def create_template(
    author_id: str,
    author_name: str,
    title: str,
    description: str,
    category: str,
    pricing_model: str,
    price: float,
    game_matrix: Dict[str, Any],
    metadata: Dict[str, Any],
    instructions: str,
    sample_scenario: Optional[str] = None
) -> CommunityTemplate:
    """Create a new community template."""
    template_id = generate_id("tpl")
    
    template = CommunityTemplate(
        id=template_id,
        author_id=author_id,
        author_name=author_name,
        title=title,
        description=description,
        category=TemplateCategory(category),
        status=TemplateStatus.DRAFT,
        pricing_model=PricingModel(pricing_model),
        price=price if pricing_model != "free" else 0,
        game_matrix=GameMatrix(**game_matrix),
        metadata=TemplateMetadata(**metadata),
        instructions=instructions,
        sample_scenario=sample_scenario,
        version="1.0.0",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        published_at=None,
        downloads=0,
        rating=0.0,
        review_count=0,
        revenue_share=AUTHOR_REVENUE_SHARE
    )
    
    _templates[template_id] = template
    
    if author_id not in _user_templates:
        _user_templates[author_id] = []
    _user_templates[author_id].append(template_id)
    
    return template

def get_template(template_id: str) -> Optional[CommunityTemplate]:
    """Get a template by ID."""
    return _templates.get(template_id)

def list_templates(
    category: Optional[str] = None,
    status: str = "published",
    sort_by: str = "downloads",
    limit: int = 20,
    offset: int = 0
) -> List[CommunityTemplate]:
    """List templates with filtering."""
    templates = list(_templates.values())
    
    # Filter by status
    templates = [t for t in templates if t.status.value == status]
    
    # Filter by category
    if category:
        templates = [t for t in templates if t.category.value == category]
    
    # Sort
    if sort_by == "downloads":
        templates.sort(key=lambda x: x.downloads, reverse=True)
    elif sort_by == "rating":
        templates.sort(key=lambda x: x.rating, reverse=True)
    elif sort_by == "newest":
        templates.sort(key=lambda x: x.published_at or x.created_at, reverse=True)
    elif sort_by == "price_low":
        templates.sort(key=lambda x: x.price)
    elif sort_by == "price_high":
        templates.sort(key=lambda x: x.price, reverse=True)
    
    return templates[offset:offset + limit]

def get_user_templates(author_id: str) -> List[CommunityTemplate]:
    """Get all templates by an author."""
    template_ids = _user_templates.get(author_id, [])
    return [_templates[tid] for tid in template_ids if tid in _templates]

def submit_for_review(template_id: str) -> bool:
    """Submit a template for review."""
    template = _templates.get(template_id)
    if template and template.status == TemplateStatus.DRAFT:
        template.status = TemplateStatus.PENDING_REVIEW
        template.updated_at = datetime.now().isoformat()
        return True
    return False

def publish_template(template_id: str) -> bool:
    """Publish a template (admin action)."""
    template = _templates.get(template_id)
    if template and template.status == TemplateStatus.PENDING_REVIEW:
        template.status = TemplateStatus.PUBLISHED
        template.published_at = datetime.now().isoformat()
        template.updated_at = datetime.now().isoformat()
        return True
    return False

def purchase_template(
    template_id: str,
    user_id: str
) -> Optional[TemplatePurchase]:
    """Record a template purchase."""
    template = _templates.get(template_id)
    if not template or template.status != TemplateStatus.PUBLISHED:
        return None
    
    # Check if already purchased
    user_purchases = _purchases.get(user_id, [])
    if any(p.template_id == template_id for p in user_purchases):
        return None  # Already purchased
    
    purchase_id = generate_id("pur")
    author_revenue = template.price * AUTHOR_REVENUE_SHARE
    platform_revenue = template.price * PLATFORM_REVENUE_SHARE
    
    purchase = TemplatePurchase(
        id=purchase_id,
        template_id=template_id,
        user_id=user_id,
        price_paid=template.price,
        author_revenue=author_revenue,
        platform_revenue=platform_revenue,
        purchased_at=datetime.now().isoformat()
    )
    
    if user_id not in _purchases:
        _purchases[user_id] = []
    _purchases[user_id].append(purchase)
    
    # Increment download count
    template.downloads += 1
    
    return purchase

def add_review(
    template_id: str,
    user_id: str,
    user_name: str,
    rating: int,
    review_text: str
) -> Optional[TemplateReview]:
    """Add a review to a template."""
    template = _templates.get(template_id)
    if not template:
        return None
    
    review_id = generate_id("rev")
    review = TemplateReview(
        id=review_id,
        template_id=template_id,
        user_id=user_id,
        user_name=user_name,
        rating=max(1, min(5, rating)),  # Clamp to 1-5
        review_text=review_text,
        helpful_count=0,
        created_at=datetime.now().isoformat()
    )
    
    if template_id not in _reviews:
        _reviews[template_id] = []
    _reviews[template_id].append(review)
    
    # Update template rating
    all_reviews = _reviews[template_id]
    template.rating = sum(r.rating for r in all_reviews) / len(all_reviews)
    template.review_count = len(all_reviews)
    
    return review

def get_template_reviews(template_id: str) -> List[TemplateReview]:
    """Get all reviews for a template."""
    return _reviews.get(template_id, [])

# API Response Helpers
def template_to_dict(template: CommunityTemplate, include_matrix: bool = True) -> Dict[str, Any]:
    """Convert template to dict for API response."""
    result = {
        "id": template.id,
        "author_id": template.author_id,
        "author_name": template.author_name,
        "title": template.title,
        "description": template.description,
        "category": template.category.value,
        "status": template.status.value,
        "pricing_model": template.pricing_model.value,
        "price": template.price,
        "metadata": {
            "jurisdiction": template.metadata.jurisdiction,
            "case_types": template.metadata.case_types,
            "complexity": template.metadata.complexity,
            "estimated_time": template.metadata.estimated_time,
            "tags": template.metadata.tags
        },
        "version": template.version,
        "created_at": template.created_at,
        "updated_at": template.updated_at,
        "published_at": template.published_at,
        "downloads": template.downloads,
        "rating": template.rating,
        "review_count": template.review_count
    }
    
    if include_matrix:
        result["game_matrix"] = {
            "players": template.game_matrix.players,
            "strategies": template.game_matrix.strategies,
            "payoff_matrix_p1": template.game_matrix.payoff_matrix_p1,
            "payoff_matrix_p2": template.game_matrix.payoff_matrix_p2,
            "variables": template.game_matrix.variables,
            "default_values": template.game_matrix.default_values
        }
        result["instructions"] = template.instructions
        result["sample_scenario"] = template.sample_scenario
    
    return result

def review_to_dict(review: TemplateReview) -> Dict[str, Any]:
    """Convert review to dict for API response."""
    return {
        "id": review.id,
        "user_name": review.user_name,
        "rating": review.rating,
        "review_text": review.review_text,
        "helpful_count": review.helpful_count,
        "created_at": review.created_at
    }

def get_categories() -> List[Dict[str, str]]:
    """Get all template categories."""
    return [
        {"id": cat.value, "name": cat.name.replace("_", " ").title()}
        for cat in TemplateCategory
    ]
