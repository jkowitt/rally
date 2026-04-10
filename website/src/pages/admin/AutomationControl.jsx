import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAutomation } from '@/hooks/useAutomation'
import { useToast } from '@/components/Toast'
import ActivityFeed from '@/components/automation/ActivityFeed'
import { supabase } from '@/lib/supabase'

const SUB_TOGGLES = [
  { key: 'email_sequences_enabled', label: 'Email Sequences', desc: 'Welcome flows, trial nurture, dunning' },
  { key: 'trial_nurture_enabled', label: 'Trial Nurture', desc: 'Engagement scoring, re-engagement campaigns' },
  { key: 'upgrade_prompts_enabled', label: 'Upgrade Prompts', desc: 'Day-18/25 prompts, in-app gates' },
  { key: 'social_scheduling_enabled', label: 'Social Scheduling', desc: 'Auto-generated LinkedIn posts' },
  { key: 'operational_tasks_enabled', label: 'Operational Tasks', desc: 'Daily digests, contract expiry monitoring' },
  { key: 'ad_campaigns_enabled', label: 'Ad Performance Monitoring', desc: 'Track LinkedIn + Meta campaigns' },
]

export default function AutomationControl() {
  const { profile, isDeveloper } = useAuth()
  const { toast } = useToast()
  const { loaded, settings, isMasterOn, toggleMaster, toggleSub, saving, reload } = useAutomation()
  const [confirmToggle, setConfirmToggle] = useState(null)
  const [health, setHealth] = useState(null)

  const canAccess = isDeveloper || profile?.role === 'businessops' || profile?.role === 'admin'
  if (profile && !canAccess) return <Navigate to="/app" replace />

  // Load health metrics
  useEffect(() => {
    async function loadHealth() {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const [emails, failed, nextScheduled] = await Promise.all([
        supabase.from('automation_log').select('*', { count: 'exact', head: true }).eq('event_category', 'email').eq('status', 'sent').gte('created_at', weekAgo),
        supabase.from('automation_log').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', weekAgo),
        supabase.from('email_sends').select('scheduled_for, subject').eq('status', 'queued').order('scheduled_for').limit(1).maybeSingle(),
      ])
      setHealth({
        emailsSent: emails.count || 0,
        failed: failed.count || 0,
        nextScheduled: nextScheduled.data,
      })
    }
    loadHealth()
  }, [settings])

  async function handleMasterToggle() {
    const turningOn = !isMasterOn
    setConfirmToggle({ type: 'master', turningOn })
  }

  async function confirmMasterToggle() {
    const turningOn = confirmToggle.turningOn
    await toggleMaster(turningOn)
    setConfirmToggle(null)
    toast({
      title: turningOn ? 'Automation activated' : 'Automation paused',
      description: turningOn ? 'Running in background' : 'All sequences paused',
      type: 'success',
    })
  }

  if (!loaded) {
    return <div className="p-6 text-center text-text-muted">Loading automation settings...</div>
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Automation Control Center</h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">Master control for the entire marketing and operational engine.</p>
      </div>

      {/* Section 1: Master Toggle */}
      <div className={`bg-bg-surface border-2 rounded-xl p-5 sm:p-6 ${isMasterOn ? 'border-success/40' : 'border-border'}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isMasterOn ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
              <h2 className="text-lg font-bold text-text-primary">Automation Engine</h2>
            </div>
            <p className={`text-xs mt-1 ${isMasterOn ? 'text-success' : 'text-text-muted'}`}>
              {isMasterOn ? 'Automation Active — Running in background' : 'Manual Mode — You control everything'}
            </p>
            {isMasterOn && settings.automation_enabled_at && (
              <p className="text-[10px] text-text-muted mt-1 font-mono">
                Enabled {new Date(settings.automation_enabled_at).toLocaleString()}
              </p>
            )}
            {!isMasterOn && settings.automation_disabled_at && (
              <p className="text-[10px] text-text-muted mt-1 font-mono">
                Last disabled {new Date(settings.automation_disabled_at).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={handleMasterToggle}
            disabled={saving === 'master'}
            className={`px-6 py-3 rounded-lg text-sm font-bold transition-all shrink-0 ${isMasterOn ? 'bg-success text-bg-primary hover:opacity-90' : 'bg-accent text-bg-primary hover:opacity-90'} disabled:opacity-50`}
          >
            {saving === 'master' ? '...' : isMasterOn ? 'TURN OFF' : 'TURN ON'}
          </button>
        </div>
      </div>

      {/* Section 4: Health Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <HealthCard label="Emails This Week" value={health?.emailsSent ?? '—'} color="text-accent" />
        <HealthCard label="Failed" value={health?.failed ?? '—'} color={(health?.failed || 0) > 0 ? 'text-danger' : 'text-text-primary'} />
        <HealthCard label="Next Fires" value={health?.nextScheduled ? new Date(health.nextScheduled.scheduled_for).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'None'} sub={health?.nextScheduled?.subject?.slice(0, 30)} />
        <HealthCard label="Master Status" value={isMasterOn ? 'ACTIVE' : 'PAUSED'} color={isMasterOn ? 'text-success' : 'text-text-muted'} />
      </div>

      {/* Section 2: Sub-system toggles */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
        <h3 className="text-sm font-mono text-text-muted uppercase mb-3">Sub-Systems</h3>
        <p className="text-[10px] text-text-muted mb-3">Only active when master engine is ON. Turning individual sub-systems OFF while master is ON pauses just that category.</p>
        <div className="space-y-1">
          {SUB_TOGGLES.map(t => {
            const enabled = settings[t.key] !== false
            return (
              <div key={t.key} className={`flex items-center justify-between py-2.5 px-2 rounded hover:bg-bg-card border-b border-border last:border-0 ${!isMasterOn ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-text-primary">{t.label}</span>
                  <p className="text-[10px] text-text-muted mt-0.5">{t.desc}</p>
                </div>
                <button
                  onClick={() => toggleSub(t.key, !enabled)}
                  disabled={!isMasterOn || saving === t.key}
                  className={`px-3 py-1.5 rounded text-[10px] font-mono font-medium shrink-0 ml-2 transition-colors ${saving === t.key ? 'bg-warning/20 text-warning animate-pulse' : enabled && isMasterOn ? 'bg-success/20 text-success border border-success/30' : 'bg-bg-card text-text-muted border border-border'} disabled:cursor-not-allowed`}
                >
                  {saving === t.key ? '...' : enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 3: Live Activity Feed */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
        <h3 className="text-sm font-mono text-text-muted uppercase mb-3">Live Activity Feed</h3>
        <ActivityFeed />
      </div>

      {/* Confirmation modal */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-bg-surface border border-border rounded-lg p-5 max-w-md w-full space-y-4">
            <h3 className="text-base font-semibold text-text-primary">
              {confirmToggle.turningOn ? 'Turn ON automation?' : 'Turn OFF automation?'}
            </h3>
            <p className="text-xs text-text-secondary">
              {confirmToggle.turningOn
                ? 'Enabling automation will activate all email sequences, trial nurture, and scheduled tasks. You can pause individual sub-systems afterward.'
                : 'Disabling automation pauses all sequences. In-progress emails will still send. Queued items wait until you re-enable.'}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmToggle(null)} className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5">Cancel</button>
              <button onClick={confirmMasterToggle} className={`px-4 py-2 rounded text-xs font-medium ${confirmToggle.turningOn ? 'bg-success text-bg-primary' : 'bg-warning text-bg-primary'}`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HealthCard({ label, value, sub, color }) {
  return (
    <div className="bg-bg-card rounded-lg p-3">
      <div className="text-[9px] text-text-muted uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold font-mono mt-1 ${color || 'text-text-primary'}`}>{value}</div>
      {sub && <div className="text-[9px] text-text-muted mt-0.5 truncate">{sub}</div>}
    </div>
  )
}
