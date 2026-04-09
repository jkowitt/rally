import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CHANNELS = ['linkedin', 'google', 'facebook', 'instagram', 'twitter', 'content', 'events', 'referral', 'other']

export default function AdSpendManager() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', channel: 'linkedin', monthly_budget: '', cpm: '25', impressions: '', clicks: '', signups: '', conversions: '', start_date: '', status: 'planned', notes: '' })

  const { data: campaigns } = useQuery({
    queryKey: ['biz-ad-campaigns'],
    queryFn: async () => { const { data } = await supabase.from('biz_ad_campaigns').select('*').order('created_at', { ascending: false }); return data || [] },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('biz_ad_campaigns').insert({
        ...form,
        monthly_budget: parseFloat(form.monthly_budget) || 0,
        cpm: parseFloat(form.cpm) || 0,
        impressions: parseInt(form.impressions) || 0,
        clicks: parseInt(form.clicks) || 0,
        signups: parseInt(form.signups) || 0,
        conversions: parseInt(form.conversions) || 0,
      })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['biz-ad-campaigns'] }); toast({ title: 'Campaign added', type: 'success' }); setShowAdd(false) },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => { await supabase.from('biz_ad_campaigns').update(updates).eq('id', id) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biz-ad-campaigns'] }),
  })

  const totalSpend = (campaigns || []).reduce((s, c) => s + (Number(c.monthly_budget) || 0), 0)
  const totalImpressions = (campaigns || []).reduce((s, c) => s + (c.impressions || 0), 0)
  const totalClicks = (campaigns || []).reduce((s, c) => s + (c.clicks || 0), 0)
  const totalSignups = (campaigns || []).reduce((s, c) => s + (c.signups || 0), 0)
  const totalConversions = (campaigns || []).reduce((s, c) => s + (c.conversions || 0), 0)
  const cac = totalConversions > 0 ? Math.round(totalSpend / totalConversions) : 0
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0

  const byChannel = CHANNELS.map(ch => ({
    channel: ch,
    spend: (campaigns || []).filter(c => c.channel === ch).reduce((s, c) => s + (Number(c.monthly_budget) || 0), 0),
    signups: (campaigns || []).filter(c => c.channel === ch).reduce((s, c) => s + (c.signups || 0), 0),
  })).filter(c => c.spend > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center"><div className="text-[9px] text-text-muted font-mono">Total Spend</div><div className="text-lg font-bold font-mono text-danger mt-0.5">${totalSpend.toLocaleString()}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center"><div className="text-[9px] text-text-muted font-mono">Impressions</div><div className="text-lg font-bold font-mono text-text-primary mt-0.5">{totalImpressions.toLocaleString()}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center"><div className="text-[9px] text-text-muted font-mono">Clicks</div><div className="text-lg font-bold font-mono text-text-primary mt-0.5">{totalClicks.toLocaleString()}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center"><div className="text-[9px] text-text-muted font-mono">CTR</div><div className="text-lg font-bold font-mono text-accent mt-0.5">{ctr}%</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center"><div className="text-[9px] text-text-muted font-mono">Signups</div><div className="text-lg font-bold font-mono text-success mt-0.5">{totalSignups}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center"><div className="text-[9px] text-text-muted font-mono">CAC</div><div className="text-lg font-bold font-mono text-warning mt-0.5">${cac}</div></div>
      </div>

      {byChannel.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 overflow-x-auto">
          <h3 className="text-xs font-mono text-text-muted uppercase mb-3">Spend by Channel</h3>
          <ResponsiveContainer width="100%" height={160} minWidth={300}>
            <BarChart data={byChannel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
              <XAxis dataKey="channel" tick={{ fontSize: 9, fill: '#8B92A8' }} />
              <YAxis tick={{ fontSize: 9, fill: '#8B92A8' }} />
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="spend" fill="#E05252" radius={[4, 4, 0, 0]} name="Spend $" />
              <Bar dataKey="signups" fill="#52C48A" radius={[4, 4, 0, 0]} name="Signups" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-sm font-mono text-text-muted uppercase">Ad Campaigns</h2>
        <button onClick={() => setShowAdd(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">+ Add Campaign</button>
      </div>

      {showAdd && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Campaign Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent capitalize">{CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <input type="number" placeholder="Monthly Budget $" value={form.monthly_budget} onChange={e => setForm({ ...form, monthly_budget: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="number" placeholder="CPM $" value={form.cpm} onChange={e => setForm({ ...form, cpm: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Impressions" value={form.impressions} onChange={e => setForm({ ...form, impressions: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Signups" value={form.signups} onChange={e => setForm({ ...form, signups: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => addMutation.mutate()} disabled={!form.name} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">Add</button>
            <button onClick={() => setShowAdd(false)} className="text-text-muted text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(campaigns || []).map(c => (
          <div key={c.id} className="bg-bg-surface border border-border rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-text-primary font-medium">{c.name}</span>
                <span className="text-[10px] font-mono bg-bg-card px-1.5 py-0.5 rounded text-text-muted capitalize">{c.channel}</span>
                <select value={c.status} onChange={e => updateMutation.mutate({ id: c.id, updates: { status: e.target.value } })} className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-card text-text-muted focus:outline-none">{['planned','active','paused','completed'].map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <div className="flex gap-3 mt-1 text-[10px] text-text-muted font-mono">
                <span className="text-danger">${Number(c.monthly_budget || 0).toLocaleString()}/mo</span>
                {c.impressions > 0 && <span>{c.impressions.toLocaleString()} impr</span>}
                {c.clicks > 0 && <span>{c.clicks} clicks</span>}
                {c.signups > 0 && <span className="text-success">{c.signups} signups</span>}
                {c.conversions > 0 && <span className="text-accent">{c.conversions} paid</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
