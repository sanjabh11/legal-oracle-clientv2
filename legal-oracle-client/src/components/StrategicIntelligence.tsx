import React, { useState, useEffect } from 'react'
import { Brain, TrendingUp, AlertTriangle, Eye, Target, Zap, BarChart3 } from 'lucide-react'
import { getAuthHeaders, LegalDatabaseService } from '../lib/supabase'

// Strategic Intelligence Component - Advanced Legal Analytics
export function StrategicIntelligence() {
  const [analysisType, setAnalysisType] = useState('market_intelligence')
  const [targetEntity, setTargetEntity] = useState('')
  const [analysisScope, setAnalysisScope] = useState({
    jurisdiction: '',
    timeframe: '12_months',
    caseTypes: [],
    competitors: []
  })
  const [intelligenceData, setIntelligenceData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [realTimeAlerts, setRealTimeAlerts] = useState([])

  const analysisTypes = [
    { value: 'market_intelligence', label: 'Market Intelligence', icon: TrendingUp },
    { value: 'competitor_analysis', label: 'Competitor Analysis', icon: Eye },
    { value: 'risk_assessment', label: 'Risk Assessment', icon: AlertTriangle },
    { value: 'opportunity_mapping', label: 'Opportunity Mapping', icon: Target },
    { value: 'trend_prediction', label: 'Trend Prediction', icon: Zap }
  ]

  const caseTypeOptions = [
    'contract_dispute', 'intellectual_property', 'employment', 'merger_acquisition',
    'regulatory_compliance', 'securities_litigation', 'environmental', 'antitrust'
  ]

  useEffect(() => {
    // Simulate real-time alerts
    const alerts = [
      {
        id: 1,
        type: 'regulatory_change',
        priority: 'high',
        message: 'New SEC regulations affecting fintech companies',
        timestamp: new Date().toISOString(),
        impact: 'high'
      },
      {
        id: 2,
        type: 'market_shift',
        priority: 'medium',
        message: 'Increased M&A activity in healthcare sector',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        impact: 'medium'
      },
      {
        id: 3,
        type: 'competitor_move',
        priority: 'low',
        message: 'Competitor filed patent application in AI space',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        impact: 'low'
      }
    ]
    setRealTimeAlerts(alerts)
  }, [])

  const runStrategicAnalysis = async () => {
    if (!targetEntity.trim()) {
      alert('Please specify a target entity for analysis')
      return
    }

    setLoading(true)
    try {
      // Gather data from multiple sources
      const [legalCases, judgePatterns, strategicPatterns] = await Promise.all([
        LegalDatabaseService.getLegalCases({ 
          jurisdiction: analysisScope.jurisdiction,
          case_type: analysisScope.caseTypes[0] 
        }),
        LegalDatabaseService.getJudgePatterns(),
        LegalDatabaseService.getStrategicPatterns()
      ])

      // Enhanced analysis with backend APIs
      const analysisPromises = []

      // Trend forecasting
      if (analysisScope.jurisdiction) {
        const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
        analysisPromises.push(
          fetch(`${apiBase}/trends/forecast?industry=legal&jurisdictions=${analysisScope.jurisdiction}&time_horizon=${analysisScope.timeframe}`, {
            headers: await getAuthHeaders()
          }).then(res => res.ok ? res.json() : null)
        )
      }

      // Legal evolution modeling
      if (analysisScope.caseTypes.length > 0) {
        const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
        analysisPromises.push(
          fetch(`${apiBase}/trends/model?legal_domain=${analysisScope.caseTypes[0]}&time_horizon=${analysisScope.timeframe}`, {
            headers: await getAuthHeaders()
          }).then(res => res.ok ? res.json() : null)
        )
      }

      const [trendData, evolutionData] = await Promise.all(analysisPromises)

      // Compile strategic intelligence
      const intelligence = {
        target_entity: targetEntity,
        analysis_type: analysisType,
        scope: analysisScope,
        data_sources: {
          legal_cases: legalCases.length,
          judge_patterns: judgePatterns.length,
          strategic_patterns: strategicPatterns.length
        },
        market_intelligence: generateMarketIntelligence(legalCases, analysisType),
        competitive_landscape: generateCompetitiveLandscape(legalCases, targetEntity),
        risk_assessment: generateRiskAssessment(legalCases, judgePatterns),
        opportunities: generateOpportunities(strategicPatterns, trendData),
        predictions: generatePredictions(evolutionData, trendData),
        recommendations: generateRecommendations(analysisType, legalCases)
      }

      setIntelligenceData(intelligence)
    } catch (error) {
      console.error('Strategic analysis error:', error)
      alert('Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateMarketIntelligence = (cases, type) => {
    const casesByType = cases.reduce((acc, case_) => {
      const caseType = case_.case_type || 'unknown'
      acc[caseType] = (acc[caseType] || 0) + 1
      return acc
    }, {})

    const totalValue = cases.reduce((sum, case_) => 
      sum + (parseFloat(case_.damages_amount) || 0), 0
    )

    return {
      market_size: totalValue,
      case_distribution: casesByType,
      growth_indicators: {
        case_volume_trend: cases.length > 10 ? 'increasing' : 'stable',
        average_case_value: totalValue / Math.max(cases.length, 1),
        market_concentration: Object.keys(casesByType).length
      },
      key_players: extractKeyPlayers(cases),
      market_dynamics: {
        volatility: 'medium',
        barriers_to_entry: 'high',
        regulatory_environment: 'evolving'
      }
    }
  }

  const generateCompetitiveLandscape = (cases, target) => {
    const competitors = extractCompetitors(cases, target)
    return {
      direct_competitors: competitors.slice(0, 5),
      market_share_analysis: {
        target_entity: calculateMarketShare(cases, target),
        top_competitors: competitors.map(comp => ({
          name: comp,
          estimated_share: Math.random() * 0.3 + 0.1,
          strength: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
        }))
      },
      competitive_advantages: [
        'Strong precedent track record',
        'Experienced legal team',
        'Industry specialization'
      ],
      threats: [
        'New market entrants',
        'Regulatory changes',
        'Technology disruption'
      ]
    }
  }

  const generateRiskAssessment = (cases, judges) => {
    const riskFactors = []
    
    if (cases.length > 0) {
      const lossRate = cases.filter(c => 
        c.outcome_label && c.outcome_label.includes('defendant')
      ).length / cases.length
      
      if (lossRate > 0.3) {
        riskFactors.push({
          type: 'litigation_risk',
          level: 'high',
          description: 'Higher than average loss rate in similar cases'
        })
      }
    }

    const avgReversalRate = judges.length > 0 
      ? judges.reduce((sum, j) => sum + (j.reversal_rate || 0), 0) / judges.length
      : 0.1

    if (avgReversalRate > 0.15) {
      riskFactors.push({
        type: 'judicial_risk',
        level: 'medium',
        description: 'Judges in jurisdiction have higher reversal rates'
      })
    }

    return {
      overall_risk_score: Math.min(riskFactors.length * 0.3, 1.0),
      risk_factors: riskFactors,
      mitigation_strategies: [
        'Diversify case portfolio',
        'Strengthen evidence collection',
        'Consider alternative dispute resolution'
      ]
    }
  }

  const generateOpportunities = (patterns, trendData) => {
    const opportunities = []

    if (patterns.length > 0) {
      const successfulPatterns = patterns.filter(p => p.success_rate > 0.7)
      opportunities.push({
        type: 'strategic_opportunity',
        title: 'High-Success Strategy Patterns',
        description: `${successfulPatterns.length} proven strategies with >70% success rate`,
        potential_impact: 'high',
        timeline: '3-6 months'
      })
    }

    if (trendData?.predicted_changes) {
      opportunities.push({
        type: 'regulatory_opportunity',
        title: 'Regulatory Change Preparation',
        description: 'Position for upcoming regulatory changes',
        potential_impact: 'medium',
        timeline: '6-12 months'
      })
    }

    return opportunities
  }

  const generatePredictions = (evolutionData, trendData) => {
    return {
      short_term: [
        'Increased settlement rates in contract disputes',
        'Growing emphasis on alternative dispute resolution',
        'Technology adoption in legal processes'
      ],
      medium_term: [
        'Regulatory framework evolution',
        'Market consolidation trends',
        'New legal service delivery models'
      ],
      long_term: [
        'AI integration in legal decision-making',
        'Blockchain adoption for legal records',
        'Global harmonization of legal standards'
      ],
      confidence_levels: {
        short_term: 0.85,
        medium_term: 0.65,
        long_term: 0.45
      }
    }
  }

  const generateRecommendations = (type, cases) => {
    const baseRecommendations = {
      market_intelligence: [
        'Focus on high-growth case types',
        'Monitor competitor strategies',
        'Invest in market research capabilities'
      ],
      competitor_analysis: [
        'Develop competitive differentiation',
        'Monitor competitor case outcomes',
        'Identify partnership opportunities'
      ],
      risk_assessment: [
        'Implement risk monitoring systems',
        'Diversify practice areas',
        'Strengthen case preparation processes'
      ]
    }

    return baseRecommendations[type] || [
      'Conduct regular strategic reviews',
      'Invest in data analytics capabilities',
      'Build strategic partnerships'
    ]
  }

  const extractKeyPlayers = (cases) => {
    // Extract unique entities from case data
    const players = new Set()
    cases.forEach(case_ => {
      if (case_.metadata?.parties) {
        case_.metadata.parties.forEach(party => players.add(party))
      }
    })
    return Array.from(players).slice(0, 10)
  }

  const extractCompetitors = (cases, target) => {
    // Simple competitor extraction logic
    const competitors = new Set()
    cases.forEach(case_ => {
      if (case_.case_name && !case_.case_name.includes(target)) {
        const entities = case_.case_name.split(' v. ')
        entities.forEach(entity => {
          if (entity !== target && entity.length > 3) {
            competitors.add(entity.trim())
          }
        })
      }
    })
    return Array.from(competitors).slice(0, 10)
  }

  const calculateMarketShare = (cases, target) => {
    const targetCases = cases.filter(case_ => 
      case_.case_name && case_.case_name.includes(target)
    ).length
    return cases.length > 0 ? targetCases / cases.length : 0
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Brain className="mr-3 text-blue-400" />
          Strategic Legal Intelligence
        </h1>
        <p className="text-slate-300">
          Advanced analytics and intelligence for strategic legal decision-making
        </p>
      </div>

      {/* Real-time Alerts */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Zap className="mr-2 text-yellow-400" />
          Real-time Intelligence Alerts
        </h2>
        
        <div className="space-y-3">
          {realTimeAlerts.map(alert => (
            <div key={alert.id} className={`border-l-4 pl-4 py-2 ${
              alert.priority === 'high' ? 'border-red-400 bg-red-500/10' :
              alert.priority === 'medium' ? 'border-yellow-400 bg-yellow-500/10' :
              'border-blue-400 bg-blue-500/10'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white text-sm font-medium">{alert.message}</p>
                  <p className="text-slate-400 text-xs">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  alert.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                  alert.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                  {alert.impact} impact
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Configuration */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Intelligence Analysis Setup</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Analysis Type
              </label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {analysisTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Target Entity
              </label>
              <input
                type="text"
                value={targetEntity}
                onChange={(e) => setTargetEntity(e.target.value)}
                placeholder="Company, law firm, or individual to analyze"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Jurisdiction
              </label>
              <select
                value={analysisScope.jurisdiction}
                onChange={(e) => setAnalysisScope({...analysisScope, jurisdiction: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Jurisdictions</option>
                <option value="Federal">Federal</option>
                <option value="California">California</option>
                <option value="New York">New York</option>
                <option value="Delaware">Delaware</option>
                <option value="Texas">Texas</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Analysis Timeframe
              </label>
              <select
                value={analysisScope.timeframe}
                onChange={(e) => setAnalysisScope({...analysisScope, timeframe: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="6_months">6 Months</option>
                <option value="12_months">12 Months</option>
                <option value="24_months">24 Months</option>
                <option value="60_months">5 Years</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Case Types (Select multiple)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {caseTypeOptions.map(caseType => (
                  <label key={caseType} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={analysisScope.caseTypes.includes(caseType)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAnalysisScope({
                            ...analysisScope,
                            caseTypes: [...analysisScope.caseTypes, caseType]
                          })
                        } else {
                          setAnalysisScope({
                            ...analysisScope,
                            caseTypes: analysisScope.caseTypes.filter(t => t !== caseType)
                          })
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-slate-300 text-sm capitalize">
                      {caseType.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={runStrategicAnalysis}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-5 w-5" />
                Run Strategic Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Intelligence Results */}
      {intelligenceData && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <BarChart3 className="mr-2 text-green-400" />
              Strategic Intelligence Summary
            </h2>
            
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {intelligenceData.data_sources.legal_cases}
                </div>
                <div className="text-slate-300 text-sm">Cases Analyzed</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {Math.round(intelligenceData.risk_assessment.overall_risk_score * 100)}%
                </div>
                <div className="text-slate-300 text-sm">Risk Score</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {intelligenceData.opportunities.length}
                </div>
                <div className="text-slate-300 text-sm">Opportunities</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">
                  ${(intelligenceData.market_intelligence.market_size / 1000000).toFixed(1)}M
                </div>
                <div className="text-slate-300 text-sm">Market Size</div>
              </div>
            </div>
          </div>

          {/* Market Intelligence */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TrendingUp className="mr-2 text-blue-400" />
              Market Intelligence
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">Case Distribution</h4>
                <div className="space-y-2">
                  {Object.entries(intelligenceData.market_intelligence.case_distribution).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-slate-300 capitalize">{type.replace('_', ' ')}</span>
                      <span className="text-blue-300 font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">Market Dynamics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Volatility:</span>
                    <span className="text-yellow-300 capitalize">
                      {intelligenceData.market_intelligence.market_dynamics.volatility}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Barriers to Entry:</span>
                    <span className="text-red-300 capitalize">
                      {intelligenceData.market_intelligence.market_dynamics.barriers_to_entry}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Regulatory Environment:</span>
                    <span className="text-purple-300 capitalize">
                      {intelligenceData.market_intelligence.market_dynamics.regulatory_environment}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Opportunities */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Target className="mr-2 text-green-400" />
              Strategic Opportunities
            </h3>
            
            <div className="space-y-4">
              {intelligenceData.opportunities.map((opportunity, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-white">{opportunity.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      opportunity.potential_impact === 'high' ? 'bg-green-500/20 text-green-300' :
                      opportunity.potential_impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {opportunity.potential_impact} impact
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mb-2">{opportunity.description}</p>
                  <div className="text-slate-400 text-xs">
                    Timeline: {opportunity.timeline}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Predictions */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Zap className="mr-2 text-purple-400" />
              Strategic Predictions
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">
                  Short-term (6-12 months)
                  <span className="ml-2 text-xs text-green-300">
                    {Math.round(intelligenceData.predictions.confidence_levels.short_term * 100)}% confidence
                  </span>
                </h4>
                <ul className="space-y-2">
                  {intelligenceData.predictions.short_term.map((prediction, index) => (
                    <li key={index} className="text-slate-300 text-sm flex items-start">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      {prediction}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">
                  Medium-term (1-3 years)
                  <span className="ml-2 text-xs text-yellow-300">
                    {Math.round(intelligenceData.predictions.confidence_levels.medium_term * 100)}% confidence
                  </span>
                </h4>
                <ul className="space-y-2">
                  {intelligenceData.predictions.medium_term.map((prediction, index) => (
                    <li key={index} className="text-slate-300 text-sm flex items-start">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      {prediction}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">
                  Long-term (3+ years)
                  <span className="ml-2 text-xs text-blue-300">
                    {Math.round(intelligenceData.predictions.confidence_levels.long_term * 100)}% confidence
                  </span>
                </h4>
                <ul className="space-y-2">
                  {intelligenceData.predictions.long_term.map((prediction, index) => (
                    <li key={index} className="text-slate-300 text-sm flex items-start">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      {prediction}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Strategic Recommendations</h3>
            
            <div className="space-y-3">
              {intelligenceData.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-slate-300">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
