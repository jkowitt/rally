import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { Button, Badge, EmptyState } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { Users, Crown, Shield, AlertTriangle, Wallet, Briefcase, Eye, Trash2, Pencil, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// ROLE_META describes how each committee role renders.
// Order matters: drives the priority badge color + sort order.
const ROLE_META: Record<string, { label: string; tone: 'success' | 'accent' | 'warning' | 'danger' | 'info' | 'neutral'; icon: any; sort: number }> = {
  decision_maker: { label: 'Decision Maker', tone: 'success', icon: Crown, sort: 0 },
  champion:       { label: 'Champion',       tone: 'accent',  icon: Shield, sort: 1 },
  influencer:     { label: 'Influencer',     tone: 'info',    icon: Users, sort: 2 },
  finance:        { label: 'Finance',        tone: 'warning', icon: Wallet, sort: 3 },
  agency:         { label: 'Agency',         tone: 'info',    icon: Briefcase, sort: 4 },
  end_user:       { label: 'End User',       tone: 'neutral', icon: Eye, sort: 5 },
  gatekeeper:     { label: 'Gatekeeper',     tone: 'warning', icon: Shield, sort: 6 },
  blocker:        { label: 'Blocker',        tone: 'danger',  icon: AlertTriangle, sort: 7 },
}

interface CommitteeRow {
  id: string
  property_id: string
  deal_id: string
  contact_id: string
  role: string
  influence_score: number | null
  tenure_months: number | null
  parent_contact_id: string | null
  notes: string | null
  contacts?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    position: string | null
  } | null
}

interface ContactRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  position: string | null
}

interface Props {
  dealId: string
  propertyId: string
  contacts: ContactRow[]
}

// BuyingCommittee — the per-deal stakeholder map. For each contact in
// the deal, the rep tags role + influence so the org can see who the
// real decision maker is, who blocks, who champions, etc. Renders a
// grouped list ordered by role priority. Future: org-chart tree using
// parent_contact_id.
export default function BuyingCommittee({ dealId, propertyId, contacts }: Props) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { profile } = useAuth()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<CommitteeRow | null>(null)
  const [enrolling, setEnrolling] = useState(false)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['deal-committee', dealId],
    queryFn: async (): Promise<CommitteeRow[]> => {
      const { data, error } = await supabase
        .from('deal_committee')
        .select('*, contacts(id, first_name, last_name, email, position)')
        .eq('deal_id', dealId)
      if (error) throw error
      return (data || []) as CommitteeRow[]
    },
  })

  const upsert = useMutation({
    mutationFn: async (row: Partial<CommitteeRow> & { contact_id: string; role: string }) => {
      const payload = {
        property_id: propertyId,
        deal_id: dealId,
        contact_id: row.contact_id,
        role: row.role,
        influence_score: row.influence_score ?? null,
        tenure_months: row.tenure_months ?? null,
        notes: row.notes ?? null,
        updated_at: new Date().toISOString(),
      }
      if (row.id) {
        const { error } = await supabase.from('deal_committee').update(payload).eq('id', row.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('deal_committee')
          .upsert(payload, { onConflict: 'deal_id,contact_id' })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-committee', dealId] })
      setAdding(false)
      setEditing(null)
      toast({ title: 'Committee saved', type: 'success' })
    },
    onError: (e: any) => toast({ title: 'Save failed', description: humanError(e), type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deal_committee').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-committee', dealId] }),
  })

  // Bulk-enroll the entire committee into the property's default
  // 3-touch sequence. Uses ensure_default_prospect_sequence (created
  // in 073) and one upsert per contact_id (idempotent).
  async function enrollCommittee() {
    if (!profile?.id || rows.length === 0) return
    setEnrolling(true)
    try {
      const { data: seqId, error: seqErr } = await supabase
        .rpc('ensure_default_prospect_sequence', { p_property_id: propertyId })
      if (seqErr) throw seqErr
      const inserts = rows
        .filter(r => r.contacts?.email)
        .map(r => ({
          sequence_id: seqId,
          property_id: propertyId,
          contact_id: r.contact_id,
          deal_id: dealId,
          enrolled_by: profile.id,
          current_step: 0,
          next_send_at: new Date().toISOString(),
        }))
      if (inserts.length === 0) {
        toast({ title: 'No emails on file', description: 'Add emails to the committee contacts first.', type: 'warning' })
        return
      }
      // ON CONFLICT (sequence_id, contact_id) DO NOTHING handles
      // anyone already in the sequence — idempotent.
      const { error } = await supabase
        .from('prospect_sequence_enrollments')
        .upsert(inserts, { onConflict: 'sequence_id,contact_id', ignoreDuplicates: true })
      if (error) throw error
      toast({
        title: `Enrolled ${inserts.length} stakeholder${inserts.length === 1 ? '' : 's'}`,
        description: 'First touches will go out within 15 minutes.',
        type: 'success',
      })
    } catch (e: any) {
      toast({ title: 'Could not enroll', description: humanError(e), type: 'error' })
    } finally {
      setEnrolling(false)
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const ra = ROLE_META[a.role]?.sort ?? 99
    const rb = ROLE_META[b.role]?.sort ?? 99
    if (ra !== rb) return ra - rb
    return (b.influence_score ?? 0) - (a.influence_score ?? 0)
  })

  const usedContactIds = new Set(rows.map(r => r.contact_id))
  const available = contacts.filter(c => !usedContactIds.has(c.id))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Buying Committee</h3>
          {rows.length > 0 && <Badge tone="info">{rows.length}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (confirm(`Enroll ${rows.length} stakeholder${rows.length === 1 ? '' : 's'} in the 3-touch warm-intro sequence?`)) {
                  enrollCommittee()
                }
              }}
              disabled={enrolling}
              title="Bulk-enroll the whole committee in the default sequence"
            >
              <Zap className="w-3.5 h-3.5" /> {enrolling ? 'Enrolling…' : 'Enroll committee'}
            </Button>
          )}
          {!adding && available.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              + Add stakeholder
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="text-xs text-text-muted">Loading…</div>
      )}

      {!isLoading && rows.length === 0 && !adding && (
        <EmptyState
          title="No committee mapped yet"
          description="Tag each contact's role and influence so you know who really decides."
          primaryAction={available.length > 0
            ? <Button size="sm" onClick={() => setAdding(true)}>Map first stakeholder</Button>
            : null
          }
          className="py-6"
        />
      )}

      {sorted.length > 0 && (
        <ul className="space-y-2">
          {sorted.map(row => {
            const meta = ROLE_META[row.role] || { label: row.role, tone: 'neutral' as const, icon: Users, sort: 99 }
            const Icon = meta.icon
            const c = row.contacts
            const name = [c?.first_name, c?.last_name].filter(Boolean).join(' ') || c?.email || '(unknown contact)'
            return (
              <li key={row.id} className="bg-bg-card border border-border rounded p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text-primary truncate">{name}</span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {row.influence_score != null && (
                        <span className="text-[10px] font-mono text-text-muted">
                          influence {row.influence_score}/10
                        </span>
                      )}
                      {row.tenure_months != null && (
                        <span className="text-[10px] font-mono text-text-muted">
                          {row.tenure_months}mo in role
                        </span>
                      )}
                    </div>
                    {c?.position && <div className="text-xs text-text-secondary mt-0.5">{c.position}</div>}
                    {row.notes && <div className="text-xs text-text-muted mt-1 italic">{row.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    aria-label="Edit stakeholder"
                    className="text-text-muted hover:text-accent p-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm('Remove from committee?')) remove.mutate(row.id) }}
                    aria-label="Remove stakeholder"
                    className="text-text-muted hover:text-danger p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {(adding || editing) && (
        <CommitteeEditor
          contacts={available}
          editing={editing}
          onCancel={() => { setAdding(false); setEditing(null) }}
          onSave={(values) => upsert.mutate(values)}
          saving={upsert.isPending}
        />
      )}
    </div>
  )
}

interface EditorProps {
  contacts: ContactRow[]
  editing: CommitteeRow | null
  onCancel: () => void
  onSave: (row: any) => void
  saving: boolean
}

function CommitteeEditor({ contacts, editing, onCancel, onSave, saving }: EditorProps) {
  const [contactId, setContactId] = useState<string>(editing?.contact_id || contacts[0]?.id || '')
  const [role, setRole] = useState<string>(editing?.role || 'champion')
  const [influence, setInfluence] = useState<number>(editing?.influence_score ?? 5)
  const [tenure, setTenure] = useState<string>(editing?.tenure_months != null ? String(editing.tenure_months) : '')
  const [notes, setNotes] = useState<string>(editing?.notes || '')

  const valid = !!contactId && !!role
  const isEditing = !!editing

  return (
    <div className="bg-bg-surface border border-accent/40 rounded p-3 space-y-3">
      <div className="text-xs font-medium text-text-primary">{isEditing ? 'Edit stakeholder' : 'Add stakeholder'}</div>
      {!isEditing && (
        <div>
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Contact</label>
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
          >
            <option value="">— Pick contact —</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>
                {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || '(no name)'}
                {c.position ? ` — ${c.position}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
          >
            {Object.entries(ROLE_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-text-muted uppercase tracking-wider">
            Influence ({influence}/10)
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={influence}
            onChange={(e) => setInfluence(Number(e.target.value))}
            className="w-full mt-0.5 accent-accent"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-text-muted uppercase tracking-wider">Tenure (months in role)</label>
        <input
          type="number"
          min={0}
          value={tenure}
          onChange={(e) => setTenure(e.target.value)}
          placeholder="optional"
          className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-[11px] text-text-muted uppercase tracking-wider">Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why this person matters / relationship history…"
          className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent resize-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          disabled={!valid || saving}
          onClick={() => onSave({
            id: editing?.id,
            contact_id: contactId,
            role,
            influence_score: influence,
            tenure_months: tenure ? Number(tenure) : null,
            notes: notes || null,
          })}
        >
          {saving ? 'Saving…' : isEditing ? 'Save' : 'Add'}
        </Button>
      </div>
    </div>
  )
}
