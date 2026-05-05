import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// /app/developer/usage
//
// Two stacked tables:
//   • Per-user — average minutes/day in the app over the last 30
//     days, total minutes, active days, last active.
//   • Per-property — same shape but rolled up to the company
//     (matters more for plan / pricing decisions).
//
// Plus a Contract Uploads card showing today's upload counts vs
// each property's plan quota — surfaces who's about to hit the
// daily cap before they paginate the AI into rate-limit jail.
export default function UsageDashboard() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [props, setProps] = useState([])
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile && profile.role !== 'developer') return
    let alive = true
    ;(async () => {
      const [u, p, c] = await Promise.all([
        supabase
          .from('user_usage_summary')
          .select('user_id, property_id, total_minutes_30d, avg_minutes_per_day, active_days_30d, last_active_day, profiles!inner(email, full_name)')
          .order('total_minutes_30d', { ascending: false })
          .limit(200),
        supabase
          .from('property_usage_summary')
          .select('property_id, total_minutes_30d, avg_minutes_per_day, peak_concurrent_users, active_days_30d, properties!inner(name, plan)')
          .order('total_minutes_30d', { ascending: false })
          .limit(200),
        // Today's contract uploads per property
        supabase
          .from('contract_upload_log')
          .select('property_id, created_at, properties!inner(name, plan)')
          .gte('created_at', new Date(Date.now() - 86400000).toISOString())
          .order('created_at', { ascending: false }),
      ])
      if (!alive) return
      setUsers(u.data || [])
      setProps(p.data || [])
      // Roll up uploads to one row per property with the count.
      const byProp = new Map()
      for (const r of c.data || []) {
        const key = r.property_id
        if (!byProp.has(key)) byProp.set(key, { property_id: key, name: r.properties?.name, plan: r.properties?.plan, count: 0 })
        byProp.get(key).count += 1
      }
      setUploads(Array.from(byProp.values()).sort((a, b) => b.count - a.count))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [profile?.id])

  if (profile && profile.role !== 'developer') return <Navigate to="/app" replace />

  function quotaForPlan(plan) {
    return ({ starter: 5, pro: 10, enterprise: 50, free: 1 })[String(plan || 'free').toLowerCase()] || 1
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <Link to="/app/developer" className="text-[10px] text-text-muted hover:text-accent">← Dev Tools</Link>
        <h1 className="text-xl sm:text-2xl font-semibold mt-1">Usage</h1>
        <p className="text-[11px] text-text-muted mt-1 max-w-xl">
          Active minutes per user (last 30 days) — counts only when the tab was visible. Heartbeat fires every 60s while the user is actually in the app. Contract uploads are quota'd per plan: 5 starter / 10 pro / 50 enterprise.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-primary">Today's contract uploads (last 24h)</h2>
        {loading && <div className="text-xs text-text-muted">Loading…</div>}
        {!loading && uploads.length === 0 && <div className="text-xs text-text-muted">No uploads in the last 24 hours.</div>}
        {!loading && uploads.length > 0 && (
          <div className="overflow-x-auto bg-bg-card border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-text-muted bg-bg-surface">
                <tr>
                  <th className="text-left px-3 py-2">Property</th>
                  <th className="text-left px-3 py-2">Plan</th>
                  <th className="text-right px-3 py-2">Used</th>
                  <th className="text-right px-3 py-2">Limit</th>
                  <th className="text-right px-3 py-2">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map(u => {
                  const limit = quotaForPlan(u.plan)
                  const remaining = Math.max(0, limit - u.count)
                  const tone = u.count >= limit ? 'text-danger' : u.count >= limit * 0.8 ? 'text-warning' : 'text-text-primary'
                  return (
                    <tr key={u.property_id} className="border-t border-border">
                      <td className="px-3 py-2">{u.name || u.property_id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-text-muted font-mono uppercase">{u.plan || '—'}</td>
                      <td className={`px-3 py-2 text-right font-mono ${tone}`}>{u.count}</td>
                      <td className="px-3 py-2 text-right font-mono text-text-muted">{limit}</td>
                      <td className="px-3 py-2 text-right font-mono text-text-muted">{remaining}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-primary">Per-property usage (last 30 days)</h2>
        {loading && <div className="text-xs text-text-muted">Loading…</div>}
        {!loading && props.length === 0 && <div className="text-xs text-text-muted">No usage data yet.</div>}
        {!loading && props.length > 0 && (
          <div className="overflow-x-auto bg-bg-card border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-text-muted bg-bg-surface">
                <tr>
                  <th className="text-left px-3 py-2">Property</th>
                  <th className="text-left px-3 py-2">Plan</th>
                  <th className="text-right px-3 py-2">Total min (30d)</th>
                  <th className="text-right px-3 py-2">Avg min/day</th>
                  <th className="text-right px-3 py-2">Peak users</th>
                  <th className="text-right px-3 py-2">Active days</th>
                </tr>
              </thead>
              <tbody>
                {props.map(p => (
                  <tr key={p.property_id} className="border-t border-border">
                    <td className="px-3 py-2">{p.properties?.name || p.property_id.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-text-muted font-mono uppercase">{p.properties?.plan || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{p.total_minutes_30d}</td>
                    <td className="px-3 py-2 text-right font-mono text-accent">{p.avg_minutes_per_day}</td>
                    <td className="px-3 py-2 text-right font-mono">{p.peak_concurrent_users}</td>
                    <td className="px-3 py-2 text-right font-mono">{p.active_days_30d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-primary">Per-user usage (last 30 days)</h2>
        {loading && <div className="text-xs text-text-muted">Loading…</div>}
        {!loading && users.length === 0 && <div className="text-xs text-text-muted">No usage data yet.</div>}
        {!loading && users.length > 0 && (
          <div className="overflow-x-auto bg-bg-card border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-text-muted bg-bg-surface">
                <tr>
                  <th className="text-left px-3 py-2">User</th>
                  <th className="text-right px-3 py-2">Total min (30d)</th>
                  <th className="text-right px-3 py-2">Avg min/day</th>
                  <th className="text-right px-3 py-2">Active days</th>
                  <th className="text-right px-3 py-2">Last active</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.user_id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="text-text-primary">{u.profiles?.full_name || u.profiles?.email || u.user_id.slice(0, 8)}</div>
                      {u.profiles?.full_name && <div className="text-[10px] text-text-muted">{u.profiles.email}</div>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{u.total_minutes_30d}</td>
                    <td className="px-3 py-2 text-right font-mono text-accent">{u.avg_minutes_per_day}</td>
                    <td className="px-3 py-2 text-right font-mono">{u.active_days_30d}</td>
                    <td className="px-3 py-2 text-right font-mono text-text-muted">{u.last_active_day || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
