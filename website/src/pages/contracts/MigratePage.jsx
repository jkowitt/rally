import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import * as migration from '@/services/contractMigrationService'

/**
 * /app/crm/migrate — bulk contract migration wizard.
 *
 * Four phases driven by session.status:
 *   uploading  → UploadView
 *   processing → ProcessingView
 *   review     → ReviewView
 *   complete   → CompleteView
 */
export default function MigratePage() {
  const { profile } = useAuth()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, find or create a session
  useEffect(() => {
    if (!profile?.property_id) return
    ;(async () => {
      // Check for in-flight session (uploading / processing / review)
      const { data: existing } = await supabase
        .from('contract_migration_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .in('status', ['uploading', 'processing', 'review'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        setSession(existing)
      } else {
        const { session: created } = await migration.createSession(profile.id, profile.property_id)
        setSession(created)
      }
      setLoading(false)
    })()
  }, [profile?.property_id])

  // Subscribe to session updates for live progress
  useEffect(() => {
    if (!session?.id) return
    const channel = supabase
      .channel(`migration_${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'contract_migration_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session?.id])

  if (loading || !session) {
    return <div className="min-h-screen bg-bg-primary flex items-center justify-center text-xs text-text-muted">Loading migration…</div>
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header session={session} />
      {session.status === 'uploading' && <UploadView session={session} setSession={setSession} />}
      {session.status === 'processing' && <ProcessingView session={session} />}
      {session.status === 'review' && <ReviewView session={session} setSession={setSession} />}
      {session.status === 'complete' && <CompleteView session={session} />}
    </div>
  )
}

// ─── Header + step indicator ─────────────────────────────────
function Header({ session }) {
  const steps = [
    { key: 'uploading', label: 'Upload' },
    { key: 'processing', label: 'Processing' },
    { key: 'review', label: 'Review' },
    { key: 'complete', label: 'Complete' },
  ]
  const currentIdx = steps.findIndex(s => s.key === session.status)

  return (
    <header className="border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <Link to="/app/crm/contracts" className="text-[10px] text-text-muted hover:text-accent">← Contracts</Link>
        <h1 className="text-2xl font-semibold mt-1">Import Your Contract Portfolio</h1>
        <p className="text-xs text-text-muted mt-1">
          Upload all your existing sponsor contracts at once. AI extracts every benefit automatically.
        </p>

        <div className="mt-5 flex items-center gap-2 overflow-x-auto">
          {steps.map((s, i) => {
            const done = i < currentIdx
            const active = i === currentIdx
            return (
              <div key={s.key} className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono ${done ? 'bg-success text-bg-primary' : active ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <div className={`text-xs ${active ? 'text-accent font-semibold' : done ? 'text-text-secondary' : 'text-text-muted'}`}>
                  {s.label}
                </div>
                {i < steps.length - 1 && <div className={`w-8 h-0.5 ${done ? 'bg-success' : 'bg-border'}`} />}
              </div>
            )
          })}
        </div>
      </div>
    </header>
  )
}

// ─── Step 1: Upload view ─────────────────────────────────────
function UploadView({ session, setSession }) {
  const { profile } = useAuth()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    migration.listFiles(session.id).then(setFiles)
  }, [session.id])

  async function handleFiles(fileList) {
    setUploading(true)
    const arr = Array.from(fileList).filter(f => {
      const ext = f.name.toLowerCase()
      return ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.doc')
    })
    for (const f of arr) {
      await migration.uploadFile(session.id, profile.property_id, f)
    }
    const fresh = await migration.listFiles(session.id)
    setFiles(fresh)
    setUploading(false)
  }

  async function removeFile(id) {
    await migration.deleteFile(id)
    setFiles(await migration.listFiles(session.id))
  }

  async function startProcessing() {
    if (files.length === 0) return
    const r = await migration.startProcessing(session.id)
    if (r.success) {
      // Session status gets updated to 'processing' inside the service;
      // realtime subscription in MigratePage picks it up.
      const { session: updated } = await migration.getSession(session.id)
      setSession(updated)
    } else {
      alert(r.error)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const totalSize = files.reduce((s, f) => s + (f.file_size_bytes || 0), 0)
  const estimatedMinutes = Math.ceil(files.length * 45 / 60) // ~45 sec/contract

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
      >
        <div className="text-5xl mb-4">📄📄📄</div>
        <div className="text-lg font-semibold">Drop all your contracts here</div>
        <div className="text-xs text-text-muted mt-1">
          PDF and Word documents supported. No limit on quantity.
        </div>
        <div className="text-[11px] text-accent mt-3">or click to browse</div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <>
          <div className="bg-bg-card border border-border rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{files.length} contract{files.length !== 1 ? 's' : ''} ready to process</div>
              <div className="text-[11px] text-text-muted">
                Total size: {(totalSize / 1024 / 1024).toFixed(1)}MB · Estimated time: ~{estimatedMinutes} minutes
              </div>
            </div>
            <button
              onClick={startProcessing}
              disabled={uploading || files.length === 0}
              className="bg-accent text-bg-primary px-5 py-2.5 rounded font-semibold text-sm disabled:opacity-50"
            >
              Extract All Contracts →
            </button>
          </div>

          <div className="space-y-2">
            {files.map(f => (
              <div key={f.id} className="bg-bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                <div className="text-xl">📄</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.original_filename}</div>
                  <div className="text-[10px] text-text-muted">
                    {((f.file_size_bytes || 0) / 1024).toFixed(0)}KB · {f.file_type?.toUpperCase()}
                  </div>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-surface text-text-muted">{f.status}</span>
                <button onClick={() => removeFile(f.id)} className="text-text-muted hover:text-danger text-lg leading-none px-1">×</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Step 2: Processing view ─────────────────────────────────
function ProcessingView({ session }) {
  const [files, setFiles] = useState([])
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const load = async () => setFiles(await migration.listFiles(session.id))
    load()
    const channel = supabase
      .channel(`files_${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract_migration_files', filter: `session_id=eq.${session.id}` },
        () => load()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session.id])

  // Force-stop. Marks every queued / processing / retrying row as
  // failed and bumps the session to Review so the rep can keep what
  // succeeded and clear the rest. Whatever the AI is mid-call on
  // finishes gracefully but no new file gets picked up.
  async function forceStop() {
    if (!confirm('Stop the extraction now?\n\nFiles already in progress finish their current AI call (~5-10s); nothing new starts. You can review what succeeded and retry or clear the rest.')) return
    setCancelling(true)
    const r = await migration.cancelProcessing(session.id)
    setCancelling(false)
    if (!r.success) alert(`Couldn't stop: ${r.error || 'unknown error'}`)
    // Realtime subscription will pick up the new row states; the
    // session.status flip to 'review' is picked up by MigratePage's
    // own subscription, swapping us into ReviewView.
  }

  const pctComplete = session.total_contracts > 0
    ? Math.round((session.contracts_processed / session.total_contracts) * 100)
    : 0
  const remaining = session.total_contracts - session.contracts_processed
  const estimatedRemaining = Math.ceil(remaining * 45 / 60)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-block w-24 h-24 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="45" stroke="#2a2a2a" strokeWidth="8" fill="none" />
            <circle
              cx="50" cy="50" r="45"
              stroke="#E8B84B" strokeWidth="8" fill="none"
              strokeDasharray={`${pctComplete * 2.83} 283`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-accent">
            {pctComplete}%
          </div>
        </div>
        <div className="text-lg font-semibold">Processing your contracts</div>
        <div className="text-xs text-text-muted">
          {session.contracts_processed} of {session.total_contracts} complete
          {remaining > 0 && ` · ~${estimatedRemaining} min remaining`}
        </div>
        <button
          onClick={forceStop}
          disabled={cancelling}
          className="mt-2 text-xs px-3 py-1.5 border border-danger/30 text-danger rounded hover:bg-danger/10 disabled:opacity-50"
        >
          {cancelling ? 'Stopping…' : '⏹ Force stop'}
        </button>
      </div>

      <div className="space-y-2">
        {files.map(f => (
          <div key={f.id} className="bg-bg-card border border-border rounded-lg p-3 flex items-center gap-3">
            <StatusIcon status={f.status} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{f.original_filename}</div>
              {f.status === 'complete' && f.extracted_data?.benefits && (
                <div className="text-[10px] text-success">{f.extracted_data.benefits.length} benefits extracted</div>
              )}
              {f.status === 'failed' && (
                <div className="text-[10px] text-danger">{f.error_message || 'Extraction failed'}</div>
              )}
              {f.status === 'processing' && (
                <div className="text-[10px] text-accent">Reading contract…</div>
              )}
            </div>
            <span className="text-[9px] font-mono text-text-muted">{f.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusIcon({ status }) {
  if (status === 'queued' || status === 'uploading') return <span className="text-text-muted">⏱</span>
  if (status === 'processing' || status === 'retrying') return <span className="text-accent animate-spin inline-block">◐</span>
  if (status === 'complete') return <span className="text-success">✓</span>
  if (status === 'failed') return <span className="text-danger">✗</span>
  return <span>•</span>
}

// ─── Step 3: Review view ─────────────────────────────────────
function ReviewView({ session, setSession }) {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filter, setFilter] = useState('all') // all | needs_review | complete
  const [finalizing, setFinalizing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { reload() }, [session.id])

  async function reload() {
    const s = await migration.getSessionStats(session.id)
    setStats(s)
    if (!selectedFile && s.files?.length > 0) setSelectedFile(s.files[0])
  }

  // Send the user back to the upload step (e.g. after they cleared
  // all stuck contracts and want to start fresh). Flips the session
  // status; realtime listener picks it up but we also patch locally
  // for immediate feedback.
  async function backToUpload() {
    await migration.updateSession(session.id, { status: 'uploading' })
    setSession({ ...session, status: 'uploading' })
  }

  async function approveAllHighConfidence() {
    await migration.approveHighConfidence(session.id, 85)
    reload()
  }

  async function finalize() {
    if (!confirm('Complete migration — create deals, contacts, and fulfillment records? This cannot be undone.')) return
    setFinalizing(true)
    const r = await migration.finalizeSession(session.id)
    setFinalizing(false)
    if (!r.success) {
      alert(`Finalize failed: ${r.error || 'unknown error — check edge function logs'}`)
      return
    }
    // Even when success, individual files may have errored. Surface those.
    const errs = r.result?.summary?.fileErrors || []
    if (errs.length > 0) {
      const lines = errs.slice(0, 5).map(e => `• ${e.file}: ${e.error}`).join('\n')
      const more = errs.length > 5 ? `\n…and ${errs.length - 5} more` : ''
      alert(`Migration finished with ${errs.length} per-file error${errs.length === 1 ? '' : 's'}:\n\n${lines}${more}`)
    }
  }

  if (!stats) return <div className="p-6 text-xs text-text-muted">Loading review…</div>

  // If every contract has been removed, drop the user back to the
  // upload step automatically — there's nothing to review.
  if ((stats.files?.length || 0) === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center space-y-4">
        <div className="text-3xl">📄</div>
        <h2 className="text-lg font-semibold text-text-primary">No contracts left in this session</h2>
        <p className="text-xs text-text-muted">
          You've cleared everything from this batch. Add more contracts to keep going, or finish up.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={backToUpload}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-xs font-semibold hover:opacity-90"
          >
            ← Upload more contracts
          </button>
          <button
            onClick={() => navigate('/app/crm/contracts')}
            className="border border-border text-text-secondary px-4 py-2 rounded text-xs hover:text-text-primary"
          >
            Back to Contracts
          </button>
        </div>
      </div>
    )
  }

  const filteredFiles = filter === 'needs_review'
    ? stats.files.filter(f => f.status !== 'complete')
    : filter === 'complete'
      ? stats.files.filter(f => f.status === 'complete')
      : stats.files

  const pendingCount = stats.benefitCounts.pending
  const canFinalize = pendingCount === 0 || confirm // allow override

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-4">
      {/* LEFT: summary */}
      <aside className="space-y-4">
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Session</div>
          <StatRow label="Contracts" value={`${stats.session.contracts_complete}/${stats.session.total_contracts}`} />
          <StatRow label="Benefits extracted" value={stats.benefitCounts.total} />
          <StatRow label="Auto-matched" value={stats.benefitCounts.autoMatched} color="success" />
          <StatRow label="Needs review" value={stats.benefitCounts.total - stats.benefitCounts.autoMatched} color="warning" />
          <StatRow label="Approved" value={stats.benefitCounts.approved} color="accent" />
        </div>

        <button
          onClick={approveAllHighConfidence}
          className="w-full bg-accent/10 border border-accent/30 text-accent py-2 rounded text-xs font-semibold hover:bg-accent/20"
        >
          Approve all 85%+ confidence
        </button>

        <button
          onClick={async () => {
            const failed = (stats.files || []).filter(f => f.status === 'failed')
            if (failed.length === 0) {
              alert('No failed contracts to retry.')
              return
            }
            if (!confirm(`Retry extraction on ${failed.length} failed contract${failed.length === 1 ? '' : 's'}?`)) return
            const r = await migration.retryFailed(session.id)
            if (!r.success) alert(`Retry failed: ${r.error}`)
            else {
              alert(`Retrying ${failed.length} contract${failed.length === 1 ? '' : 's'} — refresh in a minute to see results.`)
              setTimeout(reload, 5000)
            }
          }}
          className="w-full bg-warning/10 border border-warning/30 text-warning py-2 rounded text-xs font-semibold hover:bg-warning/20"
        >
          ↻ Retry failed
        </button>

        <button
          onClick={async () => {
            // Reset rows that got orphaned in 'processing' / 'retrying'
            // (function timed out mid-AI-call). Marks them failed so
            // Retry / Clear can act on them.
            const stuck = (stats.files || []).filter(f => f.status === 'processing' || f.status === 'retrying' || f.status === 'queued')
            if (stuck.length === 0) {
              alert('No in-flight contracts to stop.')
              return
            }
            if (!confirm(`Force-stop ${stuck.length} in-flight contract${stuck.length === 1 ? '' : 's'}? They\'ll be marked failed so you can retry or clear them.`)) return
            const r = await migration.cancelProcessing(session.id)
            if (!r.success) alert(`Stop failed: ${r.error || 'unknown'}`)
            else reload()
          }}
          className="w-full bg-danger/10 border border-danger/30 text-danger py-2 rounded text-xs font-semibold hover:bg-danger/20"
        >
          ⏹ Force stop in-flight
        </button>

        <button
          onClick={async () => {
            const stuck = (stats.files || []).filter(f => f.status !== 'complete' || (f.extracted_benefits_count ?? 0) === 0)
            if (stuck.length === 0) {
              alert('No stuck or empty contracts to clear.')
              return
            }
            if (!confirm(`Remove ${stuck.length} contract${stuck.length === 1 ? '' : 's'} that failed extraction or have no benefits?`)) return
            for (const f of stuck) await migration.deleteFile(f.id)
            setSelectedFile(null)
            reload()
          }}
          className="w-full bg-danger/10 border border-danger/30 text-danger py-2 rounded text-xs font-semibold hover:bg-danger/20"
        >
          Clear stuck / empty contracts
        </button>

        <button
          onClick={backToUpload}
          className="w-full bg-bg-card border border-border text-text-secondary py-2 rounded text-xs font-semibold hover:text-text-primary hover:border-accent/50"
        >
          + Upload more contracts
        </button>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Filter</div>
          <div className="flex flex-col gap-1">
            {['all', 'needs_review', 'complete'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-left text-[11px] px-2 py-1 rounded ${filter === f ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted hover:text-text-primary'}`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Contracts</div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filteredFiles.map(f => (
              <div
                key={f.id}
                className={`group relative w-full text-left rounded text-xs ${selectedFile?.id === f.id ? 'bg-accent/10 border border-accent/30' : 'bg-bg-card border border-border hover:border-accent/30'}`}
              >
                <button
                  onClick={() => setSelectedFile(f)}
                  className="w-full text-left p-2 pr-7"
                >
                  <div className="truncate font-medium">{f.original_filename}</div>
                  <div className="text-[9px] text-text-muted">{f.status}</div>
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!confirm(`Remove ${f.original_filename} from this migration?`)) return
                    await migration.deleteFile(f.id)
                    if (selectedFile?.id === f.id) setSelectedFile(null)
                    reload()
                  }}
                  aria-label={`Delete ${f.original_filename}`}
                  title="Remove from migration"
                  className="absolute top-1.5 right-1.5 text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-opacity text-sm leading-none px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* CENTER: contract detail */}
      <main className="space-y-4">
        {selectedFile ? (
          <ContractDetail file={selectedFile} session={session} onReload={reload} />
        ) : (
          <div className="text-center text-xs text-text-muted py-12">Select a contract to review</div>
        )}
      </main>

      {/* RIGHT: finalize + queue */}
      <aside className="space-y-4">
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Ready to finalize?</div>
          <div className="text-xs text-text-secondary space-y-1">
            <div>✓ {stats.session.contracts_complete} contracts processed</div>
            <div>{pendingCount === 0 ? '✓' : '⚠'} {pendingCount} benefits still pending review</div>
          </div>
          <button
            onClick={finalize}
            disabled={finalizing}
            className="w-full bg-accent text-bg-primary py-3 rounded font-semibold text-xs disabled:opacity-50"
          >
            {finalizing ? 'Finalizing…' : 'Complete Migration →'}
          </button>
          <div className="text-[10px] text-text-muted">
            Will create: {stats.session.contracts_complete} deals, {stats.sponsors?.length || 0} contacts,
            and fulfillment records for every approved benefit.
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Keyboard shortcuts</div>
          <dl className="space-y-1 text-[10px]">
            <KeyRow k="A" desc="Approve current" />
            <KeyRow k="E" desc="Edit current" />
            <KeyRow k="R" desc="Reject current" />
            <KeyRow k="N" desc="Next item" />
            <KeyRow k="P" desc="Previous" />
          </dl>
        </div>
      </aside>
    </div>
  )
}

function KeyRow({ k, desc }) {
  return (
    <div className="flex items-center justify-between">
      <kbd className="px-1.5 py-0.5 bg-bg-surface border border-border rounded font-mono text-[9px]">{k}</kbd>
      <span className="text-text-muted">{desc}</span>
    </div>
  )
}

function StatRow({ label, value, color }) {
  const cls = color === 'success' ? 'text-success' : color === 'warning' ? 'text-warning' : color === 'accent' ? 'text-accent' : 'text-text-primary'
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className={`font-mono font-semibold ${cls}`}>{value}</span>
    </div>
  )
}

// ─── Contract detail (center panel in review view) ──────────
function ContractDetail({ file, session, onReload }) {
  const { profile } = useAuth()
  const [benefits, setBenefits] = useState([])
  const [tab, setTab] = useState('benefits')

  useEffect(() => { loadBenefits() }, [file.id])

  async function loadBenefits() {
    const { benefits } = await migration.listBenefits(session.id, { fileId: file.id })
    setBenefits(benefits)
  }

  async function approveOne(id) {
    await migration.updateBenefit(id, { review_status: 'approved' }, profile.id)
    loadBenefits()
    onReload()
  }

  async function rejectOne(id) {
    await migration.updateBenefit(id, { review_status: 'rejected' }, profile.id)
    loadBenefits()
    onReload()
  }

  const extracted = file.extracted_data || {}
  // Read new shape (brand_name / effective_date / expiration_date) with
  // a fallback to the legacy nested .sponsor + start/end_date shape.
  const sponsorName = extracted.brand_name || extracted.sponsor?.name || extracted.sponsor?.company || '—'
  const startDate = extracted.effective_date || extracted.start_date
  const endDate   = extracted.expiration_date || extracted.end_date

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="text-sm font-semibold">{file.original_filename}</div>
        <div className="text-[11px] text-text-muted">
          {sponsorName} · {startDate || '—'} to {endDate || '—'}
          {extracted.total_value && ` · $${Number(extracted.total_value).toLocaleString()}`}
        </div>
        {file.status === 'failed' && (
          <div className="mt-3 bg-danger/10 border border-danger/30 rounded p-3 text-[11px] text-danger">
            <div className="font-mono uppercase tracking-wider text-[9px] mb-1">Extraction failed</div>
            <div className="text-text-secondary whitespace-pre-wrap break-all">
              {file.error_message || 'No error message captured. Check the Supabase Functions log for process-contract-batch.'}
            </div>
            <div className="mt-2 text-[10px] text-text-muted">
              Common causes: PDF over 32 MB or 100 pages, encrypted PDF, scanned image-only PDF, or transient Anthropic API error. Re-uploading often works.
            </div>
          </div>
        )}
        {file.status === 'complete' && (extracted.benefits || []).length === 0 && (
          <div className="mt-3 bg-warning/10 border border-warning/30 rounded p-3 text-[11px] text-warning">
            <div className="font-mono uppercase tracking-wider text-[9px] mb-1">No benefits found</div>
            <div className="text-text-secondary">
              Extraction succeeded but Claude returned an empty benefits list — usually because the PDF is mostly boilerplate, scanned without OCR, or the deliverables live in an external Schedule attachment that wasn't uploaded.
            </div>
          </div>
        )}
        {Array.isArray(extracted.warnings) && extracted.warnings.length > 0 && (
          <div className="mt-3 bg-bg-surface border border-border rounded p-2 text-[11px]">
            <div className="font-mono uppercase tracking-wider text-[9px] text-text-muted mb-1">AI warnings</div>
            <ul className="space-y-0.5 text-text-secondary list-disc list-inside">
              {extracted.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-border px-4">
        {['benefits', 'sponsor', 'deal'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs capitalize border-b-2 ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-muted'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'benefits' && (
        <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
          {benefits.length === 0 && <div className="text-xs text-text-muted text-center py-4">No benefits extracted</div>}
          {benefits.map(b => (
            <div key={b.id} className={`bg-bg-surface border rounded p-3 ${b.review_status === 'approved' ? 'border-success/30' : b.review_status === 'rejected' ? 'border-danger/30 opacity-60' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{b.benefit_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-card">{b.benefit_category || '—'}</span>
                    {b.frequency && <span className="text-[9px] text-text-muted">{b.frequency}</span>}
                    {b.annual_value && <span className="text-[9px] text-success">${Number(b.annual_value).toLocaleString()}/yr</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <ConfBar conf={b.extracted_confidence} />
                    {b.assets ? (
                      <span className="text-[9px] text-success">🔗 {b.assets.name}</span>
                    ) : b.asset_match_confidence > 0 ? (
                      <span className="text-[9px] text-warning">~{Math.round(b.asset_match_confidence)}% match</span>
                    ) : (
                      <span className="text-[9px] text-text-muted">no match · will create new</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => approveOne(b.id)} className="text-[10px] bg-success/15 text-success px-2 py-1 rounded">✓</button>
                  <button onClick={() => rejectOne(b.id)} className="text-[10px] bg-danger/15 text-danger px-2 py-1 rounded">✗</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sponsor' && (
        <div className="p-4 text-xs space-y-2">
          <div><span className="text-text-muted">Name:</span> {extracted.sponsor?.name || '—'}</div>
          <div><span className="text-text-muted">Company:</span> {extracted.sponsor?.company || '—'}</div>
          <div><span className="text-text-muted">Contact:</span> {extracted.sponsor?.contact_person || '—'}</div>
          <div><span className="text-text-muted">Email:</span> {extracted.sponsor?.email || '—'}</div>
          <div><span className="text-text-muted">Phone:</span> {extracted.sponsor?.phone || '—'}</div>
        </div>
      )}

      {tab === 'deal' && (
        <div className="p-4 text-xs space-y-2">
          <div><span className="text-text-muted">Brand name:</span> {extracted.sponsor?.company || extracted.sponsor?.name || '—'}</div>
          <div><span className="text-text-muted">Stage:</span> <span className="text-accent">In Fulfillment</span> (migrated contracts)</div>
          <div><span className="text-text-muted">Value:</span> ${Number(extracted.total_value || 0).toLocaleString()}</div>
          <div><span className="text-text-muted">Start:</span> {extracted.start_date || '—'}</div>
          <div><span className="text-text-muted">End:</span> {extracted.end_date || '—'}</div>
        </div>
      )}
    </div>
  )
}

function ConfBar({ conf }) {
  const pct = Math.min(100, Math.max(0, conf || 0))
  const color = pct >= 85 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-danger'
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1 bg-bg-card rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-text-muted font-mono">{pct}%</span>
    </div>
  )
}

// ─── Step 4: Complete view ───────────────────────────────────
function CompleteView({ session }) {
  const navigate = useNavigate()
  const totalBenefits = session.benefits_approved || session.total_benefits_extracted || 0
  const manualMinutesSaved = Math.round((totalBenefits * 3) + (session.total_contracts * 15))

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center space-y-8">
      <div>
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold">You're fully set up.</h1>
        <p className="text-sm text-text-muted mt-2">Your entire contract portfolio is now live in Loud Legacy.</p>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-6 space-y-2 text-left">
        <Summary label="Contracts imported" value={session.total_contracts} />
        <Summary label="Sponsors added" value={session.sponsors_created} />
        <Summary label="Benefits tracked" value={session.benefits_approved} />
        <Summary label="Deals in pipeline" value={session.deals_created} />
        <Summary label="Fulfillment records created" value={session.fulfillment_records_created} />
        {session.duplicate_sponsors_merged > 0 && (
          <Summary label="Duplicate sponsors merged" value={session.duplicate_sponsors_merged} />
        )}
        {session.duplicate_assets_prevented > 0 && (
          <Summary label="Duplicate assets prevented" value={session.duplicate_assets_prevented} />
        )}
      </div>

      <div className="bg-gradient-to-br from-accent/15 to-transparent border border-accent/40 rounded-lg p-5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Time saved</div>
        <div className="text-2xl font-bold mt-2">
          ~{Math.round(manualMinutesSaved / 60)} hours
        </div>
        <div className="text-xs text-text-muted mt-1">
          This migration would have taken approximately {Math.round(manualMinutesSaved / 60)} hours manually.
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NextCard to="/app/crm/pipeline" label="Review pipeline" desc={`${session.deals_created} deals ready`} />
        <NextCard to="/app/crm/fulfillment" label="Fulfillment" desc={`${session.fulfillment_records_created} items`} />
        <NextCard to="/app/crm/assets" label="Asset catalog" desc="Verify inventory" />
        <NextCard to="/app/ops/team" label="Invite team" desc="Give them access" />
      </div>
    </div>
  )
}

function Summary({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-mono font-semibold text-accent">{value}</span>
    </div>
  )
}

function NextCard({ to, label, desc }) {
  return (
    <Link to={to} className="bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-all text-left">
      <div className="text-sm font-semibold text-text-primary">{label}</div>
      <div className="text-[10px] text-text-muted mt-1">{desc}</div>
      <div className="text-[11px] text-accent mt-2">→</div>
    </Link>
  )
}
