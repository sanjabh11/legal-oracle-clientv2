import React, { useState } from 'react'
import { TrendingUp, AlertTriangle, BarChart3, Calendar, Target } from 'lucide-react'
import { getAuthHeaders } from '../lib/supabase'

// Trend Forecasting Component - User Story 4
export function TrendForecasting() {
  const [industry, setIndustry] = useState('')
  const [jurisdictions, setJurisdictions] = useState('')
  const [timeHorizon, setTimeHorizon] = useState('2_years')
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleForecast = async () => {
    if (!industry || !jurisdictions) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
      const response = await fetch(`${apiBase}/trends/forecast?industry=${encodeURIComponent(industry)}&jurisdictions=${encodeURIComponent(jurisdictions)}&time_horizon=${timeHorizon}`, {
        method: 'GET',
        headers: {
          ...(await getAuthHeaders())
        }
      })

      if (response.ok) {
        const data = await response.json()
        setForecast(data)
      } else {
        throw new Error('Failed to fetch forecast')
      }
    } catch (error) {
      console.error('Forecast error:', error)
      alert('Failed to generate forecast. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <TrendingUp className="mr-3 text-blue-400" />
          Regulatory Trend Forecasting
        </h1>
        <p className="text-slate-300">
          Predict upcoming regulatory changes that could impact your industry
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Industry *
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Industry</option>
              <option value="tech">Technology</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Financial Services</option>
              <option value="energy">Energy</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="retail">Retail</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Jurisdictions *
            </label>
            <input
              type="text"
              value={jurisdictions}
              onChange={(e) => setJurisdictions(e.target.value)}
              placeholder="e.g., EU, California, Federal"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Time Horizon
            </label>
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1_year">1 Year</option>
              <option value="2_years">2 Years</option>
              <option value="5_years">5 Years</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleForecast}
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
              <BarChart3 className="mr-2 h-4 w-4" />
              Generate Forecast
            </>
          )}
        </button>
      </div>

      {/* Forecast Results */}
      {forecast && (
        <div className="space-y-6">
          {/* Predicted Changes */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-orange-400" />
              Predicted Regulatory Changes
            </h2>
            <div className="space-y-4">
              {forecast.predicted_changes.map((change, index) => (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white">{change.change_type}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        change.impact_level === 'high' ? 'bg-red-500/20 text-red-300' :
                        change.impact_level === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-green-500/20 text-green-300'
                      }`}>
                        {change.impact_level} impact
                      </span>
                      <span className="text-blue-300 font-medium">
                        {Math.round(change.probability * 100)}% likely
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm mb-2">{change.description}</p>
                  <div className="flex items-center text-xs text-slate-400">
                    <Calendar className="mr-1 h-3 w-3" />
                    Expected timeline: {change.timeline}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Analysis */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Target className="mr-2 text-green-400" />
              Impact Analysis
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-white mb-3">Business Impact</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Compliance Cost Increase:</span>
                    <span className="text-orange-300 font-medium">{forecast.impact_analysis.compliance_cost_increase}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Implementation Timeline:</span>
                    <span className="text-blue-300">{forecast.impact_analysis.implementation_timeline}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Risk Level:</span>
                    <span className={`font-medium ${
                      forecast.impact_analysis.risk_level === 'high' ? 'text-red-300' :
                      forecast.impact_analysis.risk_level === 'medium' ? 'text-yellow-300' :
                      'text-green-300'
                    }`}>
                      {forecast.impact_analysis.risk_level}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-white mb-3">Recommended Actions</h3>
                <ul className="space-y-2">
                  {forecast.impact_analysis.recommended_actions.map((action, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-slate-300 text-sm">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
