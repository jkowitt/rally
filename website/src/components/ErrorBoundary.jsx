import { Component } from 'react'
import { supabase } from '@/lib/supabase'

// Known error patterns and their user-friendly messages + recovery actions
const ERROR_MAP = [
  { pattern: /Cannot read properties of (undefined|null)/i, message: 'A data loading issue occurred. This usually resolves on refresh.', autoRecover: true },
  { pattern: /Failed to fetch dynamically imported module/i, message: 'A new version is available. Reloading now...', autoReload: true },
  { pattern: /Loading chunk .* failed/i, message: 'A new version is available. Reloading now...', autoReload: true },
  { pattern: /Network Error|Failed to fetch|NetworkError/i, message: 'Network connection issue. Check your internet and try again.', autoRecover: true },
  { pattern: /CORS|blocked by CORS/i, message: 'Connection to the server was blocked. Try refreshing.', autoRecover: true },
  { pattern: /JWT|token.*expired|401/i, message: 'Your session has expired. Please sign in again.', redirect: '/login' },
  { pattern: /violates.*not-null|violates.*foreign key|violates.*unique/i, message: 'A data conflict occurred. Your changes may not have saved.', autoRecover: true },
  { pattern: /Edge Function|non-2xx/i, message: 'An AI feature is temporarily unavailable. Other features still work.', autoRecover: true },
  { pattern: /quota|rate limit|too many/i, message: 'Usage limit reached. Please wait a moment before trying again.', autoRecover: true },
  { pattern: /undefined is not a function|is not a function/i, message: 'A compatibility issue occurred. Refreshing should fix this.', autoReload: true },
  { pattern: /ResizeObserver/i, message: null, silent: true }, // Ignore ResizeObserver errors
  { pattern: /Script error/i, message: null, silent: true }, // Ignore cross-origin script errors
]

function getErrorInfo(error) {
  const msg = error?.message || String(error) || ''
  for (const entry of ERROR_MAP) {
    if (entry.pattern.test(msg)) return entry
  }
  return { message: 'Something unexpected happened. Try refreshing the page.', autoRecover: true }
}

// Log error to audit_log if possible
async function logErrorToServer(error, errorInfo) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'client_error',
        entity_type: 'error',
        entity_name: error?.message?.slice(0, 200),
        metadata: {
          stack: error?.stack?.slice(0, 500),
          component: errorInfo?.componentStack?.slice(0, 300),
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      })
    }
  } catch { /* logging should never fail the app */ }
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.setState({ errorInfo })

    const info = getErrorInfo(error)

    // Silent errors — ignore
    if (info.silent) {
      this.setState({ hasError: false, error: null })
      return
    }

    // Auto-reload for stale chunks
    if (info.autoReload) {
      const reloadKey = 'll-error-reload'
      const lastReload = sessionStorage.getItem(reloadKey)
      if (!lastReload || Date.now() - Number(lastReload) > 10000) {
        sessionStorage.setItem(reloadKey, String(Date.now()))
        window.location.reload()
        return
      }
    }

    // Auto-recover — reset error state after a brief delay
    if (info.autoRecover) {
      setTimeout(() => {
        this.setState({ hasError: false, error: null, errorInfo: null })
      }, 100)
    }

    // Redirect (e.g. expired session)
    if (info.redirect) {
      window.location.href = info.redirect
      return
    }

    // Log to server
    logErrorToServer(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const info = getErrorInfo(this.state.error)

      // If silent or auto-recovering, render nothing briefly
      if (info.silent || info.autoRecover || info.autoReload) {
        return this.props.children
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="bg-bg-surface border border-border rounded-lg p-8 max-w-md text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-text-secondary mb-4">
              {info.message}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="bg-accent text-bg-primary px-5 py-2 rounded text-sm font-medium hover:opacity-90"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-bg-card text-text-secondary px-5 py-2 rounded text-sm hover:text-text-primary"
              >
                Reload Page
              </button>
            </div>
            {this.props.showDetails && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-text-muted cursor-pointer">Technical details</summary>
                <pre className="text-[10px] text-text-muted font-mono mt-2 max-h-32 overflow-auto bg-bg-card rounded p-2">
                  {this.state.error?.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Global unhandled error handler — catches everything the ErrorBoundary misses
export function installGlobalErrorHandler() {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const info = getErrorInfo(event.reason)
    if (info.silent) { event.preventDefault(); return }
    console.warn('Unhandled rejection:', event.reason)
    event.preventDefault() // Prevent the error from showing in console as uncaught
  })

  // Global errors
  window.addEventListener('error', (event) => {
    const info = getErrorInfo(event.error || { message: event.message })
    if (info.silent) { event.preventDefault(); return }
    if (info.autoReload) {
      const reloadKey = 'll-error-reload'
      const lastReload = sessionStorage.getItem(reloadKey)
      if (!lastReload || Date.now() - Number(lastReload) > 10000) {
        sessionStorage.setItem(reloadKey, String(Date.now()))
        window.location.reload()
      }
    }
  })
}
