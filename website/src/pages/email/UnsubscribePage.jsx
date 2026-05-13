import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/**
 * Public one-click unsubscribe page. No login required.
 * Reachable from the unsubscribe_url in every outgoing email.
 * Also supports RFC 8058 List-Unsubscribe-Post one-click from mail clients.
 */
export default function UnsubscribePage() {
  const { token } = useParams()
  const [state, setState] = useState({ phase: 'loading' })
  const [reason, setReason] = useState('')

  useEffect(() => {
    document.title = 'Unsubscribe — Loud CRM'
    ;(async () => {
      const { data } = await supabase.functions.invoke('email-marketing-unsubscribe', {
        body: null,
        method: 'GET',
        headers: {},
      }).catch(() => ({ data: null }))

      // Supabase SDK doesn't expose GET with query for functions.invoke,
      // so call fetch directly against the edge endpoint.
      const base = import.meta.env.VITE_SUPABASE_URL || ''
      const res = await fetch(`${base}/functions/v1/email-marketing-unsubscribe?token=${encodeURIComponent(token)}`)
      const json = await res.json()
      if (json.success) {
        setState({
          phase: json.already_unsubscribed ? 'already' : 'confirm',
          email: json.email,
          firstName: json.first_name,
        })
      } else {
        setState({ phase: 'invalid' })
      }
    })()
  }, [token])

  async function confirm() {
    const base = import.meta.env.VITE_SUPABASE_URL || ''
    const res = await fetch(`${base}/functions/v1/email-marketing-unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, reason }),
    })
    const json = await res.json()
    if (json.success) setState({ ...state, phase: 'done' })
    else setState({ ...state, phase: 'error', error: json.error })
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-bg-card border border-border rounded-lg p-8 text-center">
        <Link to="/" className="font-mono font-bold text-accent text-lg">LOUD LEGACY</Link>

        {state.phase === 'loading' && <div className="mt-6 text-sm text-text-muted">Verifying…</div>}

        {state.phase === 'invalid' && (
          <>
            <div className="mt-6 text-lg font-semibold text-danger">Invalid link</div>
            <div className="text-sm text-text-muted mt-2">This unsubscribe link is no longer valid or has been tampered with.</div>
          </>
        )}

        {state.phase === 'already' && (
          <>
            <div className="mt-6 text-lg font-semibold">You're already unsubscribed</div>
            <div className="text-sm text-text-muted mt-2">{state.email} will not receive any more marketing emails from Loud CRM.</div>
            <Link to="/" className="inline-block mt-4 text-accent hover:underline text-xs">← Back to homepage</Link>
          </>
        )}

        {state.phase === 'confirm' && (
          <>
            <div className="mt-6 text-lg font-semibold">Unsubscribe {state.firstName || ''}?</div>
            <div className="text-sm text-text-muted mt-2">{state.email} will no longer receive marketing emails from Loud CRM. Transactional emails (account, billing) will still be sent.</div>
            <div className="mt-6">
              <label className="text-[11px] text-text-muted block mb-1 text-left">Optional: tell us why</label>
              <select value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-2 text-sm">
                <option value="">— skip —</option>
                <option value="too_many">Too many emails</option>
                <option value="not_relevant">Content not relevant</option>
                <option value="never_signed_up">I didn't sign up</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button onClick={confirm} className="w-full bg-accent text-bg-primary font-semibold py-3 rounded-lg mt-4 text-sm">
              Unsubscribe
            </button>
            <Link to="/" className="inline-block mt-3 text-[11px] text-text-muted hover:text-accent">Cancel</Link>
          </>
        )}

        {state.phase === 'done' && (
          <>
            <div className="mt-6 text-lg font-semibold text-success">Unsubscribed</div>
            <div className="text-sm text-text-muted mt-2">{state.email} has been removed from all marketing emails. Sorry to see you go.</div>
            <Link to="/" className="inline-block mt-4 text-accent hover:underline text-xs">← Back to homepage</Link>
          </>
        )}

        {state.phase === 'error' && (
          <>
            <div className="mt-6 text-lg font-semibold text-danger">Something went wrong</div>
            <div className="text-sm text-text-muted mt-2">{state.error || 'Please try again later.'}</div>
          </>
        )}
      </div>
    </div>
  )
}
