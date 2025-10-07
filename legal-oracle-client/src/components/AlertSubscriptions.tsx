import { useState, useEffect } from 'react';
import { Bell, Mail, CheckCircle, AlertCircle, Loader2, Settings } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface Subscription {
  id: string;
  user_email: string;
  industry: string | null;
  jurisdictions: string[] | null;
  alert_types: string[];
  frequency: string;
  is_active: boolean;
  last_alert_sent: string | null;
  created_at: string;
}

interface AlertSubscriptionsProps {
  userEmail?: string;
}

export default function AlertSubscriptions({ userEmail }: AlertSubscriptionsProps) {
  const [email, setEmail] = useState(userEmail || '');
  const [industry, setIndustry] = useState('technology');
  const [frequency, setFrequency] = useState('daily');
  const [alertTypes, setAlertTypes] = useState<string[]>(['sunset_clause', 'jurisdictional_conflict']);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [existingSubscription, setExistingSubscription] = useState<Subscription | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  const industries = [
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance & Banking' },
    { value: 'energy', label: 'Energy & Environment' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'telecommunications', label: 'Telecommunications' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'retail', label: 'Retail & Consumer Goods' },
    { value: 'legal', label: 'Legal Services' },
  ];

  const alertTypeOptions = [
    { value: 'sunset_clause', label: 'Sunset Clauses', description: 'Expiring regulations and temporary provisions' },
    { value: 'jurisdictional_conflict', label: 'Jurisdictional Conflicts', description: 'Circuit splits and conflicting interpretations' },
    { value: 'temporary_exemption', label: 'Temporary Exemptions', description: 'Time-limited regulatory relief' },
    { value: 'transition_period', label: 'Transition Periods', description: 'Regulatory transition windows' },
  ];

  const frequencyOptions = [
    { value: 'realtime', label: 'Real-time', description: 'Immediate alerts as opportunities are detected' },
    { value: 'daily', label: 'Daily Digest', description: 'One email per day with all opportunities' },
    { value: 'weekly', label: 'Weekly Summary', description: 'Weekly roundup of opportunities' },
  ];

  useEffect(() => {
    if (email && email.includes('@')) {
      checkExistingSubscription();
    }
  }, [email]);

  const checkExistingSubscription = async () => {
    setCheckingSubscription(true);
    try {
      const token = localStorage.getItem('auth_token') || 'guest_token';
      const response = await fetch(`${API_URL}/api/v1/alerts/subscription/${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.subscription) {
          setExistingSubscription(data.subscription);
          setIndustry(data.subscription.industry || 'technology');
          setFrequency(data.subscription.frequency || 'daily');
          setAlertTypes(data.subscription.alert_types || ['sunset_clause', 'jurisdictional_conflict']);
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token') || 'guest_token';
      
      const response = await fetch(`${API_URL}/api/v1/alerts/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_email: email,
          industry,
          frequency,
          alert_types: alertTypes.length > 0 ? alertTypes : ['sunset_clause', 'jurisdictional_conflict'],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: data.status === 'created' 
            ? '✅ Successfully subscribed! You\'ll receive alerts via email.' 
            : '✅ Subscription preferences updated successfully!'
        });
        checkExistingSubscription();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Subscription failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!confirm('Are you sure you want to unsubscribe from alerts?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token') || 'guest_token';
      
      const response = await fetch(`${API_URL}/api/v1/alerts/unsubscribe/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Successfully unsubscribed from alerts' });
        setExistingSubscription(null);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Unsubscribe failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleAlertType = (type: string) => {
    setAlertTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-600/20 rounded-xl">
          <Bell className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">Regulatory Arbitrage Alerts</h2>
          <p className="text-slate-400 mt-1">Get notified of strategic legal opportunities</p>
        </div>
      </div>

      {/* Existing Subscription Info */}
      {existingSubscription && (
        <div className="mb-6 p-4 bg-green-600/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Active Subscription</span>
          </div>
          <p className="text-sm text-slate-300">
            You're subscribed to {existingSubscription.frequency} alerts for {existingSubscription.industry || 'all industries'}.
            {existingSubscription.last_alert_sent && (
              <span className="text-slate-400">
                {' '}Last alert sent: {new Date(existingSubscription.last_alert_sent).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-600/10 border-green-500/30 text-green-400' 
            : 'bg-red-600/10 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Email Input */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            <Mail className="w-4 h-4 inline mr-1" />
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-slate-700/50 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
          {checkingSubscription && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Checking subscription...
            </p>
          )}
        </div>

        {/* Industry Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Industry Focus
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full bg-slate-700/50 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          >
            {industries.map(ind => (
              <option key={ind.value} value={ind.value}>{ind.label}</option>
            ))}
          </select>
        </div>

        {/* Alert Types */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            Alert Types
          </label>
          <div className="space-y-2">
            {alertTypeOptions.map(type => (
              <label
                key={type.value}
                className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-all"
              >
                <input
                  type="checkbox"
                  checked={alertTypes.includes(type.value)}
                  onChange={() => toggleAlertType(type.value)}
                  className="mt-1 w-4 h-4 text-purple-600 border-slate-600 rounded focus:ring-purple-500 focus:ring-offset-slate-900"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">{type.label}</div>
                  <div className="text-sm text-slate-400">{type.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Frequency Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            Alert Frequency
          </label>
          <div className="space-y-2">
            {frequencyOptions.map(freq => (
              <label
                key={freq.value}
                className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-all"
              >
                <input
                  type="radio"
                  name="frequency"
                  value={freq.value}
                  checked={frequency === freq.value}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="mt-1 w-4 h-4 text-purple-600 border-slate-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">{freq.label}</div>
                  <div className="text-sm text-slate-400">{freq.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSubscribe}
            disabled={loading || !email}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                {existingSubscription ? 'Update Subscription' : 'Subscribe to Alerts'}
              </>
            )}
          </button>

          {existingSubscription && (
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="px-6 py-4 bg-slate-700 hover:bg-red-600/20 border border-slate-600 hover:border-red-500 text-slate-300 hover:text-red-400 font-semibold rounded-lg transition-all"
            >
              Unsubscribe
            </button>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Settings className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-300">
              <strong className="text-blue-400">How it works:</strong> Our system monitors federal and state regulations in real-time, 
              detecting strategic opportunities like sunset clauses, circuit splits, and temporary exemptions. You'll receive curated 
              alerts based on your preferences.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
