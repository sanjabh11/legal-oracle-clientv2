import React, { useState, useEffect } from 'react'
import { Target, TrendingUp, AlertCircle, CheckCircle, Brain, BarChart3 } from 'lucide-react'
import { supabase, LegalDatabaseService, HuggingFaceAPI, getAuthHeaders } from '../lib/supabase'

// Case Outcome Prediction Component - User Story 1
export function CasePrediction() {
  const [selectedCase, setSelectedCase] = useState(null)
  const [cases, setCases] = useState([])
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customCaseText, setCustomCaseText] = useState('')
  const [analysisMode, setAnalysisMode] = useState('database') // 'database' or 'custom'
  
  useEffect(() => {
    async function loadCases() {
      const legalCases = await LegalDatabaseService.getLegalCases({ limit: 20 })
      setCases(legalCases)
    }
    loadCases()
  }, [])
  
  const analyzeCaseOutcome = async (caseData) => {
    setLoading(true)
    try {
      // Call backend API for outcome prediction
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
      const response = await fetch(`${apiBase}/predict_outcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders())
        },
        body: JSON.stringify({
          case_id: caseData.id,
          case_type: caseData.case_type || 'general',
          jurisdiction: caseData.jurisdiction,
          key_facts: caseData.key_facts || [caseData.summary || customCaseText],
          case_text: caseData.summary || customCaseText,
          judge_id: caseData.judge_id
        })
      })

      if (response.ok) {
        const data = await response.json()
        const predictionData = {
          prediction: data.outcome_probabilities.win > 0.5 ? 'Favorable Outcome' : 'Unfavorable Outcome',
          confidence: data.confidence,
          analysis: data.reasoning,
          factors: [
            `${data.features_used?.nearest_precedents?.length || 0} similar cases analyzed`,
            'Real legal precedent data from Supabase',
            'AI-powered prediction via backend',
            'Sentence-transformer embeddings'
          ],
          similarCases: data.features_used?.nearest_precedents?.map(p => ({ case_title: p.title, case_summary: p.summary, outcome: 'Analyzed', court: 'N/A' })) || [],
          riskAssessment: {
            litigation_cost: data.features_used?.estimated_cost || 250000,
            time_to_resolution: data.features_used?.estimated_time_months || 12,
            success_probability: data.outcome_probabilities.win,
            settlement_likelihood: data.outcome_probabilities.settle
          },
          recommendations: [
            data.outcome_probabilities.win > 0.8 ? 'Strong case - proceed with confidence' : 'Moderate case - consider settlement options',
            'Monitor similar case developments',
            'Prepare comprehensive evidence documentation',
            'Consider alternative dispute resolution'
          ]
        }

        setPrediction(predictionData)
      } else {
        throw new Error('API call failed')
      }
    } catch (error) {
      console.error('Prediction analysis error:', error)
      // Fallback to basic prediction
      setPrediction({
        prediction: 'Analysis Error - Using Fallback',
        confidence: 0.5,
        error: 'Unable to complete prediction analysis via backend',
        factors: ['Fallback mode activated'],
        similarCases: [],
        recommendations: ['Please check backend connection']
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleCaseSelection = (case_) => {
    setSelectedCase(case_)
    setPrediction(null)
  }
  
  const handleCustomAnalysis = () => {
    if (customCaseText.trim()) {
      const customCase = {
        case_name: 'Custom Legal Analysis',
        summary: customCaseText,
        case_type: 'custom'
      }
      analyzeCaseOutcome(customCase)
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Target className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Case Outcome Prediction</h1>
        </div>
        <p className="text-blue-200">
          AI-powered analysis to predict legal case outcomes using real case data and machine learning
        </p>
      </div>
      
      {/* Analysis Mode Toggle */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setAnalysisMode('database')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              analysisMode === 'database' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Analyze Database Cases
          </button>
          <button
            onClick={() => setAnalysisMode('custom')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              analysisMode === 'custom' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Custom Case Analysis
          </button>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Panel - Case Selection/Input */}
        <div className="space-y-6">
          {analysisMode === 'database' ? (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Select a Case to Analyze</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cases.map((case_, index) => (
                  <div
                    key={case_.id || index}
                    onClick={() => handleCaseSelection(case_)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedCase?.id === case_.id
                        ? 'bg-blue-600/30 border-blue-500/50'
                        : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600'
                    } border`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-white text-sm">
                        {case_.case_name?.substring(0, 60)}...
                      </h3>
                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                        {case_.case_type}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">
                      {case_.summary?.substring(0, 120)}...
                    </p>
                    <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                      <span>{case_.jurisdiction}</span>
                      <span>{case_.filed_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Custom Case Analysis</h2>
              <textarea
                value={customCaseText}
                onChange={(e) => setCustomCaseText(e.target.value)}
                placeholder="Enter case details, facts, legal issues, and context for AI analysis..."
                className="w-full h-64 bg-slate-700 text-white rounded-lg p-4 border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
              />
              <button
                onClick={handleCustomAnalysis}
                disabled={!customCaseText.trim() || loading}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {loading ? 'Analyzing...' : 'Analyze Case'}
              </button>
            </div>
          )}
          
          {/* Analyze Button for Database Cases */}
          {analysisMode === 'database' && selectedCase && (
            <button
              onClick={() => analyzeCaseOutcome(selectedCase)}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Analyzing with AI...</span>
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  <span>Predict Outcome</span>
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Right Panel - Prediction Results */}
        <div className="space-y-6">
          {prediction && (
            <>
              {/* Main Prediction */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  <span>Predicted Outcome</span>
                </h2>
                
                {prediction.error ? (
                  <div className="flex items-center space-x-2 text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <span>{prediction.error}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-2">
                        {prediction.prediction}
                      </div>
                      <div className="text-lg text-slate-300">
                        Confidence: {(prediction.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${prediction.confidence * 100}%` }}
                      ></div>
                    </div>
                    
                    {prediction.factors && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-300 mb-2">Key Factors:</h3>
                        <ul className="space-y-1">
                          {prediction.factors.map((factor, index) => (
                            <li key={index} className="text-xs text-slate-400 flex items-center space-x-2">
                              <CheckCircle className="h-3 w-3 text-blue-400" />
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Risk Assessment */}
              {prediction.riskAssessment && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-orange-400" />
                    <span>Risk Assessment</span>
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-400">
                        ${Math.round(prediction.riskAssessment.litigation_cost).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">Estimated Legal Costs</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-400">
                        {prediction.riskAssessment.time_to_resolution} mo
                      </div>
                      <div className="text-xs text-slate-400">Time to Resolution</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-400">
                        {(prediction.riskAssessment.success_probability * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-400">Success Probability</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-400">
                        {(prediction.riskAssessment.settlement_likelihood * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-400">Settlement Likelihood</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Similar Cases */}
              {prediction.similarCases && prediction.similarCases.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h2 className="text-xl font-semibold text-white mb-4">Similar Cases</h2>
                  <div className="space-y-3">
                    {prediction.similarCases.map((similarCase, index) => (
                      <div key={index} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                        <h3 className="font-medium text-white text-sm mb-1">
                          {similarCase.case_title?.substring(0, 50)}...
                        </h3>
                        <p className="text-slate-400 text-xs mb-2">
                          {similarCase.case_summary?.substring(0, 100)}...
                        </p>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>{similarCase.court}</span>
                          <span>{similarCase.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recommendations */}
              {prediction.recommendations && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h2 className="text-xl font-semibold text-white mb-4">AI Recommendations</h2>
                  <ul className="space-y-2">
                    {prediction.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-300 text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          
          {!prediction && !loading && (
            <div className="bg-slate-800/30 rounded-xl p-12 border border-slate-700 text-center">
              <Brain className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Select a case or enter custom case details to begin AI-powered outcome prediction</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CasePrediction