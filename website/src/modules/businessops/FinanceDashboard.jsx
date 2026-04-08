import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function FinanceDashboard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [form, setForm] = useState({ month: currentMonth, category: 'revenue', subcategory: '', amount: '', description: '', recurring: false })

  const { data: entries } = useQuery({
    queryKey: ['biz-finances'],
    queryFn: async () => { const { data } = await supabase.from('biz_finances').select('*').order('month', { ascending: false }); return data || [] },
  })

  // Auto-calculate MRR from properties
  const { data: autoRevenue } = useQuery({
    queryKey: ['biz-auto-revenue'],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('plan')
      const mrr = (data || []).reduce((s, p) => s + (p.plan === 'starter' ? 39 : p.plan === 'pro' ? 99 : p.plan === 'enterprise' ? 249 : 0), 0)
      return { mrr, arr: mrr * 12, paidCount: (data || []).filter(p => p.plan !== 'free').length }
    },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('biz_finances').insert({ ...form, amount: parseFloat(form.amount) || 0 })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biz-finances'] }); toast({ title: 'Entry added', type: 'success' }); setShowAdd(false) },
  })

  const months = [...new Set((entries || []).map(e => e.month))].sort().reverse()
  const totalRevenue = (entries || []).filter(e => e.category === 'revenue').reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const totalExpenses = (entries || []).filter(e => e.category === 'expense').reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const profit = totalRevenue - totalExpenses

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center"><div className="text-[10px] text-text-muted font-mono">Live MRR</div><div className="text-xl font-bold font-mono text-accent mt-1">${autoRevenue?.mrr?.toLocaleString() || 0}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center"><div className="text-[10px] text-text-muted font-mono">Live ARR</div><div className="text-xl font-bold font-mono text-accent mt-1">${autoRevenue?.arr?.toLocaleString() || 0}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center"><div className="text-[10px] text-text-muted font-mono">Recorded Revenue</div><div className="text-xl font-bold font-mono text-success mt-1">${totalRevenue.toLocaleString()}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center"><div className="text-[10px] text-text-muted font-mono">Expenses</div><div className="text-xl font-bold font-mono text-danger mt-1">${totalExpenses.toLocaleString()}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center"><div className="text-[10px] text-text-muted font-mono">Profit/Loss</div><div className={`text-xl font-bold font-mono mt-1 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>${profit.toLocaleString()}</div></div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-sm font-mono text-text-muted uppercase">Financial Entries</h2>
        <button onClick={() => setShowAdd(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">+ Add Entry</button>
      </div>

      {showAdd && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              <option value="revenue">Revenue</option><option value="expense">Expense</option><option value="investment">Investment</option>
            </select>
            <input placeholder="Subcategory (hosting, api, etc)" value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Amount ($)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} className="accent-accent" />Recurring monthly</label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => addMutation.mutate()} disabled={!form.amount} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">Add</button>
            <button onClick={() => setShowAdd(false)} className="text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      {months.map(month => {
        const monthEntries = (entries || []).filter(e => e.month === month)
        const rev = monthEntries.filter(e => e.category === 'revenue').reduce((s, e) => s + (Number(e.amount) || 0), 0)
        const exp = monthEntries.filter(e => e.category === 'expense').reduce((s, e) => s + (Number(e.amount) || 0), 0)
        return (
          <div key={month} className="bg-bg-surface border border-border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-mono text-text-primary">{new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <span className={`text-sm font-mono font-bold ${rev - exp >= 0 ? 'text-success' : 'text-danger'}`}>${(rev - exp).toLocaleString()} net</span>
            </div>
            <div className="space-y-1">
              {monthEntries.map(e => (
                <div key={e.id} className="flex items-center justify-between py-1 border-b border-border last:border-0 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono px-1.5 py-0.5 rounded text-[9px] ${e.category === 'revenue' ? 'bg-success/10 text-success' : e.category === 'expense' ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'}`}>{e.category}</span>
                    <span className="text-text-secondary">{e.subcategory || e.description}</span>
                    {e.recurring && <span className="text-[8px] text-text-muted font-mono">recurring</span>}
                  </div>
                  <span className={`font-mono ${e.category === 'revenue' ? 'text-success' : 'text-danger'}`}>${Number(e.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
