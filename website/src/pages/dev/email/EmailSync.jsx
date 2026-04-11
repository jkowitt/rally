import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as sync from '@/services/email/pipelineSyncService'
import * as listService from '@/services/email/emailListService'

/**
 * /dev/email/sync — bulk pipeline sync UI.
 * Shows CRM contacts not yet in email marketing, lets user select and sync.
 */
export default function EmailSync() {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [lists, setLists] = useState([])
  const [targetListIds, setTargetListIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const [c, l] = await Promise.all([
      sync.getUnsynced({ propertyId: profile?.property_id }),
      listService.listLists(),
    ])
    setContacts(c)
    setLists(l.lists)
    setLoading(false)
  }

  function toggle(id) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleAll() {
    if (selected.size === contacts.length) setSelected(new Set())
    else setSelected(new Set(contacts.map(c => c.id)))
  }

  async function runSync() {
    if (selected.size === 0) return
    setRunning(true)
    const ids = [...selected]
    const r = await sync.bulkSync(ids, {
      targetListIds,
      propertyId: profile?.property_id,
      syncedBy: profile?.id,
    }, (done, total) => setProgress({ done, total }))
    setResults(r)
    setRunning(false)
    init()
    setSelected(new Set())
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Pipeline Sync</h2>
          <p className="text-[11px] text-text-muted">Sync CRM contacts into email marketing lists</p>
        </div>
        <Link to="/dev/email/sync-settings" className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">Auto-sync settings</Link>
      </header>

      {loading && <div className="text-xs text-text-muted">Loading contacts…</div>}

      {!loading && contacts.length === 0 && (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <div className="text-sm text-text-muted">✓ All CRM contacts are synced to email marketing.</div>
        </div>
      )}

      {contacts.length > 0 && (
        <>
          <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-text-primary">
                {contacts.length} unsynced contacts · {selected.size} selected
              </div>
              <button onClick={toggleAll} className="text-[10px] text-accent hover:underline">
                {selected.size === contacts.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Add to lists</label>
              <div className="flex gap-2 flex-wrap">
                {lists.map(l => (
                  <label key={l.id} className={`text-[11px] px-2 py-1 rounded border cursor-pointer ${targetListIds.includes(l.id) ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary'}`}>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={targetListIds.includes(l.id)}
                      onChange={e => setTargetListIds(e.target.checked ? [...targetListIds, l.id] : targetListIds.filter(x => x !== l.id))}
                    />
                    {l.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-2 w-8"></th>
                  <th className="text-left p-2">Contact</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">Deal</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id} className={`border-t border-border ${selected.has(c.id) ? 'bg-accent/5' : ''}`}>
                    <td className="p-2">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    </td>
                    <td className="p-2 text-text-primary">{c.first_name} {c.last_name}</td>
                    <td className="p-2 text-text-secondary">{c.email}</td>
                    <td className="p-2 text-text-secondary">{c.company}</td>
                    <td className="p-2 text-[10px] text-text-muted">{c.deals?.brand_name || '—'} {c.deals?.stage && `· ${c.deals.stage}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {running && (
            <div className="bg-bg-card border border-border rounded-lg p-4">
              <div className="text-[11px] text-text-muted mb-1">Syncing {progress.done} / {progress.total}</div>
              <div className="w-full bg-bg-surface h-1.5 rounded">
                <div className="bg-accent h-1.5 rounded transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {results && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-xs space-y-1">
              <div className="text-success font-semibold">Sync complete</div>
              <div>Created: {results.created} · Updated: {results.updated} · Skipped: {results.skipped}</div>
            </div>
          )}

          <button
            onClick={runSync}
            disabled={selected.size === 0 || running}
            className="w-full bg-accent text-bg-primary py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {running ? 'Syncing…' : `Sync ${selected.size} contact${selected.size !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  )
}
