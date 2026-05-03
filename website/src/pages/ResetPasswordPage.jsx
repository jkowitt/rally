import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// Lands here from the password reset email. Supabase has already
// exchanged the magic-link token for a session by the time the
// page mounts — we just need to call updateUser({ password }).
//
// If the user landed here without a recovery session (clicked an
// expired link, or pasted the URL into a different browser), we
// show a clear error and a path back to "request a new link".
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [recoveryReady, setRecoveryReady] = useState(false)

  useEffect(() => {
    // Wait for Supabase to surface the recovery session.
    // If a session already exists, we're good.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setRecoveryReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError("Passwords don't match.")
    setLoading(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) throw updateErr
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err?.message || 'Could not update password. The reset link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {done ? (
          <div className="bg-bg-surface border border-border rounded-lg p-6 text-center space-y-3">
            <div className="text-3xl">✓</div>
            <h1 className="text-lg font-semibold text-text-primary">Password updated</h1>
            <p className="text-sm text-text-secondary">Redirecting you to sign in…</p>
          </div>
        ) : !recoveryReady ? (
          <div className="bg-bg-surface border border-border rounded-lg p-6 text-center space-y-3">
            <div className="text-3xl">⏳</div>
            <h1 className="text-lg font-semibold text-text-primary">Verifying reset link…</h1>
            <p className="text-sm text-text-secondary">If this takes more than a few seconds, the link has likely expired.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full mt-2 border border-border text-text-secondary py-2 rounded text-sm hover:text-text-primary hover:border-accent/40"
            >
              Request a new link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-bg-surface border border-border rounded-lg p-6 space-y-4">
            <h1 className="text-lg font-semibold text-text-primary">Set a new password</h1>
            <p className="text-xs text-text-muted">
              Pick something at least 8 characters with a mix of letters, numbers, and symbols.
            </p>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
              className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            {error && <div className="text-danger text-xs">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-bg-primary font-semibold py-2.5 rounded hover:opacity-90 disabled:opacity-50 text-sm"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
