import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as outreach from '@/services/dev/outreachService'
import OutreachComposer from '@/components/dev/OutreachComposer'

/**
 * /dev/outlook/outreach
 * Personal BD pipeline for Loud CRM outreach.
 */
export default function OutlookOutreach() {
  const { profile } = useAuth()
  const [prospects, setProspects] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [industryFilter, setIndustryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [composerFor, setComposerFor] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { reload() }, [statusFilter, industryFilter, search])

  async function reload() {
    setLoading(true)
    const { prospects } = await outreach.listProspects({
      status: statusFilter,
      industry: industryFilter,
      search,
    })
    setProspects(prospects)
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await outreach.updateStatus(id, status)
    reload()
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/dev" className="text-[10px] text-text-muted hover:text-accent">← /dev</Link>
            <h1 className="text-xl font-semibold mt-1">Outreach Pipeline</h1>
            <p className="text-[11px] text-text-muted">Personal Loud CRM BD prospecting. Isolated from customer CRM.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(true)} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">+ Prospect</button>
            <button onClick={() => setShowImport(true)} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">Import CSV</button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-bg-card border border-border rounded px-3 py-1.5 text-xs w-48 focus:outline-none focus:border-accent"
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs">
            <option value="all">All statuses</option>
            {outreach.OUTREACH_STATUSES.map(s => <option key={s} value={s}>{outreach.OUTREACH_LABELS[s]}</option>)}
          </select>
          <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs">
            <option value="all">All industries</option>
            <option value="conference_events">Conference/Events</option>
            <option value="minor_league_sports">Minor League Sports</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left p-2">Prospect</th>
                <th className="text-left p-2">Organization</th>
                <th className="text-left p-2">Industry</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Last Contact</th>
                <th className="text-left p-2">Follow-up</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-4 text-center text-text-muted">Loading…</td></tr>}
              {!loading && prospects.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-text-muted">No prospects. Add one or import a CSV.</td></tr>
              )}
              {prospects.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-bg-surface">
                  <td className="p-2">
                    <div className="font-medium text-text-primary">{p.first_name} {p.last_name}</div>
                    <div className="text-[10px] text-text-muted">{p.email}</div>
                  </td>
                  <td className="p-2 text-text-secondary">{p.organization}<div className="text-[10px] text-text-muted">{p.title}</div></td>
                  <td className="p-2 text-[10px] text-text-muted">{p.industry?.replace('_', ' ')}</td>
                  <td className="p-2">
                    <select
                      value={p.outreach_status}
                      onChange={e => updateStatus(p.id, e.target.value)}
                      className="bg-bg-surface border border-border rounded px-1 py-0.5 text-[10px]"
                    >
                      {outreach.OUTREACH_STATUSES.map(s => (
                        <option key={s} value={s}>{outreach.OUTREACH_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-[10px] text-text-muted">
                    {p.last_contacted_at ? new Date(p.last_contacted_at).toLocaleDateString() : '—'}
                    {p.last_email_subject && <div className="text-[9px] truncate max-w-[140px]">{p.last_email_subject}</div>}
                  </td>
                  <td className="p-2 text-[10px] text-text-muted">{p.follow_up_due || '—'}</td>
                  <td className="p-2">
                    <button onClick={() => setComposerFor(p)} className="text-[10px] bg-accent text-bg-primary px-2 py-1 rounded">Draft</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {composerFor && <OutreachComposer prospect={composerFor} onClose={() => { setComposerFor(null); reload() }} />}
      {showImport && <ImportModal onClose={() => { setShowImport(false); reload() }} />}
      {showNew && <NewProspectModal profile={profile} onClose={() => { setShowNew(false); reload() }} />}
    </div>
  )
}

function ImportModal({ onClose }) {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [running, setRunning] = useState(false)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result
      const lines = text.split(/\r?\n/).filter(Boolean)
      const headers = lines[0].split(',').map(s => s.trim().toLowerCase())
      const parsed = lines.slice(1).map(line => {
        const cells = line.split(',').map(s => s.trim())
        const row = {}
        headers.forEach((h, i) => { row[h] = cells[i] })
        return row
      })
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  async function runImport() {
    setRunning(true)
    const s = await outreach.bulkImport(profile.id, rows)
    setSummary(s)
    setRunning(false)
  }

  return (
    <Modal onClose={onClose} title="Import Prospects from CSV">
      <div className="space-y-4 text-xs">
        <div className="text-text-muted">
          Required columns: first_name, last_name, email, organization, industry.
          Optional: title, linkedin_url, notes.
        </div>
        <input type="file" accept=".csv" onChange={handleFile} className="text-xs" />
        {rows.length > 0 && !summary && (
          <>
            <div className="text-text-secondary">{rows.length} rows ready</div>
            <button onClick={runImport} disabled={running} className="w-full bg-accent text-bg-primary py-2 rounded font-semibold disabled:opacity-50">
              {running ? 'Importing…' : 'Import'}
            </button>
          </>
        )}
        {summary && (
          <div className="bg-bg-surface rounded p-3 space-y-1">
            <div>✓ Added: <span className="text-success">{summary.added}</span></div>
            <div>⊘ Skipped (duplicates): <span className="text-warning">{summary.skipped}</span></div>
            <div>✗ Failed: <span className="text-danger">{summary.failed}</span></div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function NewProspectModal({ profile, onClose }) {
  const [fields, setFields] = useState({
    first_name: '', last_name: '', email: '', organization: '',
    title: '', industry: 'conference_events', linkedin_url: '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await outreach.createProspect(profile.id, fields)
    setSaving(false)
    onClose()
  }

  return (
    <Modal onClose={onClose} title="New Prospect">
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <Field label="First name" value={fields.first_name} onChange={v => setFields({ ...fields, first_name: v })} />
          <Field label="Last name" value={fields.last_name} onChange={v => setFields({ ...fields, last_name: v })} />
        </div>
        <Field label="Email" value={fields.email} onChange={v => setFields({ ...fields, email: v })} />
        <Field label="Organization" value={fields.organization} onChange={v => setFields({ ...fields, organization: v })} />
        <Field label="Title" value={fields.title} onChange={v => setFields({ ...fields, title: v })} />
        <div>
          <label className="text-text-muted block mb-1">Industry</label>
          <select value={fields.industry} onChange={e => setFields({ ...fields, industry: e.target.value })} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5">
            <option value="conference_events">Conference / Events</option>
            <option value="minor_league_sports">Minor League Sports</option>
          </select>
        </div>
        <Field label="LinkedIn URL" value={fields.linkedin_url} onChange={v => setFields({ ...fields, linkedin_url: v })} />
        <button onClick={save} disabled={saving || !fields.email} className="w-full bg-accent text-bg-primary py-2 rounded font-semibold disabled:opacity-50 mt-2">
          {saving ? 'Saving…' : 'Add Prospect'}
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-text-muted block mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5" />
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-lg p-5 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">{title}</div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
