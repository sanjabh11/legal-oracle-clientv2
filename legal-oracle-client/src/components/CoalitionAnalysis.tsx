import React, { useState, useEffect } from 'react'
import { Shield, Users, Plus, Minus, BarChart3, Target, Zap } from 'lucide-react'
import { GameTheoryEngine, getAuthHeaders } from '../lib/supabase'

// Coalition Analysis Component - Advanced Game Theory for Multi-Party Scenarios
export function CoalitionAnalysis() {
  const [parties, setParties] = useState([
    { id: 1, name: 'Party A', power: 30, resources: 100000, interests: ['contract_enforcement'] },
    { id: 2, name: 'Party B', power: 25, resources: 80000, interests: ['damage_minimization'] },
    { id: 3, name: 'Party C', power: 20, resources: 60000, interests: ['reputation_protection'] }
  ])
  const [coalitions, setCoalitions] = useState([])
  const [analysisResults, setAnalysisResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scenarioType, setScenarioType] = useState('litigation')
  const [totalValue, setTotalValue] = useState(1000000)

  const interestOptions = [
    'contract_enforcement', 'damage_minimization', 'reputation_protection',
    'cost_reduction', 'time_efficiency', 'precedent_setting',
    'market_position', 'regulatory_compliance', 'settlement_priority'
  ]

  const addParty = () => {
    const newParty = {
      id: Date.now(),
      name: `Party ${String.fromCharCode(65 + parties.length)}`,
      power: 15,
      resources: 50000,
      interests: ['contract_enforcement']
    }
    setParties([...parties, newParty])
  }

  const removeParty = (partyId) => {
    if (parties.length <= 2) {
      alert('Minimum 2 parties required')
      return
    }
    setParties(parties.filter(p => p.id !== partyId))
    setCoalitions(coalitions.filter(coalition => 
      !coalition.members.includes(partyId)
    ))
  }

  const updateParty = (partyId, field, value) => {
    setParties(parties.map(p => 
      p.id === partyId ? { ...p, [field]: value } : p
    ))
  }

  const addInterest = (partyId, interest) => {
    setParties(parties.map(p => 
      p.id === partyId 
        ? { ...p, interests: [...new Set([...p.interests, interest])] }
        : p
    ))
  }

  const removeInterest = (partyId, interest) => {
    setParties(parties.map(p => 
      p.id === partyId 
        ? { ...p, interests: p.interests.filter(i => i !== interest) }
        : p
    ))
  }

  const generateCoalitions = () => {
    const allCoalitions = []
    const n = parties.length
    
    for (let i = 1; i < Math.pow(2, n); i++) {
      const coalition = []
      for (let j = 0; j < n; j++) {
        if (i & (1 << j)) {
          coalition.push(parties[j].id)
        }
      }
      if (coalition.length >= 2) {
        allCoalitions.push({
          id: i,
          members: coalition,
          value: calculateCoalitionValue(coalition),
          stability: calculateStability(coalition),
          formation_probability: calculateFormationProbability(coalition)
        })
      }
    }
    
    setCoalitions(allCoalitions.sort((a, b) => b.value - a.value))
  }

  const calculateCoalitionValue = (memberIds) => {
    const members = parties.filter(p => memberIds.includes(p.id))
    const totalResources = members.reduce((sum, p) => sum + p.resources, 0)
    const totalPower = members.reduce((sum, p) => sum + p.power, 0)
    const commonInterests = findCommonInterests(members)
    const synergyBonus = commonInterests.length * 0.1
    const sizeBonus = Math.log(members.length) * 0.05
    const baseValue = (totalPower / 100) * totalValue
    const finalValue = baseValue * (1 + synergyBonus + sizeBonus)
    return Math.round(finalValue)
  }

  const calculateStability = (memberIds) => {
    const members = parties.filter(p => memberIds.includes(p.id))
    const powers = members.map(m => m.power)
    const avgPower = powers.reduce((sum, p) => sum + p, 0) / powers.length
    const powerVariance = powers.reduce((sum, p) => sum + Math.pow(p - avgPower, 2), 0) / powers.length
    const powerStability = Math.max(0, 1 - powerVariance / 100)
    const commonInterests = findCommonInterests(members)
    const totalInterests = members.reduce((sum, m) => sum + m.interests.length, 0)
    const interestAlignment = totalInterests > 0 ? (commonInterests.length * members.length) / totalInterests : 0
    return Math.min(1, (powerStability + interestAlignment) / 2)
  }

  const calculateFormationProbability = (memberIds) => {
    const members = parties.filter(p => memberIds.includes(p.id))
    const sizePenalty = Math.pow(0.8, members.length - 2)
    const commonInterests = findCommonInterests(members)
    const alignmentBonus = commonInterests.length * 0.15
    const resourceRange = Math.max(...members.map(m => m.resources)) - Math.min(...members.map(m => m.resources))
    const resourceCompatibility = Math.max(0, 1 - resourceRange / 200000)
    return Math.min(1, sizePenalty + alignmentBonus + resourceCompatibility * 0.3)
  }

  const findCommonInterests = (members) => {
    if (members.length === 0) return []
    let common = [...members[0].interests]
    for (let i = 1; i < members.length; i++) {
      common = common.filter(interest => members[i].interests.includes(interest))
    }
    return common
  }

  const runCoalitionAnalysis = async () => {
    setLoading(true)
    try {
      generateCoalitions()
      const shapleyValues = calculateShapleyValues()
      const analysis = {
        coalitions: coalitions,
        shapley_values: shapleyValues,
        stability_analysis: analyzeStability(),
        recommendations: generateRecommendations()
      }
      setAnalysisResults(analysis)
    } catch (error) {
      console.error('Coalition analysis error:', error)
      alert('Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const calculateShapleyValues = () => {
    const shapley = {}
    parties.forEach(party => {
      shapley[party.id] = 0
    })

    parties.forEach(party => {
      let totalContribution = 0
      let permutations = 0

      for (let i = 0; i < 100; i++) {
        const randomOrder = [...parties].sort(() => Math.random() - 0.5)
        const partyIndex = randomOrder.findIndex(p => p.id === party.id)
        const coalitionBefore = randomOrder.slice(0, partyIndex).map(p => p.id)
        const coalitionWith = [...coalitionBefore, party.id]
        const valueBefore = coalitionBefore.length > 0 ? calculateCoalitionValue(coalitionBefore) : 0
        const valueWith = calculateCoalitionValue(coalitionWith)
        totalContribution += valueWith - valueBefore
        permutations++
      }

      shapley[party.id] = permutations > 0 ? totalContribution / permutations : 0
    })

    return shapley
  }

  const analyzeStability = () => {
    const topCoalitions = coalitions.slice(0, 5)
    const avgStability = topCoalitions.reduce((sum, c) => sum + c.stability, 0) / Math.max(topCoalitions.length, 1)
    
    return {
      overall_stability: avgStability,
      most_stable_coalition: topCoalitions.reduce((best, current) => 
        current.stability > (best?.stability || 0) ? current : best, null
      ),
      instability_factors: identifyInstabilityFactors()
    }
  }

  const identifyInstabilityFactors = () => {
    const factors = []
    const powers = parties.map(p => p.power)
    const maxPower = Math.max(...powers)
    const minPower = Math.min(...powers)
    if (maxPower - minPower > 20) {
      factors.push({
        type: 'power_imbalance',
        severity: 'high',
        description: 'Significant power imbalance between parties'
      })
    }
    return factors
  }

  const generateRecommendations = () => {
    const recommendations = []
    if (coalitions.length > 0) {
      const bestCoalition = coalitions[0]
      recommendations.push({
        type: 'optimal_coalition',
        title: 'Pursue High-Value Coalition',
        description: `Form coalition with ${bestCoalition.members.length} parties for maximum value`,
        priority: 'high'
      })
    }
    return recommendations
  }

  const getPartyName = (partyId) => {
    const party = parties.find(p => p.id === partyId)
    return party ? party.name : `Party ${partyId}`
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Shield className="mr-3 text-blue-400" />
          Coalition Analysis
        </h1>
        <p className="text-slate-300">
          Analyze multi-party coalitions using advanced game theory and cooperative game models
        </p>
      </div>

      {/* Scenario Configuration */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Scenario Setup</h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Scenario Type
            </label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="litigation">Multi-Party Litigation</option>
              <option value="merger">Merger & Acquisition</option>
              <option value="joint_venture">Joint Venture</option>
              <option value="regulatory">Regulatory Compliance</option>
              <option value="settlement">Settlement Negotiation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Total Value at Stake ($)
            </label>
            <input
              type="number"
              value={totalValue}
              onChange={(e) => setTotalValue(parseInt(e.target.value) || 1000000)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Party Configuration */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Parties & Interests</h2>
          <button
            onClick={addParty}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Party
          </button>
        </div>

        <div className="space-y-6">
          {parties.map((party) => (
            <div key={party.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Party Name
                  </label>
                  <input
                    type="text"
                    value={party.name}
                    onChange={(e) => updateParty(party.id, 'name', e.target.value)}
                    className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Power (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={party.power}
                    onChange={(e) => updateParty(party.id, 'power', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Resources ($)
                  </label>
                  <input
                    type="number"
                    value={party.resources}
                    onChange={(e) => updateParty(party.id, 'resources', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  {parties.length > 2 && (
                    <button
                      onClick={() => removeParty(party.id)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Interests
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {party.interests.map((interest) => (
                    <span
                      key={interest}
                      className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-xs flex items-center"
                    >
                      {interest.replace('_', ' ')}
                      <button
                        onClick={() => removeInterest(party.id, interest)}
                        className="ml-1 text-blue-400 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  onChange={(e) => {
                    if (e.target.value && !party.interests.includes(e.target.value)) {
                      addInterest(party.id, e.target.value)
                    }
                    e.target.value = ''
                  }}
                  className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Add interest...</option>
                  {interestOptions.filter(opt => !party.interests.includes(opt)).map(option => (
                    <option key={option} value={option}>
                      {option.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Controls */}
      <div className="text-center mb-8">
        <button
          onClick={runCoalitionAnalysis}
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
              <BarChart3 className="mr-2 h-5 w-5" />
              Analyze Coalitions
            </>
          )}
        </button>
      </div>

      {/* Analysis Results */}
      {analysisResults && (
        <div className="space-y-6">
          {/* Coalition Rankings */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Target className="mr-2 text-green-400" />
              Coalition Analysis Results
            </h2>
            
            <div className="space-y-4">
              {coalitions.slice(0, 10).map((coalition, index) => (
                <div key={coalition.id} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-white mb-1">
                        Coalition #{index + 1}: {coalition.members.map(id => getPartyName(id)).join(' + ')}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-green-300">
                          Value: ${coalition.value.toLocaleString()}
                        </span>
                        <span className="text-blue-300">
                          Stability: {Math.round(coalition.stability * 100)}%
                        </span>
                        <span className="text-purple-300">
                          Formation Probability: {Math.round(coalition.formation_probability * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      index === 0 ? 'bg-green-500/20 text-green-300' :
                      index < 3 ? 'bg-blue-500/20 text-blue-300' :
                      'bg-slate-500/20 text-slate-300'
                    }`}>
                      {index === 0 ? 'Optimal' : index < 3 ? 'Strong' : 'Viable'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shapley Values */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Users className="mr-2 text-blue-400" />
              Fair Value Distribution (Shapley Values)
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(analysisResults.shapley_values).map(([partyId, value]) => (
                <div key={partyId} className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">{getPartyName(parseInt(partyId))}</h3>
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    ${Math.round(value).toLocaleString()}
                  </div>
                  <div className="text-slate-400 text-sm">
                    {Math.round((value / totalValue) * 100)}% of total value
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
