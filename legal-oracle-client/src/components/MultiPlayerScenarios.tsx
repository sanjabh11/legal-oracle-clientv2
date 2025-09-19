import React, { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Play, BarChart3, Target, Shield } from 'lucide-react'
import { GameTheoryEngine, getAuthHeaders } from '../lib/supabase'

// Multi-Player Legal Scenarios Component
export function MultiPlayerScenarios() {
  const [players, setPlayers] = useState([
    { id: 1, name: 'Plaintiff', role: 'plaintiff', strategy: 'aggressive', payoffs: [0, 0] },
    { id: 2, name: 'Defendant', role: 'defendant', strategy: 'defensive', payoffs: [0, 0] }
  ])
  const [scenarioType, setScenarioType] = useState('litigation')
  const [payoffMatrix, setPayoffMatrix] = useState([
    [[100, -50], [0, 0]],
    [[-20, 80], [50, 50]]
  ])
  const [gameResults, setGameResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scenarioDescription, setScenarioDescription] = useState('')

  const strategies = [
    'Aggressive Litigation',
    'Settlement Focused',
    'Collaborative Approach',
    'Delay Tactics',
    'Evidence Building',
    'Mediation Priority'
  ]

  const addPlayer = () => {
    const newPlayer = {
      id: Date.now(),
      name: `Player ${players.length + 1}`,
      role: 'party',
      strategy: 'neutral',
      payoffs: [0, 0]
    }
    setPlayers([...players, newPlayer])
    
    // Expand payoff matrix for new player
    const newSize = players.length + 1
    const newMatrix = Array(newSize).fill().map(() => 
      Array(newSize).fill().map(() => Array(newSize).fill(0))
    )
    setPayoffMatrix(newMatrix)
  }

  const removePlayer = (playerId) => {
    if (players.length <= 2) {
      alert('Minimum 2 players required')
      return
    }
    setPlayers(players.filter(p => p.id !== playerId))
  }

  const updatePlayer = (playerId, field, value) => {
    setPlayers(players.map(p => 
      p.id === playerId ? { ...p, [field]: value } : p
    ))
  }

  const updatePayoffMatrix = (row, col, playerIndex, value) => {
    const newMatrix = [...payoffMatrix]
    if (!newMatrix[row]) newMatrix[row] = []
    if (!newMatrix[row][col]) newMatrix[row][col] = []
    newMatrix[row][col][playerIndex] = parseFloat(value) || 0
    setPayoffMatrix(newMatrix)
  }

  const runGameAnalysis = async () => {
    setLoading(true)
    try {
      // Use local game theory engine for Nash equilibrium
      const strategies = players.map(p => p.strategy)
      const nashResults = GameTheoryEngine.calculateNashEquilibrium(
        players,
        strategies,
        payoffMatrix
      )

      // Enhanced analysis with backend API
      try {
        const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
        const response = await fetch(`${apiBase}/nash_equilibrium`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders())
          },
          body: JSON.stringify({
            game_matrix: payoffMatrix,
            metadata: {
              scenario_type: scenarioType,
              players: players.map(p => ({ name: p.name, role: p.role, strategy: p.strategy })),
              description: scenarioDescription
            }
          })
        })

        if (response.ok) {
          const backendResults = await response.json()
          nashResults.backend_analysis = backendResults
        }
      } catch (error) {
        console.log('Backend analysis unavailable, using local calculations')
      }

      setGameResults(nashResults)
    } catch (error) {
      console.error('Game analysis error:', error)
      alert('Analysis failed. Please check your payoff matrix.')
    } finally {
      setLoading(false)
    }
  }

  const generateScenarioTemplate = (type) => {
    switch (type) {
      case 'litigation':
        setPlayers([
          { id: 1, name: 'Plaintiff', role: 'plaintiff', strategy: 'Aggressive Litigation', payoffs: [0, 0] },
          { id: 2, name: 'Defendant', role: 'defendant', strategy: 'Settlement Focused', payoffs: [0, 0] }
        ])
        setPayoffMatrix([
          [[100, -80], [-20, 20]],
          [[-50, 60], [30, 30]]
        ])
        setScenarioDescription('Two-party litigation with settlement vs. trial options')
        break
      case 'negotiation':
        setPlayers([
          { id: 1, name: 'Buyer', role: 'buyer', strategy: 'Aggressive Negotiation', payoffs: [0, 0] },
          { id: 2, name: 'Seller', role: 'seller', strategy: 'Collaborative Approach', payoffs: [0, 0] }
        ])
        setPayoffMatrix([
          [[80, -40], [20, 40]],
          [[10, 70], [50, 50]]
        ])
        setScenarioDescription('Commercial negotiation scenario')
        break
      case 'regulatory':
        setPlayers([
          { id: 1, name: 'Company', role: 'regulated_entity', strategy: 'Compliance Focus', payoffs: [0, 0] },
          { id: 2, name: 'Regulator', role: 'regulator', strategy: 'Enforcement', payoffs: [0, 0] },
          { id: 3, name: 'Public Interest', role: 'stakeholder', strategy: 'Advocacy', payoffs: [0, 0] }
        ])
        setPayoffMatrix([
          [[[60, 40, 80], [20, 80, 60]], [[40, 20, 40], [80, 60, 90]]],
          [[[30, 70, 50], [70, 30, 70]], [[50, 50, 60], [60, 70, 80]]]
        ])
        setScenarioDescription('Three-party regulatory compliance scenario')
        break
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Users className="mr-3 text-blue-400" />
          Multi-Player Legal Scenarios
        </h1>
        <p className="text-slate-300">
          Analyze complex multi-party legal situations using game theory
        </p>
      </div>

      {/* Scenario Setup */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Scenario Configuration</h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Scenario Type
            </label>
            <select
              value={scenarioType}
              onChange={(e) => {
                setScenarioType(e.target.value)
                generateScenarioTemplate(e.target.value)
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="litigation">Litigation Scenario</option>
              <option value="negotiation">Commercial Negotiation</option>
              <option value="regulatory">Regulatory Compliance</option>
              <option value="merger">Merger & Acquisition</option>
              <option value="custom">Custom Scenario</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Scenario Description
            </label>
            <input
              type="text"
              value={scenarioDescription}
              onChange={(e) => setScenarioDescription(e.target.value)}
              placeholder="Describe the legal scenario..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Player Configuration */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Players & Strategies</h2>
          <button
            onClick={addPlayer}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Player
          </button>
        </div>

        <div className="space-y-4">
          {players.map((player, index) => (
            <div key={player.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="grid md:grid-cols-4 gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Player Name
                  </label>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayer(player.id, 'name', e.target.value)}
                    className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={player.role}
                    onChange={(e) => updatePlayer(player.id, 'role', e.target.value)}
                    className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="plaintiff">Plaintiff</option>
                    <option value="defendant">Defendant</option>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="regulator">Regulator</option>
                    <option value="stakeholder">Stakeholder</option>
                    <option value="party">Party</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Strategy
                  </label>
                  <select
                    value={player.strategy}
                    onChange={(e) => updatePlayer(player.id, 'strategy', e.target.value)}
                    className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {strategies.map(strategy => (
                      <option key={strategy} value={strategy}>{strategy}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end">
                  {players.length > 2 && (
                    <button
                      onClick={() => removePlayer(player.id)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payoff Matrix */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Payoff Matrix</h2>
        
        {players.length === 2 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-slate-300 p-2"></th>
                  <th className="text-slate-300 p-2">{players[1]?.name} Strategy 1</th>
                  <th className="text-slate-300 p-2">{players[1]?.name} Strategy 2</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1].map(row => (
                  <tr key={row}>
                    <td className="text-slate-300 p-2 font-medium">
                      {players[0]?.name} Strategy {row + 1}
                    </td>
                    {[0, 1].map(col => (
                      <td key={col} className="p-2">
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            value={payoffMatrix[row]?.[col]?.[0] || 0}
                            onChange={(e) => updatePayoffMatrix(row, col, 0, e.target.value)}
                            placeholder={`${players[0]?.name}`}
                            className="w-20 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                          />
                          <input
                            type="number"
                            value={payoffMatrix[row]?.[col]?.[1] || 0}
                            onChange={(e) => updatePayoffMatrix(row, col, 1, e.target.value)}
                            placeholder={`${players[1]?.name}`}
                            className="w-20 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400">
              Complex multi-player payoff matrix configuration available for {players.length} players.
              Use simplified 2x2 matrix for detailed analysis.
            </p>
          </div>
        )}
      </div>

      {/* Run Analysis */}
      <div className="text-center mb-8">
        <button
          onClick={runGameAnalysis}
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
              <Play className="mr-2 h-5 w-5" />
              Run Game Analysis
            </>
          )}
        </button>
      </div>

      {/* Game Results */}
      {gameResults && (
        <div className="space-y-6">
          {/* Nash Equilibria */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Target className="mr-2 text-green-400" />
              Nash Equilibrium Analysis
            </h2>
            
            {gameResults.equilibria.length > 0 ? (
              <div className="space-y-4">
                {gameResults.equilibria.map((equilibrium, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="font-medium text-white mb-2">
                      Equilibrium {index + 1}
                      {equilibrium.mixedStrategy && (
                        <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          Mixed Strategy
                        </span>
                      )}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-slate-300 mb-2">Player Strategies:</h4>
                        <ul className="space-y-1">
                          <li className="text-sm">
                            <span className="text-blue-300">{players[0]?.name}:</span> {equilibrium.player1Strategy}
                          </li>
                          <li className="text-sm">
                            <span className="text-blue-300">{players[1]?.name}:</span> {equilibrium.player2Strategy}
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-slate-300 mb-2">Expected Payoffs:</h4>
                        <ul className="space-y-1">
                          <li className="text-sm">
                            <span className="text-green-300">{players[0]?.name}:</span> {equilibrium.player1Payoff}
                          </li>
                          <li className="text-sm">
                            <span className="text-green-300">{players[1]?.name}:</span> {equilibrium.player2Payoff}
                          </li>
                        </ul>
                      </div>
                    </div>
                    {equilibrium.probabilities && (
                      <div className="mt-3">
                        <h4 className="text-slate-300 mb-2">Mixed Strategy Probabilities:</h4>
                        <div className="flex space-x-4 text-sm">
                          <span className="text-purple-300">
                            {players[0]?.name}: {Math.round(equilibrium.probabilities[0] * 100)}%
                          </span>
                          <span className="text-purple-300">
                            {players[1]?.name}: {Math.round(equilibrium.probabilities[1] * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">No pure strategy Nash equilibria found.</p>
                <p className="text-slate-300 text-sm mt-2">
                  Consider adjusting payoff values or using mixed strategies.
                </p>
              </div>
            )}
          </div>

          {/* Game Analysis */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <BarChart3 className="mr-2 text-blue-400" />
              Strategic Analysis
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">Equilibria Found</h3>
                <div className="text-2xl font-bold text-blue-400">
                  {gameResults.analysis.numEquilibria}
                </div>
                <p className="text-slate-400 text-sm">
                  {gameResults.analysis.hasStableEquilibrium ? 'Stable solution exists' : 'No stable solution'}
                </p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">Recommended Strategy</h3>
                <div className="text-sm text-green-300 font-medium">
                  {gameResults.analysis.recommendedStrategy}
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  For {players[0]?.name}
                </p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">Game Type</h3>
                <div className="text-sm text-purple-300 font-medium capitalize">
                  {scenarioType.replace('_', ' ')} Game
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  {players.length} players
                </p>
              </div>
            </div>
          </div>

          {/* Backend Analysis Results */}
          {gameResults.backend_analysis && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Shield className="mr-2 text-purple-400" />
                Advanced Analysis
              </h2>
              
              <div className="space-y-4">
                {gameResults.backend_analysis.pure_equilibria?.length > 0 && (
                  <div>
                    <h3 className="font-medium text-white mb-2">Pure Strategy Equilibria</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {gameResults.backend_analysis.pure_equilibria.map((eq, index) => (
                        <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-sm">
                            <span className="text-blue-300">Position:</span> ({eq.row}, {eq.col})
                          </div>
                          <div className="text-sm">
                            <span className="text-green-300">Payoffs:</span> ({eq.p1_payoff}, {eq.p2_payoff})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {gameResults.backend_analysis.mixed_equilibria?.length > 0 && (
                  <div>
                    <h3 className="font-medium text-white mb-2">Mixed Strategy Equilibria</h3>
                    {gameResults.backend_analysis.mixed_equilibria.map((eq, index) => (
                      <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm">
                              <span className="text-purple-300">Player 1 Probability:</span> {Math.round(eq.p_player1_row0 * 100)}%
                            </div>
                            <div className="text-sm">
                              <span className="text-purple-300">Player 2 Probability:</span> {Math.round(eq.p_player2_col0 * 100)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-sm">
                              <span className="text-green-300">Expected Payoffs:</span>
                            </div>
                            <div className="text-sm">
                              P1: {eq.expected_payoffs.player1.toFixed(2)}, P2: {eq.expected_payoffs.player2.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {gameResults.backend_analysis.notes && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-blue-300 text-sm">{gameResults.backend_analysis.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
