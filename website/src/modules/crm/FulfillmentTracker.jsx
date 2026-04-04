import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classNames(...args) {
  return args.filter(Boolean).join(' ')
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isOverdue(rec) {
  if (rec.delivered) return false
  if (!rec.scheduled_date) return false
  return new Date(rec.scheduled_date) < new Date()
}

function deriveStatus(rec) {
  if (rec.delivered) return 'delivered'
  if (isOverdue(rec)) return 'overdue'
  return 'pending'
}

function statusBadge(status) {
  const map = {
    pending: 'bg-yellow-500/15 text-warning',
    delivered: 'bg-green-500/15 text-success',
    overdue: 'bg-red-500/15 text-danger',
  }
  return (
    <span className={classNames('text-xs font-mono px-2 py-0.5 rounded-full', map[status] || '')}>
      {status}
    </span>
  )
}

function progressBar(delivered, total) {
  const pct = total === 0 ? 0 : Math.round((delivered / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-bg-card rounded-full overflow-hidden">
        <div
          className={classNames(
            'h-full rounded-full transition-all',
            pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-yellow-500' : 'bg-red-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-text-muted whitespace-nowrap">
        {delivered}/{total} ({pct}%)
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HTML report generator
// ---------------------------------------------------------------------------

function generateReport(contracts, records) {
  const rows = contracts.map((c) => {
    const cRecs = records.filter((r) => r.contract_id === c.id)
    const delivered = cRecs.filter((r) => r.delivered).length
    return { brand: c.brand_name || c.deals?.brand_name || '—', total: cRecs.length, delivered }
  })

  const totalItems = rows.reduce((s, r) => s + r.total, 0)
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0)

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Fulfillment Report</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;color:#222}
  h1{font-size:1.4rem}
  table{width:100%;border-collapse:collapse;margin-top:1rem}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #ddd;font-size:.9rem}
  th{background:#f5f5f5;font-weight:600}
  .bar{height:8px;border-radius:4px;background:#eee;overflow:hidden;width:120px;display:inline-block}
  .bar-fill{height:100%;border-radius:4px;background:#22c55e}
  .summary{margin-top:1.5rem;padding:12px 16px;background:#f9fafb;border-radius:8px;font-size:.95rem}
</style></head><body>
<h1>Fulfillment Report</h1>
<p>Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
<table>
  <thead><tr><th>Brand / Contract</th><th>Delivered</th><th>Total</th><th>Progress</th></tr></thead>
  <tbody>
    ${rows
      .map(
        (r) => `<tr>
      <td>${r.brand}</td><td>${r.delivered}</td><td>${r.total}</td>
      <td><div class="bar"><div class="bar-fill" style="width:${r.total ? Math.round((r.delivered / r.total) * 100) : 0}%"></div></div></td>
    </tr>`,
      )
      .join('')}
  </tbody>
</table>
<div class="summary"><strong>Overall:</strong> ${totalDelivered} of ${totalItems} items delivered (${totalItems ? Math.round((totalDelivered / totalItems) * 100) : 0}%)</div>
</body></html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fulfillment-report-${new Date().toISOString().slice(0, 10)}.html`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LogoUpload({ deal, onUploaded }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `logos/${deal.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('uploads').upload(path, file)
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      const { error: dbErr } = await supabase
        .from('deals')
        .update({ logo_url: publicUrl })
        .eq('id', deal.id)
      if (dbErr) throw dbErr
      onUploaded(publicUrl)
    } catch (err) {
      console.error('Logo upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <label className="cursor-pointer text-xs text-accent hover:underline">
      {uploading ? 'Uploading...' : deal.logo_url ? 'Replace Logo' : 'Upload Logo'}
      <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
    </label>
  )
}

function MediaUpload({ recordId, onUploaded }) {
  const [uploading, setUploading] = useState(false)

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `fulfillment-media/${recordId}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('uploads').upload(path, file)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)
        const fileType = file.type.startsWith('video') ? 'video' : 'image'
        const { error: dbErr } = await supabase.from('fulfillment_media').insert({
          fulfillment_record_id: recordId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: fileType,
          notes: '',
        })
        if (dbErr) throw dbErr
      }
      onUploaded()
    } catch (err) {
      console.error('Media upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <label className="cursor-pointer text-xs text-accent hover:underline">
      {uploading ? 'Uploading...' : 'Add Proof'}
      <input
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFiles}
        disabled={uploading}
      />
    </label>
  )
}

function NotesEditor({ record, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(record.delivery_notes || '')

  async function save() {
    const { error } = await supabase
      .from('fulfillment_records')
      .update({ delivery_notes: text })
      .eq('id', record.id)
    if (!error) {
      onSaved()
      setEditing(false)
    }
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-xs text-text-muted hover:text-accent truncate max-w-[180px] text-left">
        {record.delivery_notes || 'Add note...'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary w-full"
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <button onClick={save} className="text-xs text-success whitespace-nowrap">Save</button>
      <button onClick={() => setEditing(false)} className="text-xs text-text-muted whitespace-nowrap">Cancel</button>
    </div>
  )
}

function MediaGallery({ media }) {
  if (!media?.length) return null
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {media.map((m) => (
        <a key={m.id} href={m.file_url} target="_blank" rel="noopener noreferrer" title={m.file_name}>
          {m.file_type === 'video' ? (
            <div className="w-16 h-16 rounded bg-bg-card border border-border flex items-center justify-center text-xs text-text-muted">
              Video
            </div>
          ) : (
            <img src={m.file_url} alt={m.file_name} className="w-16 h-16 rounded object-cover border border-border" />
          )}
        </a>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Record row (mobile-responsive)
// ---------------------------------------------------------------------------

function RecordRow({ rec, media, onToggle, onRefresh }) {
  const status = deriveStatus(rec)
  const benefitName = rec.contract_benefits?.name || rec.assets?.name || '—'
  const brandName = rec.deals?.brand_name || '—'

  return (
    <div className="border-b border-border last:border-0 px-3 py-3 sm:px-4 sm:py-3 hover:bg-bg-card/50 transition-colors">
      {/* Desktop layout */}
      <div className="hidden md:grid md:grid-cols-[1fr_1fr_0.7fr_0.5fr_1.2fr_auto] gap-3 items-center">
        <div className="flex items-center gap-2">
          {rec.deals?.logo_url && (
            <img src={rec.deals.logo_url} alt="" className="w-6 h-6 rounded object-contain" />
          )}
          <span className="text-text-primary text-sm truncate">{brandName}</span>
        </div>
        <span className="text-text-secondary text-xs font-mono truncate">{benefitName}</span>
        <span className="text-text-secondary text-xs font-mono">{fmtDate(rec.scheduled_date)}</span>
        {statusBadge(status)}
        <NotesEditor record={rec} onSaved={onRefresh} />
        <div className="flex items-center gap-3">
          <MediaUpload recordId={rec.id} onUploaded={onRefresh} />
          {!rec.delivered ? (
            <button onClick={() => onToggle(rec.id, true)} className="text-xs text-success hover:underline whitespace-nowrap">
              Mark Done
            </button>
          ) : (
            <button onClick={() => onToggle(rec.id, false)} className="text-xs text-text-muted hover:text-warning whitespace-nowrap">
              Undo
            </button>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {rec.deals?.logo_url && (
              <img src={rec.deals.logo_url} alt="" className="w-5 h-5 rounded object-contain" />
            )}
            <span className="text-text-primary text-sm font-medium">{brandName}</span>
          </div>
          {statusBadge(status)}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary font-mono">{benefitName}</span>
          <span className="text-text-muted font-mono">{fmtDate(rec.scheduled_date)}</span>
        </div>
        <NotesEditor record={rec} onSaved={onRefresh} />
        <div className="flex items-center gap-3">
          <MediaUpload recordId={rec.id} onUploaded={onRefresh} />
          {!rec.delivered ? (
            <button onClick={() => onToggle(rec.id, true)} className="text-xs text-success hover:underline">
              Mark Done
            </button>
          ) : (
            <button onClick={() => onToggle(rec.id, false)} className="text-xs text-text-muted hover:text-warning">
              Undo
            </button>
          )}
        </div>
      </div>

      <MediaGallery media={media} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FulfillmentTracker() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSport, setFilterSport] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [expandedContract, setExpandedContract] = useState(null)

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  // Signed contracts with benefits
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['fulfillment-contracts', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, deals(id, brand_name, logo_url, sport, property_id), contract_benefits(*)')
        .eq('status', 'Signed')
        .eq('deals.property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data?.filter((c) => c.deals) || []
    },
    enabled: !!propertyId,
  })

  // Fulfillment records
  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['fulfillment-records', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fulfillment_records')
        .select('*, deals(id, brand_name, logo_url, sport, property_id), assets(name, category), contract_benefits(name, type)')
        .eq('deals.property_id', propertyId)
        .order('scheduled_date')
      if (error) throw error
      return data?.filter((r) => r.deals) || []
    },
    enabled: !!propertyId,
  })

  // Media for all records
  const recordIds = records.map((r) => r.id)
  const { data: allMedia = [] } = useQuery({
    queryKey: ['fulfillment-media', recordIds],
    queryFn: async () => {
      if (!recordIds.length) return []
      const { data, error } = await supabase
        .from('fulfillment_media')
        .select('*')
        .in('fulfillment_record_id', recordIds)
      if (error) throw error
      return data || []
    },
    enabled: recordIds.length > 0,
  })

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['fulfillment-records', propertyId] })
    queryClient.invalidateQueries({ queryKey: ['fulfillment-contracts', propertyId] })
  }

  // Auto-populate from signed contracts
  const autoPopulateMutation = useMutation({
    mutationFn: async () => {
      let created = 0
      for (const contract of contracts) {
        const benefits = contract.contract_benefits || []
        for (const benefit of benefits) {
          // Check if a record already exists for this contract + benefit
          const exists = records.some(
            (r) => r.contract_id === contract.id && r.benefit_id === benefit.id,
          )
          if (exists) continue
          const { error } = await supabase.from('fulfillment_records').insert({
            deal_id: contract.deal_id || contract.deals?.id,
            contract_id: contract.id,
            benefit_id: benefit.id,
            scheduled_date: benefit.scheduled_date || null,
            delivered: false,
            delivery_notes: '',
            auto_generated: true,
          })
          if (error) throw error
          created++
        }
      }
      return created
    },
    onSuccess: (count) => {
      invalidateAll()
      toast({ title: `${count} fulfillment record${count !== 1 ? 's' : ''} created`, type: 'success' })
    },
    onError: (err) => toast({ title: 'Error populating records', description: err.message, type: 'error' }),
  })

  // Toggle delivered
  const toggleMutation = useMutation({
    mutationFn: async ({ id, delivered }) => {
      const updates = { delivered }
      if (delivered) updates.delivery_date = new Date().toISOString().slice(0, 10)
      const { error } = await supabase.from('fulfillment_records').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidateAll()
      queryClient.invalidateQueries({ queryKey: ['fulfillment-media'] })
    },
    onError: (err) => toast({ title: 'Error updating record', description: err.message, type: 'error' }),
  })

  // Logo upload callback
  function handleLogoUploaded() {
    invalidateAll()
    toast({ title: 'Logo uploaded', type: 'success' })
  }

  function handleRefresh() {
    invalidateAll()
    queryClient.invalidateQueries({ queryKey: ['fulfillment-media'] })
  }

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const sports = useMemo(() => {
    const set = new Set(records.map((r) => r.deals?.sport).filter(Boolean))
    return Array.from(set).sort()
  }, [records])

  const benefitTypes = useMemo(() => {
    const set = new Set(
      records
        .map((r) => r.contract_benefits?.type || r.assets?.category)
        .filter(Boolean),
    )
    return Array.from(set).sort()
  }, [records])

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const status = deriveStatus(r)
      if (filterStatus !== 'all' && status !== filterStatus) return false
      if (filterSport !== 'all' && r.deals?.sport !== filterSport) return false
      const type = r.contract_benefits?.type || r.assets?.category || ''
      if (filterType !== 'all' && type !== filterType) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const brand = (r.deals?.brand_name || '').toLowerCase()
        const name = (r.contract_benefits?.name || r.assets?.name || '').toLowerCase()
        if (!brand.includes(term) && !name.includes(term)) return false
      }
      return true
    })
  }, [records, filterStatus, filterSport, filterType, searchTerm])

  // Per-contract progress
  const contractProgress = useMemo(() => {
    const map = {}
    for (const c of contracts) {
      const cRecs = records.filter((r) => r.contract_id === c.id)
      map[c.id] = {
        total: cRecs.length,
        delivered: cRecs.filter((r) => r.delivered).length,
      }
    }
    return map
  }, [contracts, records])

  const totalPending = records.filter((r) => !r.delivered).length
  const totalDelivered = records.filter((r) => r.delivered).length
  const totalOverdue = records.filter((r) => isOverdue(r)).length
  const isLoading = loadingContracts || loadingRecords

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Fulfillment Tracker</h1>
          <p className="text-text-secondary text-sm mt-1">
            {totalPending} pending &middot; {totalDelivered} delivered
            {totalOverdue > 0 && (
              <span className="text-danger"> &middot; {totalOverdue} overdue</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => autoPopulateMutation.mutate()}
            disabled={autoPopulateMutation.isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {autoPopulateMutation.isPending ? 'Syncing...' : 'Sync from Contracts'}
          </button>
          <button
            onClick={() => generateReport(contracts, records)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-primary hover:bg-bg-card transition-colors"
          >
            Generate Fulfillment Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <input
          type="text"
          placeholder="Search deal name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="col-span-2 sm:col-span-1 bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="delivered">Delivered</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          value={filterSport}
          onChange={(e) => setFilterSport(e.target.value)}
          className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="all">All Sports</option>
          {sports.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="all">All Types</option>
          {benefitTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Contract satisfaction progress */}
          {contracts.length > 0 && (
            <div>
              <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Contract Satisfaction</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {contracts.map((c) => {
                  const prog = contractProgress[c.id] || { total: 0, delivered: 0 }
                  const isExpanded = expandedContract === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setExpandedContract(isExpanded ? null : c.id)}
                      className="bg-bg-surface border border-border rounded-lg p-3 sm:p-4 text-left hover:border-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {c.deals?.logo_url && (
                            <img src={c.deals.logo_url} alt="" className="w-6 h-6 rounded object-contain flex-shrink-0" />
                          )}
                          <span className="text-sm text-text-primary font-medium truncate">
                            {c.brand_name || c.deals?.brand_name}
                          </span>
                        </div>
                        <LogoUpload
                          deal={c.deals || { id: c.deal_id }}
                          onUploaded={handleLogoUploaded}
                        />
                      </div>
                      {progressBar(prog.delivered, prog.total)}
                      {isExpanded && prog.total > 0 && (
                        <div className="mt-3 pt-3 border-t border-border space-y-1">
                          {records
                            .filter((r) => r.contract_id === c.id)
                            .map((r) => (
                              <div key={r.id} className="flex items-center justify-between text-xs">
                                <span className="text-text-secondary truncate mr-2">
                                  {r.contract_benefits?.name || r.assets?.name || '—'}
                                </span>
                                {statusBadge(deriveStatus(r))}
                              </div>
                            ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Fulfillment records */}
          <div>
            <h2 className="text-sm font-mono text-text-muted uppercase mb-3">
              Fulfillment Items ({filteredRecords.length})
            </h2>

            {filteredRecords.length === 0 ? (
              <div className="bg-bg-surface border border-border rounded-lg p-8 text-center">
                <p className="text-text-muted text-sm">
                  {records.length === 0
                    ? 'No fulfillment records yet. Click "Sync from Contracts" to auto-populate from signed contracts.'
                    : 'No records match your filters.'}
                </p>
              </div>
            ) : (
              <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
                {/* Desktop header */}
                <div className="hidden md:grid md:grid-cols-[1fr_1fr_0.7fr_0.5fr_1.2fr_auto] gap-3 px-4 py-2 border-b border-border">
                  <span className="text-xs text-text-muted font-mono">Brand</span>
                  <span className="text-xs text-text-muted font-mono">Asset / Benefit</span>
                  <span className="text-xs text-text-muted font-mono">Date</span>
                  <span className="text-xs text-text-muted font-mono">Status</span>
                  <span className="text-xs text-text-muted font-mono">Notes</span>
                  <span className="text-xs text-text-muted font-mono">Actions</span>
                </div>

                {filteredRecords.map((rec) => (
                  <RecordRow
                    key={rec.id}
                    rec={rec}
                    media={allMedia.filter((m) => m.fulfillment_record_id === rec.id)}
                    onToggle={(id, delivered) => toggleMutation.mutate({ id, delivered })}
                    onRefresh={handleRefresh}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
