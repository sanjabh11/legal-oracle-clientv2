import React, { useState } from 'react'
import { MapPin, Scale, Clock, TrendingUp, Award } from 'lucide-react'
import { getAuthHeaders } from '../lib/supabase'

// Jurisdiction Optimization Component - User Story 5
export function JurisdictionOptimizer() {
  const [caseType, setCaseType] = useState('')
  const [keyFacts, setKeyFacts] = useState('')
  const [preferredOutcome, setPreferredOutcome] = useState('')
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleOptimize = async () => {
    if (!caseType || !keyFacts || !preferredOutcome) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
      const response = await fetch(`${apiBase}/jurisdiction/optimize?case_type=${encodeURIComponent(caseType)}&key_facts=${encodeURIComponent(keyFacts)}&preferred_outcome=${encodeURIComponent(preferredOutcome)}`, {
        method: 'GET',
        headers: {
          ...(await getAuthHeaders())
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendations(data)
      } else {
        throw new Error('Failed to fetch recommendations')
      }
    } catch (error) {
      console.error('Optimization error:', error)
      alert('Failed to generate recommendations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <MapPin className="mr-3 text-blue-400" />
          Jurisdiction Optimization
        </h1>
        <p className="text-slate-300">
          Find the optimal jurisdiction to file your case for maximum success probability
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Case Type *
            </label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Case Type</option>
              <option value="contract_dispute">Contract Dispute</option>
              <option value="intellectual_property">Intellectual Property</option>
              <option value="employment">Employment Law</option>
              <option value="product_liability">Product Liability</option>
              <option value="securities_fraud">Securities Fraud</option>
              <option value="environmental">Environmental Law</option>
              <option value="corporate">Corporate Law</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Key Facts *
            </label>
            <textarea
              value={keyFacts}
              onChange={(e) => setKeyFacts(e.target.value)}
              placeholder="Describe the key facts of your case, including parties involved, contract value, damages, etc."
              rows={4}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Preferred Outcome *
            </label>
            <select
              value={preferredOutcome}
              onChange={(e) => setPreferredOutcome(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Preferred Outcome</option>
              <option value="win">Win at Trial</option>
              <option value="settle">Favorable Settlement</option>
              <option value="fast_resolution">Fast Resolution</option>
              <option value="minimal_cost">Minimize Legal Costs</option>
              <option value="precedent">Set Legal Precedent</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleOptimize}
          disabled={loading}
          className="mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Analyzing...
            </>
          ) : (
            <>
              <Scale className="mr-2 h-4 w-4" />
              Optimize Jurisdiction
            </>
          )}
        </button>
      </div>

      {/* Recommendations */}
      {recommendations && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Award className="mr-2 text-yellow-400" />
              Recommended Jurisdictions
            </h2>
            
            <div className="space-y-6">
              {recommendations.recommended_jurisdictions.map((jurisdiction, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">
                        {jurisdiction.jurisdiction}
                      </h3>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                          <span className="text-sm text-slate-300">
                            Score: {Math.round(jurisdiction.score * 100)}/100
                          </span>
                        </div>
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                          <span className="text-sm text-green-300">
                            {Math.round(jurisdiction.success_probability * 100)}% success rate
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-orange-400 mr-1" />
                          <span className="text-sm text-orange-300">
                            {jurisdiction.estimated_timeline}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      index === 0 ? 'bg-green-500/20 text-green-300' :
                      index === 1 ? 'bg-blue-500/20 text-blue-300' :
                      'bg-slate-500/20 text-slate-300'
                    }`}>
                      {index === 0 ? 'Best Choice' : index === 1 ? 'Good Option' : 'Alternative'}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-white mb-2">Key Advantages:</h4>
                    <ul className="space-y-1">
                      {jurisdiction.reasons.map((reason, reasonIndex) => (
                        <li key={reasonIndex} className="flex items-start">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-slate-300 text-sm">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Case Summary */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Analysis Summary</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">Case Type</h3>
                <p className="text-slate-300 text-sm capitalize">{recommendations.case_type.replace('_', ' ')}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">Preferred Outcome</h3>
                <p className="text-slate-300 text-sm capitalize">{recommendations.preferred_outcome.replace('_', ' ')}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">Key Factors</h3>
                <p className="text-slate-300 text-sm">{recommendations.key_facts.length} factors analyzed</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
