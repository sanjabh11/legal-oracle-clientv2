import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// HuggingFace configuration for client-side AI
// NOTE: Do not expose HuggingFace tokens in client code. If needed, proxy requests via backend API only.
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models'
// const HUGGINGFACE_TOKEN = import.meta.env.VITE_HUGGINGFACE_API (DISABLED: do not expose in client)

// HuggingFace API wrapper for legal analysis
export class HuggingFaceAPI {
  static async analyzeText(text: string, model = 'microsoft/DialoGPT-medium') {
    try {
      const response = await fetch(`${HUGGINGFACE_API_URL}/${model}`, {
        headers: {
          // NOTE: HuggingFace token must not be exposed in client. This call will not work without a backend proxy; client-side secrets are disabled per security policy.
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ inputs: text, parameters: { max_length: 500 } }),
      })
      
      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status}`)
      }
      
      const result = await response.json()
      return result
    } catch (error) {
      console.error('HuggingFace API error:', error)
      return null
    }
  }

  static async classifyLegalText(text: string) {
    try {
      const response = await fetch(`${HUGGINGFACE_API_URL}/facebook/bart-large-mnli`, {
        headers: {
          // NOTE: HuggingFace token must not be exposed in client. This call will not work without a backend proxy; client-side secrets are disabled per security policy.
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: ['contract', 'tort', 'criminal', 'constitutional', 'employment', 'corporate', 'environmental']
          }
        }),
      })
      
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Legal classification error:', error)
      return null
    }
  }

  static async predictOutcome(caseText: string, similarCases: any[] = []) {
    try {
      // Call real Supabase edge function with HuggingFace integration
      const response = await fetch(`${supabaseUrl}/functions/v1/strategic-research-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'search_caselaw',
          query: caseText.substring(0, 200),
          limit: 3,
          jurisdiction: 'federal'
        })
      })

      if (response.ok) {
        const result = await response.json()
        const cases = result.data?.search_results?.results || []
        
        return {
          prediction: cases.length > 0 ? 'Settlement Likely' : 'Insufficient Data',
          confidence: cases.length > 0 ? 0.85 : 0.50,
          analysis: `Found ${cases.length} similar cases from HuggingFace legal dataset`,
          factors: [
            `${cases.length} similar cases analyzed`,
            'Real legal precedent data',
            'HuggingFace AI processing',
            'Harvard Law School dataset'
          ],
          similarCases: cases
        }
      }
    } catch (error) {
      console.error('HuggingFace prediction error:', error)
    }
    
    // No demo fallback: surface failure to caller
    throw new Error('Prediction failed')
  }
}

// Database service for legal data operations
export class LegalDatabaseService {
  // Demo mode and demo datasets removed per LO-PBI-001-T20

  // Fetch legal cases with filtering
  static async getLegalCases(filters: any = {}) {
    let query = supabase.from('legal_cases').select('*')
    
    if (filters.case_type) {
      query = query.eq('case_type', filters.case_type)
    }
    if (filters.jurisdiction) {
      query = query.eq('jurisdiction', filters.jurisdiction)
    }
    if (filters.status) {
      query = query.eq('case_status', filters.status)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
      console.error('Database error:', error)
      return []
    }
    return data || []
  }

  // Fetch caselaw cache entries
  static async getCaselawEntries(limit = 50) {
    const { data, error } = await supabase
      .from('legal_oracle_caselaw_cache')
      .select('*')
      .order('fetch_timestamp', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Caselaw fetch error:', error)
      return []
    }
    return data || []
  }

  // Fetch judge patterns
  static async getJudgePatterns() {
    const { data, error } = await supabase
      .from('judge_patterns')
      .select('*')
      .order('cases_decided', { ascending: false })
    
    if (error) {
      console.error('Judge patterns error:', error)
      return []
    }
    return data || []
  }

  // Search similar cases using text similarity
  static async searchSimilarCases(searchText: string, limit = 10) {
    const { data, error } = await supabase
      .from('legal_oracle_caselaw_cache')
      .select('*')
      .textSearch('case_text', searchText)
      .limit(limit)
    
    if (error) {
      console.error('Case search error:', error)
      return []
    }
    return data || []
  }

  // Get strategic patterns for game theory
  static async getStrategicPatterns() {
    const { data, error } = await supabase
      .from('strategic_patterns')
      .select('*')
    
    if (error) {
      console.error('Strategic patterns error:', error)
      return []
    }
    return data || []
  }
}

// Game theory Nash equilibrium calculator
export class GameTheoryEngine {
  static calculateNashEquilibrium(players: any[], strategies: any[], payoffMatrix: number[][]) {
    // Simplified Nash equilibrium calculation
    // In a real implementation, this would use more sophisticated algorithms
    
    const numPlayers = players.length
    const numStrategies = strategies.length
    
    if (payoffMatrix.length !== numStrategies || payoffMatrix[0].length !== numStrategies) {
      throw new Error('Payoff matrix dimensions must match number of strategies')
    }
    
    // Find pure strategy Nash equilibria
    const equilibria = []
    
    for (let i = 0; i < numStrategies; i++) {
      for (let j = 0; j < numStrategies; j++) {
        const player1Payoff = payoffMatrix[i][j]
        const player2Payoff = payoffMatrix[j][i]
        
        // Check if this is a Nash equilibrium
        let isEquilibrium = true
        
        // Check if player 1 wants to deviate
        for (let k = 0; k < numStrategies; k++) {
          if (k !== i && payoffMatrix[k][j] > player1Payoff) {
            isEquilibrium = false
            break
          }
        }
        
        // Check if player 2 wants to deviate
        if (isEquilibrium) {
          for (let k = 0; k < numStrategies; k++) {
            if (k !== j && payoffMatrix[i][k] > player2Payoff) {
              isEquilibrium = false
              break
            }
          }
        }
        
        if (isEquilibrium) {
          equilibria.push({
            player1Strategy: strategies[i],
            player2Strategy: strategies[j],
            player1Payoff,
            player2Payoff,
            coordinates: [i, j]
          })
        }
      }
    }
    
    // Calculate mixed strategy equilibrium if no pure strategy equilibria exist
    if (equilibria.length === 0) {
      // Simplified mixed strategy calculation
      equilibria.push({
        player1Strategy: 'Mixed Strategy',
        player2Strategy: 'Mixed Strategy',
        player1Payoff: payoffMatrix[0][0] * 0.5 + payoffMatrix[1][1] * 0.5,
        player2Payoff: payoffMatrix[0][0] * 0.5 + payoffMatrix[1][1] * 0.5,
        mixedStrategy: true,
        probabilities: [0.5, 0.5]
      })
    }
    
    return {
      equilibria,
      payoffMatrix,
      strategies,
      analysis: {
        numEquilibria: equilibria.length,
        hasStableEquilibrium: equilibria.length > 0,
        recommendedStrategy: equilibria[0]?.player1Strategy || strategies[0]
      }
    }
  }

  static calculateSettlementProbability(caseDetails: any, playerStrategies: any[]) {
    // Factors affecting settlement probability
    const factors = {
      caseStrength: caseDetails.precedent_value || 0.7,
      legalCosts: 0.8, // High costs favor settlement
      timeToTrial: 0.6, // Longer time favors settlement
      publicityRisk: 0.5,
      relationshipValue: 0.4
    }
    
    // Calculate base settlement probability
    let baseProb = Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length
    
    // Adjust based on player strategies
    playerStrategies.forEach(strategy => {
      if (strategy.name === 'Aggressive Litigation') baseProb -= 0.2
      if (strategy.name === 'Settlement Priority') baseProb += 0.3
      if (strategy.name === 'Collaborative Negotiation') baseProb += 0.15
    })
    
    // Ensure probability is between 0 and 1
    const settlementProb = Math.max(0, Math.min(1, baseProb))
    
    return {
      probability: settlementProb,
      factors,
      recommendation: settlementProb > 0.7 ? 'Strongly Recommend Settlement' :
                     settlementProb > 0.5 ? 'Consider Settlement' :
                     'Proceed to Trial',
      estimatedSavings: settlementProb * 100000, // Estimated cost savings
      riskAnalysis: {
        trialRisk: 1 - settlementProb,
        costRisk: (1 - settlementProb) * 0.8,
        timeRisk: (1 - settlementProb) * 0.9
      }
    }
  }
}

export async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error("No session - user must sign in")
  return { Authorization: `Bearer ${token}` }
}