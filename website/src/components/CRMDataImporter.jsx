import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

// PDF extraction (same as ContractManager)
let pdfjsLoaded = null
async function loadPdfjs() {
  if (pdfjsLoaded) return pdfjsLoaded
  if (window.pdfjsLib) { pdfjsLoaded = window.pdfjsLib; return pdfjsLoaded }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
    s.onload = () => {
      if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'; pdfjsLoaded = window.pdfjsLib; resolve(pdfjsLoaded) }
      else reject(new Error('pdfjs not available'))
    }
    s.onerror = () => reject(new Error('Failed to load pdfjs'))
    document.head.appendChild(s)
  })
}

async function extractPdfText(arrayBuffer) {
  const pdfjs = await loadPdfjs()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n'
  }
  return text.trim()
}

// SheetJS (Excel) loader
let xlsxLoaded = null
async function loadXlsx() {
  if (xlsxLoaded) return xlsxLoaded
  if (window.XLSX) { xlsxLoaded = window.XLSX; return xlsxLoaded }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js'
    s.onload = () => { if (window.XLSX) { xlsxLoaded = window.XLSX; resolve(xlsxLoaded) } else reject(new Error('SheetJS not available')) }
    s.onerror = () => reject(new Error('Failed to load SheetJS'))
    document.head.appendChild(s)
  })
}

// Fuzzy column matching
const FIELD_DEFS = [
  { key: 'brand_name', label: 'Company / Brand', patterns: ['company', 'brand', 'organization', 'org', 'employer', 'business', 'account', 'account name'] },
  { key: 'full_name', label: 'Full Name', patterns: ['full name', 'name', 'contact name', 'person'] },
  { key: 'contact_first_name', label: 'First Name', patterns: ['first name', 'first', 'firstname', 'given name'] },
  { key: 'contact_last_name', label: 'Last Name', patterns: ['last name', 'last', 'lastname', 'surname'] },
  { key: 'contact_email', label: 'Email', patterns: ['email', 'e-mail', 'mail', 'email address'] },
  { key: 'contact_phone', label: 'Phone', patterns: ['phone', 'telephone', 'mobile', 'cell', 'direct', 'phone number'] },
  { key: 'contact_position', label: 'Title / Position', patterns: ['title', 'position', 'role', 'job title', 'job', 'designation'] },
  { key: 'linkedin', label: 'LinkedIn', patterns: ['linkedin', 'linked in', 'linkedin url'] },
  { key: 'value', label: 'Deal Value', patterns: ['value', 'amount', 'revenue', 'deal value', 'price', 'budget', 'deal amount'] },
  { key: 'stage', label: 'Stage', patterns: ['stage', 'status', 'deal stage', 'pipeline stage'] },
  { key: 'source', label: 'Source', patterns: ['source', 'lead source', 'referral', 'origin'] },
  { key: 'notes', label: 'Notes', patterns: ['notes', 'note', 'comments', 'description', 'memo', 'activity'] },
  { key: 'city', label: 'City', patterns: ['city', 'town', 'location'] },
  { key: 'state', label: 'State', patterns: ['state', 'province', 'region'] },
  { key: 'website', label: 'Website', patterns: ['website', 'url', 'web', 'domain'] },
  { key: 'sub_industry', label: 'Industry', patterns: ['industry', 'sector', 'category', 'vertical'] },
  { key: 'date_added', label: 'Date Added', patterns: ['date', 'created', 'added', 'create date', 'created date', 'close date'] },
  { key: 'skip', label: '— Skip —', patterns: [] },
]

function matchColumn(header) {
  const h = header.toLowerCase().trim()
  for (const def of FIELD_DEFS) {
    for (const p of def.patterns) {
      if (h === p || h.includes(p)) return def.key
    }
  }
  return 'skip'
}

// Parse CSV/TSV text
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

// Parse vCard
function parseVCard(text) {
  const cards = text.split('BEGIN:VCARD').filter(c => c.trim())
  const contacts = []
  for (const card of cards) {
    const get = (key) => { const m = card.match(new RegExp(`${key}[^:]*:(.+)`, 'i')); return m ? m[1].trim() : '' }
    const fn = get('FN')
    const n = get('N')
    const parts = n ? n.split(';') : fn.split(' ')
    contacts.push({
      contact_last_name: parts[0] || '',
      contact_first_name: parts[1] || fn.split(' ')[0] || '',
      contact_email: get('EMAIL'),
      contact_phone: get('TEL'),
      contact_position: get('TITLE'),
      brand_name: get('ORG'),
    })
  }
  return contacts.filter(c => c.contact_first_name || c.contact_email || c.brand_name)
}

// Parse text into structured rows (for PDF/Word extracted text)
function parseTextToRows(text) {
  // Try to find tabular data (lines with consistent delimiters)
  const lines = text.split('\n').filter(l => l.trim())
  // Check for CSV-like content
  const commaLines = lines.filter(l => l.split(',').length > 2)
  if (commaLines.length > 5) return parseCSV(commaLines.join('\n'))
  // Check for tab-separated
  const tabLines = lines.filter(l => l.split('\t').length > 2)
  if (tabLines.length > 5) return parseCSV(tabLines.join('\n'))
  // Try key: value pairs
  const kvRows = []
  let current = {}
  for (const line of lines) {
    const kv = line.match(/^([^:]+):\s*(.+)$/)
    if (kv) {
      const key = kv[1].trim()
      const val = kv[2].trim()
      current[key] = val
    } else if (Object.keys(current).length > 0) {
      kvRows.push(current)
      current = {}
    }
  }
  if (Object.keys(current).length > 0) kvRows.push(current)
  if (kvRows.length > 0) {
    const headers = [...new Set(kvRows.flatMap(r => Object.keys(r)))]
    return { headers, rows: kvRows }
  }
  // Last resort: each line is a company name
  return {
    headers: ['Company'],
    rows: lines.filter(l => l.length > 2 && l.length < 200).map(l => ({ Company: l.trim() }))
  }
}

// Parse JSON (handles HubSpot, Salesforce, Pipedrive formats)
function parseJSON(text) {
  const data = JSON.parse(text)
  // Array of objects
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    // HubSpot format: { properties: { ... } }
    if (data[0].properties && typeof data[0].properties === 'object') {
      const rows = data.map(d => d.properties)
      const headers = [...new Set(rows.flatMap(r => Object.keys(r)))]
      return { headers, rows }
    }
    const headers = [...new Set(data.flatMap(r => Object.keys(r)))]
    return { headers, rows: data }
  }
  // Single object with results/records/data array
  const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]) && data[k].length > 0)
  if (arrayKey) {
    const rows = data[arrayKey].map(r => r.properties || r.attributes || r)
    const headers = [...new Set(rows.flatMap(r => Object.keys(r)))]
    return { headers, rows }
  }
  return { headers: [], rows: [] }
}

export default function CRMDataImporter({ onClose, onImported }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const fileRef = useRef(null)

  const [step, setStep] = useState(1)
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [importTarget, setImportTarget] = useState('deals')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [parseErrors, setParseErrors] = useState([])

  // Only developer and admin can use this
  if (profile?.role !== 'developer' && profile?.role !== 'admin') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-bg-surface border border-border rounded-lg p-6 text-center max-w-sm">
          <div className="text-2xl mb-2">🔒</div>
          <h3 className="text-lg font-semibold text-text-primary">Admin Access Required</h3>
          <p className="text-xs text-text-muted mt-2">Only admins and developers can import CRM data.</p>
          <button onClick={onClose} className="mt-4 bg-accent text-bg-primary px-4 py-2 rounded text-sm">Close</button>
        </div>
      </div>
    )
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...dropped])
  }

  function handleFileSelect(e) {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selected])
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase()
    const icons = { csv: '📊', tsv: '📊', xlsx: '📗', xls: '📗', json: '📋', pdf: '📄', docx: '📝', doc: '📝', vcf: '👤', txt: '📄' }
    return icons[ext] || '📎'
  }

  async function processFiles() {
    setProcessing(true)
    setParseErrors([])
    const allRows = []
    let allHeaders = []
    const errors = []

    for (const file of files) {
      try {
        const ext = file.name.split('.').pop().toLowerCase()

        if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
          const text = await file.text()
          const { headers: h, rows: r } = parseCSV(text)
          if (h.length) { allHeaders = [...new Set([...allHeaders, ...h])]; allRows.push(...r) }
          else errors.push(`${file.name}: No data found`)

        } else if (ext === 'xlsx' || ext === 'xls') {
          const XLSX = await loadXlsx()
          const buf = await file.arrayBuffer()
          const wb = XLSX.read(buf, { type: 'array' })
          for (const sheetName of wb.SheetNames) {
            const sheet = wb.Sheets[sheetName]
            const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
            if (json.length > 0) {
              const h = Object.keys(json[0])
              allHeaders = [...new Set([...allHeaders, ...h])]
              allRows.push(...json)
            }
          }

        } else if (ext === 'json') {
          const text = await file.text()
          const { headers: h, rows: r } = parseJSON(text)
          if (h.length) { allHeaders = [...new Set([...allHeaders, ...h])]; allRows.push(...r) }
          else errors.push(`${file.name}: Could not parse JSON structure`)

        } else if (ext === 'pdf') {
          const buf = await file.arrayBuffer()
          const text = await extractPdfText(buf)
          const { headers: h, rows: r } = parseTextToRows(text)
          if (h.length) { allHeaders = [...new Set([...allHeaders, ...h])]; allRows.push(...r) }
          else errors.push(`${file.name}: No structured data found in PDF`)

        } else if (ext === 'docx' || ext === 'doc') {
          const mammoth = await import('mammoth')
          const buf = await file.arrayBuffer()
          const result = await mammoth.default.extractRawText({ arrayBuffer: buf })
          const text = result.value || ''
          const { headers: h, rows: r } = parseTextToRows(text)
          if (h.length) { allHeaders = [...new Set([...allHeaders, ...h])]; allRows.push(...r) }
          else errors.push(`${file.name}: No structured data found in document`)

        } else if (ext === 'vcf') {
          const text = await file.text()
          const contacts = parseVCard(text)
          if (contacts.length) {
            const h = [...new Set(contacts.flatMap(c => Object.keys(c)))]
            allHeaders = [...new Set([...allHeaders, ...h])]
            allRows.push(...contacts)
          } else errors.push(`${file.name}: No contacts found in vCard`)

        } else {
          errors.push(`${file.name}: Unsupported file type (.${ext})`)
        }
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`)
      }
    }

    setHeaders(allHeaders)
    setRows(allRows)
    setParseErrors(errors)

    // Auto-map columns
    const autoMap = {}
    allHeaders.forEach((h, i) => { autoMap[i] = matchColumn(h) })
    setMapping(autoMap)

    if (allRows.length > 0) setStep(2)
    else if (errors.length) toast({ title: 'No data extracted', description: errors[0], type: 'error' })
    setProcessing(false)
  }

  function getMappedRows() {
    return rows.map(row => {
      const mapped = {}
      headers.forEach((h, i) => {
        const field = mapping[i]
        if (field && field !== 'skip') {
          const val = row[h]
          if (val !== undefined && val !== null && val !== '') mapped[field] = String(val).trim()
        }
      })
      // Handle full_name → split
      if (mapped.full_name && !mapped.contact_first_name) {
        const parts = mapped.full_name.trim().split(/\s+/)
        mapped.contact_first_name = parts[0] || ''
        mapped.contact_last_name = parts.slice(1).join(' ') || ''
      }
      return mapped
    }).filter(r => r.brand_name || r.contact_first_name || r.contact_email || r.notes)
  }

  async function handleImport() {
    const data = getMappedRows()
    if (!data.length) return
    if (!propertyId) {
      toast({ title: 'No property linked', description: 'Your account needs a property before importing data.', type: 'error' })
      return
    }
    setImporting(true)
    const stats = { deals: 0, contacts: 0, activities: 0, skipped: 0 }

    try {
      if (importTarget === 'deals' || importTarget === 'all') {
        // Group by company
        const groups = new Map()
        for (const row of data) {
          const key = (row.brand_name || row.contact_email || 'unknown').toLowerCase()
          if (!groups.has(key)) groups.set(key, { ...row, contacts: [] })
          const g = groups.get(key)
          if (row.contact_first_name || row.contact_email) {
            g.contacts.push({
              first_name: row.contact_first_name || '', last_name: row.contact_last_name || '',
              email: row.contact_email || '', phone: row.contact_phone || '',
              position: row.contact_position || '', linkedin: row.linkedin || '',
              company: row.brand_name || '', city: row.city || '', state: row.state || '',
            })
          }
        }

        for (const [, group] of groups) {
          if (!group.brand_name) { stats.skipped++; continue }
          // Check existing
          const { data: existing } = await supabase.from('deals').select('id').eq('property_id', propertyId).ilike('brand_name', group.brand_name).limit(1)
          let dealId
          if (existing?.length > 0) {
            dealId = existing[0].id
            stats.skipped++
          } else {
            const stageMap = { 'prospect': 'Prospect', 'lead': 'Prospect', 'proposal': 'Proposal Sent', 'proposal sent': 'Proposal Sent', 'negotiation': 'Negotiation', 'contracted': 'Contracted', 'won': 'Contracted', 'closed won': 'Contracted', 'lost': 'Declined', 'closed lost': 'Declined' }
            const mappedStage = stageMap[(group.stage || '').toLowerCase()] || 'Prospect'
            const { data: deal, error } = await supabase.from('deals').insert({
              property_id: propertyId, brand_name: group.brand_name,
              contact_first_name: group.contact_first_name || '', contact_last_name: group.contact_last_name || '',
              contact_email: group.contact_email || '', contact_phone: group.contact_phone || '',
              contact_position: group.contact_position || '',
              value: group.value ? Number(String(group.value).replace(/[$,]/g, '')) || null : null,
              stage: mappedStage, source: group.source || 'Import', notes: group.notes || '',
              city: group.city || '', state: group.state || '', website: group.website || '',
              sub_industry: group.sub_industry || '', date_added: group.date_added || new Date().toISOString().slice(0, 10),
            }).select().single()
            if (error) { console.warn('Deal insert error:', error.message); stats.skipped++; continue }
            dealId = deal.id
            stats.deals++
          }

          // Insert contacts
          for (const contact of group.contacts) {
            if (!contact.email && !contact.first_name) continue
            if (contact.email) {
              const { data: ec } = await supabase.from('contacts').select('id').eq('deal_id', dealId).ilike('email', contact.email).limit(1)
              if (ec?.length > 0) continue
            }
            await supabase.from('contacts').insert({
              deal_id: dealId, property_id: propertyId, ...contact,
              is_primary: group.contacts.indexOf(contact) === 0,
            })
            stats.contacts++
          }
        }
      }

      if (importTarget === 'contacts') {
        for (const row of data) {
          if (!row.contact_email && !row.contact_first_name) { stats.skipped++; continue }
          // Find deal by company name
          let dealId = null
          if (row.brand_name) {
            const { data: deals } = await supabase.from('deals').select('id').eq('property_id', propertyId).ilike('brand_name', row.brand_name).limit(1)
            dealId = deals?.[0]?.id || null
          }
          if (row.contact_email) {
            const { data: ec } = await supabase.from('contacts').select('id').eq('property_id', propertyId).ilike('email', row.contact_email).limit(1)
            if (ec?.length > 0) { stats.skipped++; continue }
          }
          await supabase.from('contacts').insert({
            deal_id: dealId, property_id: propertyId,
            first_name: row.contact_first_name || '', last_name: row.contact_last_name || '',
            email: row.contact_email || '', phone: row.contact_phone || '',
            position: row.contact_position || '', company: row.brand_name || '',
            city: row.city || '', state: row.state || '', linkedin: row.linkedin || '',
          })
          stats.contacts++
        }
      }

      if (importTarget === 'activities') {
        for (const row of data) {
          if (!row.notes && !row.brand_name) { stats.skipped++; continue }
          let dealId = null
          if (row.brand_name) {
            const { data: deals } = await supabase.from('deals').select('id').eq('property_id', propertyId).ilike('brand_name', row.brand_name).limit(1)
            dealId = deals?.[0]?.id || null
          }
          await supabase.from('activities').insert({
            deal_id: dealId, property_id: propertyId, created_by: profile.id,
            activity_type: 'Note', subject: row.brand_name ? `Import note: ${row.brand_name}` : 'Imported note',
            notes: row.notes || row.brand_name || '', occurred_at: row.date_added || new Date().toISOString(),
          })
          stats.activities++
        }
      }

      setResults(stats)
      setStep(4)
      const total = stats.deals + stats.contacts + stats.activities
      if (total > 0) onImported(total)
    } catch (err) {
      toast({ title: 'Import error', description: err.message, type: 'error' })
    }
    setImporting(false)
  }

  const mappedPreview = step >= 2 ? getMappedRows().slice(0, 5) : []
  const totalRows = step >= 2 ? getMappedRows().length : 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg-surface border-b border-border p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Import CRM Data</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {step === 1 && 'Upload files from any CRM — CSV, Excel, PDF, Word, JSON, vCard'}
              {step === 2 && `${totalRows} rows found — map columns to fields`}
              {step === 3 && 'Choose what to import'}
              {step === 4 && 'Import complete'}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Step 1: Upload */}
          {step === 1 && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                }`}
              >
                <div className="text-3xl mb-2">{dragOver ? '📥' : '📁'}</div>
                <div className="text-sm text-text-primary font-medium">Drop files here or click to browse</div>
                <div className="text-xs text-text-muted mt-1">CSV, Excel (.xlsx), PDF, Word (.docx), JSON, vCard (.vcf)</div>
                <input ref={fileRef} type="file" multiple accept=".csv,.tsv,.xlsx,.xls,.json,.pdf,.docx,.doc,.vcf,.txt" onChange={handleFileSelect} className="hidden" />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono text-text-muted uppercase">{files.length} file{files.length !== 1 ? 's' : ''} selected</div>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-bg-card border border-border rounded px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{getFileIcon(f.name)}</span>
                        <span className="text-sm text-text-primary truncate">{f.name}</span>
                        <span className="text-[10px] text-text-muted font-mono shrink-0">{(f.size / 1024).toFixed(0)}KB</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-text-muted hover:text-danger text-sm ml-2">&times;</button>
                    </div>
                  ))}
                  <button
                    onClick={processFiles}
                    disabled={processing}
                    className="w-full bg-accent text-bg-primary py-2.5 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {processing ? 'Processing files...' : `Process ${files.length} File${files.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              )}

              {parseErrors.length > 0 && (
                <div className="bg-warning/10 border border-warning/30 rounded p-3 space-y-1">
                  {parseErrors.map((e, i) => <div key={i} className="text-xs text-warning">{e}</div>)}
                </div>
              )}
            </>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <div className="text-xs font-mono text-text-muted uppercase">Column Mapping</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {headers.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary truncate w-28 shrink-0" title={h}>{h}</span>
                      <span className="text-text-muted">→</span>
                      <select
                        value={mapping[i] || 'skip'}
                        onChange={(e) => setMapping(prev => ({ ...prev, [i]: e.target.value }))}
                        className={`flex-1 bg-bg-card border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent ${
                          mapping[i] && mapping[i] !== 'skip' ? 'text-accent' : 'text-text-muted'
                        }`}
                      >
                        {FIELD_DEFS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {mappedPreview.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-text-muted uppercase mb-2">Preview ({totalRows} rows total)</div>
                  <div className="overflow-x-auto bg-bg-card border border-border rounded">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          {Object.keys(mappedPreview[0]).slice(0, 6).map(k => (
                            <th key={k} className="px-2 py-1.5 text-left text-text-muted font-mono">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mappedPreview.map((row, i) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            {Object.values(row).slice(0, 6).map((v, j) => (
                              <td key={j} className="px-2 py-1.5 text-text-secondary truncate max-w-[150px]">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} disabled={totalRows === 0} className="flex-1 bg-accent text-bg-primary py-2.5 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  Next: Choose Import Target ({totalRows} rows)
                </button>
                <button onClick={() => setStep(1)} className="text-text-muted text-sm hover:text-text-secondary">Back</button>
              </div>
            </>
          )}

          {/* Step 3: Import Target */}
          {step === 3 && (
            <>
              <div className="text-xs font-mono text-text-muted uppercase mb-2">What should we import this data as?</div>
              <div className="space-y-2">
                {[
                  { id: 'deals', label: 'Deals + Contacts', desc: 'Create deals grouped by company, with contacts attached. Deduplicates by company name.', icon: '▤' },
                  { id: 'contacts', label: 'Contacts Only', desc: 'Add contacts to existing deals (matched by company name) or as standalone contacts.', icon: '👤' },
                  { id: 'activities', label: 'Notes / Activities', desc: 'Import as activity notes, matched to existing deals by company name.', icon: '📝' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setImportTarget(opt.id)}
                    className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
                      importTarget === opt.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30'
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <div>
                      <div className="text-sm text-text-primary font-medium">{opt.label}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-bg-card border border-border rounded p-3 text-xs text-text-muted">
                <strong className="text-text-secondary">{totalRows}</strong> rows will be processed.
                Existing deals are matched by company name (case-insensitive). Existing contacts are matched by email. Duplicates are skipped.
              </div>

              <div className="flex gap-3">
                <button onClick={handleImport} disabled={importing} className="flex-1 bg-accent text-bg-primary py-2.5 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  {importing ? 'Importing...' : `Import ${totalRows} Rows`}
                </button>
                <button onClick={() => setStep(2)} className="text-text-muted text-sm hover:text-text-secondary">Back</button>
              </div>
            </>
          )}

          {/* Step 4: Results */}
          {step === 4 && results && (
            <div className="text-center space-y-4">
              <div className="text-4xl">✅</div>
              <h3 className="text-lg font-semibold text-text-primary">Import Complete</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg-card border border-border rounded-lg p-3">
                  <div className="text-2xl font-mono font-bold text-accent">{results.deals}</div>
                  <div className="text-[10px] text-text-muted">Deals Created</div>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-3">
                  <div className="text-2xl font-mono font-bold text-success">{results.contacts}</div>
                  <div className="text-[10px] text-text-muted">Contacts Added</div>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-3">
                  <div className="text-2xl font-mono font-bold text-text-muted">{results.skipped}</div>
                  <div className="text-[10px] text-text-muted">Skipped (Dupes)</div>
                </div>
              </div>
              {results.activities > 0 && (
                <div className="text-sm text-text-secondary">{results.activities} activity notes imported</div>
              )}
              <button onClick={onClose} className="w-full bg-accent text-bg-primary py-2.5 rounded text-sm font-semibold hover:opacity-90">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
