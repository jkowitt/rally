import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui'
import { Activity, AlertTriangle, CheckCircle, Heart } from 'lucide-react'

interface Props {
  accountId: string
  // Pass already-fetched health row to avoid an extra query (e.g.
  // when iterating a list that bulk-loaded health_score rows).
  health?: HealthRow | null
  size?: 'sm' | 'md'
  showScore?: boolean
}

interface HealthRow {
  health_score: number
  health_band: 'Healthy' | 'Watch' | 'At Risk'
  fulfillment_pct: number
  days_since_outbound: number
  days_since_inbound: number
  out_90d: number
  in_90d: number
  response_pct_90d: number
  has_champion: boolean
  days_to_renewal: number | null
}

const BAND_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  Healthy: 'success',
  Watch:   'warning',
  'At Risk': 'danger',
}

const BAND_ICON: Record<string, any> = {
  Healthy: CheckCircle,
  Watch:   Activity,
  'At Risk': AlertTriangle,
}

// AccountHealthBadge — composite KPI per account read from
// account_health_score view. Doubles as a tooltip with the
// underlying signal breakdown so the rep can see *why* the score
// is what it is.
export default function AccountHealthBadge({ accountId, health, size = 'md', showScore = true }: Props) {
  const { data: row } = useQuery({
    queryKey: ['account-health', accountId],
    enabled: !!accountId && !health,
    queryFn: async (): Promise<HealthRow | null> => {
      const { data } = await supabase
        .from('account_health_score')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle()
      return (data as HealthRow) || null
    },
  })
  const r = health ?? row
  if (!r) return null

  const Icon = BAND_ICON[r.health_band] || Heart
  const title =
    `Fulfillment: ${r.fulfillment_pct}% · ` +
    `Outbound: ${r.days_since_outbound === 999 ? 'never' : r.days_since_outbound + 'd ago'} · ` +
    `Replies (90d): ${r.in_90d}/${r.out_90d || 0} · ` +
    `Champion: ${r.has_champion ? 'yes' : 'no'} · ` +
    `Renewal in: ${r.days_to_renewal == null ? 'n/a' : r.days_to_renewal + 'd'}`

  return (
    <span title={title} className="inline-flex items-center gap-1">
      <Badge tone={BAND_TONE[r.health_band] || 'neutral'}>
        <Icon className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} inline mr-0.5`} />
        {r.health_band}
      </Badge>
      {showScore && (
        <span className={`text-[10px] font-mono tabular-nums ${
          r.health_band === 'Healthy' ? 'text-success' :
          r.health_band === 'Watch'   ? 'text-warning' : 'text-danger'
        }`}>
          {r.health_score}
        </span>
      )}
    </span>
  )
}
