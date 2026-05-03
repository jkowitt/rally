import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { session, loading, profile, realIsDeveloper, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary font-mono text-sm">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  // Check if account access has expired (but allow Settings page for revival)
  const accessUntil = profile?.properties?.access_until
  const isExpired = accessUntil && new Date(accessUntil) < new Date()
  const isSettingsPage = location.pathname.includes('/settings')

  // realIsDeveloper bypasses the expired screen even while
  // impersonating, so the dev can keep accessing the app to debug.
  if (isExpired && !isSettingsPage && !realIsDeveloper) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-5">
          <div className="text-4xl">⏸</div>
          <h1 className="text-xl font-semibold text-text-primary">Your Account Has Been Paused</h1>
          <p className="text-sm text-text-secondary">
            Your account cancellation is in effect. Your data is archived and will be permanently deleted on{' '}
            <span className="text-text-primary font-mono">
              {profile?.properties?.scheduled_deletion_at
                ? new Date(profile.properties.scheduled_deletion_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : '30 days from now'}
            </span>.
          </p>
          <div className="space-y-3">
            <Link
              to="/app/settings"
              className="block w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Go to Settings to Revive Account
            </Link>
            <button
              onClick={() => signOut().then(() => window.location.href = '/')}
              className="block w-full border border-border text-text-muted py-3 rounded-lg text-sm hover:text-text-secondary transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children
}
