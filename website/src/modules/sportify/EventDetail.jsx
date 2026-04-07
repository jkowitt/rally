import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const ACTIVATION_STATUS = ['Scheduled', 'In Progress', 'Done', 'Issue']
const activationStatusColor = {
  Scheduled: 'bg-bg-card text-text-secondary',
  'In Progress': 'bg-warning/10 text-warning border border-warning/30',
  Done: 'bg-success/10 text-success border border-success/30',
  Issue: 'bg-danger/10 text-danger border border-danger/30',
}

export default function EventDetail() {
  const { eventId } = useParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('tasks')

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_tasks(*), event_vendors(*), event_activations(*, deals(brand_name, logo_url))')
        .eq('id', eventId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!eventId,
  })

  const { data: runOfShow } = useQuery({
    queryKey: ['run-of-show', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_runofshow')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true })
      if (error) return []
      return data || []
    },
    enabled: !!eventId,
  })

  const updateEventMutation = useMutation({
    mutationFn: async (updates) => {
      const { error } = await supabase.from('events').update(updates).eq('id', eventId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
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

  const deleteTaskMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('event_tasks').delete().eq('id', id)
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

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('event_vendors').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
  })

  const updateActivationMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('event_activations').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
  })

  const addROSMutation = useMutation({
    mutationFn: async (item) => {
      try {
        const { error } = await supabase.from('event_runofshow').insert({ ...item, event_id: eventId })
        if (error) throw error
      } catch (e) {
        toast({ title: 'Run-of-show table missing', description: 'Run migration 016', type: 'warning' })
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['run-of-show', eventId] }),
  })

  const toggleROSMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      const { error } = await supabase.from('event_runofshow').update({ completed }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['run-of-show', eventId] }),
  })

  const deleteROSMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('event_runofshow').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['run-of-show', eventId] }),
  })

  if (!event) return <div className="text-text-muted p-6">Loading...</div>

  const tasks = event.event_tasks || []
  const vendors = event.event_vendors || []
  const activations = event.event_activations || []
  const tasksDone = tasks.filter(t => t.completed).length
  const vendorsConfirmed = vendors.filter(v => v.confirmed).length
  const activationsDone = activations.filter(a => a.status === 'Done' || a.completed).length
  const rosDone = (runOfShow || []).filter(r => r.completed).length

  const tabs = [
    { id: 'tasks', label: 'Tasks', count: `${tasksDone}/${tasks.length}` },
    { id: 'runofshow', label: 'Run of Show', count: `${rosDone}/${(runOfShow || []).length}` },
    { id: 'vendors', label: 'Vendors', count: `${vendorsConfirmed}/${vendors.length}` },
    { id: 'activations', label: 'Activations', count: `${activationsDone}/${activations.length}` },
    { id: 'attendance', label: 'Attendance' },
    { id: 'broadcast', label: 'Broadcast' },
  ]

  const sponsorLogos = activations.map(a => a.deals).filter(Boolean)
  const taskProgress = tasks.length > 0 ? (tasksDone / tasks.length) * 100 : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 text-text-muted text-xs">
        <Link to="/app/sportify/events" className="hover:text-text-secondary">Events</Link>
        <span>/</span>
        <span className="text-text-primary truncate">{event.name}</span>
      </div>

      {/* Event Header */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-text-primary">{event.name}</h1>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded">{event.event_type}</span>
              <span className="text-[10px] font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded">{event.status}</span>
              {event.venue && <span className="text-[10px] font-mono text-text-muted">{event.venue}</span>}
            </div>
          </div>
          {event.event_date && (
            <div className="text-right text-sm text-text-secondary font-mono shrink-0">
              <div>{new Date(event.event_date).toLocaleDateString()}</div>
              <div className="text-xs text-text-muted">{new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <div className="bg-bg-card border border-border rounded p-2 text-center">
            <div className="text-lg font-semibold text-accent font-mono">{event.actual_attendees || event.expected_attendees || 0}</div>
            <div className="text-[10px] text-text-muted font-mono">Attendees</div>
          </div>
          <div className="bg-bg-card border border-border rounded p-2 text-center">
            <div className="text-lg font-semibold text-success font-mono">{tasksDone}/{tasks.length}</div>
            <div className="text-[10px] text-text-muted font-mono">Tasks</div>
          </div>
          <div className="bg-bg-card border border-border rounded p-2 text-center">
            <div className="text-lg font-semibold text-warning font-mono">{activationsDone}/{activations.length}</div>
            <div className="text-[10px] text-text-muted font-mono">Activations</div>
          </div>
          <div className="bg-bg-card border border-border rounded p-2 text-center">
            <div className="text-lg font-semibold text-text-primary font-mono">{vendorsConfirmed}/{vendors.length}</div>
            <div className="text-[10px] text-text-muted font-mono">Vendors</div>
          </div>
        </div>

        {/* Sponsor logos */}
        {sponsorLogos.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-2">Sponsors ({sponsorLogos.length})</div>
            <div className="flex gap-2 flex-wrap">
              {sponsorLogos.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-bg-card border border-border rounded px-2 py-1">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.brand_name} className="w-4 h-4 object-cover rounded" />
                  ) : (
                    <div className="w-4 h-4 rounded bg-accent/20 flex items-center justify-center text-[8px] text-accent font-bold">{s.brand_name?.[0]}</div>
                  )}
                  <span className="text-[10px] text-text-secondary">{s.brand_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-text-muted font-mono mb-1">
              <span>Task Progress</span>
              <span>{Math.round(taskProgress)}%</span>
            </div>
            <div className="w-full bg-bg-card rounded-full h-1.5 overflow-hidden">
              <div className="bg-accent h-1.5 transition-all" style={{ width: `${taskProgress}%` }} />
            </div>
          </div>
        )}

        {event.notes && <p className="text-text-secondary text-xs mt-3">{event.notes}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-mono transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.id ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {tab.label}{tab.count ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {/* TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-2">
          {tasks.sort((a, b) => (a.due_date || 'z').localeCompare(b.due_date || 'z')).map(task => (
            <div key={task.id} className="flex items-center gap-3 bg-bg-surface border border-border rounded p-3 group">
              <input
                type="checkbox"
                checked={task.completed || false}
                onChange={() => toggleTaskMutation.mutate({ id: task.id, completed: !task.completed })}
                className="accent-accent shrink-0"
              />
              <div className={`flex-1 min-w-0 ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'} text-sm truncate`}>
                {task.task_name}
              </div>
              {task.assigned_to && <span className="text-[10px] text-text-muted font-mono shrink-0">{task.assigned_to}</span>}
              {task.due_date && <span className="text-[10px] text-text-muted font-mono shrink-0">{task.due_date}</span>}
              <button
                onClick={() => deleteTaskMutation.mutate(task.id)}
                className="text-text-muted hover:text-danger text-xs opacity-0 group-hover:opacity-100 shrink-0"
              >
                &times;
              </button>
            </div>
          ))}
          <QuickAdd placeholder="Add task..." onAdd={(name) => addTaskMutation.mutate({ task_name: name, completed: false })} />
        </div>
      )}

      {/* RUN OF SHOW */}
      {activeTab === 'runofshow' && (
        <div className="space-y-2">
          {(runOfShow || []).map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-bg-surface border border-border rounded p-3 group">
              <input
                type="checkbox"
                checked={item.completed || false}
                onChange={() => toggleROSMutation.mutate({ id: item.id, completed: !item.completed })}
                className="accent-accent shrink-0"
              />
              <span className="text-xs text-accent font-mono shrink-0 w-16">{item.start_time || '—'}</span>
              <span className="text-[10px] text-text-muted font-mono shrink-0 w-10">{item.duration_minutes || 15}m</span>
              <div className={`flex-1 min-w-0 ${item.completed ? 'line-through text-text-muted' : 'text-text-primary'} text-sm truncate`}>
                {item.activity}
              </div>
              {item.owner && <span className="text-[10px] text-text-muted font-mono shrink-0">{item.owner}</span>}
              <button
                onClick={() => deleteROSMutation.mutate(item.id)}
                className="text-text-muted hover:text-danger text-xs opacity-0 group-hover:opacity-100 shrink-0"
              >
                &times;
              </button>
            </div>
          ))}
          <RunOfShowAdd onAdd={(item) => addROSMutation.mutate(item)} sortOrder={(runOfShow || []).length} />
          {(!runOfShow || runOfShow.length === 0) && (
            <div className="text-center text-text-muted text-xs py-6 bg-bg-surface border border-border rounded">
              No run-of-show items yet. Add the event schedule above.
            </div>
          )}
        </div>
      )}

      {/* VENDORS */}
      {activeTab === 'vendors' && (
        <div className="space-y-2">
          {vendors.map(v => (
            <VendorCard key={v.id} vendor={v} onUpdate={(updates) => updateVendorMutation.mutate({ id: v.id, updates })} />
          ))}
          <QuickAdd placeholder="Add vendor..." onAdd={(name) => addVendorMutation.mutate({ vendor_name: name, confirmed: false })} />
        </div>
      )}

      {/* ACTIVATIONS — GAME DAY CHECKLIST */}
      {activeTab === 'activations' && (
        <div className="space-y-3">
          {/* Game Day Mode banner */}
          {activations.length > 0 && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-accent uppercase tracking-wider">Game Day Checklist</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {activationsDone}/{activations.length} complete
                </div>
              </div>
              <div className="w-24 bg-bg-card rounded-full h-2 overflow-hidden">
                <div className={`h-2 rounded-full transition-all ${activationsDone === activations.length ? 'bg-success' : 'bg-accent'}`} style={{ width: `${activations.length ? (activationsDone / activations.length) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          {activations.map(a => (
            <GameDayActivationCard key={a.id} activation={a} onUpdate={(updates) => updateActivationMutation.mutate({ id: a.id, updates })} />
          ))}
          {activations.length === 0 && (
            <div className="text-center text-text-muted text-sm py-6 bg-bg-surface border border-border rounded">
              No activations. Link deals with sponsor activations from the CRM.
            </div>
          )}
          {activations.length > 0 && activations.some(a => a.status !== 'Done') && (
            <button
              onClick={async () => {
                if (!confirm('Mark all activations as Done?')) return
                for (const a of activations.filter(x => x.status !== 'Done')) {
                  await updateActivationMutation.mutateAsync({ id: a.id, updates: { status: 'Done', completed: true } })
                }
                toast({ title: 'All activations marked done', type: 'success' })
              }}
              className="w-full bg-success/10 text-success border border-success/30 rounded py-2 text-xs font-medium hover:bg-success/20"
            >
              Mark All Activations Done
            </button>
          )}
        </div>
      )}

      {/* ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-muted">Expected Attendees</label>
              <input
                type="number"
                defaultValue={event.expected_attendees || ''}
                onBlur={(e) => updateEventMutation.mutate({ expected_attendees: parseInt(e.target.value) || null })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Actual Attendees</label>
              <input
                type="number"
                defaultValue={event.actual_attendees || ''}
                onBlur={(e) => updateEventMutation.mutate({ actual_attendees: parseInt(e.target.value) || null })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Capacity</label>
              <input
                type="number"
                defaultValue={event.capacity || ''}
                onBlur={(e) => updateEventMutation.mutate({ capacity: parseInt(e.target.value) || null })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1"
              />
            </div>
          </div>
          {event.capacity && event.actual_attendees && (
            <div>
              <div className="flex justify-between text-[10px] text-text-muted font-mono mb-1">
                <span>Capacity Utilization</span>
                <span>{Math.round((event.actual_attendees / event.capacity) * 100)}%</span>
              </div>
              <div className="w-full bg-bg-card rounded-full h-2 overflow-hidden">
                <div className="bg-accent h-2" style={{ width: `${Math.min(100, (event.actual_attendees / event.capacity) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Broadcast Channel</label>
              <input
                defaultValue={event.broadcast_channel || ''}
                onBlur={(e) => updateEventMutation.mutate({ broadcast_channel: e.target.value || null })}
                placeholder="ESPN3, YouTube, etc."
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Stream URL</label>
              <input
                defaultValue={event.broadcast_url || ''}
                onBlur={(e) => updateEventMutation.mutate({ broadcast_url: e.target.value || null })}
                placeholder="https://..."
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Expected Viewership</label>
              <input
                type="number"
                defaultValue={event.expected_viewership || ''}
                onBlur={(e) => updateEventMutation.mutate({ expected_viewership: parseInt(e.target.value) || null })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Actual Viewership</label>
              <input
                type="number"
                defaultValue={event.actual_viewership || ''}
                onBlur={(e) => updateEventMutation.mutate({ actual_viewership: parseInt(e.target.value) || null })}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1"
              />
            </div>
          </div>
          <Link to="/app/valora" className="block text-xs text-accent hover:underline">
            Run Valora valuations for broadcast assets &rarr;
          </Link>
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
      <button type="submit" disabled={!value.trim()} className="bg-accent text-bg-primary px-3 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">Add</button>
    </form>
  )
}

function RunOfShowAdd({ onAdd, sortOrder }) {
  const [form, setForm] = useState({ start_time: '', activity: '', duration_minutes: 15, owner: '' })
  function submit(e) {
    e.preventDefault()
    if (!form.activity.trim()) return
    onAdd({ ...form, sort_order: sortOrder, completed: false })
    setForm({ start_time: '', activity: '', duration_minutes: 15, owner: '' })
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-12 gap-2 items-center">
      <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="col-span-3 sm:col-span-2 bg-bg-card border border-border rounded px-2 py-2 text-xs text-text-primary focus:outline-none focus:border-accent" />
      <input type="number" placeholder="min" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 15 })} className="col-span-2 sm:col-span-1 bg-bg-card border border-border rounded px-2 py-2 text-xs text-text-primary focus:outline-none focus:border-accent" />
      <input placeholder="Activity" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} className="col-span-7 sm:col-span-6 bg-bg-card border border-border rounded px-2 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
      <input placeholder="Owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="hidden sm:block col-span-2 bg-bg-card border border-border rounded px-2 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
      <button type="submit" disabled={!form.activity.trim()} className="col-span-12 sm:col-span-1 bg-accent text-bg-primary py-2 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50">Add</button>
    </form>
  )
}

function VendorCard({ vendor, onUpdate }) {
  return (
    <div className="bg-bg-surface border border-border rounded p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-primary">{vendor.vendor_name}</div>
          <div className="flex gap-3 mt-0.5 text-[10px] text-text-muted font-mono flex-wrap">
            {vendor.category && <span>{vendor.category}</span>}
            {vendor.contact_name && <span>{vendor.contact_name}</span>}
            {vendor.total_cost && <span className="text-accent">${Number(vendor.total_cost).toLocaleString()}</span>}
          </div>
        </div>
        <button
          onClick={() => onUpdate({ confirmed: !vendor.confirmed })}
          className={`text-[10px] font-mono px-2 py-1 rounded shrink-0 ${vendor.confirmed ? 'bg-success/10 text-success border border-success/30' : 'bg-warning/10 text-warning border border-warning/30'}`}
        >
          {vendor.confirmed ? '✓ Confirmed' : 'Pending'}
        </button>
      </div>
    </div>
  )
}

function GameDayActivationCard({ activation, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [proofUrl, setProofUrl] = useState('')
  const isDone = activation.status === 'Done' || activation.completed
  const fileRef = useRef(null)
  const { toast } = useToast()

  async function handleProofPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'File too large (max 5MB)', type: 'error' }); return }
    const reader = new FileReader()
    reader.onload = async () => {
      onUpdate({ proof_photo_url: reader.result, status: 'Done', completed: true })
      toast({ title: 'Proof uploaded & marked done', type: 'success' })
    }
    reader.readAsDataURL(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className={`bg-bg-surface border rounded-lg overflow-hidden transition-colors ${isDone ? 'border-success/30' : 'border-border'}`}>
      <div className="p-3 flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onUpdate({ status: isDone ? 'Scheduled' : 'Done', completed: !isDone })}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isDone ? 'bg-success border-success text-white' : 'border-border hover:border-accent'}`}
        >
          {isDone && <span className="text-[10px]">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {activation.deals?.logo_url && (
              <img src={activation.deals.logo_url} alt="" className="w-5 h-5 rounded object-cover" />
            )}
            <span className={`text-sm font-medium ${isDone ? 'text-text-muted line-through' : 'text-text-primary'}`}>
              {activation.deals?.brand_name || 'Activation'}
            </span>
          </div>
          {activation.activation_description && (
            <div className={`text-xs mt-0.5 ${isDone ? 'text-text-muted' : 'text-text-secondary'}`}>{activation.activation_description}</div>
          )}
          <div className="flex gap-3 mt-1 text-[10px] text-text-muted font-mono flex-wrap">
            {activation.location && <span>{activation.location}</span>}
            {activation.asset_delivered && <span>{activation.asset_delivered}</span>}
            {activation.quantity_delivered && <span>qty: {activation.quantity_delivered}</span>}
          </div>

          {/* Proof photo */}
          {activation.proof_photo_url && (
            <div className="mt-2">
              <img src={activation.proof_photo_url} alt="Proof" className="w-24 h-24 object-cover rounded border border-border" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleProofPhoto} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="text-[10px] font-mono text-accent hover:underline" title="Upload proof photo">
            {activation.proof_photo_url ? 'Replace' : 'Photo'}
          </button>
          <select
            value={activation.status || 'Scheduled'}
            onChange={(e) => onUpdate({ status: e.target.value, completed: e.target.value === 'Done' })}
            className={`text-[10px] font-mono px-2 py-1 rounded shrink-0 focus:outline-none ${activationStatusColor[activation.status || 'Scheduled']}`}
          >
            {ACTIVATION_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

function ActivationCard({ activation, onUpdate }) {
  return (
    <div className="bg-bg-surface border border-border rounded p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {activation.deals?.logo_url && (
              <img src={activation.deals.logo_url} alt={activation.deals.brand_name} className="w-5 h-5 rounded object-cover" />
            )}
            <span className="text-sm text-text-primary">{activation.deals?.brand_name || 'Activation'}</span>
          </div>
          <div className="text-xs text-text-secondary mt-0.5">{activation.activation_description}</div>
          <div className="flex gap-3 mt-1 text-[10px] text-text-muted font-mono flex-wrap">
            {activation.location && <span>{activation.location}</span>}
            {activation.asset_delivered && <span>{activation.asset_delivered}</span>}
            {activation.quantity_delivered && <span>qty: {activation.quantity_delivered}</span>}
          </div>
        </div>
        <select
          value={activation.status || 'Scheduled'}
          onChange={(e) => onUpdate({ status: e.target.value, completed: e.target.value === 'Done' })}
          className={`text-[10px] font-mono px-2 py-1 rounded shrink-0 focus:outline-none ${activationStatusColor[activation.status || 'Scheduled']}`}
        >
          {ACTIVATION_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  )
}
