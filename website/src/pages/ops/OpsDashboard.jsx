import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

/**
 * /app/ops — aggregate operations dashboard. Shows team health,
 * billing status, feature flag state, and admin quick links.
 * Visible to admin/businessops/developer roles.
 */
export default function OpsDashboard() {
  const { isDeveloper, profile } = useAuth()
  const [data, setData] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const propertyId = profile?.property_id
      const now = new Date()
      const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString()

      const [
        teamCount,
        flagsResult,
        dealsTotal,
        dealsNew30,
        contractsTotal,
        recentActivity,
        aiCredits,
      ] = await Promise.all([
        supabase.from('team_members').select('id', { count: 'exact', head: true }),
        supabase.from('feature_flags').select('module, enabled').order('module'),
        supabase.from('deals').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
        supabase.from('contracts').select('id', { count: 'exact', head: true }),
        supabase.from('activities').select('id, type, created_at').order('created_at', { ascending: false }).limit(10),
        propertyId
          ? supabase.from('organization_ai_credits').select('*').eq('property_id', propertyId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      // Billing info
      const billing = propertyId
        ? (await supabase.from('organization_billing').select('*').eq('property_id', propertyId).maybeSingle()).data
        : null

      if (mounted) {
        setData({
          team: teamCount.count || 0,
          flags: {
            total: flagsResult.data?.length || 0,
            on: (flagsResult.data || []).filter(f => f.enabled).length,
            off: (flagsResult.data || []).filter(f => !f.enabled).length,
            list: flagsResult.data || [],
          },
          deals: {
            total: dealsTotal.count || 0,
            new30: dealsNew30.count || 0,
          },
          contracts: contractsTotal.count || 0,
          recentActivity: recentActivity.data || [],
          aiCredits: aiCredits.data,
          billing,
          plan: profile?.properties?.plan || billing?.plan_key || 'free',
        })
      }
    }
    load()
    return () => { mounted = false }
  }, [profile?.property_id])

  if (!data) return <div className="p-6 text-xs text-text-muted">Loading ops dashboard…</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">Operations</div>
        <h1 className="text-2xl font-semibold text-text-primary">Ops Dashboard</h1>
        <p className="text-xs text-text-muted mt-1">Team, billing, platform health, and admin controls in one place.</p>
      </header>

      {/* Top metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Stat label="Plan" value={data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} />
        <Stat label="Team members" value={data.team} />
        <Stat label="Total deals" value={data.deals.total} />
        <Stat label="New deals (30d)" value={data.deals.new30} color="success" />
        <Stat label="Contracts" value={data.contracts} />
        <Stat label="Flags ON" value={`${data.flags.on}/${data.flags.total}`} color="success" />
        {data.aiCredits && (
          <Stat
            label="AI credits left"
            value={(data.aiCredits.plan_credits_remaining || 0) + (data.aiCredits.purchased_credits_remaining || 0)}
            color={((data.aiCredits.plan_credits_remaining || 0) + (data.aiCredits.purchased_credits_remaining || 0)) < 10 ? 'warning' : 'accent'}
          />
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickAction
          label="Manage Team"
          description={`${data.team} member${data.team !== 1 ? 's' : ''} on the ${data.plan} plan`}
          to="/app/ops/team"
        />
        <QuickAction
          label="Plan & Billing"
          description={data.billing?.billing_period === 'annual' ? 'Annual billing' : 'Monthly billing'}
          to="/app/settings"
        />
        {isDeveloper && (
          <QuickAction
            label="Dev Tools"
            description="Feature flags, QA reports, automation control"
            to="/app/developer"
          />
        )}
      </div>

      {/* Two-column: flags overview + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature flags snapshot */}
        <div className="bg-bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Feature Flags</span>
            <Link to="/app/developer" className="text-[10px] text-accent hover:underline">Manage →</Link>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {data.flags.list.map(f => (
              <div key={f.module} className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-text-primary font-mono truncate flex-1 mr-2">{f.module}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  f.enabled ? 'bg-success/15 text-success' : 'bg-bg-surface text-text-muted'
                }`}>
                  {f.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
            {data.flags.list.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-text-muted">No feature flags found.</div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Recent Activity</span>
            <Link to="/app/crm/activities" className="text-[10px] text-accent hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {data.recentActivity.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-text-muted">No recent activity.</div>
            ) : (
              data.recentActivity.map(a => (
                <div key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-primary">{formatActivityType(a.type)}</span>
                    <span className="text-[10px] text-text-muted font-mono">{timeAgo(a.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI credit usage (if available) */}
      {data.aiCredits && (
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">AI Credit Usage</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-text-muted">Plan credits remaining</div>
              <div className="text-lg font-semibold text-accent">{data.aiCredits.plan_credits_remaining || 0}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Purchased credits</div>
              <div className="text-lg font-semibold text-accent">{data.aiCredits.purchased_credits_remaining || 0}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Used this period</div>
              <div className="text-lg font-semibold text-warning">{data.aiCredits.total_credits_used_this_period || 0}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Period ends</div>
              <div className="text-sm font-mono text-text-secondary">
                {data.aiCredits.period_end ? new Date(data.aiCredits.period_end).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color = 'accent' }) {
  const cls = color === 'success' ? 'text-success' : color === 'warning' ? 'text-warning' : 'text-accent'
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}

function QuickAction({ label, description, to }) {
  return (
    <Link to={to} className="bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-colors group">
      <div className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">{label}</div>
      <div className="text-[11px] text-text-muted mt-1">{description}</div>
    </Link>
  )
}

function formatActivityType(type) {
  const map = {
    deal_created: 'New deal created',
    deal_updated: 'Deal updated',
    deal_stage_changed: 'Deal stage changed',
    contract_uploaded: 'Contract uploaded',
    email_sent: 'Email sent',
    note_added: 'Note added',
    task_completed: 'Task completed',
  }
  return map[type] || type?.replace(/_/g, ' ') || 'Activity'
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
