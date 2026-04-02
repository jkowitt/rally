import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { runValuation } from '@/lib/claude'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ValuationEngine() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const [showForm, setShowForm] = useState(false)

  const { data: valuations, isLoading } = useQuery({
    queryKey: ['valuations', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valuations')
        .select('*, assets(name, category)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  const { data: assets } = useQuery({
    queryKey: ['assets-list', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('assets').select('id, name, category').eq('property_id', propertyId).eq('active', true)
      return data || []
    },
    enabled: !!propertyId,
  })

  const valuationMutation = useMutation({
    mutationFn: async (params) => {
      return await runValuation({ ...params, property_id: propertyId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['valuations', propertyId] })
      setShowForm(false)
    },
  })

  // Chart data: last 10 valuations
  const chartData = valuations?.slice(0, 10).reverse().map((v) => ({
    name: v.assets?.name?.slice(0, 12) || v.game_date || 'N/A',
    emv: Number(v.calculated_emv || 0),
    claude: Number(v.claude_suggested_emv || 0),
  })) || []

  const totalEMV = valuations?.reduce((sum, v) => sum + Number(v.calculated_emv || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">VALORA</h1>
          <p className="text-text-secondary text-sm mt-1">
            AI-powered media valuation engine &middot; {valuations?.length || 0} valuations &middot; ${(totalEMV / 1000).toFixed(0)}K total EMV
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">
          + New Valuation
        </button>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4">Recent Valuations</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B92A8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} />
              <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="emv" fill="#E8B84B" name="Calculated EMV" radius={[4, 4, 0, 0]} />
              <Bar dataKey="claude" fill="#52C48A" name="Claude Suggested" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Results Table */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : (
        <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs text-text-muted font-mono">Asset</th>
                <th className="px-4 py-3 text-left text-xs text-text-muted font-mono">Date</th>
                <th className="px-4 py-3 text-right text-xs text-text-muted font-mono">Audience</th>
                <th className="px-4 py-3 text-right text-xs text-text-muted font-mono">Min</th>
                <th className="px-4 py-3 text-right text-xs text-text-muted font-mono">EMV</th>
                <th className="px-4 py-3 text-right text-xs text-text-muted font-mono">Claude EMV</th>
                <th className="px-4 py-3 text-left text-xs text-text-muted font-mono">Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {valuations?.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-bg-card/50">
                  <td className="px-4 py-3 text-text-primary">{v.assets?.name || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs font-mono">{v.game_date || new Date(v.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right text-text-secondary font-mono">{v.audience_size?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-3 text-right text-text-secondary font-mono">{v.broadcast_minutes || '—'}</td>
                  <td className="px-4 py-3 text-right text-accent font-mono">${Number(v.calculated_emv || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-success font-mono">${Number(v.claude_suggested_emv || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-muted text-xs max-w-[200px] truncate">{v.claude_reasoning || '—'}</td>
                </tr>
              ))}
              {(!valuations || valuations.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted text-sm">No valuations yet. Run your first AI-powered valuation.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Valuation Form */}
      {showForm && (
        <ValuationForm
          assets={assets || []}
          onRun={(params) => valuationMutation.mutate(params)}
          onCancel={() => setShowForm(false)}
          running={valuationMutation.isPending}
          error={valuationMutation.error?.message}
        />
      )}
    </div>
  )
}

function ValuationForm({ assets, onRun, onCancel, running, error }) {
  const [form, setForm] = useState({
    asset_id: '',
    broadcast_minutes: '',
    screen_share_percent: '',
    clarity_score: '1.0',
    audience_size: '',
    cpp: '',
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-text-primary mb-1">Run AI Valuation</h2>
        <p className="text-text-muted text-xs mb-4">Claude will analyze broadcast data and return an estimated media value</p>
        <div className="space-y-3">
          <select value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
            <option value="">Select Asset</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.category})</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Broadcast Minutes" value={form.broadcast_minutes} onChange={(e) => setForm({ ...form, broadcast_minutes: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Screen Share %" value={form.screen_share_percent} onChange={(e) => setForm({ ...form, screen_share_percent: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="0.1" placeholder="Clarity Score (0-1)" value={form.clarity_score} onChange={(e) => setForm({ ...form, clarity_score: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Audience Size" value={form.audience_size} onChange={(e) => setForm({ ...form, audience_size: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          </div>
          <input type="number" placeholder="CPP (Cost per Point)" value={form.cpp} onChange={(e) => setForm({ ...form, cpp: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          {error && <div className="text-danger text-xs">{error}</div>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => onRun(form)} disabled={running || !form.asset_id} className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {running ? 'Running AI...' : 'Run Valuation'}
          </button>
          <button onClick={onCancel} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm hover:text-text-primary">Cancel</button>
        </div>
      </div>
    </div>
  )
}
