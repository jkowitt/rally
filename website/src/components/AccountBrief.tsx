import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { Button, Card, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { generateAccountBrief } from '@/lib/claude'
import { FileText, Sparkles, RefreshCw } from 'lucide-react'

interface Brief {
  summary?: string
  why_now?: string
  key_decision_makers?: { name: string; why_they_matter: string }[]
  recent_signals?: string[]
  likely_objections?: string[]
  suggested_angle?: string
  talking_points?: string[]
  next_best_action?: string
}

interface DealRow {
  id: string
  brand_name: string
  sub_industry?: string | null
  city?: string | null
  state?: string | null
  website?: string | null
  stage?: string | null
  value?: number | null
  notes?: string | null
}

interface ContactRow {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  position?: string | null
}

// AccountBrief — one-click 1-page intelligence brief for a deal.
// Pulls deal + contacts + recent activity + recent inbound emails
// (as soft "external news") and routes through Claude.
export default function AccountBrief({ deal, contacts }: { deal: DealRow; contacts: ContactRow[] }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [generating, setGenerating] = useState(false)

  const { data: activities = [] } = useQuery({
    queryKey: ['deal-activities-brief', deal.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('activities')
        .select('activity_type, subject, occurred_at')
        .eq('deal_id', deal.id)
        .order('occurred_at', { ascending: false })
        .limit(10)
      return data || []
    },
  })

  // Pull recent inbound emails to surface as "external" context.
  const { data: inboundSnippets = [] } = useQuery({
    queryKey: ['deal-inbound-brief', deal.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('email_messages_unified')
        .select('subject, preview, received_at')
        .eq('linked_deal_id', deal.id)
        .eq('is_sent', false)
        .order('received_at', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  async function run() {
    setGenerating(true)
    try {
      const news_snippet = inboundSnippets.map(s => `${s.subject}: ${s.preview}`).join('\n').slice(0, 1000)
      const result = await generateAccountBrief({ deal, contacts, activities, news_snippet })
      if (!result) throw new Error('Brief generator returned nothing')
      setBrief(result)
    } catch (e: any) {
      toast({ title: 'Could not generate brief', description: humanError(e), type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Account Brief</h3>
        </div>
        {!open ? (
          <Button size="sm" variant="secondary" onClick={() => { setOpen(true); if (!brief) run() }}>
            <Sparkles className="w-3.5 h-3.5" /> Generate
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => run()} disabled={generating}>
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} /> {generating ? 'Thinking…' : 'Refresh'}
          </Button>
        )}
      </div>

      {open && (
        <Card padding="md" className="space-y-3">
          {generating && !brief && (
            <div className="text-xs text-text-muted">Pulling activity, contacts, and inbound mail to assemble the brief…</div>
          )}

          {brief && (
            <>
              {brief.summary && (
                <Section title="Summary">
                  <p className="text-sm text-text-secondary leading-relaxed">{brief.summary}</p>
                </Section>
              )}
              {brief.why_now && (
                <Section title="Why now">
                  <p className="text-sm text-text-secondary leading-relaxed">{brief.why_now}</p>
                </Section>
              )}
              {brief.key_decision_makers && brief.key_decision_makers.length > 0 && (
                <Section title="Decision makers">
                  <ul className="space-y-1.5">
                    {brief.key_decision_makers.map((dm, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium text-text-primary">{dm.name}</span>
                        {dm.why_they_matter && <span className="text-text-secondary"> — {dm.why_they_matter}</span>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {brief.recent_signals && brief.recent_signals.length > 0 && (
                <Section title="Recent signals">
                  <ul className="list-disc list-inside text-sm text-text-secondary space-y-0.5">
                    {brief.recent_signals.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </Section>
              )}
              {brief.likely_objections && brief.likely_objections.length > 0 && (
                <Section title="Likely objections">
                  <ul className="list-disc list-inside text-sm text-text-secondary space-y-0.5">
                    {brief.likely_objections.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </Section>
              )}
              {brief.suggested_angle && (
                <Section title="Suggested angle">
                  <p className="text-sm text-text-secondary leading-relaxed">{brief.suggested_angle}</p>
                </Section>
              )}
              {brief.talking_points && brief.talking_points.length > 0 && (
                <Section title="Talking points">
                  <ul className="space-y-1">
                    {brief.talking_points.map((tp, i) => (
                      <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="text-accent mt-0.5">•</span>
                        <span>{tp}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {brief.next_best_action && (
                <div className="bg-accent/10 border border-accent/30 rounded p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone="accent">Next best action</Badge>
                  </div>
                  <p className="text-sm text-text-primary">{brief.next_best_action}</p>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-mono text-text-muted mb-1">{title}</div>
      {children}
    </div>
  )
}
