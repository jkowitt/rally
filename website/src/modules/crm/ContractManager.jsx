import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { humanError } from '@/lib/humanError'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Badge, EmptyState, Button } from '@/components/ui'
import { FileText, Upload, Download, Trash2, X } from 'lucide-react'
import { on } from '@/lib/appEvents'

// Contract Manager — file storage only. Drop a PDF (or DOCX, image,
// scan), pick the deal it goes with, fill in a few fields, save.
// No AI extraction, no benefit parsing, no fulfillment sync — those
// surfaces were doing more harm than good for a launch product.
// Files live in the existing pdf_file_data column (base64 text) so
// no schema migration is needed; users get list / view / download /
// delete and that's it.

const STATUS_TONE = {
  Draft: 'neutral',
  'In Review': 'warning',
  Final: 'accent',
  Signed: 'success',
  Expired: 'danger',
  active: 'success',
}

const STATUS_OPTIONS = ['Draft', 'In Review', 'Final', 'Signed', 'Expired']

export default function ContractManager() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [showUpload, setShowUpload] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)

  // Command-palette deep link
  useEffect(() => on('open-upload-contract', () => setShowUpload(true)), [])

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, brand_name, status, effective_date, expiration_date, total_value, signed, pdf_file_name, pdf_file_data, created_at, deal_id, deals(brand_name)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: deals } = useQuery({
    queryKey: ['deals-list', propertyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('id, brand_name, value, start_date, end_date')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(500)
      return data || []
    },
    enabled: !!propertyId,
  })

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) {
        const { id, ...rest } = payload
        const { error } = await supabase.from('contracts').update(rest).eq('id', id)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('contracts').insert({
        ...payload,
        property_id: propertyId,
        created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['deal-contracts'] })
      toast({ title: 'Contract saved', type: 'success' })
      setShowUpload(false)
      setEditing(null)
    },
    onError: (err) => toast({ title: 'Save failed', description: humanError(err), type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('contracts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['deal-contracts'] })
      toast({ title: 'Contract deleted', type: 'success' })
      setViewing(null)
    },
    onError: (err) => toast({ title: 'Delete failed', description: humanError(err), type: 'error' }),
  })

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'CRM', to: '/app' }, { label: 'Contracts' }]} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" /> Contracts
          </h1>
          <p className="text-[11px] text-text-muted mt-1 max-w-xl">
            Store the signed PDF for each deal. We keep the file attached so anyone on the team can download it later.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setShowUpload(true) }}>
          <Upload className="w-3.5 h-3.5" /> Upload contract
        </Button>
      </div>

      {isLoading && <div className="text-xs text-text-muted py-6 text-center">Loading…</div>}

      {!isLoading && (contracts?.length || 0) === 0 && (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-text-muted" />}
          title="No contracts yet"
          description="Upload a signed contract and link it to the matching deal."
          primaryAction={
            <Button size="lg" onClick={() => { setEditing(null); setShowUpload(true) }}>
              <Upload className="w-4 h-4" /> Upload contract
            </Button>
          }
        />
      )}

      <div className="space-y-2">
        {(contracts || []).map(c => (
          <ContractRow
            key={c.id}
            contract={c}
            onView={() => setViewing(c)}
            onEdit={() => { setEditing(c); setShowUpload(true) }}
            onDelete={() => { if (confirm('Delete this contract? The file will be removed.')) deleteMutation.mutate(c.id) }}
          />
        ))}
      </div>

      {showUpload && (
        <UploadDialog
          contract={editing}
          deals={deals || []}
          onClose={() => { setShowUpload(false); setEditing(null) }}
          onSave={(payload) => saveMutation.mutate(payload)}
          saving={saveMutation.isPending}
        />
      )}

      {viewing && (
        <ViewDialog contract={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

function ContractRow({ contract, onView, onEdit, onDelete }) {
  const tone = STATUS_TONE[contract.status] || 'neutral'
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {contract.status && <Badge tone={tone}>{contract.status}</Badge>}
            {contract.deals?.brand_name && (
              <span className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                {contract.deals.brand_name}
              </span>
            )}
            {contract.signed && <Badge tone="success">signed</Badge>}
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            {contract.brand_name || contract.deals?.brand_name || 'Untitled contract'}
          </h3>
          <div className="text-[11px] text-text-muted mt-0.5 space-y-0.5">
            {contract.pdf_file_name && <div className="font-mono truncate">{contract.pdf_file_name}</div>}
            <div className="flex flex-wrap gap-x-3">
              {contract.effective_date && <span>Start: {contract.effective_date}</span>}
              {contract.expiration_date && <span>End: {contract.expiration_date}</span>}
              {contract.total_value != null && <span>Value: ${Number(contract.total_value).toLocaleString()}</span>}
            </div>
            <div className="text-[10px] text-text-muted">
              uploaded {new Date(contract.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {contract.pdf_file_data && (
            <Button size="sm" variant="secondary" onClick={onView}>
              View
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
          <button
            onClick={onDelete}
            className="text-[10px] border border-danger/30 text-danger px-2 py-1.5 rounded hover:bg-danger/10"
            aria-label="Delete contract"
          >
            <Trash2 className="w-3 h-3 inline" />
          </button>
        </div>
      </div>
    </div>
  )
}

function UploadDialog({ contract, deals, onClose, onSave, saving }) {
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    deal_id: contract?.deal_id || '',
    brand_name: contract?.brand_name || '',
    status: contract?.status || 'Draft',
    effective_date: contract?.effective_date || '',
    expiration_date: contract?.expiration_date || '',
    total_value: contract?.total_value ?? '',
    signed: contract?.signed || false,
    pdf_file_name: contract?.pdf_file_name || '',
    pdf_file_data: contract?.pdf_file_data || '',
  })
  const [filePicked, setFilePicked] = useState(false)

  // Pre-fill brand from selected deal when uploading new
  useEffect(() => {
    if (contract?.id) return
    if (form.deal_id && !form.brand_name) {
      const d = deals.find(d => d.id === form.deal_id)
      if (d?.brand_name) setForm(prev => ({ ...prev, brand_name: d.brand_name }))
    }
  }, [form.deal_id, deals, contract?.id, form.brand_name])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.readAsDataURL(file)
    })
    setForm(prev => ({ ...prev, pdf_file_name: file.name, pdf_file_data: base64 }))
    setFilePicked(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.deal_id) return
    if (!filePicked && !contract?.id) return
    const payload = {
      ...form,
      total_value: form.total_value === '' ? null : Number(form.total_value),
      effective_date: form.effective_date || null,
      expiration_date: form.expiration_date || null,
    }
    if (contract?.id) payload.id = contract.id
    onSave(payload)
  }

  const inputClass = 'w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-bg-surface border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">
            {contract?.id ? 'Edit contract' : 'Upload contract'}
          </h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Deal</label>
            <select
              value={form.deal_id}
              onChange={(e) => setForm({ ...form, deal_id: e.target.value })}
              className={`${inputClass} mt-1`}
              required
            >
              <option value="">Select a deal…</option>
              {deals.map(d => (
                <option key={d.id} value={d.id}>{d.brand_name || '(unnamed)'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Brand / sponsor name</label>
            <input
              value={form.brand_name}
              onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
              className={`${inputClass} mt-1`}
              placeholder="e.g. Acme Inc."
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={handleFile}
              className="hidden"
            />
            <div className="flex items-center gap-2 mt-1">
              <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> {form.pdf_file_name ? 'Replace file' : 'Choose file'}
              </Button>
              {form.pdf_file_name && (
                <span className="text-[11px] text-text-muted truncate">{form.pdf_file_name}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={`${inputClass} mt-1`}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Total value</label>
              <input
                type="number"
                value={form.total_value}
                onChange={(e) => setForm({ ...form, total_value: e.target.value })}
                className={`${inputClass} mt-1`}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Effective date</label>
              <input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Expiration date</label>
              <input
                type="date"
                value={form.expiration_date}
                onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={form.signed}
              onChange={(e) => setForm({ ...form, signed: e.target.checked })}
              className="accent-accent w-3.5 h-3.5"
            />
            Mark as signed
          </label>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || !form.deal_id || (!filePicked && !contract?.id)}>
            {saving ? 'Saving…' : contract?.id ? 'Save changes' : 'Upload'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function ViewDialog({ contract, onClose }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!contract.pdf_file_data) return
    let revoke = null
    try {
      const byteCharacters = atob(contract.pdf_file_data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
      const byteArray = new Uint8Array(byteNumbers)
      const isPdf = (contract.pdf_file_name || '').toLowerCase().endsWith('.pdf')
      const blob = new Blob([byteArray], { type: isPdf ? 'application/pdf' : 'application/octet-stream' })
      const objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
      revoke = () => URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.warn('Failed to decode contract file', err)
    }
    return () => { if (revoke) revoke() }
  }, [contract.pdf_file_data, contract.pdf_file_name])

  function handleDownload() {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = contract.pdf_file_name || 'contract'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const isPdf = (contract.pdf_file_name || '').toLowerCase().endsWith('.pdf')

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text-primary truncate">
              {contract.pdf_file_name || contract.brand_name || 'Contract'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleDownload} disabled={!url}>
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-black/40 overflow-auto">
          {url && isPdf && (
            <iframe src={url} title="Contract" className="w-full h-full border-0" />
          )}
          {url && !isPdf && (
            <div className="p-8 text-center text-text-muted text-sm">
              Preview not available for this file type. Use Download to open it locally.
            </div>
          )}
          {!url && (
            <div className="p-8 text-center text-text-muted text-sm">Loading file…</div>
          )}
        </div>
      </div>
    </div>
  )
}
