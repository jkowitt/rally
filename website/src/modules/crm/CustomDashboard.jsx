import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function CustomDashboard() {
  const { slug } = useParams()
  const { profile } = useAuth()
  const propertyId = profile?.property_id

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['custom-dashboard', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_dashboards')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single()
      if (error) throw error
      // Verify this dashboard belongs to the user's property
      if (data.property_id !== propertyId) throw new Error('Access denied')
      return data
    },
    enabled: !!slug && !!propertyId,
  })

  // Fetch data based on dashboard config
  const { data: dealData } = useQuery({
    queryKey: ['custom-dashboard-deals', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('*').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(500)
      return data || []
    },
    enabled: !!propertyId && !!dashboard,
  })

  const { data: contractData } = useQuery({
    queryKey: ['custom-dashboard-contracts', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('contracts').select('*, contract_benefits(*)').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(200)
      return data || []
    },
    enabled: !!propertyId && !!dashboard,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="text-center py-20">
        <div className="text-3xl mb-3">🔒</div>
        <p className="text-text-secondary text-sm">Dashboard not found or access denied</p>
      </div>
    )
  }

  const config = dashboard.config || {}
  const primaryColor = config.colors?.primary || '#E8B84B'
  const bgColor = config.colors?.background || '#080A0F'

  // Calculate stats from data
  const totalRevenue = (dealData || []).filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)).reduce((s, d) => s + (Number(d.value) || 0), 0)
  const activeDeals = (dealData || []).filter(d => !['Declined', 'Renewed'].includes(d.stage)).length
  const wonDeals = (dealData || []).filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage)).length
  const totalContracts = (contractData || []).length

  const stageData = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment'].map(stage => ({
    stage: stage.replace('Proposal Sent', 'Proposal').replace('In Fulfillment', 'Active'),
    count: (dealData || []).filter(d => d.stage === stage).length,
    value: (dealData || []).filter(d => d.stage === stage).reduce((s, d) => s + (Number(d.value) || 0), 0),
  })).filter(d => d.count > 0)

  return (
    <div className="space-y-6">
      {/* Custom Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.logo && (
            <img src={config.logo} alt={dashboard.name} className="h-10 object-contain" />
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">{dashboard.name}</h1>
            <p className="text-text-muted text-xs font-mono">Custom Dashboard</p>
          </div>
        </div>
        <div className="text-xs text-text-muted font-mono">
          Updated {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border rounded-lg p-4" style={{ borderColor: primaryColor + '30', background: primaryColor + '08' }}>
          <div className="text-[10px] text-text-muted font-mono uppercase">Total Revenue</div>
          <div className="text-xl font-semibold font-mono" style={{ color: primaryColor }}>${(totalRevenue / 1000).toFixed(0)}K</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <div className="text-[10px] text-text-muted font-mono uppercase">Active Deals</div>
          <div className="text-xl font-semibold text-text-primary font-mono">{activeDeals}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <div className="text-[10px] text-text-muted font-mono uppercase">Won</div>
          <div className="text-xl font-semibold text-success font-mono">{wonDeals}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <div className="text-[10px] text-text-muted font-mono uppercase">Contracts</div>
          <div className="text-xl font-semibold text-text-primary font-mono">{totalContracts}</div>
        </div>
      </div>

      {/* Pipeline Chart */}
      {stageData.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4">Pipeline Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#8B92A8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} />
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="value" fill={primaryColor} name="Value ($)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Deals */}
      <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-text-primary">Recent Activity</h3>
        </div>
        <div className="divide-y divide-border">
          {(dealData || []).slice(0, 10).map(d => (
            <div key={d.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-sm text-text-primary">{d.brand_name}</span>
                <span className="text-xs text-text-muted ml-2">{d.stage}</span>
              </div>
              <span className="text-xs text-accent font-mono">{d.value ? `$${Number(d.value).toLocaleString()}` : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-[10px] text-text-muted font-mono py-4">
        Powered by Loud Legacy &middot; Custom Dashboard for {dashboard.name}
      </div>
    </div>
  )
}
