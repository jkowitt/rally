import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, EmptyState, Badge, Button } from '@/components/ui'
import { Lightbulb, AlertCircle, MessageSquare, Flame } from 'lucide-react'

// CoachingNudges — Dashboard widget driven by the coaching_nudges
// view (075). Surfaces stale deals + unanswered warm replies +
// active priority queue. Read-only; the rep clicks through to act.
export default function CoachingNudges() {
  const { profile } = useAuth()

  const { data: nudges = [] } = useQuery({
    queryKey: ['coaching-nudges', profile?.property_id, profile?.id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      if (!profile?.property_id) return []
      const { data } = await supabase
        .from('coaching_nudges')
        .select('*')
        .eq('property_id', profile.property_id)
        .order('last_action_at', { ascending: true })
        .limit(20)
      return data || []
    },
  })

  const { data: priority = [] } = useQuery({
    queryKey: ['priority-top5', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      if (!profile?.property_id) return []
      const { data } = await supabase
        .from('contact_engagement_score')
        .select('contact_id, first_name, last_name, email, company, priority_score')
        .eq('property_id', profile.property_id)
        .gt('priority_score', 0)
        .order('priority_score', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  const { data: signalCount = 0 } = useQuery({
    queryKey: ['signal-count', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      if (!profile?.property_id) return 0
      const { count } = await supabase
        .from('prospect_signals')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', profile.property_id)
        .is('dismissed_at', null)
        .is('acted_on_at', null)
      return count || 0
    },
  })

  if (nudges.length === 0 && priority.length === 0 && signalCount === 0) return null

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-semibold text-text-primary">Coach</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {signalCount > 0 && (
          <Link to="/app/crm/signals" className="block bg-bg-card border border-border rounded p-3 hover:border-accent transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-text-muted">Signals</span>
            </div>
            <div className="text-2xl font-bold text-text-primary tabular-nums">{signalCount}</div>
            <div className="text-[11px] text-text-muted">Active prospect signals to act on</div>
          </Link>
        )}

        {priority.length > 0 && (
          <Link to="/app/crm/priority" className="block bg-bg-card border border-border rounded p-3 hover:border-accent transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-text-muted">Hot prospects</span>
            </div>
            <div className="text-2xl font-bold text-text-primary tabular-nums">{priority.length}</div>
            <div className="text-[11px] text-text-muted">In your priority queue today</div>
          </Link>
        )}

        {nudges.filter((n: any) => n.nudge_type === 'stale_deal').length > 0 && (
          <Link to="/app/crm/pipeline" className="block bg-bg-card border border-warning/30 rounded p-3 hover:border-warning transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-warning" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-warning">Stale deals</span>
            </div>
            <div className="text-2xl font-bold text-text-primary tabular-nums">
              {nudges.filter((n: any) => n.nudge_type === 'stale_deal').length}
            </div>
            <div className="text-[11px] text-text-muted">Haven't moved in 14+ days</div>
          </Link>
        )}
      </div>

      {nudges.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider font-mono text-text-muted">Nudges</div>
          <ul className="space-y-1">
            {nudges.slice(0, 6).map((n: any) => (
              <li key={`${n.nudge_type}-${n.related_id}`} className="text-xs text-text-secondary flex items-center gap-2">
                <Badge tone={n.nudge_type === 'stale_deal' ? 'warning' : 'accent'}>
                  {n.nudge_type === 'stale_deal' ? 'stale' : 'reply'}
                </Badge>
                <span className="truncate">{n.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
