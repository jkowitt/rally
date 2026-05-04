import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/hooks/useAuth'
import { Button, Badge, Card, EmptyState } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { useDialog } from '@/hooks/useDialog'
import { generatePersonalityProfile } from '@/lib/claude'
import { Brain, Sparkles, X, RefreshCw } from 'lucide-react'

interface ContactRow {
  id: string
  first_name?: string | null
  last_name?: string | null
  position?: string | null
  company?: string | null
  linkedin?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  contact: ContactRow | null
  propertyId: string
}

// PersonalityProfile — Crystal-style read of a contact. Persists
// the latest profile per contact in `contact_personalities`. Run
// is gated by `personality_profiles` feature flag (caller should
// pre-check). Treats the result as a hint, not a diagnosis.
export default function PersonalityProfile({ open, onClose, contact, propertyId }: Props) {
  const dialogRef = useDialog({ isOpen: open, onClose })
  const { profile: me } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [generating, setGenerating] = useState(false)

  const { data: existing } = useQuery({
    queryKey: ['personality', contact?.id],
    enabled: !!contact?.id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from('contact_personalities')
        .select('*')
        .eq('contact_id', contact!.id)
        .maybeSingle()
      return data
    },
  })

  const upsert = useMutation({
    mutationFn: async (profile: any) => {
      const { error } = await supabase
        .from('contact_personalities')
        .upsert({
          contact_id: contact!.id,
          property_id: propertyId,
          disc_type: profile.disc_type,
          communication_style: profile.communication_style,
          preferred_pace: profile.preferred_pace,
          decision_drivers: profile.decision_drivers || [],
          avoid_phrases: profile.avoid_phrases || [],
          recommended_phrases: profile.recommended_phrases || [],
          rationale: profile.rationale,
          source: 'claude',
          generated_at: new Date().toISOString(),
        }, { onConflict: 'contact_id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personality', contact?.id] }),
  })

  async function run() {
    if (!contact) return
    setGenerating(true)
    try {
      // Pull a few recent inbound samples if any.
      const { data: samples } = await supabase
        .from('outreach_log')
        .select('body_preview')
        .eq('contact_id', contact.id)
        .eq('direction', 'inbound')
        .order('sent_at', { ascending: false })
        .limit(3)
      const profile = await generatePersonalityProfile({
        contact: {
          first_name: contact.first_name,
          last_name: contact.last_name,
          position: contact.position,
          company: contact.company,
          linkedin_bio: '',
        },
        email_samples: (samples || []).map((s: any) => s.body_preview).filter(Boolean),
      })
      if (!profile) throw new Error('No profile returned')
      await upsert.mutateAsync(profile)
      toast({ title: 'Profile generated', type: 'success' })
    } catch (e: any) {
      toast({ title: 'Could not generate', description: humanError(e), type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  if (!open || !contact) return null

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '(unknown)'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="bg-bg-surface border border-border rounded-lg w-full sm:max-w-xl max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Brain className="w-4 h-4 text-accent" /> Personality read — {name}
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">A hint, not a diagnosis. Use it to tune your tone.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {!existing && !generating && (
            <EmptyState
              title="No profile yet"
              description="Generate a quick communication-style read from public signals."
              primaryAction={<Button size="sm" onClick={run}><Sparkles className="w-3.5 h-3.5" /> Generate</Button>}
              className="border-0 py-4"
            />
          )}

          {generating && <div className="text-sm text-text-muted">Reading the room…</div>}

          {existing && !generating && (
            <Card padding="md" className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {existing.disc_type && <Badge tone="accent">DISC: {existing.disc_type}</Badge>}
                {existing.communication_style && <Badge tone="info">{existing.communication_style}</Badge>}
                {existing.preferred_pace && <Badge tone="neutral">pace: {existing.preferred_pace}</Badge>}
              </div>
              {existing.decision_drivers?.length > 0 && (
                <Section title="Decision drivers">
                  <div className="flex gap-1 flex-wrap">
                    {existing.decision_drivers.map((d: string, i: number) => <Badge key={i} tone="neutral">{d}</Badge>)}
                  </div>
                </Section>
              )}
              {existing.recommended_phrases?.length > 0 && (
                <Section title="Phrases that pattern well">
                  <ul className="list-disc list-inside text-sm text-text-secondary space-y-0.5">
                    {existing.recommended_phrases.map((p: string, i: number) => <li key={i}>{p}</li>)}
                  </ul>
                </Section>
              )}
              {existing.avoid_phrases?.length > 0 && (
                <Section title="Phrases to avoid">
                  <ul className="list-disc list-inside text-sm text-text-secondary space-y-0.5">
                    {existing.avoid_phrases.map((p: string, i: number) => <li key={i}>{p}</li>)}
                  </ul>
                </Section>
              )}
              {existing.rationale && (
                <Section title="Why">
                  <p className="text-sm text-text-secondary leading-relaxed">{existing.rationale}</p>
                </Section>
              )}
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={run} disabled={generating}>
                  <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} /> Regenerate
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
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
