import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#E8B84B', '#52C48A', '#E0B352', '#E05252', '#8B92A8', '#9E7D2F']
const STAGE_ORDER = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed']
const STAGE_PROBABILITY = { 'Prospect': 10, 'Proposal Sent': 25, 'Negotiation': 50, 'Contracted': 90, 'In Fulfillment': 95, 'Renewed': 100 }

const STORAGE_KEY = 'rally-dashboard-settings'

const ALL_CARDS = [
  { id: 'alerts', label: 'Alerts' },
  { id: 'stage-counts', label: 'Prospect / Deal Stage Counts' },
  { id: 'kpis', label: 'KPI Summary' },
  { id: 'win-rate', label: 'Win Rate Breakdown' },
  { id: 'revenue-by-year', label: 'Revenue by Year' },
  { id: 'pipeline-charts', label: 'Pipeline Charts' },
  { id: 'activity-tasks', label: 'Recent Activity & Tasks' },
]

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { order: ALL_CARDS.map(c => c.id), hidden: [] }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export default function Dashboard() {
  const { profile } = useAuth()
  const { flags } = useFeatureFlags()
  const navigate = useNavigate()
  const propertyId = profile?.property_id

  const [settings, setSettings] = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [sortField, setSortField] = useState('value')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => { saveSettings(settings) }, [settings])

  // Ensure new cards are always present in order
  useEffect(() => {
    const allIds = ALL_CARDS.map(c => c.id)
    const missing = allIds.filter(id => !settings.order.includes(id))
    if (missing.length) {
      setSettings(s => ({ ...s, order: [...s.order, ...missing] }))
    }
  }, [settings.order])

  // --- Data Queries ---

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
      const { data } = await supabase.from('activities').select('id, activity_type, subject, occurred_at, deal_id, deals(brand_name)').eq('property_id', propertyId).order('occurred_at', { ascending: false }).limit(50)
      return data || []
    },
    enabled: !!propertyId && flags.crm,
  })

  const { data: contracts } = useQuery({
    queryKey: ['contracts-dashboard', propertyId],
    queryFn: async () => {
      if (!propertyId) return []
      const { data } = await supabase.from('contracts').select('id, deal_id, status, property_id').eq('property_id', propertyId)
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

  // --- Derived Computations ---

  const currentYear = new Date().getFullYear()

  // Build a set of deal_ids that have at least one 'Meeting' activity
  const dealIdsWithMeeting = useMemo(() => {
    const s = new Set()
    activities?.forEach(a => {
      if (a.activity_type === 'Meeting' && a.deal_id) s.add(a.deal_id)
    })
    return s
  }, [activities])

  // Build set of deal_ids that have contracts in 'In Review'
  const dealIdsWithContractInReview = useMemo(() => {
    const s = new Set()
    contracts?.forEach(c => {
      if (c.status === 'In Review' && c.deal_id) s.add(c.deal_id)
    })
    return s
  }, [contracts])

  // Categories from deals
  const allCategories = useMemo(() => {
    if (!deals) return []
    return [...new Set(deals.map(d => d.sub_industry).filter(Boolean))].sort()
  }, [deals])

  // Filtered & sorted deals
  const filteredDeals = useMemo(() => {
    let list = deals || []
    if (filterCategory) list = list.filter(d => d.sub_industry === filterCategory)
    list = [...list].sort((a, b) => {
      let av, bv
      if (sortField === 'value') {
        av = Number(a.value) || 0; bv = Number(b.value) || 0
      } else if (sortField === 'date') {
        av = a.start_date || a.date_added || ''; bv = b.start_date || b.date_added || ''
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      } else {
        av = a.brand_name || ''; bv = b.brand_name || ''
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [deals, filterCategory, sortField, sortDir])

  // Stage counts (use filteredDeals for filter-awareness)
  const stageCounts = useMemo(() => {
    const all = filteredDeals
    const prospects = all.filter(d => d.stage === 'Prospect')
    const notContacted = prospects.filter(d => !d.last_contacted)
    const hasMeeting = prospects.filter(d => dealIdsWithMeeting.has(d.id))
    const proposalSent = all.filter(d => d.stage === 'Proposal Sent')
    const contractSent = all.filter(d => d.stage === 'Negotiation' || dealIdsWithContractInReview.has(d.id))
    const underContract = all.filter(d => d.stage === 'Contracted' || d.stage === 'In Fulfillment')
    const declined = all.filter(d => d.stage === 'Declined')
    return { prospects, notContacted, hasMeeting, proposalSent, contractSent, underContract, declined }
  }, [filteredDeals, dealIdsWithMeeting, dealIdsWithContractInReview])

  // KPI calcs
  const activeDeals = filteredDeals.filter(d => d.stage !== 'Declined')
  const wonDeals = filteredDeals.filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage))
  const declinedDeals = filteredDeals.filter(d => d.stage === 'Declined')
  const totalPipeline = activeDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
  const weightedPipeline = activeDeals.reduce((s, d) => s + (Number(d.value) || 0) * ((d.win_probability || STAGE_PROBABILITY[d.stage] || 0) / 100), 0)
  const contractedValue = wonDeals.reduce((s, d) => s + (Number(d.value) || 0), 0)
  const winRate = filteredDeals.length ? Math.round((wonDeals.length / filteredDeals.length) * 100) : 0
  const avgDealSize = activeDeals.length ? totalPipeline / activeDeals.length : 0

  // Win rate breakdown
  const prospectsToContracted = stageCounts.prospects.length
    ? Math.round((stageCounts.underContract.length / (stageCounts.prospects.length + stageCounts.underContract.length)) * 100) : 0
  const meetingsToContracted = stageCounts.hasMeeting.length
    ? Math.round((stageCounts.underContract.length / (stageCounts.hasMeeting.length + stageCounts.underContract.length)) * 100) : 0

  // Revenue by year
  const revenueByYear = useMemo(() => {
    const years = [currentYear, currentYear + 1, currentYear + 2]
    return years.map(year => {
      const dealsInYear = activeDeals.filter(d => {
        const sd = d.start_date ? new Date(d.start_date).getFullYear() : null
        return sd === year
      })
      return {
        year,
        revenue: dealsInYear.reduce((s, d) => s + (Number(d.value) || 0), 0),
        count: dealsInYear.length,
      }
    })
  }, [activeDeals, currentYear])

  const expiringThisYear = useMemo(() => {
    return activeDeals.filter(d => {
      const ed = d.end_date ? new Date(d.end_date).getFullYear() : null
      return ed === currentYear
    })
  }, [activeDeals, currentYear])

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

  // Alerts
  const today = new Date().toISOString().split('T')[0]
  const overdueTasks = tasks?.filter(t => t.due_date && t.due_date < today) || []
  const todayTasks = tasks?.filter(t => t.due_date === today) || []

  const staleDeals = activeDeals.filter(d => {
    if (['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)) return false
    const lastDate = d.last_contacted || d.date_added || d.created_at
    if (!lastDate) return true
    const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
    return days > 14
  })

  // --- Settings Handlers ---

  const toggleHidden = useCallback((id) => {
    setSettings(s => ({
      ...s,
      hidden: s.hidden.includes(id) ? s.hidden.filter(x => x !== id) : [...s.hidden, id],
    }))
  }, [])

  const moveCard = useCallback((id, dir) => {
    setSettings(s => {
      const order = [...s.order]
      const idx = order.indexOf(id)
      if (idx < 0) return s
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= order.length) return s
      ;[order[idx], order[newIdx]] = [order[newIdx], order[idx]]
      return { ...s, order }
    })
  }, [])

  const isVisible = (id) => !settings.hidden.includes(id)

  // --- Card Renderers ---

  const cardRenderers = {
    'alerts': () => (overdueTasks.length > 0 || staleDeals.length > 0 || todayTasks.length > 0) ? (
      <div key="alerts" className="flex gap-2 sm:gap-3 flex-wrap">
        {overdueTasks.length > 0 && (
          <button onClick={() => navigate('/app/crm/tasks')} className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-danger/20 transition-colors">
            <span className="font-mono font-bold">{overdueTasks.length}</span> overdue task{overdueTasks.length > 1 ? 's' : ''}
          </button>
        )}
        {staleDeals.length > 0 && (
          <button onClick={() => navigate('/app/crm/pipeline')} className="flex items-center gap-2 bg-warning/10 border border-warning/30 text-warning rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-warning/20 transition-colors">
            <span className="font-mono font-bold">{staleDeals.length}</span> stale deal{staleDeals.length > 1 ? 's' : ''} need attention
          </button>
        )}
        {todayTasks.length > 0 && (
          <button onClick={() => navigate('/app/crm/tasks')} className="flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent/20 transition-colors">
            <span className="font-mono font-bold">{todayTasks.length}</span> task{todayTasks.length > 1 ? 's' : ''} due today
          </button>
        )}
      </div>
    ) : null,

    'stage-counts': () => (
      <div key="stage-counts">
        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Prospect / Deal Stages</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
          <StageCard label="Total Prospects" count={stageCounts.prospects.length} color="text-accent" />
          <StageCard label="Not Contacted" count={stageCounts.notContacted.length} color="text-warning" />
          <StageCard label="Has Meeting" count={stageCounts.hasMeeting.length} color="text-text-primary" />
          <StageCard label="Proposal Sent" count={stageCounts.proposalSent.length} color="text-accent" />
          <StageCard label="Contract Sent" count={stageCounts.contractSent.length} color="text-text-primary" />
          <StageCard label="Under Contract" count={stageCounts.underContract.length} color="text-success" />
          <StageCard label="Declined" count={stageCounts.declined.length} color="text-danger" />
        </div>
      </div>
    ),

    'kpis': () => (
      <div key="kpis">
        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Key Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          <KPICard label="Total Pipeline" value={fmtMoney(totalPipeline)} sub={`${activeDeals.length} deals`} />
          <KPICard label="Weighted Pipeline" value={fmtMoney(weightedPipeline)} sub="probability-adjusted" accent />
          <KPICard label="Contracted" value={fmtMoney(contractedValue)} sub={`${wonDeals.length} won`} />
          <KPICard label="Win Rate" value={`${winRate}%`} sub={`${declinedDeals.length} lost`} />
          <KPICard label="Avg Deal" value={fmtMoney(avgDealSize)} sub="per deal" />
          <KPICard label="Active Tasks" value={tasks?.length || 0} sub={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'on track'} warn={overdueTasks.length > 0} />
        </div>
      </div>
    ),

    'win-rate': () => (
      <div key="win-rate">
        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Win Rate Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Prospects to Contracted</div>
            <div className="text-2xl sm:text-3xl font-semibold font-mono text-accent mt-1">{prospectsToContracted}%</div>
            <div className="text-[10px] text-text-secondary mt-1">
              {stageCounts.underContract.length} contracted / {stageCounts.prospects.length + stageCounts.underContract.length} total prospects
            </div>
            <div className="w-full bg-bg-card rounded-full h-1.5 mt-2">
              <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${Math.min(prospectsToContracted, 100)}%` }} />
            </div>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Meetings to Contracted</div>
            <div className="text-2xl sm:text-3xl font-semibold font-mono text-success mt-1">{meetingsToContracted}%</div>
            <div className="text-[10px] text-text-secondary mt-1">
              {stageCounts.underContract.length} contracted / {stageCounts.hasMeeting.length + stageCounts.underContract.length} with meetings
            </div>
            <div className="w-full bg-bg-card rounded-full h-1.5 mt-2">
              <div className="bg-success h-1.5 rounded-full transition-all" style={{ width: `${Math.min(meetingsToContracted, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>
    ),

    'revenue-by-year': () => (
      <div key="revenue-by-year">
        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Revenue by Year</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {revenueByYear.map(ry => (
            <div key={ry.year} className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono">{ry.year}</div>
              <div className="text-xl sm:text-2xl font-semibold font-mono text-text-primary mt-1">{fmtMoney(ry.revenue)}</div>
              <div className="text-[10px] text-text-secondary mt-0.5">{ry.count} deal{ry.count !== 1 ? 's' : ''}</div>
            </div>
          ))}
          <div className="bg-bg-surface border border-warning/30 rounded-lg p-4 sm:p-5">
            <div className="text-[10px] text-warning uppercase tracking-wider font-mono">Expiring {currentYear}</div>
            <div className="text-xl sm:text-2xl font-semibold font-mono text-warning mt-1">{expiringThisYear.length}</div>
            <div className="text-[10px] text-text-secondary mt-0.5">
              {fmtMoney(expiringThisYear.reduce((s, d) => s + (Number(d.value) || 0), 0))} total value
            </div>
          </div>
        </div>
      </div>
    ),

    'pipeline-charts': () => flags.crm && pipelineData.length > 0 ? (
      <div key="pipeline-charts">
        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Pipeline Charts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <h4 className="text-sm font-medium text-text-primary mb-4">Pipeline by Stage</h4>
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
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
            <h4 className="text-sm font-medium text-text-primary mb-4">Conversion Funnel</h4>
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
          <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 md:col-span-2 lg:col-span-1">
            <h4 className="text-sm font-medium text-text-primary mb-4">Deals by Stage</h4>
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
      </div>
    ) : null,

    'activity-tasks': () => (
      <div key="activity-tasks">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Activity */}
          {flags.crm && (
            <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary">Recent Activity</h3>
                <button onClick={() => navigate('/app/crm/activities')} className="text-xs text-accent hover:underline">View all</button>
              </div>
              {activities?.length ? (
                <div className="space-y-2">
                  {activities.slice(0, 8).map((a) => (
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

          {/* Scheduled Activities */}
          {flags.crm && (
            <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary">Scheduled Activities</h3>
                <button onClick={() => navigate('/app/crm/tasks')} className="text-xs text-accent hover:underline">View all</button>
              </div>
              {tasks?.length ? (
                <div className="space-y-2">
                  {tasks.slice(0, 8).map((t) => {
                    const isOverdue = t.due_date && t.due_date < today
                    const isToday = t.due_date === today
                    return (
                      <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-text-primary truncate">{t.title}</div>
                          <div className="text-[10px] text-text-muted">{t.due_date || 'No date'}</div>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          isOverdue ? 'bg-danger/10 text-danger' : isToday ? 'bg-warning/10 text-warning' : t.priority === 'High' ? 'text-danger' : 'text-text-muted'
                        }`}>
                          {isOverdue ? 'OVERDUE' : isToday ? 'TODAY' : t.priority}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted py-4 text-center">No scheduled activities</p>
              )}
            </div>
          )}

          {/* Upcoming Events */}
          {flags.sportify && (
            <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
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
    ),
  }

  // Ordered visible cards
  const visibleCards = settings.order.filter(id => isVisible(id))

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">
            Welcome back, {profile?.full_name || 'there'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter by category */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs bg-bg-surface border border-border rounded-lg px-2 py-1.5 text-text-secondary focus:outline-none focus:border-accent"
          >
            <option value="">All Categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Sort */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="text-xs bg-bg-surface border border-border rounded-lg px-2 py-1.5 text-text-secondary focus:outline-none focus:border-accent"
          >
            <option value="value">Sort: Value</option>
            <option value="date">Sort: Date</option>
            <option value="name">Sort: Name</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="text-xs bg-bg-surface border border-border rounded-lg px-2 py-1.5 text-text-secondary hover:text-text-primary transition-colors"
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '\u2191' : '\u2193'}
          </button>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="text-xs bg-bg-surface border border-border rounded-lg px-3 py-1.5 text-text-secondary hover:text-text-primary transition-colors"
          >
            {showSettings ? 'Done' : 'Customize'}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
          <h3 className="text-sm font-medium text-text-primary mb-3">Customize Dashboard</h3>
          <p className="text-xs text-text-muted mb-4">Reorder or hide dashboard sections. Changes are saved automatically.</p>
          <div className="space-y-1">
            {settings.order.map((id, idx) => {
              const card = ALL_CARDS.find(c => c.id === id)
              if (!card) return null
              const hidden = settings.hidden.includes(id)
              return (
                <div key={id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-bg-card transition-colors">
                  <button onClick={() => moveCard(id, -1)} disabled={idx === 0} className="text-xs text-text-muted hover:text-text-primary disabled:opacity-30 font-mono">{'\u2191'}</button>
                  <button onClick={() => moveCard(id, 1)} disabled={idx === settings.order.length - 1} className="text-xs text-text-muted hover:text-text-primary disabled:opacity-30 font-mono">{'\u2193'}</button>
                  <button onClick={() => toggleHidden(id)} className={`text-xs font-mono px-1.5 py-0.5 rounded ${hidden ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                    {hidden ? 'OFF' : 'ON'}
                  </button>
                  <span className={`text-xs ${hidden ? 'text-text-muted line-through' : 'text-text-primary'}`}>{card.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Render cards in user-configured order */}
      {visibleCards.map(id => {
        const renderer = cardRenderers[id]
        if (!renderer) return null
        const content = renderer()
        return content
      })}
    </div>
  )
}

// --- Sub-components ---

function StageCard({ label, count, color }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-3 sm:p-4">
      <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono leading-tight">{label}</div>
      <div className={`text-xl sm:text-2xl font-semibold font-mono mt-1 ${color}`}>{count}</div>
    </div>
  )
}

function KPICard({ label, value, sub, accent, warn }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-3 sm:p-4">
      <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono">{label}</div>
      <div className={`text-lg sm:text-xl font-semibold font-mono mt-1 ${accent ? 'text-accent' : warn ? 'text-warning' : 'text-text-primary'}`}>{value}</div>
      <div className="text-[10px] text-text-secondary mt-0.5">{sub}</div>
    </div>
  )
}

// --- Helpers ---

function fmtMoney(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${Math.round(val)}`
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
