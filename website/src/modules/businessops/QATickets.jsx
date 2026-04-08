import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const STATUSES = ['open', 'in_progress', 'resolved', 'wont_fix']
const STATUS_COLORS = { open: 'bg-danger/10 text-danger', in_progress: 'bg-warning/10 text-warning', resolved: 'bg-success/10 text-success', wont_fix: 'bg-bg-card text-text-muted' }
const CATEGORIES = ['error', 'new_module', 'new_page', 'regression', 'enhancement', 'bug']

export default function QATickets() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('open')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: '', category: 'bug', assigned_to: '' })

  const { data: tickets } = useQuery({
    queryKey: ['qa-tickets'],
    queryFn: async () => {
      const { data } = await supabase.from('qa_tickets').select('*, assigned:assigned_to(full_name, email), resolver:resolved_by(full_name)').order('created_at', { ascending: false })
      return data || []
    },
  })

  const { data: devProfiles } = useQuery({
    queryKey: ['qa-dev-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email, role').in('role', ['developer', 'businessops'])
      return data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('qa_tickets').insert({
        ...form, priority: form.priority || null, assigned_to: form.assigned_to || null,
        source: 'manual', created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-tickets'] })
      toast({ title: 'Ticket created', type: 'success' })
      setShowCreate(false)
      setForm({ title: '', description: '', priority: '', category: 'bug', assigned_to: '' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      if (updates.status === 'resolved') {
        updates.resolved_by = profile?.id
        updates.resolved_at = new Date().toISOString()
      }
      await supabase.from('qa_tickets').update(updates).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qa-tickets'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await supabase.from('qa_tickets').delete().eq('id', id) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['qa-tickets'] }); toast({ title: 'Deleted', type: 'success' }) },
  })

  const filtered = (tickets || []).filter(t => !filter || t.status === filter)
  const openCount = (tickets || []).filter(t => t.status === 'open').length
  const highCount = (tickets || []).filter(t => t.status === 'open' && t.priority === 'high').length
  const inProgressCount = (tickets || []).filter(t => t.status === 'in_progress').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center">
          <div className="text-[9px] text-text-muted font-mono">Open</div>
          <div className="text-2xl font-bold font-mono text-danger mt-0.5">{openCount}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center">
          <div className="text-[9px] text-text-muted font-mono">High Priority</div>
          <div className="text-2xl font-bold font-mono text-danger mt-0.5">{highCount}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center">
          <div className="text-[9px] text-text-muted font-mono">In Progress</div>
          <div className="text-2xl font-bold font-mono text-warning mt-0.5">{inProgressCount}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center">
          <div className="text-[9px] text-text-muted font-mono">Total</div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-0.5">{(tickets || []).length}</div>
        </div>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-1">
          {['open', 'in_progress', 'resolved', 'wont_fix', ''].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-2 py-1 rounded text-[11px] font-mono ${filter === s ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted'}`}>
              {s ? s.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">+ New Ticket</button>
      </div>

      {showCreate && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <input placeholder="Ticket title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              <option value="">Standard priority</option>
              <option value="high">High priority</option>
              <option value="low">Low priority</option>
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              <option value="">Unassigned</option>
              {(devProfiles || []).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate()} disabled={!form.title} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">Create</button>
            <button onClick={() => setShowCreate(false)} className="text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(t => (
          <div key={t.id} className={`bg-bg-surface border rounded-lg p-4 ${t.priority === 'high' ? 'border-danger/30' : 'border-border'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {t.priority === 'high' && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/30">HIGH</span>}
                  {t.priority === 'low' && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">LOW</span>}
                  <span className="text-sm text-text-primary font-medium">{t.title}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{t.category}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{t.source?.replace('_', ' ')}</span>
                </div>
                {t.description && <p className="text-xs text-text-secondary mt-1">{t.description}</p>}
                {t.error_message && <p className="text-[10px] text-danger font-mono mt-1 truncate">{t.error_message}</p>}
                <div className="flex gap-3 mt-1.5 text-[10px] text-text-muted font-mono flex-wrap">
                  {t.page_url && <span>{t.page_url.replace(window.location.origin, '')}</span>}
                  <span>{new Date(t.created_at).toLocaleString()}</span>
                  {t.assigned?.full_name && <span className="text-accent">Assigned: {t.assigned.full_name}</span>}
                  {t.resolver?.full_name && <span className="text-success">Resolved by: {t.resolver.full_name}</span>}
                </div>
                {t.resolution_notes && <p className="text-[10px] text-success mt-1">{t.resolution_notes}</p>}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <select value={t.status} onChange={e => updateMutation.mutate({ id: t.id, updates: { status: e.target.value } })} className={`text-[10px] font-mono px-2 py-1 rounded focus:outline-none ${STATUS_COLORS[t.status]}`}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <select value={t.assigned_to || ''} onChange={e => updateMutation.mutate({ id: t.id, updates: { assigned_to: e.target.value || null } })} className="text-[10px] font-mono px-2 py-1 rounded bg-bg-card text-text-muted focus:outline-none border border-border">
                  <option value="">Unassigned</option>
                  {(devProfiles || []).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                </select>
                {t.status === 'in_progress' && (
                  <button onClick={() => {
                    const notes = prompt('Resolution notes:')
                    if (notes !== null) updateMutation.mutate({ id: t.id, updates: { status: 'resolved', resolution_notes: notes } })
                  }} className="text-[9px] bg-success/10 text-success px-2 py-1 rounded">Resolve</button>
                )}
                <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(t.id) }} className="text-[9px] text-text-muted hover:text-danger">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-text-muted text-center py-8 text-xs bg-bg-surface border border-border rounded-lg">No tickets match this filter.</div>}
      </div>
    </div>
  )
}
