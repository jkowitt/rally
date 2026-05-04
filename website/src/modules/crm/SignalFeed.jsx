import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { useComposeEmail } from '@/hooks/useComposeEmail'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { Radio, ArrowRight, X, Briefcase, TrendingUp, Newspaper, UserPlus, Activity, CheckCircle } from 'lucide-react'

// Signal-feed page. Shows every active prospect signal (job changes,
// hiring posts, competitor sponsorships, earnings mentions, ad-spend
// deltas, engagement bursts) so the rep can act before competitors.
//
// Two top-level views: Active (default) and History. The Active view
// hides dismissed + acted-on rows; History shows the last 90 days of
// everything.
export default function SignalFeed() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const composeEmail = useComposeEmail()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('active') // 'active' | 'history'

  const { data: signals = [], isLoading } = useQuery({
    queryKey: ['prospect-signals', profile?.property_id, filter, view],
    queryFn: async () => {
      if (!profile?.property_id) return []
      let q = supabase
        .from('prospect_signals')
        .select('*, contacts(id, first_name, last_name, email, position, company), deals(id, brand_name, stage)')
        .eq('property_id', profile.property_id)
        .order('surfaced_at', { ascending: false })
        .limit(200)
      if (view === 'active') {
        q = q.is('dismissed_at', null).is('acted_on_at', null)
      } else {
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        q = q.gte('surfaced_at', cutoff)
      }
      if (filter !== 'all') q = q.eq('signal_type', filter)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.property_id,
  })

  const dismiss = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('prospect_signals')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prospect-signals'] }),
  })

  const markActed = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('prospect_signals')
        .update({ acted_on_at: new Date().toISOString(), acted_on_by: profile?.id })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prospect-signals'] }),
  })

  // Open compose with a starter draft tuned to the signal type.
  function emailFromSignal(signal) {
    const c = signal.contacts
    if (!c?.email) return
    const name = c.first_name || 'there'
    let subject = `Following up — ${c.company || 'your team'}`
    let body = ''
    if (signal.signal_type === 'job_change') {
      subject = `Congrats on the new role at ${signal.payload?.current?.company || c.company}`
      body = `Hi ${name},\n\nSaw the news on the move — congrats. Worth a quick chat about how we partnered with your last team and whether anything similar makes sense in the new seat?\n\n— ${profile?.full_name || ''}`
    } else if (signal.signal_type === 'hiring_post') {
      subject = `Quick note on the partnerships role`
      body = `Hi ${name},\n\nNoticed ${c.company || 'your team'} is hiring on the partnerships side. While you scale the team, happy to share what's been working for similar brands this season — totally no-strings.\n\n— ${profile?.full_name || ''}`
    } else if (signal.signal_type === 'competitor_sponsorship') {
      subject = `Saw the ${signal.payload?.competitor || ''} deal`
      body = `Hi ${name},\n\nNoticed the news on the ${signal.payload?.competitor || 'recent'} partnership. We've seen brands in your category get strong returns when they pair that kind of activation with audience-aligned property; happy to walk through what that looks like.\n\n— ${profile?.full_name || ''}`
    }
    composeEmail.open({
      to: c.email,
      defaultSubject: subject,
      defaultBody: body,
      dealId: signal.deal_id || null,
    })
    markActed.mutate(signal.id)
  }

  const counts = signals.reduce((acc, s) => {
    acc[s.signal_type] = (acc[s.signal_type] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'CRM & Prospecting', to: '/app' },
        { label: 'Signal Radar' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Radio className="w-6 h-6 text-accent" />
          Signal Radar
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Job changes, hiring, competitor deals — what to act on before everyone else does.
        </p>
      </div>

      <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit">
        <FilterTab id="active" label="Active" active={view === 'active'} onClick={() => setView('active')} />
        <FilterTab id="history" label="History (90d)" active={view === 'history'} onClick={() => setView('history')} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <TypeChip label="All" count={signals.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        <TypeChip label="Job changes" count={counts.job_change || 0} active={filter === 'job_change'} onClick={() => setFilter('job_change')} icon={UserPlus} />
        <TypeChip label="Hiring" count={counts.hiring_post || 0} active={filter === 'hiring_post'} onClick={() => setFilter('hiring_post')} icon={Briefcase} />
        <TypeChip label="Competitor deals" count={counts.competitor_sponsorship || 0} active={filter === 'competitor_sponsorship'} onClick={() => setFilter('competitor_sponsorship')} icon={TrendingUp} />
        <TypeChip label="News" count={counts.earnings_mention || 0} active={filter === 'earnings_mention'} onClick={() => setFilter('earnings_mention')} icon={Newspaper} />
        <TypeChip label="Engagement" count={counts.engagement_burst || 0} active={filter === 'engagement_burst'} onClick={() => setFilter('engagement_burst')} icon={Activity} />
      </div>

      {isLoading && <div className="text-sm text-text-muted">Scanning…</div>}

      {!isLoading && signals.length === 0 && (
        <EmptyState
          icon={<Radio className="w-7 h-7 text-text-muted" />}
          title="No signals right now"
          description="The radar runs daily. New job changes and hiring posts will surface here as soon as they fire."
        />
      )}

      <div className="space-y-2">
        {signals.map(signal => (
          <SignalCard
            key={signal.id}
            signal={signal}
            onDismiss={() => dismiss.mutate(signal.id)}
            onAct={() => emailFromSignal(signal)}
            onOpenDeal={signal.deal_id ? () => navigate(`/app/crm/pipeline?deal=${signal.deal_id}`) : null}
          />
        ))}
      </div>
    </div>
  )
}

function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  )
}

function TypeChip({ label, count, active, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
        active
          ? 'bg-accent/10 border-accent text-accent'
          : 'bg-bg-card border-border text-text-muted hover:text-text-primary'
      }`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
      <Badge tone={active ? 'accent' : 'neutral'} className="ml-0.5">{count}</Badge>
    </button>
  )
}

const SEVERITY_TONE = { high: 'danger', medium: 'warning', low: 'neutral' }

function SignalCard({ signal, onDismiss, onAct, onOpenDeal }) {
  const c = signal.contacts
  const isActed = !!signal.acted_on_at
  const isDismissed = !!signal.dismissed_at

  return (
    <Card padding="md" className={`flex items-start justify-between gap-3 ${isActed || isDismissed ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <SignalIcon type={signal.signal_type} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary truncate">{signal.title}</span>
            <Badge tone={SEVERITY_TONE[signal.severity] || 'neutral'}>{signal.severity}</Badge>
            {signal.signal_type && <Badge tone="info">{signal.signal_type.replace(/_/g, ' ')}</Badge>}
            {isActed && <Badge tone="success"><CheckCircle className="w-3 h-3 inline mr-0.5" />acted</Badge>}
          </div>
          {signal.description && <p className="text-xs text-text-secondary mt-1">{signal.description}</p>}
          <div className="text-[10px] text-text-muted font-mono mt-1.5 flex gap-3 flex-wrap">
            <span>{new Date(signal.surfaced_at).toLocaleDateString()}</span>
            {signal.source && <span>via {signal.source}</span>}
            {c && <span>{[c.first_name, c.last_name].filter(Boolean).join(' ')} {c.email && `· ${c.email}`}</span>}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {!isActed && c?.email && (
          <Button size="sm" onClick={onAct}>
            <ArrowRight className="w-3.5 h-3.5" />
            Email now
          </Button>
        )}
        {onOpenDeal && (
          <button onClick={onOpenDeal} className="text-[11px] text-accent hover:underline">Open deal</button>
        )}
        {!isDismissed && !isActed && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss signal"
            className="text-text-muted hover:text-danger p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </Card>
  )
}

function SignalIcon({ type }) {
  const Icon = ({
    job_change: UserPlus,
    hiring_post: Briefcase,
    competitor_sponsorship: TrendingUp,
    earnings_mention: Newspaper,
    engagement_burst: Activity,
  }[type]) || Radio
  return (
    <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4" />
    </div>
  )
}
