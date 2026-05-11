import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { humanError } from '@/lib/humanError'
import { Brain, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, Target, Link2 } from 'lucide-react'

// DealResearchPanel — surfaces the latest agent_brief from
// deal_research for a single deal. Renders inline on the deal
// viewer's Overview tab. If no brief exists yet, shows a "Run
// research" CTA; the rep can also force a refresh.
//
// The background cron (ai-research-runner) keeps these warm
// automatically — this panel just renders what's there and lets
// the rep regenerate on demand.
export default function DealResearchPanel({ dealId }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)

  const { data: research, isLoading } = useQuery({
    queryKey: ['deal-research', dealId],
    enabled: !!dealId,
    queryFn: async () => {
      const { data } = await supabase
        .from('deal_research')
        .select('*')
        .eq('deal_id', dealId)
        .eq('kind', 'agent_brief')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
  })

  const regenerate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-research-deal', {
        body: { deal_id: dealId },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || data?.message || 'Research failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-research', dealId] })
      toast({ title: 'Research updated', type: 'success' })
    },
    onError: (err) => toast({ title: 'Research failed', description: humanError(err), type: 'error' }),
  })

  // No brief yet — agent hasn't run for this deal.
  if (!isLoading && !research) {
    return (
      <section className="bg-bg-card border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent">AI research</div>
            <h3 className="text-sm font-semibold text-text-primary mt-0.5">No research yet</h3>
            <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
              The background agent runs every couple of hours, picking up deals that need a fresh brief. Run it now if you want one before the next cycle.
            </p>
            <button
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] bg-accent text-bg-primary rounded px-2.5 py-1.5 font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <Brain className="w-3.5 h-3.5" />
              {regenerate.isPending ? 'Researching…' : 'Run research now'}
            </button>
          </div>
        </div>
      </section>
    )
  }

  const p = research?.payload || {}
  const dataThin = (p.data_volume?.activities ?? 0) + (p.data_volume?.recordings ?? 0) + (p.data_volume?.signals ?? 0) === 0

  return (
    <section className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-bg-surface/40 transition-colors text-left"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-accent">AI research</span>
              {typeof p.confidence === 'number' && (
                <span className="text-[10px] font-mono text-text-muted">· {p.confidence}% confidence</span>
              )}
              {research?.generated_at && (
                <span className="text-[10px] font-mono text-text-muted">· {new Date(research.generated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              )}
            </div>
            {p.headline && (
              <h3 className="text-sm font-semibold text-text-primary mt-0.5 truncate">{p.headline}</h3>
            )}
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-text-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border">
          {dataThin && (
            <div className="mt-3 bg-warning/5 border border-warning/30 rounded p-2 text-[11px] text-warning leading-relaxed">
              Thin data — no activities, recordings, or signals on this deal yet. The brief will get sharper as you log calls and the signal radar picks up news.
            </div>
          )}

          {p.summary && (
            <p className="text-[13px] text-text-secondary leading-relaxed mt-3">{p.summary}</p>
          )}

          {p.talking_points?.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1.5 flex items-center gap-1">
                <Target className="w-3 h-3" /> Talking points
              </div>
              <ul className="space-y-1">
                {p.talking_points.map((pt, i) => (
                  <li key={i} className="text-[12px] text-text-primary flex items-start gap-2">
                    <span className="text-accent mt-0.5">▸</span>
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.red_flags?.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-danger mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Red flags
              </div>
              <ul className="space-y-1">
                {p.red_flags.map((rf, i) => (
                  <li key={i} className="text-[12px] text-text-secondary flex items-start gap-2">
                    <span className="text-danger mt-0.5">▸</span>
                    <span className="leading-relaxed">{rf}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.comparable_wins?.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1.5 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Comparable wins
              </div>
              <ul className="space-y-1.5">
                {p.comparable_wins.map((cw, i) => (
                  <li key={cw.id || i} className="text-[12px] text-text-secondary">
                    <button
                      onClick={() => navigate(`/app/crm/pipeline?deal=${cw.id}`)}
                      className="text-accent hover:underline font-medium"
                    >
                      {cw.brand_name || `Deal ${String(cw.id || '').slice(0, 8)}`}
                    </button>
                    {cw.why_similar && <span className="text-text-muted"> — {cw.why_similar}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-text-muted">
            <span>
              Grounded in {p.data_volume?.activities ?? 0} activities, {p.data_volume?.recordings ?? 0} recordings, {p.data_volume?.signals ?? 0} signals
            </span>
            <button
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
              className="inline-flex items-center gap-1 text-accent hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${regenerate.isPending ? 'animate-spin' : ''}`} />
              {regenerate.isPending ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
