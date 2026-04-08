import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const METRIC_UNITS = ['lives_served', 'dollars_raised', 'meals_provided', 'hours_volunteered', 'families_housed', 'students_enrolled', 'events_held', 'other']
const PERIODS = ['monthly', 'quarterly', 'annually', 'cumulative']

const EMPTY_FORM = {
  metric_name: '',
  metric_value: '',
  metric_unit: 'lives_served',
  period: 'monthly',
  deal_id: '',
  notes: '',
}

export default function ImpactMetrics() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [showForm, setShowForm] = useState(false)
  const [editingMetric, setEditingMetric] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterUnit, setFilterUnit] = useState('')

  // Fetch impact metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['impact_metrics', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('impact_metrics')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  // Fetch deals for optional linking
  const { data: deals } = useQuery({
    queryKey: ['deals', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, brand_name')
        .eq('property_id', propertyId)
        .order('brand_name')
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  // Save (create/update)
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const record = {
        ...payload,
        metric_value: Number(payload.metric_value) || 0,
        deal_id: payload.deal_id || null,
      }
      if (record.id) {
        const { data, error } = await supabase.from('impact_metrics').update(record).eq('id', record.id).select().single()
        if (error) throw error
        return data
      }
      delete record.id
      const { data, error } = await supabase.from('impact_metrics').insert({ ...record, property_id: propertyId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impact_metrics', propertyId] })
      toast({ title: 'Metric saved', type: 'success' })
      resetForm()
    },
    onError: (err) => toast({ title: 'Error saving metric', description: err.message, type: 'error' }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('impact_metrics').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impact_metrics', propertyId] })
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
      metric_name: metric.metric_name || '',
      metric_value: metric.metric_value || '',
      metric_unit: metric.metric_unit || 'lives_served',
      period: metric.period || 'monthly',
      deal_id: metric.deal_id || '',
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

  const filtered = (metrics || []).filter((m) => !filterUnit || m.metric_unit === filterUnit)

  // Totals per unit type
  const unitTotals = METRIC_UNITS.reduce((acc, unit) => {
    const items = (metrics || []).filter((m) => m.metric_unit === unit)
    if (items.length > 0) {
      acc[unit] = items.reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0)
    }
    return acc
  }, {})

  // Summary cards
  const totalLivesServed = unitTotals['lives_served'] || 0
  const totalDollarsRaised = unitTotals['dollars_raised'] || 0
  const totalMealsProvided = unitTotals['meals_provided'] || 0
  const totalHoursVolunteered = unitTotals['hours_volunteered'] || 0

  const formatUnit = (unit) => unit.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Impact Metrics</h1>
          <p className="text-text-secondary text-sm mt-1">
            {metrics?.length || 0} metrics tracked across {Object.keys(unitTotals).length} categories
          </p>
        </div>
        <button
          onClick={() => { setEditingMetric(null); setForm(EMPTY_FORM); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + Add Metric
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Lives Served</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalLivesServed.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Dollars Raised</div>
          <div className="text-2xl font-semibold text-accent mt-1">${totalDollarsRaised.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Meals Provided</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalMealsProvided.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Hours Volunteered</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalHoursVolunteered.toLocaleString()}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-secondary">Filter by unit:</span>
        <button
          onClick={() => setFilterUnit('')}
          className={`px-3 py-1 rounded text-xs font-mono transition-colors ${!filterUnit ? 'bg-accent text-bg-primary' : 'bg-bg-card border border-border text-text-secondary hover:border-accent'}`}
        >
          All
        </button>
        {METRIC_UNITS.map((unit) => (
          <button
            key={unit}
            onClick={() => setFilterUnit(filterUnit === unit ? '' : unit)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${filterUnit === unit ? 'bg-accent text-bg-primary' : 'bg-bg-card border border-border text-text-secondary hover:border-accent'}`}
          >
            {formatUnit(unit)}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {editingMetric ? 'Edit Metric' : 'Add Metric'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Metric Name</label>
              <input
                type="text"
                value={form.metric_name}
                onChange={(e) => setForm({ ...form, metric_name: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Value</label>
              <input
                type="number"
                value={form.metric_value}
                onChange={(e) => setForm({ ...form, metric_value: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Unit Type</label>
              <select
                value={form.metric_unit}
                onChange={(e) => setForm({ ...form, metric_unit: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {METRIC_UNITS.map((u) => (
                  <option key={u} value={u}>{formatUnit(u)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Period</label>
              <select
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Linked Deal (optional)</label>
              <select
                value={form.deal_id}
                onChange={(e) => setForm({ ...form, deal_id: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">None</option>
                {(deals || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.brand_name}</option>
                ))}
              </select>
            </div>
            <div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-bg-surface rounded w-3/4 mb-2" />
              <div className="h-8 bg-bg-surface rounded w-1/2 mb-2" />
              <div className="h-3 bg-bg-surface rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-text-secondary text-sm">No impact metrics found.</p>
          <p className="text-text-muted text-xs mt-1">Click "Add Metric" to start tracking your impact.</p>
        </div>
      )}

      {/* Metrics Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((metric) => {
            const linkedDeal = (deals || []).find((d) => d.id === metric.deal_id)
            return (
              <div key={metric.id} className="bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{metric.metric_name}</div>
                    <div className="text-xs text-text-muted font-mono mt-0.5">
                      {formatUnit(metric.metric_unit)} &middot; {metric.period}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => openEdit(metric)}
                      className="text-text-muted hover:text-accent text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-accent/50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Delete this metric?')) deleteMutation.mutate(metric.id) }}
                      className="text-text-muted hover:text-red-400 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/50"
                    >
                      Del
                    </button>
                  </div>
                </div>
                <div className="text-2xl font-semibold text-accent">
                  {metric.metric_unit === 'dollars_raised' ? '$' : ''}{Number(metric.metric_value || 0).toLocaleString()}
                </div>
                {linkedDeal && (
                  <div className="text-xs text-text-secondary mt-2 font-mono">
                    Deal: {linkedDeal.brand_name}
                  </div>
                )}
                {metric.notes && (
                  <div className="text-xs text-text-muted mt-1 truncate">{metric.notes}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Totals Per Unit */}
      {Object.keys(unitTotals).length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">Totals by Unit Type</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(unitTotals).map(([unit, total]) => (
              <div key={unit} className="text-center">
                <div className="text-xs text-text-muted font-mono">{formatUnit(unit)}</div>
                <div className="text-lg font-semibold text-accent mt-0.5">
                  {unit === 'dollars_raised' ? '$' : ''}{total.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
