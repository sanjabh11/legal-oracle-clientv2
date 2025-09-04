import React, { useState } from 'react'
import { FileText, Upload, Brain, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react'
import { HuggingFaceAPI } from '../lib/supabase'

// Types
type RiskLevel = 'High Risk' | 'Medium Risk' | 'Low Risk'

type RiskFactor = {
  level: RiskLevel
  factor: string
  context: string
}

type ComplianceItem = {
  area: string
  status: string
}

type ExtractedEntities = {
  parties: string[]
  dates: string[]
  amounts: string[]
  references: string[]
}

type AnalysisResult = {
  classification: any
  sentiment: any
  keyPoints: string[]
  riskFactors: RiskFactor[]
  recommendations: string[]
  complianceCheck: ComplianceItem[]
  extractedEntities: ExtractedEntities
  summary: string
  actionItems: string[]
  error?: string
}

// Legal Document Analysis Component - User Story 4
export function DocumentAnalysis() {
  const [document, setDocument] = useState<string>('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  
  const analyzeDocument = async () => {
    if (!document.trim()) return
    
    setLoading(true)
    try {
      // Use HuggingFace for comprehensive document analysis
      const [classification, sentiment, keyPoints] = await Promise.all([
        HuggingFaceAPI.classifyLegalText(document),
        HuggingFaceAPI.analyzeText(document),
        extractKeyPoints(document)
      ])
      
      const analysisResult = {
        classification,
        sentiment,
        keyPoints,
        riskFactors: identifyRiskFactors(document),
        recommendations: generateRecommendations(document),
        complianceCheck: checkCompliance(document),
        extractedEntities: extractLegalEntities(document),
        summary: generateSummary(document),
        actionItems: identifyActionItems(document)
      }
      
      setAnalysis(analysisResult)
    } catch (error) {
      console.error('Document analysis error:', error)
      setAnalysis({
        classification: null,
        sentiment: null,
        keyPoints: [],
        riskFactors: [],
        recommendations: [],
        complianceCheck: [],
        extractedEntities: { parties: [], dates: [], amounts: [], references: [] },
        summary: '',
        actionItems: [],
        error: 'Analysis failed. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const extractKeyPoints = (text: string): string[] => {
    // Simple key point extraction - in production would use more sophisticated NLP
    const sentences = text.split('.').filter(s => s.trim().length > 20)
    const keywords = ['contract', 'agreement', 'liability', 'damages', 'breach', 'obligation', 'right', 'clause', 'provision', 'party']
    
    return sentences
      .filter(sentence => keywords.some(keyword => sentence.toLowerCase().includes(keyword)))
      .slice(0, 5)
      .map(sentence => sentence.trim())
  }
  
  const identifyRiskFactors = (text: string): RiskFactor[] => {
    const riskKeywords: Record<RiskLevel, string[]> = {
      'High Risk': ['breach', 'violation', 'penalty', 'termination', 'default'],
      'Medium Risk': ['dispute', 'disagreement', 'modification', 'amendment'],
      'Low Risk': ['notice', 'information', 'documentation', 'standard']
    }
    
    const risks: RiskFactor[] = []
    for (const [level, keywords] of Object.entries(riskKeywords) as [RiskLevel, string[]][]) {
      keywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          risks.push({ level, factor: keyword, context: 'Found in document' })
        }
      })
    }
    
    return risks.slice(0, 8)
  }
  
  const generateRecommendations = (text: string): string[] => {
    const recommendations: string[] = []
    
    if (text.toLowerCase().includes('contract')) {
      recommendations.push('Review all contract terms for potential ambiguities')
      recommendations.push('Ensure compliance with applicable contract law')
    }
    
    if (text.toLowerCase().includes('liability')) {
      recommendations.push('Assess liability exposure and insurance coverage')
      recommendations.push('Consider liability limitation clauses')
    }
    
    if (text.toLowerCase().includes('dispute')) {
      recommendations.push('Implement dispute resolution procedures')
      recommendations.push('Consider mediation or arbitration clauses')
    }
    
    recommendations.push('Conduct legal review with qualified counsel')
    recommendations.push('Document all key decisions and rationales')
    
    return recommendations.slice(0, 6)
  }
  
  const checkCompliance = (text: string): ComplianceItem[] => {
    // Simplified compliance check
    const complianceAreas: ComplianceItem[] = [
      { area: 'Contract Formation', status: text.includes('offer') && text.includes('acceptance') ? 'Compliant' : 'Review Needed' },
      { area: 'Disclosure Requirements', status: text.includes('disclosure') ? 'Compliant' : 'Review Needed' },
      { area: 'Termination Clauses', status: text.includes('termination') ? 'Present' : 'Missing' },
      { area: 'Dispute Resolution', status: text.includes('arbitration') || text.includes('mediation') ? 'Present' : 'Consider Adding' }
    ]
    
    return complianceAreas
  }
  
  const extractLegalEntities = (text: string): ExtractedEntities => {
    // Simple entity extraction - would use proper NER in production
    const entities: ExtractedEntities = {
      parties: extractParties(text),
      dates: extractDates(text),
      amounts: extractAmounts(text),
      references: extractLegalReferences(text)
    }
    
    return entities
  }
  
  const extractParties = (text: string): string[] => {
    const partyPatterns = /\b[A-Z][a-z]+ (Corp|Inc|LLC|Ltd|Company|Partners)\b/g
    return [...new Set((text.match(partyPatterns) || []).slice(0, 10))]
  }
  
  const extractDates = (text: string): string[] => {
    const datePatterns = /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/g
    return [...new Set((text.match(datePatterns) || []).slice(0, 5))]
  }
  
  const extractAmounts = (text: string): string[] => {
    const amountPatterns = /\$[\d,]+(?:\.\d{2})?/g
    return [...new Set((text.match(amountPatterns) || []).slice(0, 5))]
  }
  
  const extractLegalReferences = (text: string): string[] => {
    const refPatterns = /\b\d+ U\.?S\.?C?\.? \d+\b|\b\d+ F\.?\d*d \d+\b/g
    return [...new Set((text.match(refPatterns) || []).slice(0, 5))]
  }
  
  const generateSummary = (text: string): string => {
    const words = text.split(' ')
    const summary = words.slice(0, 100).join(' ')
    return summary + (words.length > 100 ? '...' : '')
  }
  
  const identifyActionItems = (text: string): string[] => {
    const actionWords = ['shall', 'must', 'required', 'obligation', 'duty', 'responsible']
    const sentences = text.split('.').filter(s => s.trim().length > 10)
    
    return sentences
      .filter(sentence => actionWords.some(word => sentence.toLowerCase().includes(word)))
      .slice(0, 5)
      .map(sentence => sentence.trim())
  }
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/plain') {
      const reader = new FileReader()
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e?.target?.result
        setDocument(String(result ?? ''))
        setUploadedFiles([file])
      }
      reader.readAsText(file)
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="h-8 w-8 text-orange-400" />
          <h1 className="text-3xl font-bold text-white">Legal Document Analysis</h1>
        </div>
        <p className="text-blue-200">
          AI-powered analysis of legal documents using advanced NLP and machine learning
        </p>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Panel - Document Input */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Document Input</h2>
            
            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">Upload Document (Text Files Only)</label>
              <div className="relative">
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-600 rounded-lg hover:border-orange-500 transition-colors cursor-pointer"
                >
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-400">Click to upload a text file</p>
                    <p className="text-slate-500 text-xs">or drag and drop</p>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Text Input */}
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">Or Paste Document Text</label>
              <textarea
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="Paste your legal document text here for analysis..."
                className="w-full h-64 bg-slate-700 text-white rounded-lg p-4 border border-slate-600 focus:border-orange-500 focus:outline-none resize-none"
              />
            </div>
            
            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Uploaded Files</h3>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-slate-700/50 rounded">
                    <FileText className="h-4 w-4 text-orange-400" />
                    <span className="text-sm text-white">{file.name}</span>
                    <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={analyzeDocument}
              disabled={!document.trim() || loading}
              className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Analyzing Document...</span>
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  <span>Analyze Document</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Right Panel - Analysis Results */}
        <div className="space-y-6">
          {analysis && (
            <>
              {analysis.error ? (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center space-x-2 text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <span>{analysis.error}</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Document Summary */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Document Summary</h2>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>
                  
                  {/* Classification & Key Points */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Document Classification</h2>
                    
                    {analysis.classification && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-300 mb-2">Legal Category</h3>
                        <span className="inline-block px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                          {(analysis.classification as any)?.labels?.[0] || 'Legal Document'}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-2">Key Points</h3>
                      <ul className="space-y-2">
                        {analysis.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-300 text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Risk Factors */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Risk Assessment</h2>
                    <div className="space-y-3">
                      {analysis.riskFactors.map((risk, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <div>
                            <span className="text-white font-medium capitalize">{risk.factor}</span>
                            <p className="text-slate-400 text-xs">{risk.context}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            risk.level === 'High Risk' ? 'bg-red-500/20 text-red-400' :
                            risk.level === 'Medium Risk' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {risk.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Extracted Entities */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Extracted Information</h2>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {analysis.extractedEntities.parties.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-300 mb-2">Parties</h3>
                          <ul className="space-y-1">
                            {analysis.extractedEntities.parties.map((party, index) => (
                              <li key={index} className="text-sm text-blue-400">{party}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysis.extractedEntities.dates.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-300 mb-2">Dates</h3>
                          <ul className="space-y-1">
                            {analysis.extractedEntities.dates.map((date, index) => (
                              <li key={index} className="text-sm text-green-400">{date}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysis.extractedEntities.amounts.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-300 mb-2">Amounts</h3>
                          <ul className="space-y-1">
                            {analysis.extractedEntities.amounts.map((amount, index) => (
                              <li key={index} className="text-sm text-yellow-400">{amount}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysis.extractedEntities.references.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-300 mb-2">Legal References</h3>
                          <ul className="space-y-1">
                            {analysis.extractedEntities.references.map((ref, index) => (
                              <li key={index} className="text-sm text-purple-400">{ref}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Compliance Check */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Compliance Review</h2>
                    <div className="space-y-3">
                      {analysis.complianceCheck.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-white">{item.area}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'Compliant' || item.status === 'Present' ? 'bg-green-500/20 text-green-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Recommendations */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4">AI Recommendations</h2>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Action Items */}
                  {analysis.actionItems.length > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h2 className="text-xl font-semibold text-white mb-4">Action Items</h2>
                      <ul className="space-y-2">
                        {analysis.actionItems.map((item, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-300 text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          
          {!analysis && !loading && (
            <div className="bg-slate-800/30 rounded-xl p-12 border border-slate-700 text-center">
              <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                Upload a document or paste text to begin comprehensive legal analysis with AI
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DocumentAnalysis