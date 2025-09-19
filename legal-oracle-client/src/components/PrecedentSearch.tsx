import React, { useState, useEffect } from 'react'
import { Search, BookOpen, Scale, Calendar, MapPin, TrendingUp, AlertCircle } from 'lucide-react'
import { getAuthHeaders } from '../lib/supabase'

// Precedent Search Component - User Story 6: Precedent Impact Simulation
export function PrecedentSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedCase, setSelectedCase] = useState(null)
  const [simulationResults, setSimulationResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    jurisdiction: '',
    court: '',
    dateRange: { from: '', to: '' },
    caseType: ''
  })

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query')
      return
    }

    setLoading(true)
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
      const response = await fetch(`${apiBase}/search_caselaw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          query: searchQuery,
          top_k: 10,
          jurisdiction: searchFilters.jurisdiction || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
      } else {
        throw new Error('Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const simulatePrecedentImpact = async (caseData) => {
    setLoading(true)
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
      const response = await fetch(`${apiBase}/precedent/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          case_id: caseData.case_id,
          decision: "favorable ruling",
          jurisdiction: caseData.jurisdiction || "Federal"
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSimulationResults(data)
      } else {
        throw new Error('Simulation failed')
      }
    } catch (error) {
      console.error('Simulation error:', error)
      alert('Precedent simulation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Search className="mr-3 text-blue-400" />
          Precedent Search & Impact Simulation
        </h1>
        <p className="text-slate-300">
          Search legal precedents and simulate their impact on future cases
        </p>
      </div>

      {/* Search Interface */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <div className="space-y-6">
          {/* Main Search */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search Legal Precedents
            </label>
            <div className="flex space-x-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter case details, legal concepts, or keywords..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Filters */}
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Jurisdiction
              </label>
              <select
                value={searchFilters.jurisdiction}
                onChange={(e) => setSearchFilters({...searchFilters, jurisdiction: e.target.value})}
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Court Level
              </label>
              <select
                value={searchFilters.court}
                onChange={(e) => setSearchFilters({...searchFilters, court: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Courts</option>
                <option value="Supreme Court">Supreme Court</option>
                <option value="Circuit Court">Circuit Court</option>
                <option value="District Court">District Court</option>
                <option value="State Supreme">State Supreme</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Case Type
              </label>
              <select
                value={searchFilters.caseType}
                onChange={(e) => setSearchFilters({...searchFilters, caseType: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="contract_dispute">Contract Dispute</option>
                <option value="intellectual_property">Intellectual Property</option>
                <option value="employment">Employment Law</option>
                <option value="constitutional">Constitutional Law</option>
                <option value="environmental">Environmental Law</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date Range
              </label>
              <input
                type="date"
                value={searchFilters.dateRange.from}
                onChange={(e) => setSearchFilters({
                  ...searchFilters, 
                  dateRange: {...searchFilters.dateRange, from: e.target.value}
                })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <BookOpen className="mr-2 text-green-400" />
            Search Results ({searchResults.length} found)
          </h2>
          
          <div className="space-y-4">
            {searchResults.map((result, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-blue-500/50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{result.title}</h3>
                    <p className="text-slate-300 text-sm mb-2">{result.summary}</p>
                    <div className="flex items-center space-x-4 text-xs text-slate-400">
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {result.jurisdiction || 'Unknown'}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {result.date || 'Unknown'}
                      </span>
                      <span className="flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {Math.round((result.similarity || 0) * 100)}% relevance
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedCase(result)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => simulatePrecedentImpact(result)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Simulate Impact
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Precedent Impact Simulation Results */}
      {simulationResults && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Scale className="mr-2 text-purple-400" />
            Precedent Impact Simulation
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Impact Metrics */}
            <div className="space-y-4">
              <h3 className="font-medium text-white mb-3">Impact Metrics</h3>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Affected Cases:</span>
                    <span className="text-blue-300 font-medium">{simulationResults.impact_analysis?.affected_cases || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Precedent Strength:</span>
                    <span className={`font-medium capitalize ${
                      simulationResults.impact_analysis?.precedent_strength === 'strong' ? 'text-green-300' :
                      simulationResults.impact_analysis?.precedent_strength === 'moderate' ? 'text-yellow-300' :
                      'text-red-300'
                    }`}>
                      {simulationResults.impact_analysis?.precedent_strength || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Citation Likelihood:</span>
                    <span className="text-purple-300 font-medium">
                      {Math.round((simulationResults.impact_analysis?.citation_likelihood || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Effects */}
            <div className="space-y-4">
              <h3 className="font-medium text-white mb-3">Timeline Effects</h3>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="space-y-3">
                  {simulationResults.impact_analysis?.timeline_effects && Object.entries(simulationResults.impact_analysis.timeline_effects).map(([period, effect]) => (
                    <div key={period} className="border-l-2 border-blue-400 pl-3">
                      <div className="font-medium text-white capitalize">{period.replace('_', ' ')}</div>
                      <div className="text-slate-300 text-sm">{effect}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Future Impact Analysis */}
          {simulationResults.impact_analysis?.future_impact && (
            <div className="mt-6">
              <h3 className="font-medium text-white mb-3">Future Impact Analysis</h3>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">Similar Cases Impact</h4>
                    <p className="text-slate-300 text-sm">
                      {simulationResults.impact_analysis.future_impact.similar_cases?.count || 0} similar cases expected to be affected
                    </p>
                    <p className="text-green-300 text-sm font-medium">
                      {simulationResults.impact_analysis.future_impact.similar_cases?.outcome_shift || 'No significant shift predicted'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">Related Legal Areas</h4>
                    <ul className="space-y-1">
                      {(simulationResults.impact_analysis.future_impact.related_areas || []).map((area, index) => (
                        <li key={index} className="text-slate-300 text-sm flex items-center">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-white">{selectedCase.title}</h2>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-white mb-2">Summary</h3>
                <p className="text-slate-300 text-sm">{selectedCase.summary}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-white mb-2">Case Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Case ID:</span>
                      <span className="text-slate-300">{selectedCase.case_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Jurisdiction:</span>
                      <span className="text-slate-300">{selectedCase.jurisdiction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Relevance:</span>
                      <span className="text-blue-300">{Math.round((selectedCase.similarity || 0) * 100)}%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-white mb-2">Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => simulatePrecedentImpact(selectedCase)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm transition-colors"
                    >
                      Simulate Precedent Impact
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery(selectedCase.title)
                        setSelectedCase(null)
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                    >
                      Find Similar Cases
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
