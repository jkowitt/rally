import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const DEAL_FIELDS = [
  { key: 'brand_name', label: 'Company / Brand Name', required: true },
  { key: 'full_name', label: 'Full Name' },
  { key: 'contact_first_name', label: 'First Name' },
  { key: 'contact_last_name', label: 'Last Name' },
  { key: 'contact_email', label: 'Email' },
  { key: 'contact_phone', label: 'Phone' },
  { key: 'contact_position', label: 'Title / Position' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'value', label: 'Deal Value ($)' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'website', label: 'Website' },
  { key: 'sub_industry', label: 'Industry' },
  { key: 'skip', label: '— Skip this column —' },
]

// Fuzzy column matcher — recognizes many variations
function matchColumn(header) {
  const h = header.toLowerCase().trim()
  const rules = [
    { key: 'brand_name', patterns: ['company', 'brand', 'organization', 'org', 'employer', 'business', 'account'] },
    { key: 'full_name', patterns: ['full name', 'name', 'contact name', 'person'] },
    { key: 'contact_first_name', patterns: ['first name', 'first', 'firstname', 'given name', 'given'] },
    { key: 'contact_last_name', patterns: ['last name', 'last', 'lastname', 'surname', 'family name', 'family'] },
    { key: 'contact_email', patterns: ['email', 'e-mail', 'mail', 'email address'] },
    { key: 'contact_phone', patterns: ['phone', 'telephone', 'mobile', 'cell', 'direct', 'phone number', 'tel'] },
    { key: 'contact_position', patterns: ['title', 'position', 'role', 'job title', 'job', 'designation'] },
    { key: 'linkedin', patterns: ['linkedin', 'linked in', 'linkedin url', 'linkedin profile', 'li url', 'li profile'] },
    { key: 'value', patterns: ['value', 'amount', 'revenue', 'deal value', 'price', 'budget', 'annual revenue'] },
    { key: 'city', patterns: ['city', 'town', 'location'] },
    { key: 'state', patterns: ['state', 'province', 'region', 'st'] },
    { key: 'website', patterns: ['website', 'url', 'web', 'site', 'domain', 'company website'] },
    { key: 'sub_industry', patterns: ['industry', 'sector', 'category', 'sub-industry', 'sub industry', 'vertical'] },
    { key: 'source', patterns: ['source', 'lead source', 'referral', 'origin'] },
    { key: 'notes', patterns: ['notes', 'note', 'comments', 'description', 'memo'] },
  ]
  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      if (h === pattern || h.includes(pattern)) return rule.key
    }
  }
  return 'skip'
}

export default function CSVImportWizard({ onClose, onImported }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const fileRef = useRef(null)
  const [step, setStep] = useState(1)
  const [rawData, setRawData] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [importCount, setImportCount] = useState(0)
  const [importStats, setImportStats] = useState({ deals: 0, contacts: 0, skipped: 0 })

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
      // Auto-map using fuzzy matcher
      const autoMap = {}
      h.forEach((header, i) => { autoMap[i] = matchColumn(header) })
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
        if (field && field !== 'skip') mapped[field] = row[h]
      })
      // Handle full_name → split into first/last
      if (mapped.full_name && !mapped.contact_first_name) {
        const parts = mapped.full_name.trim().split(/\s+/)
        mapped.contact_first_name = parts[0] || ''
        mapped.contact_last_name = parts.slice(1).join(' ') || ''
      }
      return mapped
    }).filter(r => r.brand_name || r.contact_first_name || r.contact_email)
  }

  // Group by company — multiple contacts at same company become one deal
  function getGroupedData() {
    const data = getMappedData()
    const groups = new Map()
    for (const row of data) {
      const key = (row.brand_name || '').toLowerCase().trim()
      if (!key) continue
      if (!groups.has(key)) {
        groups.set(key, {
          brand_name: row.brand_name,
          city: row.city,
          state: row.state,
          website: row.website,
          linkedin: row.linkedin,
          sub_industry: row.sub_industry,
          value: row.value,
          source: row.source,
          notes: row.notes,
          contacts: [],
        })
      }
      const group = groups.get(key)
      // Merge company-level fields from subsequent rows
      if (row.city && !group.city) group.city = row.city
      if (row.state && !group.state) group.state = row.state
      if (row.website && !group.website) group.website = row.website
      if (row.sub_industry && !group.sub_industry) group.sub_industry = row.sub_industry
      if (row.value && !group.value) group.value = row.value
      // Add contact if has name or email
      if (row.contact_first_name || row.contact_last_name || row.contact_email) {
        group.contacts.push({
          first_name: row.contact_first_name || '',
          last_name: row.contact_last_name || '',
          email: row.contact_email || '',
          phone: row.contact_phone || '',
          position: row.contact_position || '',
          linkedin: row.linkedin || '',
        })
      }
    }
    return Array.from(groups.values())
  }

  async function handleImport() {
    const groups = getGroupedData()
    if (!groups.length) return
    setImporting(true)
    setStep(4)
    let dealCount = 0, contactCount = 0, skipped = 0

    for (const group of groups) {
      // Check if deal already exists by brand_name
      const { data: existing } = await supabase
        .from('deals')
        .select('id')
        .eq('property_id', propertyId)
        .ilike('brand_name', group.brand_name.trim())
        .limit(1)

      let dealId
      if (existing?.length > 0) {
        // Deal exists — just add contacts
        dealId = existing[0].id
        skipped++
      } else {
        // Create new deal
        const deal = {
          property_id: propertyId,
          brand_name: group.brand_name,
          contact_first_name: group.contacts[0]?.first_name || null,
          contact_last_name: group.contacts[0]?.last_name || null,
          contact_name: [group.contacts[0]?.first_name, group.contacts[0]?.last_name].filter(Boolean).join(' ') || null,
          contact_email: group.contacts[0]?.email || null,
          contact_phone: group.contacts[0]?.phone || null,
          contact_position: group.contacts[0]?.position || null,
          stage: 'Prospect',
          date_added: new Date().toISOString().split('T')[0],
          source: group.source || 'Other',
          notes: group.notes || null,
        }
        const extras = {}
        if (group.city) extras.city = group.city
        if (group.state) extras.state = group.state
        if (group.website) extras.website = group.website
        if (group.linkedin) extras.linkedin = group.linkedin
        if (group.sub_industry) extras.sub_industry = group.sub_industry
        if (group.value) extras.value = Number(String(group.value).replace(/[$,\s]/g, '')) || null

        const { data: newDeal, error } = await supabase.from('deals').insert({ ...deal, ...extras }).select('id').single()
        if (error) {
          const { data: fallback } = await supabase.from('deals').insert(deal).select('id').single()
          dealId = fallback?.id
        } else {
          dealId = newDeal.id
        }
        if (dealId) dealCount++
      }

      // Add contacts to the deal
      if (dealId && group.contacts.length > 0) {
        for (const c of group.contacts) {
          if (!c.first_name && !c.email) continue
          // Check for duplicate contact
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('deal_id', dealId)
            .eq('email', c.email || '__none__')
            .limit(1)
          if (existingContact?.length > 0) continue

          try {
            await supabase.from('contacts').insert({
              property_id: propertyId,
              deal_id: dealId,
              first_name: c.first_name || '',
              last_name: c.last_name || null,
              email: c.email || null,
              phone: c.phone || null,
              position: c.position || null,
              company: group.brand_name,
              linkedin: c.linkedin || null,
              is_primary: group.contacts.indexOf(c) === 0,
            })
            contactCount++
          } catch (e) { console.warn(e) }
        }
      }

      setImportCount(dealCount + skipped)
      setImportStats({ deals: dealCount, contacts: contactCount, skipped })
    }

    toast({ title: `${dealCount} new deals, ${contactCount} contacts, ${skipped} existing updated`, type: 'success' })
    onImported?.(dealCount)
    setImporting(false)
  }

  const grouped = step >= 3 ? getGroupedData() : []

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-text-primary">Import CSV</h2>
            <p className="text-[10px] sm:text-xs text-text-muted">Step {step} of 4 &middot; Auto-groups contacts by company &middot; Skips duplicates</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">📄</div>
              <p className="text-sm text-text-secondary mb-2">Upload a CSV with your prospect data</p>
              <p className="text-xs text-text-muted mb-4">Columns are auto-detected. Multiple contacts at the same company are grouped into one deal.</p>
              <button onClick={() => fileRef.current?.click()} className="bg-accent text-bg-primary px-6 py-2.5 rounded text-sm font-medium hover:opacity-90">
                Choose CSV File
              </button>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
            </div>
          )}

          {/* Step 2: Map columns */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">Columns auto-matched. Adjust if needed. "Full Name" will be split into first/last automatically.</p>
              {headers.map((header, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-text-primary font-mono w-1/3 truncate" title={header}>{header}</span>
                  <span className="text-text-muted text-xs">&rarr;</span>
                  <select
                    value={mapping[i] || 'skip'}
                    onChange={(e) => setMapping({ ...mapping, [i]: e.target.value })}
                    className={`flex-1 bg-bg-card border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent ${
                      mapping[i] === 'skip' ? 'border-border text-text-muted' : 'border-accent/50'
                    }`}
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

          {/* Step 3: Preview — grouped by company */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted">{grouped.length} companies, {grouped.reduce((s, g) => s + g.contacts.length, 0)} contacts</p>
                <span className="text-[10px] text-accent font-mono">Grouped by company</span>
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {grouped.slice(0, 20).map((g, i) => (
                  <div key={i} className="bg-bg-card border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-primary font-medium">{g.brand_name}</span>
                      <span className="text-[10px] text-text-muted font-mono">{g.contacts.length} contact{g.contacts.length !== 1 ? 's' : ''}</span>
                    </div>
                    {g.contacts.slice(0, 3).map((c, ci) => (
                      <div key={ci} className="text-xs text-text-muted mt-1">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ')} {c.position && `— ${c.position}`} {c.email && `(${c.email})`}
                      </div>
                    ))}
                    {g.contacts.length > 3 && <div className="text-[10px] text-text-muted mt-1">+{g.contacts.length - 3} more</div>}
                  </div>
                ))}
                {grouped.length > 20 && <div className="text-xs text-text-muted text-center">+{grouped.length - 20} more companies</div>}
              </div>
              <div className="flex gap-3 pt-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm">Back</button>
                <button onClick={handleImport} className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90">
                  Import {grouped.length} Companies
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
                  <p className="text-sm text-text-muted">Importing... {importCount} of {getGroupedData().length} companies</p>
                  <div className="w-48 mx-auto bg-bg-card rounded-full h-1.5 mt-3">
                    <div className="bg-accent rounded-full h-1.5 transition-all" style={{ width: `${(importCount / (getGroupedData().length || 1)) * 100}%` }} />
                  </div>
                  <div className="text-[10px] text-text-muted mt-2 font-mono">
                    {importStats.deals} new &middot; {importStats.contacts} contacts &middot; {importStats.skipped} existing
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-3">✅</div>
                  <p className="text-sm text-text-primary font-medium">Import complete!</p>
                  <div className="text-xs text-text-muted mt-2 space-y-0.5">
                    <div>{importStats.deals} new deals created</div>
                    <div>{importStats.contacts} contacts added</div>
                    {importStats.skipped > 0 && <div>{importStats.skipped} existing companies updated with new contacts</div>}
                  </div>
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
