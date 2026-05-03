import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, EmptyState } from '@/components/ui'
import { ClipboardList } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import * as projectService from '@/services/projectService'

export default function ProjectList() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [showCreate, setShowCreate] = useState(false)
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    reload()
    projectService.getProjectStats().then(setStats)
    projectService.listTemplates().then(setTemplates)
  }, [])

  useEffect(() => { reload() }, [filter])

  async function reload() {
    setLoading(true)
    const r = await projectService.listProjects({ status: filter === 'all' ? undefined : filter })
    setProjects(r.projects)
    setLoading(false)
  }

  async function handleCreateBlank(fields) {
    const r = await projectService.createProject({
      ...fields,
      property_id: profile?.property_id,
      status: 'active',
    }, profile?.id)
    if (r.success) {
      setShowCreate(false)
      reload()
      projectService.getProjectStats().then(setStats)
    }
  }

  async function handleCreateFromTemplate(templateId, name) {
    const r = await projectService.createFromTemplate(
      templateId,
      { name, property_id: profile?.property_id },
      profile?.id,
      profile?.property_id,
    )
    if (r.success) {
      setShowCreate(false)
      reload()
      projectService.getProjectStats().then(setStats)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">Projects</div>
          <h1 className="text-2xl font-semibold text-text-primary">Project Management</h1>
          <p className="text-xs text-text-muted mt-1">Organize tasks, track milestones, and link to deals and campaigns.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs px-4 py-2 bg-accent text-bg-primary rounded font-semibold hover:opacity-90"
        >
          + New Project
        </button>
      </header>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Active" value={stats.active} color="accent" onClick={() => setFilter('active')} active={filter === 'active'} />
          <StatTile label="Completed" value={stats.completed} color="success" onClick={() => setFilter('completed')} active={filter === 'completed'} />
          <StatTile label="On Hold" value={stats.onHold} color="warning" onClick={() => setFilter('on_hold')} active={filter === 'on_hold'} />
          <StatTile label="All" value={stats.total} color="muted" onClick={() => setFilter('all')} active={filter === 'all'} />
        </div>
      )}

      {/* Project grid */}
      {loading ? (
        <div className="text-xs text-text-muted">Loading projects…</div>
      ) : projects.length === 0 ? (
        <ProjectListEmpty onCreateClick={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          templates={templates}
          onClose={() => setShowCreate(false)}
          onCreateBlank={handleCreateBlank}
          onCreateFromTemplate={handleCreateFromTemplate}
        />
      )}
    </div>
  )
}

function ProjectCard({ project: p }) {
  const priorityColors = { low: 'border-l-text-muted', medium: 'border-l-accent', high: 'border-l-warning', urgent: 'border-l-danger' }
  const statusColors = { active: 'text-accent', completed: 'text-success', on_hold: 'text-warning', cancelled: 'text-text-muted', planning: 'text-text-secondary' }

  return (
    <Link
      to={`/app/ops/projects/${p.id}`}
      className="bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-colors block"
    >
      <div className={`border-l-2 ${priorityColors[p.priority] || 'border-l-accent'} pl-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-primary truncate">{p.name}</div>
            {p.deal?.company_name && (
              <div className="text-[10px] text-text-muted mt-0.5">🔗 {p.deal.company_name}</div>
            )}
          </div>
          <span className={`text-[9px] font-mono uppercase ${statusColors[p.status] || ''}`}>
            {p.status.replace('_', ' ')}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
            <span>{p.completed_tasks}/{p.total_tasks} tasks</span>
            <span>{p.progress_percent}%</span>
          </div>
          <div className="w-full bg-bg-surface rounded-full h-1.5">
            <div
              className="bg-accent rounded-full h-1.5 transition-all duration-300"
              style={{ width: `${p.progress_percent}%` }}
            />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-text-muted">
          {p.current_phase && <span>{p.current_phase}</span>}
          {p.owner?.full_name && <span>👤 {p.owner.full_name}</span>}
          {p.target_end_date && (
            <span className={new Date(p.target_end_date) < new Date() && p.status === 'active' ? 'text-danger' : ''}>
              📅 {new Date(p.target_end_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function ProjectListEmpty({ onCreateClick }) {
  return (
    <EmptyState
      icon={<ClipboardList className="w-8 h-8 text-text-muted" />}
      title="No projects yet"
      description="Projects help you organize tasks, track milestones, and link work to deals and campaigns. When a deal closes, a project is auto-created from your default template."
      primaryAction={
        <Button size="lg" onClick={onCreateClick}>
          Create your first project
        </Button>
      }
    />
  )
}

function CreateProjectModal({ templates, onClose, onCreateBlank, onCreateFromTemplate }) {
  const [tab, setTab] = useState(templates.length > 0 ? 'template' : 'blank')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(templates.find(t => t.is_default)?.id || templates[0]?.id || '')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-lg max-w-lg w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">New Project</div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">×</button>
        </div>

        {/* Tabs */}
        {templates.length > 0 && (
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setTab('template')}
              className={`text-[10px] font-mono uppercase px-3 py-1.5 rounded ${tab === 'template' ? 'bg-accent/15 text-accent' : 'text-text-muted'}`}
            >
              From Template
            </button>
            <button
              onClick={() => setTab('blank')}
              className={`text-[10px] font-mono uppercase px-3 py-1.5 rounded ${tab === 'blank' ? 'bg-accent/15 text-accent' : 'text-text-muted'}`}
            >
              Blank
            </button>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-text-muted mb-1">Project name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Q4 Nike Renewal"
              className="w-full bg-bg-card border border-border rounded px-3 py-2 focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          {tab === 'template' && (
            <div>
              <label className="block text-text-muted mb-1">Template</label>
              <div className="space-y-2">
                {templates.map(t => (
                  <label
                    key={t.id}
                    className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                      selectedTemplate === t.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      checked={selectedTemplate === t.id}
                      onChange={() => setSelectedTemplate(t.id)}
                      className="accent-accent mt-0.5"
                    />
                    <div>
                      <div className="text-sm text-text-primary font-medium">{t.name}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">{t.description}</div>
                      {t.is_default && (
                        <span className="text-[8px] font-mono uppercase bg-accent/15 text-accent px-1.5 py-0.5 rounded mt-1 inline-block">Default</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === 'blank' && (
            <div>
              <label className="block text-text-muted mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="What's this project about?"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 focus:outline-none focus:border-accent"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-border text-text-secondary py-2 rounded text-xs">Cancel</button>
          <button
            onClick={() => {
              if (!name.trim()) return
              if (tab === 'template' && selectedTemplate) {
                onCreateFromTemplate(selectedTemplate, name.trim())
              } else {
                onCreateBlank({ name: name.trim(), description })
              }
            }}
            disabled={!name.trim()}
            className="flex-1 bg-accent text-bg-primary py-2 rounded text-xs font-semibold disabled:opacity-50"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}

function StatTile({ label, value, color, onClick, active }) {
  const cls = color === 'success' ? 'text-success' : color === 'warning' ? 'text-warning' : color === 'muted' ? 'text-text-muted' : 'text-accent'
  return (
    <button
      onClick={onClick}
      className={`bg-bg-card border rounded-lg p-3 text-left transition-colors ${
        active ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30'
      }`}
    >
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cls}`}>{value}</div>
    </button>
  )
}
