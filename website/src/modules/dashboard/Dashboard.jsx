import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#E8B84B', '#52C48A', '#E0B352', '#E05252', '#8B92A8', '#9E7D2F']
const STAGE_ORDER = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed']
const STAGE_PROBABILITY = { 'Prospect': 10, 'Proposal Sent': 25, 'Negotiation': 50, 'Contracted': 90, 'In Fulfillment': 95, 'Renewed': 100 }

export default function Dashboard() {
  const { profile } = useAuth()
  const { flags } = useFeatureFlags()
  const navigate = useNavigate()
  const propertyId = profile?.property_id

  const { data: deals } = useQuery({
    queryKey: ['deals-dashboard', propertyId],
    queryFn: async () => {
      if (!propertyId) return []
      const { data } = await supabase.from('deals').select('*').eq('property_id', propertyId)
      return data || []
    },
    enabled: !!propertyId && flags.crm,
  })

  const { data: tasks } = useQuery({
    queryKey: ['tasks-dashboard', propertyId],
    queryFn: async () => {
      if (!propertyId) return []
      const { data } = await supabase.from('tasks').select('id, title, due_date, priority, status, deal_id').eq('property_id', propertyId).neq('status', 'Done').order('due_date')
      return data || []
    },
    enabled: !!propertyId && flags.crm,
  })

  const { data: activities } = useQuery({
    queryKey: ['activities-dashboard', propertyId],
    queryFn: async () => {
      if (!propertyId) return []
      const { data } = await supabase.from('activities').select('id, activity_type, subject, occurred_at, deals(brand_name)').eq('property_id', propertyId).order('occurred_at', { ascending: false }).limit(8)
      return data || []
    },
    enabled: !!propertyId && flags.crm,
  })

  const { data: events } = useQuery({
    queryKey: ['events-summary', propertyId],
    queryFn: async () => {
      if (!propertyId) return []
      const { data } = await supabase
        .from('events').select('*').eq('property_id', propertyId)
        .gte('event_date', new Date().toISOString()).order('event_date').limit(5)
      return data || []
    },
    enabled: !!propertyId && flags.sportify,
  })

  // Analytics calculations
  const activeDeals = deals?.filter(d => d.stage !== 'Declined') || []
  const wonDeals = deals?.filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)) || []
  const declinedDeals = deals?.filter(d => d.stage === 'Declined') || []
  const totalPipeline = activeDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
  const weightedPipeline = activeDeals.reduce((s, d) => s + (Number(d.value) || 0) * ((d.win_probability || STAGE_PROBABILITY[d.stage] || 0) / 100), 0)
  const contractedValue = wonDeals.reduce((s, d) => s + (Number(d.value) || 0), 0)
  const winRate = deals?.length ? Math.round((wonDeals.length / deals.length) * 100) : 0
  const avgDealSize = activeDeals.length ? totalPipeline / activeDeals.length : 0

  // Pipeline by stage
  const pipelineData = STAGE_ORDER.map(stage => ({
    stage: stage.replace('In Fulfillment', 'Fulfillment').replace('Proposal Sent', 'Proposal'),
    value: activeDeals.filter(d => d.stage === stage).reduce((s, d) => s + (Number(d.value) || 0), 0),
    count: activeDeals.filter(d => d.stage === stage).length,
  })).filter(d => d.count > 0)

  // Conversion funnel
  const funnelData = STAGE_ORDER.map((stage, i) => {
    const count = activeDeals.filter(d => {
      const idx = STAGE_ORDER.indexOf(d.stage)
      return idx >= i
    }).length
    return { stage: stage.replace('Proposal Sent', 'Proposal').replace('In Fulfillment', 'Fulfill'), count }
  })

  // Deal count by stage for pie
  const stageCount = Object.entries(
    activeDeals.reduce((acc, d) => { acc[d.stage] = (acc[d.stage] || 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  // Overdue tasks
  const today = new Date().toISOString().split('T')[0]
  const overdueTasks = tasks?.filter(t => t.due_date && t.due_date < today) || []
  const todayTasks = tasks?.filter(t => t.due_date === today) || []

  // Stale deals (no activity in 14+ days)
  const staleDeals = activeDeals.filter(d => {
    if (['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)) return false
    const lastDate = d.last_contacted || d.date_added || d.created_at
    if (!lastDate) return true
    const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
    return days > 14
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          Welcome back, {profile?.full_name || 'there'}
        </p>
      </div>

      {/* Alerts */}
      {(overdueTasks.length > 0 || staleDeals.length > 0) && (
        <div className="flex gap-3 flex-wrap">
          {overdueTasks.length > 0 && (
            <button onClick={() => navigate('/app/crm/tasks')} className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger rounded-lg px-4 py-2 text-sm hover:bg-danger/20">
              <span className="font-mono font-bold">{overdueTasks.length}</span> overdue task{overdueTasks.length > 1 ? 's' : ''}
            </button>
          )}
          {staleDeals.length > 0 && (
            <button onClick={() => navigate('/app/crm/pipeline')} className="flex items-center gap-2 bg-warning/10 border border-warning/30 text-warning rounded-lg px-4 py-2 text-sm hover:bg-warning/20">
              <span className="font-mono font-bold">{staleDeals.length}</span> stale deal{staleDeals.length > 1 ? 's' : ''} need attention
            </button>
          )}
          {todayTasks.length > 0 && (
            <button onClick={() => navigate('/app/crm/tasks')} className="flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent rounded-lg px-4 py-2 text-sm hover:bg-accent/20">
              <span className="font-mono font-bold">{todayTasks.length}</span> task{todayTasks.length > 1 ? 's' : ''} due today
            </button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Total Pipeline" value={`$${(totalPipeline / 1000).toFixed(0)}K`} sub={`${activeDeals.length} deals`} />
        <KPICard label="Weighted Pipeline" value={`$${(weightedPipeline / 1000).toFixed(0)}K`} sub="probability-adjusted" accent />
        <KPICard label="Contracted" value={`$${(contractedValue / 1000).toFixed(0)}K`} sub={`${wonDeals.length} won`} />
        <KPICard label="Win Rate" value={`${winRate}%`} sub={`${declinedDeals.length} lost`} />
        <KPICard label="Avg Deal" value={`$${(avgDealSize / 1000).toFixed(0)}K`} sub="per deal" />
        <KPICard label="Active Tasks" value={tasks?.length || 0} sub={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'on track'} warn={overdueTasks.length > 0} />
      </div>

      {/* Charts Row */}
      {flags.crm && pipelineData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Value by Stage */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-text-primary mb-4">Pipeline by Stage</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
                <XAxis dataKey="stage" tick={{ fontSize: 9, fill: '#8B92A8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} />
                <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="value" fill="#E8B84B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-text-primary mb-4">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
                <XAxis dataKey="stage" tick={{ fontSize: 9, fill: '#8B92A8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} />
                <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" fill="#E8B84B" fillOpacity={0.2} stroke="#E8B84B" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Deals by Stage */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-text-primary mb-4">Deals by Stage</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stageCount} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 9, fill: '#8B92A8' }}>
                  {stageCount.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom Row: Recent Activity + Tasks + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        {flags.crm && (
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-primary">Recent Activity</h3>
              <button onClick={() => navigate('/app/crm/activities')} className="text-xs text-accent hover:underline">View all</button>
            </div>
            {activities?.length ? (
              <div className="space-y-2">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                    <span className="text-[10px] font-mono bg-bg-card px-1.5 py-0.5 rounded text-text-muted shrink-0">{a.activity_type}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-text-primary truncate">{a.subject || a.activity_type}</div>
                      <div className="text-[10px] text-text-muted">{a.deals?.brand_name} &middot; {timeAgo(a.occurred_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-4 text-center">No recent activity</p>
            )}
          </div>
        )}

        {/* Upcoming Tasks */}
        {flags.crm && (
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-primary">Upcoming Tasks</h3>
              <button onClick={() => navigate('/app/crm/tasks')} className="text-xs text-accent hover:underline">View all</button>
            </div>
            {tasks?.length ? (
              <div className="space-y-2">
                {tasks.slice(0, 6).map((t) => (
                  <div key={t.id} className={`flex items-center justify-between py-1.5 border-b border-border last:border-0 ${t.due_date && t.due_date < today ? 'opacity-100' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-text-primary truncate">{t.title}</div>
                      <div className="text-[10px] text-text-muted">{t.due_date || 'No date'}</div>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${t.due_date && t.due_date < today ? 'bg-danger/10 text-danger' : t.priority === 'High' ? 'text-danger' : 'text-text-muted'}`}>
                      {t.due_date && t.due_date < today ? 'OVERDUE' : t.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-4 text-center">No pending tasks</p>
            )}
          </div>
        )}

        {/* Upcoming Events */}
        {flags.sportify && (
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-text-primary mb-3">Upcoming Events</h3>
            {events?.length ? (
              <div className="space-y-2">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div>
                      <span className="text-xs text-text-primary">{event.name}</span>
                      <span className="ml-2 text-[10px] text-text-muted font-mono">{event.event_type}</span>
                    </div>
                    <span className="text-[10px] text-text-secondary font-mono">{new Date(event.event_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-4 text-center">No upcoming events</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function KPICard({ label, value, sub, accent, warn }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4">
      <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono">{label}</div>
      <div className={`text-xl font-semibold font-mono mt-1 ${accent ? 'text-accent' : warn ? 'text-warning' : 'text-text-primary'}`}>{value}</div>
      <div className="text-[10px] text-text-secondary mt-0.5">{sub}</div>
    </div>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
