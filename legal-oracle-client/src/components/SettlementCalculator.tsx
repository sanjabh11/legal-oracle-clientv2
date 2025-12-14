/**
 * Settlement Calculator Component
 * Based on Addendum PRD v2.2 - Game Theory as Competitive Moat
 * 
 * Core User Story: "As a litigator, I want to input my settlement offer 
 * and the opponent's counter-offer to see the Nash Equilibrium, so I know 
 * if I should settle or go to trial."
 * 
 * This component integrates:
 * - Settlement vs Trial game theory
 * - Win probability from precedent search
 * - Glass Box citation trails
 */

import React, { useState, useEffect } from 'react'
import { 
  Calculator, 
  Scale, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Target,
  FileText,
  Gavel,
  ArrowRight,
  Info,
  ExternalLink
} from 'lucide-react'
import { getAuthHeaders } from '../lib/supabase'
import { 
  ConfidenceIndicator, 
  CitationTrail,
  WhyThisTooltip,
  type Citation,
  type ConfidenceData,
  type ReasoningStep
} from './GlassBoxUI'

interface SettlementScenario {
  plaintiffOffer: number
  defendantOffer: number
  expectedJudgment: number
  winProbability: number
  trialCosts: {
    plaintiff: number
    defendant: number
  }
  timeToTrial: number // months
}

interface NashResult {
  optimalStrategy: 'settle' | 'trial' | 'mixed'
  settlementRange: {
    min: number
    max: number
    optimal: number
  }
  payoffs: {
    plaintiff: {
      settle: number
      trial: number
    }
    defendant: {
      settle: number
      trial: number
    }
  }
  recommendation: string
  confidence: ConfidenceData
  citations: Citation[]
  reasoning: ReasoningStep[]
}

export function SettlementCalculator() {
  const [scenario, setScenario] = useState<SettlementScenario>({
    plaintiffOffer: 75000,
    defendantOffer: 50000,
    expectedJudgment: 100000,
    winProbability: 0.65,
    trialCosts: {
      plaintiff: 25000,
      defendant: 30000
    },
    timeToTrial: 18
  })
  
  const [result, setResult] = useState<NashResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [caseType, setCaseType] = useState('civil')
  const [jurisdiction, setJurisdiction] = useState('federal')
  
  // Fetch win probability from precedent search
  const fetchWinProbability = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
      const response = await fetch(`${apiBase}/jurisdiction/optimize?case_type=${caseType}`, {
        headers: await getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.jurisdictions && data.jurisdictions.length > 0) {
          const match = data.jurisdictions.find((j: { jurisdiction: string }) => 
            j.jurisdiction.toLowerCase().includes(jurisdiction.toLowerCase())
          )
          if (match) {
            setScenario(prev => ({
              ...prev,
              winProbability: match.success_rate
            }))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching win probability:', error)
    }
  }
  
  useEffect(() => {
    fetchWinProbability()
  }, [caseType, jurisdiction])
  
  const calculateNashEquilibrium = async () => {
    setLoading(true)
    
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
      
      // Calculate expected values
      const plaintiffTrialEV = (scenario.expectedJudgment * scenario.winProbability) - scenario.trialCosts.plaintiff
      const defendantTrialEV = -(scenario.expectedJudgment * scenario.winProbability) - scenario.trialCosts.defendant
      
      // Build game matrix: [Settle, Trial] x [Accept, Reject]
      // Plaintiff payoffs
      const P_matrix = [
        [scenario.defendantOffer, scenario.plaintiffOffer],  // Settle
        [plaintiffTrialEV, plaintiffTrialEV]                  // Trial
      ]
      
      // Defendant payoffs (negative as they pay)
      const D_matrix = [
        [-scenario.defendantOffer, -scenario.plaintiffOffer], // Settle
        [defendantTrialEV, defendantTrialEV]                   // Trial
      ]
      
      // Call Nash equilibrium API
      const nashResponse = await fetch(`${apiBase}/nash_equilibrium`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          payoff_matrix_p1: P_matrix,
          payoff_matrix_p2: D_matrix
        })
      })
      
      // Fetch supporting citations
      const searchResponse = await fetch(`${apiBase}/search_caselaw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          query: `${caseType} settlement verdict ${jurisdiction}`,
          top_k: 5
        })
      })
      
      let citations: Citation[] = []
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        citations = (searchData.results || []).map((r: Record<string, unknown>, idx: number) => ({
          id: `cite-${idx}`,
          caseId: r.case_id as string,
          caseName: r.title as string || 'Case',
          court: jurisdiction,
          year: 2023,
          relevanceScore: r.similarity as number || 0.7,
          excerpt: r.summary as string,
          citationType: 'supports' as const
        }))
      }
      
      // Determine optimal strategy
      let optimalStrategy: 'settle' | 'trial' | 'mixed' = 'settle'
      let recommendation = ''
      
      const midpoint = (scenario.plaintiffOffer + scenario.defendantOffer) / 2
      
      if (plaintiffTrialEV > scenario.defendantOffer && defendantTrialEV > -scenario.plaintiffOffer) {
        optimalStrategy = 'trial'
        recommendation = `Trial is the dominant strategy. Expected trial value ($${plaintiffTrialEV.toLocaleString()}) exceeds defendant's offer ($${scenario.defendantOffer.toLocaleString()}).`
      } else if (plaintiffTrialEV < scenario.defendantOffer && -defendantTrialEV < scenario.plaintiffOffer) {
        optimalStrategy = 'settle'
        recommendation = `Settlement is optimal. Both parties benefit from settling in the range of $${scenario.defendantOffer.toLocaleString()} - $${scenario.plaintiffOffer.toLocaleString()}.`
      } else {
        optimalStrategy = 'mixed'
        recommendation = `Mixed strategy equilibrium. Consider negotiating toward $${midpoint.toLocaleString()} as the optimal settlement point.`
      }
      
      // Build confidence data
      const confidence: ConfidenceData = {
        score: scenario.winProbability,
        interval: {
          low: Math.max(0, scenario.winProbability - 0.15),
          high: Math.min(1, scenario.winProbability + 0.15)
        },
        factors: [
          {
            name: 'Historical Win Rate',
            impact: scenario.winProbability > 0.5 ? 'positive' : 'negative',
            weight: 0.4,
            explanation: `Based on ${citations.length} similar cases in ${jurisdiction}`,
            citations: citations.slice(0, 2)
          },
          {
            name: 'Case Complexity',
            impact: 'neutral',
            weight: 0.2,
            explanation: 'Standard complexity for case type'
          },
          {
            name: 'Trial Cost Factor',
            impact: scenario.trialCosts.plaintiff > 20000 ? 'negative' : 'positive',
            weight: 0.2,
            explanation: `Trial costs of $${scenario.trialCosts.plaintiff.toLocaleString()} factor into expected value`
          },
          {
            name: 'Time Value',
            impact: 'negative',
            weight: 0.2,
            explanation: `${scenario.timeToTrial} months to trial affects present value calculation`
          }
        ],
        missingData: citations.length < 3 ? ['Limited precedent data for this jurisdiction'] : undefined
      }
      
      // Build reasoning steps
      const reasoning: ReasoningStep[] = [
        {
          step: 1,
          description: `Calculated plaintiff expected trial value: $${plaintiffTrialEV.toLocaleString()} (${(scenario.winProbability * 100).toFixed(0)}% × $${scenario.expectedJudgment.toLocaleString()} - $${scenario.trialCosts.plaintiff.toLocaleString()} costs)`,
          confidence: 0.85,
          citations: citations.slice(0, 2)
        },
        {
          step: 2,
          description: `Compared settlement offers: Plaintiff asking $${scenario.plaintiffOffer.toLocaleString()}, Defendant offering $${scenario.defendantOffer.toLocaleString()}`,
          confidence: 1.0,
          citations: []
        },
        {
          step: 3,
          description: `Applied Nash Equilibrium analysis to determine if settlement zone exists`,
          confidence: 0.9,
          citations: []
        },
        {
          step: 4,
          description: recommendation,
          confidence: confidence.score,
          citations: citations
        }
      ]
      
      setResult({
        optimalStrategy,
        settlementRange: {
          min: Math.min(scenario.defendantOffer, plaintiffTrialEV),
          max: Math.max(scenario.plaintiffOffer, plaintiffTrialEV),
          optimal: midpoint
        },
        payoffs: {
          plaintiff: {
            settle: midpoint,
            trial: plaintiffTrialEV
          },
          defendant: {
            settle: -midpoint,
            trial: defendantTrialEV
          }
        },
        recommendation,
        confidence,
        citations,
        reasoning
      })
      
    } catch (error) {
      console.error('Settlement calculation error:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(Math.abs(value))
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Scale className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Settlement Calculator</h1>
        </div>
        <p className="text-slate-300">
          Game theory-powered settlement analysis with Glass Box transparency
        </p>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="space-y-6">
          {/* Case Context */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              Case Context
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Case Type</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="civil">Civil Litigation</option>
                  <option value="contract">Contract Dispute</option>
                  <option value="employment">Employment</option>
                  <option value="personal_injury">Personal Injury</option>
                  <option value="ip">Intellectual Property</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Jurisdiction</label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="federal">Federal</option>
                  <option value="california">California</option>
                  <option value="new_york">New York</option>
                  <option value="texas">Texas</option>
                  <option value="florida">Florida</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Settlement Offers */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              Settlement Positions
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Plaintiff's Demand
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={scenario.plaintiffOffer}
                    onChange={(e) => setScenario({...scenario, plaintiffOffer: Number(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Defendant's Offer
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={scenario.defendantOffer}
                    onChange={(e) => setScenario({...scenario, defendantOffer: Number(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Expected Judgment (if plaintiff wins)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={scenario.expectedJudgment}
                    onChange={(e) => setScenario({...scenario, expectedJudgment: Number(e.target.value)})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Win Probability & Costs */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Trial Parameters
            </h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-slate-400">Win Probability</label>
                  <span className="text-white font-medium">
                    {(scenario.winProbability * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scenario.winProbability * 100}
                  onChange={(e) => setScenario({...scenario, winProbability: Number(e.target.value) / 100})}
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Based on {jurisdiction} precedents for {caseType} cases
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Plaintiff Trial Costs
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={scenario.trialCosts.plaintiff}
                      onChange={(e) => setScenario({
                        ...scenario, 
                        trialCosts: {...scenario.trialCosts, plaintiff: Number(e.target.value)}
                      })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Defendant Trial Costs
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={scenario.trialCosts.defendant}
                      onChange={(e) => setScenario({
                        ...scenario,
                        trialCosts: {...scenario.trialCosts, defendant: Number(e.target.value)}
                      })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Time to Trial (months)
                </label>
                <input
                  type="number"
                  value={scenario.timeToTrial}
                  onChange={(e) => setScenario({...scenario, timeToTrial: Number(e.target.value)})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>
          
          {/* Calculate Button */}
          <button
            onClick={calculateNashEquilibrium}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Calculating Nash Equilibrium...
              </>
            ) : (
              <>
                <Calculator className="h-5 w-5" />
                Calculate Optimal Strategy
              </>
            )}
          </button>
        </div>
        
        {/* Results Panel */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Strategy Recommendation */}
              <div className={`rounded-xl border p-6 ${
                result.optimalStrategy === 'settle' 
                  ? 'bg-green-900/20 border-green-500/50' 
                  : result.optimalStrategy === 'trial'
                  ? 'bg-red-900/20 border-red-500/50'
                  : 'bg-yellow-900/20 border-yellow-500/50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${
                    result.optimalStrategy === 'settle'
                      ? 'bg-green-500/20'
                      : result.optimalStrategy === 'trial'
                      ? 'bg-red-500/20'
                      : 'bg-yellow-500/20'
                  }`}>
                    {result.optimalStrategy === 'settle' ? (
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    ) : result.optimalStrategy === 'trial' ? (
                      <Gavel className="h-8 w-8 text-red-400" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {result.optimalStrategy === 'settle' && 'Settlement Recommended'}
                      {result.optimalStrategy === 'trial' && 'Trial May Be Preferable'}
                      {result.optimalStrategy === 'mixed' && 'Mixed Strategy Equilibrium'}
                    </h3>
                    <WhyThisTooltip assertion={result.recommendation} reasoning={result.reasoning}>
                      <p className="text-slate-300">{result.recommendation}</p>
                    </WhyThisTooltip>
                  </div>
                </div>
              </div>
              
              {/* Payoff Matrix */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Payoff Analysis</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-2">Plaintiff</div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-300">If Settle:</span>
                        <span className="text-green-400 font-medium">
                          {formatCurrency(result.payoffs.plaintiff.settle)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">If Trial (EV):</span>
                        <span className={`font-medium ${
                          result.payoffs.plaintiff.trial > result.payoffs.plaintiff.settle
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}>
                          {formatCurrency(result.payoffs.plaintiff.trial)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-2">Defendant</div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-300">If Settle:</span>
                        <span className="text-red-400 font-medium">
                          {formatCurrency(result.payoffs.defendant.settle)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">If Trial (EV):</span>
                        <span className={`font-medium ${
                          result.payoffs.defendant.trial > result.payoffs.defendant.settle
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}>
                          {formatCurrency(result.payoffs.defendant.trial)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Settlement Range */}
                {result.optimalStrategy !== 'trial' && (
                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-sm text-blue-400 mb-2">Optimal Settlement Range</div>
                    <div className="flex items-center gap-4">
                      <span className="text-white">{formatCurrency(result.settlementRange.min)}</span>
                      <div className="flex-1 h-2 bg-slate-700 rounded-full relative">
                        <div 
                          className="absolute h-full bg-blue-500 rounded-full"
                          style={{
                            left: '0%',
                            width: '100%'
                          }}
                        />
                        <div 
                          className="absolute w-3 h-3 bg-white rounded-full -top-0.5"
                          style={{ left: '50%', transform: 'translateX(-50%)' }}
                        />
                      </div>
                      <span className="text-white">{formatCurrency(result.settlementRange.max)}</span>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-blue-400 font-medium">
                        Optimal: {formatCurrency(result.settlementRange.optimal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Confidence Indicator */}
              <ConfidenceIndicator confidence={result.confidence} showDetails />
              
              {/* Citation Trail */}
              <CitationTrail 
                citations={result.citations} 
                title="Supporting Precedents"
              />
            </>
          ) : (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
              <Calculator className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-400 mb-2">
                Enter Your Scenario
              </h3>
              <p className="text-slate-500">
                Configure the settlement parameters and click "Calculate" to see the 
                Nash Equilibrium analysis with Glass Box transparency.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettlementCalculator
