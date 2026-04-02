import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { runDailyIntelligence } from '@/lib/claude'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function BusinessNow() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id

  const { data: logs, isLoading } = useQuery({
    queryKey: ['intelligence', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_intelligence_log')
        .select('*')
        .eq('property_id', propertyId)
        .order('run_date', { ascending: false })
        .limit(30)
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  const { data: metrics } = useQuery({
    queryKey: ['metrics', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('property_id', propertyId)
        .order('metric_date', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  const runBriefingMutation = useMutation({
    mutationFn: () => runDailyIntelligence(propertyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['intelligence', propertyId] }),
  })

  const latestLog = logs?.[0]
  const recommendations = latestLog?.recommendations || []

  // Metrics chart data
  const chartData = metrics
    ?.filter((m) => m.metric_name === metrics[0]?.metric_name)
    .slice(0, 14)
    .reverse()
    .map((m) => ({ date: m.metric_date, value: Number(m.metric_value || 0) })) || []

  const priorityColors = { high: 'text-danger', medium: 'text-warning', low: 'text-text-muted' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Business Now</h1>
          <p className="text-text-secondary text-sm mt-1">AI-powered intelligence briefings</p>
        </div>
        <button
          onClick={() => runBriefingMutation.mutate()}
          disabled={runBriefingMutation.isPending}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {runBriefingMutation.isPending ? 'Generating...' : 'Run Briefing'}
        </button>
      </div>

      {/* Latest Briefing */}
      {latestLog && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono text-text-muted uppercase">Daily Briefing</h2>
            <span className="text-xs font-mono text-text-muted">{latestLog.run_date}</span>
          </div>
          <p className="text-text-primary text-sm leading-relaxed">{latestLog.summary}</p>

          {recommendations.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-mono text-text-muted uppercase">Recommendations</h3>
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 bg-bg-card border border-border rounded p-3">
                  <span className={`text-xs font-mono uppercase font-bold ${priorityColors[rec.priority] || ''}`}>
                    {rec.priority}
                  </span>
                  <div className="flex-1">
                    <span className="text-sm text-text-primary">{rec.action}</span>
                    {rec.module && <span className="ml-2 text-xs text-text-muted font-mono">{rec.module}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {latestLog.data_snapshot && (
            <div className="flex gap-6 mt-4 text-xs text-text-muted font-mono">
              {Object.entries(latestLog.data_snapshot).map(([key, val]) => (
                <span key={key}>{key.replace(/_/g, ' ')}: {val}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metrics Chart */}
      {chartData.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4">
            {metrics?.[0]?.metric_name || 'Metrics'} Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8B92A8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} />
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke="#E8B84B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Past Briefings */}
      {logs?.length > 1 && (
        <div>
          <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Past Briefings</h2>
          <div className="space-y-2">
            {logs.slice(1, 10).map((log) => (
              <div key={log.id} className="bg-bg-surface border border-border rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-text-muted">{log.run_date}</span>
                  <span className="text-xs text-text-muted">{log.module}</span>
                </div>
                <p className="text-text-secondary text-sm mt-1 line-clamp-2">{log.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>}
      {!isLoading && (!logs || logs.length === 0) && (
        <div className="text-center text-text-muted text-sm py-12">
          No briefings yet. Click "Run Briefing" to generate your first AI intelligence report.
        </div>
      )}
    </div>
  )
}
