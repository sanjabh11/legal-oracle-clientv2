import React, { useState, useEffect } from 'react'
import { Calculator, Users, Zap, TrendingUp, AlertTriangle, Target, Play } from 'lucide-react'
import { supabase, GameTheoryEngine, LegalDatabaseService, getAuthHeaders } from '../lib/supabase'

// Nash Equilibrium Calculator Component - User Story 3
export function NashEquilibrium() {
  const [scenarios, setScenarios] = useState([])
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [customScenario, setCustomScenario] = useState({
    name: '',
    description: '',
    players: ['Player 1', 'Player 2'],
    strategies: ['Strategy A', 'Strategy B'],
    payoffMatrix: [[10, 0], [0, 10]]
  })
  const [equilibrium, setEquilibrium] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('predefined') // 'predefined' or 'custom'
  
  const predefinedScenarios = [
    {
      id: 1,
      name: 'Patent Litigation Settlement',
      description: 'Two tech companies in patent dispute deciding between litigation and licensing',
      players: ['TechCorp A', 'TechCorp B'],
      strategies: ['Litigate Aggressively', 'Seek License Deal'],
      payoffMatrix: [[60, 85], [40, 70]], // [P1 payoff, P2 payoff]
      domain: 'Intellectual Property',
      complexity: 'Medium'
    },
    {
      id: 2,
      name: 'Environmental Compliance Coalition',
      description: 'Multiple companies deciding cooperation level on environmental regulations',
      players: ['Industrial Corp', 'Manufacturing Inc'],
      strategies: ['Full Compliance', 'Minimal Compliance'],
      payoffMatrix: [[80, 75], [95, 65]],
      domain: 'Environmental Law',
      complexity: 'High'
    },
    {
      id: 3,
      name: 'Employment Dispute Mediation',
      description: 'Employer and employee union in wage negotiation',
      players: ['Company Management', 'Workers Union'],
      strategies: ['Compromise Offer', 'Hard Stance'],
      payoffMatrix: [[70, 70], [45, 55]],
      domain: 'Employment Law',
      complexity: 'Low'
    },
    {
      id: 4,
      name: 'Contract Breach Resolution',
      description: 'Parties deciding between renegotiation or termination after breach',
      players: ['Contractor', 'Client'],
      strategies: ['Renegotiate Terms', 'Terminate & Sue'],
      payoffMatrix: [[75, 80], [30, 35]],
      domain: 'Contract Law',
      complexity: 'Medium'
    },
    {
      id: 5,
      name: 'Merger Antitrust Challenge',
      description: 'Companies and regulators in merger approval scenario',
      players: ['Merging Companies', 'Antitrust Authority'],
      strategies: ['Proceed with Merger', 'Modify Terms'],
      payoffMatrix: [[90, 50], [75, 85]],
      domain: 'Corporate Law',
      complexity: 'High'
    }
  ]
  
  useEffect(() => {
    setScenarios(predefinedScenarios)
  }, [])
  
  const calculateEquilibrium = async (scenario) => {
    setLoading(true)
    try {
      // Call backend API for nash equilibrium
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
      const game_matrix = scenario.payoffMatrix.map((row, i) => row.map((_, j) => [scenario.payoffMatrix[i][j], scenario.payoffMatrix[j][i]]))
      const response = await fetch(`${apiBase}/nash_equilibrium`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          game_matrix
        })
      })

      if (response.ok) {
        const data = await response.json()
        const equilibria = []
        data.pure_equilibria.forEach(eq => {
          equilibria.push({
            player1Strategy: scenario.strategies[eq.row],
            player2Strategy: scenario.strategies[eq.col],
            player1Payoff: eq.p1_payoff,
            player2Payoff: eq.p2_payoff,
            mixedStrategy: false
          })
        })
        if (data.mixed_equilibria.length > 0) {
          const eq = data.mixed_equilibria[0]
          equilibria.push({
            player1Strategy: 'Mixed Strategy',
            player2Strategy: 'Mixed Strategy',
            player1Payoff: eq.expected_payoffs.player1,
            player2Payoff: eq.expected_payoffs.player2,
            mixedStrategy: true,
            probabilities: [eq.p_player1_row0, eq.p_player2_col0]
          })
        }
        const enhancedResult = {
          scenario: scenario,
          equilibria,
          analysis: {
            numEquilibria: equilibria.length,
            hasStableEquilibrium: equilibria.length > 0,
            recommendedStrategy: equilibria[0]?.player1Strategy || scenario.strategies[0]
          },
          legalInsights: {
            riskAssessment: analyzeRisk(scenario, { equilibria }),
            strategicAdvice: generateAdvice(scenario, { equilibria }),
            settlementProbability: GameTheoryEngine.calculateSettlementProbability(
              { precedent_value: 0.7 },
              scenario.strategies.map(s => ({ name: s }))
            ),
            costBenefitAnalysis: calculateCostBenefit(scenario, { equilibria })
          }
        }
        setEquilibrium(enhancedResult)
      } else {
        throw new Error('API call failed')
      }
    } catch (error) {
      console.error('Nash equilibrium calculation error:', error)
      // Fallback to client-side only
      const gameResult = GameTheoryEngine.calculateNashEquilibrium(
        scenario.players,
        scenario.strategies,
        scenario.payoffMatrix
      )
      
      const enhancedResult = {
        ...gameResult,
        scenario: scenario,
        legalInsights: {
          riskAssessment: analyzeRisk(scenario, gameResult),
          strategicAdvice: generateAdvice(scenario, gameResult),
          settlementProbability: GameTheoryEngine.calculateSettlementProbability(
            { precedent_value: 0.7 },
            scenario.strategies.map(s => ({ name: s }))
          ),
          costBenefitAnalysis: calculateCostBenefit(scenario, gameResult)
        }
      }
      
      setEquilibrium(enhancedResult)
    } finally {
      setLoading(false)
    }
  }
  
  const analyzeRisk = (scenario, result) => {
    const equilibria = result.equilibria
    if (equilibria.length === 0) {
      return {
        level: 'High',
        description: 'No stable equilibrium found - unpredictable outcomes',
        color: 'text-red-400'
      }
    } else if (equilibria.length === 1) {
      return {
        level: 'Low',
        description: 'Single stable equilibrium - predictable outcome',
        color: 'text-green-400'
      }
    } else {
      return {
        level: 'Medium', 
        description: 'Multiple equilibria - coordination challenges possible',
        color: 'text-yellow-400'
      }
    }
  }
  
  const generateAdvice = (scenario, result) => {
    const advice = []
    
    if (result.equilibria.length > 0) {
      const bestEquilibrium = result.equilibria[0]
      advice.push(`Recommended strategy: ${bestEquilibrium.player1Strategy}`)
      advice.push(`Expected outcome provides ${bestEquilibrium.player1Payoff}% value`)
    }
    
    if (scenario.domain === 'Intellectual Property') {
      advice.push('Consider IP portfolio strength in strategy selection')
      advice.push('Licensing deals often provide stable, long-term value')
    } else if (scenario.domain === 'Employment Law') {
      advice.push('Factor in long-term employee relations')
      advice.push('Public perception impacts matter in employment disputes')
    } else if (scenario.domain === 'Environmental Law') {
      advice.push('Regulatory compliance reduces future liability')
      advice.push('Cooperative strategies often yield regulatory goodwill')
    }
    
    return advice
  }
  
  const calculateCostBenefit = (scenario, result) => {
    const equilibrium = result.equilibria[0]
    if (!equilibrium) return null
    
    return {
      expectedValue: equilibrium.player1Payoff,
      riskAdjustedValue: equilibrium.player1Payoff * 0.85, // Risk discount
      opportunityCost: Math.max(...scenario.payoffMatrix.flat()) - equilibrium.player1Payoff,
      recommendation: equilibrium.player1Payoff > 70 ? 'Proceed' : 'Reconsider'
    }
  }
  
  const updateCustomPayoff = (i, j, value) => {
    const newMatrix = [...customScenario.payoffMatrix]
    newMatrix[i][j] = parseInt(value) || 0
    setCustomScenario({ ...customScenario, payoffMatrix: newMatrix })
  }
  
  const addStrategy = () => {
    if (customScenario.strategies.length < 4) {
      const newMatrix = customScenario.payoffMatrix.map(row => [...row, 50])
      newMatrix.push(new Array(customScenario.strategies.length + 1).fill(50))
      
      setCustomScenario({
        ...customScenario,
        strategies: [...customScenario.strategies, `Strategy ${String.fromCharCode(65 + customScenario.strategies.length)}`],
        payoffMatrix: newMatrix
      })
    }
  }
  
  const removeStrategy = (index) => {
    if (customScenario.strategies.length > 2) {
      const newStrategies = customScenario.strategies.filter((_, i) => i !== index)
      const newMatrix = customScenario.payoffMatrix
        .filter((_, i) => i !== index)
        .map(row => row.filter((_, j) => j !== index))
      
      setCustomScenario({
        ...customScenario,
        strategies: newStrategies,
        payoffMatrix: newMatrix
      })
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="h-8 w-8 text-yellow-400" />
          <h1 className="text-3xl font-bold text-white">Nash Equilibrium Calculator</h1>
        </div>
        <p className="text-blue-200">
          Game theory analysis for multi-party legal scenarios and strategic decision-making
        </p>
      </div>
      
      {/* Mode Toggle */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setMode('predefined')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              mode === 'predefined' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Legal Scenarios
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              mode === 'custom' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Custom Analysis
          </button>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Scenario Selection/Creation */}
        <div className="lg:col-span-1 space-y-6">
          {mode === 'predefined' ? (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-yellow-400" />
                <span>Legal Scenarios</span>
              </h2>
              <div className="space-y-3">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    onClick={() => {
                      setSelectedScenario(scenario)
                      setEquilibrium(null)
                    }}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedScenario?.id === scenario.id
                        ? 'bg-yellow-600/30 border-yellow-500/50'
                        : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600'
                    } border`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-white text-sm">
                        {scenario.name}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        scenario.complexity === 'High' ? 'bg-red-500/20 text-red-400' :
                        scenario.complexity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {scenario.complexity}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">
                      {scenario.description}
                    </p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-400">{scenario.domain}</span>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span className="text-slate-500">{scenario.players.length}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Custom Scenario</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Scenario Name</label>
                  <input
                    type="text"
                    value={customScenario.name}
                    onChange={(e) => setCustomScenario({ ...customScenario, name: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-yellow-500 focus:outline-none"
                    placeholder="Enter scenario name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Description</label>
                  <textarea
                    value={customScenario.description}
                    onChange={(e) => setCustomScenario({ ...customScenario, description: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-yellow-500 focus:outline-none resize-none"
                    rows={3}
                    placeholder="Describe the legal scenario"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-slate-300">Strategies ({customScenario.strategies.length})</label>
                    <div className="space-x-2">
                      <button
                        onClick={addStrategy}
                        disabled={customScenario.strategies.length >= 4}
                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {customScenario.strategies.map((strategy, index) => (
                      <div key={index} className="flex space-x-2">
                        <input
                          type="text"
                          value={strategy}
                          onChange={(e) => {
                            const newStrategies = [...customScenario.strategies]
                            newStrategies[index] = e.target.value
                            setCustomScenario({ ...customScenario, strategies: newStrategies })
                          }}
                          className="flex-1 bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-600 focus:border-yellow-500 focus:outline-none"
                        />
                        {customScenario.strategies.length > 2 && (
                          <button
                            onClick={() => removeStrategy(index)}
                            className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Payoff Matrix */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Payoff Matrix</label>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${customScenario.strategies.length + 1}, minmax(0, 1fr))` }}>
                      <div className="text-xs text-slate-400"></div>
                      {customScenario.strategies.map((strategy, j) => (
                        <div key={j} className="text-xs text-slate-400 text-center">
                          {strategy.substring(0, 8)}...
                        </div>
                      ))}
                      
                      {customScenario.strategies.map((strategy, i) => (
                        <React.Fragment key={i}>
                          <div className="text-xs text-slate-400">
                            {strategy.substring(0, 8)}...
                          </div>
                          {customScenario.strategies.map((_, j) => (
                            <input
                              key={j}
                              type="number"
                              value={customScenario.payoffMatrix[i][j]}
                              onChange={(e) => updateCustomPayoff(i, j, e.target.value)}
                              className="w-full bg-slate-600 text-white rounded px-1 py-1 text-xs text-center border border-slate-500 focus:border-yellow-500 focus:outline-none"
                            />
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Values represent Player 1's payoff for each strategy combination
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Calculate Button */}
          {((mode === 'predefined' && selectedScenario) || (mode === 'custom' && customScenario.name)) && (
            <button
              onClick={() => calculateEquilibrium(mode === 'predefined' ? selectedScenario : customScenario)}
              disabled={loading}
              className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Calculate Nash Equilibrium</span>
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Right Panel - Results */}
        <div className="lg:col-span-2 space-y-6">
          {equilibrium && (
            <>
              {/* Scenario Overview */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {equilibrium.scenario.name}
                </h2>
                <p className="text-slate-300 mb-4">{equilibrium.scenario.description}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-300 mb-2">Players</h3>
                    <ul className="space-y-1">
                      {equilibrium.scenario.players.map((player, index) => (
                        <li key={index} className="text-sm text-white flex items-center space-x-2">
                          <Users className="h-3 w-3 text-blue-400" />
                          <span>{player}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-300 mb-2">Available Strategies</h3>
                    <ul className="space-y-1">
                      {equilibrium.scenario.strategies.map((strategy, index) => (
                        <li key={index} className="text-sm text-white flex items-center space-x-2">
                          <Target className="h-3 w-3 text-green-400" />
                          <span>{strategy}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Equilibrium Results */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <span>Nash Equilibrium Analysis</span>
                </h2>
                
                {equilibrium.equilibria.length > 0 ? (
                  <div className="space-y-4">
                    {equilibrium.equilibria.map((eq, index) => (
                      <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-white">
                            Equilibrium {index + 1} {eq.mixedStrategy ? '(Mixed Strategy)' : '(Pure Strategy)'}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                            Stable
                          </span>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">Player Strategies</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">{equilibrium.scenario.players[0]}:</span>
                                <span className="text-sm text-white font-medium">{eq.player1Strategy}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">{equilibrium.scenario.players[1]}:</span>
                                <span className="text-sm text-white font-medium">{eq.player2Strategy}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">Expected Payoffs</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">{equilibrium.scenario.players[0]}:</span>
                                <span className="text-sm text-green-400 font-medium">{eq.player1Payoff}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">{equilibrium.scenario.players[1]}:</span>
                                <span className="text-sm text-green-400 font-medium">{eq.player2Payoff}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {eq.mixedStrategy && (
                          <div className="mt-4 p-3 bg-slate-600/50 rounded-lg">
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">Mixed Strategy Probabilities</h4>
                            <div className="flex space-x-4">
                              {eq.probabilities.map((prob, pIndex) => (
                                <div key={pIndex} className="text-center">
                                  <div className="text-lg font-bold text-yellow-400">
                                    {(prob * 100).toFixed(0)}%
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {equilibrium.scenario.strategies[pIndex]}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <AlertTriangle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Pure Strategy Equilibrium</h3>
                    <p className="text-slate-400 text-sm">This scenario may require mixed strategy analysis or has unstable outcomes</p>
                  </div>
                )}
              </div>
              
              {/* Risk Assessment */}
              {equilibrium.legalInsights && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    <span>Legal Risk Assessment</span>
                  </h2>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${equilibrium.legalInsights.riskAssessment.color}`}>
                        {equilibrium.legalInsights.riskAssessment.level}
                      </div>
                      <div className="text-sm text-slate-400">Risk Level</div>
                      <p className="text-xs text-slate-500 mt-1">
                        {equilibrium.legalInsights.riskAssessment.description}
                      </p>
                    </div>
                    
                    {equilibrium.legalInsights.settlementProbability && (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                          {(equilibrium.legalInsights.settlementProbability.probability * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-slate-400">Settlement Probability</div>
                        <p className="text-xs text-slate-500 mt-1">
                          {equilibrium.legalInsights.settlementProbability.recommendation}
                        </p>
                      </div>
                    )}
                    
                    {equilibrium.legalInsights.costBenefitAnalysis && (
                      <div className="text-center">
                        <div className={`text-3xl font-bold mb-2 ${
                          equilibrium.legalInsights.costBenefitAnalysis.recommendation === 'Proceed' ? 'text-green-400' : 'text-orange-400'
                        }`}>
                          {equilibrium.legalInsights.costBenefitAnalysis.recommendation}
                        </div>
                        <div className="text-sm text-slate-400">Recommendation</div>
                        <p className="text-xs text-slate-500 mt-1">
                          EV: {equilibrium.legalInsights.costBenefitAnalysis.expectedValue}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Strategic Advice */}
                  <div>
                    <h3 className="font-semibold text-slate-300 mb-3">Strategic Recommendations</h3>
                    <ul className="space-y-2">
                      {equilibrium.legalInsights.strategicAdvice.map((advice, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">{advice}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Analysis Summary */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-semibold text-white mb-4">Game Theory Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Number of Equilibria:</span>
                    <span className="text-white font-medium">{equilibrium.equilibria.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Has Stable Equilibrium:</span>
                    <span className={`font-medium ${
                      equilibrium.analysis.hasStableEquilibrium ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {equilibrium.analysis.hasStableEquilibrium ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Recommended Strategy:</span>
                    <span className="text-blue-400 font-medium">
                      {equilibrium.analysis.recommendedStrategy}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {!equilibrium && !loading && (
            <div className="bg-slate-800/30 rounded-xl p-12 border border-slate-700 text-center">
              <Calculator className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                Select a legal scenario or create a custom game to analyze Nash equilibrium and optimal strategies
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NashEquilibrium