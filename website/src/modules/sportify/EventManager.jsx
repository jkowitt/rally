import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { generateICalFeed, downloadIcal } from '@/lib/ical'

const EVENT_TYPES = ['Game Day', 'Tournament', 'Banquet', 'Clinic', 'Fundraiser', 'Other']
const STATUSES = ['Planning', 'Confirmed', 'In Progress', 'Completed']

const statusColor = {
  Planning: 'bg-bg-card text-text-secondary',
  Confirmed: 'bg-accent/10 text-accent border border-accent/30',
  'In Progress': 'bg-success/10 text-success border border-success/30',
  Completed: 'bg-text-muted/10 text-text-muted border border-text-muted/20'
}

function daysUntil(date) {
  if (!date) return null
  const diff = Math.floor((new Date(date) - new Date()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff > 0 && diff < 30) return `In ${diff} days`
  if (diff < 0 && diff > -30) return `${Math.abs(diff)} days ago`
  return null
}

export default function EventManager() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // grid | calendar
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTime, setFilterTime] = useState('upcoming') // upcoming | past | all

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_tasks(count), event_vendors(count), event_activations(*, deals(brand_name, logo_url))')
        .eq('property_id', propertyId)
        .order('event_date', { ascending: true })
      if (error) throw error
      return data || []
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
      toast({ title: 'Event saved', type: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.message, type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', propertyId] })
      toast({ title: 'Event deleted', type: 'success' })
    },
  })

  const now = new Date()
  const filtered = (events || []).filter(e => {
    if (filterType && e.event_type !== filterType) return false
    if (filterStatus && e.status !== filterStatus) return false
    if (filterTime === 'upcoming' && e.event_date && new Date(e.event_date) < now) return false
    if (filterTime === 'past' && (!e.event_date || new Date(e.event_date) >= now)) return false
    return true
  })

  // Stats
  const upcoming = (events || []).filter(e => e.event_date && new Date(e.event_date) >= now)
  const past = (events || []).filter(e => e.event_date && new Date(e.event_date) < now)
  const thisMonth = upcoming.filter(e => new Date(e.event_date).getMonth() === now.getMonth() && new Date(e.event_date).getFullYear() === now.getFullYear())
  const totalActivations = (events || []).reduce((s, e) => s + (e.event_activations?.length || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Event Manager</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            {events?.length || 0} events &middot; {totalActivations} sponsor activations
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-bg-card rounded overflow-hidden border border-border">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 text-xs font-mono ${viewMode === 'grid' ? 'bg-accent text-bg-primary' : 'text-text-muted'}`}>Grid</button>
            <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 text-xs font-mono ${viewMode === 'calendar' ? 'bg-accent text-bg-primary' : 'text-text-muted'}`}>Calendar</button>
          </div>
          <button
            onClick={() => {
              if (events?.length > 0) {
                const ical = generateICalFeed(events)
                downloadIcal(ical, 'loud-legacy-events.ics')
                toast({ title: 'Calendar exported', type: 'success' })
              }
            }}
            disabled={!events?.length}
            className="bg-bg-card border border-border text-text-secondary px-3 py-2 rounded text-xs hover:text-text-primary disabled:opacity-50"
          >
            Export iCal
          </button>
          <button onClick={() => { setEditingEvent(null); setShowForm(true) }} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">
            + New Event
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Upcoming" value={upcoming.length} color="text-accent" />
        <StatCard label="This Month" value={thisMonth.length} color="text-success" />
        <StatCard label="Activations" value={totalActivations} color="text-warning" />
        <StatCard label="Past Events" value={past.length} color="text-text-muted" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex bg-bg-card rounded overflow-hidden border border-border">
          {['upcoming', 'past', 'all'].map(t => (
            <button
              key={t}
              onClick={() => setFilterTime(t)}
              className={`px-3 py-1.5 text-xs font-mono capitalize ${filterTime === t ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent"
        >
          <option value="">All Types</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterType || filterStatus) && (
          <button onClick={() => { setFilterType(''); setFilterStatus('') }} className="text-xs text-text-muted hover:text-accent">Clear</button>
        )}
      </div>

      {/* Grid View */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-32 rounded-lg" />)}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((event) => {
            const countdown = daysUntil(event.event_date)
            const tasksCount = event.event_tasks?.[0]?.count || 0
            const vendorsCount = event.event_vendors?.[0]?.count || 0
            const activations = event.event_activations || []
            const sponsorLogos = activations.slice(0, 3).map(a => a.deals).filter(Boolean)

            return (
              <Link
                key={event.id}
                to={`/app/sportify/events/${event.id}`}
                className="bg-bg-surface border border-border rounded-lg p-4 hover:border-accent/30 transition-colors block relative"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    if (confirm(`Delete ${event.name}?`)) deleteMutation.mutate(event.id)
                  }}
                  className="absolute top-2 right-2 text-text-muted hover:text-danger text-xs opacity-0 hover:opacity-100 group-hover:opacity-100 p-1"
                  title="Delete"
                >
                  &times;
                </button>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-text-primary truncate">{event.name}</h3>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded">{event.event_type}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${statusColor[event.status]}`}>{event.status}</span>
                    </div>
                  </div>
                  {countdown && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                      countdown === 'Today' ? 'bg-success/10 text-success' :
                      countdown === 'Tomorrow' ? 'bg-warning/10 text-warning' :
                      countdown.startsWith('In') ? 'bg-accent/10 text-accent' : 'bg-bg-card text-text-muted'
                    }`}>
                      {countdown}
                    </span>
                  )}
                </div>

                {event.event_date && (
                  <div className="text-xs text-text-secondary font-mono mt-2">
                    {new Date(event.event_date).toLocaleDateString()} &middot; {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {event.venue && <div className="text-xs text-text-muted mt-0.5 truncate">{event.venue}</div>}

                <div className="flex gap-3 mt-2 text-[10px] text-text-muted font-mono">
                  <span>{tasksCount} tasks</span>
                  <span>{vendorsCount} vendors</span>
                  <span className="text-accent">{activations.length} activations</span>
                </div>

                {/* Sponsor logos */}
                {sponsorLogos.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {sponsorLogos.map((sponsor, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-bg-card border border-border flex items-center justify-center text-[9px] font-medium text-text-secondary overflow-hidden" title={sponsor.brand_name}>
                        {sponsor.logo_url ? (
                          <img src={sponsor.logo_url} alt={sponsor.brand_name} className="w-full h-full object-cover" />
                        ) : (
                          sponsor.brand_name?.[0] || '?'
                        )}
                      </div>
                    ))}
                    {activations.length > 3 && (
                      <span className="text-[9px] text-text-muted font-mono self-center ml-1">+{activations.length - 3}</span>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-text-muted text-sm py-12 bg-bg-surface border border-border rounded-lg">
              {events?.length === 0 ? 'No events yet. Create your first event.' : 'No events match the filters.'}
            </div>
          )}
        </div>
      ) : (
        <CalendarView events={filtered} onCreate={(date) => { setEditingEvent({ event_date: date }); setShowForm(true) }} />
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-primary mb-4">{editingEvent?.id ? 'Edit Event' : 'New Event'}</h2>
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

function StatCard({ label, value, color }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] text-text-muted font-mono uppercase truncate">{label}</div>
      <div className={`text-lg sm:text-xl font-semibold font-mono ${color} mt-0.5`}>{value}</div>
    </div>
  )
}

function CalendarView({ events, onCreate }) {
  const [month, setMonth] = useState(new Date())
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const eventsByDate = {}
  events.forEach(e => {
    if (e.event_date) {
      const d = new Date(e.event_date)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!eventsByDate[key]) eventsByDate[key] = []
      eventsByDate[key].push(e)
    }
  })

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="text-text-muted hover:text-accent text-sm px-2">&larr;</button>
        <h3 className="text-sm font-medium text-text-primary">
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="text-text-muted hover:text-accent text-sm px-2">&rarr;</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[10px] text-text-muted font-mono text-center py-1">{d}</div>
        ))}
        {[...Array(startDayOfWeek)].map((_, i) => <div key={`empty-${i}`} />)}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1
          const key = `${month.getFullYear()}-${month.getMonth()}-${day}`
          const dayEvents = eventsByDate[key] || []
          const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T18:00`
          const isToday = new Date().toDateString() === new Date(month.getFullYear(), month.getMonth(), day).toDateString()

          return (
            <button
              key={day}
              onClick={() => onCreate(dateStr)}
              className={`aspect-square border rounded flex flex-col items-center justify-start p-1 text-[10px] hover:border-accent/40 transition-colors ${
                isToday ? 'border-accent' : dayEvents.length > 0 ? 'border-accent/30 bg-accent/5' : 'border-border'
              }`}
            >
              <span className={`font-mono ${isToday ? 'text-accent font-bold' : 'text-text-secondary'}`}>{day}</span>
              {dayEvents.length > 0 && (
                <span className="text-[9px] text-accent font-mono mt-0.5">{dayEvents.length}</span>
              )}
            </button>
          )
        })}
      </div>
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
      <input placeholder="Event Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" autoFocus />
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
