import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as importService from '@/services/email/importService'
import * as listService from '@/services/email/emailListService'
import { useEffect } from 'react'

/**
 * /app/marketing/email/import — 5-step wizard:
 * 1 Upload → 2 Map columns → 3 Options → 4 Review → 5 Results
 */
export default function EmailImport() {
  const { profile } = useAuth()
  const [step, setStep] = useState(1)
  const [parsed, setParsed] = useState(null)
  const [columnMap, setColumnMap] = useState({})
  const [options, setOptions] = useState({
    listIds: [],
    tags: [],
    duplicateAction: 'update',
    unsubscribedAction: 'skip',
  })
  const [lists, setLists] = useState([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [summary, setSummary] = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => { listService.listLists().then(r => setLists(r.lists)) }, [])

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importService.parseCsv(reader.result)
      setParsed(result)
      setColumnMap(importService.autoMapColumns(result.headers))
      setStep(2)
    }
    reader.readAsText(file)
  }

  function downloadSample() {
    const blob = new Blob([importService.SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'loud-legacy-subscribers-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function runImport() {
    setRunning(true)
    const s = await importService.runImport(
      parsed.rows,
      columnMap,
      { ...options, propertyId: profile?.property_id },
      (done, total) => setProgress({ done, total })
    )
    setSummary(s)
    setRunning(false)
    setStep(5)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <h2 className="text-xl font-semibold">Import Subscribers</h2>
        <p className="text-[11px] text-text-muted">Step {step} of 5</p>
      </header>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className={`flex-1 h-1 rounded ${n <= step ? 'bg-accent' : 'bg-bg-card'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4 text-xs">
          <div>
            <div className="text-sm font-semibold mb-2">Upload CSV</div>
            <input type="file" accept=".csv" onChange={handleFile} className="text-xs" />
          </div>
          <button onClick={downloadSample} className="text-accent text-[11px] hover:underline">
            ↓ Download sample CSV template
          </button>
          <div className="text-[11px] text-text-muted">
            Required: <code>email</code>. Optional: first_name, last_name, organization, title, industry, phone, linkedin_url.
          </div>
        </div>
      )}

      {step === 2 && parsed && (
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
          <div className="text-sm font-semibold">Map columns ({parsed.rows.length} rows detected)</div>
          <div className="space-y-2">
            {parsed.headers.map(h => (
              <div key={h} className="flex items-center gap-2">
                <div className="flex-1 text-text-secondary">{h}</div>
                <div className="text-text-muted">→</div>
                <select
                  value={columnMap[h] || ''}
                  onChange={e => setColumnMap({ ...columnMap, [h]: e.target.value || null })}
                  className="bg-bg-surface border border-border rounded px-2 py-1 text-xs"
                >
                  <option value="">— skip —</option>
                  <option value="email">email</option>
                  <option value="first_name">first_name</option>
                  <option value="last_name">last_name</option>
                  <option value="organization">organization</option>
                  <option value="title">title</option>
                  <option value="industry">industry</option>
                  <option value="phone">phone</option>
                  <option value="linkedin_url">linkedin_url</option>
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={() => setStep(1)} className="flex-1 border border-border py-2 rounded">Back</button>
            <button onClick={() => setStep(3)} className="flex-1 bg-accent text-bg-primary py-2 rounded font-semibold">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
          <div className="text-sm font-semibold">Options</div>
          <div>
            <label className="text-text-muted block mb-1">Add to lists</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {lists.map(l => (
                <label key={l.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.listIds.includes(l.id)}
                    onChange={e => setOptions({
                      ...options,
                      listIds: e.target.checked ? [...options.listIds, l.id] : options.listIds.filter(x => x !== l.id),
                    })}
                  />
                  <span>{l.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-text-muted block mb-1">Duplicate handling</label>
            <select value={options.duplicateAction} onChange={e => setOptions({ ...options, duplicateAction: e.target.value })} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5">
              <option value="update">Update existing subscriber</option>
              <option value="skip">Skip (keep existing)</option>
            </select>
          </div>
          <div>
            <label className="text-text-muted block mb-1">If already unsubscribed</label>
            <select value={options.unsubscribedAction} onChange={e => setOptions({ ...options, unsubscribedAction: e.target.value })} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5">
              <option value="skip">Skip (do not resubscribe)</option>
              <option value="resub">Resubscribe (not recommended)</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={() => setStep(2)} className="flex-1 border border-border py-2 rounded">Back</button>
            <button onClick={() => setStep(4)} className="flex-1 bg-accent text-bg-primary py-2 rounded font-semibold">Next</button>
          </div>
        </div>
      )}

      {step === 4 && parsed && (
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
          <div className="text-sm font-semibold">Review</div>
          <div>Total rows: <strong>{parsed.rows.length}</strong></div>
          <div>Adding to lists: <strong>{options.listIds.length}</strong></div>
          <div>On duplicate: <strong>{options.duplicateAction}</strong></div>
          {running && (
            <div>
              <div className="text-[11px] text-text-muted mb-1">Processing {progress.done} / {progress.total}</div>
              <div className="w-full bg-bg-surface h-1.5 rounded">
                <div className="bg-accent h-1.5 rounded" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={() => setStep(3)} className="flex-1 border border-border py-2 rounded" disabled={running}>Back</button>
            <button onClick={runImport} className="flex-1 bg-accent text-bg-primary py-2 rounded font-semibold" disabled={running}>
              {running ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      )}

      {step === 5 && summary && (
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-2 text-xs">
          <div className="text-sm font-semibold">Import complete</div>
          <div>✓ Added: <span className="text-success">{summary.added}</span></div>
          <div>↻ Updated: <span className="text-accent">{summary.updated}</span></div>
          <div>⊘ Skipped: <span className="text-warning">{summary.skipped}</span></div>
          <div>✗ Failed: <span className="text-danger">{summary.failed}</span></div>
          {summary.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-text-muted">View errors ({summary.errors.length})</summary>
              <div className="mt-2 max-h-48 overflow-y-auto text-[10px] font-mono">
                {summary.errors.map((e, i) => <div key={i}>Row {e.row}: {e.reason}</div>)}
              </div>
            </details>
          )}
          <div className="pt-2 border-t border-border flex gap-2">
            <Link to="/app/marketing/email/subscribers" className="flex-1 text-center bg-accent text-bg-primary py-2 rounded font-semibold">View subscribers</Link>
            <button onClick={() => { setStep(1); setParsed(null); setSummary(null) }} className="flex-1 border border-border py-2 rounded">Import more</button>
          </div>
        </div>
      )}
    </div>
  )
}
