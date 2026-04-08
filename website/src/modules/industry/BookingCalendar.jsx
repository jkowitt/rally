import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const BOOKING_STATUSES = ['hold', 'confirmed', 'contracted', 'cancelled', 'completed']

const STATUS_COLORS = {
  hold: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  confirmed: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  contracted: 'bg-green-500/20 text-green-300 border-green-500/40',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/40',
  completed: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
}

const EMPTY_FORM = {
  event_name: '',
  artist: '',
  date: '',
  start_time: '',
  end_time: '',
  status: 'hold',
  capacity: '',
  ticket_price: '',
  notes: '',
}

export default function BookingCalendar() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [showForm, setShowForm] = useState(false)
  const [editingBooking, setEditingBooking] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState('')

  // Fetch bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['venue_bookings', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venue_bookings')
        .select('*')
        .eq('property_id', propertyId)
        .order('date', { ascending: true })
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
        capacity: Number(payload.capacity) || 0,
        ticket_price: Number(payload.ticket_price) || 0,
        date: payload.date || null,
        start_time: payload.start_time || null,
        end_time: payload.end_time || null,
      }
      if (record.id) {
        const { data, error } = await supabase.from('venue_bookings').update(record).eq('id', record.id).select().single()
        if (error) throw error
        return data
      }
      delete record.id
      const { data, error } = await supabase.from('venue_bookings').insert({ ...record, property_id: propertyId }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue_bookings', propertyId] })
      toast({ title: 'Booking saved', type: 'success' })
      resetForm()
    },
    onError: (err) => toast({ title: 'Error saving booking', description: err.message, type: 'error' }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('venue_bookings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue_bookings', propertyId] })
      toast({ title: 'Booking deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting booking', description: err.message, type: 'error' }),
  })

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingBooking(null)
    setShowForm(false)
  }

  function openEdit(booking) {
    setEditingBooking(booking)
    setForm({
      event_name: booking.event_name || '',
      artist: booking.artist || '',
      date: booking.date || '',
      start_time: booking.start_time || '',
      end_time: booking.end_time || '',
      status: booking.status || 'hold',
      capacity: booking.capacity || '',
      ticket_price: booking.ticket_price || '',
      notes: booking.notes || '',
    })
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    if (editingBooking) payload.id = editingBooking.id
    saveMutation.mutate(payload)
  }

  const formatStatus = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  const filtered = (bookings || []).filter((b) => !filterStatus || b.status === filterStatus)

  // Group by month
  const grouped = filtered.reduce((acc, booking) => {
    const d = booking.date ? new Date(booking.date) : null
    const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'No Date'
    const label = d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'No Date'
    if (!acc[key]) acc[key] = { label, bookings: [] }
    acc[key].bookings.push(booking)
    return acc
  }, {})
  const sortedMonths = Object.keys(grouped).sort()

  // Summary
  const totalBookings = (bookings || []).length
  const confirmedBookings = (bookings || []).filter((b) => b.status === 'confirmed' || b.status === 'contracted').length
  const totalCapacity = (bookings || []).filter((b) => b.status !== 'cancelled').reduce((s, b) => s + (Number(b.capacity) || 0), 0)
  const totalRevenuePotential = (bookings || []).filter((b) => b.status !== 'cancelled').reduce((s, b) => s + ((Number(b.capacity) || 0) * (Number(b.ticket_price) || 0)), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Booking Calendar</h1>
          <p className="text-text-secondary text-sm mt-1">
            {totalBookings} bookings &middot; {confirmedBookings} confirmed/contracted
          </p>
        </div>
        <button
          onClick={() => { setEditingBooking(null); setForm(EMPTY_FORM); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + Add Booking
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Bookings</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalBookings}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Confirmed</div>
          <div className="text-2xl font-semibold text-green-400 mt-1">{confirmedBookings}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Total Capacity</div>
          <div className="text-2xl font-semibold text-accent mt-1">{totalCapacity.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-text-secondary font-mono uppercase">Revenue Potential</div>
          <div className="text-2xl font-semibold text-accent mt-1">${totalRevenuePotential.toLocaleString()}</div>
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
        {BOOKING_STATUSES.map((status) => (
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
            {editingBooking ? 'Edit Booking' : 'Add Booking'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Event Name</label>
              <input
                type="text"
                value={form.event_name}
                onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Artist / Performer</label>
              <input
                type="text"
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
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
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Capacity</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Ticket Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.ticket_price}
                onChange={(e) => setForm({ ...form, ticket_price: e.target.value })}
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
                {saveMutation.isPending ? 'Saving...' : editingBooking ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-bg-surface rounded w-1/4 mb-3" />
              <div className="h-16 bg-bg-surface rounded w-full mb-2" />
              <div className="h-3 bg-bg-surface rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-text-secondary text-sm">No bookings found.</p>
          <p className="text-text-muted text-xs mt-1">Click "Add Booking" to schedule your first event.</p>
        </div>
      )}

      {/* Bookings grouped by month */}
      {!isLoading && filtered.length > 0 && sortedMonths.map((monthKey) => (
        <div key={monthKey}>
          <h3 className="text-sm font-mono font-medium text-text-secondary mb-2">{grouped[monthKey].label}</h3>
          <div className="space-y-2">
            {grouped[monthKey].bookings.map((booking) => {
              const revenue = (Number(booking.capacity) || 0) * (Number(booking.ticket_price) || 0)
              return (
                <div key={booking.id} className="bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">{booking.event_name}</span>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded border shrink-0 ${STATUS_COLORS[booking.status] || 'text-text-secondary'}`}>
                          {formatStatus(booking.status || 'hold')}
                        </span>
                      </div>
                      {booking.artist && (
                        <div className="text-xs text-text-secondary mt-0.5">{booking.artist}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openEdit(booking)} className="text-text-muted hover:text-accent text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-accent/50">Edit</button>
                      <button onClick={() => { if (window.confirm('Delete this booking?')) deleteMutation.mutate(booking.id) }} className="text-text-muted hover:text-red-400 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/50">Del</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-mono text-text-muted">
                    <span>{booking.date ? new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}</span>
                    {(booking.start_time || booking.end_time) && (
                      <span>{booking.start_time || '?'} - {booking.end_time || '?'}</span>
                    )}
                    {Number(booking.capacity) > 0 && (
                      <span>Cap: {Number(booking.capacity).toLocaleString()}</span>
                    )}
                    {Number(booking.ticket_price) > 0 && (
                      <span>${Number(booking.ticket_price).toFixed(2)}/ticket</span>
                    )}
                    {revenue > 0 && (
                      <span className="text-accent font-semibold">Potential: ${revenue.toLocaleString()}</span>
                    )}
                  </div>
                  {booking.notes && (
                    <div className="text-xs text-text-muted mt-2 truncate">{booking.notes}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
