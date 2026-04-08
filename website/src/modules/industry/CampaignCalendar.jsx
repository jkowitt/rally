import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const STATUSES = ['planned', 'live', 'completed', 'paused', 'cancelled']

const STATUS_COLORS = {
  planned: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  live: 'bg-green-500/20 text-green-300 border-green-500/40',
  completed: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  paused: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/40',
}

const PLACEMENT_TYPES = ['display', 'video', 'audio', 'print', 'social', 'email', 'native', 'sponsorship', 'other']

const EMPTY_FORM = {
  name: '',
  advertiser: '',
  placement_type: 'display',
  start_date: '',
  end_date: '',
  impressions_target: '',
  impressions_delivered: '',
  budget: '',
  status: 'planned',
  notes: '',
}

export default function CampaignCalendar() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [showForm, setShowForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState('')

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['ad_campaigns', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .eq('property_id', propertyId)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  // Save
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const record = {
        ...payload,
        impressions_target: Number(payload.impressions_target) || 0,
        impressions_delivered: Number(payload.impressions_delivered) || 0,
        budget: Number(payload.budget) || 0,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
      }
      if (record.id) {
        const { data, error } = await supabase.from('ad_campaigns').update(record).eq('id', record.id).select().single()
        if (error) throw error
        return data
      }
      delete record.id
      const { data, error } = await supabase.from('ad_campaigns').insert({ ...record, property_id: propertyId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad_campaigns', propertyId] })
      toast({ title: 'Campaign saved', type: 'success' })
      resetForm()
    },
    onError: (err) => toast({ title: 'Error saving campaign', description: err.message, type: 'error' }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('ad_campaigns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad_campaigns', propertyId] })
      toast({ title: 'Campaign deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting campaign', description: err.message, type: 'error' }),
  })

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingCampaign(null)
    setShowForm(false)
  }

  function openEdit(campaign) {
    setEditingCampaign(campaign)
    setForm({
      name: campaign.name || '',
      advertiser: campaign.advertiser || '',
      placement_type: campaign.placement_type || 'display',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      impressions_target: campaign.impressions_target || '',
      impressions_delivered: campaign.impressions_delivered || '',
      budget: campaign.budget || '',
      status: campaign.status || 'planned',
      notes: campaign.notes || '',
    })
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    if (editingCampaign) payload.id = editingCampaign.id
    saveMutation.mutate(payload)
  }

  const filtered = (campaigns || []).filter((c) => !filterStatus || c.status === filterStatus)

  // Group by month
  const grouped = filtered.reduce((acc, campaign) => {
    const date = campaign.start_date ? new Date(campaign.start_date) : null
    const key = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : 'No Date'
    const label = date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'No Date'
    if (!acc[key]) acc[key] = { label, campaigns: [] }
    acc[key].campaigns.push(campaign)
    return acc
  }, {})
  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // Summary
  const totalBudget = (campaigns || []).reduce((s, c) => s + (Number(c.budget) || 0), 0)
  const activeCampaigns = (campaigns || []).filter((c) => c.status === 'live').length
  const totalImpressionsDelivered = (campaigns || []).reduce((s, c) => s + (Number(c.impressions_delivered) || 0), 0)
  const totalImpressionsTarget = (campaigns || []).reduce((s, c) => s + (Number(c.impressions_target) || 0), 0)

  const formatPlacement = (p) => p.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Campaign Calendar</h1>
          <p className="text-text-secondary text-sm mt-1">
            {campaigns?.length || 0} campaigns &middot; {activeCampaigns} currently live
          </p>
        </div>
        <button
          onClick={() => { setEditingCampaign(null); setForm(EMPTY_FORM); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + Add Campaign
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Budget</div>
          <div className="text-2xl font-semibold text-accent mt-1">${totalBudget.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Active Campaigns</div>
          <div className="text-2xl font-semibold text-green-400 mt-1">{activeCampaigns}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Impressions Delivered</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalImpressionsDelivered.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Delivery Rate</div>
          <div className="text-2xl font-semibold text-accent mt-1">
            {totalImpressionsTarget > 0 ? Math.round((totalImpressionsDelivered / totalImpressionsTarget) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-secondary">Status:</span>
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1 rounded text-xs font-mono transition-colors ${!filterStatus ? 'bg-accent text-bg-primary' : 'bg-bg-card border border-border text-text-secondary hover:border-accent'}`}
        >
          All
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${filterStatus === status ? 'bg-accent text-bg-primary' : 'bg-bg-card border border-border text-text-secondary hover:border-accent'}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {editingCampaign ? 'Edit Campaign' : 'Add Campaign'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Campaign Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Advertiser</label>
              <input
                type="text"
                value={form.advertiser}
                onChange={(e) => setForm({ ...form, advertiser: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Placement Type</label>
              <select
                value={form.placement_type}
                onChange={(e) => setForm({ ...form, placement_type: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {PLACEMENT_TYPES.map((p) => (
                  <option key={p} value={p}>{formatPlacement(p)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Impressions Target</label>
              <input
                type="number"
                value={form.impressions_target}
                onChange={(e) => setForm({ ...form, impressions_target: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Impressions Delivered</label>
              <input
                type="number"
                value={form.impressions_delivered}
                onChange={(e) => setForm({ ...form, impressions_delivered: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Budget ($)</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs text-text-secondary mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded text-sm text-text-secondary border border-border hover:border-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving...' : editingCampaign ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-bg-surface rounded w-1/4 mb-3" />
              <div className="h-16 bg-bg-surface rounded w-full mb-2" />
              <div className="h-3 bg-bg-surface rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-text-secondary text-sm">No campaigns found.</p>
          <p className="text-text-muted text-xs mt-1">Click "Add Campaign" to create your first ad campaign.</p>
        </div>
      )}

      {/* Campaigns grouped by month */}
      {!isLoading && filtered.length > 0 && sortedMonths.map((monthKey) => (
        <div key={monthKey}>
          <h3 className="text-sm font-mono font-medium text-text-secondary mb-2">{grouped[monthKey].label}</h3>
          <div className="space-y-2">
            {grouped[monthKey].campaigns.map((campaign) => {
              const target = Number(campaign.impressions_target) || 0
              const delivered = Number(campaign.impressions_delivered) || 0
              const pct = target > 0 ? Math.min(Math.round((delivered / target) * 100), 100) : 0
              return (
                <div key={campaign.id} className="bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">{campaign.name}</div>
                        <div className="text-xs text-text-secondary font-mono">
                          {campaign.advertiser} &middot; {formatPlacement(campaign.placement_type || 'other')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${STATUS_COLORS[campaign.status] || 'text-text-secondary'}`}>
                        {campaign.status?.charAt(0).toUpperCase() + campaign.status?.slice(1)}
                      </span>
                      <span className="text-sm font-semibold text-accent font-mono">${Number(campaign.budget || 0).toLocaleString()}</span>
                      <button onClick={() => openEdit(campaign)} className="text-text-muted hover:text-accent text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-accent/50">Edit</button>
                      <button onClick={() => { if (window.confirm('Delete this campaign?')) deleteMutation.mutate(campaign.id) }} className="text-text-muted hover:text-red-400 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/50">Del</button>
                    </div>
                  </div>
                  {/* Dates */}
                  <div className="text-xs text-text-muted font-mono mb-2">
                    {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'TBD'} - {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'TBD'}
                  </div>
                  {/* Impressions progress */}
                  {target > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                        <span>Impressions: {delivered.toLocaleString()} / {target.toLocaleString()}</span>
                        <span className="font-mono text-accent">{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: '#E8B84B' }}
                        />
                      </div>
                    </div>
                  )}
                  {campaign.notes && (
                    <div className="text-xs text-text-muted mt-2 truncate">{campaign.notes}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
