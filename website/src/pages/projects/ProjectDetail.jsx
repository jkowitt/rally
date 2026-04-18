import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as projectService from '@/services/projectService'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'border-t-text-muted' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-accent' },
  { id: 'review', label: 'Review', color: 'border-t-warning' },
  { id: 'done', label: 'Done', color: 'border-t-success' },
]

export default function ProjectDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [project, setProject] = useState(null)
  const [phases, setPhases] = useState([])
  const [tasks, setTasks] = useState([])
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('board')
  const [showAddTask, setShowAddTask] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [activePhase, setActivePhase] = useState('all')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [pRes, phRes, tRes, cRes] = await Promise.all([
      projectService.getProject(id),
      projectService.listPhases(id),
      projectService.listTasks(id),
      projectService.listComments(id),
    ])
    setProject(pRes.project)
    setPhases(phRes)
    setTasks(tRes)
    setComments(cRes)
    setLoading(false)
  }

  async function handleStatusChange(taskId, newStatus) {
    const r = await projectService.updateTask(taskId, { status: newStatus })
    if (r.success) {
      setTasks(prev => prev.map(t => t.id === taskId ? r.task : t))
      const { project: updated } = await projectService.getProject(id)
      if (updated) setProject(updated)
    }
  }

  async function handleAddTask(fields) {
    const r = await projectService.createTask(id, fields, profile?.id)
    if (r.success) {
      setTasks(prev => [...prev, r.task])
      setShowAddTask(false)
      const { project: updated } = await projectService.getProject(id)
      if (updated) setProject(updated)
    }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return
    const r = await projectService.addComment(id, newComment.trim(), profile?.id)
    if (r.success) {
      setComments(prev => [...prev, r.comment])
      setNewComment('')
    }
  }

  async function handlePhaseStatus(phaseId, status) {
    await projectService.updatePhase(phaseId, {
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    const updated = await projectService.listPhases(id)
    setPhases(updated)
    const activeName = updated.find(p => p.status === 'active')?.name
    if (activeName) await projectService.updateProject(id, { current_phase: activeName })
    load()
  }

  if (loading) return <div className="p-6 text-xs text-text-muted">Loading project…</div>
  if (!project) return (
    <div className="p-6 text-center">
      <p className="text-sm text-text-muted">Project not found.</p>
      <Link to="/app/crm/projects" className="text-accent text-xs hover:underline">← All projects</Link>
    </div>
  )

  const filteredTasks = activePhase === 'all' ? tasks : tasks.filter(t => t.phase_id === activePhase)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <header>
        <Link to="/app/crm/projects" className="text-[10px] text-text-muted hover:text-accent">← All projects</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-text-primary">{project.name}</h1>
            {project.description && <p className="text-xs text-text-muted mt-1">{project.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted flex-wrap">
              <StatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
              {project.deal?.company_name && (
                <Link to={`/app/crm/pipeline`} className="text-accent hover:underline">🔗 {project.deal.company_name}</Link>
              )}
              {project.owner?.full_name && <span>👤 {project.owner.full_name}</span>}
              {project.current_phase && <span>📍 {project.current_phase}</span>}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setView('board')}
              className={`text-[10px] font-mono px-3 py-1.5 rounded ${view === 'board' ? 'bg-accent/15 text-accent' : 'text-text-muted'}`}
            >
              Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`text-[10px] font-mono px-3 py-1.5 rounded ${view === 'list' ? 'bg-accent/15 text-accent' : 'text-text-muted'}`}
            >
              List
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
            <span>{project.completed_tasks} of {project.total_tasks} tasks complete</span>
            <span className="font-semibold text-accent">{project.progress_percent}%</span>
          </div>
          <div className="w-full bg-bg-surface rounded-full h-2">
            <div className="bg-accent rounded-full h-2 transition-all" style={{ width: `${project.progress_percent}%` }} />
          </div>
        </div>
      </header>

      {/* Phases strip */}
      {phases.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActivePhase('all')}
            className={`text-[10px] font-mono px-3 py-1.5 rounded whitespace-nowrap border ${
              activePhase === 'all' ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted'
            }`}
          >
            All tasks
          </button>
          {phases.map(ph => (
            <button
              key={ph.id}
              onClick={() => setActivePhase(ph.id)}
              className={`text-[10px] font-mono px-3 py-1.5 rounded whitespace-nowrap border flex items-center gap-1.5 ${
                activePhase === ph.id ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted'
              }`}
            >
              <PhaseIcon status={ph.status} />
              {ph.name}
              {ph.status !== 'completed' && ph.status !== 'skipped' && (
                <button
                  onClick={(e) => { e.stopPropagation(); handlePhaseStatus(ph.id, 'completed') }}
                  title="Mark phase complete"
                  className="ml-1 text-success hover:bg-success/20 rounded px-1"
                >
                  ✓
                </button>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Add task button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAddTask(true)}
          className="text-xs px-3 py-1.5 bg-accent text-bg-primary rounded font-semibold hover:opacity-90"
        >
          + Add Task
        </button>
      </div>

      {/* Board or List view */}
      {view === 'board' ? (
        <KanbanBoard tasks={filteredTasks} onStatusChange={handleStatusChange} />
      ) : (
        <TaskListView tasks={filteredTasks} phases={phases} onStatusChange={handleStatusChange} />
      )}

      {/* Comments */}
      <section className="bg-bg-card border border-border rounded-lg p-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
          Comments · {comments.length}
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-[10px] flex items-center justify-center shrink-0 font-semibold">
                {(c.author?.full_name || 'U')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-text-muted">
                  <span className="text-text-primary font-medium">{c.author?.full_name || 'Unknown'}</span>
                  {' · '}
                  {new Date(c.created_at).toLocaleString()}
                </div>
                <div className="text-xs text-text-secondary mt-0.5 whitespace-pre-wrap">{c.body}</div>
              </div>
            </div>
          ))}
          {comments.length === 0 && <div className="text-xs text-text-muted">No comments yet.</div>}
        </div>
        <div className="flex gap-2">
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
            placeholder="Add a comment…"
            className="flex-1 bg-bg-surface border border-border rounded px-3 py-2 text-xs focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="px-3 py-2 bg-accent text-bg-primary rounded text-xs font-semibold disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </section>

      {/* Add task modal */}
      {showAddTask && (
        <AddTaskModal
          phases={phases}
          onClose={() => setShowAddTask(false)}
          onSave={handleAddTask}
        />
      )}
    </div>
  )
}

// ─── Kanban Board ────────────────────────────────────────

function KanbanBoard({ tasks, onStatusChange }) {
  function handleDragStart(e, taskId) {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e, newStatus) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) onStatusChange(taskId, newStatus)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id)
        return (
          <div
            key={col.id}
            className={`bg-bg-surface border border-border rounded-lg ${col.color} border-t-2 min-h-[200px]`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, col.id)}
          >
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">{col.label}</span>
              <span className="text-[10px] text-text-muted font-mono">{colTasks.length}</span>
            </div>
            <div className="p-2 space-y-2">
              {colTasks.map(task => (
                <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} draggable onDragStart={handleDragStart} />
              ))}
              {colTasks.length === 0 && (
                <div className="text-[10px] text-text-muted text-center py-6 opacity-50">Drop tasks here</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskCard({ task, onStatusChange, draggable, onDragStart }) {
  const priorityStripe = {
    low: 'border-l-text-muted',
    medium: 'border-l-accent',
    high: 'border-l-warning',
    urgent: 'border-l-danger',
  }

  return (
    <div
      draggable={draggable}
      onDragStart={e => onDragStart?.(e, task.id)}
      className={`bg-bg-card border border-border rounded p-3 cursor-grab active:cursor-grabbing hover:border-accent/30 transition-colors border-l-2 ${priorityStripe[task.priority] || ''}`}
    >
      <div className="text-xs text-text-primary font-medium leading-snug">{task.title}</div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-text-muted flex-wrap">
        {task.assignee?.full_name && (
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-accent/20 text-accent text-[8px] flex items-center justify-center font-bold">
              {task.assignee.full_name[0]}
            </span>
            {task.assignee.full_name.split(' ')[0]}
          </span>
        )}
        {task.due_date && (
          <span className={new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-danger' : ''}>
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
      {task.status !== 'done' && (
        <div className="flex gap-1 mt-2">
          {COLUMNS.filter(c => c.id !== task.status).map(c => (
            <button
              key={c.id}
              onClick={() => onStatusChange(task.id, c.id)}
              className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border border-border text-text-muted hover:text-text-primary hover:border-accent/30"
            >
              → {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── List View ───────────────────────────────────────────

function TaskListView({ tasks, phases, onStatusChange }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-bg-surface text-[10px] uppercase tracking-wider text-text-muted">
          <tr>
            <th className="p-3 text-left">Task</th>
            <th className="p-3 text-left">Phase</th>
            <th className="p-3 text-left">Assignee</th>
            <th className="p-3 text-left">Priority</th>
            <th className="p-3 text-left">Due</th>
            <th className="p-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tasks.map(t => {
            const phase = phases.find(p => p.id === t.phase_id)
            return (
              <tr key={t.id} className="hover:bg-bg-surface/50">
                <td className="p-3 text-text-primary font-medium">{t.title}</td>
                <td className="p-3 text-text-muted">{phase?.name || '—'}</td>
                <td className="p-3 text-text-muted">{t.assignee?.full_name || '—'}</td>
                <td className="p-3"><PriorityBadge priority={t.priority} /></td>
                <td className="p-3 text-text-muted font-mono">
                  {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                </td>
                <td className="p-3">
                  <select
                    value={t.status}
                    onChange={e => onStatusChange(t.id, e.target.value)}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-[10px]"
                  >
                    {projectService.TASK_STATUSES.map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </td>
              </tr>
            )
          })}
          {tasks.length === 0 && (
            <tr><td colSpan={6} className="p-6 text-center text-text-muted">No tasks in this view.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Add Task Modal ──────────────────────────────────────

function AddTaskModal({ phases, onClose, onSave }) {
  const [fields, setFields] = useState({
    title: '',
    description: '',
    phase_id: phases[0]?.id || null,
    priority: 'medium',
    due_date: '',
    status: 'todo',
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-lg max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">Add Task</div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">×</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (fields.title.trim()) onSave(fields) }} className="space-y-3 text-xs">
          <div>
            <label className="block text-text-muted mb-1">Title *</label>
            <input
              value={fields.title}
              onChange={e => setFields({ ...fields, title: e.target.value })}
              placeholder="What needs to be done?"
              className="w-full bg-bg-card border border-border rounded px-3 py-2 focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-text-muted mb-1">Description</label>
            <textarea
              value={fields.description}
              onChange={e => setFields({ ...fields, description: e.target.value })}
              rows={2}
              className="w-full bg-bg-card border border-border rounded px-3 py-2 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {phases.length > 0 && (
              <div>
                <label className="block text-text-muted mb-1">Phase</label>
                <select
                  value={fields.phase_id || ''}
                  onChange={e => setFields({ ...fields, phase_id: e.target.value || null })}
                  className="w-full bg-bg-card border border-border rounded px-2 py-2"
                >
                  {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-text-muted mb-1">Priority</label>
              <select
                value={fields.priority}
                onChange={e => setFields({ ...fields, priority: e.target.value })}
                className="w-full bg-bg-card border border-border rounded px-2 py-2"
              >
                {projectService.PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-text-muted mb-1">Due date</label>
            <input
              type="date"
              value={fields.due_date}
              onChange={e => setFields({ ...fields, due_date: e.target.value })}
              className="w-full bg-bg-card border border-border rounded px-3 py-2"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border text-text-secondary py-2 rounded">Cancel</button>
            <button type="submit" disabled={!fields.title.trim()} className="flex-1 bg-accent text-bg-primary py-2 rounded font-semibold disabled:opacity-50">Add Task</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Shared components ───────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    planning: 'bg-bg-surface text-text-secondary',
    active: 'bg-accent/15 text-accent',
    on_hold: 'bg-warning/15 text-warning',
    completed: 'bg-success/15 text-success',
    cancelled: 'bg-bg-surface text-text-muted',
  }
  return (
    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${styles[status] || styles.planning}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const styles = {
    low: 'text-text-muted',
    medium: 'text-accent',
    high: 'text-warning',
    urgent: 'text-danger',
  }
  return <span className={`text-[9px] font-mono uppercase ${styles[priority] || ''}`}>{priority}</span>
}

function PhaseIcon({ status }) {
  if (status === 'completed') return <span className="text-success">✓</span>
  if (status === 'active') return <span className="text-accent">●</span>
  if (status === 'skipped') return <span className="text-text-muted">⊘</span>
  return <span className="text-text-muted">○</span>
}
