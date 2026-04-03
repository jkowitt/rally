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
  const [showBulkImport, setShowBulkImport] = useState(false)

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

  // Fetch contacts for all deals (gracefully fails if table doesn't exist yet)
  const { data: allContacts } = useQuery({
    queryKey: ['contacts', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('property_id', propertyId)
        .order('is_primary', { ascending: false })
      if (error) return [] // table might not exist yet
      return data
    },
    enabled: !!propertyId,
  })

  // Group contacts by deal_id for easy lookup
  const contactsByDeal = (allContacts || []).reduce((acc, c) => {
    if (c.deal_id) {
      if (!acc[c.deal_id]) acc[c.deal_id] = []
      acc[c.deal_id].push(c)
    }
    return acc
  }, {})

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
    mutationFn: async ({ contacts: formContacts, ...deal }) => {
      const payload = { ...deal }
      // Convert year values to dates
      if (payload.start_date && !String(payload.start_date).includes('-')) {
        payload.start_date = `${payload.start_date}-01-01`
      }
      if (payload.end_date && !String(payload.end_date).includes('-')) {
        payload.end_date = `${payload.end_date}-12-31`
      }
      // Convert tags string to array (column may not exist if migration 009 hasn't run)
      if (typeof payload.tags === 'string') {
        payload.tags = payload.tags ? payload.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      }
      // Convert win_probability to int
      if (payload.win_probability) payload.win_probability = parseInt(payload.win_probability) || 0
      else delete payload.win_probability

      // Remove fields that require migration 009 if they're empty
      const pro_fields = ['win_probability', 'deal_score', 'expected_close_date', 'lost_reason', 'tags', 'stale_days', 'contact_tags']
      pro_fields.forEach((f) => { if (!payload[f] || (Array.isArray(payload[f]) && payload[f].length === 0)) delete payload[f] })

      // Remove new company fields if empty (column may not exist pre-migration)
      const companyFields = ['city', 'state', 'website', 'linkedin', 'founded', 'revenue_thousands', 'employees', 'sub_industry', 'outreach_status']
      companyFields.forEach((f) => { if (!payload[f]) delete payload[f] })
      if (payload.revenue_thousands) payload.revenue_thousands = Number(payload.revenue_thousands) || null
      if (payload.employees) payload.employees = Number(payload.employees) || null

      const optionalFields = ['start_date', 'end_date', 'value', 'contact_phone', 'contact_position', 'contact_company', 'contact_email', 'last_contacted', 'next_follow_up', 'source', 'expected_close_date']
      optionalFields.forEach((f) => { if (!payload[f]) delete payload[f] })

      // Set primary contact on deal from first contact (backward compat)
      if (formContacts?.length > 0) {
        const primary = formContacts.find(c => c.is_primary) || formContacts[0]
        payload.contact_first_name = primary.first_name || ''
        payload.contact_last_name = primary.last_name || ''
        payload.contact_name = [primary.first_name, primary.last_name].filter(Boolean).join(' ')
        payload.contact_email = primary.email || ''
        payload.contact_phone = primary.phone || ''
        payload.contact_position = primary.position || ''
        payload.contact_company = primary.company || payload.brand_name
      } else {
        // Build contact_name from first/last
        if (payload.contact_first_name || payload.contact_last_name) {
          payload.contact_name = [payload.contact_first_name, payload.contact_last_name].filter(Boolean).join(' ')
        }
      }

      let dealId = payload.id
      if (payload.id) {
        const { error } = await supabase.from('deals').update(payload).eq('id', payload.id)
        if (error) throw error
      } else {
        delete payload.id
        const { data, error } = await supabase.from('deals').insert({ ...payload, property_id: propertyId }).select('id').single()
        if (error) throw error
        dealId = data.id
      }

      // Save contacts to contacts table (if migration has been run)
      if (formContacts && dealId) {
        try {
          // Delete existing contacts for this deal
          await supabase.from('contacts').delete().eq('deal_id', dealId)
          // Insert new contacts
          const contactRows = formContacts
            .filter(c => c.first_name || c.last_name || c.email)
            .map((c, i) => ({
              property_id: propertyId,
              deal_id: dealId,
              first_name: c.first_name || '',
              last_name: c.last_name || null,
              email: c.email || null,
              phone: c.phone || null,
              position: c.position || null,
              company: c.company || payload.brand_name || null,
              city: c.city || null,
              state: c.state || null,
              linkedin: c.linkedin || null,
              website: c.website || null,
              is_primary: c.is_primary || i === 0,
            }))
          if (contactRows.length > 0) {
            await supabase.from('contacts').insert(contactRows)
          }
        } catch {
          // contacts table may not exist yet — silently skip
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['contacts', propertyId] })
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
            onClick={() => setShowBulkImport(true)}
            className="bg-bg-surface border border-border text-text-secondary px-4 py-2 rounded text-sm font-medium hover:text-text-primary hover:border-accent/50 transition-colors"
          >
            Paste List
          </button>
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
                                {(contactsByDeal[deal.id]?.length || 0) > 1 && (
                                  <span className="text-[10px] font-mono text-accent bg-accent/10 px-1 rounded">+{contactsByDeal[deal.id].length - 1}</span>
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
                  <td className="px-4 py-3 text-text-secondary">
                    {deal.contact_name || '—'}
                    {(contactsByDeal[deal.id]?.length || 0) > 1 && (
                      <span className="ml-1 text-[10px] font-mono text-accent bg-accent/10 px-1 rounded">+{contactsByDeal[deal.id].length - 1}</span>
                    )}
                  </td>
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
          dealContacts={editingDeal ? (contactsByDeal[editingDeal.id] || []) : []}
          propertyId={propertyId}
          profileId={profile?.id}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => { setShowForm(false); setEditingDeal(null) }}
          saving={saveMutation.isPending}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          propertyId={propertyId}
          onClose={() => setShowBulkImport(false)}
          onImported={(count) => {
            queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
            toast({ title: `${count} prospects imported`, type: 'success' })
            setShowBulkImport(false)
          }}
        />
      )}
    </div>
  )
}

function DealForm({ deal, dealContacts, propertyId, profileId, onSave, onCancel, saving }) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('contacts')
  const [enriching, setEnriching] = useState(null) // index of contact being enriched
  const [enrichResult, setEnrichResult] = useState(null)

  const EMPTY_CONTACT = { first_name: '', last_name: '', email: '', phone: '', position: '', company: '', city: '', state: '', linkedin: '', website: '', is_primary: false }

  // Initialize contacts from dealContacts (from contacts table) or fall back to deal's inline contact fields
  const initialContacts = dealContacts?.length > 0
    ? dealContacts.map(c => ({ ...EMPTY_CONTACT, ...c, first_name: c.first_name || '', last_name: c.last_name || '', email: c.email || '', phone: c.phone || '', position: c.position || '', company: c.company || '', city: c.city || '', state: c.state || '', linkedin: c.linkedin || '', website: c.website || '', is_primary: !!c.is_primary }))
    : [{
        ...EMPTY_CONTACT,
        first_name: deal?.contact_first_name || deal?.contact_name?.split(' ')[0] || '',
        last_name: deal?.contact_last_name || deal?.contact_name?.split(' ').slice(1).join(' ') || '',
        email: deal?.contact_email || '',
        phone: deal?.contact_phone || '',
        position: deal?.contact_position || '',
        company: deal?.contact_company || '',
        is_primary: true,
      }]

  const [contacts, setContacts] = useState(initialContacts)

  const [form, setForm] = useState({
    brand_name: deal?.brand_name || '',
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
    city: deal?.city || '',
    state: deal?.state || '',
    website: deal?.website || '',
    linkedin: deal?.linkedin || '',
    founded: deal?.founded || '',
    revenue_thousands: deal?.revenue_thousands || '',
    employees: deal?.employees || '',
    sub_industry: deal?.sub_industry || '',
    outreach_status: deal?.outreach_status || 'Not Started',
    ...(deal?.id ? { id: deal.id } : {}),
  })

  function updateContact(index, field, value) {
    setContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function addContact() {
    setContacts(prev => [...prev, { ...EMPTY_CONTACT, company: form.brand_name }])
  }

  function removeContact(index) {
    setContacts(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Ensure at least one primary
      if (updated.length > 0 && !updated.some(c => c.is_primary)) {
        updated[0].is_primary = true
      }
      return updated
    })
  }

  function setPrimary(index) {
    setContacts(prev => prev.map((c, i) => ({ ...c, is_primary: i === index })))
  }

  // Activity log for this deal
  const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'Follow Up', 'Contract Sent', 'Stage Change']
  const ACTIVITY_ICONS = { Call: '📞', Email: '✉️', Meeting: '🤝', Note: '📝', 'Follow Up': '🔔', 'Contract Sent': '📄', 'Stage Change': '📊' }

  const [activityForm, setActivityForm] = useState({ activity_type: 'Note', subject: '', description: '' })
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)

  const { data: dealActivities } = useQuery({
    queryKey: ['deal-activities', deal?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', deal.id)
        .order('occurred_at', { ascending: false })
      if (error) return []
      return data
    },
    enabled: !!deal?.id,
  })

  async function logActivity() {
    if (!activityForm.subject.trim() || !deal?.id) return
    setSavingActivity(true)
    try {
      await supabase.from('activities').insert({
        property_id: propertyId,
        created_by: profileId,
        deal_id: deal.id,
        activity_type: activityForm.activity_type,
        subject: activityForm.subject.trim(),
        description: activityForm.description.trim() || null,
        occurred_at: new Date().toISOString(),
      })
      queryClient.invalidateQueries({ queryKey: ['deal-activities', deal.id] })
      queryClient.invalidateQueries({ queryKey: ['activities', propertyId] })
      setActivityForm({ activity_type: 'Note', subject: '', description: '' })
      setShowActivityForm(false)
    } catch { /* activities table may not exist */ }
    setSavingActivity(false)
  }

  const activityCount = dealActivities?.length || 0

  const tabs = [
    { id: 'contacts', label: `Contacts (${contacts.length})` },
    { id: 'deal', label: 'Deal Details' },
    { id: 'activity', label: `Activity${activityCount ? ` (${activityCount})` : ''}` },
  ]

  function handleSave() {
    onSave({ ...form, contacts })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
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
          {/* Contacts Tab — multiple contacts */}
          {activeTab === 'contacts' && (
            <>
              {contacts.map((contact, idx) => (
                <div key={idx} className={`bg-bg-card border rounded-lg p-3 space-y-2 ${contact.is_primary ? 'border-accent/40' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPrimary(idx)}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${contact.is_primary ? 'bg-accent text-bg-primary' : 'bg-bg-surface text-text-muted hover:text-accent'}`}
                      >
                        {contact.is_primary ? 'PRIMARY' : 'Set Primary'}
                      </button>
                      <span className="text-xs text-text-muted font-mono">Contact {idx + 1}</span>
                    </div>
                    {contacts.length > 1 && (
                      <button type="button" onClick={() => removeContact(idx)} className="text-text-muted hover:text-danger text-sm">&times;</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="First Name"
                      value={contact.first_name}
                      onChange={(e) => updateContact(idx, 'first_name', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                    <input
                      placeholder="Last Name"
                      value={contact.last_name}
                      onChange={(e) => updateContact(idx, 'last_name', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                  </div>
                  <input
                    placeholder="Position / Title"
                    value={contact.position}
                    onChange={(e) => updateContact(idx, 'position', e.target.value)}
                    className="w-full bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                  />
                  <input
                    placeholder="Company"
                    value={contact.company}
                    onChange={(e) => updateContact(idx, 'company', e.target.value)}
                    className="w-full bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Email"
                      value={contact.email}
                      onChange={(e) => updateContact(idx, 'email', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="City"
                      value={contact.city}
                      onChange={(e) => updateContact(idx, 'city', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                    <input
                      placeholder="State"
                      value={contact.state}
                      onChange={(e) => updateContact(idx, 'state', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="LinkedIn URL"
                      value={contact.linkedin}
                      onChange={(e) => updateContact(idx, 'linkedin', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                    <input
                      placeholder="Website"
                      value={contact.website}
                      onChange={(e) => updateContact(idx, 'website', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                  </div>
                  {/* AI Enrich for this contact */}
                  <button
                    type="button"
                    disabled={enriching !== null || (!contact.first_name && !form.brand_name)}
                    onClick={async () => {
                      setEnriching(idx)
                      setEnrichResult(null)
                      try {
                        const result = await enrichContact({
                          name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || form.brand_name,
                          company: contact.company || form.brand_name,
                          position: contact.position,
                        })
                        setEnrichResult({ idx, data: result })
                      } catch (err) {
                        setEnrichResult({ idx, error: err.message })
                      } finally {
                        setEnriching(null)
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-accent/10 text-accent border border-accent/30 rounded px-2 py-1.5 text-[11px] font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
                  >
                    <span>✦</span>
                    {enriching === idx ? 'AI Enriching...' : 'AI Enrich'}
                  </button>
                  {enrichResult?.idx === idx && enrichResult.data && (
                    <div className="bg-bg-surface border border-accent/20 rounded p-2 text-xs text-text-secondary">
                      <div className="text-accent font-medium text-[10px] uppercase tracking-wider mb-1">AI Suggestions</div>
                      <div className="whitespace-pre-wrap">{typeof enrichResult.data === 'string' ? enrichResult.data : enrichResult.data.enrichment || JSON.stringify(enrichResult.data, null, 2)}</div>
                    </div>
                  )}
                  {enrichResult?.idx === idx && enrichResult.error && (
                    <div className="text-xs text-danger bg-danger/10 rounded p-2">{enrichResult.error}</div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addContact}
                className="w-full border border-dashed border-border rounded-lg py-2 text-xs text-text-muted hover:text-accent hover:border-accent/40 transition-colors"
              >
                + Add Another Contact
              </button>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
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

              {/* Company Info */}
              <div className="pt-3 border-t border-border">
                <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-2">Company Info</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  placeholder="LinkedIn"
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input
                  placeholder="Founded"
                  value={form.founded}
                  onChange={(e) => setForm({ ...form, founded: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="Revenue ($K)"
                  value={form.revenue_thousands}
                  onChange={(e) => setForm({ ...form, revenue_thousands: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="Employees"
                  value={form.employees}
                  onChange={(e) => setForm({ ...form, employees: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Sub-Industry"
                  value={form.sub_industry}
                  onChange={(e) => setForm({ ...form, sub_industry: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <select
                  value={form.outreach_status}
                  onChange={(e) => setForm({ ...form, outreach_status: e.target.value })}
                  className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="Researching">Researching</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Replied">Replied</option>
                  <option value="Meeting Set">Meeting Set</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>
            </>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <>
              {/* Date tracking */}
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

              {/* Notes */}
              <textarea
                placeholder="Deal notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
              />

              {/* Activity Log */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-muted font-mono uppercase tracking-wider">Activity Log</span>
                  {deal?.id && (
                    <button
                      type="button"
                      onClick={() => setShowActivityForm(!showActivityForm)}
                      className="text-xs text-accent hover:text-accent/80 font-medium"
                    >
                      {showActivityForm ? 'Cancel' : '+ Log Activity'}
                    </button>
                  )}
                </div>

                {!deal?.id && (
                  <div className="text-xs text-text-muted bg-bg-card rounded p-3 text-center">
                    Save the deal first to start logging activities
                  </div>
                )}

                {/* Inline add activity form */}
                {showActivityForm && deal?.id && (
                  <div className="bg-bg-card border border-accent/20 rounded-lg p-3 space-y-2 mb-3">
                    <div className="flex gap-2">
                      <select
                        value={activityForm.activity_type}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, activity_type: e.target.value }))}
                        className="bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                      >
                        {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        placeholder="Subject (e.g. 'Intro call with VP Marketing')"
                        value={activityForm.subject}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="flex-1 bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                        autoFocus
                      />
                    </div>
                    <textarea
                      placeholder="Details (optional)"
                      value={activityForm.description}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
                    />
                    <button
                      type="button"
                      onClick={logActivity}
                      disabled={savingActivity || !activityForm.subject.trim()}
                      className="w-full bg-accent text-bg-primary py-1.5 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {savingActivity ? 'Saving...' : 'Log Activity'}
                    </button>
                  </div>
                )}

                {/* Activity timeline */}
                {deal?.id && (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {dealActivities?.length === 0 && (
                      <div className="text-xs text-text-muted text-center py-4">No activity logged yet</div>
                    )}
                    {dealActivities?.map((a) => (
                      <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-sm shrink-0">{ACTIVITY_ICONS[a.activity_type] || '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-primary font-medium truncate">{a.subject}</span>
                            <span className="text-[10px] text-text-muted font-mono shrink-0">
                              {new Date(a.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {a.description && (
                            <div className="text-[11px] text-text-muted truncate">{a.description}</div>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-text-muted bg-bg-surface px-1.5 py-0.5 rounded shrink-0">
                          {a.activity_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleSave}
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

// Column name aliases for auto-detection
const COLUMN_MAP = {
  company: 'company', brand: 'company', 'brand name': 'company', 'company name': 'company', organization: 'company',
  'first name': 'first_name', 'first': 'first_name', firstname: 'first_name', 'given name': 'first_name',
  'last name': 'last_name', 'last': 'last_name', lastname: 'last_name', surname: 'last_name', 'family name': 'last_name',
  title: 'position', position: 'position', role: 'position', 'job title': 'position',
  city: 'city', town: 'city',
  state: 'state', province: 'state', region: 'state',
  email: 'email', 'e-mail': 'email', 'email address': 'email',
  phone: 'phone', telephone: 'phone', 'phone number': 'phone', mobile: 'phone',
  linkedin: 'linkedin', 'linkedin url': 'linkedin', 'linkedin profile': 'linkedin',
  website: 'website', url: 'website', web: 'website', 'company website': 'website',
  founded: 'founded', 'year founded': 'founded', established: 'founded',
  'revenue ($000s)': 'revenue_thousands', revenue: 'revenue_thousands', 'revenue ($k)': 'revenue_thousands', 'annual revenue': 'revenue_thousands',
  employees: 'employees', 'employee count': 'employees', headcount: 'employees', 'num employees': 'employees',
  'sub-industry': 'sub_industry', 'sub industry': 'sub_industry', industry: 'sub_industry', sector: 'sub_industry', category: 'sub_industry',
  priority: 'priority',
  'outreach status': 'outreach_status', status: 'outreach_status', outreach: 'outreach_status',
  notes: 'notes', note: 'notes', comments: 'notes', description: 'notes',
  value: 'value', 'deal value': 'value', amount: 'value',
}

function BulkImportModal({ propertyId, onClose, onImported }) {
  const [rawText, setRawText] = useState('')
  const [grouped, setGrouped] = useState([]) // { company, companyData, contacts[] }
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState('paste') // paste | review
  const [expanded, setExpanded] = useState({})

  function parseProspects(text) {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length === 0) return []

    // Detect delimiter
    const firstLine = lines[0]
    const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes('|') ? '|' : ','

    // Parse all rows
    const allParts = lines.map(l => l.split(delimiter).map(p => p.trim()))

    // Detect if first row is a header
    let headers = null
    let dataRows = allParts
    const firstRowLower = allParts[0].map(p => p.toLowerCase())
    const matchedHeaders = firstRowLower.map(h => COLUMN_MAP[h])
    const headerHits = matchedHeaders.filter(Boolean).length

    if (headerHits >= 2) {
      // First row is a header
      headers = matchedHeaders.map((h, i) => h || `col_${i}`)
      dataRows = allParts.slice(1)
    } else {
      // No header detected — guess columns by position or content
      headers = null
    }

    // Parse each row into a structured record
    const records = []
    for (const parts of dataRows) {
      if (parts.every(p => !p)) continue // skip empty rows

      if (headers) {
        const rec = {}
        headers.forEach((h, i) => { if (parts[i]) rec[h] = parts[i] })
        if (rec.company || rec.first_name || rec.email) records.push(rec)
      } else {
        // Smart detection (no headers)
        const rec = { company: '', first_name: '', last_name: '', email: '', phone: '', position: '', value: '' }
        for (const part of parts) {
          if (!part) continue
          if (/@/.test(part) && !rec.email) rec.email = part
          else if (/^\$?[\d,]+\.?\d*$/.test(part.replace(/\s/g, ''))) rec.value = part.replace(/[$,\s]/g, '')
          else if (/^[\d\s().+-]{10,}$/.test(part)) rec.phone = part
          else if (/linkedin\.com/i.test(part)) rec.linkedin = part
          else if (/^https?:\/\//i.test(part) || /\.\w{2,4}$/.test(part)) rec.website = part
          else if (!rec.company) rec.company = part
          else if (!rec.first_name) {
            // Could be "First Last" or just first name
            const nameParts = part.split(/\s+/)
            rec.first_name = nameParts[0]
            if (nameParts.length > 1) rec.last_name = nameParts.slice(1).join(' ')
          } else if (!rec.last_name) rec.last_name = part
          else if (!rec.position) rec.position = part
        }
        if (rec.company || rec.first_name) records.push(rec)
      }
    }

    // Group by company — multiple contacts per company become one deal
    const companyMap = new Map()
    for (const rec of records) {
      const key = (rec.company || '').toLowerCase().trim()
      if (!companyMap.has(key)) {
        companyMap.set(key, {
          company: rec.company || '',
          companyData: {
            city: rec.city || '',
            state: rec.state || '',
            website: rec.website || '',
            linkedin: rec.linkedin || '',
            founded: rec.founded || '',
            revenue_thousands: rec.revenue_thousands || '',
            employees: rec.employees || '',
            sub_industry: rec.sub_industry || '',
            priority: rec.priority || 'Medium',
            outreach_status: rec.outreach_status || '',
            notes: rec.notes || '',
            value: rec.value || '',
          },
          contacts: [],
        })
      }
      const group = companyMap.get(key)
      // Merge company-level data from subsequent rows
      const cd = group.companyData
      if (rec.city && !cd.city) cd.city = rec.city
      if (rec.state && !cd.state) cd.state = rec.state
      if (rec.website && !cd.website) cd.website = rec.website
      if (rec.founded && !cd.founded) cd.founded = rec.founded
      if (rec.revenue_thousands && !cd.revenue_thousands) cd.revenue_thousands = rec.revenue_thousands
      if (rec.employees && !cd.employees) cd.employees = rec.employees
      if (rec.sub_industry && !cd.sub_industry) cd.sub_industry = rec.sub_industry
      if (rec.notes && !cd.notes) cd.notes = rec.notes

      if (rec.first_name || rec.last_name || rec.email) {
        group.contacts.push({
          first_name: rec.first_name || '',
          last_name: rec.last_name || '',
          email: rec.email || '',
          phone: rec.phone || '',
          position: rec.position || '',
          city: rec.city || '',
          state: rec.state || '',
          linkedin: rec.linkedin || '',
          website: rec.website || '',
        })
      }
    }

    return Array.from(companyMap.values())
  }

  function handleParse() {
    const results = parseProspects(rawText)
    setGrouped(results)
    setStep('review')
  }

  function removeGroup(index) {
    setGrouped(prev => prev.filter((_, i) => i !== index))
  }

  function removeContact(groupIdx, contactIdx) {
    setGrouped(prev => prev.map((g, i) => i === groupIdx ? { ...g, contacts: g.contacts.filter((_, ci) => ci !== contactIdx) } : g))
  }

  async function handleImport() {
    if (grouped.length === 0) return
    setImporting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      let dealCount = 0

      for (const group of grouped) {
        // Build deal row
        const dealRow = {
          property_id: propertyId,
          brand_name: group.company,
          stage: 'Prospect',
          priority: group.companyData.priority || 'Medium',
          date_added: today,
          source: 'Inbound',
          notes: group.companyData.notes || null,
        }

        // Set primary contact on deal (first contact)
        if (group.contacts.length > 0) {
          const primary = group.contacts[0]
          dealRow.contact_first_name = primary.first_name || null
          dealRow.contact_last_name = primary.last_name || null
          dealRow.contact_name = [primary.first_name, primary.last_name].filter(Boolean).join(' ') || null
          dealRow.contact_email = primary.email || null
          dealRow.contact_phone = primary.phone || null
          dealRow.contact_position = primary.position || null
          dealRow.contact_company = group.company || null
        }

        // Add value if present
        if (group.companyData.value) {
          dealRow.value = Number(String(group.companyData.value).replace(/[$,\s]/g, '')) || null
        }

        // Add company enrichment fields (may fail pre-migration — that's ok)
        const companyExtras = {}
        if (group.companyData.city) companyExtras.city = group.companyData.city
        if (group.companyData.state) companyExtras.state = group.companyData.state
        if (group.companyData.website) companyExtras.website = group.companyData.website
        if (group.companyData.linkedin) companyExtras.linkedin = group.companyData.linkedin
        if (group.companyData.founded) companyExtras.founded = group.companyData.founded
        if (group.companyData.revenue_thousands) companyExtras.revenue_thousands = Number(String(group.companyData.revenue_thousands).replace(/[$,\s]/g, '')) || null
        if (group.companyData.employees) companyExtras.employees = Number(String(group.companyData.employees).replace(/[,\s]/g, '')) || null
        if (group.companyData.sub_industry) companyExtras.sub_industry = group.companyData.sub_industry
        if (group.companyData.outreach_status) companyExtras.outreach_status = group.companyData.outreach_status

        // Insert deal
        const { data: dealData, error: dealErr } = await supabase
          .from('deals')
          .insert({ ...dealRow, ...companyExtras })
          .select('id')
          .single()

        if (dealErr) {
          // Retry without company extras (migration not run)
          const { data: dealData2, error: dealErr2 } = await supabase
            .from('deals')
            .insert(dealRow)
            .select('id')
            .single()
          if (dealErr2) throw dealErr2

          dealCount++
          // Try inserting contacts
          if (group.contacts.length > 0 && dealData2?.id) {
            try {
              await supabase.from('contacts').insert(
                group.contacts.map((c, i) => ({
                  property_id: propertyId,
                  deal_id: dealData2.id,
                  first_name: c.first_name || '',
                  last_name: c.last_name || null,
                  email: c.email || null,
                  phone: c.phone || null,
                  position: c.position || null,
                  company: group.company || null,
                  city: c.city || null,
                  state: c.state || null,
                  linkedin: c.linkedin || null,
                  website: c.website || null,
                  is_primary: i === 0,
                }))
              )
            } catch { /* contacts table may not exist */ }
          }
          continue
        }

        dealCount++
        // Insert contacts linked to the deal
        if (group.contacts.length > 0 && dealData?.id) {
          try {
            await supabase.from('contacts').insert(
              group.contacts.map((c, i) => ({
                property_id: propertyId,
                deal_id: dealData.id,
                first_name: c.first_name || '',
                last_name: c.last_name || null,
                email: c.email || null,
                phone: c.phone || null,
                position: c.position || null,
                company: group.company || null,
                city: c.city || null,
                state: c.state || null,
                linkedin: c.linkedin || null,
                website: c.website || null,
                is_primary: i === 0,
              }))
            )
          } catch { /* contacts table may not exist */ }
        }
      }

      onImported(dealCount)
    } catch (err) {
      alert('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const totalContacts = grouped.reduce((s, g) => s + g.contacts.length, 0)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Bulk Import Prospects</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {step === 'paste'
                ? 'Paste a list or spreadsheet data — contacts at the same company are grouped automatically'
                : `${grouped.length} companies, ${totalContacts} contacts — review and import`}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        {step === 'paste' && (
          <div className="p-5 flex-1 flex flex-col gap-4">
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-text-muted font-mono mb-2">Supported formats (auto-detected):</div>
              <div className="text-xs text-text-secondary space-y-1 font-mono">
                <div>Tab-separated with headers (paste from Excel / Google Sheets)</div>
                <div>Company, First Name, Last Name, Title, Email, Phone, ...</div>
                <div>Company | Contact | email | phone</div>
                <div>Multiple rows with same Company = grouped as one deal</div>
              </div>
              <div className="text-[10px] text-text-muted mt-2 font-mono">
                Headers: Company, First Name, Last Name, Title, City, State, Email, Phone, LinkedIn, Website, Founded, Revenue ($000s), Employees, Sub-Industry, Priority, Outreach Status, Notes
              </div>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"Company\tFirst Name\tLast Name\tTitle\tCity\tState\tEmail\tPhone\nNike\tJohn\tSmith\tVP Marketing\tPortland\tOR\tjohn@nike.com\t503-555-0100\nNike\tSarah\tJones\tDirector Sales\tPortland\tOR\tsarah@nike.com\t503-555-0101\nAdidas\tMike\tChen\tCMO\tBoston\tMA\tmike@adidas.com\t617-555-0200"}
              rows={14}
              className="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent resize-none font-mono"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleParse}
                disabled={!rawText.trim()}
                className="flex-1 bg-accent text-bg-primary py-2.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Parse {rawText.trim().split('\n').filter(l => l.trim()).length || 0} Lines
              </button>
              <button onClick={onClose} className="px-6 bg-bg-card text-text-secondary py-2.5 rounded text-sm hover:text-text-primary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5">
              {grouped.length === 0 ? (
                <div className="text-center text-text-muted text-sm py-12">
                  No prospects could be parsed. Try a different format.
                </div>
              ) : (
                <div className="space-y-3">
                  {grouped.map((group, gi) => (
                    <div key={gi} className="bg-bg-card border border-border rounded-lg overflow-hidden">
                      {/* Company header */}
                      <div
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-bg-surface/50"
                        onClick={() => setExpanded(prev => ({ ...prev, [gi]: !prev[gi] }))}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-muted font-mono">{expanded[gi] ? '▼' : '▶'}</span>
                          <div>
                            <div className="text-sm font-medium text-text-primary">{group.company || 'Unknown Company'}</div>
                            <div className="text-[10px] text-text-muted font-mono">
                              {group.contacts.length} contact{group.contacts.length !== 1 ? 's' : ''}
                              {group.companyData.city && ` · ${group.companyData.city}`}
                              {group.companyData.state && `, ${group.companyData.state}`}
                              {group.companyData.sub_industry && ` · ${group.companyData.sub_industry}`}
                              {group.companyData.revenue_thousands && ` · $${group.companyData.revenue_thousands}K rev`}
                              {group.companyData.employees && ` · ${group.companyData.employees} emp`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeGroup(gi) }}
                          className="text-text-muted hover:text-danger text-xs"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Expanded: show contacts */}
                      {expanded[gi] && (
                        <div className="border-t border-border p-3 space-y-2">
                          {group.contacts.map((c, ci) => (
                            <div key={ci} className="bg-bg-surface border border-border rounded p-2 flex items-start gap-2 group/contact">
                              <span className="text-[10px] text-text-muted font-mono w-5 pt-1 text-right shrink-0">{ci + 1}</span>
                              <div className="flex-1 text-xs space-y-0.5">
                                <div className="text-text-primary font-medium">
                                  {[c.first_name, c.last_name].filter(Boolean).join(' ') || 'No Name'}
                                  {c.position && <span className="text-text-muted font-normal ml-1">— {c.position}</span>}
                                </div>
                                <div className="text-text-muted font-mono">
                                  {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'}
                                </div>
                                {(c.city || c.state || c.linkedin) && (
                                  <div className="text-text-muted">
                                    {[c.city, c.state].filter(Boolean).join(', ')}
                                    {c.linkedin && <span className="ml-2">LI</span>}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeContact(gi, ci)}
                                className="text-text-muted hover:text-danger text-xs opacity-0 group-hover/contact:opacity-100"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                          {group.contacts.length === 0 && (
                            <div className="text-xs text-text-muted text-center py-2">No contacts — company only</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border flex gap-3">
              <button
                onClick={() => setStep('paste')}
                className="px-4 bg-bg-card text-text-secondary py-2.5 rounded text-sm hover:text-text-primary"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing || grouped.length === 0}
                className="flex-1 bg-accent text-bg-primary py-2.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${grouped.length} Companies, ${totalContacts} Contacts`}
              </button>
              <button onClick={onClose} className="px-4 bg-bg-card text-text-secondary py-2.5 rounded text-sm hover:text-text-primary">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
