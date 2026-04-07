import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cx(...args) {
  return args.filter(Boolean).join(' ')
}

function fmtDate(d) {
  if (!d) return '\u2014'
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

const STATUS_STYLES = {
  pending: 'bg-yellow-500/15 text-warning',
  delivered: 'bg-green-500/15 text-success',
  overdue: 'bg-red-500/15 text-danger',
}

function StatusBadge({ status }) {
  return (
    <span className={cx('text-xs font-mono px-2 py-0.5 rounded-full', STATUS_STYLES[status] || '')}>
      {status}
    </span>
  )
}

function ProgressBar({ delivered, total }) {
  const pct = total === 0 ? 0 : Math.round((delivered / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-bg-card rounded-full overflow-hidden">
        <div
          className={cx(
            'h-full rounded-full transition-all',
            pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-yellow-500' : 'bg-red-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-text-primary whitespace-nowrap">
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
    const overdue = cRecs.filter((r) => isOverdue(r)).length
    return {
      brand: c.deals?.brand_name || '\u2014',
      total: cRecs.length,
      delivered,
      overdue,
      benefits: cRecs.map((r) => ({
        name: r.contract_benefits?.name || r.assets?.name || '\u2014',
        category: r.contract_benefits?.type || r.assets?.category || '\u2014',
        status: deriveStatus(r),
        scheduledDate: r.scheduled_date,
        deliveryDate: r.delivery_date,
        notes: r.delivery_notes || '',
      })),
    }
  })

  const totalItems = rows.reduce((s, r) => s + r.total, 0)
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0)
  const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0)

  const statusColor = (st) =>
    st === 'delivered' ? '#22c55e' : st === 'overdue' ? '#ef4444' : '#eab308'

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fulfillment Report</title>
<style>
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:40px auto;color:#1a1a2e;padding:0 16px;background:#fafafa}
  h1{font-size:1.5rem;margin-bottom:4px}
  h2{font-size:1.1rem;margin:2rem 0 .5rem;border-bottom:2px solid #e5e7eb;padding-bottom:6px}
  .meta{color:#6b7280;font-size:.85rem;margin-bottom:1.5rem}
  .summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:2rem}
  .stat{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center}
  .stat-value{font-size:1.8rem;font-weight:700}
  .stat-label{font-size:.8rem;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}
  .contract-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:16px}
  .contract-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
  .brand-name{font-weight:600;font-size:1rem}
  .bar{height:8px;border-radius:4px;background:#e5e7eb;overflow:hidden;width:100%;margin:8px 0}
  .bar-fill{height:100%;border-radius:4px;background:#22c55e}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:.85rem}
  th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #f0f0f0}
  th{color:#6b7280;font-weight:600;font-size:.75rem;text-transform:uppercase}
  .status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
  .footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;font-size:.8rem;color:#9ca3af;text-align:center}
  @media(max-width:600px){.summary-grid{grid-template-columns:1fr 1fr}table{font-size:.75rem}th,td{padding:4px 6px}}
</style></head><body>
<h1>Fulfillment Summary Report</h1>
<p class="meta">Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>

<div class="summary-grid">
  <div class="stat"><div class="stat-value">${totalItems}</div><div class="stat-label">Total Items</div></div>
  <div class="stat"><div class="stat-value" style="color:#22c55e">${totalDelivered}</div><div class="stat-label">Delivered</div></div>
  <div class="stat"><div class="stat-value" style="color:#eab308">${totalItems - totalDelivered - totalOverdue}</div><div class="stat-label">Pending</div></div>
  <div class="stat"><div class="stat-value" style="color:#ef4444">${totalOverdue}</div><div class="stat-label">Overdue</div></div>
</div>

<h2>By Contract</h2>
${rows
  .map(
    (r) => `<div class="contract-card">
  <div class="contract-header">
    <span class="brand-name">${r.brand}</span>
    <span style="font-size:.85rem;color:#6b7280">${r.delivered}/${r.total} delivered</span>
  </div>
  <div class="bar"><div class="bar-fill" style="width:${r.total ? Math.round((r.delivered / r.total) * 100) : 0}%"></div></div>
  ${
    r.benefits.length
      ? `<table><thead><tr><th>Benefit</th><th>Category</th><th>Status</th><th>Scheduled</th><th>Notes</th></tr></thead><tbody>${r.benefits
          .map(
            (b) =>
              `<tr><td>${b.name}</td><td>${b.category}</td><td><span class="status-dot" style="background:${statusColor(b.status)}"></span>${b.status}</td><td>${b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString() : '\u2014'}</td><td>${b.notes}</td></tr>`,
          )
          .join('')}</tbody></table>`
      : ''
  }
</div>`,
  )
  .join('')}

<div class="footer">Rally Fulfillment Report &middot; ${new Date().getFullYear()}</div>
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

function DeliveryNotesEditor({ record, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(record.delivery_notes || '')
  const inputRef = useRef(null)

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
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-text-primary hover:text-accent truncate max-w-[200px] text-left"
      >
        {record.delivery_notes || 'Add note...'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary w-full focus:outline-none focus:border-accent"
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <button onClick={save} className="text-xs text-success whitespace-nowrap font-medium">
        Save
      </button>
      <button onClick={() => setEditing(false)} className="text-xs text-text-primary whitespace-nowrap">
        Cancel
      </button>
    </div>
  )
}

function MarkDeliveredButton({ record, onToggle }) {
  if (!record.delivered) {
    return (
      <button
        onClick={() => onToggle(record.id, true)}
        className="text-xs font-medium text-success hover:underline whitespace-nowrap"
      >
        Mark Delivered
      </button>
    )
  }
  return (
    <button
      onClick={() => onToggle(record.id, false)}
      className="text-xs text-text-primary hover:text-warning whitespace-nowrap"
    >
      Undo
    </button>
  )
}

// ---------------------------------------------------------------------------
// Record row -- responsive with sm:/md: breakpoints
// ---------------------------------------------------------------------------

function RecordRow({ rec, onToggle, onRefresh }) {
  const status = deriveStatus(rec)
  const benefitName = rec.contract_benefits?.name || rec.assets?.name || '\u2014'
  const category = rec.contract_benefits?.type || rec.assets?.category || '\u2014'
  const brandName = rec.deals?.brand_name || '\u2014'

  return (
    <div className="border-b border-border last:border-0 px-3 py-3 sm:px-4 sm:py-3 hover:bg-bg-card/50 transition-colors">
      {/* Desktop layout */}
      <div className="hidden md:grid md:grid-cols-[1.2fr_1.2fr_0.8fr_0.6fr_0.5fr_1fr_auto] gap-3 items-center">
        <span className="text-text-primary text-sm truncate">{brandName}</span>
        <span className="text-text-primary text-xs font-mono truncate">{benefitName}</span>
        <span className="text-text-primary text-xs font-mono">{category}</span>
        <span className="text-text-primary text-xs font-mono">{fmtDate(rec.scheduled_date)}</span>
        <StatusBadge status={status} />
        <DeliveryNotesEditor record={rec} onSaved={onRefresh} />
        <MarkDeliveredButton record={rec} onToggle={onToggle} />
      </div>

      {/* Tablet layout */}
      <div className="hidden sm:block md:hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-text-primary text-sm font-medium truncate">{brandName}</span>
          <StatusBadge status={status} />
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <span className="text-text-primary font-mono truncate">{benefitName}</span>
          <span className="text-text-primary font-mono text-right">{category}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-primary text-xs font-mono">{fmtDate(rec.scheduled_date)}</span>
          <div className="flex items-center gap-3">
            <DeliveryNotesEditor record={rec} onSaved={onRefresh} />
            <MarkDeliveredButton record={rec} onToggle={onToggle} />
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-text-primary text-sm font-medium truncate max-w-[60%]">{brandName}</span>
          <StatusBadge status={status} />
        </div>
        <p className="text-text-primary text-xs font-mono truncate">{benefitName}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-primary font-mono">{category}</span>
          <span className="text-text-primary font-mono">{fmtDate(rec.scheduled_date)}</span>
        </div>
        <DeliveryNotesEditor record={rec} onSaved={onRefresh} />
        <div className="flex items-center justify-end">
          <MarkDeliveredButton record={rec} onToggle={onToggle} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contract progress card
// ---------------------------------------------------------------------------

function ContractCard({ contract, records, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const cRecs = records.filter((r) => r.contract_id === contract.id)
  const delivered = cRecs.filter((r) => r.delivered).length
  const total = cRecs.length

  return (
    <div
      className="bg-bg-surface border border-border rounded-lg p-3 sm:p-4 hover:border-accent/50 transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-primary font-medium truncate">
          {contract.deals?.brand_name || '\u2014'}
        </span>
        <span className="text-xs text-text-primary font-mono ml-2 flex-shrink-0">
          {delivered}/{total}
        </span>
      </div>
      <ProgressBar delivered={delivered} total={total} />
      {expanded && total > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          {cRecs.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs gap-2">
              <span className="text-text-primary truncate">
                {r.contract_benefits?.name || r.assets?.name || '\u2014'}
              </span>
              <StatusBadge status={deriveStatus(r)} />
            </div>
          ))}
        </div>
      )}
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
  const reportBtnRef = useRef(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAssetType, setFilterAssetType] = useState('all')

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  // All contracts with benefits (not just Signed — show everything so users can track)
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['fulfillment-contracts', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, deals(id, brand_name, logo_url), contract_benefits(*)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) { console.error('Fulfillment contracts query error:', error); return [] }
      return data || []
    },
    enabled: !!propertyId,
  })

  // Fulfillment records
  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['fulfillment-records', propertyId],
    queryFn: async () => {
      // Get contract IDs for this property to include deal-less fulfillment records
      const contractIds = contracts.map(c => c.id).filter(Boolean)
      const { data, error } = await supabase
        .from('fulfillment_records')
        .select('*, deals(id, brand_name, logo_url), contracts(brand_name, status, property_id)')
        .order('scheduled_date')
      if (error) { console.error('Fulfillment records query error:', error); return [] }
      // Filter to this property's records: has a deal OR belongs to a contract from this property
      return (data || []).filter(r => r.deals?.id || r.deal_id || contractIds.includes(r.contract_id))
    },
    enabled: !!propertyId && !loadingContracts,
  })

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['fulfillment-records', propertyId] })
    queryClient.invalidateQueries({ queryKey: ['fulfillment-contracts', propertyId] })
  }

  // Auto-populate from signed/final contracts
  const autoPopulateMutation = useMutation({
    mutationFn: async () => {
      let created = 0
      for (const contract of contracts) {
        const benefits = contract.contract_benefits || []
        for (const benefit of benefits) {
          const exists = records.some(
            (r) => r.contract_id === contract.id && r.benefit_id === benefit.id,
          )
          if (exists) continue
          const { error } = await supabase.from('fulfillment_records').insert({
            deal_id: contract.deal_id || contract.deals?.id || null,
            contract_id: contract.id,
            benefit_id: benefit.id,
            scheduled_date: contract.effective_date || null,
            delivered: false,
            delivery_notes: '',
            auto_generated: true,
          })
          if (error) { console.warn('Fulfillment insert error:', error.message); continue }
          created++
        }
      }
      return created
    },
    onSuccess: (count) => {
      invalidateAll()
      toast({
        title: count > 0
          ? `${count} fulfillment record${count !== 1 ? 's' : ''} created`
          : 'All records are already synced',
        type: 'success',
      })
    },
    onError: (err) =>
      toast({ title: 'Error populating records', description: err.message, type: 'error' }),
  })

  // Toggle delivered status with notes
  const toggleMutation = useMutation({
    mutationFn: async ({ id, delivered }) => {
      const updates = { delivered }
      if (delivered) {
        updates.delivery_date = new Date().toISOString().slice(0, 10)
      } else {
        updates.delivery_date = null
      }
      const { error } = await supabase.from('fulfillment_records').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateAll(),
    onError: (err) =>
      toast({ title: 'Error updating record', description: err.message, type: 'error' }),
  })

  function handleRefresh() {
    invalidateAll()
  }

  // -----------------------------------------------------------------------
  // Derived / filtered data
  // -----------------------------------------------------------------------

  const assetTypes = (() => {
    const set = new Set(
      records
        .map((r) => r.contract_benefits?.type || r.assets?.category)
        .filter(Boolean),
    )
    return Array.from(set).sort()
  })()

  const filteredRecords = records.filter((r) => {
    const status = deriveStatus(r)
    if (filterStatus !== 'all' && status !== filterStatus) return false
    const type = r.contract_benefits?.type || r.assets?.category || ''
    if (filterAssetType !== 'all' && type !== filterAssetType) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const brand = (r.deals?.brand_name || '').toLowerCase()
      const name = (r.contract_benefits?.name || r.assets?.name || '').toLowerCase()
      if (!brand.includes(term) && !name.includes(term)) return false
    }
    return true
  })

  const totalPending = records.filter((r) => deriveStatus(r) === 'pending').length
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
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
            Fulfillment Tracker
          </h1>
          <p className="text-text-primary text-sm mt-1">
            <span className="text-warning">{totalPending} pending</span>
            {' \u00B7 '}
            <span className="text-success">{totalDelivered} delivered</span>
            {totalOverdue > 0 && (
              <>
                {' \u00B7 '}
                <span className="text-danger">{totalOverdue} overdue</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => autoPopulateMutation.mutate()}
            disabled={autoPopulateMutation.isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {autoPopulateMutation.isPending ? 'Syncing...' : 'Sync from Contracts'}
          </button>
          <button
            ref={reportBtnRef}
            onClick={() => generateReport(contracts, records)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-text-primary hover:bg-bg-card transition-colors"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <input
          type="text"
          placeholder="Search deal or brand name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-primary/40 focus:outline-none focus:border-accent"
        />
        <select
          value={filterAssetType}
          onChange={(e) => setFilterAssetType(e.target.value)}
          className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="all">All Asset Types</option>
          {assetTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Contract progress bars */}
          {contracts.length > 0 && (
            <div>
              <h2 className="text-sm font-mono text-text-primary uppercase tracking-wider mb-3">
                Contract Progress
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {contracts.map((c) => (
                  <ContractCard
                    key={c.id}
                    contract={c}
                    records={records}
                    onRefresh={handleRefresh}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Fulfillment items list */}
          <div>
            <h2 className="text-sm font-mono text-text-primary uppercase tracking-wider mb-3">
              Fulfillment Items ({filteredRecords.length})
            </h2>

            {filteredRecords.length === 0 ? (
              <div className="bg-bg-surface border border-border rounded-lg p-6 sm:p-8 text-center">
                <p className="text-text-primary text-sm">
                  {records.length === 0
                    ? 'No fulfillment records yet. Click "Sync from Contracts" to auto-populate from signed contracts.'
                    : 'No records match your current filters.'}
                </p>
              </div>
            ) : (
              <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
                {/* Desktop table header */}
                <div className="hidden md:grid md:grid-cols-[1.2fr_1.2fr_0.8fr_0.6fr_0.5fr_1fr_auto] gap-3 px-4 py-2 border-b border-border bg-bg-card">
                  <span className="text-xs text-text-primary font-mono">Brand</span>
                  <span className="text-xs text-text-primary font-mono">Benefit</span>
                  <span className="text-xs text-text-primary font-mono">Category</span>
                  <span className="text-xs text-text-primary font-mono">Date</span>
                  <span className="text-xs text-text-primary font-mono">Status</span>
                  <span className="text-xs text-text-primary font-mono">Notes</span>
                  <span className="text-xs text-text-primary font-mono">Action</span>
                </div>

                {filteredRecords.map((rec) => (
                  <RecordRow
                    key={rec.id}
                    rec={rec}
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
