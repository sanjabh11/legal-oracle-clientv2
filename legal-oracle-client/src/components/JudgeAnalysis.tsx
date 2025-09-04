import React, { useState, useEffect } from 'react'
import { Gavel, User, BarChart3, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import { LegalDatabaseService, supabase, getAuthHeaders } from '../lib/supabase'

// Types
type Judge = {
  id?: string | number
  judge_name: string
  court?: string
  appointment_date?: string
  judicial_philosophy?: string
  political_leanings?: string
  cases_decided: number
  reversal_rate: number
  precedent_adherence_score: number
  decision_patterns?: Record<string, number>
  case_types_handled?: string[]
  average_sentence_length?: number | string
}

type JudgeAnalysisResult = {
  basicInfo: {
    name: string
    court?: string
    appointmentDate?: string
    tenure: number
    philosophy?: string
    politicalLeaning?: string
  }
  statistics: {
    totalCases: number
    reversalRate: number
    precedentAdherence: number
    avgCaseLength: number | string
  }
  patterns?: Record<string, number>
  expertise?: string[]
  predictability: {
    consistency: number
    reliability: number
    expertise_depth: number
  }
  comparison: {
    vs_national_avg: {
      reversal_rate: number
      case_load: number
    }
  }
  recommendations: string[]
  relatedCases: any[]
}

// Judge Behavior Analysis Component - User Story 2
export function JudgeAnalysis() {
  const [judges, setJudges] = useState<Judge[]>([])
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null)
  const [analysis, setAnalysis] = useState<JudgeAnalysisResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [filterCourt, setFilterCourt] = useState<'all' | 'district' | 'circuit' | 'supreme'>('all')
  const [sortBy, setSortBy] = useState<'cases_decided' | 'reversal_rate' | 'precedent_adherence' | 'name'>('cases_decided')
  
  useEffect(() => {
    async function loadJudges() {
      const judgePatterns = await LegalDatabaseService.getJudgePatterns()
      setJudges(judgePatterns)
    }
    loadJudges()
  }, [])
  
  const analyzeJudge = async (judge: Judge) => {
    setLoading(true)
    try {
      // Call backend API for judge analysis
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
      const response = await fetch(`${apiBase}/judge_analysis/${judge.id}`, {
        method: 'GET',
        headers: {
          ...(await getAuthHeaders())
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Get related cases via direct query (or could add API)
        const relatedCases = await LegalDatabaseService.getLegalCases({
          court_level: judge.court?.includes('District') ? 'District Court' : 'Circuit Court'
        })
        
        // Build analysis object
        const judgeAnalysis = {
          basicInfo: {
            name: data.judge_name || judge.judge_name,
            court: judge.court,
            appointmentDate: judge.appointment_date,
            tenure: new Date().getFullYear() - new Date(judge.appointment_date).getFullYear(),
            philosophy: judge.judicial_philosophy,
            politicalLeaning: judge.political_leanings
          },
          statistics: {
            totalCases: data.case_count || judge.cases_decided,
            reversalRate: data.reversal_rate || judge.reversal_rate,
            precedentAdherence: judge.precedent_adherence_score,
            avgCaseLength: data.avg_damages || judge.average_sentence_length || 'N/A'
          },
          patterns: judge.decision_patterns,
          expertise: judge.case_types_handled,
          predictability: {
            consistency: judge.precedent_adherence_score,
            reliability: 1 - (data.reversal_rate || judge.reversal_rate),
            expertise_depth: judge.case_types_handled?.length || 0
          },
          comparison: {
            vs_national_avg: {
              reversal_rate: ((data.reversal_rate || judge.reversal_rate) - 0.15) * 100,
              case_load: ((data.case_count || judge.cases_decided) - 200) / 200 * 100
            }
          },
          recommendations: [
            (data.reversal_rate || judge.reversal_rate) < 0.1 ? 'Highly reliable - strong appellate record' : 'Monitor appellate outcomes',
            judge.precedent_adherence_score > 0.8 ? 'Precedent-focused - prepare legal history' : 'Innovation-friendly - novel arguments viable',
            `Specializes in: ${judge.case_types_handled?.slice(0, 3).join(', ')}`,
            `${judge.political_leanings} judicial philosophy - tailor arguments accordingly`
          ],
          relatedCases: relatedCases.slice(0, 5)
        }
        
        setAnalysis(judgeAnalysis)
      } else {
        throw new Error('API call failed')
      }
    } catch (error) {
      console.error('Judge analysis error:', error)
      // Fallback to client-side analysis
      const relatedCases = await LegalDatabaseService.getLegalCases({
        court_level: judge.court?.includes('District') ? 'District Court' : 'Circuit Court'
      })
      
      const judgeAnalysis = {
        basicInfo: {
          name: judge.judge_name,
          court: judge.court,
          appointmentDate: judge.appointment_date,
          tenure: new Date().getFullYear() - new Date(judge.appointment_date).getFullYear(),
          philosophy: judge.judicial_philosophy,
          politicalLeaning: judge.political_leanings
        },
        statistics: {
          totalCases: judge.cases_decided,
          reversalRate: judge.reversal_rate,
          precedentAdherence: judge.precedent_adherence_score,
          avgCaseLength: judge.average_sentence_length || 'N/A'
        },
        patterns: judge.decision_patterns,
        expertise: judge.case_types_handled,
        predictability: {
          consistency: judge.precedent_adherence_score,
          reliability: 1 - judge.reversal_rate,
          expertise_depth: judge.case_types_handled?.length || 0
        },
        comparison: {
          vs_national_avg: {
            reversal_rate: (judge.reversal_rate - 0.15) * 100,
            case_load: (judge.cases_decided - 200) / 200 * 100
          }
        },
        recommendations: [
          judge.reversal_rate < 0.1 ? 'Highly reliable - strong appellate record' : 'Monitor appellate outcomes',
          judge.precedent_adherence_score > 0.8 ? 'Precedent-focused - prepare legal history' : 'Innovation-friendly - novel arguments viable',
          `Specializes in: ${judge.case_types_handled?.slice(0, 3).join(', ')}`,
          `${judge.political_leanings} judicial philosophy - tailor arguments accordingly`
        ],
        relatedCases: relatedCases.slice(0, 5)
      }
      
      setAnalysis(judgeAnalysis)
    } finally {
      setLoading(false)
    }
  }
  
  const filteredJudges: Judge[] = judges
    .filter((judge) =>
      filterCourt === 'all' ||
      (filterCourt === 'district' && Boolean(judge.court?.includes('District'))) ||
      (filterCourt === 'circuit' && Boolean(judge.court?.includes('Circuit'))) ||
      (filterCourt === 'supreme' && Boolean(judge.court?.includes('Supreme')))
    )
    .sort((a, b) => {
      if (sortBy === 'cases_decided') return b.cases_decided - a.cases_decided
      if (sortBy === 'reversal_rate') return a.reversal_rate - b.reversal_rate
      if (sortBy === 'precedent_adherence') return b.precedent_adherence_score - a.precedent_adherence_score
      return a.judge_name.localeCompare(b.judge_name)
    })
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Gavel className="h-8 w-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">Judge Behavior Analysis</h1>
        </div>
        <p className="text-blue-200">
          Comprehensive analysis of judicial patterns, decision-making tendencies, and predictive insights
        </p>
      </div>
      
      {/* Filters and Controls */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Filter by Court</label>
          <select
            value={filterCourt}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCourt(e.target.value as typeof filterCourt)}
            className="bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Courts</option>
            <option value="district">District Courts</option>
            <option value="circuit">Circuit Courts</option>
            <option value="supreme">Supreme Court</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-slate-300 mb-1">Sort by</label>
          <select
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:border-purple-500 focus:outline-none"
          >
            <option value="cases_decided">Cases Decided</option>
            <option value="reversal_rate">Reversal Rate</option>
            <option value="precedent_adherence">Precedent Adherence</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Judge List */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Federal Judges ({filteredJudges.length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredJudges.map((judge, index) => (
                <div
                  key={String(judge.id ?? index)}
                  onClick={() => {
                    setSelectedJudge(judge)
                    setAnalysis(null)
                  }}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedJudge?.judge_name === judge.judge_name
                      ? 'bg-purple-600/30 border-purple-500/50'
                      : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600'
                  } border`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white text-sm">
                      {judge.judge_name}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <Award className="h-3 w-3 text-yellow-400" />
                      <span className="text-xs text-yellow-400">
                        {(judge.precedent_adherence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-400 mb-2">
                    {judge.court}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-4">
                      <span className="text-blue-400">{judge.cases_decided} cases</span>
                      <span className="text-green-400">
                        {(judge.reversal_rate * 100).toFixed(1)}% reversal
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      judge.political_leanings === 'Conservative' ? 'bg-red-500/20 text-red-400' :
                      judge.political_leanings === 'Liberal' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {judge.political_leanings}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Panel - Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {selectedJudge && (
            <>
              {/* Judge Overview */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-6 w-6 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">{selectedJudge.judge_name}</h2>
                  </div>
                  <button
                    onClick={() => analyzeJudge(selectedJudge)}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4" />
                        <span>Deep Analysis</span>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-300 mb-2">Court Assignment</h3>
                    <p className="text-white">{selectedJudge.court}</p>
                    
                    <h3 className="font-semibold text-slate-300 mb-2 mt-4">Appointment Date</h3>
                    <p className="text-white">{selectedJudge.appointment_date}</p>
                    
                    <h3 className="font-semibold text-slate-300 mb-2 mt-4">Judicial Philosophy</h3>
                    <p className="text-white text-sm">{selectedJudge.judicial_philosophy}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-400">{analysis?.statistics.totalCases || selectedJudge.cases_decided}</div>
                      <div className="text-xs text-slate-400">Cases Decided</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-400">
                        {(analysis?.statistics.reversalRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-400">Reversal Rate</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-yellow-400">
                        {(analysis?.statistics.precedentAdherence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-400">Precedent Adherence</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-400">
                        {analysis?.expertise?.length || selectedJudge.case_types_handled?.length || 0}
                      </div>
                      <div className="text-xs text-slate-400">Practice Areas</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {analysis && (
                <>
                  {/* Decision Patterns */}
                  {analysis.patterns && (
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-green-400" />
                        <span>Decision Patterns</span>
                      </h2>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(analysis.patterns).map(([key, value]) => {
                          const percentage = typeof value === 'number' ? (value * 100).toFixed(0) : String(value)
                          return (
                            <div key={key} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 capitalize text-sm">
                                  {key.replace(/_/g, ' ')}
                                </span>
                                <span className="text-white font-medium">{percentage}%</span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Predictability Analysis */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-blue-400" />
                      <span>Predictability Score</span>
                    </h2>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                          {(analysis.predictability.consistency * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-slate-400">Consistency</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400 mb-2">
                          {(analysis.predictability.reliability * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-slate-400">Reliability</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-400 mb-2">
                          {analysis.predictability.expertise_depth}
                        </div>
                        <div className="text-sm text-slate-400">Expertise Areas</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Comparison Metrics */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Comparison to National Average</h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Reversal Rate vs National Avg</span>
                        <div className="flex items-center space-x-2">
                          {analysis.comparison.vs_national_avg.reversal_rate < 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-400 rotate-180" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-orange-400" />
                          )}
                          <span className={`font-medium ${
                            analysis.comparison.vs_national_avg.reversal_rate < 0 ? 'text-green-400' : 'text-orange-400'
                          }`}>
                            {Math.abs(analysis.comparison.vs_national_avg.reversal_rate).toFixed(1)}% 
                            {analysis.comparison.vs_national_avg.reversal_rate < 0 ? 'lower' : 'higher'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Case Load vs National Avg</span>
                        <div className="flex items-center space-x-2">
                          {analysis.comparison.vs_national_avg.case_load > 0 ? (
                            <TrendingUp className="h-4 w-4 text-blue-400" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-slate-400 rotate-180" />
                          )}
                          <span className={`font-medium ${
                            analysis.comparison.vs_national_avg.case_load > 0 ? 'text-blue-400' : 'text-slate-400'
                          }`}>
                            {Math.abs(analysis.comparison.vs_national_avg.case_load).toFixed(1)}% 
                            {analysis.comparison.vs_national_avg.case_load > 0 ? 'higher' : 'lower'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Strategic Recommendations */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Strategic Recommendations</h2>
                    <ul className="space-y-3">
                      {analysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </>
          )}
          
          {!selectedJudge && (
            <div className="bg-slate-800/30 rounded-xl p-12 border border-slate-700 text-center">
              <Gavel className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Select a judge from the list to view detailed behavioral analysis and decision patterns</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default JudgeAnalysis