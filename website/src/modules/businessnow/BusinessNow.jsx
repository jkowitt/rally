import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { isAIFeatureEnabled } from '@/lib/featureCheck'
import { runDailyIntelligence } from '@/lib/claude'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function BusinessNow() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dismissed_alerts') || '[]')) } catch { return new Set() }
  })

  // Daily intelligence logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['intelligence', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_intelligence_log')
        .select('*')
        .eq('property_id', propertyId)
        .order('run_date', { ascending: false })
        .limit(30)
      if (error) return []
      return data || []
    },
    enabled: !!propertyId,
  })

  // Business metrics
  const { data: metrics } = useQuery({
    queryKey: ['metrics', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('property_id', propertyId)
        .order('metric_date', { ascending: false })
        .limit(90)
      if (error) return []
      return data || []
    },
    enabled: !!propertyId,
  })

  // Real-time pipeline data for "live" business now metrics
  const { data: pipelineData } = useQuery({
    queryKey: ['businessnow-pipeline', propertyId],
    queryFn: async () => {
      const [deals, contracts, activities, tasks] = await Promise.all([
        supabase.from('deals').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(500),
        supabase.from('contracts').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(500),
        supabase.from('activities').select('*').eq('property_id', propertyId).order('occurred_at', { ascending: false }).limit(100),
        supabase.from('tasks').select('*').eq('property_id', propertyId).neq('status', 'Done').limit(500),
      ])
      return {
        deals: deals.data || [],
        contracts: contracts.data || [],
        activities: activities.data || [],
        tasks: tasks.data || [],
      }
    },
    enabled: !!propertyId,
  })

  const runBriefingMutation = useMutation({
    mutationFn: () => {
      if (!isAIFeatureEnabled('ai_daily_briefing')) throw new Error('Daily intelligence is currently disabled by the developer.')
      return runDailyIntelligence(propertyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intelligence', propertyId] })
      toast({ title: 'Daily briefing generated', type: 'success' })
    },
    onError: (e) => {
      const msg = e?.message || ''
      const description = (msg.includes('FunctionsFetchError') || msg.includes('Failed to fetch') || msg.includes('404'))
        ? 'AI edge functions are not deployed yet. Deploy them in Supabase Dashboard.'
        : (msg.includes('API key') ? 'AI provider not configured. Contact your admin.' : msg || 'Please try again.')
      toast({ title: 'Briefing failed', description, type: 'error' })
    },
  })

  function dismissAlert(id) {
    const next = new Set([...dismissedAlerts, id])
    setDismissedAlerts(next)
    localStorage.setItem('dismissed_alerts', JSON.stringify([...next]))
  }

  const latestLog = logs?.[0]
  const recommendations = latestLog?.recommendations || []
  const insights = latestLog?.insights || {}

  // Generate live alerts from pipeline data
  const liveAlerts = []
  if (pipelineData) {
    const now = new Date()
    const weekAgo = new Date(now - 7 * 86400000)
    const monthAgo = new Date(now - 30 * 86400000)

    // Stale deals
    const staleDeals = pipelineData.deals.filter(d =>
      !['Contracted', 'In Fulfillment', 'Renewed', 'Declined'].includes(d.stage) &&
      (!d.last_contacted || new Date(d.last_contacted) < weekAgo)
    )
    if (staleDeals.length > 0) {
      liveAlerts.push({
        id: 'stale-deals',
        severity: 'warning',
        title: `${staleDeals.length} deals have no activity in 7+ days`,
        action: 'Review stale deals',
        href: '/app/crm/pipeline',
      })
    }

    // High-value deals in negotiation
    const hotDeals = pipelineData.deals.filter(d =>
      ['Proposal Sent', 'Negotiation'].includes(d.stage) && Number(d.value || 0) >= 25000
    )
    if (hotDeals.length > 0) {
      liveAlerts.push({
        id: 'hot-deals',
        severity: 'info',
        title: `${hotDeals.length} high-value deals ($25K+) in active negotiation`,
        action: 'View pipeline',
        href: '/app/crm/pipeline',
      })
    }

    // Overdue tasks
    const todayStr = now.toISOString().split('T')[0]
    const overdueTasks = pipelineData.tasks.filter(t => t.due_date && t.due_date < todayStr)
    if (overdueTasks.length > 0) {
      liveAlerts.push({
        id: 'overdue-tasks',
        severity: 'danger',
        title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
        action: 'Complete tasks',
        href: '/app/crm/tasks',
      })
    }

    // Contracts expiring soon (within 60 days)
    const in60Days = new Date(now.getTime() + 60 * 86400000)
    const expiringContracts = pipelineData.contracts.filter(c =>
      c.expiration_date && new Date(c.expiration_date) >= now && new Date(c.expiration_date) <= in60Days
    )
    if (expiringContracts.length > 0) {
      liveAlerts.push({
        id: 'expiring-contracts',
        severity: 'warning',
        title: `${expiringContracts.length} contract${expiringContracts.length > 1 ? 's' : ''} expiring in next 60 days`,
        action: 'Start renewals',
        href: '/app/crm/contracts',
      })
    }

    // Low activity week
    const thisWeekActivities = pipelineData.activities.filter(a => new Date(a.occurred_at) >= weekAgo)
    if (thisWeekActivities.length < 5 && pipelineData.activities.length > 10) {
      liveAlerts.push({
        id: 'low-activity',
        severity: 'warning',
        title: `Only ${thisWeekActivities.length} activities this week — pipeline momentum slowing`,
        action: 'Log activities',
        href: '/app/crm/activities',
      })
    }

    // Pipeline distribution
    const activeCount = pipelineData.deals.filter(d => !['Declined', 'Renewed'].includes(d.stage)).length
    if (activeCount < 10 && pipelineData.deals.length > 0) {
      liveAlerts.push({
        id: 'thin-pipeline',
        severity: 'warning',
        title: `Only ${activeCount} active deals — consider adding more prospects`,
        action: 'Find prospects',
        href: '/app/crm/pipeline',
      })
    }
  }

  const visibleAlerts = liveAlerts.filter(a => !dismissedAlerts.has(a.id))

  // Revenue trend from metrics
  const revenueChart = (metrics || [])
    .slice(0, 30)
    .reverse()
    .map(m => ({
      date: m.metric_date ? new Date(m.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      pipeline: Number(m.total_pipeline_value || 0),
      signed: Number(m.total_signed_value || 0),
    }))

  const severityColors = {
    danger: 'bg-danger/10 border-danger/30 text-danger',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    info: 'bg-accent/10 border-accent/30 text-accent',
    success: 'bg-success/10 border-success/30 text-success',
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Business Now</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Real-time intelligence &middot; {visibleAlerts.length} active alert{visibleAlerts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => runBriefingMutation.mutate()}
          disabled={runBriefingMutation.isPending}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {runBriefingMutation.isPending ? 'Generating...' : 'Run AI Briefing'}
        </button>
      </div>

      {/* Live Alerts */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-text-muted font-mono uppercase tracking-wider">Live Alerts</div>
          {visibleAlerts.map(alert => (
            <div
              key={alert.id}
              className={`flex items-center justify-between gap-2 rounded-lg border p-3 ${severityColors[alert.severity]}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{alert.title}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={alert.href} className="text-xs underline hover:no-underline whitespace-nowrap">
                  {alert.action} &rarr;
                </a>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-xs opacity-60 hover:opacity-100 px-1"
                  title="Dismiss"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats Grid */}
      {pipelineData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            label="Active Pipeline"
            value={`$${(pipelineData.deals.filter(d => !['Declined', 'Renewed'].includes(d.stage)).reduce((s, d) => s + Number(d.value || 0), 0) / 1000).toFixed(0)}K`}
            sub={`${pipelineData.deals.filter(d => !['Declined', 'Renewed'].includes(d.stage)).length} deals`}
            color="text-accent"
          />
          <StatCard
            label="Won This Year"
            value={`$${(pipelineData.deals.filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)).reduce((s, d) => s + Number(d.value || 0), 0) / 1000).toFixed(0)}K`}
            sub={`${pipelineData.deals.filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)).length} won`}
            color="text-success"
          />
          <StatCard
            label="Tasks Due"
            value={pipelineData.tasks.length}
            sub="Open tasks"
            color="text-warning"
          />
          <StatCard
            label="Activities (7d)"
            value={pipelineData.activities.filter(a => new Date(a.occurred_at) > new Date(Date.now() - 7 * 86400000)).length}
            sub="Logged this week"
            color="text-text-primary"
          />
        </div>
      )}

      {/* Pipeline Trend Chart */}
      {revenueChart.length > 1 && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
          <h3 className="text-sm font-medium text-text-primary mb-3">Pipeline Trend (30 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8B84B" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#E8B84B" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSigned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#52C48A" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#52C48A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8B92A8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} />
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
              <Area type="monotone" dataKey="pipeline" stroke="#E8B84B" fill="url(#colorPipeline)" name="Pipeline" />
              <Area type="monotone" dataKey="signed" stroke="#52C48A" fill="url(#colorSigned)" name="Signed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-primary">AI Recommendations</h3>
            <span className="text-[10px] text-text-muted font-mono">
              Updated {latestLog?.run_date ? new Date(latestLog.run_date).toLocaleDateString() : 'never'}
            </span>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-accent text-xs mt-0.5">→</span>
                <span className="text-text-secondary">{typeof rec === 'string' ? rec : rec.text || rec.recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights Summary */}
      {insights && Object.keys(insights).length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
          <h3 className="text-sm font-medium text-text-primary mb-3">Latest Insights</h3>
          <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">{JSON.stringify(insights, null, 2)}</pre>
        </div>
      )}

      {/* Briefing History */}
      {logs?.length > 1 && (
        <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-text-primary">Briefing History</h3>
          </div>
          <div className="divide-y divide-border">
            {logs.slice(1, 8).map(log => (
              <div key={log.id} className="px-4 py-3 text-xs flex items-center justify-between">
                <span className="text-text-muted font-mono">{new Date(log.run_date).toLocaleDateString()}</span>
                <span className="text-text-secondary truncate max-w-[60%]">{log.summary || 'Briefing complete'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!logs || logs.length === 0) && (
        <div className="bg-bg-surface border border-border rounded-lg p-8 sm:p-12 text-center">
          <div className="text-3xl mb-3">📊</div>
          <p className="text-text-secondary text-sm mb-1">No briefings yet</p>
          <p className="text-text-muted text-xs mb-4">AI will analyze your pipeline and generate daily insights</p>
          <button
            onClick={() => runBriefingMutation.mutate()}
            disabled={runBriefingMutation.isPending}
            className="bg-accent text-bg-primary px-5 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {runBriefingMutation.isPending ? 'Generating...' : 'Generate First Briefing'}
          </button>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] text-text-muted font-mono uppercase truncate">{label}</div>
      <div className={`text-lg sm:text-xl font-semibold font-mono ${color} mt-0.5`}>{value}</div>
      <div className="text-[10px] text-text-muted font-mono truncate">{sub}</div>
    </div>
  )
}
