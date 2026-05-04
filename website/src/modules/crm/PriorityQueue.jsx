import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useComposeEmail } from '@/hooks/useComposeEmail'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { Flame, Mail, Phone, Eye, MousePointerClick, MessageSquare, Clock } from 'lucide-react'

// PriorityQueue — "who to call today" computed from contact_engagement_score
// view (opens, clicks, replies in last 14d). Top 50 by composite score,
// excluding contacts already replied (positive intent) so the rep focuses
// on warm-but-not-yet-converted prospects.
export default function PriorityQueue() {
  const { profile } = useAuth()
  const composeEmail = useComposeEmail()

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['priority-queue', profile?.property_id],
    queryFn: async () => {
      if (!profile?.property_id) return []
      const { data, error } = await supabase
        .from('contact_engagement_score')
        .select('*')
        .eq('property_id', profile.property_id)
        .gt('priority_score', 0)
        .order('priority_score', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.property_id,
  })

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'CRM & Prospecting', to: '/app' },
        { label: 'Priority Queue' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Flame className="w-6 h-6 text-accent" />
          Priority Queue
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Hottest contacts right now — ranked by opens, clicks, and replies in the last 14 days.
        </p>
      </div>

      {isLoading && <div className="text-sm text-text-muted">Computing scores…</div>}

      {!isLoading && rows.length === 0 && (
        <EmptyState
          icon={<Flame className="w-7 h-7 text-text-muted" />}
          title="Nothing hot right now"
          description="Send some outreach with tracking turned on and warm prospects will rank here as they engage."
          primaryAction={
            <Link to="/app/crm/pipeline">
              <Button>Open pipeline</Button>
            </Link>
          }
        />
      )}

      <div className="space-y-2">
        {rows.map((r, i) => (
          <Card key={r.contact_id} padding="md" className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center font-semibold text-sm shrink-0">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || '(unknown)'}
                  </span>
                  {r.company && <Badge tone="info">{r.company}</Badge>}
                  <Badge tone="accent">score {r.priority_score}</Badge>
                </div>
                <div className="text-[11px] text-text-muted font-mono mt-1 flex gap-3 flex-wrap">
                  {r.email && <span>{r.email}</span>}
                  <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {r.opens_14d}</span>
                  <span className="flex items-center gap-0.5"><MousePointerClick className="w-3 h-3" /> {r.clicks_14d}</span>
                  <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {r.replies_14d}</span>
                  {r.last_email_received_at && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> last reply {new Date(r.last_email_received_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {r.email && (
                <Button size="sm" onClick={() => composeEmail.open({
                  to: r.email,
                  dealId: r.deal_id || null,
                  defaultSubject: `Following up — ${r.company || 'your team'}`,
                })}>
                  <Mail className="w-3.5 h-3.5" /> Email now
                </Button>
              )}
              {r.deal_id && (
                <Link to={`/app/crm/pipeline?deal=${r.deal_id}`} className="text-[11px] text-accent hover:underline">
                  Open deal →
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
