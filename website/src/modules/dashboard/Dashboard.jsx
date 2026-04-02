import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#E8B84B', '#52C48A', '#E0B352', '#E05252', '#8B92A8', '#9E7D2F']

export default function Dashboard() {
  const { profile } = useAuth()
  const { flags } = useFeatureFlags()
  const propertyId = profile?.property_id

  const { data: deals } = useQuery({
    queryKey: ['deals-summary', propertyId],
    queryFn: async () => {
      if (!propertyId) return []
      const { data } = await supabase.from('deals').select('stage, value').eq('property_id', propertyId)
      return data || []
    },
    enabled: !!propertyId && flags.crm,
  })

  const { data: events } = useQuery({
    queryKey: ['events-summary', propertyId],
    queryFn: async () => {
      if (!propertyId) return []
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('property_id', propertyId)
        .gte('event_date', new Date().toISOString())
        .order('event_date')
        .limit(5)
      return data || []
    },
    enabled: !!propertyId && flags.sportify,
  })

  // Pipeline summary by stage
  const pipelineData = deals
    ? Object.entries(
        deals.reduce((acc, d) => {
          acc[d.stage] = (acc[d.stage] || 0) + (Number(d.value) || 0)
          return acc
        }, {})
      ).map(([stage, value]) => ({ stage, value }))
    : []

  // Deal count by stage for pie chart
  const stageCount = deals
    ? Object.entries(
        deals.reduce((acc, d) => {
          acc[d.stage] = (acc[d.stage] || 0) + 1
          return acc
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : []

  const totalPipeline = deals?.reduce((sum, d) => sum + (Number(d.value) || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          Welcome back, {profile?.full_name || 'there'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Pipeline" value={`$${(totalPipeline / 1000).toFixed(0)}K`} sub={`${deals?.length || 0} deals`} />
        <KPICard label="Contracted" value={`$${((deals?.filter(d => d.stage === 'Contracted').reduce((s, d) => s + (Number(d.value) || 0), 0)) / 1000).toFixed(0)}K`} sub="signed" />
        <KPICard label="Upcoming Events" value={events?.length || 0} sub="next 30 days" />
        <KPICard
          label="Active Modules"
          value={Object.values(flags).filter(Boolean).length}
          sub="of 4"
        />
      </div>

      {/* Charts */}
      {flags.crm && pipelineData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-text-primary mb-4">Pipeline by Stage</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#8B92A8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} />
                <Tooltip
                  contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: '#F0F2F8' }}
                />
                <Bar dataKey="value" fill="#E8B84B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-medium text-text-primary mb-4">Deals by Stage</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stageCount} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 10, fill: '#8B92A8' }}>
                  {stageCount.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {flags.sportify && events?.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-primary mb-3">Upcoming Events</h3>
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="text-sm text-text-primary">{event.name}</span>
                  <span className="ml-2 text-xs text-text-muted font-mono">{event.event_type}</span>
                </div>
                <span className="text-xs text-text-secondary font-mono">
                  {new Date(event.event_date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KPICard({ label, value, sub }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4">
      <div className="text-xs text-text-muted uppercase tracking-wider font-mono">{label}</div>
      <div className="text-2xl font-semibold text-text-primary font-mono mt-1">{value}</div>
      <div className="text-xs text-text-secondary mt-0.5">{sub}</div>
    </div>
  )
}
