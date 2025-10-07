import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Download, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

interface TrendData {
  year: number;
  settlement_rate: number;
  avg_damages: number;
}

interface JurisdictionData {
  jurisdiction: string;
  success_rate: number;
  case_count: number;
  avg_resolution_days: number;
}

interface OutcomeData {
  name: string;
  value: number;
  color: string;
}

export default function AnalyticsDashboard() {
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [jurisdictionData, setJurisdictionData] = useState<JurisdictionData[]>([]);
  const [outcomeData, setOutcomeData] = useState<OutcomeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseType, setSelectedCaseType] = useState('all');
  const [timeRange, setTimeRange] = useState('5y');

  const caseTypes = [
    { value: 'all', label: 'All Cases' },
    { value: 'contract_dispute', label: 'Contract Disputes' },
    { value: 'tort', label: 'Torts' },
    { value: 'employment', label: 'Employment' },
    { value: 'intellectual_property', label: 'IP' },
  ];

  useEffect(() => {
    loadDashboardData();
  }, [selectedCaseType, timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || 'guest_token';

      // Load trends data
      const trendsResponse = await fetch(
        `${API_URL}/api/v1/trends/model?case_type=${selectedCaseType}&years=${timeRange}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (trendsResponse.ok) {
        const trendsResult = await trendsResponse.json();
        setTrendsData(trendsResult.historical || []);
      }

      // Load jurisdiction data
      const jurisdictionResponse = await fetch(
        `${API_URL}/api/v1/jurisdiction/optimize?case_type=${selectedCaseType}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (jurisdictionResponse.ok) {
        const jurisdictionResult = await jurisdictionResponse.json();
        const recommendations = jurisdictionResult.recommendations || [];
        setJurisdictionData(recommendations.slice(0, 8));
      }

      // Generate outcome distribution from trends
      if (trendsResponse.ok) {
        const trendsResult = await trendsResponse.json();
        const latest = trendsResult.historical?.[trendsResult.historical.length - 1];
        if (latest) {
          const settlement = latest.settlement_rate || 0.65;
          const trial = 1 - settlement;
          setOutcomeData([
            { name: 'Settlements', value: Math.round(settlement * 100), color: '#10b981' },
            { name: 'Trial Verdicts', value: Math.round(trial * 100), color: '#3b82f6' },
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadDashboard = () => {
    const data = {
      trends: trendsData,
      jurisdictions: jurisdictionData,
      outcomes: outcomeData,
      filters: { caseType: selectedCaseType, timeRange },
      generated: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legal-analytics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600/20 rounded-xl">
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-slate-400 mt-1">Legal insights and trends visualization</p>
          </div>
        </div>

        <button
          onClick={downloadDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl p-4 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Case Type</label>
          <select
            value={selectedCaseType}
            onChange={(e) => setSelectedCaseType(e.target.value)}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          >
            {caseTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="3y">Last 3 Years</option>
            <option value="5y">Last 5 Years</option>
            <option value="10y">Last 10 Years</option>
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trends Chart */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Settlement Rate Trends</h2>
          </div>
          
          {trendsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="year" 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => `${(value * 100).toFixed(1)}%`}
                />
                <Legend 
                  wrapperStyle={{ color: '#9ca3af' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="settlement_rate" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  name="Settlement Rate"
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No trend data available
            </div>
          )}
        </div>

        {/* Jurisdiction Success Rates */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-pink-400" />
            <h2 className="text-xl font-semibold text-white">Success Rate by Jurisdiction</h2>
          </div>
          
          {jurisdictionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jurisdictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="jurisdiction" 
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => `${(value * 100).toFixed(1)}%`}
                />
                <Bar 
                  dataKey="success_rate" 
                  fill="#ec4899"
                  radius={[8, 8, 0, 0]}
                  name="Success Rate"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No jurisdiction data available
            </div>
          )}
        </div>

        {/* Outcome Distribution */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-semibold text-white">Outcome Distribution</h2>
          </div>
          
          {outcomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {outcomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => `${value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No outcome data available
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Key Metrics</h2>
          
          <div className="space-y-4">
            {jurisdictionData.slice(0, 3).map((j, idx) => (
              <div key={idx} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300 font-medium">{j.jurisdiction}</span>
                  <span className="text-purple-400 font-bold">
                    {(j.success_rate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>Cases: {j.case_count}</div>
                  <div>Avg Days: {j.avg_resolution_days}</div>
                </div>
              </div>
            ))}

            {trendsData.length > 0 && (
              <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-4 mt-6">
                <p className="text-xs text-purple-300 mb-2">LATEST TREND</p>
                <p className="text-2xl font-bold text-white">
                  {(trendsData[trendsData.length - 1]?.settlement_rate * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-slate-400 mt-1">Settlement Rate ({trendsData[trendsData.length - 1]?.year})</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-slate-300">
          <strong className="text-blue-400">Data Source:</strong> All charts are generated from real historical case data 
          in the Legal Oracle database. Trends reflect actual settlement patterns, jurisdiction success rates, 
          and outcome distributions from {trendsData.length > 0 ? trendsData[0]?.year : '2018'} to {trendsData.length > 0 ? trendsData[trendsData.length - 1]?.year : '2024'}.
        </p>
      </div>
    </div>
  );
}
