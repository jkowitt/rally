import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Card, EmptyState, Badge } from '@/components/ui'
import { Activity, Trophy, DollarSign, Gauge } from 'lucide-react'

// SalesVelocity — read-only dashboard backed by the views from
// migrations 076: avg time per stage, win rate (90d), open
// pipeline value, and a user-entered quota for coverage ratio.
// Quota is stored locally because it's a manager-set number that
// doesn't need a DB column for v1.
export default function SalesVelocity() {
  const { profile } = useAuth()
  const [quota, setQuota] = useState(() => {
    try { return Number(localStorage.getItem('ll.quota') || 0) } catch { return 0 }
  })

  const { data: stages = [] } = useQuery({
    queryKey: ['sales-velocity-stages', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_velocity_per_stage')
        .select('*')
        .eq('property_id', profile.property_id)
      return data || []
    },
  })

  const { data: winRate } = useQuery({
    queryKey: ['sales-win-rate', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_win_rate_90d')
        .select('*')
        .eq('property_id', profile.property_id)
        .maybeSingle()
      return data
    },
  })

  const { data: pipeline } = useQuery({
    queryKey: ['sales-open-pipeline', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_open_pipeline_value')
        .select('*')
        .eq('property_id', profile.property_id)
        .maybeSingle()
      return data
    },
  })

  const coverageRatio = quota > 0 && pipeline?.open_pipeline_value
    ? (Number(pipeline.open_pipeline_value) / quota).toFixed(2)
    : null

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'CRM & Prospecting', to: '/app' }, { label: 'Sales Velocity' }]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Gauge className="w-6 h-6 text-accent" />
          Sales Velocity
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Stage time, win rate, pipeline coverage — the metrics that predict next quarter.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Win rate (90d)" value={winRate ? `${winRate.win_rate_pct}%` : '—'} icon={Trophy}
             sub={winRate ? `${winRate.wins} won · ${winRate.losses} lost` : null} />
        <Kpi label="Open deals" value={pipeline?.open_deal_count || 0} icon={Activity} />
        <Kpi label="Open pipeline value" value={pipeline?.open_pipeline_value
              ? '$' + Number(pipeline.open_pipeline_value).toLocaleString() : '—'} icon={DollarSign} />
        <Kpi label="Coverage ratio" value={coverageRatio ? `${coverageRatio}×` : 'set quota →'} icon={Gauge}
             tone={coverageRatio ? (Number(coverageRatio) >= 3 ? 'success' : Number(coverageRatio) >= 2 ? 'accent' : 'warning') : 'neutral'} />
      </div>

      <Card padding="md">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-text-primary">Quarterly quota</h2>
          <span className="text-[10px] text-text-muted font-mono">3× pipeline coverage is the standard target</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={quota || ''}
            min={0}
            onChange={(e) => {
              const v = Number(e.target.value) || 0
              setQuota(v)
              try { localStorage.setItem('ll.quota', String(v)) } catch { /* ignore */ }
            }}
            placeholder="Quota in dollars"
            className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent flex-1"
          />
          {quota > 0 && pipeline?.open_pipeline_value != null && (
            <span className="text-xs text-text-muted">
              ${Number(pipeline.open_pipeline_value).toLocaleString()} pipeline / ${Number(quota).toLocaleString()} quota
            </span>
          )}
        </div>
      </Card>

      <Card padding="md">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Average days in each stage</h2>
        {stages.length === 0 ? (
          <EmptyState title="No open deals" description="Stage timing lights up once deals are in the pipeline." className="py-4" />
        ) : (
          <ul className="space-y-2">
            {stages.map(s => {
              const days = Math.round(Number(s.avg_days_in_stage || 0))
              const stuck = days > 30
              return (
                <li key={s.stage} className="flex items-center justify-between bg-bg-card border border-border rounded px-3 py-2">
                  <div>
                    <span className="text-sm text-text-primary font-medium">{s.stage}</span>
                    <span className="text-xs text-text-muted font-mono ml-2">{s.deals_in_stage} open</span>
                  </div>
                  <Badge tone={stuck ? 'warning' : days > 14 ? 'accent' : 'neutral'}>
                    {days} day{days === 1 ? '' : 's'} avg
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Kpi({ label, value, icon: Icon, sub, tone }) {
  return (
    <Card padding="md" className="space-y-1">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-text-primary tabular-nums">{value}</span>
        {sub && <span className="text-xs text-text-muted pb-1">{sub}</span>}
      </div>
    </Card>
  )
}
