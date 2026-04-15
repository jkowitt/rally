import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import * as digest from '@/services/digestIssueService'

/**
 * /app/developer/digest — admin list of every Digest issue
 * plus subscriber stats header. Clicking an issue opens the
 * editor. "New issue" button creates a blank draft and jumps
 * straight into the editor.
 */
export default function DigestAdminList() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [issues, setIssues] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  if (profile && profile.role !== 'developer') return <Navigate to="/app" replace />

  useEffect(() => { reload() }, [filter])

  async function reload() {
    setLoading(true)
    const [{ issues }, s] = await Promise.all([
      digest.listIssues({ status: filter }),
      digest.getDigestStats(),
    ])
    setIssues(issues)
    setStats(s)
    setLoading(false)
  }

  async function createNew() {
    const r = await digest.createIssue({
      title: 'Untitled draft',
      body_markdown: '',
      status: 'draft',
      industry: 'general',
    }, profile.id)
    if (r.success) navigate(`/app/developer/digest/${r.issue.id}`)
    else toast({ title: 'Failed', description: r.error, type: 'error' })
  }

  async function handleDelete(id) {
    if (!confirm('Delete this draft permanently?')) return
    await digest.deleteIssue(id)
    reload()
  }

  async function exportSubscribers() {
    const csv = await digest.exportSubscribersCsv()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `digest-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/app/developer" className="text-[10px] text-text-muted hover:text-accent">← Dev Tools</Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-1">The Digest</h1>
          <p className="text-[11px] text-text-muted">Editorial management for loud-legacy.com/digest</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportSubscribers} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">
            Export subscribers
          </button>
          <Link to="/digest" target="_blank" className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">
            View public archive ↗
          </Link>
          <button onClick={createNew} className="text-xs px-3 py-1.5 bg-accent text-bg-primary rounded font-semibold">
            + New issue
          </button>
        </div>
      </header>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Subscribers" value={stats.total} color="accent" />
          <Tile label="Active" value={stats.active} color="success" />
          <Tile label="New this month" value={stats.newThisMonth} />
          <Tile label="Unsubscribed" value={stats.unsubscribed} color="muted" />
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-border">
        {['all', 'draft', 'scheduled', 'published', 'archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs capitalize border-b-2 ${filter === f ? 'border-accent text-accent' : 'border-transparent text-text-secondary'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && <div className="text-xs text-text-muted py-4 text-center">Loading…</div>}

      {!loading && issues.length === 0 && (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center space-y-3">
          <div className="text-sm text-text-muted">No issues yet.</div>
          <button onClick={createNew} className="bg-accent text-bg-primary px-4 py-2 rounded text-xs font-semibold">
            Create the first issue
          </button>
        </div>
      )}

      <div className="space-y-2">
        {issues.map(i => (
          <Link
            key={i.id}
            to={`/app/developer/digest/${i.id}`}
            className="block bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-all"
          >
            <div className="flex items-start gap-3">
              {i.featured_image_url && (
                <img
                  src={i.featured_image_url}
                  alt=""
                  className="w-20 h-20 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={i.status} />
                  {i.industry && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-surface text-text-muted">
                      {digest.INDUSTRIES.find(x => x.key === i.industry)?.label || i.industry}
                    </span>
                  )}
                  {i.ai_researched && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">AI</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-text-primary mt-1">{i.title}</h3>
                {i.subtitle && <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{i.subtitle}</p>}
                <div className="text-[10px] text-text-muted mt-1.5">
                  {i.author || 'Loud Legacy Ventures'}
                  {i.published_at && ` · published ${new Date(i.published_at).toLocaleDateString()}`}
                  {!i.published_at && ` · updated ${new Date(i.updated_at || i.created_at).toLocaleDateString()}`}
                  {i.view_count > 0 && ` · ${i.view_count} views`}
                </div>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(i.id) }}
                className="text-[10px] text-text-muted hover:text-danger px-2 py-1"
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Tile({ label, value, color = 'secondary' }) {
  const cls = color === 'success' ? 'text-success'
    : color === 'accent' ? 'text-accent'
    : color === 'muted' ? 'text-text-muted'
    : 'text-text-primary'
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    draft:     'bg-bg-surface text-text-muted',
    scheduled: 'bg-warning/15 text-warning',
    published: 'bg-success/15 text-success',
    archived:  'bg-text-muted/15 text-text-muted',
  }
  return <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${map[status] || 'bg-bg-surface'}`}>{status}</span>
}
