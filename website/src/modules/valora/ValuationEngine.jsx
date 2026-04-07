import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { runValuation } from '@/lib/claude'
import { useIndustryConfig } from '@/hooks/useIndustryConfig'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CHART_COLORS = ['#E8B84B', '#52C48A', '#E0B352', '#E05252', '#8B92A8', '#6B7BFF', '#FF6B9B', '#4ECDC4']

function classifyMarketPosition(emv, marketBaseline) {
  if (!marketBaseline || marketBaseline === 0) return null
  const ratio = emv / marketBaseline
  if (ratio < 0.85) return 'below'
  if (ratio > 1.15) return 'above'
  return 'fair'
}

export default function ValuationEngine() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const config = useIndustryConfig()
  const valoraModel = config.valoraModel
  const valoraLabel = config.moduleLabels?.valora || 'VALORA'
  const propertyId = profile?.property_id
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState('overview') // overview | assets | pricing
  const [selectedAssetId, setSelectedAssetId] = useState(null)

  const { data: valuations, isLoading } = useQuery({
    queryKey: ['valuations', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valuations')
        .select('*, assets(name, category, base_price), deals(brand_name, annual_revenue, employees)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: assets } = useQuery({
    queryKey: ['assets-list', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('assets').select('id, name, category, base_price, quantity').eq('property_id', propertyId).eq('active', true)
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: deals } = useQuery({
    queryKey: ['deals-for-valora', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, brand_name, annual_revenue, employees, sub_industry, stage').eq('property_id', propertyId).order('brand_name')
      return data || []
    },
    enabled: !!propertyId,
  })

  const valuationMutation = useMutation({
    mutationFn: async (params) => runValuation({ ...params, property_id: propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['valuations', propertyId] })
      setShowForm(false)
      toast({ title: 'Valuation complete', type: 'success' })
    },
    onError: (e) => {
      const msg = e?.message || ''
      const description = (msg.includes('FunctionsFetchError') || msg.includes('Failed to fetch') || msg.includes('404'))
        ? 'AI edge functions are not deployed yet. Deploy them in Supabase Dashboard.'
        : (msg.includes('API key') ? 'Anthropic API key is not configured in Supabase secrets.' : msg || 'Please try again.')
      toast({ title: 'Valuation failed', description, type: 'error' })
    },
  })

  // Calculate market baselines per asset category
  const baselines = useMemo(() => {
    const byCategory = {}
    for (const v of valuations || []) {
      const cat = v.assets?.category || 'Unknown'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(Number(v.calculated_emv || 0))
    }
    const result = {}
    for (const cat in byCategory) {
      const sum = byCategory[cat].reduce((a, b) => a + b, 0)
      result[cat] = sum / byCategory[cat].length
    }
    return result
  }, [valuations])

  // Tag each valuation with market position
  const valuationsTagged = useMemo(() =>
    (valuations || []).map(v => {
      const baseline = baselines[v.assets?.category]
      return { ...v, _marketPosition: classifyMarketPosition(Number(v.calculated_emv || 0), baseline), _baseline: baseline }
    }),
    [valuations, baselines]
  )

  const totalEMV = valuationsTagged.reduce((s, v) => s + Number(v.calculated_emv || 0), 0)
  const avgEMV = valuationsTagged.length > 0 ? totalEMV / valuationsTagged.length : 0
  const belowCount = valuationsTagged.filter(v => v._marketPosition === 'below').length
  const aboveCount = valuationsTagged.filter(v => v._marketPosition === 'above').length
  const fairCount = valuationsTagged.filter(v => v._marketPosition === 'fair').length

  // Per-asset aggregated stats
  const assetStats = useMemo(() => {
    const byAsset = {}
    for (const v of valuationsTagged) {
      if (!v.asset_id) continue
      if (!byAsset[v.asset_id]) {
        byAsset[v.asset_id] = {
          asset: v.assets,
          asset_id: v.asset_id,
          valuations: [],
        }
      }
      byAsset[v.asset_id].valuations.push(v)
    }
    return Object.values(byAsset).map(a => {
      const emvs = a.valuations.map(v => Number(v.calculated_emv || 0))
      const sum = emvs.reduce((x, y) => x + y, 0)
      return {
        ...a,
        count: a.valuations.length,
        avgEMV: emvs.length > 0 ? sum / emvs.length : 0,
        maxEMV: Math.max(...emvs, 0),
        minEMV: Math.min(...emvs, 0),
        totalEMV: sum,
      }
    }).sort((a, b) => b.totalEMV - a.totalEMV)
  }, [valuationsTagged])

  // Recent valuations chart
  const chartData = valuationsTagged.slice(0, 10).reverse().map(v => ({
    name: v.assets?.name?.slice(0, 12) || 'N/A',
    emv: Number(v.calculated_emv || 0),
    claude: Number(v.claude_suggested_emv || 0),
  }))

  // EMV by category pie chart
  const categoryPie = Object.entries(baselines).map(([name, avg]) => ({
    name,
    value: valuationsTagged.filter(v => v.assets?.category === name).reduce((s, v) => s + Number(v.calculated_emv || 0), 0),
  })).filter(c => c.value > 0)

  // Trend over time (group by month)
  const trendData = useMemo(() => {
    const byMonth = {}
    for (const v of valuationsTagged) {
      const d = new Date(v.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { month: key, total: 0, count: 0 }
      byMonth[key].total += Number(v.calculated_emv || 0)
      byMonth[key].count += 1
    }
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map(m => ({
      month: m.month,
      emv: m.total,
      avg: m.total / m.count,
    }))
  }, [valuationsTagged])

  const selectedAssetDetail = selectedAssetId ? assetStats.find(a => a.asset_id === selectedAssetId) : null

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">{valoraLabel}</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            AI media valuation engine &middot; {valuationsTagged.length} valuations &middot; ${(totalEMV / 1000).toFixed(0)}K total EMV
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">
          + New Valuation
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <StatCard label="Total EMV" value={`$${(totalEMV / 1000).toFixed(0)}K`} color="text-accent" />
        <StatCard label="Avg per Asset" value={`$${(avgEMV / 1000).toFixed(0)}K`} color="text-text-primary" />
        <StatCard label="Above Market" value={aboveCount} color="text-success" sub={`${valuationsTagged.length > 0 ? Math.round(aboveCount / valuationsTagged.length * 100) : 0}%`} />
        <StatCard label="Fair Market" value={fairCount} color="text-warning" sub={`${valuationsTagged.length > 0 ? Math.round(fairCount / valuationsTagged.length * 100) : 0}%`} />
        <StatCard label="Below Market" value={belowCount} color="text-danger" sub={`${valuationsTagged.length > 0 ? Math.round(belowCount / valuationsTagged.length * 100) : 0}%`} />
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'assets', label: 'Asset Pricing' },
          { key: 'pricing', label: 'All Valuations' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${view === key ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW VIEW */}
      {view === 'overview' && (
        <div className="space-y-4">
          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-bg-surface border border-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Recent Valuations</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B92A8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} />
                    <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="emv" fill="#E8B84B" name="Calculated" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="claude" fill="#52C48A" name="Claude EMV" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {categoryPie.length > 0 && (
                <div className="bg-bg-surface border border-border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-3">EMV by Category</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categoryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name.slice(0, 8)} labelLine={false}>
                        {categoryPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} formatter={(v) => `$${Number(v).toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
          {trendData.length > 1 && (
            <div className="bg-bg-surface border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">EMV Trend (12 months)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2435" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8B92A8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#8B92A8' }} />
                  <Tooltip contentStyle={{ background: '#141820', border: '1px solid #1E2435', borderRadius: 6, fontSize: 12 }} />
                  <Line type="monotone" dataKey="emv" stroke="#E8B84B" strokeWidth={2} name="Total EMV" />
                  <Line type="monotone" dataKey="avg" stroke="#52C48A" strokeWidth={2} name="Avg EMV" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ASSET PRICING VIEW */}
      {view === 'assets' && (
        <div className="space-y-3">
          {assetStats.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12 bg-bg-surface border border-border rounded-lg">
              No asset valuations yet. Run your first valuation to see pricing analytics.
            </div>
          ) : (
            assetStats.map(a => (
              <div key={a.asset_id} className="bg-bg-surface border border-border rounded-lg p-4 hover:border-accent/30 transition-colors cursor-pointer" onClick={() => setSelectedAssetId(selectedAssetId === a.asset_id ? null : a.asset_id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text-primary">{a.asset?.name || 'Unknown'}</span>
                      <span className="text-[10px] font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded">{a.asset?.category}</span>
                    </div>
                    <div className="flex gap-4 mt-1 text-[11px] text-text-muted font-mono">
                      <span>{a.count} valuations</span>
                      {a.asset?.base_price && <span>Base: ${Number(a.asset.base_price).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono text-accent">${Math.round(a.avgEMV).toLocaleString()}</div>
                    <div className="text-[10px] text-text-muted font-mono">avg EMV</div>
                  </div>
                </div>
                {/* Price range bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-text-muted font-mono mb-1">
                    <span>${Math.round(a.minEMV).toLocaleString()}</span>
                    <span>${Math.round(a.maxEMV).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-bg-card rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-danger via-warning to-success h-1.5" style={{ width: '100%' }} />
                  </div>
                </div>
                {/* Expanded detail */}
                {selectedAssetId === a.asset_id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    {a.valuations.slice(0, 5).map(v => (
                      <div key={v.id} className="flex items-center justify-between text-[11px]">
                        <span className="text-text-muted font-mono">{new Date(v.created_at).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          {v._marketPosition && (
                            <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                              v._marketPosition === 'above' ? 'bg-success/10 text-success' :
                              v._marketPosition === 'below' ? 'bg-danger/10 text-danger' :
                              'bg-warning/10 text-warning'
                            }`}>
                              {v._marketPosition}
                            </span>
                          )}
                          <span className="text-accent font-mono">${Number(v.calculated_emv || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    <div className="text-[10px] text-text-muted italic pt-1 border-t border-border/50">
                      Recommended pricing: ${Math.round(a.avgEMV * 1.1).toLocaleString()} ({a.avgEMV > (a.asset?.base_price || 0) ? 'raise' : 'maintain'} from current base)
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ALL VALUATIONS TABLE */}
      {view === 'pricing' && (
        <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
          ) : valuationsTagged.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-12">No valuations yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs text-text-muted font-mono">Asset</th>
                    <th className="px-4 py-3 text-left text-xs text-text-muted font-mono">Brand</th>
                    <th className="px-4 py-3 text-left text-xs text-text-muted font-mono">Date</th>
                    <th className="px-4 py-3 text-right text-xs text-text-muted font-mono">Audience</th>
                    <th className="px-4 py-3 text-right text-xs text-text-muted font-mono">EMV</th>
                    <th className="px-4 py-3 text-right text-xs text-text-muted font-mono">Claude</th>
                    <th className="px-4 py-3 text-center text-xs text-text-muted font-mono">Market</th>
                  </tr>
                </thead>
                <tbody>
                  {valuationsTagged.map(v => (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-bg-card/50">
                      <td className="px-4 py-3 text-text-primary text-xs">{v.assets?.name || '—'}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{v.deals?.brand_name || '—'}</td>
                      <td className="px-4 py-3 text-text-muted text-[11px] font-mono">{new Date(v.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right text-text-secondary font-mono text-xs">{v.audience_size?.toLocaleString() || '—'}</td>
                      <td className="px-4 py-3 text-right text-accent font-mono text-xs">${Number(v.calculated_emv || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-success font-mono text-xs">${Number(v.claude_suggested_emv || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        {v._marketPosition && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            v._marketPosition === 'above' ? 'bg-success/10 text-success' :
                            v._marketPosition === 'below' ? 'bg-danger/10 text-danger' :
                            'bg-warning/10 text-warning'
                          }`}>
                            {v._marketPosition}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <ValuationForm
          assets={assets || []}
          deals={deals || []}
          onRun={(params) => valuationMutation.mutate(params)}
          onCancel={() => setShowForm(false)}
          running={valuationMutation.isPending}
          error={valuationMutation.error?.message}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] text-text-muted font-mono uppercase truncate">{label}</div>
      <div className={`text-lg sm:text-xl font-semibold font-mono ${color} mt-0.5`}>{value}</div>
      {sub && <div className="text-[10px] text-text-muted font-mono">{sub}</div>}
    </div>
  )
}

function ValuationForm({ assets, deals, onRun, onCancel, running, error }) {
  const [form, setForm] = useState({
    asset_id: '',
    deal_id: '',
    broadcast_minutes: '',
    screen_share_percent: '',
    clarity_score: '1.0',
    audience_size: '',
    cpp: '',
  })

  const selectedDeal = deals.find(d => d.id === form.deal_id)

  // Live EMV preview
  const preview = useMemo(() => {
    const min = parseFloat(form.broadcast_minutes) || 0
    const share = parseFloat(form.screen_share_percent) || 0
    const clarity = parseFloat(form.clarity_score) || 1
    const audience = parseFloat(form.audience_size) || 0
    const cpp = parseFloat(form.cpp) || 0
    if (!min || !audience || !cpp) return null
    return min * (share / 100) * clarity * (audience / 1000) * cpp
  }, [form])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-text-primary mb-1">Run AI Valuation</h2>
        <p className="text-text-muted text-xs mb-4">Claude analyzes broadcast data and returns an estimated media value</p>
        <div className="space-y-3">
          <select value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
            <option value="">Select Asset *</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.category})</option>)}
          </select>
          <select value={form.deal_id} onChange={(e) => setForm({ ...form, deal_id: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
            <option value="">Link to deal (optional)</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.brand_name}</option>)}
          </select>
          {selectedDeal && (selectedDeal.annual_revenue || selectedDeal.employees) && (
            <div className="text-[10px] text-text-muted font-mono bg-bg-card border border-border rounded px-2 py-1.5">
              {selectedDeal.annual_revenue && <span>Revenue: ${Number(selectedDeal.annual_revenue).toLocaleString()}</span>}
              {selectedDeal.employees && <span className="ml-2">&middot; {selectedDeal.employees} employees</span>}
              {selectedDeal.sub_industry && <span className="ml-2">&middot; {selectedDeal.sub_industry}</span>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Broadcast Minutes" value={form.broadcast_minutes} onChange={(e) => setForm({ ...form, broadcast_minutes: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Screen Share %" value={form.screen_share_percent} onChange={(e) => setForm({ ...form, screen_share_percent: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="0.1" placeholder="Clarity (0-1)" value={form.clarity_score} onChange={(e) => setForm({ ...form, clarity_score: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="number" placeholder="Audience Size" value={form.audience_size} onChange={(e) => setForm({ ...form, audience_size: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          </div>
          <input type="number" placeholder="CPP (Cost per Point)" value={form.cpp} onChange={(e) => setForm({ ...form, cpp: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          {preview !== null && preview > 0 && (
            <div className="bg-accent/10 border border-accent/30 rounded px-3 py-2 text-center">
              <div className="text-[10px] text-text-muted font-mono uppercase">Preview EMV</div>
              <div className="text-lg font-semibold text-accent font-mono">${Math.round(preview).toLocaleString()}</div>
            </div>
          )}
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
