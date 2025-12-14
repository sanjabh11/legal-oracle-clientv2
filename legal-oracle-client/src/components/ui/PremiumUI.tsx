/**
 * Premium UI Components Library
 * Stripe-level polish with micro-interactions and refined aesthetics
 * 
 * Components:
 * - PremiumButton - Gradient buttons with hover lift
 * - FloatingInput - Animated label inputs
 * - Skeleton / CardSkeleton - Loading states
 * - EmptyState - Beautiful empty states
 * - Toast / ToastProvider - Notification system
 * - Badge - Status indicators
 * - Tooltip - Contextual help
 */

import React, { useState, createContext, useContext, useCallback } from 'react'
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X,
  Loader2,
  HelpCircle
} from 'lucide-react'

// ==========================================
// PREMIUM BUTTON
// ==========================================

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

export function PremiumButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: PremiumButtonProps) {
  const baseStyles = `
    relative overflow-hidden inline-flex items-center justify-center gap-2
    font-medium rounded-lg
    transition-all duration-150 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  `
  
  const variants = {
    primary: `
      bg-gradient-to-b from-blue-500 to-blue-600
      hover:from-blue-400 hover:to-blue-500
      active:from-blue-600 active:to-blue-700
      text-white
      shadow-lg shadow-blue-500/25
      hover:shadow-xl hover:shadow-blue-500/30
      hover:-translate-y-0.5 active:translate-y-0
      focus:ring-blue-400
    `,
    secondary: `
      bg-slate-700 hover:bg-slate-600 active:bg-slate-800
      text-white
      border border-slate-600
      hover:-translate-y-0.5 active:translate-y-0
      focus:ring-slate-400
    `,
    success: `
      bg-gradient-to-b from-green-500 to-green-600
      hover:from-green-400 hover:to-green-500
      active:from-green-600 active:to-green-700
      text-white
      shadow-lg shadow-green-500/25
      hover:shadow-xl hover:shadow-green-500/30
      hover:-translate-y-0.5 active:translate-y-0
      focus:ring-green-400
    `,
    danger: `
      bg-gradient-to-b from-red-500 to-red-600
      hover:from-red-400 hover:to-red-500
      active:from-red-600 active:to-red-700
      text-white
      shadow-lg shadow-red-500/25
      hover:-translate-y-0.5 active:translate-y-0
      focus:ring-red-400
    `,
    ghost: `
      bg-transparent hover:bg-slate-800 active:bg-slate-700
      text-slate-300 hover:text-white
      focus:ring-slate-400
    `
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  )
}

// ==========================================
// FLOATING INPUT
// ==========================================

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function FloatingInput({ label, error, className = '', ...props }: FloatingInputProps) {
  const [focused, setFocused] = useState(false)
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue)
  
  return (
    <div className="relative">
      <input
        {...props}
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          setHasValue(!!e.target.value)
          props.onBlur?.(e)
        }}
        onChange={(e) => {
          setHasValue(!!e.target.value)
          props.onChange?.(e)
        }}
        className={`
          peer w-full bg-slate-800 
          border-2 ${error ? 'border-red-500' : focused ? 'border-blue-500' : 'border-slate-600'}
          rounded-lg px-4 pt-6 pb-2 text-white
          placeholder-transparent
          transition-all duration-200
          focus:outline-none
          ${className}
        `}
        placeholder={label}
      />
      <label className={`
        absolute left-4 transition-all duration-200 pointer-events-none
        ${focused || hasValue 
          ? 'top-2 text-xs' 
          : 'top-4 text-sm'}
        ${error ? 'text-red-400' : focused ? 'text-blue-400' : 'text-slate-400'}
      `}>
        {label}
      </label>
      {error && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  )
}

// ==========================================
// FLOATING TEXTAREA
// ==========================================

interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function FloatingTextarea({ label, error, className = '', ...props }: FloatingTextareaProps) {
  const [focused, setFocused] = useState(false)
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue)
  
  return (
    <div className="relative">
      <textarea
        {...props}
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          setHasValue(!!e.target.value)
          props.onBlur?.(e)
        }}
        onChange={(e) => {
          setHasValue(!!e.target.value)
          props.onChange?.(e)
        }}
        className={`
          peer w-full bg-slate-800 
          border-2 ${error ? 'border-red-500' : focused ? 'border-blue-500' : 'border-slate-600'}
          rounded-lg px-4 pt-6 pb-2 text-white
          placeholder-transparent
          transition-all duration-200
          focus:outline-none
          resize-none
          ${className}
        `}
        placeholder={label}
      />
      <label className={`
        absolute left-4 transition-all duration-200 pointer-events-none
        ${focused || hasValue 
          ? 'top-2 text-xs' 
          : 'top-4 text-sm'}
        ${error ? 'text-red-400' : focused ? 'text-blue-400' : 'text-slate-400'}
      `}>
        {label}
      </label>
      {error && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  )
}

// ==========================================
// SKELETON LOADERS
// ==========================================

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-[length:200%_100%] rounded ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-700">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

// ==========================================
// EMPTY STATE
// ==========================================

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <Icon className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-center max-w-md mb-6">{description}</p>
      {action}
    </div>
  )
}

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  
  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, type, message, duration }])
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])
  
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle,
  }
  
  const styles = {
    success: 'bg-green-500/10 border-green-500/50 text-green-400',
    error: 'bg-red-500/10 border-red-500/50 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/50 text-blue-400',
    warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400',
  }
  
  const Icon = icons[toast.type]
  
  return (
    <div 
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm
        shadow-lg min-w-[300px] max-w-md
        animate-slide-in-right
        ${styles[toast.type]}
      `}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="font-medium flex-1">{toast.message}</span>
      <button 
        onClick={onClose} 
        className="hover:opacity-70 transition-opacity p-1"
      >
        <X size={16} />
      </button>
    </div>
  )
}

// ==========================================
// BADGE
// ==========================================

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  children: React.ReactNode
}

export function Badge({ variant = 'default', size = 'sm', children }: BadgeProps) {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}

// ==========================================
// TOOLTIP
// ==========================================

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`
          absolute z-50 px-3 py-2 text-sm text-white bg-slate-800 rounded-lg
          border border-slate-700 shadow-xl whitespace-nowrap
          animate-fade-in
          ${positions[position]}
        `}>
          {content}
        </div>
      )}
    </div>
  )
}

// ==========================================
// HELP TOOLTIP (with icon)
// ==========================================

export function HelpTooltip({ content }: { content: string }) {
  return (
    <Tooltip content={content}>
      <HelpCircle className="h-4 w-4 text-slate-500 hover:text-slate-400 cursor-help" />
    </Tooltip>
  )
}

// ==========================================
// PROGRESS BAR
// ==========================================

interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({ 
  value, 
  max = 100, 
  variant = 'default',
  showLabel = false,
  size = 'md'
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  const variants = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  }
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }
  
  return (
    <div className="w-full">
      <div className={`w-full bg-slate-700 rounded-full overflow-hidden ${sizes[size]}`}>
        <div 
          className={`${variants[variant]} ${sizes[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}

// ==========================================
// CARD
// ==========================================

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className = '', hover = false, padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  
  return (
    <div className={`
      bg-slate-800/50 rounded-xl border border-slate-700
      ${hover ? 'hover:border-slate-600 hover:bg-slate-800/70 transition-all duration-200' : ''}
      ${paddings[padding]}
      ${className}
    `}>
      {children}
    </div>
  )
}

// ==========================================
// DIVIDER
// ==========================================

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-slate-700 ${className}`} />
}

// ==========================================
// CSS KEYFRAMES (add to global CSS)
// ==========================================

// Add this to your global CSS or tailwind config:
/*
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.15s ease-out;
}
*/

export default {
  PremiumButton,
  FloatingInput,
  FloatingTextarea,
  Skeleton,
  CardSkeleton,
  TableRowSkeleton,
  StatCardSkeleton,
  EmptyState,
  ToastProvider,
  useToast,
  Badge,
  Tooltip,
  HelpTooltip,
  ProgressBar,
  Card,
  Divider,
}
