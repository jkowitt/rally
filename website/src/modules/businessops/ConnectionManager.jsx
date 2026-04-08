import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const CATEGORIES = ['prospect', 'investor', 'advisor', 'partner', 'media', 'industry', 'other']
const STRENGTHS = ['cold', 'warm', 'hot', 'champion']
const STRENGTH_COLORS = { cold: 'bg-bg-card text-text-muted', warm: 'bg-warning/10 text-warning', hot: 'bg-danger/10 text-danger', champion: 'bg-success/10 text-success' }

export default function ConnectionManager() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({ name: '', company: '', title: '', email: '', phone: '', linkedin: '', category: 'prospect', relationship_strength: 'cold', notes: '' })

  const { data: connections } = useQuery({
    queryKey: ['biz-connections'],
    queryFn: async () => { const { data } = await supabase.from('biz_connections').select('*').order('name'); return data || [] },
  })

  const addMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('biz_connections').insert(form); if (error) throw error },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biz-connections'] }); toast({ title: 'Connection added', type: 'success' }); setShowAdd(false); setForm({ name: '', company: '', title: '', email: '', phone: '', linkedin: '', category: 'prospect', relationship_strength: 'cold', notes: '' }) },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => { await supabase.from('biz_connections').update(updates).eq('id', id) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biz-connections'] }),
  })

  const filtered = (connections || []).filter(c => !filter || c.category === filter)
  const byCategory = CATEGORIES.reduce((acc, cat) => { acc[cat] = (connections || []).filter(c => c.category === cat).length; return acc }, {})

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilter('')} className={`px-2 py-1 rounded text-[11px] font-mono ${!filter ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted'}`}>All ({(connections || []).length})</button>
          {CATEGORIES.map(cat => byCategory[cat] > 0 && (
            <button key={cat} onClick={() => setFilter(filter === cat ? '' : cat)} className={`px-2 py-1 rounded text-[11px] font-mono capitalize ${filter === cat ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted'}`}>{cat} ({byCategory[cat]})</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">+ Add</button>
      </div>

      {showAdd && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input placeholder="LinkedIn URL" value={form.linkedin} onChange={e => setForm({ ...form, linkedin: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent capitalize">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => addMutation.mutate()} disabled={!form.name} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">Add</button>
            <button onClick={() => setShowAdd(false)} className="text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className="bg-bg-surface border border-border rounded-lg p-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-text-primary font-medium">{c.name}</span>
                {c.company && <span className="text-xs text-text-muted">{c.company}</span>}
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded capitalize ${STRENGTH_COLORS[c.relationship_strength]}`}>{c.relationship_strength}</span>
                <span className="text-[9px] font-mono text-text-muted capitalize">{c.category}</span>
              </div>
              <div className="flex gap-3 mt-0.5 text-[11px] text-text-muted font-mono flex-wrap">
                {c.title && <span>{c.title}</span>}
                {c.email && <span>{c.email}</span>}
                {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">LinkedIn</a>}
              </div>
            </div>
            <select value={c.relationship_strength} onChange={e => updateMutation.mutate({ id: c.id, updates: { relationship_strength: e.target.value } })} className={`text-[10px] font-mono px-2 py-1 rounded focus:outline-none ${STRENGTH_COLORS[c.relationship_strength]}`}>
              {STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
