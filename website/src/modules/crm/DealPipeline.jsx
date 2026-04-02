import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

const STAGES = ['Prospect', 'Proposal Sent', 'Negotiation', 'Contracted', 'In Fulfillment', 'Renewed']

export default function DealPipeline() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const [showForm, setShowForm] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', propertyId] }),
  })

  const saveMutation = useMutation({
    mutationFn: async (deal) => {
      if (deal.id) {
        const { error } = await supabase.from('deals').update(deal).eq('id', deal.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('deals').insert({ ...deal, property_id: propertyId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      setShowForm(false)
      setEditingDeal(null)
    },
  })

  function handleDragEnd(result) {
    if (!result.destination) return
    const dealId = result.draggableId
    const newStage = result.destination.droppableId
    updateStageMutation.mutate({ id: dealId, stage: newStage })
  }

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals?.filter((d) => d.stage === stage) || []
    return acc
  }, {})

  const totalValue = deals?.reduce((sum, d) => sum + (Number(d.value) || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Deal Pipeline</h1>
          <p className="text-text-secondary text-sm mt-1">
            {deals?.length || 0} deals &middot; ${(totalValue / 1000).toFixed(0)}K total pipeline
          </p>
        </div>
        <button
          onClick={() => { setEditingDeal(null); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + New Deal
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-6 gap-3">
          {STAGES.map((s) => <div key={s} className="skeleton h-64" />)}
        </div>
      ) : (
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
                              <div className="text-sm text-text-primary font-medium truncate">{deal.brand_name}</div>
                              {deal.value && (
                                <div className="text-xs text-accent font-mono mt-1">${Number(deal.value).toLocaleString()}</div>
                              )}
                              {deal.contact_name && (
                                <div className="text-xs text-text-muted mt-1 truncate">{deal.contact_name}</div>
                              )}
                              {deal.renewal_flag && (
                                <span className="inline-block text-[10px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded mt-1">
                                  RENEWAL
                                </span>
                              )}
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
  const [form, setForm] = useState({
    brand_name: deal?.brand_name || '',
    contact_name: deal?.contact_name || '',
    contact_email: deal?.contact_email || '',
    value: deal?.value || '',
    start_date: deal?.start_date || '',
    end_date: deal?.end_date || '',
    stage: deal?.stage || 'Prospect',
    renewal_flag: deal?.renewal_flag || false,
    notes: deal?.notes || '',
    ...(deal?.id ? { id: deal.id } : {}),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {deal ? 'Edit Deal' : 'New Deal'}
        </h2>
        <div className="space-y-3">
          <input
            placeholder="Brand Name"
            value={form.brand_name}
            onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Contact Name"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            <input
              type="email"
              placeholder="Contact Email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <input
            type="number"
            placeholder="Deal Value"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
          <select
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value })}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
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
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.renewal_flag}
              onChange={(e) => setForm({ ...form, renewal_flag: e.target.checked })}
              className="accent-accent"
            />
            Renewal
          </label>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
          />
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
