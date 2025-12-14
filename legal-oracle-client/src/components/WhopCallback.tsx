/**
 * Whop OAuth Callback Component
 * Handles the OAuth callback from Whop after user authentication
 * 
 * Flow:
 * 1. User clicks "Login with Whop" 
 * 2. Redirected to Whop OAuth
 * 3. Whop redirects back here with authorization code
 * 4. Exchange code for tokens
 * 5. Store tokens and redirect to dashboard
 */

import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Scale, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { 
  exchangeWhopCode, 
  storeWhopTokens, 
  checkWhopAccess,
  getStoredWhopToken
} from '../config/whop'
import { getTierByWhopProduct, PricingTier } from '../config/pricing'

type CallbackStatus = 'processing' | 'success' | 'error'

interface CallbackState {
  status: CallbackStatus
  message: string
  tier?: PricingTier
}

export function WhopCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [state, setState] = useState<CallbackState>({
    status: 'processing',
    message: 'Processing your authentication...'
  })
  
  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      const returnedState = searchParams.get('state')
      
      // Check for errors from Whop
      if (error) {
        setState({
          status: 'error',
          message: errorDescription || `Authentication failed: ${error}`
        })
        return
      }
      
      // Verify we have an authorization code
      if (!code) {
        setState({
          status: 'error',
          message: 'No authorization code received from Whop'
        })
        return
      }
      
      // Validate state parameter if we stored one
      const storedState = sessionStorage.getItem('whop_oauth_state')
      if (storedState && returnedState !== storedState) {
        setState({
          status: 'error',
          message: 'State mismatch - possible CSRF attack'
        })
        return
      }
      
      // Clear stored state
      sessionStorage.removeItem('whop_oauth_state')
      
      try {
        setState({
          status: 'processing',
          message: 'Exchanging authorization code...'
        })
        
        // Exchange code for tokens
        const tokens = await exchangeWhopCode(code)
        
        // Store tokens
        storeWhopTokens(tokens)
        
        setState({
          status: 'processing',
          message: 'Verifying your subscription...'
        })
        
        // Check user access and get membership info
        const accessCheck = await checkWhopAccess(tokens.access_token)
        
        if (accessCheck.valid && accessCheck.membership) {
          // Determine tier from product ID
          const tier = getTierByWhopProduct(accessCheck.membership.productId)
          
          // Store user info in localStorage
          localStorage.setItem('whop_user', JSON.stringify(accessCheck.user))
          localStorage.setItem('whop_membership', JSON.stringify(accessCheck.membership))
          localStorage.setItem('user_tier', tier || 'guest')
          
          // Also set auth token for API calls
          localStorage.setItem('auth_token', tokens.access_token)
          
          setState({
            status: 'success',
            message: 'Authentication successful!',
            tier: tier || 'guest'
          })
          
          // Redirect to dashboard after short delay
          setTimeout(() => {
            navigate('/', { replace: true })
          }, 2000)
        } else {
          // User authenticated but no valid subscription
          setState({
            status: 'error',
            message: 'No active subscription found. Please purchase a plan to continue.'
          })
          
          // Redirect to pricing page
          setTimeout(() => {
            navigate('/pricing', { replace: true })
          }, 3000)
        }
        
      } catch (error) {
        console.error('Whop callback error:', error)
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Authentication failed'
        })
      }
    }
    
    handleCallback()
  }, [searchParams, navigate])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-500/20 rounded-full">
            <Scale className="h-12 w-12 text-blue-400" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Legal Oracle</h1>
        <p className="text-slate-400 mb-8">Whop Authentication</p>
        
        {/* Status Display */}
        <div className="space-y-4">
          {state.status === 'processing' && (
            <>
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              </div>
              <p className="text-slate-300">{state.message}</p>
            </>
          )}
          
          {state.status === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </div>
              <p className="text-green-400 font-medium">{state.message}</p>
              {state.tier && (
                <p className="text-slate-400">
                  Welcome! Your plan: <span className="text-white font-medium capitalize">{state.tier}</span>
                </p>
              )}
              <p className="text-slate-500 text-sm">Redirecting to dashboard...</p>
            </>
          )}
          
          {state.status === 'error' && (
            <>
              <div className="flex justify-center">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
              </div>
              <p className="text-red-400 font-medium">{state.message}</p>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => navigate('/auth')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  View Plans
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default WhopCallback
