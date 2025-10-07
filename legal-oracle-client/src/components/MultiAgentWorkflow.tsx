import { useState } from 'react';
import { Workflow, Download, CheckCircle, Loader, FileText, AlertCircle, TrendingUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface WorkflowStep {
  step: number;
  name: string;
  status: string;
  duration_seconds?: number;
  output_summary?: string;
}

interface WorkflowReport {
  workflow_id: string;
  status: string;
  steps: WorkflowStep[];
  final_report: {
    executive_summary: {
      case_strength: string;
      success_probability: string;
      confidence: string;
      recommended_action: string;
      key_precedents: number;
      case_complexity: string;
    };
    detailed_analysis: any;
    recommendations: {
      primary: string;
      alternative_paths: string[];
      next_steps: string[];
    };
  };
  metadata: {
    started_at: string;
    completed_at?: string;
    total_duration_seconds?: number;
  };
}

const stepNames = [
  "Extracting Facts",
  "Finding Precedents",
  "Assessing Risks",
  "Optimizing Strategy",
  "Generating Report"
];

export default function MultiAgentWorkflow() {
  const [caseText, setCaseText] = useState('');
  const [caseType, setCaseType] = useState('contract_dispute');
  const [jurisdiction, setJurisdiction] = useState('California');
  const [damagesAmount, setDamagesAmount] = useState('');
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [report, setReport] = useState<WorkflowReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const caseTypes = [
    { value: 'contract_dispute', label: 'Contract Dispute' },
    { value: 'tort', label: 'Tort / Personal Injury' },
    { value: 'employment', label: 'Employment Law' },
    { value: 'intellectual_property', label: 'Intellectual Property' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'corporate', label: 'Corporate / Business' },
  ];

  const jurisdictions = [
    'California', 'New York', 'Texas', 'Florida', 'Illinois',
    'Federal', 'Delaware', 'Massachusetts', 'Washington', 'Pennsylvania'
  ];

  const runWorkflow = async () => {
    if (!caseText.trim()) {
      setError('Please enter case details');
      return;
    }

    setRunning(true);
    setCurrentStep(0);
    setError(null);
    setReport(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }, 2000);

    try {
      const token = localStorage.getItem('auth_token') || 'guest_token';
      
      const response = await fetch(`${API_URL}/api/v1/workflow/full_analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          case_text: caseText,
          case_type: caseType,
          jurisdiction: jurisdiction,
          damages_amount: damagesAmount ? parseFloat(damagesAmount) : null,
        }),
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setReport(data);
        setCurrentStep(5);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Analysis failed');
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError('Network error. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const downloadPDF = async () => {
    if (!report?.workflow_id) return;

    try {
      const token = localStorage.getItem('auth_token') || 'guest_token';
      
      const response = await fetch(
        `${API_URL}/api/v1/workflow/report/${report.workflow_id}/pdf`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `legal_analysis_${report.workflow_id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('PDF download failed:', err);
    }
  };

  const getRiskColor = (strength: string) => {
    const s = strength?.toLowerCase();
    if (s === 'low') return 'text-green-400';
    if (s === 'medium') return 'text-yellow-400';
    if (s === 'high') return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-600/20 rounded-xl">
          <Workflow className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Multi-Agent Case Analysis</h1>
          <p className="text-slate-400 mt-1">Comprehensive AI-powered legal analysis workflow</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Case Details</h2>
          
          <div className="space-y-4">
            {/* Case Text */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Case Description
              </label>
              <textarea
                value={caseText}
                onChange={(e) => setCaseText(e.target.value)}
                placeholder="Enter detailed case description, including parties, facts, legal issues, and relevant circumstances..."
                className="w-full h-48 bg-slate-700/50 text-white p-4 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">{caseText.length} characters</p>
            </div>

            {/* Case Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Case Type
              </label>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full bg-slate-700/50 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              >
                {caseTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Jurisdiction */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Jurisdiction
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full bg-slate-700/50 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              >
                {jurisdictions.map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>

            {/* Damages Amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Claimed Damages (Optional)
              </label>
              <input
                type="number"
                value={damagesAmount}
                onChange={(e) => setDamagesAmount(e.target.value)}
                placeholder="500000"
                className="w-full bg-slate-700/50 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Run Button */}
            <button
              onClick={runWorkflow}
              disabled={running || !caseText.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {running ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Workflow className="w-5 h-5" />
                  Run Full Analysis
                </>
              )}
            </button>

            {/* Progress Indicator */}
            {running && (
              <div className="mt-4 space-y-2">
                {stepNames.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {idx < currentStep ? (
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : idx === currentStep ? (
                      <Loader className="w-4 h-4 animate-spin text-purple-400 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-600 rounded-full flex-shrink-0" />
                    )}
                    <span className={idx <= currentStep ? 'text-white' : 'text-slate-500'}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Report Panel */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Analysis Report</h2>
          
          {!report && !running && (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
              <FileText className="w-16 h-16 mb-4 opacity-30" />
              <p>Run analysis to see comprehensive report</p>
            </div>
          )}

          {report && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="bg-gradient-to-br from-slate-700 to-slate-700/50 rounded-xl p-5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Executive Summary
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Case Strength</p>
                    <p className={`text-lg font-bold uppercase ${getRiskColor(report.final_report.executive_summary.case_strength)}`}>
                      {report.final_report.executive_summary.case_strength}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Success Probability</p>
                    <p className="text-lg font-bold text-white">
                      {report.final_report.executive_summary.success_probability}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Confidence</p>
                    <p className="text-lg font-bold text-white">
                      {report.final_report.executive_summary.confidence}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Precedents Found</p>
                    <p className="text-lg font-bold text-white">
                      {report.final_report.executive_summary.key_precedents}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommended Strategy */}
              <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                <p className="text-xs text-purple-300 mb-2">RECOMMENDED STRATEGY</p>
                <p className="text-lg font-semibold text-white">
                  {report.final_report.executive_summary.recommended_action}
                </p>
              </div>

              {/* Next Steps */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Next Steps</h4>
                <div className="space-y-2">
                  {report.final_report.recommendations.next_steps.slice(0, 4).map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-purple-400 font-bold flex-shrink-0">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={downloadPDF}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-5 h-5" />
                Download PDF Report
              </button>

              {/* Metadata */}
              <div className="text-xs text-slate-400 border-t border-slate-700 pt-4">
                <p>Workflow ID: {report.workflow_id}</p>
                <p>Duration: {report.metadata.total_duration_seconds?.toFixed(1)}s</p>
                <p>Status: {report.status}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
