import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function EventDetail() {
  const { eventId } = useParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('tasks')

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_tasks(*), event_vendors(*), event_activations(*, deals(brand_name))')
        .eq('id', eventId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!eventId,
  })

  const addTaskMutation = useMutation({
    mutationFn: async (task) => {
      const { error } = await supabase.from('event_tasks').insert({ ...task, event_id: eventId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
  })

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      const { error } = await supabase.from('event_tasks').update({ completed }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
  })

  const addVendorMutation = useMutation({
    mutationFn: async (vendor) => {
      const { error } = await supabase.from('event_vendors').insert({ ...vendor, event_id: eventId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
  })

  if (!event) return <div className="text-text-muted p-6">Loading...</div>

  const tabs = [
    { id: 'tasks', label: 'Tasks', count: event.event_tasks?.length || 0 },
    { id: 'vendors', label: 'Vendors', count: event.event_vendors?.length || 0 },
    { id: 'activations', label: 'Activations', count: event.event_activations?.length || 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-text-muted text-sm">
        <Link to="/sportify/events" className="hover:text-text-secondary">Events</Link>
        <span>/</span>
        <span className="text-text-primary">{event.name}</span>
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">{event.name}</h1>
            <div className="flex gap-3 mt-1 text-xs font-mono text-text-muted">
              <span>{event.event_type}</span>
              <span>{event.status}</span>
              {event.venue && <span>{event.venue}</span>}
            </div>
          </div>
          {event.event_date && (
            <div className="text-right text-sm text-text-secondary font-mono">
              {new Date(event.event_date).toLocaleDateString()}
            </div>
          )}
        </div>
        {event.notes && <p className="text-text-secondary text-sm mt-3">{event.notes}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-mono transition-colors border-b-2 -mb-px ${
              activeTab === tab.id ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {event.event_tasks?.map((task) => (
            <div key={task.id} className="flex items-center gap-3 bg-bg-surface border border-border rounded p-3">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTaskMutation.mutate({ id: task.id, completed: !task.completed })}
                className="accent-accent"
              />
              <div className={`flex-1 ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'} text-sm`}>
                {task.task_name}
              </div>
              {task.assigned_to && <span className="text-xs text-text-muted font-mono">{task.assigned_to}</span>}
              {task.due_date && <span className="text-xs text-text-muted font-mono">{task.due_date}</span>}
            </div>
          ))}
          <QuickAdd placeholder="Add task..." onAdd={(name) => addTaskMutation.mutate({ task_name: name })} />
        </div>
      )}

      {/* Vendors Tab */}
      {activeTab === 'vendors' && (
        <div className="space-y-3">
          {event.event_vendors?.map((vendor) => (
            <div key={vendor.id} className="bg-bg-surface border border-border rounded p-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-text-primary">{vendor.vendor_name}</div>
                <div className="text-xs text-text-muted">{vendor.category} &middot; {vendor.contact_name}</div>
              </div>
              <span className={`text-xs font-mono ${vendor.confirmed ? 'text-success' : 'text-warning'}`}>
                {vendor.confirmed ? 'Confirmed' : 'Pending'}
              </span>
            </div>
          ))}
          <QuickAdd placeholder="Add vendor..." onAdd={(name) => addVendorMutation.mutate({ vendor_name: name })} />
        </div>
      )}

      {/* Activations Tab */}
      {activeTab === 'activations' && (
        <div className="space-y-3">
          {event.event_activations?.map((act) => (
            <div key={act.id} className="bg-bg-surface border border-border rounded p-3">
              <div className="text-sm text-text-primary">{act.activation_description || 'Activation'}</div>
              <div className="flex gap-3 text-xs text-text-muted mt-1 font-mono">
                {act.deals?.brand_name && <span>{act.deals.brand_name}</span>}
                {act.location && <span>{act.location}</span>}
                <span className={act.completed ? 'text-success' : 'text-warning'}>{act.completed ? 'Done' : 'Pending'}</span>
              </div>
            </div>
          ))}
          {(!event.event_activations || event.event_activations.length === 0) && (
            <div className="text-center text-text-muted text-sm py-6">No activations for this event.</div>
          )}
        </div>
      )}
    </div>
  )
}

function QuickAdd({ placeholder, onAdd }) {
  const [value, setValue] = useState('')
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (value.trim()) { onAdd(value.trim()); setValue('') } }}
      className="flex gap-2"
    >
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
      />
      <button type="submit" disabled={!value.trim()} className="bg-accent text-bg-primary px-3 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
        Add
      </button>
    </form>
  )
}
