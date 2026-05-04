import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { ShoppingCart, Check, X, Mail, Clock } from 'lucide-react'

const STATUS_TONE = {
  pending:   'warning',
  contacted: 'accent',
  approved:  'success',
  declined:  'danger',
  cancelled: 'neutral',
}

// AddonRequests — developer-only panel for the founder to triage
// add-on Contact-Sales submissions. Approve writes to property_addons
// (via 081 trigger), notifies the requester, and flips the feature
// on for that property in real-time via the Supabase channel
// useAddons subscribes to.
export default function AddonRequests() {
  const { realIsDeveloper } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('pending')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['addon-requests', statusFilter],
    enabled: !!realIsDeveloper,
    queryFn: async () => {
      let q = supabase
        .from('addon_requests')
        .select('*, addon:addon_key(name, icon, price_hint), property:property_id(name), requester:requested_by(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (statusFilter !== 'all') q = q.eq('status', statusFilter)
      const { data } = await q
      return data || []
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      const { error } = await supabase.from('addon_requests').update({
        status,
        status_notes: notes || null,
        status_changed_at: new Date().toISOString(),
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['addon-requests'] })
      const verb = vars.status === 'approved' ? 'Approved' : vars.status === 'declined' ? 'Declined' : 'Updated'
      toast({
        title: `${verb}`,
        description: vars.status === 'approved'
          ? 'Add-on flipped on for the property and a notification was sent to the requester.'
          : 'Status updated.',
        type: vars.status === 'approved' ? 'success' : 'info',
      })
    },
    onError: (e) => toast({ title: 'Update failed', description: humanError(e), type: 'error' }),
  })

  if (!realIsDeveloper) {
    return (
      <div className="p-6 text-sm text-text-muted">
        Developer-only. Contact your administrator if you should have access.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'Admin', to: '/app/admin' },
        { label: 'Add-on Requests' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-accent" />
          Add-on Requests
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Triage Contact-Sales submissions. Approving flips the add-on on for the property in real time.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['pending', 'contacted', 'approved', 'declined', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2.5 py-1 rounded text-xs border ${
              statusFilter === s ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-card border-border text-text-muted hover:text-text-primary'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-sm text-text-muted">Loading…</div>}
      {!isLoading && rows.length === 0 && (
        <EmptyState
          icon={<ShoppingCart className="w-7 h-7 text-text-muted" />}
          title="No requests"
          description="When customers click Contact Sales on an add-on, they'll land here."
        />
      )}

      <ul className="space-y-3">
        {rows.map(r => (
          <Card key={r.id} padding="md" className="space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">{r.addon?.icon || '📦'}</span>
                  <span className="text-base font-semibold text-text-primary">{r.addon?.name || r.addon_key}</span>
                  <Badge tone={STATUS_TONE[r.status] || 'neutral'}>{r.status}</Badge>
                  {r.addon?.price_hint && <Badge tone="neutral">{r.addon.price_hint}</Badge>}
                </div>
                <div className="text-[11px] text-text-muted font-mono mt-1 flex gap-3 flex-wrap">
                  <span>{r.property?.name || r.property_id?.slice(0, 8)}</span>
                  <span><Mail className="w-3 h-3 inline" /> {r.contact_email}</span>
                  <span><Clock className="w-3 h-3 inline" /> {new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.message && (
                  <blockquote className="mt-2 pl-3 border-l-2 border-border text-sm text-text-secondary italic">
                    "{r.message}"
                  </blockquote>
                )}
                {r.status_notes && (
                  <p className="mt-2 text-[11px] text-text-muted">Notes: {r.status_notes}</p>
                )}
              </div>
            </div>

            {r.status === 'pending' && (
              <RequestActions
                request={r}
                onAction={(status, notes) => updateStatus.mutate({ id: r.id, status, notes })}
                pending={updateStatus.isPending}
              />
            )}
            {r.status === 'contacted' && (
              <RequestActions
                request={r}
                onAction={(status, notes) => updateStatus.mutate({ id: r.id, status, notes })}
                pending={updateStatus.isPending}
                allowMarkContacted={false}
              />
            )}
          </Card>
        ))}
      </ul>
    </div>
  )
}

function RequestActions({ request, onAction, pending, allowMarkContacted = true }) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [intent, setIntent] = useState(null)

  if (notesOpen && intent) {
    return (
      <div className="bg-bg-card border border-border rounded p-3 space-y-2">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            intent === 'approved' ? 'Optional: terms, pricing notes, expiry…' :
            intent === 'declined' ? 'Optional: why we passed (visible to nobody outside the team)' :
            'Optional: how the conversation went'
          }
          className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setNotesOpen(false); setIntent(null); setNotes('') }}>
            Cancel
          </Button>
          <Button size="sm" disabled={pending} onClick={() => { onAction(intent, notes); setNotesOpen(false); setNotes(''); setIntent(null) }}>
            {pending ? 'Saving…' : `Confirm ${intent}`}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={() => { setIntent('approved'); setNotesOpen(true) }}
        disabled={pending}
      >
        <Check className="w-3.5 h-3.5" /> Approve + enable
      </Button>
      {allowMarkContacted && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onAction('contacted', null)}
          disabled={pending}
        >
          Mark contacted
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setIntent('declined'); setNotesOpen(true) }}
        disabled={pending}
      >
        <X className="w-3.5 h-3.5" /> Decline
      </Button>
    </div>
  )
}
