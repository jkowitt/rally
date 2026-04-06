import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const DEAL_FIELDS = [
  { key: 'brand_name', label: 'Company / Brand Name', required: true },
  { key: 'contact_first_name', label: 'Contact First Name' },
  { key: 'contact_last_name', label: 'Contact Last Name' },
  { key: 'contact_email', label: 'Email' },
  { key: 'contact_phone', label: 'Phone' },
  { key: 'contact_position', label: 'Title / Position' },
  { key: 'value', label: 'Deal Value ($)' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'website', label: 'Website' },
  { key: 'sub_industry', label: 'Industry' },
  { key: 'skip', label: '— Skip this column —' },
]

export default function CSVImportWizard({ onClose, onImported }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const fileRef = useRef(null)
  const [step, setStep] = useState(1) // 1=upload, 2=map, 3=preview, 4=importing
  const [rawData, setRawData] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [importCount, setImportCount] = useState(0)

  function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    const delimiter = lines[0].includes('\t') ? '\t' : ','
    const hdrs = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line => {
      const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''))
      const obj = {}
      hdrs.forEach((h, i) => { obj[h] = parts[i] || '' })
      return obj
    })
    return { headers: hdrs, rows }
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const { headers: h, rows } = parseCSV(reader.result)
      setHeaders(h)
      setRawData(rows)
      // Auto-map by matching header names
      const autoMap = {}
      h.forEach((header, i) => {
        const lower = header.toLowerCase()
        const match = DEAL_FIELDS.find(f =>
          f.key !== 'skip' && (
            lower.includes(f.key.replace(/_/g, ' ')) ||
            lower.includes(f.label.toLowerCase()) ||
            (f.key === 'brand_name' && (lower.includes('company') || lower.includes('brand'))) ||
            (f.key === 'contact_email' && lower.includes('email')) ||
            (f.key === 'contact_phone' && (lower.includes('phone') || lower.includes('mobile'))) ||
            (f.key === 'contact_first_name' && lower.includes('first')) ||
            (f.key === 'contact_last_name' && lower.includes('last')) ||
            (f.key === 'contact_position' && (lower.includes('title') || lower.includes('position'))) ||
            (f.key === 'value' && (lower.includes('value') || lower.includes('amount') || lower.includes('revenue'))) ||
            (f.key === 'website' && (lower.includes('website') || lower.includes('url'))) ||
            (f.key === 'city' && lower.includes('city')) ||
            (f.key === 'state' && (lower.includes('state') || lower.includes('province')))
          )
        )
        autoMap[i] = match?.key || 'skip'
      })
      setMapping(autoMap)
      setStep(2)
    }
    reader.readAsText(file)
  }

  function getMappedData() {
    return rawData.map(row => {
      const mapped = {}
      headers.forEach((h, i) => {
        const field = mapping[i]
        if (field && field !== 'skip') {
          mapped[field] = row[h]
        }
      })
      return mapped
    }).filter(r => r.brand_name)
  }

  async function handleImport() {
    const data = getMappedData()
    if (!data.length) return
    setImporting(true)
    setStep(4)
    let count = 0
    for (const row of data) {
      try {
        const deal = {
          property_id: propertyId,
          brand_name: row.brand_name,
          contact_first_name: row.contact_first_name || null,
          contact_last_name: row.contact_last_name || null,
          contact_name: [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ') || null,
          contact_email: row.contact_email || null,
          contact_phone: row.contact_phone || null,
          contact_position: row.contact_position || null,
          value: row.value ? Number(String(row.value).replace(/[$,]/g, '')) || null : null,
          source: row.source || 'Other',
          notes: row.notes || null,
          stage: 'Prospect',
          date_added: new Date().toISOString().split('T')[0],
        }
        // Try with extra fields, fall back without
        const extras = {}
        if (row.city) extras.city = row.city
        if (row.state) extras.state = row.state
        if (row.website) extras.website = row.website
        if (row.sub_industry) extras.sub_industry = row.sub_industry
        const { error } = await supabase.from('deals').insert({ ...deal, ...extras })
        if (error) {
          await supabase.from('deals').insert(deal)
        }
        count++
        setImportCount(count)
      } catch (e) { console.warn(e) }
    }
    toast({ title: `${count} deals imported`, type: 'success' })
    onImported?.(count)
    setImporting(false)
  }

  const previewData = step >= 3 ? getMappedData().slice(0, 5) : []

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-text-primary">Import CSV</h2>
            <p className="text-[10px] sm:text-xs text-text-muted">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">📄</div>
              <p className="text-sm text-text-secondary mb-4">Upload a CSV or Excel export with your prospect data</p>
              <button onClick={() => fileRef.current?.click()} className="bg-accent text-bg-primary px-6 py-2.5 rounded text-sm font-medium hover:opacity-90">
                Choose CSV File
              </button>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
              <p className="text-[10px] text-text-muted mt-3">Supports CSV, TSV, and tab-delimited files</p>
            </div>
          )}

          {/* Step 2: Map columns */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">Map each column to a field. Auto-detected mappings are pre-selected.</p>
              {headers.map((header, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-text-primary font-mono w-1/3 truncate" title={header}>{header}</span>
                  <span className="text-text-muted text-xs">&rarr;</span>
                  <select
                    value={mapping[i] || 'skip'}
                    onChange={(e) => setMapping({ ...mapping, [i]: e.target.value })}
                    className="flex-1 bg-bg-card border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    {DEAL_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex gap-3 pt-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90">Preview</button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">{getMappedData().length} rows will be imported. Preview of first 5:</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {Object.keys(previewData[0] || {}).map(k => (
                        <th key={k} className="px-2 py-1 text-left text-text-muted font-mono">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-2 py-1 text-text-primary truncate max-w-[150px]">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm">Back</button>
                <button onClick={handleImport} className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90">
                  Import {getMappedData().length} Deals
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 4 && (
            <div className="text-center py-8">
              {importing ? (
                <>
                  <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-sm text-text-muted">Importing... {importCount} of {rawData.length}</p>
                  <div className="w-48 mx-auto bg-bg-card rounded-full h-1.5 mt-3">
                    <div className="bg-accent rounded-full h-1.5 transition-all" style={{ width: `${(importCount / rawData.length) * 100}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-3">✅</div>
                  <p className="text-sm text-text-primary font-medium">{importCount} deals imported successfully!</p>
                  <button onClick={onClose} className="bg-accent text-bg-primary px-6 py-2 rounded text-sm font-medium mt-4 hover:opacity-90">Done</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
