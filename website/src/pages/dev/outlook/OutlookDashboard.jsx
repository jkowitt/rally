import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as sync from '@/services/dev/emailSyncService'
import { getConnectionStatus } from '@/services/dev/outlookAuthService'
import EmailPanel from '@/components/dev/EmailPanel'
import CRMContextPanel from '@/components/dev/CRMContextPanel'

/**
 * /dev/outlook/dashboard
 * Three-panel layout: unlinked queue | email detail | CRM context.
 */
export default function OutlookDashboard() {
  const [connection, setConnection] = useState(null)
  const [emails, setEmails] = useState([])
  const [folder, setFolder] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { reload() }, [folder])

  async function reload() {
    setLoading(true)
    const [conn, { emails }] = await Promise.all([
      getConnectionStatus(),
      sync.getUnlinkedEmails({ folder: folder === 'all' ? null : folder, limit: 150 }),
    ])
    setConnection(conn)
    setEmails(emails)
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    await sync.forceSyncNow()
    setSyncing(false)
    reload()
  }

  async function handleIgnore(email) {
    await sync.ignoreEmail(email.id)
    setSelectedId(null)
    reload()
  }

  const filtered = search
    ? emails.filter(e => {
        const q = search.toLowerCase()
        return (
          (e.subject || '').toLowerCase().includes(q) ||
          (e.from_email || '').toLowerCase().includes(q) ||
          (e.from_name || '').toLowerCase().includes(q) ||
          (e.body_preview || '').toLowerCase().includes(q)
        )
      })
    : emails

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link to="/dev" className="text-[10px] text-text-muted hover:text-accent">← /dev</Link>
          <h1 className="text-sm font-semibold">Outlook Integration</h1>
          <ConnectionBadge health={connection?.health} />
          {connection?.last_synced_at && (
            <span className="text-[10px] text-text-muted">
              Last synced: {new Date(connection.last_synced_at).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/dev/outlook/outreach" className="text-[11px] text-text-secondary hover:text-accent">Outreach</Link>
          <Link to="/dev/outlook/follow-ups" className="text-[11px] text-text-secondary hover:text-accent">Follow-ups</Link>
          <Link to="/dev/outlook/templates" className="text-[11px] text-text-secondary hover:text-accent">Templates</Link>
          <Link to="/dev/outlook/analytics" className="text-[11px] text-text-secondary hover:text-accent">Analytics</Link>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-accent text-bg-primary px-3 py-1.5 rounded text-[11px] font-semibold disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel 1 — Unlinked list */}
        <aside className="w-[30%] min-w-[240px] border-r border-border flex flex-col">
          <div className="p-3 border-b border-border space-y-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search emails…"
              className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent"
            />
            <div className="flex gap-1">
              {['all', 'inbox', 'sent'].map(f => (
                <button
                  key={f}
                  onClick={() => setFolder(f)}
                  className={`text-[10px] px-2 py-1 rounded capitalize ${folder === f ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <div className="text-xs text-text-muted p-3">Loading…</div>}
            {!loading && filtered.length === 0 && (
              <div className="text-xs text-text-muted p-3">No unlinked emails</div>
            )}
            {filtered.map(e => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`w-full text-left p-3 border-b border-border hover:bg-bg-card ${selectedId === e.id ? 'bg-bg-card border-l-2 border-l-accent' : ''}`}
              >
                <div className="text-[11px] font-medium text-text-primary truncate">{e.from_name || e.from_email}</div>
                <div className="text-[11px] text-text-secondary truncate">{e.subject || '(no subject)'}</div>
                <div className="text-[10px] text-text-muted line-clamp-1 mt-0.5">{e.body_preview}</div>
                <div className="text-[9px] text-text-muted mt-1">
                  {new Date(e.received_at || e.sent_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Panel 2 — Email detail */}
        <section className="w-[40%] border-r border-border">
          <EmailPanel
            emailId={selectedId}
            onLink={() => {/* focus Panel 3 */}}
            onIgnore={handleIgnore}
          />
        </section>

        {/* Panel 3 — CRM context */}
        <aside className="w-[30%] min-w-[240px]">
          <CRMContextPanel
            email={selectedId ? filtered.find(f => f.id === selectedId) : null}
            onLinked={() => { reload(); setSelectedId(null) }}
          />
        </aside>
      </div>
    </div>
  )
}

function ConnectionBadge({ health }) {
  const map = {
    healthy: ['bg-success/15 text-success', 'Connected'],
    expiring: ['bg-warning/15 text-warning', 'Token expiring'],
    disconnected: ['bg-danger/15 text-danger', 'Disconnected'],
  }
  const [cls, label] = map[health] || ['bg-bg-card text-text-muted', 'Unknown']
  return <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
}
