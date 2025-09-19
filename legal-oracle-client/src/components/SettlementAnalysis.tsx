import React, { useState, useEffect } from 'react'
import { Handshake, DollarSign, Clock, TrendingUp, AlertTriangle, Calculator, BarChart3 } from 'lucide-react'
import { GameTheoryEngine, getAuthHeaders } from '../lib/supabase'

// Settlement Analysis Component - Game Theory Settlement Optimization
export function SettlementAnalysis() {
  const [caseDetails, setCaseDetails] = useState({
    caseType: '',
    disputeValue: '',
    legalCosts: '',
    timeToTrial: '',
    caseStrength: 0.5,
    publicityRisk: 0.3,
    relationshipValue: 0.2
  })
  const [playerStrategies, setPlayerStrategies] = useState([
    { name: 'Aggressive Litigation', selected: false },
    { name: 'Settlement Priority', selected: true },
    { name: 'Collaborative Negotiation', selected: false },
    { name: 'Delay Tactics', selected: false }
  ])
  const [settlementAnalysis, setSettlementAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customStrategy, setCustomStrategy] = useState('')

  const handleAnalyzeSettlement = async () => {
    if (!caseDetails.disputeValue || !caseDetails.legalCosts) {
      alert('Please fill in dispute value and legal costs')
      return
    }

    setLoading(true)
    try {
      // Use local game theory engine for settlement probability
      const selectedStrategies = playerStrategies.filter(s => s.selected)
      const analysis = GameTheoryEngine.calculateSettlementProbability(
        {
          precedent_value: caseDetails.caseStrength,
          dispute_value: parseFloat(caseDetails.disputeValue),
          legal_costs: parseFloat(caseDetails.legalCosts),
          time_to_trial: parseInt(caseDetails.timeToTrial) || 12,
          publicity_risk: caseDetails.publicityRisk,
          relationship_value: caseDetails.relationshipValue
        },
        selectedStrategies
      )

      // Enhance with backend API call for additional insights
      try {
        const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
        const response = await fetch(`${apiBase}/analyze_strategy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders())
          },
          body: JSON.stringify({
            case_id: `settlement_${Date.now()}`,
            candidate_strategies: selectedStrategies.map(s => s.name),
            params: {
              dispute_value: caseDetails.disputeValue,
              case_strength: caseDetails.caseStrength
            }
          })
        })

        if (response.ok) {
          const strategyData = await response.json()
          analysis.strategy_scores = strategyData.strategy_scores
        }
      } catch (error) {
        console.log('Backend strategy analysis unavailable, using local calculations')
      }

      setSettlementAnalysis(analysis)
    } catch (error) {
      console.error('Settlement analysis error:', error)
      alert('Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addCustomStrategy = () => {
    if (customStrategy.trim()) {
      setPlayerStrategies([
        ...playerStrategies,
        { name: customStrategy.trim(), selected: true }
      ])
      setCustomStrategy('')
    }
  }

  const toggleStrategy = (index) => {
    const updated = [...playerStrategies]
    updated[index].selected = !updated[index].selected
    setPlayerStrategies(updated)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Handshake className="mr-3 text-blue-400" />
          Settlement Analysis & Optimization
        </h1>
        <p className="text-slate-300">
          Analyze settlement probability and optimize negotiation strategies using game theory
        </p>
      </div>

      {/* Case Details Input */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Case Information</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Case Type
              </label>
              <select
                value={caseDetails.caseType}
                onChange={(e) => setCaseDetails({...caseDetails, caseType: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Case Type</option>
                <option value="contract_dispute">Contract Dispute</option>
                <option value="employment">Employment Law</option>
                <option value="personal_injury">Personal Injury</option>
                <option value="intellectual_property">Intellectual Property</option>
                <option value="commercial">Commercial Litigation</option>
                <option value="real_estate">Real Estate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Dispute Value ($)
              </label>
              <input
                type="number"
                value={caseDetails.disputeValue}
                onChange={(e) => setCaseDetails({...caseDetails, disputeValue: e.target.value})}
                placeholder="e.g., 500000"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Estimated Legal Costs ($)
              </label>
              <input
                type="number"
                value={caseDetails.legalCosts}
                onChange={(e) => setCaseDetails({...caseDetails, legalCosts: e.target.value})}
                placeholder="e.g., 100000"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Time to Trial (months)
              </label>
              <input
                type="number"
                value={caseDetails.timeToTrial}
                onChange={(e) => setCaseDetails({...caseDetails, timeToTrial: e.target.value})}
                placeholder="e.g., 18"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Case Strength: {Math.round(caseDetails.caseStrength * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={caseDetails.caseStrength}
                onChange={(e) => setCaseDetails({...caseDetails, caseStrength: parseFloat(e.target.value)})}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Publicity Risk: {Math.round(caseDetails.publicityRisk * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={caseDetails.publicityRisk}
                onChange={(e) => setCaseDetails({...caseDetails, publicityRisk: parseFloat(e.target.value)})}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Relationship Value: {Math.round(caseDetails.relationshipValue * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={caseDetails.relationshipValue}
                onChange={(e) => setCaseDetails({...caseDetails, relationshipValue: parseFloat(e.target.value)})}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Selection */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Negotiation Strategies</h2>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {playerStrategies.map((strategy, index) => (
            <div key={index} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={strategy.selected}
                onChange={() => toggleStrategy(index)}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label className="text-slate-300">{strategy.name}</label>
            </div>
          ))}
        </div>

        <div className="flex space-x-4">
          <input
            type="text"
            value={customStrategy}
            onChange={(e) => setCustomStrategy(e.target.value)}
            placeholder="Add custom strategy..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addCustomStrategy()}
          />
          <button
            onClick={addCustomStrategy}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Strategy
          </button>
        </div>
      </div>

      {/* Analyze Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleAnalyzeSettlement}
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
              <Calculator className="mr-2 h-5 w-5" />
              Analyze Settlement Probability
            </>
          )}
        </button>
      </div>

      {/* Settlement Analysis Results */}
      {settlementAnalysis && (
        <div className="space-y-6">
          {/* Main Settlement Probability */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <BarChart3 className="mr-2 text-green-400" />
              Settlement Analysis Results
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {Math.round(settlementAnalysis.probability * 100)}%
                </div>
                <div className="text-slate-300">Settlement Probability</div>
                <div className={`text-sm mt-1 ${
                  settlementAnalysis.probability > 0.7 ? 'text-green-300' :
                  settlementAnalysis.probability > 0.5 ? 'text-yellow-300' :
                  'text-red-300'
                }`}>
                  {settlementAnalysis.recommendation}
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  ${Math.round(settlementAnalysis.estimatedSavings).toLocaleString()}
                </div>
                <div className="text-slate-300">Estimated Savings</div>
                <div className="text-sm text-slate-400 mt-1">vs. going to trial</div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {Math.round((1 - settlementAnalysis.riskAnalysis.trialRisk) * 100)}%
                </div>
                <div className="text-slate-300">Risk Reduction</div>
                <div className="text-sm text-slate-400 mt-1">through settlement</div>
              </div>
            </div>
          </div>

          {/* Risk Analysis */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-orange-400" />
              Risk Analysis
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Trial Risk</h4>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Risk Level:</span>
                  <span className={`font-medium ${
                    settlementAnalysis.riskAnalysis.trialRisk > 0.7 ? 'text-red-300' :
                    settlementAnalysis.riskAnalysis.trialRisk > 0.4 ? 'text-yellow-300' :
                    'text-green-300'
                  }`}>
                    {Math.round(settlementAnalysis.riskAnalysis.trialRisk * 100)}%
                  </span>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Cost Risk</h4>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Risk Level:</span>
                  <span className={`font-medium ${
                    settlementAnalysis.riskAnalysis.costRisk > 0.7 ? 'text-red-300' :
                    settlementAnalysis.riskAnalysis.costRisk > 0.4 ? 'text-yellow-300' :
                    'text-green-300'
                  }`}>
                    {Math.round(settlementAnalysis.riskAnalysis.costRisk * 100)}%
                  </span>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Time Risk</h4>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Risk Level:</span>
                  <span className={`font-medium ${
                    settlementAnalysis.riskAnalysis.timeRisk > 0.7 ? 'text-red-300' :
                    settlementAnalysis.riskAnalysis.timeRisk > 0.4 ? 'text-yellow-300' :
                    'text-green-300'
                  }`}>
                    {Math.round(settlementAnalysis.riskAnalysis.timeRisk * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contributing Factors */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Contributing Factors</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">Factor Analysis</h4>
                <div className="space-y-3">
                  {Object.entries(settlementAnalysis.factors).map(([factor, value]) => (
                    <div key={factor} className="flex items-center justify-between">
                      <span className="text-slate-300 capitalize">{factor.replace(/([A-Z])/g, ' $1')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-600 rounded-full h-2">
                          <div 
                            className="bg-blue-400 h-2 rounded-full" 
                            style={{width: `${value * 100}%`}}
                          ></div>
                        </div>
                        <span className="text-blue-300 text-sm w-8">{Math.round(value * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategy Scores */}
              {settlementAnalysis.strategy_scores && (
                <div>
                  <h4 className="font-medium text-white mb-3">Strategy Effectiveness</h4>
                  <div className="space-y-3">
                    {settlementAnalysis.strategy_scores.slice(0, 3).map((strategy, index) => (
                      <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white text-sm font-medium">{strategy.strategy}</span>
                          <span className="text-green-300 font-medium">{Math.round(strategy.score * 100)}%</span>
                        </div>
                        <p className="text-slate-400 text-xs">{strategy.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
