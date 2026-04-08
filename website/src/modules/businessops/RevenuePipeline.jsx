import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const STAGES = ['lead','contacted','demo_scheduled','demo_completed','trial','negotiation','closed_won','closed_lost']
const STAGE_LABELS = { lead: 'Lead', contacted: 'Contacted', demo_scheduled: 'Demo Scheduled', demo_completed: 'Demo Done', trial: 'On Trial', negotiation: 'Negotiation', closed_won: 'Won', closed_lost: 'Lost' }
const STAGE_COLORS = { lead: 'bg-bg-card text-text-muted', contacted: 'bg-accent/10 text-accent', demo_scheduled: 'bg-warning/10 text-warning', demo_completed: 'bg-warning/10 text-warning', trial: 'bg-accent/10 text-accent', negotiation: 'bg-accent/20 text-accent', closed_won: 'bg-success/10 text-success', closed_lost: 'bg-danger/10 text-danger' }

export default function RevenuePipeline() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ company_name: '', contact_name: '', contact_email: '', industry: '', property_type: 'college', status: 'lead', deal_value: '', monthly_value: '', plan_tier: 'starter', notes: '', source: '' })

  const { data: deals } = useQuery({
    queryKey: ['biz-pipeline'],
    queryFn: async () => { const { data } = await supabase.from('biz_pipeline').select('*').order('created_at', { ascending: false }); return data || [] },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('biz_pipeline').insert({ ...form, deal_value: parseFloat(form.deal_value) || null, monthly_value: parseFloat(form.monthly_value) || null })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biz-pipeline'] }); toast({ title: 'Deal added', type: 'success' }); setShowAdd(false) },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => { await supabase.from('biz_pipeline').update(updates).eq('id', id) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biz-pipeline'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await supabase.from('biz_pipeline').delete().eq('id', id) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biz-pipeline'] }); toast({ title: 'Deleted', type: 'success' }) },
  })

  const active = (deals || []).filter(d => !['closed_won','closed_lost'].includes(d.status))
  const won = (deals || []).filter(d => d.status === 'closed_won')
  const pipeline = active.reduce((s, d) => s + (Number(d.monthly_value) || 0), 0)
  const wonMRR = won.reduce((s, d) => s + (Number(d.monthly_value) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center"><div className="text-[10px] text-text-muted font-mono">Active Deals</div><div className="text-2xl font-bold font-mono text-text-primary mt-1">{active.length}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center"><div className="text-[10px] text-text-muted font-mono">Pipeline MRR</div><div className="text-2xl font-bold font-mono text-accent mt-1">${pipeline.toLocaleString()}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center"><div className="text-[10px] text-text-muted font-mono">Won MRR</div><div className="text-2xl font-bold font-mono text-success mt-1">${wonMRR.toLocaleString()}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center"><div className="text-[10px] text-text-muted font-mono">Won ARR</div><div className="text-2xl font-bold font-mono text-success mt-1">${(wonMRR * 12).toLocaleString()}</div></div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-sm font-mono text-text-muted uppercase">Sales Pipeline</h2>
        <button onClick={() => setShowAdd(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">+ Add Company</button>
      </div>

      {showAdd && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Company Name *" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input placeholder="Contact Name" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input placeholder="Contact Email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input placeholder="Monthly Value ($)" type="number" value={form.monthly_value} onChange={e => setForm({ ...form, monthly_value: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <select value={form.plan_tier} onChange={e => setForm({ ...form, plan_tier: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              <option value="starter">Starter $39</option><option value="pro">Pro $99</option><option value="enterprise">Enterprise</option>
            </select>
            <input placeholder="Source (referral, linkedin, etc)" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addMutation.mutate()} disabled={!form.company_name} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">Add</button>
            <button onClick={() => setShowAdd(false)} className="text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(deals || []).map(d => (
          <div key={d.id} className="bg-bg-surface border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-text-primary">{d.company_name}</span>
                  <select value={d.status} onChange={e => updateMutation.mutate({ id: d.id, updates: { status: e.target.value } })} className={`text-[10px] font-mono px-2 py-0.5 rounded focus:outline-none ${STAGE_COLORS[d.status]}`}>
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                  {d.plan_tier && <span className="text-[10px] font-mono text-accent">{d.plan_tier}</span>}
                </div>
                <div className="flex gap-3 mt-1 text-xs text-text-muted font-mono flex-wrap">
                  {d.contact_name && <span>{d.contact_name}</span>}
                  {d.contact_email && <span>{d.contact_email}</span>}
                  {d.monthly_value && <span className="text-accent">${Number(d.monthly_value).toLocaleString()}/mo</span>}
                  {d.source && <span>via {d.source}</span>}
                </div>
                {d.notes && <div className="text-xs text-text-secondary mt-1">{d.notes}</div>}
              </div>
              <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(d.id) }} className="text-text-muted hover:text-danger text-xs">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
