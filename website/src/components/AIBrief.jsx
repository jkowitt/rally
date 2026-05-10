import { useState, useCallback } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { useComposeEmail } from '@/hooks/useComposeEmail'
import { humanError } from '@/lib/humanError'
import { Sparkles, RefreshCw, ChevronDown, ChevronRight, Send } from 'lucide-react'

// AIBrief — the morning panel on the Dashboard that surfaces a
// grounded, first-party summary of what to do today. Produced by
// the ai-daily-brief edge function; cached per user per day.
//
// The brief is split into five lanes; each lane renders as its own
// collapsible block so the rep can scan the one they care about
// without a wall of text. Empty lanes are hidden.
//
// Hooks for the rep to act:
//   • prospect → Add to pipeline
//   • email   → Open compose with body prefilled
//   • deal    → Open the deal viewer
//   • signal  → Same; opens deal if matched, otherwise Find Prospects
export default function AIBrief() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const compose = useComposeEmail()
  const [expanded, setExpanded] = useState({ prospects: true, emails: true, deals: true, renewals: false, signals: false })

  const userId = profile?.id
  const propertyId = profile?.property_id
  const today = new Date().toISOString().split('T')[0]

  // Cached read of today's brief from the table (cheap, RLS-scoped).
  const { data: row, isLoading } = useQuery({
    queryKey: ['ai-brief', userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_briefs')
        .select('*')
        .eq('user_id', userId)
        .eq('brief_date', today)
        .maybeSingle()
      return data
    },
  })

  const generate = useMutation({
    mutationFn: async ({ regenerate = false } = {}) => {
      const { data, error } = await supabase.functions.invoke('ai-daily-brief', {
        body: { regenerate },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Brief generation failed')
      return data.brief
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-brief', userId, today] })
    },
    onError: (err) => toast({ title: 'Brief failed', description: humanError(err), type: 'error' }),
  })

  const toggle = useCallback((key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] })), [])

  const brief = row?.payload
  const status = row?.status

  // First-time / empty state — nothing generated yet today.
  if (!isLoading && !row) {
    return (
      <BriefShell onRefresh={() => generate.mutate({})} loading={generate.isPending}>
        <div className="px-5 py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-accent/15 text-accent mx-auto flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">Generate your morning brief</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto leading-relaxed">
            We'll read your closed-won pattern, recent calls, and pipeline signals to surface 5 prospects, 5 emails to send, and the deals that need a push today.
          </p>
          <button
            onClick={() => generate.mutate({})}
            disabled={generate.isPending}
            className="mt-4 inline-flex items-center gap-2 bg-accent text-bg-primary px-4 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generate.isPending ? 'Generating…' : 'Generate brief'}
          </button>
        </div>
      </BriefShell>
    )
  }

  if (status === 'generating' || (isLoading && !row)) {
    return (
      <BriefShell onRefresh={null} loading>
        <div className="px-5 py-6 text-center text-xs text-text-muted">
          Reading your data… typically 8–15 seconds.
        </div>
      </BriefShell>
    )
  }

  if (status === 'failed') {
    return (
      <BriefShell onRefresh={() => generate.mutate({ regenerate: true })} loading={generate.isPending}>
        <div className="px-5 py-6 text-center">
          <div className="text-xs text-danger">Brief generation failed</div>
          <div className="text-[11px] text-text-muted mt-1">{row?.error || 'Unknown error'}</div>
          <button
            onClick={() => generate.mutate({ regenerate: true })}
            disabled={generate.isPending}
            className="mt-3 text-xs text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      </BriefShell>
    )
  }

  if (!brief) return null
  const total =
    (brief.prospects?.length || 0) +
    (brief.emails?.length || 0) +
    (brief.deals_to_push?.length || 0) +
    (brief.renewal_risks?.length || 0) +
    (brief.market_signals?.length || 0)

  if (total === 0) {
    return (
      <BriefShell onRefresh={() => generate.mutate({ regenerate: true })} loading={generate.isPending}>
        <div className="px-5 py-6 text-center text-xs text-text-muted">
          Not enough data yet to ground a brief. Run a few prospect searches, log a couple of calls, then come back tomorrow.
        </div>
      </BriefShell>
    )
  }

  return (
    <BriefShell onRefresh={() => generate.mutate({ regenerate: true })} loading={generate.isPending} generatedAt={brief.generated_at}>
      <div className="divide-y divide-border">
        {brief.prospects?.length > 0 && (
          <Lane
            label="New prospects"
            count={brief.prospects.length}
            open={expanded.prospects}
            onToggle={() => toggle('prospects')}
          >
            {brief.prospects.map((p, i) => (
              <ProspectCard key={i} prospect={p} navigate={navigate} propertyId={propertyId} userId={userId} toast={toast} compose={compose} />
            ))}
          </Lane>
        )}
        {brief.emails?.length > 0 && (
          <Lane
            label="Emails to send"
            count={brief.emails.length}
            open={expanded.emails}
            onToggle={() => toggle('emails')}
          >
            {brief.emails.map((e, i) => (
              <EmailCard key={i} email={e} navigate={navigate} compose={compose} />
            ))}
          </Lane>
        )}
        {brief.deals_to_push?.length > 0 && (
          <Lane
            label="Deals to push"
            count={brief.deals_to_push.length}
            open={expanded.deals}
            onToggle={() => toggle('deals')}
          >
            {brief.deals_to_push.map((d, i) => (
              <DealCard key={i} deal={d} navigate={navigate} />
            ))}
          </Lane>
        )}
        {brief.renewal_risks?.length > 0 && (
          <Lane
            label="Renewal risks"
            count={brief.renewal_risks.length}
            open={expanded.renewals}
            onToggle={() => toggle('renewals')}
          >
            {brief.renewal_risks.map((r, i) => (
              <RenewalCard key={i} risk={r} />
            ))}
          </Lane>
        )}
        {brief.market_signals?.length > 0 && (
          <Lane
            label="Market signals"
            count={brief.market_signals.length}
            open={expanded.signals}
            onToggle={() => toggle('signals')}
          >
            {brief.market_signals.map((s, i) => (
              <SignalCard key={i} signal={s} />
            ))}
          </Lane>
        )}
      </div>
    </BriefShell>
  )
}

function BriefShell({ children, onRefresh, loading, generatedAt }) {
  return (
    <section className="bg-bg-surface border border-accent/30 rounded-xl overflow-hidden mb-4 sm:mb-6">
      <header className="px-5 py-3 border-b border-border bg-accent/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-accent shrink-0" />
          <h2 className="text-sm font-semibold text-text-primary">Morning brief</h2>
          {generatedAt && (
            <span className="text-[10px] font-mono text-text-muted truncate">
              · {new Date(generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-[11px] text-text-muted hover:text-accent inline-flex items-center gap-1 disabled:opacity-50"
            title="Regenerate brief"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating…' : 'Refresh'}
          </button>
        )}
      </header>
      {children}
    </section>
  )
}

function Lane({ label, count, open, onToggle, children }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-5 py-2.5 flex items-center justify-between gap-2 hover:bg-bg-card/40 transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
          <span className="text-[11px] font-mono uppercase tracking-widest text-text-muted">{label}</span>
          <span className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">{count}</span>
        </span>
      </button>
      {open && <div className="px-5 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

function ProspectCard({ prospect, navigate, propertyId, userId, toast, compose }) {
  const [adding, setAdding] = useState(false)
  async function addAndCompose() {
    if (!propertyId) return
    setAdding(true)
    try {
      const { data, error } = await supabase.from('deals').insert({
        property_id: propertyId,
        brand_name: prospect.brand_name,
        stage: 'Prospect',
        source: 'AI Brief',
        created_by: userId,
      }).select('id').single()
      if (error) throw error
      toast({ title: 'Added to pipeline', description: prospect.brand_name, type: 'success' })
      // Open compose pre-filled with the AI's first-touch draft so
      // the rep can edit + send instead of retyping.
      const subject = parseSubject(prospect.suggested_first_touch) || `Intro — ${prospect.brand_name}`
      const body = stripSubjectLine(prospect.suggested_first_touch) || ''
      compose.open({ dealId: data.id, defaultSubject: subject, defaultBody: body })
    } catch (e) {
      toast({ title: 'Could not add', description: humanError(e), type: 'error' })
    } finally {
      setAdding(false)
    }
  }
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text-primary">{prospect.brand_name || 'Unknown'}</div>
          {prospect.confidence != null && (
            <div className="text-[10px] font-mono text-text-muted">{prospect.confidence}% match</div>
          )}
        </div>
        <button
          onClick={addAndCompose}
          disabled={adding}
          className="text-[11px] inline-flex items-center gap-1 bg-accent text-bg-primary rounded px-2 py-1 hover:opacity-90 disabled:opacity-50"
        >
          <Send className="w-3 h-3" /> {adding ? 'Adding…' : 'Add + draft'}
        </button>
      </div>
      {prospect.why_grounded && (
        <p className="text-[12px] text-text-secondary mt-1.5 leading-relaxed">{prospect.why_grounded}</p>
      )}
      {prospect.suggested_first_touch && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-accent hover:underline list-none">Preview first email →</summary>
          <pre className="mt-1.5 bg-bg-surface border border-border rounded p-2 text-[11px] text-text-secondary whitespace-pre-wrap font-sans">{prospect.suggested_first_touch}</pre>
        </details>
      )}
    </div>
  )
}

function EmailCard({ email, navigate, compose }) {
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-text-primary">{email.subject || '(no subject)'}</div>
          <div className="text-[11px] text-text-muted">to {email.recipient || 'unknown'}</div>
          {email.reason && <div className="text-[11px] text-text-secondary mt-1">{email.reason}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {email.body && (
            <button
              onClick={() => compose.open({
                to: email.recipient || undefined,
                defaultSubject: email.subject || '',
                defaultBody: email.body,
                dealId: email.deal_id || null,
              })}
              className="text-[11px] inline-flex items-center gap-1 bg-accent text-bg-primary rounded px-2 py-1 hover:opacity-90"
            >
              <Send className="w-3 h-3" /> Send
            </button>
          )}
          {email.deal_id && (
            <button
              onClick={() => navigate(`/app/crm/pipeline?deal=${email.deal_id}`)}
              className="text-[11px] text-accent hover:underline whitespace-nowrap"
            >
              Open deal →
            </button>
          )}
        </div>
      </div>
      {email.body && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-accent hover:underline list-none">View draft →</summary>
          <pre className="mt-1.5 bg-bg-surface border border-border rounded p-2 text-[11px] text-text-secondary whitespace-pre-wrap font-sans">{email.body}</pre>
        </details>
      )}
    </div>
  )
}

// Parse "Subject: foo" out of an AI-drafted email so we can split
// it into Compose's separate subject + body fields. The model
// sometimes prepends the subject; sometimes it just dumps the body.
function parseSubject(text) {
  if (!text) return null
  const m = text.match(/^\s*subject\s*:\s*(.+)$/im)
  return m ? m[1].trim() : null
}
function stripSubjectLine(text) {
  if (!text) return ''
  return text.replace(/^\s*subject\s*:\s*.+\n+/im, '').trim()
}

function DealCard({ deal, navigate }) {
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text-primary">{deal.brand_name}</div>
          <div className="text-[11px] font-mono text-text-muted">{deal.current_stage}</div>
        </div>
        {deal.deal_id && (
          <button
            onClick={() => navigate(`/app/crm/pipeline?deal=${deal.deal_id}`)}
            className="text-[11px] text-accent hover:underline whitespace-nowrap"
          >
            Open →
          </button>
        )}
      </div>
      {deal.recommended_action && (
        <p className="text-[12px] text-text-primary mt-1.5 leading-relaxed">{deal.recommended_action}</p>
      )}
      {deal.why && (
        <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{deal.why}</p>
      )}
    </div>
  )
}

function RenewalCard({ risk }) {
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-text-primary">{risk.brand_name}</div>
          {risk.days_to_renewal != null && (
            <div className="text-[11px] font-mono text-warning">{risk.days_to_renewal} days to renewal</div>
          )}
        </div>
      </div>
      {risk.risk_factor && <p className="text-[11px] text-text-secondary mt-1">{risk.risk_factor}</p>}
      {risk.action && <p className="text-[11px] text-accent mt-1">{risk.action}</p>}
    </div>
  )
}

function SignalCard({ signal }) {
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="text-sm font-semibold text-text-primary">{signal.brand_name}</div>
      {signal.summary && <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{signal.summary}</p>}
      {signal.suggested_action && <p className="text-[11px] text-accent mt-1">→ {signal.suggested_action}</p>}
      {signal.source && <div className="text-[10px] font-mono text-text-muted mt-1">{signal.source}</div>}
    </div>
  )
}
