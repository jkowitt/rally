import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button, Badge, EmptyState } from '@/components/ui'
import Breadcrumbs from '@/components/Breadcrumbs'
import BulkEnrichmentImportModal from '@/components/BulkEnrichmentImportModal'
import * as queue from '@/services/enrichmentQueueService'
import { humanError } from '@/lib/humanError'
import { Upload, RefreshCcw, Sparkles, Trash2, RotateCcw, CheckCircle2 } from 'lucide-react'

// /app/crm/enrichment-queue
//
// Bulk-paste / CSV imports land here as 'pending' rows. The user
// reviews the enriched output, then clicks "Add to CRM" to turn a
// row into a real deal or contact (status flips to 'materialized').
export default function EnrichmentQueue() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [kind, setKind] = useState('all')
  const [showImport, setShowImport] = useState(false)
  const [running, setRunning] = useState(false)
  const [busyId, setBusyId] = useState(null)

  async function reload() {
    if (!propertyId) return
    setLoading(true)
    const [{ rows }, s] = await Promise.all([
      queue.listQueue({ propertyId, status: filter, kind }),
      queue.queueStats(propertyId),
    ])
    setRows(rows)
    setStats(s)
    setLoading(false)
  }

  useEffect(() => { reload() }, [propertyId, filter, kind])

  async function runNow() {
    if (!propertyId) return
    setRunning(true)
    const r = await queue.runEnrichment(propertyId)
    setRunning(false)
    if (r.success) {
      toast({ title: 'Enrichment started', description: 'Refreshing in a few seconds…', type: 'success' })
      setTimeout(reload, 4000)
    } else {
      toast({ title: 'Failed to start enrichment', description: humanError(r), type: 'error' })
    }
  }

  async function materializeRow(row) {
    setBusyId(row.id)
    const r = await queue.materialize(row)
    setBusyId(null)
    if (r.success) {
      toast({ title: 'Added to CRM', description: row.kind === 'company' ? 'Created a new deal.' : 'Created a new contact.', type: 'success' })
      reload()
    } else {
      toast({ title: 'Could not add to CRM', description: humanError(r), type: 'error' })
    }
  }

  async function retry(row) {
    const r = await queue.retryRow(row.id)
    if (r.success) reload()
    else toast({ title: 'Retry failed', description: humanError(r), type: 'error' })
  }

  async function remove(row) {
    if (!confirm('Delete this row from the queue?')) return
    const r = await queue.deleteRow(row.id)
    if (r.success) reload()
    else toast({ title: 'Delete failed', description: humanError(r), type: 'error' })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <Breadcrumbs items={[{ label: 'Prospecting', to: '/app' }, { label: 'Enrichment Queue' }]} />

      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Enrichment Queue</h1>
          <p className="text-[11px] text-text-muted mt-1 max-w-xl">
            Park a list of companies or prospects here. Apollo (paid) gives you verified firmographics; Claude (free) leans on general knowledge — fast but less accurate.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={reload}>
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="secondary" onClick={runNow} disabled={running || !stats?.pending}>
            <Sparkles className="w-3.5 h-3.5" /> {running ? 'Running…' : `Enrich pending (${stats?.pending || 0})`}
          </Button>
          <Button onClick={() => setShowImport(true)}>
            <Upload className="w-3.5 h-3.5" /> Bulk import
          </Button>
        </div>
      </header>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Tile label="Total" value={stats.total} />
          <Tile label="Pending" value={stats.pending} tone="warning" />
          <Tile label="Enriching" value={stats.enriching} tone="info" />
          <Tile label="Enriched" value={stats.enriched} tone="success" />
          <Tile label="Materialized" value={stats.materialized} tone="accent" />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap border-b border-border pb-3">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs"
        >
          <option value="all">All statuses</option>
          {queue.STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={kind}
          onChange={e => setKind(e.target.value)}
          className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs"
        >
          <option value="all">All kinds</option>
          <option value="company">Companies</option>
          <option value="contact">Contacts</option>
        </select>
      </div>

      {loading && <div className="text-xs text-text-muted py-4 text-center">Loading…</div>}

      {!loading && rows.length === 0 && (
        <EmptyState
          title="No queued rows"
          description="Paste a list of companies or prospects, or upload a CSV. We'll enrich each row with firmographics + contact info."
          primaryAction={
            <Button size="lg" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4" /> Bulk import
            </Button>
          }
          secondaryAction={
            <Link to="/app/crm/pipeline?find=1" className="text-xs text-text-muted hover:text-accent">
              or use Find Prospects ↗
            </Link>
          }
        />
      )}

      <div className="space-y-2">
        {rows.map(row => (
          <QueueRow
            key={row.id}
            row={row}
            busy={busyId === row.id}
            onMaterialize={() => materializeRow(row)}
            onRetry={() => retry(row)}
            onDelete={() => remove(row)}
          />
        ))}
      </div>

      <BulkEnrichmentImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onQueued={() => { setShowImport(false); reload() }}
      />
    </div>
  )
}

function Tile({ label, value, tone = 'neutral' }) {
  const cls =
    tone === 'success' ? 'text-success'
      : tone === 'warning' ? 'text-warning'
      : tone === 'info' ? 'text-info'
      : tone === 'accent' ? 'text-accent'
      : 'text-text-primary'
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}

function QueueRow({ row, busy, onMaterialize, onRetry, onDelete }) {
  const enriched = row.enriched_data || {}
  const showEnriched = row.status === 'enriched' || row.status === 'materialized'
  const tone =
    row.status === 'enriched' ? 'success'
      : row.status === 'pending' ? 'warning'
      : row.status === 'enriching' ? 'info'
      : row.status === 'failed' ? 'danger'
      : row.status === 'materialized' ? 'accent'
      : 'neutral'

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge tone={row.kind === 'contact' ? 'info' : 'neutral'}>{row.kind}</Badge>
            <Badge tone={tone}>{row.status}</Badge>
            <span className="text-[9px] font-mono text-text-muted">mode: {row.enrichment_mode}</span>
            {row.attempt_count > 0 && (
              <span className="text-[9px] font-mono text-text-muted">attempts: {row.attempt_count}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            {row.brand_name || row.contact_name || row.contact_email || 'Untitled row'}
          </h3>
          <div className="text-[11px] text-text-secondary mt-0.5 space-y-0.5">
            {row.contact_name && <div>Contact: {row.contact_name}</div>}
            {row.contact_email && <div>Email: {row.contact_email}</div>}
            {row.contact_phone && <div>Phone: {row.contact_phone}</div>}
            {row.website && <div>Website: {row.website}</div>}
          </div>
          {showEnriched && Object.keys(enriched).length > 0 && (
            <details className="mt-2 text-[11px]">
              <summary className="cursor-pointer text-accent hover:underline">Enriched data ({Object.keys(enriched).length} fields)</summary>
              <pre className="mt-1 bg-bg-surface border border-border rounded p-2 text-[10px] text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono max-h-64">
                {JSON.stringify(enriched, null, 2)}
              </pre>
            </details>
          )}
          {row.last_error && (
            <div className="mt-2 text-[11px] bg-danger/5 border-l-2 border-danger pl-2 py-1 text-danger">
              {row.last_error}
            </div>
          )}
          <div className="text-[10px] text-text-muted mt-1">
            queued {new Date(row.created_at).toLocaleString()}
            {row.enriched_at && ` · enriched ${new Date(row.enriched_at).toLocaleString()}`}
            {row.materialized_at && ` · added to CRM ${new Date(row.materialized_at).toLocaleString()}`}
          </div>
        </div>

        <div className="flex gap-1 flex-wrap items-center">
          {row.status === 'enriched' && (
            <Button size="sm" onClick={onMaterialize} disabled={busy}>
              <CheckCircle2 className="w-3.5 h-3.5" /> {busy ? 'Adding…' : 'Add to CRM'}
            </Button>
          )}
          {row.status === 'failed' && (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </Button>
          )}
          {row.status !== 'materialized' && (
            <button
              onClick={onDelete}
              className="text-[10px] border border-danger/30 text-danger px-2 py-1.5 rounded hover:bg-danger/10"
              aria-label="Delete row"
            >
              <Trash2 className="w-3 h-3 inline" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
