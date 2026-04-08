import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const BROKER_STATUSES = ['active', 'inactive', 'pending']

const STATUS_COLORS = {
  active: 'bg-green-500/20 text-green-300 border-green-500/40',
  inactive: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
}

const EMPTY_FORM = {
  name: '',
  company: '',
  email: '',
  phone: '',
  commission_rate: '',
  deals_referred: '',
  total_commission: '',
  status: 'active',
  notes: '',
}

export default function BrokerNetwork() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [showForm, setShowForm] = useState(false)
  const [editingBroker, setEditingBroker] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState('')

  // Fetch brokers
  const { data: brokers, isLoading } = useQuery({
    queryKey: ['brokers', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .eq('property_id', propertyId)
        .order('name', { ascending: true })
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
        commission_rate: Number(payload.commission_rate) || 0,
        deals_referred: Number(payload.deals_referred) || 0,
        total_commission: Number(payload.total_commission) || 0,
      }
      if (record.id) {
        const { data, error } = await supabase.from('brokers').update(record).eq('id', record.id).select().single()
        if (error) throw error
        return data
      }
      delete record.id
      const { data, error } = await supabase.from('brokers').insert({ ...record, property_id: propertyId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers', propertyId] })
      toast({ title: 'Broker saved', type: 'success' })
      resetForm()
    },
    onError: (err) => toast({ title: 'Error saving broker', description: err.message, type: 'error' }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('brokers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers', propertyId] })
      toast({ title: 'Broker deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting broker', description: err.message, type: 'error' }),
  })

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingBroker(null)
    setShowForm(false)
  }

  function openEdit(broker) {
    setEditingBroker(broker)
    setForm({
      name: broker.name || '',
      company: broker.company || '',
      email: broker.email || '',
      phone: broker.phone || '',
      commission_rate: broker.commission_rate || '',
      deals_referred: broker.deals_referred || '',
      total_commission: broker.total_commission || '',
      status: broker.status || 'active',
      notes: broker.notes || '',
    })
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    if (editingBroker) payload.id = editingBroker.id
    saveMutation.mutate(payload)
  }

  const formatStatus = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  const filtered = (brokers || []).filter((b) => !filterStatus || b.status === filterStatus)

  // Summary
  const totalBrokers = (brokers || []).length
  const activeBrokers = (brokers || []).filter((b) => b.status === 'active').length
  const totalCommissionPaid = (brokers || []).reduce((s, b) => s + (Number(b.total_commission) || 0), 0)
  const avgCommissionRate = (() => {
    const withRate = (brokers || []).filter((b) => Number(b.commission_rate) > 0)
    if (withRate.length === 0) return 0
    return (withRate.reduce((s, b) => s + Number(b.commission_rate), 0) / withRate.length).toFixed(1)
  })()
  const totalDealsReferred = (brokers || []).reduce((s, b) => s + (Number(b.deals_referred) || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Broker Network</h1>
          <p className="text-text-secondary text-sm mt-1">
            {totalBrokers} brokers &middot; {activeBrokers} active &middot; {totalDealsReferred} deals referred
          </p>
        </div>
        <button
          onClick={() => { setEditingBroker(null); setForm(EMPTY_FORM); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + Add Broker
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Brokers</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalBrokers}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Commission Paid</div>
          <div className="text-2xl font-semibold text-accent mt-1">${totalCommissionPaid.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Avg Commission Rate</div>
          <div className="text-2xl font-semibold text-accent mt-1">{avgCommissionRate}%</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Deals Referred</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalDealsReferred}</div>
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
        {BROKER_STATUSES.map((status) => (
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
            {editingBroker ? 'Edit Broker' : 'Add Broker'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Company</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Commission Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.commission_rate}
                onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
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
                {BROKER_STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Deals Referred</label>
              <input
                type="number"
                value={form.deals_referred}
                onChange={(e) => setForm({ ...form, deals_referred: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Total Commission ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.total_commission}
                onChange={(e) => setForm({ ...form, total_commission: e.target.value })}
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
                {saveMutation.isPending ? 'Saving...' : editingBroker ? 'Update' : 'Save'}
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
          <p className="text-text-secondary text-sm">No brokers found.</p>
          <p className="text-text-muted text-xs mt-1">Click "Add Broker" to start building your broker network.</p>
        </div>
      )}

      {/* Broker Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Phone</th>
                  <th className="text-right px-4 py-3 text-xs font-mono text-text-secondary uppercase">Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-mono text-text-secondary uppercase">Deals</th>
                  <th className="text-right px-4 py-3 text-xs font-mono text-text-secondary uppercase">Commission</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-mono text-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((broker) => (
                  <tr key={broker.id} className="border-b border-border/50 hover:bg-bg-surface/50">
                    <td className="px-4 py-3 text-text-primary font-medium">{broker.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{broker.company || '-'}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs font-mono">{broker.email || '-'}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs font-mono">{broker.phone || '-'}</td>
                    <td className="px-4 py-3 text-right text-accent font-mono">{Number(broker.commission_rate || 0).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-text-primary font-mono">{broker.deals_referred || 0}</td>
                    <td className="px-4 py-3 text-right text-accent font-mono font-semibold">${Number(broker.total_commission || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${STATUS_COLORS[broker.status] || 'text-text-secondary'}`}>
                        {formatStatus(broker.status || 'active')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(broker)} className="text-text-muted hover:text-accent text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-accent/50">Edit</button>
                        <button onClick={() => { if (window.confirm('Delete this broker?')) deleteMutation.mutate(broker.id) }} className="text-text-muted hover:text-red-400 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/50">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
