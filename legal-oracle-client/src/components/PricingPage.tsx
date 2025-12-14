/**
 * Pricing Page Component
 * Based on Monetization Research v2.1 - Tiered Pricing Strategy
 * 
 * Tiers:
 * - Starter ($29/mo): Law Students, Paralegals, New Solos
 * - Professional ($99/mo): Solo Practitioners, Contract Lawyers  
 * - Firm ($299/mo): Small Firms (2-5 partners)
 */

import React, { useState, useEffect } from 'react'
import { 
  Check, 
  X, 
  Zap, 
  Users, 
  Building2, 
  Star,
  ArrowRight,
  Shield,
  Clock,
  HelpCircle
} from 'lucide-react'
import { PRICING_TIERS, PricingTier, FEATURE_DISPLAY_NAMES, hasFeature, getFeatureLimit } from '../config/pricing'

interface PricingPageProps {
  currentTier?: PricingTier
  onSelectPlan?: (tier: PricingTier) => void
}

export function PricingPage({ currentTier = 'guest', onSelectPlan }: PricingPageProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null)
  
  const tiers: PricingTier[] = ['starter', 'professional', 'firm']
  
  const tierIcons = {
    starter: Zap,
    professional: Star,
    firm: Building2,
  }
  
  const tierColors = {
    starter: 'blue',
    professional: 'purple',
    firm: 'amber',
  }
  
  const handleSelectPlan = (tier: PricingTier) => {
    setSelectedTier(tier)
    onSelectPlan?.(tier)
  }
  
  // Key features to highlight
  const highlightFeatures = [
    'courtlistenerSearch',
    'aiMotionDrafting',
    'glassBoxCitations',
    'judgeAnalyticsLite',
    'docketMonitoring',
    'pacerFetchesPerMonth',
    'apiAccess',
    'communityAccess',
  ]
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Legal Intelligence Plan
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            AI-powered legal research with Glass Box transparency. 
            Start with a plan that fits your practice.
          </p>
          
          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center bg-slate-800 rounded-full p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-green-400 text-xs">Save 20%</span>
            </button>
          </div>
        </div>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {tiers.map((tierId) => {
            const tier = PRICING_TIERS[tierId]
            const Icon = tierIcons[tierId as keyof typeof tierIcons]
            const color = tierColors[tierId as keyof typeof tierColors]
            const isPopular = tierId === 'professional'
            const isCurrent = currentTier === tierId
            
            const price = billingPeriod === 'yearly' 
              ? Math.round(tier.price * 0.8 * 12) 
              : tier.price
            
            return (
              <div
                key={tierId}
                className={`relative bg-slate-800/50 rounded-2xl border ${
                  isPopular 
                    ? 'border-purple-500 ring-2 ring-purple-500/20' 
                    : 'border-slate-700'
                } overflow-hidden`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}
                
                {/* Header */}
                <div className={`p-6 bg-gradient-to-r from-${color}-900/50 to-${color}-800/30 border-b border-slate-700`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg bg-${color}-500/20`}>
                      <Icon className={`h-6 w-6 text-${color}-400`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                      <p className="text-sm text-slate-400">{tier.targetPersona}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      ${billingPeriod === 'yearly' ? Math.round(tier.price * 0.8) : tier.price}
                    </span>
                    <span className="text-slate-400">/mo</span>
                    {billingPeriod === 'yearly' && (
                      <span className="ml-2 text-sm text-green-400">
                        (billed annually)
                      </span>
                    )}
                  </div>
                  
                  <p className="mt-2 text-sm text-slate-300">{tier.description}</p>
                </div>
                
                {/* Features */}
                <div className="p-6">
                  <ul className="space-y-3">
                    {highlightFeatures.map((feature) => {
                      const featureKey = feature as keyof typeof tier.features
                      const hasIt = hasFeature(tierId, featureKey)
                      const limit = getFeatureLimit(tierId, featureKey)
                      
                      return (
                        <li key={feature} className="flex items-start gap-3">
                          {hasIt ? (
                            <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={hasIt ? 'text-slate-200' : 'text-slate-500'}>
                            {FEATURE_DISPLAY_NAMES[featureKey]}
                            {typeof limit === 'number' && limit > 0 && limit !== -1 && (
                              <span className="text-slate-400 text-sm ml-1">
                                ({limit}{feature.includes('perMonth') ? '/mo' : ''})
                              </span>
                            )}
                            {limit === -1 && (
                              <span className="text-green-400 text-sm ml-1">(Unlimited)</span>
                            )}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  
                  {/* User Seats */}
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="h-4 w-4" />
                      <span>{tier.features.userSeats} user seat{tier.features.userSeats > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                
                {/* CTA Button */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => handleSelectPlan(tierId)}
                    disabled={isCurrent}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : isPopular
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isCurrent ? (
                      'Current Plan'
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-8 mb-16">
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="h-5 w-5 text-green-400" />
            <span>Bank-level encryption</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="h-5 w-5 text-blue-400" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <HelpCircle className="h-5 w-5 text-purple-400" />
            <span>24/7 support for Pro+</span>
          </div>
        </div>
        
        {/* Feature Comparison Table */}
        <div className="bg-slate-800/30 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold text-white">Compare All Features</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-4 text-slate-400 font-medium">Feature</th>
                  {tiers.map((tierId) => (
                    <th key={tierId} className="p-4 text-center text-white font-medium">
                      {PRICING_TIERS[tierId].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(FEATURE_DISPLAY_NAMES).map((feature) => (
                  <tr key={feature} className="border-b border-slate-700/50">
                    <td className="p-4 text-slate-300">
                      {FEATURE_DISPLAY_NAMES[feature as keyof typeof FEATURE_DISPLAY_NAMES]}
                    </td>
                    {tiers.map((tierId) => {
                      const featureKey = feature as keyof typeof PRICING_TIERS.starter.features
                      const value = PRICING_TIERS[tierId].features[featureKey]
                      
                      return (
                        <td key={`${tierId}-${feature}`} className="p-4 text-center">
                          {typeof value === 'boolean' ? (
                            value ? (
                              <Check className="h-5 w-5 text-green-400 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="text-slate-200">
                              {value === -1 ? 'Unlimited' : value}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
              <h3 className="font-semibold text-white mb-2">Can I upgrade or downgrade anytime?</h3>
              <p className="text-slate-400 text-sm">
                Yes! You can change your plan at any time. When upgrading, you'll be charged the prorated difference. 
                When downgrading, the change takes effect at the end of your billing cycle.
              </p>
            </div>
            
            <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
              <h3 className="font-semibold text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-slate-400 text-sm">
                We accept all major credit cards through our secure payment processor Whop. 
                Enterprise clients can also pay via invoice.
              </p>
            </div>
            
            <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
              <h3 className="font-semibold text-white mb-2">Is my data secure?</h3>
              <p className="text-slate-400 text-sm">
                Absolutely. We use bank-level encryption and never store your client documents on our servers. 
                All analysis is done in real-time and data is processed securely.
              </p>
            </div>
            
            <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700">
              <h3 className="font-semibold text-white mb-2">What is Glass Box transparency?</h3>
              <p className="text-slate-400 text-sm">
                Unlike black-box AI that just gives you answers, our Glass Box approach shows you exactly 
                which cases and factors influenced every prediction, with direct links to sources.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingPage
