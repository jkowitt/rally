import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, CartesianGrid } from 'recharts'

const COLORS = ['#E8B84B', '#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#F44336']

export default function SalesDashboard() {
  const { profile } = useAuth()
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('30d')

  useEffect(() => { load() }, [period])

  async function load() {
    const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
    const since = new Date(Date.now() - daysBack * 86400000).toISOString()

    const [
      allDeals, recentDeals, wonDeals, lostDeals,
      allContracts, allActivities, teamMembers,
    ] = await Promise.all([
      supabase.from('deals').select('id, stage, total_value, annual_value, created_at, assigned_to, company_name'),
      supabase.from('deals').select('id, stage, total_value, created_at').gte('created_at', since),
      supabase.from('deals').select('id, total_value, created_at, assigned_to').in('stage', ['Contracted', 'In Fulfillment', 'Renewed']).gte('created_at', since),
      supabase.from('deals').select('id, total_value, created_at').eq('stage', 'Declined').gte('created_at', since),
      supabase.from('contracts').select('id, total_value, created_at'),
      supabase.from('activities').select('id, type, created_at').gte('created_at', since),
      supabase.from('team_members').select('id, user_id, profiles:user_id(full_name)'),
    ])

    const deals = allDeals.data || []
    const recent = recentDeals.data || []
    const won = wonDeals.data || []
    const lost = lostDeals.data || []
    const activities = allActivities.data || []
    const team = teamMembers.data || []

    // Pipeline by stage
    const stageMap = {}
    deals.forEach(d => {
      const stage = d.stage || 'Unknown'
      if (!stageMap[stage]) stageMap[stage] = { stage, count: 0, value: 0 }
      stageMap[stage].count++
      stageMap[stage].value += d.total_value || 0
    })
    const pipelineByStage = Object.values(stageMap).sort((a, b) => b.value - a.value)

    // Win rate
    const totalClosed = won.length + lost.length
    const winRate = totalClosed > 0 ? Math.round((won.length / totalClosed) * 100) : 0

    // Revenue won
    const revenueWon = won.reduce((s, d) => s + (d.total_value || 0), 0)

    // Average deal size
    const avgDealSize = won.length > 0 ? Math.round(revenueWon / won.length) : 0

    // Pipeline value (all active deals)
    const activeStages = ['Prospect', 'Outreach', 'Proposal Sent', 'Negotiation', 'Verbal Commitment']
    const pipelineValue = deals.filter(d => activeStages.includes(d.stage)).reduce((s, d) => s + (d.total_value || 0), 0)

    // Deals over time (weekly buckets)
    const weekBuckets = {}
    recent.forEach(d => {
      const week = new Date(d.created_at).toISOString().slice(0, 10)
      const weekStart = getWeekStart(week)
      if (!weekBuckets[weekStart]) weekBuckets[weekStart] = { week: weekStart, created: 0, won: 0 }
      weekBuckets[weekStart].created++
    })
    won.forEach(d => {
      const week = getWeekStart(new Date(d.created_at).toISOString().slice(0, 10))
      if (!weekBuckets[week]) weekBuckets[week] = { week, created: 0, won: 0 }
      weekBuckets[week].won++
    })
    const dealsOverTime = Object.values(weekBuckets).sort((a, b) => a.week.localeCompare(b.week))

    // Rep performance
    const repMap = {}
    deals.forEach(d => {
      if (!d.assigned_to) return
      if (!repMap[d.assigned_to]) repMap[d.assigned_to] = { id: d.assigned_to, deals: 0, value: 0, won: 0 }
      repMap[d.assigned_to].deals++
      repMap[d.assigned_to].value += d.total_value || 0
    })
    won.forEach(d => {
      if (d.assigned_to && repMap[d.assigned_to]) repMap[d.assigned_to].won++
    })
    const repPerformance = Object.values(repMap).map(r => {
      const member = team.find(t => t.user_id === r.id)
      return { ...r, name: member?.profiles?.full_name || 'Unknown' }
    }).sort((a, b) => b.value - a.value)

    // Activity breakdown
    const activityMap = {}
    activities.forEach(a => {
      const type = a.type || 'other'
      activityMap[type] = (activityMap[type] || 0) + 1
    })
    const activityBreakdown = Object.entries(activityMap).map(([type, count]) => ({
      type: type.replace(/_/g, ' '),
      count,
    })).sort((a, b) => b.count - a.count)

    setData({
      totalDeals: deals.length,
      recentDeals: recent.length,
      winRate,
      revenueWon,
      avgDealSize,
      pipelineValue,
      pipelineByStage,
      dealsOverTime,
      repPerformance,
      activityBreakdown,
      totalActivities: activities.length,
    })
  }

  if (!data) return <div className="p-6 text-xs text-text-muted">Loading analytics…</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">Analytics</div>
          <h1 className="text-2xl font-semibold text-text-primary">Sales Dashboard</h1>
        </div>
        <div className="flex gap-1">
          {['7d', '30d', '90d', '1y'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[10px] font-mono px-3 py-1.5 rounded ${period === p ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Pipeline value" value={`$${fmt(data.pipelineValue)}`} />
        <Stat label="Revenue won" value={`$${fmt(data.revenueWon)}`} color="success" />
        <Stat label="Win rate" value={`${data.winRate}%`} color={data.winRate >= 30 ? 'success' : 'warning'} />
        <Stat label="Avg deal size" value={`$${fmt(data.avgDealSize)}`} />
        <Stat label="New deals" value={data.recentDeals} color="accent" />
        <Stat label="Activities" value={data.totalActivities} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by stage */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">Pipeline by Stage</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.pipelineByStage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={v => `$${fmt(v)}`} />
              <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
              <Tooltip formatter={v => `$${fmt(v)}`} contentStyle={{ fontSize: 11, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} />
              <Bar dataKey="value" fill="#E8B84B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Deals over time */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">Deals Over Time</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.dealsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <Tooltip contentStyle={{ fontSize: 11, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} />
              <Area type="monotone" dataKey="created" stroke="#E8B84B" fill="#E8B84B" fillOpacity={0.15} name="Created" />
              <Area type="monotone" dataKey="won" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.15} name="Won" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rep performance */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">Rep Performance</div>
          {data.repPerformance.length === 0 ? (
            <div className="text-xs text-text-muted py-8 text-center">No rep data yet</div>
          ) : (
            <div className="space-y-3">
              {data.repPerformance.slice(0, 8).map((rep, i) => (
                <div key={rep.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-[10px] flex items-center justify-center font-bold shrink-0">
                    {(rep.name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-primary truncate">{rep.name}</div>
                    <div className="flex gap-3 text-[10px] text-text-muted">
                      <span>{rep.deals} deals</span>
                      <span className="text-success">{rep.won} won</span>
                      <span>${fmt(rep.value)}</span>
                    </div>
                  </div>
                  <div className="w-20 bg-bg-surface rounded-full h-1.5">
                    <div
                      className="bg-accent rounded-full h-1.5"
                      style={{ width: `${Math.min(100, (rep.value / (data.repPerformance[0]?.value || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity breakdown */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">Activity Breakdown</div>
          {data.activityBreakdown.length === 0 ? (
            <div className="text-xs text-text-muted py-8 text-center">No activities recorded</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.activityBreakdown.slice(0, 6)}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  label={({ type, count }) => `${type} (${count})`}
                >
                  {data.activityBreakdown.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
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

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}
