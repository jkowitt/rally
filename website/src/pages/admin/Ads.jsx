import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const PLATFORM_ICONS = { linkedin: '🔷', meta: '🟦', google: '🟢' }

export default function Ads() {
  const { profile, isDeveloper } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  const canAccess = isDeveloper || profile?.role === 'businessops' || profile?.role === 'admin'
  if (profile && !canAccess) return <Navigate to="/app" replace />

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('ad_campaigns').select('*').order('last_synced_at', { ascending: false })
      setCampaigns(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function getAlerts(c) {
    const alerts = []
    if (c.ctr && c.ctr < 0.3) alerts.push({ level: 'warning', msg: 'CTR below 0.3% — consider new creative' })
    if (c.cost_per_signup && c.cost_per_signup > 25) alerts.push({ level: 'warning', msg: 'Cost per signup high — review targeting' })
    if (c.clicks === 0 && c.impressions > 0) alerts.push({ level: 'danger', msg: 'Zero clicks — check campaign status' })
    return alerts
  }

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend_to_date || 0), 0)
  const totalSignups = campaigns.reduce((s, c) => s + (c.signups_attributed || 0), 0)

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Ad Performance</h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">Read-only monitoring. Make budget changes directly in LinkedIn/Meta.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Active Campaigns" value={campaigns.filter(c => c.status === 'active').length} />
        <StatCard label="Total Spend" value={`$${totalSpend.toLocaleString()}`} color="text-accent" />
        <StatCard label="Signups Attributed" value={totalSignups} color="text-success" />
        <StatCard label="Avg Cost/Signup" value={totalSignups ? `$${Math.round(totalSpend / totalSignups)}` : '—'} />
      </div>

      <div className="space-y-2">
        {loading && <div className="text-center text-text-muted text-sm py-6">Loading...</div>}
        {!loading && campaigns.length === 0 && (
          <div className="text-center text-text-muted text-sm py-12">
            No ad campaigns tracked yet. Configure LinkedIn/Meta webhooks to sync performance data here.
          </div>
        )}
        {campaigns.map(c => {
          const alerts = getAlerts(c)
          return (
            <div key={c.id} className="bg-bg-surface border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PLATFORM_ICONS[c.platform]}</span>
                    <span className="text-sm text-text-primary font-medium">{c.campaign_name}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${c.status === 'active' ? 'bg-success/10 text-success' : 'bg-bg-card text-text-muted'}`}>{c.status}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <Stat label="Spend" value={`$${(c.spend_to_date || 0).toLocaleString()}`} />
                <Stat label="Impressions" value={(c.impressions || 0).toLocaleString()} />
                <Stat label="Clicks" value={(c.clicks || 0).toLocaleString()} />
                <Stat label="CTR" value={c.ctr ? `${c.ctr.toFixed(2)}%` : '—'} />
                <Stat label="Signups" value={c.signups_attributed || 0} />
              </div>
              {alerts.length > 0 && (
                <div className="space-y-1">
                  {alerts.map((a, i) => (
                    <div key={i} className={`text-[10px] px-2 py-1 rounded ${a.level === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                      ⚠ {a.msg}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-bg-card rounded-lg p-3 text-center">
      <div className={`text-lg font-bold ${color || 'text-text-primary'}`}>{value}</div>
      <div className="text-[9px] text-text-muted mt-0.5">{label}</div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-bg-card rounded p-1.5">
      <div className="text-xs font-mono text-text-primary">{value}</div>
      <div className="text-[8px] text-text-muted">{label}</div>
    </div>
  )
}
