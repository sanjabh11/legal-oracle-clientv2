/**
 * Glass Box UI Components
 * Based on Monetization Research v2.1 - Transparency-First UI Strategy
 * 
 * Key Features:
 * - Confidence interval visualization (Traffic Light System)
 * - Citation trails linking AI assertions to sources
 * - "Why This?" tooltips explaining reasoning
 * - Missing data highlighting
 */

import React, { useState } from 'react'
import { 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Scale,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react'

// Types
export interface Citation {
  id: string
  caseId: string
  caseName: string
  court: string
  year: number
  relevanceScore: number
  excerpt?: string
  sourceUrl?: string
  citationType: 'supports' | 'contradicts' | 'neutral'
}

export interface ConfidenceData {
  score: number // 0-1
  interval: {
    low: number
    high: number
  }
  factors: ConfidenceFactor[]
  missingData?: string[]
}

export interface ConfidenceFactor {
  name: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  explanation: string
  citations?: Citation[]
}

export interface ReasoningStep {
  step: number
  description: string
  confidence: number
  citations: Citation[]
}

// Confidence Traffic Light Component
interface ConfidenceIndicatorProps {
  confidence: ConfidenceData
  size?: 'sm' | 'md' | 'lg'
  showInterval?: boolean
  showDetails?: boolean
}

export function ConfidenceIndicator({ 
  confidence, 
  size = 'md', 
  showInterval = true,
  showDetails = false 
}: ConfidenceIndicatorProps) {
  const [expanded, setExpanded] = useState(showDetails)
  
  const getConfidenceLevel = (score: number) => {
    if (score >= 0.7) return { level: 'high', color: 'green', label: 'High Confidence' }
    if (score >= 0.4) return { level: 'medium', color: 'yellow', label: 'Medium Confidence' }
    return { level: 'low', color: 'red', label: 'Low Confidence' }
  }
  
  const { level, color, label } = getConfidenceLevel(confidence.score)
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  
  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22
  }
  
  const colorClasses = {
    green: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/50',
      text: 'text-green-400',
      icon: CheckCircle
    },
    yellow: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400',
      icon: AlertTriangle
    },
    red: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      text: 'text-red-400',
      icon: AlertCircle
    }
  }
  
  const styles = colorClasses[color]
  const Icon = styles.icon
  
  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-3`}>
      <div 
        className={`flex items-center justify-between cursor-pointer ${sizeClasses[size]}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Icon size={iconSizes[size]} className={styles.text} />
          <span className={`font-medium ${styles.text}`}>{label}</span>
          <span className="text-slate-300">
            {(confidence.score * 100).toFixed(0)}%
          </span>
          {showInterval && (
            <span className="text-slate-400 text-xs">
              (±{((confidence.interval.high - confidence.interval.low) / 2 * 100).toFixed(0)}%)
            </span>
          )}
        </div>
        <button className="text-slate-400 hover:text-white">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-600/50 space-y-3">
          {/* Confidence Interval Bar */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Confidence Interval</div>
            <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`absolute h-full ${styles.bg.replace('/20', '')}`}
                style={{
                  left: `${confidence.interval.low * 100}%`,
                  width: `${(confidence.interval.high - confidence.interval.low) * 100}%`
                }}
              />
              <div 
                className="absolute w-1 h-full bg-white"
                style={{ left: `${confidence.score * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{(confidence.interval.low * 100).toFixed(0)}%</span>
              <span>{(confidence.interval.high * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          {/* Contributing Factors */}
          {confidence.factors.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-2">Contributing Factors</div>
              <div className="space-y-2">
                {confidence.factors.map((factor, idx) => (
                  <ConfidenceFactorItem key={idx} factor={factor} />
                ))}
              </div>
            </div>
          )}
          
          {/* Missing Data Warning */}
          {confidence.missingData && confidence.missingData.length > 0 && (
            <MissingDataWarning missingData={confidence.missingData} />
          )}
        </div>
      )}
    </div>
  )
}

// Confidence Factor Item
function ConfidenceFactorItem({ factor }: { factor: ConfidenceFactor }) {
  const [showExplanation, setShowExplanation] = useState(false)
  
  const impactColors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-slate-400'
  }
  
  const impactIcons = {
    positive: '+',
    negative: '-',
    neutral: '○'
  }
  
  return (
    <div className="bg-slate-800/50 rounded p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`font-mono ${impactColors[factor.impact]}`}>
            {impactIcons[factor.impact]}
          </span>
          <span className="text-sm text-slate-200">{factor.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {(factor.weight * 100).toFixed(0)}% weight
          </span>
          <button 
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-slate-400 hover:text-blue-400"
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </div>
      
      {showExplanation && (
        <div className="mt-2 text-xs text-slate-400 pl-5">
          <p>{factor.explanation}</p>
          {factor.citations && factor.citations.length > 0 && (
            <div className="mt-2">
              <span className="text-slate-500">Based on: </span>
              {factor.citations.map((c, i) => (
                <span key={c.id}>
                  <a href={c.sourceUrl} className="text-blue-400 hover:underline">
                    {c.caseName} ({c.year})
                  </a>
                  {i < factor.citations!.length - 1 && ', '}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Missing Data Warning Component
function MissingDataWarning({ missingData }: { missingData: string[] }) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-400 mt-0.5" />
        <div>
          <div className="text-xs font-medium text-amber-400">
            Missing Data Reduces Confidence
          </div>
          <ul className="text-xs text-amber-300/70 mt-1 list-disc list-inside">
            {missingData.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// Citation Trail Component
interface CitationTrailProps {
  citations: Citation[]
  title?: string
  maxVisible?: number
}

export function CitationTrail({ citations, title = "Supporting Citations", maxVisible = 5 }: CitationTrailProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  
  const visibleCitations = showAll ? citations : citations.slice(0, maxVisible)
  
  const typeColors = {
    supports: 'border-green-500/50 bg-green-500/10',
    contradicts: 'border-red-500/50 bg-red-500/10',
    neutral: 'border-slate-500/50 bg-slate-500/10'
  }
  
  const typeLabels = {
    supports: 'Supports',
    contradicts: 'Contradicts',
    neutral: 'Related'
  }
  
  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-blue-400" />
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <span className="text-xs text-slate-400">({citations.length} sources)</span>
        </div>
        <button className="text-slate-400 hover:text-white">
          {expanded ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      
      {expanded && (
        <div className="mt-3 space-y-2">
          {visibleCitations.map((citation) => (
            <div 
              key={citation.id}
              className={`border rounded p-3 ${typeColors[citation.citationType]}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {citation.caseName}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      citation.citationType === 'supports' ? 'bg-green-500/30 text-green-300' :
                      citation.citationType === 'contradicts' ? 'bg-red-500/30 text-red-300' :
                      'bg-slate-500/30 text-slate-300'
                    }`}>
                      {typeLabels[citation.citationType]}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {citation.court} • {citation.year}
                  </div>
                  {citation.excerpt && (
                    <p className="text-xs text-slate-300 mt-2 italic">
                      "{citation.excerpt}"
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-xs text-slate-400">
                    {(citation.relevanceScore * 100).toFixed(0)}% relevant
                  </div>
                  {citation.sourceUrl && (
                    <a 
                      href={citation.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {citations.length > maxVisible && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full text-center text-sm text-blue-400 hover:text-blue-300 py-2"
            >
              {showAll ? 'Show Less' : `Show ${citations.length - maxVisible} More`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// "Why This?" Tooltip Component
interface WhyThisTooltipProps {
  assertion: string
  reasoning: ReasoningStep[]
  children: React.ReactNode
}

export function WhyThisTooltip({ assertion, reasoning, children }: WhyThisTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="relative inline-block">
      <div 
        className="cursor-help border-b border-dashed border-blue-400/50"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-80 p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-xl -translate-x-1/2 left-1/2 mt-2">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 border-l border-t border-slate-600 rotate-45" />
          
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-white">Why This Conclusion?</span>
          </div>
          
          <div className="space-y-3">
            {reasoning.map((step) => (
              <div key={step.step} className="pl-3 border-l-2 border-blue-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-400">Step {step.step}</span>
                  <span className="text-xs text-slate-400">
                    {(step.confidence * 100).toFixed(0)}% confident
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">{step.description}</p>
                {step.citations.length > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    Based on: {step.citations.map(c => c.caseName).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Glass Box Prediction Card
interface GlassBoxPredictionProps {
  prediction: {
    outcome: string
    probability: number
  }
  confidence: ConfidenceData
  citations: Citation[]
  reasoning: ReasoningStep[]
}

export function GlassBoxPrediction({ 
  prediction, 
  confidence, 
  citations, 
  reasoning 
}: GlassBoxPredictionProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="text-blue-400" size={20} />
          <h2 className="text-lg font-semibold text-white">Glass Box Analysis</h2>
        </div>
        <p className="text-sm text-slate-300">
          Transparent AI prediction with full citation trail
        </p>
      </div>
      
      {/* Prediction Result */}
      <div className="p-4 border-b border-slate-700">
        <WhyThisTooltip assertion={prediction.outcome} reasoning={reasoning}>
          <div className="text-2xl font-bold text-white">
            {prediction.outcome}
          </div>
        </WhyThisTooltip>
        <div className="text-lg text-blue-400 mt-1">
          {(prediction.probability * 100).toFixed(1)}% probability
        </div>
      </div>
      
      {/* Confidence Indicator */}
      <div className="p-4 border-b border-slate-700">
        <ConfidenceIndicator confidence={confidence} showDetails />
      </div>
      
      {/* Citation Trail */}
      <div className="p-4">
        <CitationTrail citations={citations} />
      </div>
    </div>
  )
}

export default {
  ConfidenceIndicator,
  CitationTrail,
  WhyThisTooltip,
  GlassBoxPrediction
}
