import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getOrCreateGuestId } from '../hooks/useLocalStorage'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean // If true, requires real auth. If false, guest mode is OK
}

export function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // User is authenticated
        setHasAccess(true)
      } else if (!requireAuth) {
        // Guest mode is allowed, check for guest ID
        const guestId = getOrCreateGuestId()
        if (guestId) {
          setHasAccess(true)
        }
      } else {
        // Real auth required but not present
        setHasAccess(false)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
