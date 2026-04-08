import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const STATUSES = ['backlog', 'planned', 'in_progress', 'review', 'shipped', 'cancelled']
const STATUS_COLORS = { backlog: 'bg-bg-card text-text-muted', planned: 'bg-accent/10 text-accent', in_progress: 'bg-warning/10 text-warning', review: 'bg-accent/20 text-accent', shipped: 'bg-success/10 text-success', cancelled: 'bg-danger/10 text-danger' }
const PRIORITIES = ['critical', 'high', 'medium', 'low']
const EFFORTS = ['xs', 's', 'm', 'l', 'xl']

export default function RoadmapTracker() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({ title: '', description: '', category: 'feature', priority: 'medium', effort: 'm', impact: 'medium', status: 'backlog', target_date: '', requested_by: '' })

  const { data: items } = useQuery({
    queryKey: ['biz-roadmap'],
    queryFn: async () => { const { data } = await supabase.from('biz_roadmap').select('*').order('created_at', { ascending: false }); return data || [] },
  })

  const addMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('biz_roadmap').insert(form); if (error) throw error },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biz-roadmap'] }); toast({ title: 'Item added', type: 'success' }); setShowAdd(false) },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      if (updates.status === 'shipped') updates.shipped_date = new Date().toISOString().slice(0, 10)
      await supabase.from('biz_roadmap').update(updates).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biz-roadmap'] }),
  })

  const filtered = (items || []).filter(i => !filter || i.status === filter)
  const byStatus = STATUSES.reduce((acc, s) => { acc[s] = (items || []).filter(i => i.status === s).length; return acc }, {})

  // Score = impact × inverse effort
  const impactMap = { low: 1, medium: 2, high: 3, critical: 4 }
  const effortMap = { xs: 5, s: 4, m: 3, l: 2, xl: 1 }
  const scored = [...filtered].sort((a, b) => {
    const scoreA = (impactMap[a.impact] || 2) * (effortMap[a.effort] || 3)
    const scoreB = (impactMap[b.impact] || 2) * (effortMap[b.effort] || 3)
    return scoreB - scoreA
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilter('')} className={`px-2 py-1 rounded text-[11px] font-mono ${!filter ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted'}`}>All ({(items || []).length})</button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(filter === s ? '' : s)} className={`px-2 py-1 rounded text-[11px] font-mono capitalize ${filter === s ? 'bg-accent text-bg-primary' : `${STATUS_COLORS[s]} border border-border`}`}>{s.replace('_', ' ')} ({byStatus[s]})</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">+ Add Item</button>
      </div>

      {showAdd && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="sm:col-span-2 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              {['feature', 'bug', 'integration', 'infrastructure', 'design'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.effort} onChange={e => setForm({ ...form, effort: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              {EFFORTS.map(e => <option key={e} value={e}>{e.toUpperCase()}</option>)}
            </select>
            <select value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              {['low', 'medium', 'high', 'critical'].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="sm:col-span-3 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" rows={2} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addMutation.mutate()} disabled={!form.title} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">Add</button>
            <button onClick={() => setShowAdd(false)} className="text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {scored.map(item => {
          const score = (impactMap[item.impact] || 2) * (effortMap[item.effort] || 3)
          return (
            <div key={item.id} className="bg-bg-surface border border-border rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text-primary font-medium">{item.title}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded capitalize ${STATUS_COLORS[item.status]}`}>{item.status.replace('_', ' ')}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${item.priority === 'critical' ? 'bg-danger/10 text-danger' : item.priority === 'high' ? 'bg-warning/10 text-warning' : 'bg-bg-card text-text-muted'}`}>{item.priority}</span>
                    <span className="text-[9px] font-mono text-text-muted capitalize">{item.category}</span>
                    <span className="text-[9px] font-mono text-accent" title="Priority score (impact × ease)">Score: {score}</span>
                  </div>
                  {item.description && <div className="text-xs text-text-secondary mt-1">{item.description}</div>}
                  <div className="flex gap-2 mt-1 text-[10px] text-text-muted font-mono">
                    <span>Effort: {item.effort?.toUpperCase()}</span>
                    <span>Impact: {item.impact}</span>
                    {item.target_date && <span>Target: {item.target_date}</span>}
                    {item.shipped_date && <span className="text-success">Shipped: {item.shipped_date}</span>}
                  </div>
                </div>
                <select value={item.status} onChange={e => updateMutation.mutate({ id: item.id, updates: { status: e.target.value } })} className={`text-[10px] font-mono px-2 py-1 rounded focus:outline-none ${STATUS_COLORS[item.status]}`}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
