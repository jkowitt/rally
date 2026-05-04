import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import * as qaComments from '@/services/qaCommentService'

/**
 * /app/developer/qa-comments — consolidated report of every QA
 * walkthrough comment. Filter by status / category / module,
 * search full-text, resolve inline, export to CSV or markdown.
 */
export default function QACommentsReport() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'open', category: 'all', module: 'all', search: '' })
  const [selected, setSelected] = useState(null)
  const [resolutionNote, setResolutionNote] = useState('')

  // reload declared before useEffect so the lint's TDZ check passes.
  async function reload() {
    setLoading(true)
    const [{ comments }, s] = await Promise.all([
      qaComments.listComments(filters),
      qaComments.getCommentStats(),
    ])
    setComments(comments)
    setStats(s)
    setLoading(false)
  }

  // Auth gate AFTER hooks (rules-of-hooks).
  useEffect(() => { reload() }, [filters])

  if (profile && profile.role !== 'developer') return <Navigate to="/app" replace />

  async function resolve(id) {
    await qaComments.resolveComment(id, profile.id, resolutionNote)
    setResolutionNote('')
    setSelected(null)
    reload()
    toast({ title: 'Comment resolved', type: 'success' })
  }

  async function dismiss(id) {
    await qaComments.updateComment(id, { status: 'dismissed' })
    reload()
    toast({ title: 'Dismissed', type: 'success' })
  }

  async function remove(id) {
    if (!confirm('Delete this comment permanently?')) return
    await qaComments.deleteComment(id)
    reload()
    toast({ title: 'Deleted', type: 'success' })
  }

  async function exportCsv() {
    const csv = await qaComments.exportCsv(filters)
    download(csv, `qa-comments-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')
  }

  async function exportMarkdown() {
    const md = await qaComments.exportMarkdown(filters)
    download(md, `qa-comments-${new Date().toISOString().slice(0, 10)}.md`, 'text/markdown')
  }

  function download(content, filename, type) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const moduleKeys = stats ? Object.keys(stats.byModule).sort() : []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/app/developer" className="text-[10px] text-text-muted hover:text-accent">← Dev Tools</Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-1">QA Walkthrough Comments</h1>
          <p className="text-[11px] text-text-muted">Every comment captured while walking the site.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportMarkdown} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">Export MD</button>
          <button onClick={exportCsv} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">Export CSV</button>
        </div>
      </header>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Tile label="Total" value={stats.total} />
          <Tile label="Open" value={stats.open} color="accent" />
          <Tile label="Resolved" value={stats.resolved} color="success" />
          <Tile label="Bugs" value={stats.byCategory.bug || 0} color={stats.byCategory.bug > 0 ? 'danger' : 'muted'} />
          <Tile label="Suggestions" value={stats.byCategory.suggestion || 0} />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap border-b border-border pb-3">
        <input
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search comment or URL…"
          className="bg-bg-card border border-border rounded px-3 py-1.5 text-xs w-64 focus:outline-none focus:border-accent"
        />
        <select
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}
          className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="wontfix">Won't fix</option>
        </select>
        <select
          value={filters.category}
          onChange={e => setFilters({ ...filters, category: e.target.value })}
          className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs"
        >
          <option value="all">All categories</option>
          {qaComments.CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
        </select>
        <select
          value={filters.module}
          onChange={e => setFilters({ ...filters, module: e.target.value })}
          className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs"
        >
          <option value="all">All modules</option>
          {moduleKeys.map(m => <option key={m} value={m}>{m} ({stats.byModule[m]})</option>)}
        </select>
      </div>

      {loading && <div className="text-xs text-text-muted py-4 text-center">Loading…</div>}

      {!loading && comments.length === 0 && (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center text-xs text-text-muted">
          No comments match these filters.
          <div className="mt-2">Click the floating 💬 button on any page to leave a comment.</div>
        </div>
      )}

      <div className="space-y-2">
        {comments.map(c => (
          <CommentRow
            key={c.id}
            comment={c}
            onSelect={() => setSelected(selected?.id === c.id ? null : c)}
            selected={selected?.id === c.id}
            onResolve={() => resolve(c.id)}
            onDismiss={() => dismiss(c.id)}
            onDelete={() => remove(c.id)}
            resolutionNote={resolutionNote}
            setResolutionNote={setResolutionNote}
          />
        ))}
      </div>
    </div>
  )
}

function Tile({ label, value, color = 'accent' }) {
  const cls = color === 'success' ? 'text-success' : color === 'danger' ? 'text-danger' : color === 'muted' ? 'text-text-muted' : 'text-accent'
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}

function CommentRow({ comment: c, onSelect, selected, onResolve, onDismiss, onDelete, resolutionNote, setResolutionNote }) {
  const cat = qaComments.CATEGORIES.find(x => x.key === c.category)
  const pri = qaComments.PRIORITIES.find(x => x.key === c.priority)
  const statusColor = c.status === 'resolved' ? 'text-success' : c.status === 'dismissed' ? 'text-text-muted' : 'text-accent'
  const author = c.created_by_profile?.full_name || c.created_by_profile?.email || 'Unknown'

  return (
    <div className={`bg-bg-card border rounded-lg p-4 ${selected ? 'border-accent/50' : 'border-border hover:border-accent/30'} ${c.status !== 'open' ? 'opacity-70' : ''}`}>
      <button onClick={onSelect} className="w-full text-left">
        <div className="flex items-start gap-3">
          <div className="text-2xl shrink-0">{cat?.icon || '📝'}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-accent/30 text-accent">{cat?.label}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-surface text-text-secondary">{pri?.label}</span>
              {c.module && <span className="text-[9px] font-mono text-text-muted">{c.module}</span>}
              <span className={`text-[9px] font-mono ml-auto ${statusColor}`}>{c.status}</span>
            </div>
            <div className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{c.comment}</div>
            <div className="text-[10px] text-text-muted mt-1">
              {author} · {new Date(c.created_at).toLocaleString()}
              {c.page_url && (
                <>
                  {' · '}
                  <a href={c.page_url} onClick={e => e.stopPropagation()} className="text-accent hover:underline">
                    {new URL(c.page_url, 'https://x').pathname}
                  </a>
                </>
              )}
            </div>
            {c.resolution_note && (
              <div className="mt-2 text-[11px] bg-success/5 border-l-2 border-success pl-2 py-1">
                <span className="text-success font-mono text-[9px] uppercase">Resolved</span>
                <div className="text-text-secondary mt-0.5">{c.resolution_note}</div>
              </div>
            )}
          </div>
        </div>
      </button>

      {selected && c.status === 'open' && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <input
            value={resolutionNote}
            onChange={e => setResolutionNote(e.target.value)}
            placeholder="Optional resolution note…"
            className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <button onClick={onResolve} className="flex-1 bg-success/15 text-success py-1.5 rounded text-xs font-semibold">✓ Resolve</button>
            <button onClick={onDismiss} className="flex-1 border border-border text-text-secondary py-1.5 rounded text-xs">Dismiss</button>
            <button onClick={onDelete} className="flex-1 border border-danger/30 text-danger py-1.5 rounded text-xs">Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
