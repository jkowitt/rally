import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const CHANNELS = ['website', 'podcast', 'radio', 'tv', 'social_media', 'newsletter', 'app', 'print', 'other']
const METRIC_NAMES = ['pageviews', 'unique_visitors', 'listeners', 'subscribers', 'followers', 'downloads', 'watch_time', 'engagement_rate', 'other']

const EMPTY_FORM = {
  date: '',
  channel: 'website',
  metric_name: 'pageviews',
  value: '',
  notes: '',
}

export default function AudienceAnalytics() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [showForm, setShowForm] = useState(false)
  const [editingMetric, setEditingMetric] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterChannel, setFilterChannel] = useState('')

  // Fetch audience metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['audience_metrics', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audience_metrics')
        .select('*')
        .eq('property_id', propertyId)
        .order('date', { ascending: false })
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
        value: Number(payload.value) || 0,
        date: payload.date || null,
      }
      if (record.id) {
        const { data, error } = await supabase.from('audience_metrics').update(record).eq('id', record.id).select().single()
        if (error) throw error
        return data
      }
      delete record.id
      const { data, error } = await supabase.from('audience_metrics').insert({ ...record, property_id: propertyId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience_metrics', propertyId] })
      toast({ title: 'Metric saved', type: 'success' })
      resetForm()
    },
    onError: (err) => toast({ title: 'Error saving metric', description: err.message, type: 'error' }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('audience_metrics').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience_metrics', propertyId] })
      toast({ title: 'Metric deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting metric', description: err.message, type: 'error' }),
  })

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingMetric(null)
    setShowForm(false)
  }

  function openEdit(metric) {
    setEditingMetric(metric)
    setForm({
      date: metric.date || '',
      channel: metric.channel || 'website',
      metric_name: metric.metric_name || 'pageviews',
      value: metric.value || '',
      notes: metric.notes || '',
    })
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    if (editingMetric) payload.id = editingMetric.id
    saveMutation.mutate(payload)
  }

  const formatLabel = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

  const filtered = (metrics || []).filter((m) => !filterChannel || m.channel === filterChannel)

  // Group by channel
  const groupedByChannel = filtered.reduce((acc, m) => {
    const ch = m.channel || 'other'
    if (!acc[ch]) acc[ch] = []
    acc[ch].push(m)
    return acc
  }, {})

  // Summary totals
  const totalPageviews = (metrics || []).filter((m) => m.metric_name === 'pageviews').reduce((s, m) => s + (Number(m.value) || 0), 0)
  const totalListeners = (metrics || []).filter((m) => m.metric_name === 'listeners').reduce((s, m) => s + (Number(m.value) || 0), 0)
  const totalSubscribers = (metrics || []).filter((m) => m.metric_name === 'subscribers').reduce((s, m) => s + (Number(m.value) || 0), 0)
  const totalDownloads = (metrics || []).filter((m) => m.metric_name === 'downloads').reduce((s, m) => s + (Number(m.value) || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Audience Analytics</h1>
          <p className="text-text-secondary text-sm mt-1">
            {metrics?.length || 0} entries across {Object.keys(groupedByChannel).length} channels
          </p>
        </div>
        <button
          onClick={() => { setEditingMetric(null); setForm(EMPTY_FORM); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + Add Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Pageviews</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalPageviews.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Listeners</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalListeners.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Subscribers</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalSubscribers.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Downloads</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalDownloads.toLocaleString()}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-secondary">Channel:</span>
        <button
          onClick={() => setFilterChannel('')}
          className={`px-3 py-1 rounded text-xs font-mono transition-colors ${!filterChannel ? 'bg-accent text-bg-primary' : 'bg-bg-card border border-border text-text-secondary hover:border-accent'}`}
        >
          All
        </button>
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            onClick={() => setFilterChannel(filterChannel === ch ? '' : ch)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${filterChannel === ch ? 'bg-accent text-bg-primary' : 'bg-bg-card border border-border text-text-secondary hover:border-accent'}`}
          >
            {formatLabel(ch)}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {editingMetric ? 'Edit Entry' : 'Add Entry'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>{formatLabel(ch)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Metric Name</label>
              <select
                value={form.metric_name}
                onChange={(e) => setForm({ ...form, metric_name: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {METRIC_NAMES.map((mn) => (
                  <option key={mn} value={mn}>{formatLabel(mn)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Value</label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-text-secondary mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
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
                {saveMutation.isPending ? 'Saving...' : editingMetric ? 'Update' : 'Save'}
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
              <div className="h-12 bg-bg-surface rounded w-full mb-2" />
              <div className="h-3 bg-bg-surface rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-text-secondary text-sm">No audience metrics found.</p>
          <p className="text-text-muted text-xs mt-1">Click "Add Entry" to start tracking audience data.</p>
        </div>
      )}

      {/* Entries grouped by channel */}
      {!isLoading && filtered.length > 0 && Object.entries(groupedByChannel).map(([channel, entries]) => (
        <div key={channel}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-mono font-medium text-text-secondary">{formatLabel(channel)}</h3>
            <span className="text-xs font-mono text-text-muted bg-bg-surface px-2 py-0.5 rounded">{entries.length}</span>
          </div>
          <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-xs font-mono text-text-secondary uppercase">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-mono text-text-secondary uppercase">Metric</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-text-secondary uppercase">Value</th>
                    <th className="text-left px-4 py-2 text-xs font-mono text-text-secondary uppercase">Notes</th>
                    <th className="text-right px-4 py-2 text-xs font-mono text-text-secondary uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50 hover:bg-bg-surface/50">
                      <td className="px-4 py-2 text-text-secondary text-xs font-mono">
                        {entry.date ? new Date(entry.date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-2 text-text-primary">{formatLabel(entry.metric_name || '')}</td>
                      <td className="px-4 py-2 text-right text-accent font-mono font-semibold">
                        {Number(entry.value || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-text-muted text-xs truncate max-w-[200px]">{entry.notes || '-'}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(entry)} className="text-text-muted hover:text-accent text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-accent/50">Edit</button>
                          <button onClick={() => { if (window.confirm('Delete this entry?')) deleteMutation.mutate(entry.id) }} className="text-text-muted hover:text-red-400 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/50">Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
