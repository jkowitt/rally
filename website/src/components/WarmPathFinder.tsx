import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button, Badge, EmptyState } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { useDialog } from '@/hooks/useDialog'
import { Network, Plus, X, Mail, Briefcase, GraduationCap, UserCheck } from 'lucide-react'

const REL_META: Record<string, { label: string; icon: any }> = {
  former_colleague:        { label: 'Former colleague',  icon: Briefcase },
  school:                  { label: 'School / alumni',   icon: GraduationCap },
  introduced_by:           { label: 'Mutual intro',      icon: UserCheck },
  industry_peer:           { label: 'Industry peer',     icon: Network },
  family:                  { label: 'Family',            icon: UserCheck },
  frequent_correspondent:  { label: 'Frequent contact',  icon: Mail },
}

interface ContactRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  position: string | null
  company: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  contact: ContactRow | null
  propertyId: string
}

// WarmPathFinder — given a target contact, surfaces every team
// member who has a manual relationship recorded with that contact,
// PLUS anyone who has emailed that contact's domain N+ times in the
// last 6 months (inbox-mined "frequent correspondent" path).
export default function WarmPathFinder({ open, onClose, contact, propertyId }: Props) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const dialogRef = useDialog({ isOpen: open, onClose })
  const [adding, setAdding] = useState(false)
  const [relType, setRelType] = useState('former_colleague')
  const [strength, setStrength] = useState(7)
  const [notes, setNotes] = useState('')

  const targetEmail = contact?.email || ''
  const targetDomain = targetEmail.includes('@') ? targetEmail.split('@')[1].toLowerCase() : ''

  // Manual relationships pointed at this contact
  const { data: manual = [] } = useQuery({
    queryKey: ['warm-path-manual', contact?.id, propertyId],
    enabled: open && !!contact?.id && !!propertyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('warm_path_relationships')
        .select('*, owner:profiles!owner_user_id(id, full_name, email)')
        .eq('property_id', propertyId)
        .eq('contact_id', contact!.id)
        .order('strength', { ascending: false })
      return data || []
    },
  })

  // Inbox-mined: who on the team has talked to this domain a lot?
  const { data: domainCounts = [] } = useQuery({
    queryKey: ['warm-path-inbox', targetDomain, propertyId],
    enabled: open && !!targetDomain && !!propertyId,
    queryFn: async () => {
      // Pull outreach_log rows for the domain, group by user, count.
      const { data } = await supabase
        .from('outreach_log')
        .select('user_id')
        .eq('property_id', propertyId)
        .ilike('to_email', `%@${targetDomain}`)
        .gte('sent_at', new Date(Date.now() - 180 * 86400_000).toISOString())
      if (!data?.length) return []
      const countByUser: Record<string, number> = {}
      for (const r of data) {
        if (!r.user_id) continue
        countByUser[r.user_id] = (countByUser[r.user_id] || 0) + 1
      }
      const ids = Object.keys(countByUser)
      if (!ids.length) return []
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids)
      return (users || [])
        .map(u => ({ ...u, count: countByUser[u.id] }))
        .sort((a: any, b: any) => b.count - a.count)
    },
  })

  const addRelationship = useMutation({
    mutationFn: async () => {
      if (!contact?.id || !profile?.id) return
      const { error } = await supabase.from('warm_path_relationships').upsert({
        property_id: propertyId,
        owner_user_id: profile.id,
        contact_id: contact.id,
        relationship_type: relType,
        strength,
        notes: notes || null,
        source: 'manual',
      }, { onConflict: 'owner_user_id,contact_id,relationship_type' })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warm-path-manual', contact?.id, propertyId] })
      setAdding(false)
      setNotes('')
      toast({ title: 'Relationship recorded', type: 'success' })
    },
    onError: (e: any) => toast({ title: 'Could not save', description: humanError(e), type: 'error' }),
  })

  if (!open || !contact) return null

  const targetName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || '(unknown contact)'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="warm-path-title"
        tabIndex={-1}
        className="bg-bg-surface border border-border rounded-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 id="warm-path-title" className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Network className="w-4 h-4 text-accent" /> Warm path to {targetName}
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Who on the team can warm-intro you to {contact.company || 'this contact'}?
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Manual relationships */}
          <Section title="Recorded relationships">
            {manual.length === 0 && (
              <EmptyState
                title="None recorded yet"
                description="If you know this person, record the relationship to make warm intros searchable."
                className="py-4"
              />
            )}
            {manual.length > 0 && (
              <ul className="space-y-2">
                {manual.map((m: any) => {
                  const meta = REL_META[m.relationship_type] || { label: m.relationship_type, icon: Network }
                  const Icon = meta.icon
                  return (
                    <li key={m.id} className="bg-bg-card border border-border rounded p-2.5 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-text-primary">{m.owner?.full_name || m.owner?.email || 'Team member'}</span>
                          <Badge tone="info">{meta.label}</Badge>
                          {m.strength != null && <span className="text-[10px] font-mono text-text-muted">strength {m.strength}/10</span>}
                        </div>
                        {m.notes && <p className="text-xs text-text-secondary mt-1 italic">{m.notes}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>

          {/* Inbox-mined */}
          {targetDomain && domainCounts.length > 0 && (
            <Section title={`Frequent correspondents at @${targetDomain} (last 180d)`}>
              <ul className="space-y-1.5">
                {domainCounts.slice(0, 5).map((u: any) => (
                  <li key={u.id} className="flex items-center justify-between bg-bg-card border border-border rounded p-2">
                    <div>
                      <span className="text-sm text-text-primary">{u.full_name || u.email}</span>
                      <span className="text-[10px] font-mono text-text-muted ml-2">{u.count} outbound</span>
                    </div>
                    <Badge tone="neutral">inbox path</Badge>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Add my own */}
          <div className="border-t border-border pt-4">
            {!adding ? (
              <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
                <Plus className="w-3.5 h-3.5" /> I know this person
              </Button>
            ) : (
              <div className="bg-accent/5 border border-accent/30 rounded p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-text-muted uppercase tracking-wider">Relationship</label>
                    <select
                      value={relType}
                      onChange={(e) => setRelType(e.target.value)}
                      className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
                    >
                      {Object.entries(REL_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-text-muted uppercase tracking-wider">Strength ({strength}/10)</label>
                    <input
                      type="range"
                      min={1} max={10}
                      value={strength}
                      onChange={(e) => setStrength(Number(e.target.value))}
                      className="w-full mt-0.5 accent-accent"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Worked together at Acme 2018-2021…"
                    className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => addRelationship.mutate()} disabled={addRelationship.isPending}>
                    {addRelationship.isPending ? 'Saving…' : 'Record'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-mono text-text-muted mb-2">{title}</div>
      {children}
    </div>
  )
}
