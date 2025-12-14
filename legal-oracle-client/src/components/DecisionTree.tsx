/**
 * Decision Tree Visualization Component
 * Based on Addendum PRD v2.2 - Parameter #6: Decision Tree Visuals
 * 
 * "Generates a visual tree of 'If motion X -> Then Y' outcomes.
 * Visualizes complexity better than text blocks."
 */

import React, { useState, useMemo } from 'react'
import { 
  GitBranch, 
  ChevronRight, 
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Target,
  Scale,
  Percent,
  DollarSign,
  Clock,
  Info
} from 'lucide-react'

// Types
export interface DecisionNode {
  id: string
  label: string
  type: 'decision' | 'outcome' | 'chance'
  probability?: number
  value?: number
  description?: string
  children?: DecisionNode[]
  recommendation?: 'recommended' | 'not_recommended' | 'neutral'
}

export interface DecisionTreeProps {
  rootNode: DecisionNode
  title?: string
  onNodeClick?: (node: DecisionNode) => void
  highlightPath?: string[]
}

// Helper to calculate expected value recursively
function calculateEV(node: DecisionNode): number {
  if (!node.children || node.children.length === 0) {
    return node.value || 0
  }
  
  if (node.type === 'chance') {
    // Sum of (probability * value) for all children
    return node.children.reduce((sum, child) => {
      const childProb = child.probability || 0
      const childValue = calculateEV(child)
      return sum + (childProb * childValue)
    }, 0)
  } else {
    // For decision nodes, take max EV
    return Math.max(...node.children.map(child => calculateEV(child)))
  }
}

// Single Node Component
interface TreeNodeProps {
  node: DecisionNode
  depth: number
  onNodeClick?: (node: DecisionNode) => void
  highlightPath?: string[]
  parentPath?: string[]
}

function TreeNode({ node, depth, onNodeClick, highlightPath = [], parentPath = [] }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const currentPath = [...parentPath, node.id]
  const isHighlighted = highlightPath.includes(node.id)
  const hasChildren = node.children && node.children.length > 0
  const ev = useMemo(() => calculateEV(node), [node])
  
  const nodeColors = {
    decision: 'border-blue-500 bg-blue-500/10',
    outcome: node.recommendation === 'recommended' 
      ? 'border-green-500 bg-green-500/10'
      : node.recommendation === 'not_recommended'
      ? 'border-red-500 bg-red-500/10'
      : 'border-slate-500 bg-slate-500/10',
    chance: 'border-yellow-500 bg-yellow-500/10'
  }
  
  const nodeIcons = {
    decision: Scale,
    outcome: node.recommendation === 'recommended' ? CheckCircle : node.recommendation === 'not_recommended' ? XCircle : Target,
    chance: Percent
  }
  
  const Icon = nodeIcons[node.type]
  
  return (
    <div className={`ml-${Math.min(depth * 4, 16)}`}>
      <div 
        className={`
          relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer
          transition-all duration-200
          ${nodeColors[node.type]}
          ${isHighlighted ? 'ring-2 ring-white/50' : ''}
          hover:bg-opacity-20
        `}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded)
          onNodeClick?.(node)
        }}
        style={{ marginLeft: depth > 0 ? '24px' : '0' }}
      >
        {/* Connector line */}
        {depth > 0 && (
          <div 
            className="absolute -left-6 top-1/2 w-6 h-px bg-slate-600"
          />
        )}
        
        {/* Expand/Collapse button */}
        {hasChildren && (
          <button className="text-slate-400 hover:text-white p-1 -ml-1">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        
        {/* Node Icon */}
        <div className={`
          p-2 rounded-lg
          ${node.type === 'decision' ? 'bg-blue-500/20' : ''}
          ${node.type === 'outcome' ? (node.recommendation === 'recommended' ? 'bg-green-500/20' : node.recommendation === 'not_recommended' ? 'bg-red-500/20' : 'bg-slate-500/20') : ''}
          ${node.type === 'chance' ? 'bg-yellow-500/20' : ''}
        `}>
          <Icon size={20} className={`
            ${node.type === 'decision' ? 'text-blue-400' : ''}
            ${node.type === 'outcome' ? (node.recommendation === 'recommended' ? 'text-green-400' : node.recommendation === 'not_recommended' ? 'text-red-400' : 'text-slate-400') : ''}
            ${node.type === 'chance' ? 'text-yellow-400' : ''}
          `} />
        </div>
        
        {/* Node Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{node.label}</span>
            {node.probability !== undefined && (
              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                {(node.probability * 100).toFixed(0)}%
              </span>
            )}
          </div>
          
          {node.description && (
            <p className="text-sm text-slate-400 mt-1">{node.description}</p>
          )}
          
          {/* Value/EV display */}
          <div className="flex items-center gap-4 mt-2 text-sm">
            {node.value !== undefined && (
              <div className="flex items-center gap-1 text-slate-300">
                <DollarSign size={14} />
                <span>${node.value.toLocaleString()}</span>
              </div>
            )}
            {hasChildren && (
              <div className="flex items-center gap-1 text-blue-400">
                <Target size={14} />
                <span>EV: ${ev.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Recommendation badge */}
        {node.type === 'outcome' && node.recommendation && (
          <div className={`
            px-2 py-1 rounded text-xs font-medium
            ${node.recommendation === 'recommended' ? 'bg-green-500/20 text-green-400' : ''}
            ${node.recommendation === 'not_recommended' ? 'bg-red-500/20 text-red-400' : ''}
            ${node.recommendation === 'neutral' ? 'bg-slate-500/20 text-slate-400' : ''}
          `}>
            {node.recommendation === 'recommended' ? 'Recommended' : 
             node.recommendation === 'not_recommended' ? 'Not Recommended' : 'Neutral'}
          </div>
        )}
      </div>
      
      {/* Children */}
      {expanded && hasChildren && (
        <div className="relative mt-2 space-y-2">
          {/* Vertical connector */}
          <div 
            className="absolute left-3 top-0 w-px bg-slate-600"
            style={{ height: 'calc(100% - 16px)' }}
          />
          
          {node.children!.map((child, idx) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onNodeClick={onNodeClick}
              highlightPath={highlightPath}
              parentPath={currentPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Main Decision Tree Component
export function DecisionTree({ rootNode, title, onNodeClick, highlightPath }: DecisionTreeProps) {
  const [selectedNode, setSelectedNode] = useState<DecisionNode | null>(null)
  
  const handleNodeClick = (node: DecisionNode) => {
    setSelectedNode(node)
    onNodeClick?.(node)
  }
  
  const totalEV = useMemo(() => calculateEV(rootNode), [rootNode])
  
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-blue-900/30 to-indigo-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitBranch className="h-6 w-6 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">
                {title || 'Decision Tree Analysis'}
              </h3>
              <p className="text-sm text-slate-400">
                Visual outcome analysis with expected values
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Total Expected Value</div>
            <div className="text-xl font-bold text-blue-400">
              ${totalEV.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/30">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-slate-400">Decision Point</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-slate-400">Chance Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-slate-400">Recommended Outcome</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-slate-400">Not Recommended</span>
          </div>
        </div>
      </div>
      
      {/* Tree */}
      <div className="p-4 overflow-x-auto">
        <TreeNode
          node={rootNode}
          depth={0}
          onNodeClick={handleNodeClick}
          highlightPath={highlightPath}
        />
      </div>
      
      {/* Selected Node Details */}
      {selectedNode && (
        <div className="p-4 border-t border-slate-700 bg-slate-800/30">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <div className="font-medium text-white">{selectedNode.label}</div>
              {selectedNode.description && (
                <p className="text-sm text-slate-400 mt-1">{selectedNode.description}</p>
              )}
              <div className="flex gap-4 mt-2 text-sm">
                {selectedNode.probability !== undefined && (
                  <span className="text-yellow-400">
                    Probability: {(selectedNode.probability * 100).toFixed(0)}%
                  </span>
                )}
                {selectedNode.value !== undefined && (
                  <span className="text-green-400">
                    Value: ${selectedNode.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Pre-built litigation decision tree generator
export function generateLitigationTree(params: {
  caseName: string
  winProbability: number
  expectedJudgment: number
  settlementOffer: number
  trialCosts: number
  appealCosts: number
  appealWinProbability: number
}): DecisionNode {
  const { caseName, winProbability, expectedJudgment, settlementOffer, trialCosts, appealCosts, appealWinProbability } = params
  
  const trialWinEV = expectedJudgment - trialCosts
  const trialLoseEV = -trialCosts
  const trialEV = (winProbability * trialWinEV) + ((1 - winProbability) * trialLoseEV)
  
  return {
    id: 'root',
    label: caseName,
    type: 'decision',
    description: 'Initial decision point',
    children: [
      {
        id: 'settle',
        label: 'Accept Settlement',
        type: 'outcome',
        value: settlementOffer,
        description: `Accept ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(settlementOffer)} settlement offer`,
        recommendation: settlementOffer > trialEV ? 'recommended' : 'not_recommended'
      },
      {
        id: 'trial',
        label: 'Proceed to Trial',
        type: 'chance',
        description: `Trial with ${(winProbability * 100).toFixed(0)}% win probability`,
        children: [
          {
            id: 'trial-win',
            label: 'Win at Trial',
            type: 'chance',
            probability: winProbability,
            description: 'Plaintiff prevails',
            children: [
              {
                id: 'win-accept',
                label: 'Judgment Stands',
                type: 'outcome',
                probability: 1 - appealWinProbability,
                value: trialWinEV,
                recommendation: trialWinEV > settlementOffer ? 'recommended' : 'neutral'
              },
              {
                id: 'win-appeal',
                label: 'Defendant Appeals',
                type: 'chance',
                probability: appealWinProbability,
                children: [
                  {
                    id: 'appeal-affirm',
                    label: 'Appeal Affirmed',
                    type: 'outcome',
                    probability: 0.7,
                    value: trialWinEV - appealCosts,
                    recommendation: 'recommended'
                  },
                  {
                    id: 'appeal-reverse',
                    label: 'Appeal Reversed',
                    type: 'outcome',
                    probability: 0.3,
                    value: -(trialCosts + appealCosts),
                    recommendation: 'not_recommended'
                  }
                ]
              }
            ]
          },
          {
            id: 'trial-lose',
            label: 'Lose at Trial',
            type: 'outcome',
            probability: 1 - winProbability,
            value: trialLoseEV,
            description: 'Defendant prevails',
            recommendation: 'not_recommended'
          }
        ]
      },
      {
        id: 'dismiss',
        label: 'Dismiss Case',
        type: 'outcome',
        value: 0,
        description: 'Voluntary dismissal, no recovery',
        recommendation: 'not_recommended'
      }
    ]
  }
}

export default DecisionTree
