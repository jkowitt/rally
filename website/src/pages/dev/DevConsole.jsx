import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { supabase } from '@/lib/supabase'
import { getConnectionStatus } from '@/services/dev/outlookAuthService'

/**
 * /dev — developer console home.
 * Role-gated at the router level. If the outlook_integration flag
 * is OFF, this page still renders but only shows the flag toggle link
 * and non-Outlook sections (QA, automation, etc).
 */
export default function DevConsole() {
  const { profile } = useAuth()
  const { flags } = useFeatureFlags()
  const outlookOn = Boolean(flags?.outlook_integration)

  const [connection, setConnection] = useState(null)
  const [stats, setStats] = useState({ emailsToday: 0, followUpsDue: 0, prospectsTotal: 0 })
  const [statusCounts, setStatusCounts] = useState({})
  const [trialsCount, setTrialsCount] = useState(0)

  if (profile?.role !== 'developer') return <Navigate to="/app" replace />

  useEffect(() => {
    if (!outlookOn) return
    loadAll()
  }, [outlookOn])

  async function loadAll() {
    const today = new Date().toISOString().slice(0, 10)

    const [conn, emailsTodayRes, followUpsRes, prospectsRes, statusRes, trialsRes] = await Promise.all([
      getConnectionStatus(),
      supabase.from('outlook_emails').select('id', { count: 'exact', head: true }).gte('received_at', today),
      supabase.from('outlook_prospects').select('id', { count: 'exact', head: true }).lte('follow_up_due', today).in('outreach_status', ['contacted', 'responded']),
      supabase.from('outlook_prospects').select('id', { count: 'exact', head: true }),
      supabase.from('outlook_prospects').select('outreach_status'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('onboarding_completed', false),
    ])
    setConnection(conn)
    setStats({
      emailsToday: emailsTodayRes.count || 0,
      followUpsDue: followUpsRes.count || 0,
      prospectsTotal: prospectsRes.count || 0,
    })
    const counts = {}
    ;(statusRes.data || []).forEach(r => { counts[r.outreach_status] = (counts[r.outreach_status] || 0) + 1 })
    setStatusCounts(counts)
    setTrialsCount(trialsRes.count || 0)
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Developer Console</div>
          <h1 className="text-2xl font-semibold">/dev</h1>
          <p className="text-xs text-text-secondary">Private to the developer role. Not linked from any user-facing UI.</p>
        </header>

        {/* Hidden flag toggle shortcut — always visible inside /dev */}
        <div className="bg-bg-card border border-border rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Outlook Integration</div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {outlookOn ? 'Feature flag is ON — all /dev/outlook routes active.' : 'Feature flag is OFF — toggle it from /dev/feature-flags to activate.'}
            </div>
          </div>
          <Link
            to="/dev/feature-flags"
            className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50 hover:text-accent transition-colors"
          >
            Flags →
          </Link>
        </div>

        {outlookOn && (
          <>
            {/* Connection status + today's stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Outlook"
                value={connection?.is_connected ? (connection.outlook_email || 'Connected') : 'Not connected'}
                accent={connection?.health}
              />
              <StatCard label="Emails synced today" value={stats.emailsToday} />
              <StatCard label="Follow-ups due" value={stats.followUpsDue} />
              <StatCard label="Prospects in pipeline" value={stats.prospectsTotal} />
            </div>

            {/* Pipeline snapshot */}
            <div className="bg-bg-card border border-border rounded-lg p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">Outreach Pipeline</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {['not_contacted', 'contacted', 'responded', 'demo_scheduled', 'trial_started', 'converted', 'not_interested'].map(s => (
                  <div key={s} className="bg-bg-surface border border-border rounded px-2 py-2 text-center">
                    <div className="text-lg font-semibold text-accent">{statusCounts[s] || 0}</div>
                    <div className="text-[9px] text-text-muted uppercase tracking-wide">{s.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <DevLink to="/dev/outlook/dashboard" label="Email Dashboard" desc="Sync queue + link" />
              <DevLink to="/dev/outlook/outreach" label="Outreach Pipeline" desc="Prospects + status" />
              <DevLink to="/dev/outlook/follow-ups" label="Follow-ups" desc="Due today" />
              <DevLink to="/dev/outlook/templates" label="Templates" desc="Email templates" />
              <DevLink to="/dev/outlook/analytics" label="Analytics" desc="Funnel + conversion" />
              <DevLink to="/dev/outlook/connect" label="Connection" desc="OAuth + status" />
              <DevLink to="/dev/email" label="Email Marketing" desc="Campaigns + lists" />
              <DevLink to="/dev/feature-flags" label="Feature Flags" desc="All flags (incl. hidden)" />
              <DevLink to="/app/developer" label="Dev Tools" desc="QA, automation, etc." external />
            </div>
          </>
        )}

        {!outlookOn && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <DevLink to="/dev/feature-flags" label="Feature Flags" desc="Toggle hidden flags" />
            <DevLink to="/app/developer" label="Dev Tools" desc="QA, automation" external />
            <DevLink to="/app/admin/automation" label="Automation" desc="Master toggle" external />
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  const color = accent === 'healthy' ? 'text-success' : accent === 'expiring' ? 'text-warning' : accent === 'disconnected' ? 'text-danger' : 'text-accent'
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-xl font-semibold mt-1 truncate ${color}`}>{value}</div>
    </div>
  )
}

function DevLink({ to, label, desc, external = false }) {
  const cls = "bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 hover:bg-bg-surface transition-all text-left"
  const content = (
    <>
      <div className="text-sm font-medium text-text-primary">{label}</div>
      <div className="text-[11px] text-text-muted mt-0.5">{desc}</div>
    </>
  )
  return <Link to={to} className={cls}>{content}</Link>
}
