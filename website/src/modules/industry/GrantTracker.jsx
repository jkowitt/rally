import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const STAGES = ['researching', 'drafting', 'submitted', 'under_review', 'approved', 'declined', 'reporting']

const STAGE_COLORS = {
  researching: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  drafting: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  submitted: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  under_review: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  approved: 'bg-green-500/20 text-green-300 border-green-500/40',
  declined: 'bg-red-500/20 text-red-300 border-red-500/40',
  reporting: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
}

const EMPTY_FORM = {
  grant_name: '',
  funder: '',
  amount: '',
  status: 'researching',
  deadline: '',
  submitted_date: '',
  notes: '',
}

export default function GrantTracker() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [showForm, setShowForm] = useState(false)
  const [editingGrant, setEditingGrant] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState('')
  const [view, setView] = useState('board')

  // Fetch grants
  const { data: grants, isLoading } = useQuery({
    queryKey: ['grants', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grants')
        .select('*')
        .eq('property_id', propertyId)
        .order('deadline', { ascending: true })
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
        amount: Number(payload.amount) || 0,
        deadline: payload.deadline || null,
        submitted_date: payload.submitted_date || null,
      }
      if (record.id) {
        const { data, error } = await supabase.from('grants').update(record).eq('id', record.id).select().single()
        if (error) throw error
        return data
      }
      delete record.id
      const { data, error } = await supabase.from('grants').insert({ ...record, property_id: propertyId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants', propertyId] })
      toast({ title: 'Grant saved', type: 'success' })
      resetForm()
    },
    onError: (err) => toast({ title: 'Error saving grant', description: err.message, type: 'error' }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('grants').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants', propertyId] })
      toast({ title: 'Grant deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting grant', description: err.message, type: 'error' }),
  })

  // Move grant to a new stage
  const moveMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase.from('grants').update({ status }).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants', propertyId] })
    },
    onError: (err) => toast({ title: 'Error moving grant', description: err.message, type: 'error' }),
  })

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingGrant(null)
    setShowForm(false)
  }

  function openEdit(grant) {
    setEditingGrant(grant)
    setForm({
      grant_name: grant.grant_name || '',
      funder: grant.funder || '',
      amount: grant.amount || '',
      status: grant.status || 'researching',
      deadline: grant.deadline || '',
      submitted_date: grant.submitted_date || '',
      notes: grant.notes || '',
    })
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    if (editingGrant) payload.id = editingGrant.id
    saveMutation.mutate(payload)
  }

  const formatStage = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

  const filtered = (grants || []).filter((g) => !filterStatus || g.status === filterStatus)

  // Summary
  const totalPipeline = (grants || []).filter((g) => !['declined'].includes(g.status)).reduce((s, g) => s + (Number(g.amount) || 0), 0)
  const totalApproved = (grants || []).filter((g) => g.status === 'approved' || g.status === 'reporting').reduce((s, g) => s + (Number(g.amount) || 0), 0)
  const totalSubmitted = (grants || []).filter((g) => g.status === 'submitted' || g.status === 'under_review').length
  const totalActive = (grants || []).filter((g) => !['declined'].includes(g.status)).length

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Grant Tracker</h1>
          <p className="text-text-secondary text-sm mt-1">
            {grants?.length || 0} grants &middot; {totalActive} active in pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === 'board' ? 'table' : 'board')}
            className="bg-bg-card border border-border text-text-secondary px-3 py-2 rounded text-sm hover:text-accent hover:border-accent"
          >
            {view === 'board' ? 'Table View' : 'Board View'}
          </button>
          <button
            onClick={() => { setEditingGrant(null); setForm(EMPTY_FORM); setShowForm(true) }}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
          >
            + Add Grant
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Pipeline Total</div>
          <div className="text-2xl font-semibold text-accent mt-1">${totalPipeline.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Approved</div>
          <div className="text-2xl font-semibold text-green-400 mt-1">${totalApproved.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Pending Review</div>
          <div className="text-2xl font-semibold text-yellow-400 mt-1">{totalSubmitted}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Active Grants</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalActive}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-secondary">Filter:</span>
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1 rounded text-xs font-mono transition-colors ${!filterStatus ? 'bg-accent text-bg-primary' : 'bg-bg-card border border-border text-text-secondary hover:border-accent'}`}
        >
          All
        </button>
        {STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => setFilterStatus(filterStatus === stage ? '' : stage)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${filterStatus === stage ? 'bg-accent text-bg-primary' : 'bg-bg-card border border-border text-text-secondary hover:border-accent'}`}
          >
            {formatStage(stage)}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {editingGrant ? 'Edit Grant' : 'Add Grant'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Grant Name</label>
              <input
                type="text"
                value={form.grant_name}
                onChange={(e) => setForm({ ...form, grant_name: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Funder</label>
              <input
                type="text"
                value={form.funder}
                onChange={(e) => setForm({ ...form, funder: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Amount ($)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
                {STAGES.map((s) => (
                  <option key={s} value={s}>{formatStage(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Submitted Date</label>
              <input
                type="date"
                value={form.submitted_date}
                onChange={(e) => setForm({ ...form, submitted_date: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-text-secondary mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
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
                {saveMutation.isPending ? 'Saving...' : editingGrant ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-bg-surface rounded w-3/4 mb-2" />
              <div className="h-3 bg-bg-surface rounded w-1/2 mb-2" />
              <div className="h-6 bg-bg-surface rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-text-secondary text-sm">No grants found.</p>
          <p className="text-text-muted text-xs mt-1">Click "Add Grant" to start tracking grant applications.</p>
        </div>
      )}

      {/* Board View */}
      {!isLoading && filtered.length > 0 && view === 'board' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.filter((s) => !filterStatus || s === filterStatus).map((stage) => {
            const stageGrants = filtered.filter((g) => g.status === stage)
            return (
              <div key={stage} className="min-w-[260px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${STAGE_COLORS[stage]}`}>
                    {formatStage(stage)}
                  </span>
                  <span className="text-xs text-text-muted font-mono">{stageGrants.length}</span>
                </div>
                <div className="space-y-2">
                  {stageGrants.map((grant) => (
                    <div key={grant.id} className="bg-bg-card border border-border rounded-lg p-3 hover:border-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-1">
                        <div className="text-sm font-medium text-text-primary truncate">{grant.grant_name}</div>
                        <div className="flex gap-1 shrink-0 ml-1">
                          <button onClick={() => openEdit(grant)} className="text-text-muted hover:text-accent text-xs px-1">Edit</button>
                          <button onClick={() => { if (window.confirm('Delete this grant?')) deleteMutation.mutate(grant.id) }} className="text-text-muted hover:text-red-400 text-xs px-1">Del</button>
                        </div>
                      </div>
                      <div className="text-xs text-text-secondary font-mono">{grant.funder}</div>
                      <div className="text-lg font-semibold text-accent mt-1">${Number(grant.amount || 0).toLocaleString()}</div>
                      {grant.deadline && (
                        <div className="text-xs text-text-muted mt-1">Deadline: {new Date(grant.deadline).toLocaleDateString()}</div>
                      )}
                      {/* Move buttons */}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {STAGES.filter((s) => s !== stage).slice(0, 3).map((target) => (
                          <button
                            key={target}
                            onClick={() => moveMutation.mutate({ id: grant.id, status: target })}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-text-muted hover:text-accent hover:border-accent/50"
                          >
                            {formatStage(target)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {stageGrants.length === 0 && (
                    <div className="border border-dashed border-border rounded-lg p-4 text-center">
                      <p className="text-text-muted text-xs">No grants</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {!isLoading && filtered.length > 0 && view === 'table' && (
        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Grant Name</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Funder</th>
                  <th className="text-right px-4 py-3 text-xs font-mono text-text-secondary uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase">Deadline</th>
                  <th className="text-right px-4 py-3 text-xs font-mono text-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((grant) => (
                  <tr key={grant.id} className="border-b border-border/50 hover:bg-bg-surface/50">
                    <td className="px-4 py-3 text-text-primary font-medium">{grant.grant_name}</td>
                    <td className="px-4 py-3 text-text-secondary">{grant.funder}</td>
                    <td className="px-4 py-3 text-right text-accent font-mono">${Number(grant.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${STAGE_COLORS[grant.status] || 'text-text-secondary'}`}>
                        {formatStage(grant.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs font-mono">
                      {grant.deadline ? new Date(grant.deadline).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(grant)} className="text-text-muted hover:text-accent text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-accent/50">Edit</button>
                        <button onClick={() => { if (window.confirm('Delete?')) deleteMutation.mutate(grant.id) }} className="text-text-muted hover:text-red-400 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/50">Del</button>
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
