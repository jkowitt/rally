import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const UNIT_STATUSES = ['available', 'under_negotiation', 'leased', 'under_renovation', 'unavailable']

const STATUS_COLORS = {
  available: 'bg-green-500/20 text-green-300 border-green-500/40',
  under_negotiation: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  leased: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  under_renovation: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  unavailable: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
}

const STATUS_DOT = {
  available: 'bg-green-400',
  under_negotiation: 'bg-yellow-400',
  leased: 'bg-blue-400',
  under_renovation: 'bg-orange-400',
  unavailable: 'bg-slate-400',
}

const UNIT_TYPES = ['office', 'retail', 'residential', 'industrial', 'storage', 'parking', 'other']

const EMPTY_FORM = {
  unit_name: '',
  type: 'office',
  floor: '',
  sqft: '',
  price_per_sqft: '',
  status: 'available',
  tenant_name: '',
  lease_start: '',
  lease_end: '',
  notes: '',
}

export default function OccupancyDashboard() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [showForm, setShowForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState('')

  // Fetch property units
  const { data: units, isLoading } = useQuery({
    queryKey: ['property_units', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_units')
        .select('*')
        .eq('property_id', propertyId)
        .order('floor', { ascending: true })
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
        floor: payload.floor ? Number(payload.floor) : null,
        sqft: Number(payload.sqft) || 0,
        price_per_sqft: Number(payload.price_per_sqft) || 0,
        lease_start: payload.lease_start || null,
        lease_end: payload.lease_end || null,
      }
      if (record.id) {
        const { data, error } = await supabase.from('property_units').update(record).eq('id', record.id).select().single()
        if (error) throw error
        return data
      }
      delete record.id
      const { data, error } = await supabase.from('property_units').insert({ ...record, property_id: propertyId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property_units', propertyId] })
      toast({ title: 'Unit saved', type: 'success' })
      resetForm()
    },
    onError: (err) => toast({ title: 'Error saving unit', description: err.message, type: 'error' }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('property_units').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property_units', propertyId] })
      toast({ title: 'Unit deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting unit', description: err.message, type: 'error' }),
  })

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingUnit(null)
    setShowForm(false)
  }

  function openEdit(unit) {
    setEditingUnit(unit)
    setForm({
      unit_name: unit.unit_name || '',
      type: unit.type || 'office',
      floor: unit.floor ?? '',
      sqft: unit.sqft || '',
      price_per_sqft: unit.price_per_sqft || '',
      status: unit.status || 'available',
      tenant_name: unit.tenant_name || '',
      lease_start: unit.lease_start || '',
      lease_end: unit.lease_end || '',
      notes: unit.notes || '',
    })
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    if (editingUnit) payload.id = editingUnit.id
    saveMutation.mutate(payload)
  }

  const formatStatus = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

  const filtered = (units || []).filter((u) => !filterStatus || u.status === filterStatus)

  // Summary
  const totalUnits = (units || []).length
  const leasedUnits = (units || []).filter((u) => u.status === 'leased').length
  const occupancyRate = totalUnits > 0 ? Math.round((leasedUnits / totalUnits) * 100) : 0
  const totalSqftLeased = (units || []).filter((u) => u.status === 'leased').reduce((s, u) => s + (Number(u.sqft) || 0), 0)
  const allSqft = (units || []).reduce((s, u) => s + (Number(u.sqft) || 0), 0)
  const avgPriceSqft = (() => {
    const withPrice = (units || []).filter((u) => Number(u.price_per_sqft) > 0)
    if (withPrice.length === 0) return 0
    return (withPrice.reduce((s, u) => s + Number(u.price_per_sqft), 0) / withPrice.length).toFixed(2)
  })()
  const vacantUnits = (units || []).filter((u) => u.status === 'available').length

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Occupancy Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">
            {totalUnits} units &middot; {occupancyRate}% occupied &middot; {allSqft.toLocaleString()} total sq ft
          </p>
        </div>
        <button
          onClick={() => { setEditingUnit(null); setForm(EMPTY_FORM); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + Add Unit
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Units</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalUnits}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Occupancy Rate</div>
          <div className="text-2xl font-semibold text-green-400 mt-1">{occupancyRate}%</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Sq Ft Leased</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalSqftLeased.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Avg $/Sq Ft</div>
          <div className="text-2xl font-semibold text-accent mt-1">${avgPriceSqft}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Vacant Units</div>
          <div className="text-2xl font-semibold text-yellow-400 mt-1">{vacantUnits}</div>
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
        {UNIT_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${filterStatus === status ? 'bg-accent text-bg-primary' : 'bg-bg-card border border-border text-text-secondary hover:border-accent'}`}
          >
            {formatStatus(status)}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {editingUnit ? 'Edit Unit' : 'Add Unit'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Unit Name</label>
              <input
                type="text"
                value={form.unit_name}
                onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {UNIT_TYPES.map((t) => (
                  <option key={t} value={t}>{formatStatus(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Floor</label>
              <input
                type="number"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Sq Ft</label>
              <input
                type="number"
                value={form.sqft}
                onChange={(e) => setForm({ ...form, sqft: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Price / Sq Ft ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.price_per_sqft}
                onChange={(e) => setForm({ ...form, price_per_sqft: e.target.value })}
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
                {UNIT_STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Tenant Name</label>
              <input
                type="text"
                value={form.tenant_name}
                onChange={(e) => setForm({ ...form, tenant_name: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Lease Start</label>
              <input
                type="date"
                value={form.lease_start}
                onChange={(e) => setForm({ ...form, lease_start: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Lease End</label>
              <input
                type="date"
                value={form.lease_end}
                onChange={(e) => setForm({ ...form, lease_end: e.target.value })}
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
                {saveMutation.isPending ? 'Saving...' : editingUnit ? 'Update' : 'Save'}
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
              <div className="h-6 bg-bg-surface rounded w-1/2 mb-2" />
              <div className="h-3 bg-bg-surface rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-text-secondary text-sm">No property units found.</p>
          <p className="text-text-muted text-xs mt-1">Click "Add Unit" to start managing your property inventory.</p>
        </div>
      )}

      {/* Units Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((unit) => (
            <div key={unit.id} className="bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[unit.status] || 'bg-slate-400'}`} />
                    <span className="text-sm font-medium text-text-primary truncate">{unit.unit_name}</span>
                  </div>
                  <div className="text-xs text-text-muted font-mono mt-0.5">
                    {formatStatus(unit.type || 'other')} {unit.floor != null ? `- Floor ${unit.floor}` : ''}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <button onClick={() => openEdit(unit)} className="text-text-muted hover:text-accent text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-accent/50">Edit</button>
                  <button onClick={() => { if (window.confirm('Delete this unit?')) deleteMutation.mutate(unit.id) }} className="text-text-muted hover:text-red-400 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/50">Del</button>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-lg font-semibold text-accent">{Number(unit.sqft || 0).toLocaleString()} sf</span>
                {Number(unit.price_per_sqft) > 0 && (
                  <span className="text-xs text-text-secondary font-mono">${Number(unit.price_per_sqft).toFixed(2)}/sf</span>
                )}
              </div>
              <span className={`inline-block text-xs font-mono px-2 py-0.5 rounded border ${STATUS_COLORS[unit.status] || 'text-text-secondary'}`}>
                {formatStatus(unit.status || 'available')}
              </span>
              {unit.tenant_name && (
                <div className="text-xs text-text-secondary mt-2 font-mono">
                  Tenant: {unit.tenant_name}
                </div>
              )}
              {(unit.lease_start || unit.lease_end) && (
                <div className="text-xs text-text-muted mt-1 font-mono">
                  {unit.lease_start ? new Date(unit.lease_start).toLocaleDateString() : '?'} - {unit.lease_end ? new Date(unit.lease_end).toLocaleDateString() : '?'}
                </div>
              )}
              {unit.notes && (
                <div className="text-xs text-text-muted mt-1 truncate">{unit.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
