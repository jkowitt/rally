import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const PRIORITIES = ['High', 'Medium', 'Low']
const STATUSES = ['Pending', 'In Progress', 'Done']
const PRIORITY_COLOR = { High: 'text-danger', Medium: 'text-warning', Low: 'text-text-muted' }
const PRIORITY_BG = { High: 'bg-danger/10', Medium: 'bg-warning/10', Low: 'bg-bg-card' }

const TASK_TYPES = [
  { value: 'Call', icon: '📞', label: 'Call' },
  { value: 'Email', icon: '✉️', label: 'Email' },
  { value: 'Text', icon: '💬', label: 'Text Message' },
  { value: 'Meeting', icon: '🤝', label: 'Meeting' },
  { value: 'Follow Up', icon: '🔔', label: 'Follow Up' },
  { value: 'LinkedIn Message', icon: '💼', label: 'LinkedIn Message' },
  { value: 'Proposal', icon: '📋', label: 'Proposal Creation' },
  { value: 'Contract', icon: '📄', label: 'Contract Sent' },
  { value: 'Presentation', icon: '📊', label: 'Presentation' },
  { value: 'Research', icon: '🔍', label: 'Research' },
  { value: 'Other', icon: '📌', label: 'Other' },
]

const TYPE_ICON = Object.fromEntries(TASK_TYPES.map(t => [t.value, t.icon]))

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${m} ${ampm}`
}

function toDateString(date) {
  return date.toISOString().split('T')[0]
}

// ── Push Notification Support ──────────────────────────────────
let swRegistration = null

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    swRegistration = await navigator.serviceWorker.register('/sw-notifications.js')
    return swRegistration
  } catch { return null }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  if (result === 'granted') await registerServiceWorker()
  return result
}

function sendNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    // Prefer service worker notification (works in background)
    if (swRegistration) {
      swRegistration.showNotification(title, {
        body,
        icon: '/favicon.svg',
        tag: tag || 'loud-legacy-reminder',
        requireInteraction: true,
      })
    } else {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag: tag || 'loud-legacy-reminder',
        requireInteraction: true,
      })
      notification.onclick = () => { window.focus(); notification.close() }
    }
  } catch { /* skip */ }
}

// Sync reminders to service worker for background firing
function syncRemindersToSW(tasks) {
  if (!swRegistration?.active || !tasks?.length) return
  const reminders = tasks
    .filter(t => t.status !== 'Done' && t.due_date && t.reminder_time)
    .map(t => ({
      id: t.id,
      date: t.due_date,
      time: t.reminder_time,
      title: `${TYPE_ICON[t.task_type] || '📌'} ${t.task_type || 'Task'}: ${t.title}`,
      body: t.deals?.brand_name ? `Deal: ${t.deals.brand_name}` : t.description || 'Reminder',
    }))
  swRegistration.active.postMessage({ type: 'SCHEDULE_NOTIFICATIONS', reminders })
}

// Track fired notifications in localStorage
function getNotifiedIds() {
  try { return JSON.parse(localStorage.getItem('ll_notified') || '[]') } catch { return [] }
}
function markNotified(id) {
  const ids = getNotifiedIds()
  if (!ids.includes(id)) {
    ids.push(id)
    // Keep only last 200
    if (ids.length > 200) ids.splice(0, ids.length - 200)
    localStorage.setItem('ll_notified', JSON.stringify(ids))
  }
}

// Check for due reminders every 30s — also catches missed ones within 10 min window
function useReminderChecker(tasks) {
  useEffect(() => {
    if (!tasks?.length) return

    // Register SW on mount
    registerServiceWorker().then(() => syncRemindersToSW(tasks))

    const notified = getNotifiedIds()

    function check() {
      const now = new Date()
      const todayStr = toDateString(now)
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      for (const task of tasks) {
        if (task.status === 'Done') continue
        if (!task.due_date || !task.reminder_time) continue
        if (task.due_date !== todayStr) continue
        if (notified.includes(task.id)) continue

        const [h, m] = task.reminder_time.split(':').map(Number)
        if (isNaN(h) || isNaN(m)) continue
        const reminderMinutes = h * 60 + m

        // Fire if within 10-minute catch-up window
        if (currentMinutes >= reminderMinutes && currentMinutes <= reminderMinutes + 10) {
          markNotified(task.id)
          sendNotification(
            `${TYPE_ICON[task.task_type] || '📌'} ${task.task_type || 'Task'}: ${task.title}`,
            task.deals?.brand_name ? `Deal: ${task.deals.brand_name}` : task.description || 'Reminder',
            `task-${task.id}`
          )
        }
      }
    }
    const interval = setInterval(check, 30000)
    check()
    return () => clearInterval(interval)
  }, [tasks])
}

export default function TaskManager() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const userId = profile?.id

  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  )

  const today = toDateString(new Date())

  // Fetch tasks with deal join
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, deals(brand_name)')
        .eq('property_id', propertyId)
        .order('due_date', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!propertyId,
  })

  // Fetch deals for the form dropdown
  const { data: deals } = useQuery({
    queryKey: ['deals', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, brand_name')
        .eq('property_id', propertyId)
        .order('brand_name')
      if (error) throw error
      return data || []
    },
    enabled: !!propertyId,
  })

  // Push notification reminder checker
  useReminderChecker(tasks)

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (task) => {
      const payload = { ...task }
      if (!payload.deal_id) delete payload.deal_id
      if (!payload.description) delete payload.description
      if (!payload.assigned_to) delete payload.assigned_to
      // New fields gracefully handled
      if (!payload.task_type) delete payload.task_type
      if (!payload.scheduled_time) delete payload.scheduled_time
      if (!payload.reminder_time) delete payload.reminder_time
      if (payload.notify === undefined) delete payload.notify

      if (payload.id) {
        const { id, ...updates } = payload
        const { error } = await supabase.from('tasks').update(updates).eq('id', id)
        if (error) throw error
      } else {
        delete payload.id
        const { error } = await supabase.from('tasks').insert({
          ...payload,
          property_id: propertyId,
          created_by: userId,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', propertyId] })
      toast({ title: 'Task saved', type: 'success' })
      setShowForm(false)
      setEditingTask(null)
    },
    onError: (err) => toast({ title: 'Error saving task', description: err.message, type: 'error' }),
  })

  const markDoneMutation = useMutation({
    mutationFn: async (id) => {
      // Mark task done
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'Done', completed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error

      // Auto-log as activity on the deal
      const task = tasks?.find(t => t.id === id)
      if (task?.deal_id) {
        try {
          await supabase.from('activities').insert({
            property_id: propertyId,
            created_by: userId,
            deal_id: task.deal_id,
            activity_type: task.task_type === 'Email' ? 'Email'
              : task.task_type === 'Call' ? 'Call'
              : task.task_type === 'Meeting' ? 'Meeting'
              : task.task_type === 'Contract' ? 'Contract Sent'
              : task.task_type === 'Follow Up' ? 'Follow Up'
              : 'Task Completed',
            subject: `${task.task_type || 'Task'}: ${task.title}`,
            description: task.description || null,
            occurred_at: new Date().toISOString(),
          })
        } catch { /* activities table may not exist */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['activities', propertyId] })
      toast({ title: 'Task completed — logged to activities', type: 'success' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', propertyId] })
      toast({ title: 'Task deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting task', description: err.message, type: 'error' }),
  })

  // Categorize tasks
  const { overdue, upcoming, completed } = useMemo(() => {
    if (!tasks) return { overdue: [], upcoming: [], completed: [] }
    const filtered = filterType ? tasks.filter(t => t.task_type === filterType) : tasks
    const o = []
    const u = []
    const c = []
    for (const task of filtered) {
      if (task.status === 'Done') {
        c.push(task)
      } else if (task.due_date && task.due_date < today) {
        o.push(task)
      } else {
        u.push(task)
      }
    }
    c.sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
    return { overdue: o, upcoming: u, completed: c }
  }, [tasks, today, filterType])

  const totalActive = (tasks?.filter((t) => t.status !== 'Done') || []).length

  async function enableNotifications() {
    const result = await requestNotificationPermission()
    setNotifPermission(result)
    if (result === 'granted') {
      toast({ title: 'Push notifications enabled', type: 'success' })
      sendNotification('Loud Legacy', 'You will now receive task reminders', 'test')
    } else if (result === 'denied') {
      toast({ title: 'Notifications blocked', description: 'Enable in browser settings', type: 'warning' })
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Task Manager</h1>
          <p className="text-text-secondary text-sm mt-1">
            {totalActive} active task{totalActive !== 1 ? 's' : ''}
            {overdue.length > 0 && (
              <span className="text-danger"> &middot; {overdue.length} overdue</span>
            )}
            {completed.length > 0 && (
              <span className="text-text-muted"> &middot; {completed.length} completed</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Notification toggle */}
          {notifPermission !== 'unsupported' && (
            <button
              onClick={enableNotifications}
              className={`px-3 py-2 rounded text-xs font-mono border transition-colors ${
                notifPermission === 'granted'
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-bg-surface border-border text-text-muted hover:text-accent hover:border-accent/50'
              }`}
            >
              {notifPermission === 'granted' ? 'Notifications On' : 'Enable Notifications'}
            </button>
          )}
          <button
            onClick={() => { setEditingTask(null); setShowForm(true) }}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
          >
            + Schedule Activity
          </button>
        </div>
      </div>

      {/* Activity type filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${!filterType ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-surface border-border text-text-muted hover:text-accent'}`}
        >
          All
        </button>
        {TASK_TYPES.filter(t => t.value !== 'Other').map(t => (
          <button
            key={t.value}
            onClick={() => setFilterType(filterType === t.value ? '' : t.value)}
            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${filterType === t.value ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-surface border-border text-text-muted hover:text-accent'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Overdue alert banner */}
      {overdue.length > 0 && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="bg-danger text-bg-primary text-xs font-mono font-bold px-2 py-0.5 rounded">
            {overdue.length}
          </span>
          <span className="text-sm text-danger font-medium">
            {overdue.length === 1 ? 'task is' : 'tasks are'} overdue and need{overdue.length === 1 ? 's' : ''} attention
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16" />)}
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <TaskSection
              title="Overdue"
              tasks={overdue}
              variant="overdue"
              onMarkDone={(id) => markDoneMutation.mutate(id)}
              onEdit={(task) => { setEditingTask(task); setShowForm(true) }}
              onDelete={(id) => { if (confirm('Delete this task?')) deleteMutation.mutate(id) }}
            />
          )}

          <TaskSection
            title="Due Today & Upcoming"
            tasks={upcoming}
            variant="default"
            today={today}
            onMarkDone={(id) => markDoneMutation.mutate(id)}
            onEdit={(task) => { setEditingTask(task); setShowForm(true) }}
            onDelete={(id) => { if (confirm('Delete this task?')) deleteMutation.mutate(id) }}
          />

          {completed.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm font-mono text-text-muted uppercase mb-3 hover:text-text-secondary transition-colors"
              >
                <span className="text-xs">{showCompleted ? '\u25BC' : '\u25B6'}</span>
                Completed ({completed.length})
              </button>
              {showCompleted && (
                <TaskSection
                  tasks={completed}
                  variant="completed"
                  onEdit={(task) => { setEditingTask(task); setShowForm(true) }}
                  onDelete={(id) => { if (confirm('Delete this task?')) deleteMutation.mutate(id) }}
                />
              )}
            </div>
          )}

          {tasks?.length === 0 && (
            <div className="bg-bg-surface border border-border rounded-lg px-4 py-12 text-center">
              <p className="text-text-muted text-sm">No scheduled activities yet. Create one to start tracking.</p>
            </div>
          )}
        </>
      )}

      {showForm && (
        <TaskForm
          task={editingTask}
          deals={deals || []}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => { setShowForm(false); setEditingTask(null) }}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  )
}

function TaskSection({ title, tasks, variant, today, onMarkDone, onEdit, onDelete }) {
  const isOverdue = variant === 'overdue'
  const isCompleted = variant === 'completed'

  return (
    <div>
      {title && (
        <h2 className={`text-sm font-mono uppercase mb-3 ${isOverdue ? 'text-danger' : 'text-text-muted'}`}>
          {title}
        </h2>
      )}
      <div className="space-y-2">
        {tasks.map((task) => {
          const isDueToday = today && task.due_date === today

          return (
            <div
              key={task.id}
              className={`bg-bg-surface border rounded-lg p-4 transition-colors hover:border-accent/30 ${
                isOverdue
                  ? 'border-danger/30 bg-danger/5'
                  : isCompleted
                    ? 'border-border opacity-60'
                    : isDueToday
                      ? 'border-warning/30'
                      : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.task_type && (
                      <span className="text-sm" title={task.task_type}>{TYPE_ICON[task.task_type] || '📌'}</span>
                    )}
                    <span className={`text-sm font-medium ${isCompleted ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      {task.title}
                    </span>
                    {task.priority && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${PRIORITY_COLOR[task.priority]} ${PRIORITY_BG[task.priority]}`}>
                        {task.priority}
                      </span>
                    )}
                    {task.task_type && (
                      <span className="text-[10px] font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded">
                        {task.task_type}
                      </span>
                    )}
                    {task.status && task.status !== 'Done' && task.status !== 'Pending' && (
                      <span className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                        {task.status}
                      </span>
                    )}
                    {isDueToday && !isOverdue && (
                      <span className="text-[10px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                        TODAY
                      </span>
                    )}
                    {isOverdue && (
                      <span className="text-[10px] font-mono text-danger bg-danger/10 px-1.5 py-0.5 rounded">
                        OVERDUE
                      </span>
                    )}
                    {task.reminder_time && !isCompleted && (
                      <span className="text-[10px] font-mono text-accent bg-accent/10 px-1 py-0.5 rounded" title="Reminder set">
                        🔔 {formatTime(task.reminder_time)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {task.deals?.brand_name && (
                      <span className="text-xs text-accent font-mono">{task.deals.brand_name}</span>
                    )}
                    {task.due_date && (
                      <span className={`text-xs font-mono ${isOverdue ? 'text-danger' : 'text-text-muted'}`}>
                        Due {formatDate(task.due_date)}
                        {task.scheduled_time && ` at ${formatTime(task.scheduled_time)}`}
                      </span>
                    )}
                    {isCompleted && task.completed_at && (
                      <span className="text-xs font-mono text-text-muted">
                        Done {formatDate(task.completed_at.split('T')[0])}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-text-muted mt-1 line-clamp-2">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isCompleted && onMarkDone && (
                    <button
                      onClick={() => onMarkDone(task.id)}
                      className="text-xs text-success hover:underline font-mono"
                    >
                      Done
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(task)}
                    className="text-xs text-text-muted hover:text-accent font-mono"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="text-xs text-text-muted hover:text-danger font-mono"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {tasks.length === 0 && title && (
          <div className="bg-bg-surface border border-border rounded-lg px-4 py-6 text-center">
            <p className="text-text-muted text-sm">
              {variant === 'overdue' ? 'No overdue tasks.' : 'No upcoming activities.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function TaskForm({ task, deals, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    task_type: task?.task_type || 'Call',
    due_date: task?.due_date || toDateString(new Date()),
    scheduled_time: task?.scheduled_time || '',
    reminder_time: task?.reminder_time || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'Pending',
    deal_id: task?.deal_id || '',
    assigned_to: task?.assigned_to || '',
    ...(task?.id ? { id: task.id } : {}),
  })

  // Auto-set reminder 15 min before scheduled time
  function setScheduledTime(time) {
    const newForm = { ...form, scheduled_time: time }
    if (time && !form.reminder_time) {
      const [h, m] = time.split(':').map(Number)
      const reminderMin = h * 60 + m - 15
      if (reminderMin >= 0) {
        newForm.reminder_time = `${String(Math.floor(reminderMin / 60)).padStart(2, '0')}:${String(reminderMin % 60).padStart(2, '0')}`
      }
    }
    setForm(newForm)
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form)
  }

  const inputClass =
    'w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {task ? 'Edit Activity' : 'Schedule Activity'}
        </h2>

        <div className="space-y-3">
          {/* Activity Type */}
          <div>
            <label className="text-xs text-text-muted">Activity Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1">
              {TASK_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, task_type: t.value })}
                  className={`px-2 py-2 rounded text-[11px] font-mono border transition-colors text-center ${
                    form.task_type === t.value
                      ? 'bg-accent text-bg-primary border-accent'
                      : 'bg-bg-card border-border text-text-muted hover:text-accent hover:border-accent/50'
                  }`}
                >
                  <div className="text-base mb-0.5">{t.icon}</div>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <input
            placeholder={`e.g. "${form.task_type === 'Call' ? 'Intro call with VP Marketing' : form.task_type === 'Email' ? 'Send proposal follow-up' : form.task_type === 'Meeting' ? 'Partnership presentation' : 'Activity title'}"`}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            required
            autoFocus
          />

          {/* Description */}
          <textarea
            placeholder="Notes / details (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className={`${inputClass} resize-none`}
          />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Time</label>
              <input
                type="time"
                value={form.scheduled_time}
                onChange={(e) => setScheduledTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Reminder */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-text-muted font-mono uppercase tracking-wider">Reminder</label>
              {form.reminder_time && (
                <span className="text-[10px] text-accent font-mono">🔔 {formatTime(form.reminder_time)}</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {[
                { label: 'At time', offset: 0 },
                { label: '15 min', offset: 15 },
                { label: '30 min', offset: 30 },
                { label: '1 hour', offset: 60 },
              ].map(opt => {
                function calcReminder() {
                  const time = form.scheduled_time || form.due_date ? '09:00' : ''
                  if (!time) return
                  const [h, m] = time.split(':').map(Number)
                  const mins = h * 60 + m - opt.offset
                  if (mins >= 0) {
                    setForm(prev => ({
                      ...prev,
                      reminder_time: `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`,
                    }))
                  }
                }
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={calcReminder}
                    className="text-[11px] font-mono bg-bg-surface border border-border rounded px-2 py-1.5 text-text-muted hover:text-accent hover:border-accent/50 transition-colors"
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <input
              type="time"
              value={form.reminder_time}
              onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
              className={`${inputClass} mt-2`}
              placeholder="Custom reminder time"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Push notification will fire at this time if notifications are enabled
            </p>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className={inputClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {task && (
              <div>
                <label className="text-xs text-text-muted">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={inputClass}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Deal dropdown */}
          <div>
            <label className="text-xs text-text-muted">Linked Deal</label>
            <select
              value={form.deal_id}
              onChange={(e) => setForm({ ...form, deal_id: e.target.value })}
              className={inputClass}
            >
              <option value="">No deal linked</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.brand_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="submit"
            disabled={saving || !form.title}
            className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : task ? 'Update Activity' : 'Schedule Activity'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
