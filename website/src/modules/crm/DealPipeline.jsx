import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { enrichContact } from '@/lib/claude'

const STAGES = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed']
const ALL_STAGES = [...STAGES, 'Declined']
const SOURCES = ['Referral', 'Cold Outreach', 'Inbound', 'Event', 'Renewal', 'Other']
const PRIORITIES = ['High', 'Medium', 'Low']
const STAGE_PROBABILITY = { 'Prospect': 10, 'Proposal Sent': 25, 'Negotiation': 50, 'Contracted': 90, 'In Fulfillment': 95, 'Renewed': 100, 'Declined': 0 }

function getDealScore(deal) {
  let score = 0
  if (deal.value) score += 15
  if (deal.contact_email) score += 10
  if (deal.contact_phone) score += 5
  if (deal.contact_first_name) score += 5
  if (deal.contact_position) score += 5
  if (deal.source) score += 5
  if (deal.notes) score += 5
  score += (STAGE_PROBABILITY[deal.stage] || 0) / 2
  if (deal.win_probability > 0) score += 10
  if (deal.expected_close_date) score += 10
  return Math.min(100, score)
}

function getDealAge(deal) {
  if (!deal.date_added && !deal.created_at) return 0
  const added = new Date(deal.date_added || deal.created_at)
  return Math.floor((Date.now() - added.getTime()) / (1000 * 60 * 60 * 24))
}

function isStale(deal) {
  if (['Contracted', 'In Fulfillment', 'Renewed', 'Declined'].includes(deal.stage)) return false
  const lastActivity = deal.last_contacted ? new Date(deal.last_contacted) : new Date(deal.date_added || deal.created_at)
  const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  return daysSince > 14
}

export default function DealPipeline() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [showForm, setShowForm] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)
  const [viewMode, setViewMode] = useState('kanban')

  const { data: deals, isLoading } = useQuery({
    queryKey: ['deals', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }) => {
      const { error } = await supabase.from('deals').update({ stage }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      toast({ title: 'Stage updated', type: 'success' })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (deal) => {
      const payload = { ...deal }
      // Convert year values to dates
      if (payload.start_date && !String(payload.start_date).includes('-')) {
        payload.start_date = `${payload.start_date}-01-01`
      }
      if (payload.end_date && !String(payload.end_date).includes('-')) {
        payload.end_date = `${payload.end_date}-12-31`
      }
      // Clean empty optional fields
      // Convert tags string to array
      if (typeof payload.tags === 'string') {
        payload.tags = payload.tags ? payload.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      }
      // Convert win_probability to int
      if (payload.win_probability) payload.win_probability = parseInt(payload.win_probability) || 0
      else delete payload.win_probability

      const optionalFields = ['start_date', 'end_date', 'value', 'contact_phone', 'contact_position', 'contact_company', 'contact_email', 'last_contacted', 'next_follow_up', 'source', 'expected_close_date']
      optionalFields.forEach((f) => { if (!payload[f]) delete payload[f] })
      // Build contact_name from first/last
      if (payload.contact_first_name || payload.contact_last_name) {
        payload.contact_name = [payload.contact_first_name, payload.contact_last_name].filter(Boolean).join(' ')
      }

      if (payload.id) {
        const { error } = await supabase.from('deals').update(payload).eq('id', payload.id)
        if (error) throw error
      } else {
        delete payload.id
        const { error } = await supabase.from('deals').insert({ ...payload, property_id: propertyId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      toast({ title: 'Deal saved', type: 'success' })
      setShowForm(false)
      setEditingDeal(null)
    },
    onError: (err) => toast({ title: 'Error saving deal', description: err.message, type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('deals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      toast({ title: 'Deal deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting deal', description: err.message, type: 'error' }),
  })

  const declineMutation = useMutation({
    mutationFn: async ({ id, lost_reason }) => {
      const update = { stage: 'Declined' }
      if (lost_reason) update.lost_reason = lost_reason
      const { error } = await supabase.from('deals').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      toast({ title: 'Deal declined', type: 'warning' })
    },
    onError: (err) => toast({ title: 'Error declining deal', description: err.message, type: 'error' }),
  })

  function handleDragEnd(result) {
    if (!result.destination) return
    const dealId = result.draggableId
    const newStage = result.destination.droppableId
    updateStageMutation.mutate({ id: dealId, stage: newStage })
  }

  // Filter out Declined deals from the active pipeline
  const activeDeals = deals?.filter((d) => d.stage !== 'Declined') || []

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = activeDeals.filter((d) => d.stage === stage)
    return acc
  }, {})

  const totalValue = activeDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
  const declinedCount = deals?.filter((d) => d.stage === 'Declined').length || 0
  const priorityColor = { High: 'text-danger', Medium: 'text-warning', Low: 'text-text-muted' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Deal Pipeline</h1>
          <p className="text-text-secondary text-sm mt-1">
            {activeDeals.length} active deals &middot; ${(totalValue / 1000).toFixed(0)}K pipeline
            {declinedCount > 0 && <span className="text-text-muted"> &middot; {declinedCount} declined</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-bg-card rounded overflow-hidden border border-border">
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-xs font-mono ${viewMode === 'kanban' ? 'bg-accent text-bg-primary' : 'text-text-muted'}`}>Board</button>
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-xs font-mono ${viewMode === 'table' ? 'bg-accent text-bg-primary' : 'text-text-muted'}`}>Table</button>
          </div>
          <button
            onClick={() => { setEditingDeal(null); setShowForm(true) }}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
          >
            + New Deal
          </button>
        </div>
      </div>

      {/* Pipeline Health Metrics */}
      {activeDeals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted font-mono">Weighted Pipeline</div>
            <div className="text-lg font-semibold text-accent font-mono">
              ${(activeDeals.reduce((s, d) => s + (Number(d.value) || 0) * ((d.win_probability || STAGE_PROBABILITY[d.stage] || 0) / 100), 0) / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted font-mono">Avg Deal Size</div>
            <div className="text-lg font-semibold text-text-primary font-mono">
              ${(totalValue / (activeDeals.length || 1) / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted font-mono">Win Rate</div>
            <div className="text-lg font-semibold text-success font-mono">
              {deals ? Math.round((deals.filter(d => ['Contracted','In Fulfillment','Renewed'].includes(d.stage)).length / (deals.length || 1)) * 100) : 0}%
            </div>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted font-mono">Avg Deal Age</div>
            <div className="text-lg font-semibold text-text-primary font-mono">
              {Math.round(activeDeals.reduce((s, d) => s + getDealAge(d), 0) / (activeDeals.length || 1))}d
            </div>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted font-mono">Stale Deals</div>
            <div className={`text-lg font-semibold font-mono ${activeDeals.filter(isStale).length > 0 ? 'text-warning' : 'text-success'}`}>
              {activeDeals.filter(isStale).length}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((stage) => (
              <Droppable key={stage} droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-w-[200px] flex-1 bg-bg-surface border rounded-lg p-3 transition-colors ${
                      snapshot.isDraggingOver ? 'border-accent/40' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-text-muted uppercase">{stage}</span>
                      <span className="text-xs font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded">
                        {dealsByStage[stage].length}
                      </span>
                    </div>
                    <div className="space-y-2 min-h-[100px]">
                      {dealsByStage[stage].map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => { setEditingDeal(deal); setShowForm(true) }}
                              className={`bg-bg-card border border-border rounded p-3 cursor-pointer hover:border-accent/30 transition-colors ${
                                snapshot.isDragging ? 'shadow-lg border-accent/50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-text-primary font-medium truncate">{deal.brand_name}</div>
                                {isStale(deal) && <span className="text-[10px] font-mono text-warning bg-warning/10 px-1 rounded" title="No activity in 14+ days">STALE</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {deal.value && (
                                  <span className="text-xs text-accent font-mono">${Number(deal.value).toLocaleString()}</span>
                                )}
                                <span className="text-[10px] font-mono text-text-muted" title="Win probability">{deal.win_probability || STAGE_PROBABILITY[deal.stage] || 0}%</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {deal.contact_name && (
                                  <span className="text-xs text-text-muted truncate">{deal.contact_name}</span>
                                )}
                                {deal.priority && (
                                  <span className={`text-[10px] font-mono ${priorityColor[deal.priority]}`}>{deal.priority}</span>
                                )}
                              </div>
                              {/* Score bar */}
                              <div className="mt-1.5 w-full bg-bg-surface rounded-full h-1" title={`Deal score: ${getDealScore(deal)}/100`}>
                                <div className="bg-accent rounded-full h-1 transition-all" style={{ width: `${getDealScore(deal)}%` }} />
                              </div>
                              <div className="flex gap-1 mt-1">
                                {deal.renewal_flag && (
                                  <span className="text-[10px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded">RENEWAL</span>
                                )}
                                {deal.source && (
                                  <span className="text-[10px] font-mono text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">{deal.source}</span>
                                )}
                              </div>
                              <div className="flex gap-2 mt-2 pt-1 border-t border-border">
                                <button
                                  onClick={(e) => { e.stopPropagation(); const reason = prompt('Reason for declining?'); if (reason !== null) declineMutation.mutate({ id: deal.id, lost_reason: reason }) }}
                                  className="text-[10px] text-text-muted hover:text-warning font-mono"
                                >
                                  Decline
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (confirm('Permanently delete this deal?')) deleteMutation.mutate(deal.id) }}
                                  className="text-[10px] text-text-muted hover:text-danger font-mono"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        /* Table View */
        <div className="bg-bg-surface border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Brand</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Contact</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Email</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Phone</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Value</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Stage</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Priority</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Source</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Added</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeDeals.map((deal) => (
                <tr key={deal.id} className="border-b border-border last:border-0 hover:bg-bg-card/50">
                  <td className="px-4 py-3 text-text-primary font-medium">{deal.brand_name}</td>
                  <td className="px-4 py-3 text-text-secondary">{deal.contact_name || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{deal.contact_email || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs font-mono">{deal.contact_phone || '—'}</td>
                  <td className="px-4 py-3 text-accent font-mono">{deal.value ? `$${Number(deal.value).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs font-mono bg-bg-card px-2 py-0.5 rounded text-text-secondary">{deal.stage}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs font-mono ${priorityColor[deal.priority] || 'text-text-muted'}`}>{deal.priority || '—'}</span></td>
                  <td className="px-4 py-3 text-text-muted text-xs">{deal.source || '—'}</td>
                  <td className="px-4 py-3 text-text-muted text-xs font-mono">{deal.date_added || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingDeal(deal); setShowForm(true) }} className="text-xs text-text-muted hover:text-accent">Edit</button>
                      <button onClick={() => { const reason = prompt('Reason for declining?'); if (reason !== null) declineMutation.mutate({ id: deal.id, lost_reason: reason }) }} className="text-xs text-text-muted hover:text-warning">Decline</button>
                      <button onClick={() => { if (confirm('Permanently delete this deal?')) deleteMutation.mutate(deal.id) }} className="text-xs text-text-muted hover:text-danger">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {activeDeals.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-text-muted">No active deals yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <DealForm
          deal={editingDeal}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => { setShowForm(false); setEditingDeal(null) }}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  )
}

function DealForm({ deal, onSave, onCancel, saving }) {
  const [activeTab, setActiveTab] = useState('contact')
  const [enriching, setEnriching] = useState(false)
  const [enrichResult, setEnrichResult] = useState(null)

  const [form, setForm] = useState({
    brand_name: deal?.brand_name || '',
    contact_first_name: deal?.contact_first_name || deal?.contact_name?.split(' ')[0] || '',
    contact_last_name: deal?.contact_last_name || deal?.contact_name?.split(' ').slice(1).join(' ') || '',
    contact_email: deal?.contact_email || '',
    contact_phone: deal?.contact_phone || '',
    contact_position: deal?.contact_position || '',
    contact_company: deal?.contact_company || '',
    value: deal?.value || '',
    start_date: deal?.start_date ? String(deal.start_date).slice(0, 4) : '',
    end_date: deal?.end_date ? String(deal.end_date).slice(0, 4) : '',
    stage: deal?.stage || 'Prospect',
    source: deal?.source || '',
    priority: deal?.priority || 'Medium',
    renewal_flag: deal?.renewal_flag || false,
    win_probability: deal?.win_probability || '',
    expected_close_date: deal?.expected_close_date || '',
    tags: deal?.tags?.join(', ') || '',
    date_added: deal?.date_added || new Date().toISOString().split('T')[0],
    last_contacted: deal?.last_contacted || '',
    next_follow_up: deal?.next_follow_up || '',
    notes: deal?.notes || '',
    ...(deal?.id ? { id: deal.id } : {}),
  })

  const tabs = [
    { id: 'contact', label: 'Contact Info' },
    { id: 'deal', label: 'Deal Details' },
    { id: 'activity', label: 'Activity' },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          {deal ? 'Edit Deal' : 'New Deal'}
        </h2>

        {/* Brand name always visible */}
        <input
          placeholder="Brand / Company Name"
          value={form.brand_name}
          onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
          className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-3 mb-4"
        />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-mono transition-colors border-b-2 -mb-px ${
                activeTab === tab.id ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* Contact Info Tab */}
          {activeTab === 'contact' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="First Name"
                  value={form.contact_first_name}
                  onChange={(e) => setForm({ ...form, contact_first_name: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  placeholder="Last Name"
                  value={form.contact_last_name}
                  onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <input
                placeholder="Position / Title"
                value={form.contact_position}
                onChange={(e) => setForm({ ...form, contact_position: e.target.value })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <input
                placeholder="Company"
                value={form.contact_company}
                onChange={(e) => setForm({ ...form, contact_company: e.target.value })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              {/* AI Contact Enrichment */}
              <button
                type="button"
                disabled={enriching || (!form.contact_first_name && !form.brand_name)}
                onClick={async () => {
                  setEnriching(true)
                  setEnrichResult(null)
                  try {
                    const result = await enrichContact({
                      name: [form.contact_first_name, form.contact_last_name].filter(Boolean).join(' ') || form.brand_name,
                      company: form.contact_company || form.brand_name,
                      position: form.contact_position,
                    })
                    setEnrichResult(result)
                  } catch (err) {
                    setEnrichResult({ error: err.message })
                  } finally {
                    setEnriching(false)
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-accent/10 text-accent border border-accent/30 rounded px-3 py-2 text-xs font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
              >
                <span>✦</span>
                {enriching ? 'AI Enriching...' : 'AI Enrich Contact'}
              </button>
              {enrichResult && !enrichResult.error && (
                <div className="bg-bg-card border border-accent/20 rounded p-3 text-xs text-text-secondary space-y-1">
                  <div className="text-accent font-medium text-[10px] uppercase tracking-wider mb-1">AI Suggestions</div>
                  <div className="whitespace-pre-wrap">{typeof enrichResult === 'string' ? enrichResult : enrichResult.enrichment || JSON.stringify(enrichResult, null, 2)}</div>
                </div>
              )}
              {enrichResult?.error && (
                <div className="text-xs text-danger bg-danger/10 rounded p-2">{enrichResult.error}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Select Source</option>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Date Added</label>
                  <input
                    type="date"
                    value={form.date_added}
                    onChange={(e) => setForm({ ...form, date_added: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </>
          )}

          {/* Deal Details Tab */}
          {activeTab === 'deal' && (
            <>
              <input
                type="number"
                placeholder="Deal Value ($)"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Stage</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {ALL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Fiscal Year Start</label>
                  <select
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 2 + i).map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Fiscal Year End</label>
                  <select
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 2 + i).map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Win Probability %</label>
                  <input
                    type="number"
                    min="0" max="100"
                    placeholder="0-100"
                    value={form.win_probability}
                    onChange={(e) => setForm({ ...form, win_probability: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Expected Close</label>
                  <input
                    type="date"
                    value={form.expected_close_date}
                    onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted">Tags (comma-separated)</label>
                <input
                  placeholder="e.g. VIP, Renewal, Q4 Target"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={form.renewal_flag}
                  onChange={(e) => setForm({ ...form, renewal_flag: e.target.checked })}
                  className="accent-accent"
                />
                Renewal Deal
              </label>
            </>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Last Contacted</label>
                  <input
                    type="date"
                    value={form.last_contacted}
                    onChange={(e) => setForm({ ...form, last_contacted: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Next Follow-Up</label>
                  <input
                    type="date"
                    value={form.next_follow_up}
                    onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
              />
            </>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.brand_name}
            className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onCancel} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm hover:text-text-primary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
