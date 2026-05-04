import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { X } from 'lucide-react'

const STAGES = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed', 'Declined']
const PRIORITIES = ['High', 'Medium', 'Low']

interface Props {
  selectedIds: string[]
  teamProfiles?: Array<{ id: string; full_name: string | null; email: string | null; role: string | null }>
  onClear: () => void
  // Called after a successful bulk write so the parent can refetch.
  onAfterUpdate?: () => void
}

// BulkEditBar — sticky-bottom bar that appears when one or more
// deals are selected. Lets the rep change stage, priority, owner,
// or the account lead across many deals in a single round-trip.
export default function BulkEditBar({ selectedIds, teamProfiles, onClear, onAfterUpdate }: Props) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [op, setOp] = useState<'stage' | 'priority' | 'lead' | 'tag' | null>(null)
  const [value, setValue] = useState<string>('')

  // Lazy-fetch team profiles only when the lead operation is picked
  // (and only if the parent didn't pass them in). Keeps the bar
  // cheap when nothing is selected.
  const { data: fetchedProfiles = [] } = useQuery({
    queryKey: ['bulk-team-profiles', profile?.property_id],
    enabled: op === 'lead' && !teamProfiles && !!profile?.property_id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles')
        .select('id, full_name, email, role')
        .eq('property_id', profile!.property_id)
      return data || []
    },
  })
  const profiles = teamProfiles || fetchedProfiles

  const bulkUpdate = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0 || !op) return
      const patch: Record<string, any> = {}
      if (op === 'stage') patch.stage = value
      else if (op === 'priority') patch.priority = value
      else if (op === 'lead') patch.account_lead_id = value || null
      else if (op === 'tag') {
        // Append a tag to every selected deal. Postgres array append
        // on a per-row basis isn't a single update, so we fan out.
        for (const id of selectedIds) {
          const { data: row } = await supabase.from('deals').select('tags').eq('id', id).maybeSingle()
          const next = Array.from(new Set([...(row?.tags || []), value]))
          await supabase.from('deals').update({ tags: next }).eq('id', id)
        }
        return
      }
      const { error } = await supabase.from('deals').update(patch).in('id', selectedIds)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      onAfterUpdate?.()
      toast({ title: `Updated ${selectedIds.length} deal${selectedIds.length === 1 ? '' : 's'}`, type: 'success' })
      setOp(null); setValue('')
      onClear()
    },
    onError: (e: any) => toast({ title: 'Bulk update failed', description: humanError(e), type: 'error' }),
  })

  if (selectedIds.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-bg-surface border border-accent/40 rounded-lg shadow-xl p-3 flex items-center gap-2 flex-wrap max-w-[calc(100vw-2rem)]">
      <span className="text-sm font-medium text-text-primary px-2">
        {selectedIds.length} selected
      </span>

      {!op && (
        <>
          <Button size="sm" variant="secondary" onClick={() => { setOp('stage'); setValue('Negotiation') }}>Change stage</Button>
          <Button size="sm" variant="secondary" onClick={() => { setOp('priority'); setValue('Medium') }}>Set priority</Button>
          <Button size="sm" variant="secondary" onClick={() => { setOp('lead'); setValue('') }}>Reassign lead</Button>
          <Button size="sm" variant="secondary" onClick={() => { setOp('tag'); setValue('') }}>Add tag</Button>
        </>
      )}

      {op === 'stage' && (
        <>
          <select value={value} onChange={(e) => setValue(e.target.value)} className="bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" onClick={() => bulkUpdate.mutate()} disabled={bulkUpdate.isPending}>
            {bulkUpdate.isPending ? 'Updating…' : `Apply to ${selectedIds.length}`}
          </Button>
        </>
      )}
      {op === 'priority' && (
        <>
          <select value={value} onChange={(e) => setValue(e.target.value)} className="bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
            {PRIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" onClick={() => bulkUpdate.mutate()} disabled={bulkUpdate.isPending}>
            {bulkUpdate.isPending ? 'Updating…' : `Apply to ${selectedIds.length}`}
          </Button>
        </>
      )}
      {op === 'lead' && (
        <>
          <select value={value} onChange={(e) => setValue(e.target.value)} className="bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
            <option value="">— unassigned —</option>
            {profiles.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
          <Button size="sm" onClick={() => bulkUpdate.mutate()} disabled={bulkUpdate.isPending}>
            {bulkUpdate.isPending ? 'Updating…' : `Apply to ${selectedIds.length}`}
          </Button>
        </>
      )}
      {op === 'tag' && (
        <>
          <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="tag name" autoFocus
                 className="bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
          <Button size="sm" disabled={!value.trim() || bulkUpdate.isPending} onClick={() => bulkUpdate.mutate()}>
            {bulkUpdate.isPending ? 'Tagging…' : `Tag ${selectedIds.length}`}
          </Button>
        </>
      )}

      {op && (
        <button onClick={() => { setOp(null); setValue('') }} className="text-text-muted hover:text-text-primary p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="w-px h-6 bg-border" />
      <button onClick={onClear} className="text-xs text-text-muted hover:text-text-primary">Clear</button>
    </div>
  )
}
