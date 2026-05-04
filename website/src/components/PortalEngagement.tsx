import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, EmptyState } from '@/components/ui'
import { LineChart, Eye, Clock } from 'lucide-react'

const SECTION_LABELS = ['Overview', 'Contracts', 'Fulfillment', 'Assets', 'Contacts']

interface Props {
  dealId: string
}

// PortalEngagement — read-only heatmap showing how much time the
// recipient spent on each section of the sponsor portal. Driven
// entirely by proposal_view_events (075). Surfaces sessions count,
// total time, last viewed, and per-section dwell.
export default function PortalEngagement({ dealId }: Props) {
  const { data: events = [] } = useQuery({
    queryKey: ['portal-events', dealId],
    enabled: !!dealId,
    queryFn: async () => {
      const { data } = await supabase
        .from('proposal_view_events')
        .select('event_type, page_index, page_label, duration_ms, occurred_at')
        .eq('deal_id', dealId)
        .order('occurred_at', { ascending: false })
        .limit(500)
      return data || []
    },
  })

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Eye className="w-7 h-7 text-text-muted" />}
        title="No portal views yet"
        description="When the sponsor opens their portal link, time-on-section data lands here."
        className="py-6"
      />
    )
  }

  const sessions = events.filter((e: any) => e.event_type === 'session_start').length
  const lastView = events.filter((e: any) => e.event_type === 'page_view')[0]?.occurred_at
  const heatmap: Record<number, number> = {}
  for (const e of events) {
    if (e.event_type !== 'page_view' || e.page_index == null) continue
    heatmap[e.page_index] = (heatmap[e.page_index] || 0) + (e.duration_ms || 0)
  }
  const maxMs = Math.max(...Object.values(heatmap), 1)

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center gap-2">
        <LineChart className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Portal engagement</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KPI label="Sessions" value={sessions} />
        <KPI
          label="Total time"
          value={formatMs(Object.values(heatmap).reduce((a, b) => a + b, 0))}
        />
        <KPI
          label="Last viewed"
          value={lastView ? new Date(lastView).toLocaleDateString() : '—'}
          icon={Clock}
        />
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider font-mono text-text-muted">Time per section</div>
        {SECTION_LABELS.map((label, i) => {
          const ms = heatmap[i] || 0
          const pct = (ms / maxMs) * 100
          return (
            <div key={i} className="space-y-0.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-text-secondary">{label}</span>
                <span className="text-text-muted font-mono">{formatMs(ms)}</span>
              </div>
              <div className="h-1.5 bg-bg-card rounded">
                <div className="h-1.5 bg-accent rounded" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function KPI({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) {
  return (
    <div className="bg-bg-card border border-border rounded p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-text-muted">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-base font-semibold text-text-primary mt-0.5">{value}</div>
    </div>
  )
}

function formatMs(ms: number): string {
  if (ms < 1000) return '0s'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}
