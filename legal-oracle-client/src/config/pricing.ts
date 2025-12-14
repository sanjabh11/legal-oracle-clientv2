/**
 * Pricing Configuration for Legal Oracle Platform
 * Based on Monetization Research v2.1 Strategic Validation
 * 
 * Tier Strategy: $29 (Tripwire) → $99 (Core Revenue) → $299 (Expansion)
 * Target LTV:CAC Ratio: 5.9:1
 */

export type PricingTier = 'starter' | 'professional' | 'firm' | 'guest';

export interface TierFeatures {
  // Search & Research
  courtlistenerSearch: boolean;
  searchResultsLimit: number;
  
  // AI Features
  aiMotionDrafting: boolean;
  glassBoxCitations: boolean;
  
  // Analytics
  judgeAnalyticsLite: boolean;
  judgeAnalyticsFull: boolean;
  
  // Monitoring
  docketMonitoring: boolean;
  dailyAlerts: number;
  
  // Premium Data
  pacerFetchesPerMonth: number;
  
  // Team Features
  userSeats: number;
  apiAccess: boolean;
  whitelabelReports: boolean;
  prioritySupport: boolean;
  
  // Community
  communityAccess: boolean;
  
  // Templates
  basicTemplates: boolean;
  advancedTemplates: boolean;
}

export interface PricingTierConfig {
  id: PricingTier;
  name: string;
  price: number;
  priceDisplay: string;
  billingPeriod: 'monthly' | 'yearly';
  description: string;
  targetPersona: string;
  strategicGoal: string;
  features: TierFeatures;
  whopProductId?: string;
  stripePriceId?: string;
}

export const PRICING_TIERS: Record<PricingTier, PricingTierConfig> = {
  guest: {
    id: 'guest',
    name: 'Guest',
    price: 0,
    priceDisplay: 'Free',
    billingPeriod: 'monthly',
    description: 'Limited trial access',
    targetPersona: 'Evaluators',
    strategicGoal: 'Conversion funnel entry',
    features: {
      courtlistenerSearch: true,
      searchResultsLimit: 3,
      aiMotionDrafting: false,
      glassBoxCitations: false,
      judgeAnalyticsLite: false,
      judgeAnalyticsFull: false,
      docketMonitoring: false,
      dailyAlerts: 0,
      pacerFetchesPerMonth: 0,
      userSeats: 1,
      apiAccess: false,
      whitelabelReports: false,
      prioritySupport: false,
      communityAccess: false,
      basicTemplates: false,
      advancedTemplates: false,
    },
  },
  
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceDisplay: '$29/mo',
    billingPeriod: 'monthly',
    description: 'Essential legal research tools',
    targetPersona: 'Law Students, Paralegals, New Solos',
    strategicGoal: 'Acquisition - Low barrier to entry to build trust',
    features: {
      courtlistenerSearch: true,
      searchResultsLimit: 50,
      aiMotionDrafting: false,
      glassBoxCitations: true,
      judgeAnalyticsLite: false,
      judgeAnalyticsFull: false,
      docketMonitoring: false,
      dailyAlerts: 0,
      pacerFetchesPerMonth: 0,
      userSeats: 1,
      apiAccess: false,
      whitelabelReports: false,
      prioritySupport: false,
      communityAccess: true,
      basicTemplates: true,
      advancedTemplates: false,
    },
    whopProductId: undefined, // Set via VITE_WHOP_STARTER_PRODUCT_ID
  },
  
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 99,
    priceDisplay: '$99/mo',
    billingPeriod: 'monthly',
    description: 'Full AI-powered legal intelligence',
    targetPersona: 'Solo Practitioners, Contract Lawyers',
    strategicGoal: 'Revenue - Primary MRR driver',
    features: {
      courtlistenerSearch: true,
      searchResultsLimit: 500,
      aiMotionDrafting: true,
      glassBoxCitations: true,
      judgeAnalyticsLite: true,
      judgeAnalyticsFull: false,
      docketMonitoring: true,
      dailyAlerts: 10,
      pacerFetchesPerMonth: 5,
      userSeats: 1,
      apiAccess: false,
      whitelabelReports: false,
      prioritySupport: false,
      communityAccess: true,
      basicTemplates: true,
      advancedTemplates: true,
    },
    whopProductId: undefined, // Set via VITE_WHOP_PROFESSIONAL_PRODUCT_ID
  },
  
  firm: {
    id: 'firm',
    name: 'Firm / Agency',
    price: 299,
    priceDisplay: '$299/mo',
    billingPeriod: 'monthly',
    description: 'Team collaboration with API access',
    targetPersona: 'Small Firms (2-5 partners)',
    strategicGoal: 'Expansion - Capture teams consolidating subscriptions',
    features: {
      courtlistenerSearch: true,
      searchResultsLimit: -1, // Unlimited
      aiMotionDrafting: true,
      glassBoxCitations: true,
      judgeAnalyticsLite: true,
      judgeAnalyticsFull: true,
      docketMonitoring: true,
      dailyAlerts: 50,
      pacerFetchesPerMonth: 25,
      userSeats: 5,
      apiAccess: true,
      whitelabelReports: true,
      prioritySupport: true,
      communityAccess: true,
      basicTemplates: true,
      advancedTemplates: true,
    },
    whopProductId: undefined, // Set via VITE_WHOP_FIRM_PRODUCT_ID
  },
};

/**
 * Feature display names for UI
 */
export const FEATURE_DISPLAY_NAMES: Record<keyof TierFeatures, string> = {
  courtlistenerSearch: 'CourtListener Search',
  searchResultsLimit: 'Search Results',
  aiMotionDrafting: 'AI Motion Drafting (Glass Box)',
  glassBoxCitations: 'Glass Box Citations',
  judgeAnalyticsLite: 'Judge Analytics (Lite)',
  judgeAnalyticsFull: 'Judge Analytics (Full)',
  docketMonitoring: 'Daily Docket Monitoring',
  dailyAlerts: 'Daily Alerts',
  pacerFetchesPerMonth: 'Real-time PACER Fetches/mo',
  userSeats: 'User Seats',
  apiAccess: 'API Access',
  whitelabelReports: 'White-label Reports',
  prioritySupport: 'Priority Support',
  communityAccess: 'Community Access',
  basicTemplates: 'Basic Templates',
  advancedTemplates: 'Advanced Templates',
};

/**
 * Check if a feature is available for a given tier
 */
export function hasFeature(tier: PricingTier, feature: keyof TierFeatures): boolean {
  const config = PRICING_TIERS[tier];
  if (!config) return false;
  
  const value = config.features[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0 || value === -1; // -1 = unlimited
  return false;
}

/**
 * Get feature limit for a tier
 */
export function getFeatureLimit(tier: PricingTier, feature: keyof TierFeatures): number {
  const config = PRICING_TIERS[tier];
  if (!config) return 0;
  
  const value = config.features[feature];
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? -1 : 0;
  return 0;
}

/**
 * Get tier by Whop product ID
 */
export function getTierByWhopProduct(productId: string): PricingTier | null {
  for (const [tierId, config] of Object.entries(PRICING_TIERS)) {
    if (config.whopProductId === productId) {
      return tierId as PricingTier;
    }
  }
  return null;
}

/**
 * Calculate LTV for a tier
 * Formula: LTV = (ARPU × Gross Margin %) / Churn Rate
 */
export function calculateLTV(tier: PricingTier): number {
  const config = PRICING_TIERS[tier];
  const grossMargin = 0.90; // 90% software margin
  const churnRate = 0.05; // 5% monthly churn
  
  return (config.price * grossMargin) / churnRate;
}

/**
 * Get recommended upgrade path
 */
export function getUpgradePath(currentTier: PricingTier): PricingTier | null {
  const paths: Record<PricingTier, PricingTier | null> = {
    guest: 'starter',
    starter: 'professional',
    professional: 'firm',
    firm: null,
  };
  return paths[currentTier];
}

export default PRICING_TIERS;
