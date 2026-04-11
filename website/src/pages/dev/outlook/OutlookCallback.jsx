import { useEffect, useState } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import * as auth from '@/services/dev/outlookAuthService'

/**
 * /dev/outlook/callback — Microsoft redirects here after consent.
 * Forwards the authorization code to outlook-auth edge function.
 */
export default function OutlookCallback() {
  const [params] = useSearchParams()
  const [state, setState] = useState({ phase: 'working', message: 'Completing Outlook sign-in…' })

  useEffect(() => {
    const code = params.get('code')
    const oauthState = params.get('state')
    const error = params.get('error_description') || params.get('error')

    if (error) {
      setState({ phase: 'error', message: error })
      return
    }
    if (!code) {
      setState({ phase: 'error', message: 'Missing authorization code' })
      return
    }

    auth.exchangeCodeForTokens({ code, state: oauthState }).then(r => {
      if (r.success) {
        setState({ phase: 'done', message: `Connected ${r.email || ''}. Redirecting…` })
        setTimeout(() => { window.location.href = '/dev/outlook/dashboard' }, 800)
      } else {
        setState({ phase: 'error', message: r.error || 'Sign-in failed' })
      }
    })
  }, [params])

  if (state.phase === 'done') return <Navigate to="/dev/outlook/dashboard" replace />

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        {state.phase === 'working' && (
          <div className="w-8 h-8 mx-auto border-2 border-accent border-t-transparent rounded-full animate-spin" />
        )}
        <div className={`text-sm ${state.phase === 'error' ? 'text-danger' : 'text-text-secondary'}`}>
          {state.message}
        </div>
        {state.phase === 'error' && (
          <a href="/dev/outlook/connect" className="inline-block text-xs text-accent underline">Try again</a>
        )}
      </div>
    </div>
  )
}
