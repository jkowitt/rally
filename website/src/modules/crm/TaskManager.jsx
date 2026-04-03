import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const PRIORITIES = ['High', 'Medium', 'Low']
const STATUSES = ['Pending', 'In Progress', 'Done']
const PRIORITY_COLOR = { High: 'text-danger', Medium: 'text-warning', Low: 'text-text-muted' }
const PRIORITY_BG = { High: 'bg-danger/10', Medium: 'bg-warning/10', Low: 'bg-bg-card' }

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateString(date) {
  return date.toISOString().split('T')[0]
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

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (task) => {
      const payload = { ...task }
      // Clean empty optional fields
      if (!payload.deal_id) delete payload.deal_id
      if (!payload.description) delete payload.description
      if (!payload.assigned_to) delete payload.assigned_to

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
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'Done', completed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', propertyId] })
      toast({ title: 'Task completed!', type: 'success' })
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
    const o = []
    const u = []
    const c = []
    for (const task of tasks) {
      if (task.status === 'Done') {
        c.push(task)
      } else if (task.due_date && task.due_date < today) {
        o.push(task)
      } else {
        u.push(task)
      }
    }
    // Sort completed by completed_at descending
    c.sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
    return { overdue: o, upcoming: u, completed: c }
  }, [tasks, today])

  const totalActive = (tasks?.filter((t) => t.status !== 'Done') || []).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Task Manager</h1>
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
        <button
          onClick={() => { setEditingTask(null); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + New Task
        </button>
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
          {/* Overdue Section */}
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

          {/* Due Today / Upcoming Section */}
          <TaskSection
            title="Due Today & Upcoming"
            tasks={upcoming}
            variant="default"
            today={today}
            onMarkDone={(id) => markDoneMutation.mutate(id)}
            onEdit={(task) => { setEditingTask(task); setShowForm(true) }}
            onDelete={(id) => { if (confirm('Delete this task?')) deleteMutation.mutate(id) }}
          />

          {/* Completed Section (collapsed by default) */}
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

          {/* Empty state */}
          {tasks?.length === 0 && (
            <div className="bg-bg-surface border border-border rounded-lg px-4 py-12 text-center">
              <p className="text-text-muted text-sm">No tasks yet. Create one to start tracking follow-ups.</p>
            </div>
          )}
        </>
      )}

      {/* Task Form Modal */}
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
                    <span className={`text-sm font-medium ${isCompleted ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      {task.title}
                    </span>
                    {task.priority && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${PRIORITY_COLOR[task.priority]} ${PRIORITY_BG[task.priority]}`}>
                        {task.priority}
                      </span>
                    )}
                    {task.status && task.status !== 'Done' && (
                      <span className="text-[10px] font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded">
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
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {task.deals?.brand_name && (
                      <span className="text-xs text-accent font-mono">{task.deals.brand_name}</span>
                    )}
                    {task.due_date && (
                      <span className={`text-xs font-mono ${isOverdue ? 'text-danger' : 'text-text-muted'}`}>
                        Due {formatDate(task.due_date)}
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

                {/* Actions */}
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
              {variant === 'overdue' ? 'No overdue tasks.' : 'No upcoming tasks.'}
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
    due_date: task?.due_date || toDateString(new Date()),
    priority: task?.priority || 'Medium',
    status: task?.status || 'Pending',
    deal_id: task?.deal_id || '',
    assigned_to: task?.assigned_to || '',
    ...(task?.id ? { id: task.id } : {}),
  })

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
          {task ? 'Edit Task' : 'New Task'}
        </h2>

        <div className="space-y-3">
          {/* Title */}
          <input
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            required
            autoFocus
          />

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className={`${inputClass} resize-none`}
          />

          {/* Due Date */}
          <div>
            <label className="text-xs text-text-muted">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className={inputClass}
              required
            />
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
            <label className="text-xs text-text-muted">Deal (optional)</label>
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

          {/* Assigned to */}
          <input
            placeholder="Assigned to (optional)"
            value={form.assigned_to}
            onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="submit"
            disabled={saving || !form.title}
            className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Task'}
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
