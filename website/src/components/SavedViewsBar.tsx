import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Bookmark, Save, Trash2, Star } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'

interface SavedView {
  id: string
  name: string
  filters: Record<string, any>
  sort?: Record<string, any> | null
  is_shared: boolean
  is_default: boolean
  user_id: string | null
}

interface Props {
  appliesTo: 'deal' | 'contact' | 'priority' | 'signals'
  // The current filter set applied in the parent. Saving a view
  // captures whatever's here.
  currentFilters: Record<string, any>
  // Called when the user picks a view; parent applies the filters.
  onApply: (filters: Record<string, any>) => void
}

// SavedViewsBar — top-of-page chip strip for picking + saving
// per-user filters. Shared/team views appear with a star icon.
export default function SavedViewsBar({ appliesTo, currentFilters, onApply }: Props) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [shareTeam, setShareTeam] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const { data: views = [] } = useQuery({
    queryKey: ['saved-views', profile?.id, appliesTo],
    enabled: !!profile?.id,
    queryFn: async (): Promise<SavedView[]> => {
      const { data } = await supabase
        .from('saved_views')
        .select('*')
        .eq('applies_to', appliesTo)
        .or(`user_id.eq.${profile!.id},is_shared.eq.true`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
      return (data || []) as SavedView[]
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      if (!profile?.property_id || !profile?.id) return
      const { error } = await supabase.from('saved_views').insert({
        property_id: profile.property_id,
        user_id: profile.id,
        applies_to: appliesTo,
        name: name.trim(),
        filters: currentFilters,
        is_shared: shareTeam,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-views', profile?.id, appliesTo] })
      setCreating(false); setName(''); setShareTeam(false)
      toast({ title: 'View saved', type: 'success' })
    },
    onError: (e: any) => toast({ title: 'Could not save', description: humanError(e), type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_views').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views', profile?.id, appliesTo] }),
  })

  function pick(v: SavedView) {
    setActiveId(v.id)
    onApply(v.filters || {})
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-text-muted">
        <Bookmark className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wider font-mono">Views</span>
      </div>
      {views.map(v => (
        <button
          key={v.id}
          onClick={() => pick(v)}
          className={`group inline-flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
            activeId === v.id
              ? 'bg-accent/10 border-accent text-accent'
              : 'bg-bg-card border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          {v.is_shared && <Star className="w-3 h-3" />}
          {v.name}
          {v.user_id === profile?.id && (
            <span
              role="button"
              aria-label={`Delete view ${v.name}`}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete view "${v.name}"?`)) remove.mutate(v.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  e.preventDefault()
                  if (confirm(`Delete view "${v.name}"?`)) remove.mutate(v.id)
                }
              }}
              className="ml-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </span>
          )}
        </button>
      ))}
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border border-dashed border-border text-text-muted hover:text-accent hover:border-accent"
        >
          <Save className="w-3 h-3" /> Save current
        </button>
      ) : (
        <div className="inline-flex items-center gap-1.5 bg-accent/5 border border-accent/30 rounded px-2 py-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="View name"
            autoFocus
            className="bg-bg-card border border-border rounded px-2 py-0.5 text-xs text-text-primary focus:outline-none focus:border-accent"
          />
          <label className="flex items-center gap-1 text-[10px] text-text-muted">
            <input type="checkbox" checked={shareTeam} onChange={(e) => setShareTeam(e.target.checked)} className="accent-accent w-3 h-3" />
            share with team
          </label>
          <Button size="sm" onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}
