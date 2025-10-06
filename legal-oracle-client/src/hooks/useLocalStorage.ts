import { useState, useEffect } from 'react'

/**
 * Custom hook for localStorage caching per PRD requirements
 * Supports guest mode and persistent caching of:
 * - Case predictions
 * - Search queries  
 * - Strategy recommendations
 * - User preferences
 */

type LocalStorageValue<T> = T | null

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  compress?: boolean // Future: compress large objects
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: CacheOptions
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Get from localStorage on mount
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (!item) return initialValue

      const parsed = JSON.parse(item)
      
      // Check TTL if provided
      if (options?.ttl && parsed.timestamp) {
        const age = Date.now() - parsed.timestamp
        if (age > options.ttl) {
          window.localStorage.removeItem(key)
          return initialValue
        }
      }

      return parsed.value !== undefined ? parsed.value : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Update localStorage when value changes
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)

      const toStore = {
        value: valueToStore,
        timestamp: Date.now(),
      }

      window.localStorage.setItem(key, JSON.stringify(toStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  // Clear specific key
  const clearValue = () => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.error(`Error clearing localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue, clearValue]
}

/**
 * Hook for caching case prediction results per PRD User Story 1
 */
export function useCasePredictionCache() {
  return useLocalStorage<Record<string, any>>('legal_oracle_case_predictions', {}, { ttl: 24 * 60 * 60 * 1000 }) // 24 hours
}

/**
 * Hook for caching strategy recommendations per PRD User Story 2
 */
export function useStrategyCache() {
  return useLocalStorage<Record<string, any>>('legal_oracle_strategies', {}, { ttl: 24 * 60 * 60 * 1000 })
}

/**
 * Hook for caching search queries per PRD User Story 6
 */
export function useSearchHistoryCache() {
  return useLocalStorage<string[]>('legal_oracle_search_history', [], { ttl: 7 * 24 * 60 * 60 * 1000 }) // 7 days
}

/**
 * Hook for guest user session per PRD requirements
 */
export function useGuestSession() {
  return useLocalStorage<{
    id: string
    created: string
    preferences: Record<string, any>
  } | null>('legal_oracle_guest_session', null)
}

/**
 * Hook for caching Nash equilibrium scenarios per PRD User Story 3
 */
export function useGameTheoryCache() {
  return useLocalStorage<Array<{
    id: string
    scenario: string
    players: any[]
    strategies: any[]
    result: any
    timestamp: number
  }>>('legal_oracle_game_scenarios', [], { ttl: 30 * 24 * 60 * 60 * 1000 }) // 30 days
}

/**
 * Hook for user preferences
 */
export function useUserPreferences() {
  return useLocalStorage<{
    theme?: 'light' | 'dark'
    defaultJurisdiction?: string
    favoriteJudges?: string[]
    notificationPreferences?: {
      arbitrageAlerts?: boolean
      trendUpdates?: boolean
      caseUpdates?: boolean
    }
  }>('legal_oracle_user_preferences', {})
}

/**
 * Utility to get guest ID or create new one
 */
export function getOrCreateGuestId(): string {
  const existing = localStorage.getItem('legal_oracle_guest_id')
  if (existing) return existing

  const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  localStorage.setItem('legal_oracle_guest_id', guestId)
  return guestId
}

/**
 * Utility to clear all Legal Oracle cache data
 */
export function clearAllCache() {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('legal_oracle_'))
  keys.forEach(key => localStorage.removeItem(key))
}

/**
 * Utility to get cache statistics
 */
export function getCacheStats() {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('legal_oracle_'))
  let totalSize = 0
  
  keys.forEach(key => {
    const item = localStorage.getItem(key)
    if (item) {
      totalSize += item.length
    }
  })

  return {
    itemCount: keys.length,
    totalSizeBytes: totalSize,
    totalSizeKB: (totalSize / 1024).toFixed(2),
    keys: keys
  }
}

export default useLocalStorage
