import { useEffect, useState } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { humanError } from '@/lib/humanError'

/**
 * /auth/gmail/callback — customer-facing Gmail OAuth landing page.
 *
 * Google redirects here after the user grants consent on the
 * Google sign-in screen. We forward the authorization code to
 * the gmail-auth edge function, which exchanges it for tokens,
 * stores them encrypted in gmail_auth, and returns the
 * connected email address.
 */
export default function GmailOAuthCallback() {
  const [params] = useSearchParams()
  const [state, setState] = useState({ phase: 'working', message: 'Finishing Gmail sign-in…' })

  useEffect(() => {
    const code = params.get('code')
    const error = params.get('error_description') || params.get('error')

    if (error) {
      setState({ phase: 'error', message: error })
      return
    }
    if (!code) {
      setState({ phase: 'error', message: 'Missing authorization code in the redirect.' })
      return
    }

    supabase.functions.invoke('gmail-auth', { body: { action: 'exchange_code', code } })
      .then(({ data, error: invokeErr }) => {
        if (invokeErr) {
          setState({ phase: 'error', message: humanError(invokeErr) })
          return
        }
        if (data?.success) {
          setState({ phase: 'done', message: `Connected ${data.email || ''}. Redirecting…` })
          setTimeout(() => { window.location.href = '/app/crm/inbox/connect' }, 800)
        } else {
          setState({ phase: 'error', message: data?.error || 'Sign-in failed' })
        }
      })
  }, [params])

  if (state.phase === 'done') return <Navigate to="/app/crm/inbox/connect" replace />

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
          <a href="/app/crm/inbox/connect" className="inline-block text-xs text-accent underline">
            Back to inbox connect
          </a>
        )}
      </div>
    </div>
  )
}
