import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const COMMISSION_STATUSES = ['projected', 'earned', 'invoiced', 'paid']

const STATUS_COLORS = {
  projected: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  earned: 'bg-green-500/20 text-green-300 border-green-500/40',
  invoiced: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  paid: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
}

const EMPTY_FORM = {
  deal_id: '',
  deal_value: '',
  commission_rate: '',
  commission_amount: '',
  status: 'projected',
  notes: '',
}

export default function CommissionTracker() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [showForm, setShowForm] = useState(false)
  const [editingCommission, setEditingCommission] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState('')

  // Fetch commissions
  const { data: commissions, isLoading } = useQuery({
    queryKey: ['commissions', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  // Fetch deals for linking
  const { data: deals } = useQuery({
    queryKey: ['deals', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, brand_name, deal_value')
        .eq('property_id', propertyId)
        .order('brand_name')
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
        deal_id: payload.deal_id || null,
        deal_value: Number(payload.deal_value) || 0,
        commission_rate: Number(payload.commission_rate) || 0,
        commission_amount: Number(payload.commission_amount) || 0,
      }
      if (record.id) {
        const { data, error } = await supabase.from('commissions').update(record).eq('id', record.id).select().single()
        if (error) throw error
        return data
      }
      delete record.id
      const { data, error } = await supabase.from('commissions').insert({ ...record, property_id: propertyId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', propertyId] })
      toast({ title: 'Commission saved', type: 'success' })
      resetForm()
    },
    onError: (err) => toast({ title: 'Error saving commission', description: err.message, type: 'error' }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('commissions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', propertyId] })
      toast({ title: 'Commission deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting commission', description: err.message, type: 'error' }),
  })

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingCommission(null)
    setShowForm(false)
  }

  function openEdit(commission) {
    setEditingCommission(commission)
    setForm({
      deal_id: commission.deal_id || '',
      deal_value: commission.deal_value || '',
      commission_rate: commission.commission_rate || '',
      commission_amount: commission.commission_amount || '',
      status: commission.status || 'projected',
      notes: commission.notes || '',
    })
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    if (editingCommission) payload.id = editingCommission.id
    saveMutation.mutate(payload)
  }

  // Auto-calculate commission amount when rate or deal value changes
  function updateFormField(field, value) {
    const updated = { ...form, [field]: value }
    if (field === 'commission_rate' || field === 'deal_value') {
      const dv = Number(field === 'deal_value' ? value : updated.deal_value) || 0
      const cr = Number(field === 'commission_rate' ? value : updated.commission_rate) || 0
      if (dv > 0 && cr > 0) {
        updated.commission_amount = ((dv * cr) / 100).toFixed(2)
      }
    }
    // Auto-fill deal value when selecting a deal
    if (field === 'deal_id' && value) {
      const deal = (deals || []).find((d) => d.id === value)
      if (deal && deal.deal_value) {
        updated.deal_value = deal.deal_value
        const cr = Number(updated.commission_rate) || 0
        if (cr > 0) {
          updated.commission_amount = ((Number(deal.deal_value) * cr) / 100).toFixed(2)
        }
      }
    }
    setForm(updated)
  }

  const formatStatus = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  const filtered = (commissions || []).filter((c) => !filterStatus || c.status === filterStatus)

  // Summary
  const totalProjected = (commissions || []).filter((c) => c.status === 'projected').reduce((s, c) => s + (Number(c.commission_amount) || 0), 0)
  const totalEarned = (commissions || []).filter((c) => c.status === 'earned' || c.status === 'invoiced' || c.status === 'paid').reduce((s, c) => s + (Number(c.commission_amount) || 0), 0)
  const totalPaid = (commissions || []).filter((c) => c.status === 'paid').reduce((s, c) => s + (Number(c.commission_amount) || 0), 0)
  const outstanding = (commissions || []).filter((c) => c.status === 'earned' || c.status === 'invoiced').reduce((s, c) => s + (Number(c.commission_amount) || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Commission Tracker</h1>
          <p className="text-text-secondary text-sm mt-1">
            {commissions?.length || 0} commissions tracked
          </p>
        </div>
        <button
          onClick={() => { setEditingCommission(null); setForm(EMPTY_FORM); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + Add Commission
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Projected</div>
          <div className="text-2xl font-semibold text-slate-300 mt-1">${totalProjected.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Earned</div>
          <div className="text-2xl font-semibold text-green-400 mt-1">${totalEarned.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Paid</div>
          <div className="text-2xl font-semibold text-accent mt-1">${totalPaid.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Outstanding</div>
          <div className="text-2xl font-semibold text-yellow-400 mt-1">${outstanding.toLocaleString()}</div>
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
        {COMMISSION_STATUSES.map((status) => (
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
            {editingCommission ? 'Edit Commission' : 'Add Commission'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Linked Deal</label>
              <select
                value={form.deal_id}
                onChange={(e) => updateFormField('deal_id', e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">None (manual entry)</option>
                {(deals || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.brand_name}{d.deal_value ? ` ($${Number(d.deal_value).toLocaleString()})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Deal Value ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.deal_value}
                onChange={(e) => updateFormField('deal_value', e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Commission Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.commission_rate}
                onChange={(e) => updateFormField('commission_rate', e.target.value)}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Commission Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.commission_amount}
                onChange={(e) => setForm({ ...form, commission_amount: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {COMMISSION_STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
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
                {saveMutation.isPending ? 'Saving...' : editingCommission ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="bg-bg-card border border-border rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-bg-surface rounded w-full mb-3" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-bg-surface rounded w-full mb-2" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-text-secondary text-sm">No commissions found.</p>
          <p className="text-text-muted text-xs mt-1">Click "Add Commission" to start tracking your commissions.</p>
        </div>
      )}

      {/* Commission Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Deal</th>
                  <th className="text-right px-4 py-3 text-xs font-mono text-text-secondary uppercase">Deal Value</th>
                  <th className="text-right px-4 py-3 text-xs font-mono text-text-secondary uppercase">Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-mono text-text-secondary uppercase">Commission</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Notes</th>
                  <th className="text-right px-4 py-3 text-xs font-mono text-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((commission) => {
                  const deal = commission.deal_id ? (deals || []).find((d) => d.id === commission.deal_id) : null
                  return (
                    <tr key={commission.id} className="border-b border-border/50 hover:bg-bg-surface/50">
                      <td className="px-4 py-3 text-text-primary font-medium">
                        {deal ? deal.brand_name : commission.deal_id ? 'Unknown Deal' : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary font-mono">
                        ${Number(commission.deal_value || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary font-mono">
                        {Number(commission.commission_rate || 0).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right text-accent font-mono font-semibold">
                        ${Number(commission.commission_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${STATUS_COLORS[commission.status] || 'text-text-secondary'}`}>
                          {formatStatus(commission.status || 'projected')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs truncate max-w-[200px]">
                        {commission.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(commission)} className="text-text-muted hover:text-accent text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-accent/50">Edit</button>
                          <button onClick={() => { if (window.confirm('Delete this commission?')) deleteMutation.mutate(commission.id) }} className="text-text-muted hover:text-red-400 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/50">Del</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
