import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { useDialog } from '@/hooks/useDialog'
import { Button, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { Upload, ClipboardPaste, X, Loader2, Sparkles } from 'lucide-react'

// BulkEnrichmentImportModal — the single bulk-add tool. Paste a
// list OR drop a CSV; we queue each row and immediately kick off
// enrichment (firmographics + decision-makers) so the user can
// review and click "Add to CRM" without configuring an enrichment
// "mode" — that decision is internal.

interface Props {
  open: boolean
  onClose: () => void
  onQueued?: (count: number) => void
}

// Internal-only — used by the runner to pick a backend. Users no
// longer choose this; we always start with the cheapest path and
// the runner falls back automatically if it doesn't get coverage.
const DEFAULT_ENRICHMENT_MODE = 'claude'

export default function BulkEnrichmentImportModal({ open, onClose, onQueued }: Props) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const dialogRef = useDialog({ isOpen: open, onClose })
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [tab, setTab] = useState<'paste' | 'csv'>('paste')
  const [pasted, setPasted] = useState('')
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  // Parse pasted text. Each non-empty line becomes one row; we
  // try to peel out an email (contains '@') and the rest becomes
  // brand_name. Comma-separated lines get split — first cell is
  // brand_name, then we look for an email + phone pattern.
  function parsedFromPaste() {
    const lines = pasted.split('\n').map(l => l.trim()).filter(Boolean)
    return lines.map(line => {
      const cells = line.split(/[\t,]/).map(c => c.trim()).filter(Boolean)
      let brand_name = '', contact_name = '', contact_email = '', contact_phone = '', website = ''
      for (const cell of cells) {
        if (cell.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell)) {
          contact_email = cell
        } else if (/^https?:\/\//i.test(cell) || /\.(com|io|net|org|co)$/i.test(cell)) {
          website = cell.replace(/^https?:\/\//i, '')
        } else if (/^[\d\s()+\-.]{7,}$/.test(cell)) {
          contact_phone = cell
        } else if (!brand_name) {
          brand_name = cell
        } else if (!contact_name) {
          contact_name = cell
        }
      }
      return {
        kind: contact_email || contact_name ? 'contact' : 'company',
        raw_input: line,
        brand_name: brand_name || null,
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        website: website || null,
      }
    })
  }

  // Parse a CSV file. Detects header row + maps fuzzy column names.
  // Falls back to first column = brand_name if no header match works.
  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length === 0) {
      toast({ title: 'CSV is empty', type: 'warning' })
      return
    }
    // Detect headers — if first row contains anything that looks like
    // a column label (no @, not a phone number), treat as headers.
    const firstCells = splitCsvLine(lines[0])
    const looksLikeHeader = firstCells.every(c =>
      !c.includes('@') && !/^\d/.test(c) && c.length < 60
    )
    let headers: string[]
    let dataLines: string[]
    if (looksLikeHeader) {
      headers = firstCells.map(c => c.toLowerCase())
      dataLines = lines.slice(1)
    } else {
      headers = firstCells.map((_, i) => `col_${i}`)
      dataLines = lines
    }
    const rows = dataLines.map(l => {
      const cells = splitCsvLine(l)
      const r: Record<string, string> = {}
      for (let i = 0; i < headers.length; i++) r[headers[i]] = (cells[i] || '').trim()
      return r
    })
    setCsvHeaders(headers)
    setCsvRows(rows)
  }

  function parsedFromCsv() {
    return csvRows.map(r => {
      const get = (...keys: string[]) => {
        for (const k of keys) {
          const matched = csvHeaders.find(h => h === k || h.includes(k))
          if (matched && r[matched]) return r[matched]
        }
        return ''
      }
      const brand_name = get('company', 'brand', 'organization', 'org', 'account', 'col_0')
      const contact_email = get('email', 'e-mail')
      const contact_name = get('name', 'full name', 'contact')
      const contact_phone = get('phone', 'mobile', 'cell', 'tel')
      const website = get('website', 'url', 'domain')
      const linkedin_url = get('linkedin', 'li')
      return {
        kind: contact_email || contact_name ? 'contact' : 'company',
        raw_input: JSON.stringify(r),
        brand_name: brand_name || null,
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        website: website || null,
        linkedin_url: linkedin_url || null,
      }
    })
  }

  async function submit() {
    if (!profile?.property_id) return
    const rows = tab === 'paste' ? parsedFromPaste() : parsedFromCsv()
    const valid = rows.filter(r => r.brand_name || r.contact_email || r.contact_name)
    if (valid.length === 0) {
      toast({ title: 'No rows to import', description: 'Each line needs at least a company or email.', type: 'warning' })
      return
    }
    setSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('bulk_enqueue_for_enrichment', {
        p_property_id: profile.property_id,
        p_rows: valid,
        p_source: tab,
        p_enrichment_mode: DEFAULT_ENRICHMENT_MODE,
      })
      if (error) throw error
      const inserted = (data?.[0]?.inserted ?? valid.length)
      onQueued?.(inserted)

      // Always kick off enrichment immediately. Fire-and-forget;
      // the runner marks rows enriched as it goes and the cron
      // catches anything we miss.
      try {
        await supabase.functions.invoke('bulk-enrichment-runner', {
          body: { property_id: profile.property_id },
        })
      } catch { /* swallow — rows will get processed by cron anyway */ }

      toast({
        title: `Added ${inserted} row${inserted === 1 ? '' : 's'}`,
        description: 'Enriching now. Check back in a minute and click Add to CRM on each row.',
        type: 'success',
      })
      onClose()
      setPasted(''); setCsvRows([]); setCsvHeaders([])
    } catch (e: any) {
      toast({ title: 'Import failed', description: humanError(e), type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const previewRows = tab === 'paste' ? parsedFromPaste() : parsedFromCsv()
  const previewCount = previewRows.filter(r => r.brand_name || r.contact_email || r.contact_name).length

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="bg-bg-surface border border-border rounded-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Upload className="w-4 h-4 text-accent" /> Bulk add
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Paste a list or upload a CSV. Each row is enriched with firmographics and decision-makers automatically.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit">
            <button onClick={() => setTab('paste')} className={`px-3 py-1.5 rounded text-sm font-medium ${tab === 'paste' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}>
              <ClipboardPaste className="w-3.5 h-3.5 inline mr-1" /> Paste
            </button>
            <button onClick={() => setTab('csv')} className={`px-3 py-1.5 rounded text-sm font-medium ${tab === 'csv' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}>
              <Upload className="w-3.5 h-3.5 inline mr-1" /> CSV upload
            </button>
          </div>

          {tab === 'paste' && (
            <>
              <textarea
                rows={8}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder={"One per line. Examples:\nAcme Corp\nAcme Corp, jane@acme.com\nNike, John Smith, john@nike.com, +1 555-0100"}
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none font-mono"
              />
              <div className="text-[10px] text-text-muted">
                We auto-detect emails, phones, websites. Anything else becomes the company name.
              </div>
            </>
          )}

          {tab === 'csv' && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> Choose CSV file
              </Button>
              {csvRows.length > 0 && (
                <div className="text-xs text-text-muted">
                  Loaded {csvRows.length} rows · Headers: {csvHeaders.join(', ')}
                </div>
              )}
            </>
          )}

          {previewCount > 0 && (
            <div className="bg-bg-card border border-border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Preview</span>
                <Badge tone="info">{previewCount} valid</Badge>
              </div>
              <ul className="space-y-1 text-[11px] font-mono max-h-32 overflow-y-auto">
                {previewRows.slice(0, 8).map((r, i) => (
                  <li key={i} className="text-text-secondary truncate">
                    <Badge tone={r.kind === 'contact' ? 'success' : 'neutral'} className="mr-1.5">{r.kind}</Badge>
                    {r.brand_name || '—'}
                    {r.contact_email && <span className="text-text-muted"> · {r.contact_email}</span>}
                  </li>
                ))}
                {previewRows.length > 8 && (
                  <li className="text-text-muted">… {previewRows.length - 8} more</li>
                )}
              </ul>
            </div>
          )}

        </div>

        <div className="p-4 border-t border-border flex items-center justify-between gap-2">
          <span className="text-[11px] text-text-muted">
            {previewCount > 0 ? `${previewCount} rows ready` : 'Add at least one row above'}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={previewCount === 0 || submitting}>
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><Sparkles className="w-3.5 h-3.5" /> Add {previewCount} rows</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Minimal CSV line splitter — handles quoted fields with commas.
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = !inQuotes }
    } else if (c === ',' && !inQuotes) {
      out.push(cur); cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}
