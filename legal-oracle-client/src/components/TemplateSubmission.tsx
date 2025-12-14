/**
 * Community Template Submission Component
 * Allows users to create and submit game theory templates for the marketplace
 * 
 * Features:
 * - Multi-step form wizard
 * - Matrix builder with validation
 * - Preview before submission
 * - Category and pricing selection
 */

import React, { useState } from 'react'
import {
  FileText,
  DollarSign,
  Grid3X3,
  Eye,
  Send,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Tag,
  Briefcase
} from 'lucide-react'
import { getAuthHeaders } from '../lib/supabase'

// Types
interface GameMatrix {
  players: [string, string]
  strategies: [string[], string[]]
  payoffs_p1: number[][]
  payoffs_p2: number[][]
  variables: Record<string, string>
  default_values: Record<string, number>
}

interface TemplateFormData {
  title: string
  description: string
  category: string
  pricing_model: 'free' | 'one_time'
  price: number
  game_matrix: GameMatrix
  instructions: string
  sample_scenario: string
  jurisdiction: string
  case_types: string[]
  tags: string[]
}

const CATEGORIES = [
  { id: 'civil_litigation', name: 'Civil Litigation', icon: Briefcase },
  { id: 'contract_disputes', name: 'Contract Disputes', icon: FileText },
  { id: 'employment_law', name: 'Employment Law', icon: Briefcase },
  { id: 'personal_injury', name: 'Personal Injury', icon: AlertCircle },
  { id: 'real_estate', name: 'Real Estate', icon: Briefcase },
  { id: 'intellectual_property', name: 'Intellectual Property', icon: Tag },
  { id: 'family_law', name: 'Family Law', icon: Briefcase },
  { id: 'other', name: 'Other', icon: Grid3X3 }
]

const JURISDICTIONS = [
  'federal', 'ndca', 'sdny', 'cdca', 'edtx', 'del',
  'ca_state', 'ny_state', 'tx_state', 'fl_state'
]

const INITIAL_MATRIX: GameMatrix = {
  players: ['Player 1', 'Player 2'],
  strategies: [['Strategy A', 'Strategy B'], ['Strategy X', 'Strategy Y']],
  payoffs_p1: [[50, 30], [70, 40]],
  payoffs_p2: [[50, 70], [30, 60]],
  variables: {},
  default_values: {}
}

const INITIAL_FORM: TemplateFormData = {
  title: '',
  description: '',
  category: 'civil_litigation',
  pricing_model: 'free',
  price: 0,
  game_matrix: INITIAL_MATRIX,
  instructions: '',
  sample_scenario: '',
  jurisdiction: 'federal',
  case_types: [],
  tags: []
}

// Step components
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = ['Basics', 'Matrix', 'Details', 'Preview']
  
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, idx) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
              transition-all duration-300
              ${idx < currentStep 
                ? 'bg-green-500 text-white' 
                : idx === currentStep 
                ? 'bg-blue-500 text-white ring-4 ring-blue-500/30' 
                : 'bg-slate-700 text-slate-400'}
            `}>
              {idx < currentStep ? <CheckCircle size={20} /> : idx + 1}
            </div>
            <span className={`text-xs mt-2 ${idx === currentStep ? 'text-white' : 'text-slate-500'}`}>
              {step}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`w-16 h-0.5 mx-2 ${idx < currentStep ? 'bg-green-500' : 'bg-slate-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function Step1Basics({ 
  data, 
  onChange 
}: { 
  data: TemplateFormData; 
  onChange: (updates: Partial<TemplateFormData>) => void 
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Template Title *
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g., NY Tenant Eviction Defense Matrix"
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Description *
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe what this template does and who it's for..."
          rows={4}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Category *
          </label>
          <select
            value={data.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Jurisdiction
          </label>
          <select
            value={data.jurisdiction}
            onChange={(e) => onChange({ jurisdiction: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
          >
            {JURISDICTIONS.map(j => (
              <option key={j} value={j}>{j.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Pricing
        </label>
        <div className="flex gap-4">
          <label className={`
            flex-1 flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
            ${data.pricing_model === 'free' 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-slate-600 hover:border-slate-500'}
          `}>
            <input
              type="radio"
              name="pricing"
              value="free"
              checked={data.pricing_model === 'free'}
              onChange={() => onChange({ pricing_model: 'free', price: 0 })}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${data.pricing_model === 'free' ? 'border-blue-500' : 'border-slate-500'}`}>
              {data.pricing_model === 'free' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
            </div>
            <div>
              <div className="font-medium text-white">Free</div>
              <div className="text-sm text-slate-400">Share with community</div>
            </div>
          </label>
          
          <label className={`
            flex-1 flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
            ${data.pricing_model === 'one_time' 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-slate-600 hover:border-slate-500'}
          `}>
            <input
              type="radio"
              name="pricing"
              value="one_time"
              checked={data.pricing_model === 'one_time'}
              onChange={() => onChange({ pricing_model: 'one_time', price: 9.99 })}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${data.pricing_model === 'one_time' ? 'border-blue-500' : 'border-slate-500'}`}>
              {data.pricing_model === 'one_time' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
            </div>
            <div>
              <div className="font-medium text-white">Paid</div>
              <div className="text-sm text-slate-400">Earn 70% revenue</div>
            </div>
          </label>
        </div>
        
        {data.pricing_model === 'one_time' && (
          <div className="mt-4">
            <label className="block text-sm text-slate-400 mb-1">Price (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                min="0.99"
                step="0.01"
                value={data.price}
                onChange={(e) => onChange({ price: parseFloat(e.target.value) || 0 })}
                className="w-32 bg-slate-800 border border-slate-600 rounded-lg pl-8 pr-4 py-2 text-white"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">You'll earn ${(data.price * 0.7).toFixed(2)} per sale</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Step2Matrix({ 
  data, 
  onChange 
}: { 
  data: TemplateFormData; 
  onChange: (updates: Partial<TemplateFormData>) => void 
}) {
  const matrix = data.game_matrix
  
  const updateMatrix = (updates: Partial<GameMatrix>) => {
    onChange({ game_matrix: { ...matrix, ...updates } })
  }
  
  const updatePayoff = (player: 1 | 2, row: number, col: number, value: number) => {
    const key = player === 1 ? 'payoffs_p1' : 'payoffs_p2'
    const newPayoffs = [...matrix[key]]
    newPayoffs[row] = [...newPayoffs[row]]
    newPayoffs[row][col] = value
    updateMatrix({ [key]: newPayoffs })
  }
  
  const updateStrategy = (player: 0 | 1, index: number, value: string) => {
    const newStrategies: [string[], string[]] = [[...matrix.strategies[0]], [...matrix.strategies[1]]]
    newStrategies[player][index] = value
    updateMatrix({ strategies: newStrategies })
  }
  
  return (
    <div className="space-y-6">
      {/* Player Names */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Player 1 (Row Player)
          </label>
          <input
            type="text"
            value={matrix.players[0]}
            onChange={(e) => updateMatrix({ players: [e.target.value, matrix.players[1]] })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Player 2 (Column Player)
          </label>
          <input
            type="text"
            value={matrix.players[1]}
            onChange={(e) => updateMatrix({ players: [matrix.players[0], e.target.value] })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>
      </div>
      
      {/* Matrix Builder */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-blue-400" />
            Payoff Matrix
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <HelpCircle size={14} />
            <span>Enter payoffs as (P1, P2)</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="p-2"></th>
                {matrix.strategies[1].map((strat, j) => (
                  <th key={j} className="p-2">
                    <input
                      type="text"
                      value={strat}
                      onChange={(e) => updateStrategy(1, j, e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-center text-white"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.strategies[0].map((strat, i) => (
                <tr key={i}>
                  <td className="p-2">
                    <input
                      type="text"
                      value={strat}
                      onChange={(e) => updateStrategy(0, i, e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    />
                  </td>
                  {matrix.strategies[1].map((_, j) => (
                    <td key={j} className="p-2">
                      <div className="flex items-center gap-1 bg-slate-700/50 rounded p-2">
                        <input
                          type="number"
                          value={matrix.payoffs_p1[i]?.[j] ?? 0}
                          onChange={(e) => updatePayoff(1, i, j, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-800 border border-blue-500/50 rounded px-2 py-1 text-sm text-blue-400 text-center"
                        />
                        <span className="text-slate-500">,</span>
                        <input
                          type="number"
                          value={matrix.payoffs_p2[i]?.[j] ?? 0}
                          onChange={(e) => updatePayoff(2, i, j, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-800 border border-green-500/50 rounded px-2 py-1 text-sm text-green-400 text-center"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex gap-4 mt-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            <span className="text-slate-400">{matrix.players[0]} payoff</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span className="text-slate-400">{matrix.players[1]} payoff</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function Step3Details({ 
  data, 
  onChange 
}: { 
  data: TemplateFormData; 
  onChange: (updates: Partial<TemplateFormData>) => void 
}) {
  const [newTag, setNewTag] = useState('')
  
  const addTag = () => {
    if (newTag.trim() && !data.tags.includes(newTag.trim())) {
      onChange({ tags: [...data.tags, newTag.trim()] })
      setNewTag('')
    }
  }
  
  const removeTag = (tag: string) => {
    onChange({ tags: data.tags.filter(t => t !== tag) })
  }
  
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Usage Instructions *
        </label>
        <textarea
          value={data.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
          placeholder="Explain how to use this template step by step..."
          rows={4}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Sample Scenario
        </label>
        <textarea
          value={data.sample_scenario}
          onChange={(e) => onChange({ sample_scenario: e.target.value })}
          placeholder="Describe a typical scenario where this template would be used..."
          rows={3}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {data.tags.map(tag => (
            <span 
              key={tag} 
              className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-white">
                <Trash2 size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            placeholder="Add a tag..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500"
          />
          <button
            onClick={addTag}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Step4Preview({ data }: { data: TemplateFormData }) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-xl p-6 border border-blue-500/30">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-blue-400">
              {CATEGORIES.find(c => c.id === data.category)?.name}
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">{data.title || 'Untitled Template'}</h2>
            <p className="text-slate-400 mt-2">{data.description || 'No description provided'}</p>
          </div>
          <div className="text-right">
            {data.pricing_model === 'free' ? (
              <span className="text-2xl font-bold text-green-400">FREE</span>
            ) : (
              <span className="text-2xl font-bold text-white">${data.price.toFixed(2)}</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
            {data.jurisdiction.toUpperCase()}
          </span>
          {data.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-400">
              {tag}
            </span>
          ))}
        </div>
      </div>
      
      {/* Matrix Preview */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Payoff Matrix Preview</h3>
        <div className="text-sm text-slate-300">
          <p><strong>Players:</strong> {data.game_matrix.players.join(' vs ')}</p>
          <p className="mt-1"><strong>Strategies:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>{data.game_matrix.players[0]}: {data.game_matrix.strategies[0].join(', ')}</li>
            <li>{data.game_matrix.players[1]}: {data.game_matrix.strategies[1].join(', ')}</li>
          </ul>
        </div>
      </div>
      
      {data.instructions && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Instructions</h3>
          <p className="text-slate-300 whitespace-pre-wrap">{data.instructions}</p>
        </div>
      )}
    </div>
  )
}

// Main Component
export function TemplateSubmission() {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<TemplateFormData>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  const updateForm = (updates: Partial<TemplateFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }
  
  const canProceed = () => {
    switch (step) {
      case 0: return formData.title.length > 3 && formData.description.length > 10
      case 1: return true // Matrix is always valid
      case 2: return formData.instructions.length > 10
      case 3: return true
      default: return false
    }
  }
  
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1'
      
      // Submit template (would go to backend)
      console.log('Submitting template:', formData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSubmitted(true)
    } catch (error) {
      console.error('Submission error:', error)
    } finally {
      setSubmitting(false)
    }
  }
  
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Template Submitted!</h2>
        <p className="text-slate-400 mb-6">
          Your template has been submitted for review. We'll notify you once it's approved and live on the marketplace.
        </p>
        <button
          onClick={() => {
            setFormData(INITIAL_FORM)
            setStep(0)
            setSubmitted(false)
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          Create Another Template
        </button>
      </div>
    )
  }
  
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">Create Template</h1>
        <p className="text-slate-400 mt-2">Share your game theory expertise with the community</p>
      </div>
      
      <StepIndicator currentStep={step} totalSteps={4} />
      
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700 p-8">
        {step === 0 && <Step1Basics data={formData} onChange={updateForm} />}
        {step === 1 && <Step2Matrix data={formData} onChange={updateForm} />}
        {step === 2 && <Step3Details data={formData} onChange={updateForm} />}
        {step === 3 && <Step4Preview data={formData} />}
        
        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
            Back
          </button>
          
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium"
            >
              Continue
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Template
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TemplateSubmission
