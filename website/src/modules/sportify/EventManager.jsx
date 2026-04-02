import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const EVENT_TYPES = ['Game Day', 'Tournament', 'Banquet', 'Clinic', 'Fundraiser', 'Other']
const STATUSES = ['Planning', 'Confirmed', 'In Progress', 'Completed']

export default function EventManager() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_tasks(count), event_vendors(count), event_activations(count)')
        .eq('property_id', propertyId)
        .order('event_date', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  const saveMutation = useMutation({
    mutationFn: async (event) => {
      if (event.id) {
        const { error } = await supabase.from('events').update(event).eq('id', event.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('events').insert({ ...event, property_id: propertyId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', propertyId] })
      setShowForm(false)
      setEditingEvent(null)
    },
  })

  const statusColor = { Planning: 'text-text-muted', Confirmed: 'text-accent', 'In Progress': 'text-success', Completed: 'text-text-secondary' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Event Manager</h1>
          <p className="text-text-secondary text-sm mt-1">{events?.length || 0} events</p>
        </div>
        <button onClick={() => { setEditingEvent(null); setShowForm(true) }} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">
          + New Event
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events?.map((event) => (
            <Link key={event.id} to={`/sportify/events/${event.id}`} className="bg-bg-surface border border-border rounded-lg p-4 hover:border-accent/30 transition-colors block">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">{event.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs font-mono text-text-muted">{event.event_type}</span>
                    <span className={`text-xs font-mono ${statusColor[event.status] || ''}`}>{event.status}</span>
                  </div>
                </div>
              </div>
              {event.event_date && (
                <div className="text-xs text-text-secondary font-mono mt-2">
                  {new Date(event.event_date).toLocaleDateString()} {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {event.venue && <div className="text-xs text-text-muted mt-1">{event.venue}</div>}
            </Link>
          ))}
          {events?.length === 0 && (
            <div className="col-span-full text-center text-text-muted text-sm py-12">No events yet. Create your first event.</div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-text-primary mb-4">{editingEvent ? 'Edit Event' : 'New Event'}</h2>
            <EventForm
              event={editingEvent}
              onSave={(data) => saveMutation.mutate(data)}
              onCancel={() => { setShowForm(false); setEditingEvent(null) }}
              saving={saveMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EventForm({ event, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: event?.name || '',
    event_date: event?.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
    venue: event?.venue || '',
    event_type: event?.event_type || EVENT_TYPES[0],
    status: event?.status || 'Planning',
    notes: event?.notes || '',
    ...(event?.id ? { id: event.id } : {}),
  })

  return (
    <div className="space-y-3">
      <input placeholder="Event Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
      <input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
      <input placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
      <div className="grid grid-cols-2 gap-3">
        <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none" />
      <div className="flex gap-3 mt-2">
        <button onClick={() => onSave(form)} disabled={saving || !form.name} className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={onCancel} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm hover:text-text-primary">Cancel</button>
      </div>
    </div>
  )
}
