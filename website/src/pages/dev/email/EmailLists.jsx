import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as listService from '@/services/email/emailListService'

export default function EmailLists() {
  const { profile } = useAuth()
  const [lists, setLists] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { reload() }, [])

  async function reload() {
    setLoading(true)
    const [{ lists }, s] = await Promise.all([
      listService.listLists(),
      listService.getGlobalListStats(),
    ])
    setLists(lists)
    setStats(s)
    setLoading(false)
  }

  async function handleCreate(fields) {
    await listService.createList(fields, profile.id, profile.property_id)
    setShowNew(false)
    reload()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this list? Subscribers will not be removed, only the list itself.')) return
    await listService.deleteList(id)
    reload()
  }

  async function handleDuplicate(id) {
    await listService.duplicateList(id)
    reload()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Email Lists</h2>
          <p className="text-[11px] text-text-muted">Manage subscriber lists. Pipeline lists auto-sync from CRM contacts.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNew(true)} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">+ Create List</button>
          <Link to="/app/marketing/email/import" className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">Import</Link>
          <Link to="/app/marketing/email/sync" className="text-xs px-3 py-1.5 bg-accent text-bg-primary rounded font-semibold">Sync Pipeline</Link>
        </div>
      </header>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <StatTile label="Lists" value={stats.totalLists} />
          <StatTile label="Subscribers" value={stats.totalSubscribers} />
          <StatTile label="Active" value={stats.active} color="success" />
          <StatTile label="Unsubscribed" value={stats.unsubscribed} color="muted" />
          <StatTile label="Bounced" value={stats.bounced} color="danger" />
          <StatTile label="Pipeline synced" value={stats.pipelineSynced} color="accent" />
        </div>
      )}

      {loading ? (
        <div className="text-xs text-text-muted">Loading…</div>
      ) : lists.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <div className="text-sm text-text-muted">No lists yet.</div>
          <button onClick={() => setShowNew(true)} className="mt-3 bg-accent text-bg-primary px-4 py-2 rounded text-xs font-semibold">Create your first list</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {lists.map(l => (
            <div key={l.id} className="bg-bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-semibold text-text-primary truncate">{l.name}</div>
                    {l.is_pipeline_list && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent">🔗 Pipeline</span>}
                  </div>
                  <div className="text-[10px] text-text-muted">{l.list_type}</div>
                </div>
              </div>
              {l.description && <div className="text-[11px] text-text-secondary line-clamp-2">{l.description}</div>}
              <div className="flex items-center gap-3 text-[10px] text-text-muted">
                <span><strong className="text-accent">{l.active_count}</strong> active</span>
                <span>{l.unsubscribed_count} unsub</span>
                <span className="text-danger">{l.bounced_count} bnc</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-border">
                <Link to={`/app/marketing/email/subscribers?list=${l.id}`} className="text-[10px] px-2 py-1 border border-border rounded hover:border-accent/50">View</Link>
                <button onClick={() => handleDuplicate(l.id)} className="text-[10px] px-2 py-1 border border-border rounded hover:border-accent/50">Duplicate</button>
                <button onClick={() => handleDelete(l.id)} className="text-[10px] px-2 py-1 border border-danger/30 text-danger rounded hover:bg-danger/10">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewListModal onSave={handleCreate} onClose={() => setShowNew(false)} />}
    </div>
  )
}

function StatTile({ label, value, color = 'accent' }) {
  const cls = color === 'success' ? 'text-success' : color === 'danger' ? 'text-danger' : color === 'muted' ? 'text-text-muted' : 'text-accent'
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}

function NewListModal({ onSave, onClose }) {
  const [fields, setFields] = useState({ name: '', description: '', list_type: 'custom' })
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-lg max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold mb-3">New List</div>
        <div className="space-y-2 text-xs">
          <div>
            <label className="text-text-muted block mb-1">Name</label>
            <input value={fields.name} onChange={e => setFields({ ...fields, name: e.target.value })} className="w-full bg-bg-card border border-border rounded px-2 py-1.5" />
          </div>
          <div>
            <label className="text-text-muted block mb-1">Description</label>
            <textarea value={fields.description} onChange={e => setFields({ ...fields, description: e.target.value })} rows={2} className="w-full bg-bg-card border border-border rounded px-2 py-1.5" />
          </div>
          <div>
            <label className="text-text-muted block mb-1">Type</label>
            <select value={fields.list_type} onChange={e => setFields({ ...fields, list_type: e.target.value })} className="w-full bg-bg-card border border-border rounded px-2 py-1.5">
              {['prospect', 'trial', 'customer', 'newsletter', 'segment', 'pipeline', 'custom'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 border border-border text-text-secondary py-2 rounded text-xs">Cancel</button>
          <button onClick={() => onSave(fields)} disabled={!fields.name} className="flex-1 bg-accent text-bg-primary py-2 rounded text-xs font-semibold disabled:opacity-50">Create</button>
        </div>
      </div>
    </div>
  )
}
