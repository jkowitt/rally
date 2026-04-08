import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function MultiPropertyView() {
  const { profile } = useAuth()
  const isDev = profile?.role === 'developer'

  const { data: properties } = useQuery({
    queryKey: ['multi-prop-properties'],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('id, name, type, city, state, plan')
      return data || []
    },
    enabled: isDev,
  })

  const { data: allDeals } = useQuery({
    queryKey: ['multi-prop-deals'],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, brand_name, value, stage, property_id, assigned_to, created_at')
      return data || []
    },
    enabled: isDev,
  })

  const { data: allContracts } = useQuery({
    queryKey: ['multi-prop-contracts'],
    queryFn: async () => {
      const { data } = await supabase.from('contracts').select('id, total_value, status, signed, property_id')
      return data || []
    },
    enabled: isDev,
  })

  const STAGES = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed']

  const propertyStats = (properties || []).map(p => {
    const deals = (allDeals || []).filter(d => d.property_id === p.id)
    const active = deals.filter(d => d.stage !== 'Declined')
    const won = deals.filter(d => ['Contracted', 'In Fulfillment', 'Renewed'].includes(d.stage))
    const pipeline = active.reduce((s, d) => s + (Number(d.value) || 0), 0)
    const contracted = won.reduce((s, d) => s + (Number(d.value) || 0), 0)
    const contracts = (allContracts || []).filter(c => c.property_id === p.id)
    const signedContracts = contracts.filter(c => c.signed).length
    const winRate = deals.length > 0 ? Math.round((won.length / deals.length) * 100) : 0
    return { ...p, deals: active.length, pipeline, contracted, contracts: contracts.length, signedContracts, winRate, stageBreakdown: STAGES.map(s => ({ stage: s, count: deals.filter(d => d.stage === s).length })) }
  }).sort((a, b) => b.pipeline - a.pipeline)

  const totalPipeline = propertyStats.reduce((s, p) => s + p.pipeline, 0)
  const totalContracted = propertyStats.reduce((s, p) => s + p.contracted, 0)
  const totalDeals = propertyStats.reduce((s, p) => s + p.deals, 0)

  function fmtMoney(v) { return v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${Math.round(v)}` }

  if (!isDev) return <div className="text-text-muted text-center py-20">Multi-Property View is available for agency accounts.</div>

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Multi-Property View</h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">Pipeline across all client properties</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Properties</div>
          <div className="text-2xl font-bold font-mono text-accent mt-1">{propertyStats.length}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Total Deals</div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">{totalDeals}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Total Pipeline</div>
          <div className="text-2xl font-bold font-mono text-accent mt-1">{fmtMoney(totalPipeline)}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Total Contracted</div>
          <div className="text-2xl font-bold font-mono text-success mt-1">{fmtMoney(totalContracted)}</div>
        </div>
      </div>

      <div className="space-y-3">
        {propertyStats.map(p => (
          <div key={p.id} className="bg-bg-surface border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-text-primary">{p.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{p.type}</span>
                  {p.city && <span className="text-[10px] text-text-muted">{p.city}, {p.state}</span>}
                </div>
                <div className="flex gap-4 mt-2 text-xs font-mono flex-wrap">
                  <span className="text-text-secondary">{p.deals} deals</span>
                  <span className="text-accent">{fmtMoney(p.pipeline)} pipeline</span>
                  <span className="text-success">{fmtMoney(p.contracted)} contracted</span>
                  <span className="text-text-muted">{p.winRate}% win rate</span>
                  <span className="text-text-muted">{p.signedContracts}/{p.contracts} contracts signed</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {p.stageBreakdown.filter(s => s.count > 0).map(s => (
                    <span key={s.stage} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{s.stage.replace('Proposal Sent','Proposal').replace('In Fulfillment','Fulfill')}: {s.count}</span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold font-mono text-accent">{fmtMoney(p.pipeline)}</div>
                <div className="text-[10px] text-text-muted">pipeline</div>
              </div>
            </div>
          </div>
        ))}
        {propertyStats.length === 0 && <div className="text-text-muted text-center py-12 bg-bg-surface border border-border rounded-lg">No properties found.</div>}
      </div>
    </div>
  )
}
