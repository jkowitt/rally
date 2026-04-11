import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags, HIDDEN_MODULES } from '@/hooks/useFeatureFlags'

/**
 * /dev/feature-flags — the ONLY page where hidden flags are visible.
 * Gates on role = developer. Flag gate does NOT apply here because
 * this is where the developer toggles the flag on in the first place.
 */
export default function DevFeatureFlags() {
  const { profile } = useAuth()
  const { flags, toggleFlag } = useFeatureFlags()

  if (profile?.role !== 'developer') return <Navigate to="/app" replace />

  async function handleToggle(module) {
    await toggleFlag(module)
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6 sm:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <Link to="/dev" className="text-[10px] text-text-muted hover:text-accent">← /dev</Link>
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Hidden Feature Flags</div>
          <h1 className="text-2xl font-semibold">Developer Flags</h1>
          <p className="text-xs text-text-secondary">
            Flags on this page never appear in the standard Dev Tools UI.
            Toggling is only visible to the developer role.
          </p>
        </header>

        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
          {HIDDEN_MODULES.map(m => {
            const enabled = Boolean(flags[m])
            return (
              <div key={m} className="flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-mono text-text-primary">{m}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {descriptionFor(m)}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(m)}
                  className={`px-4 py-1.5 rounded text-xs font-mono ${enabled ? 'bg-success/20 text-success' : 'bg-bg-surface text-text-muted border border-border'}`}
                >
                  {enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="text-[10px] text-text-muted font-mono">
          These flags also drive RLS-gated edge functions. Turning a flag
          OFF stops all associated cron jobs and returns 404 to every edge
          endpoint tied to that feature.
        </div>
      </div>
    </div>
  )
}

function descriptionFor(module) {
  const map = {
    outlook_integration: 'Developer-only Outlook integration for personal outreach management',
  }
  return map[module] || 'Hidden developer flag'
}
