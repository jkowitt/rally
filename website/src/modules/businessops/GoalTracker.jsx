import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const METRICS = ['signups', 'mrr', 'conversions', 'churn_rate', 'deals_closed', 'arr', 'active_users', 'nps_score']
const METRIC_LABELS = { signups: 'Signups', mrr: 'MRR ($)', conversions: 'Conversions', churn_rate: 'Churn Rate (%)', deals_closed: 'Deals Closed', arr: 'ARR ($)', active_users: 'Active Users', nps_score: 'NPS Score' }

export default function GoalTracker() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [form, setForm] = useState({ period: currentMonth, metric: 'signups', target_value: '', notes: '' })

  const { data: goals } = useQuery({
    queryKey: ['biz-goals'],
    queryFn: async () => { const { data } = await supabase.from('biz_goals').select('*').order('period', { ascending: false }); return data || [] },
  })

  // Auto-calculate actuals from platform data
  const { data: platformStats } = useQuery({
    queryKey: ['biz-platform-stats'],
    queryFn: async () => {
      const thisMonth = new Date().toISOString().slice(0, 7)
      const [profiles, properties, deals] = await Promise.all([
        supabase.from('profiles').select('id, created_at', { count: 'exact', head: false }).limit(2000),
        supabase.from('properties').select('id, plan, created_at').limit(2000),
        supabase.from('deals').select('id, stage, value, created_at').order('created_at', { ascending: false }).limit(2000),
      ])
      const monthSignups = (profiles.data || []).filter(p => p.created_at?.startsWith(thisMonth)).length
      const totalUsers = profiles.data?.length || 0
      const paidProps = (properties.data || []).filter(p => p.plan !== 'free')
      const mrr = paidProps.reduce((s, p) => s + (p.plan === 'starter' ? 39 : p.plan === 'pro' ? 99 : p.plan === 'enterprise' ? 249 : 0), 0)
      return { signups: monthSignups, active_users: totalUsers, mrr, arr: mrr * 12, conversions: paidProps.length, deals_closed: (deals.data || []).filter(d => d.stage === 'Contracted').length }
    },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('biz_goals').insert({ ...form, target_value: parseFloat(form.target_value) || 0, actual_value: platformStats?.[form.metric] || 0 })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biz-goals'] }); toast({ title: 'Goal added', type: 'success' }); setShowAdd(false) },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, actual_value }) => { await supabase.from('biz_goals').update({ actual_value }).eq('id', id) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biz-goals'] }),
  })

  return (
    <div className="space-y-4">
      {/* Live platform stats */}
      {platformStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(platformStats).map(([key, val]) => (
            <div key={key} className="bg-bg-surface border border-border rounded-lg p-3 text-center">
              <div className="text-[9px] text-text-muted font-mono uppercase">{METRIC_LABELS[key] || key}</div>
              <div className="text-lg font-bold font-mono text-accent mt-0.5">{typeof val === 'number' && key.includes('mrr') || key.includes('arr') ? `$${val.toLocaleString()}` : val}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-sm font-mono text-text-muted uppercase">Monthly Goals</h2>
        <button onClick={() => setShowAdd(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">+ Set Goal</button>
      </div>

      {showAdd && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input type="month" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
            <select value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              {METRICS.map(m => <option key={m} value={m}>{METRIC_LABELS[m]}</option>)}
            </select>
            <input type="number" placeholder="Target" value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <button onClick={() => addMutation.mutate()} disabled={!form.target_value} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">Add Goal</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(goals || []).map(g => {
          const pct = g.target_value > 0 ? Math.round((g.actual_value / g.target_value) * 100) : 0
          const isAhead = pct >= 100
          return (
            <div key={g.id} className="bg-bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-primary font-medium">{METRIC_LABELS[g.metric] || g.metric}</span>
                  <span className="text-[10px] font-mono text-text-muted">{g.period}</span>
                </div>
                <span className={`text-sm font-mono font-bold ${isAhead ? 'text-success' : pct >= 70 ? 'text-accent' : 'text-warning'}`}>{pct}%</span>
              </div>
              <div className="w-full bg-bg-card rounded-full h-2 mb-1">
                <div className={`h-2 rounded-full transition-all ${isAhead ? 'bg-success' : pct >= 70 ? 'bg-accent' : 'bg-warning'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted font-mono">
                <span>Actual: {g.actual_value}</span>
                <span>Target: {g.target_value}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
