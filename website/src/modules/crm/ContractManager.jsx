import { useState, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  generateContract,
  editContractText,
  parsePdfText,
  summarizeContract,
  extractBenefits,
  generateFulfillment,
} from '@/lib/claude'
import jsPDF from 'jspdf'

const STATUS_COLORS = {
  Draft: 'bg-bg-card text-text-secondary',
  'In Review': 'bg-warning/10 text-warning',
  Final: 'bg-accent/10 text-accent',
  Signed: 'bg-success/10 text-success',
  Expired: 'bg-danger/10 text-danger',
}

export default function ContractManager() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const [view, setView] = useState('list') // list | editor | import
  const [selectedContract, setSelectedContract] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, deals(brand_name, value, stage, start_date, end_date), contract_benefits(*)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  const { data: deals } = useQuery({
    queryKey: ['deals-list', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, brand_name, value, contact_first_name, contact_last_name, contact_email, contact_company, start_date, end_date').eq('property_id', propertyId)
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: assets } = useQuery({
    queryKey: ['assets', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('assets').select('id, name, category, base_price, quantity').eq('property_id', propertyId).eq('active', true)
      return data || []
    },
    enabled: !!propertyId,
  })

  const saveMutation = useMutation({
    mutationFn: async (contract) => {
      const payload = { ...contract }
      if (!payload.total_value) delete payload.total_value
      if (payload.id) {
        const { data, error } = await supabase.from('contracts').update(payload).eq('id', payload.id).select().single()
        if (error) throw error
        return data
      }
      delete payload.id
      const { data, error } = await supabase.from('contracts').insert({ ...payload, property_id: propertyId, created_by: profile.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
      setShowForm(false)
      if (data) setSelectedContract(data)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('contracts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
      setSelectedContract(null)
    },
  })

  function exportPDF(contract) {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text('Contract Summary', 20, 20)
    doc.setFontSize(12)
    doc.text(`Contract #: ${contract.contract_number || 'N/A'}`, 20, 35)
    doc.text(`Brand: ${contract.brand_name || contract.deals?.brand_name || 'N/A'}`, 20, 45)
    doc.text(`Total Value: $${Number(contract.total_value || 0).toLocaleString()}`, 20, 55)
    doc.text(`Effective: ${contract.effective_date || 'N/A'}`, 20, 65)
    doc.text(`Expires: ${contract.expiration_date || 'N/A'}`, 20, 75)
    doc.text(`Status: ${contract.status || 'Draft'}`, 20, 85)

    if (contract.contract_text) {
      doc.setFontSize(10)
      const lines = doc.splitTextToSize(contract.contract_text, 170)
      doc.text(lines, 20, 100)
    }

    if (contract.contract_benefits?.length > 0) {
      const y = contract.contract_text ? 100 + Math.min(doc.splitTextToSize(contract.contract_text, 170).length * 5, 100) : 100
      doc.setFontSize(14)
      doc.text('Benefits', 20, y)
      doc.setFontSize(10)
      contract.contract_benefits.forEach((b, i) => {
        doc.text(`${i + 1}. ${b.benefit_description || 'Benefit'} - Qty: ${b.quantity || 0} - $${Number(b.value || 0).toLocaleString()}`, 25, y + 10 + i * 8)
      })
    }

    doc.save(`contract-${contract.contract_number || contract.id?.slice(0, 8) || 'draft'}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Contract Manager</h1>
          <p className="text-text-secondary text-sm mt-1">{contracts?.length || 0} contracts &middot; AI-powered editing</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setSelectedContract(null); setShowForm(true) }}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
          >
            + New Contract
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit">
        {[
          { key: 'list', label: 'Contracts' },
          { key: 'editor', label: 'AI Editor' },
          { key: 'import', label: 'PDF Import' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${view === key ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'list' && (
        <ContractList
          contracts={contracts}
          isLoading={isLoading}
          onEdit={(c) => { setSelectedContract(c); setShowForm(true) }}
          onExport={exportPDF}
          onDelete={(id) => { if (confirm('Delete this contract and all its benefits?')) deleteMutation.mutate(id) }}
          onOpenEditor={(c) => { setSelectedContract(c); setView('editor') }}
          onExtractBenefits={async (c) => {
            if (!c.contract_text) return alert('No contract text to extract from. Use the AI Editor first.')
            try {
              await extractBenefits({ contract_id: c.id, contract_text: c.contract_text, property_id: propertyId })
              queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
              alert('Benefits extracted successfully!')
            } catch (e) {
              alert('Error extracting benefits: ' + e.message)
            }
          }}
          onGenerateFulfillment={async (c) => {
            try {
              const result = await generateFulfillment({
                contract_id: c.id,
                deal_id: c.deal_id,
                start_date: c.effective_date || c.deals?.start_date,
                end_date: c.expiration_date || c.deals?.end_date,
              })
              queryClient.invalidateQueries({ queryKey: ['fulfillment', propertyId] })
              alert(`Generated ${result.count || 0} fulfillment records!`)
            } catch (e) {
              alert('Error generating fulfillment: ' + e.message)
            }
          }}
        />
      )}

      {view === 'editor' && (
        <AIContractEditor
          contract={selectedContract}
          deals={deals || []}
          assets={assets || []}
          propertyId={propertyId}
          onSave={async (data) => {
            saveMutation.mutate(data)
          }}
          saving={saveMutation.isPending}
        />
      )}

      {view === 'import' && (
        <PDFImport
          deals={deals || []}
          propertyId={propertyId}
          profileId={profile?.id}
          onImported={() => {
            queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
            queryClient.invalidateQueries({ queryKey: ['deals-list', propertyId] })
            setView('list')
          }}
        />
      )}

      {showForm && (
        <ContractForm
          contract={selectedContract}
          deals={deals || []}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => { setShowForm(false); setSelectedContract(null) }}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  )
}

/* ============ Contract List ============ */
function ContractList({ contracts, isLoading, onEdit, onExport, onDelete, onOpenEditor, onExtractBenefits, onGenerateFulfillment }) {
  if (isLoading) {
    return <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
  }

  return (
    <div className="space-y-3">
      {contracts?.map((contract) => (
        <div key={contract.id} className="bg-bg-surface border border-border rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-text-primary">
                  {contract.brand_name || contract.deals?.brand_name}
                </span>
                {contract.contract_number && (
                  <span className="text-xs text-text-muted font-mono">#{contract.contract_number}</span>
                )}
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${STATUS_COLORS[contract.status] || STATUS_COLORS.Draft}`}>
                  {contract.status || 'Draft'}
                </span>
              </div>
              <div className="flex gap-4 mt-1 text-xs text-text-secondary font-mono flex-wrap">
                <span>${Number(contract.total_value || 0).toLocaleString()}</span>
                <span>{contract.effective_date || '—'} &rarr; {contract.expiration_date || '—'}</span>
              </div>
              {contract.ai_summary && (
                <p className="text-xs text-text-muted mt-2 line-clamp-2">{contract.ai_summary}</p>
              )}
              <div className="flex gap-3 mt-2 text-xs text-text-muted">
                {contract.contract_benefits?.length > 0 && (
                  <span>{contract.contract_benefits.length} benefit{contract.contract_benefits.length > 1 ? 's' : ''}</span>
                )}
                {contract.contract_text && <span>Has contract text</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button onClick={() => onOpenEditor(contract)} className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded">AI Edit</button>
              <button onClick={() => onExport(contract)} className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded">PDF</button>
              <button onClick={() => onEdit(contract)} className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded">Edit</button>
              <button onClick={() => onExtractBenefits(contract)} className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded">Extract</button>
              <button onClick={() => onGenerateFulfillment(contract)} className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded">Fulfill</button>
              <button onClick={() => onDelete(contract.id)} className="text-xs text-text-muted hover:text-danger px-2 py-1 bg-bg-card rounded">Delete</button>
            </div>
          </div>
        </div>
      ))}
      {contracts?.length === 0 && (
        <div className="text-center text-text-muted text-sm py-12">
          No contracts yet. Create one manually or use the AI Editor.
        </div>
      )}
    </div>
  )
}

/* ============ AI Contract Editor ============ */
function AIContractEditor({ contract, deals, assets, propertyId, onSave, saving }) {
  const [selectedDeal, setSelectedDeal] = useState(contract?.deal_id || '')
  const [selectedAssets, setSelectedAssets] = useState([])
  const [terms, setTerms] = useState('')
  const [contractText, setContractText] = useState(contract?.contract_text || '')
  const [editInstructions, setEditInstructions] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState('')
  const [summary, setSummary] = useState(contract?.ai_summary || '')

  async function handleGenerate() {
    if (!selectedDeal) return alert('Select a deal first')
    setAiLoading(true)
    setAiStatus('Generating contract with Claude AI...')
    try {
      const result = await generateContract({
        deal_id: selectedDeal,
        property_id: propertyId,
        assets: selectedAssets,
        terms: terms || undefined,
      })
      setContractText(result.contract_text)
      setAiStatus('Contract generated!')
    } catch (e) {
      setAiStatus('Error: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleEdit() {
    if (!contractText) return alert('No contract text to edit')
    if (!editInstructions) return alert('Enter editing instructions')
    setAiLoading(true)
    setAiStatus('Claude is editing the contract...')
    try {
      const result = await editContractText({ contract_text: contractText, instructions: editInstructions })
      setContractText(result.contract_text)
      setEditInstructions('')
      setAiStatus('Contract updated!')
    } catch (e) {
      setAiStatus('Error: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSummarize() {
    if (!contractText) return
    setAiLoading(true)
    setAiStatus('Summarizing...')
    try {
      const result = await summarizeContract(contractText)
      setSummary(result.summary)
      setAiStatus('Summary generated!')
    } catch (e) {
      setAiStatus('Error: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  function handleSave() {
    const deal = deals.find((d) => d.id === selectedDeal)
    onSave({
      ...(contract?.id ? { id: contract.id } : {}),
      deal_id: selectedDeal || undefined,
      brand_name: deal?.brand_name || contract?.brand_name || '',
      contract_text: contractText,
      ai_summary: summary || undefined,
      effective_date: deal?.start_date || contract?.effective_date,
      expiration_date: deal?.end_date || contract?.expiration_date,
      total_value: deal?.value || contract?.total_value,
      status: contract?.status || 'Draft',
    })
  }

  return (
    <div className="space-y-4">
      {/* Generation Controls */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-text-primary">Generate Contract with AI</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={selectedDeal}
            onChange={(e) => setSelectedDeal(e.target.value)}
            className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">Select Deal</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.brand_name} (${Number(d.value || 0).toLocaleString()})
              </option>
            ))}
          </select>
          <input
            placeholder="Additional terms (optional)"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Asset selection */}
        <div>
          <label className="text-xs text-text-muted block mb-1">Include Assets (optional)</label>
          <div className="flex gap-2 flex-wrap">
            {assets.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAssets((prev) =>
                  prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                )}
                className={`px-2 py-1 rounded text-xs font-mono border ${selectedAssets.includes(a.id) ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-card border-border text-text-secondary hover:text-text-primary'}`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={aiLoading || !selectedDeal}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {aiLoading ? 'Generating...' : 'Generate Contract'}
        </button>
      </div>

      {/* Contract Text Editor */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">Contract Text</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSummarize}
              disabled={aiLoading || !contractText}
              className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded disabled:opacity-50"
            >
              Summarize
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !contractText}
              className="text-xs bg-accent text-bg-primary px-3 py-1 rounded font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Contract'}
            </button>
          </div>
        </div>
        <textarea
          value={contractText}
          onChange={(e) => setContractText(e.target.value)}
          rows={16}
          placeholder="Contract text will appear here after generation, or paste existing contract text..."
          className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-y font-mono leading-relaxed"
        />

        {/* AI Edit Bar */}
        <div className="flex gap-2">
          <input
            placeholder="Tell Claude what to change... (e.g., 'add a non-compete clause', 'increase the value to $50,000')"
            value={editInstructions}
            onChange={(e) => setEditInstructions(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEdit() }}
            className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleEdit}
            disabled={aiLoading || !contractText || !editInstructions}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
          >
            {aiLoading ? 'Editing...' : 'AI Edit'}
          </button>
        </div>

        {aiStatus && (
          <p className={`text-xs font-mono ${aiStatus.startsWith('Error') ? 'text-danger' : 'text-accent'}`}>{aiStatus}</p>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-primary mb-2">AI Summary</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{summary}</p>
        </div>
      )}
    </div>
  )
}

/* ============ PDF Import ============ */
function PDFImport({ deals, propertyId, profileId, onImported }) {
  const [pdfText, setPdfText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [selectedDeal, setSelectedDeal] = useState('')
  const fileRef = useRef(null)

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text()
      setPdfText(text)
      setStatus('Text file loaded. Click "Parse with AI" to extract contract data.')
      return
    }

    // Extract text from PDF using pdf.js
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setLoading(true)
      setStatus('Extracting text from PDF...')
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          const pageText = content.items.map((item) => item.str).join(' ')
          fullText += pageText + '\n\n'
        }
        if (fullText.trim().length > 20) {
          setPdfText(fullText.trim())
          setStatus('PDF text extracted (' + pdf.numPages + ' pages). Click "Parse with AI" to extract contract data.')
        } else {
          setStatus('PDF appears to be scanned/image-based. Try copy-pasting the contract text instead.')
        }
      } catch (err) {
        setStatus('Error reading PDF: ' + (err.message || 'Unknown error'))
      } finally {
        setLoading(false)
      }
      return
    }

    setStatus('Unsupported file type. Use .pdf or .txt files, or paste text directly.')
  }

  async function handleParse() {
    if (!pdfText.trim()) return alert('Paste or upload contract text first')
    setLoading(true)
    setStatus('Claude AI is reading the contract...')
    try {
      const result = await parsePdfText(pdfText)
      setParsed(result.parsed)
      setStatus('Contract parsed successfully! Review the extracted data below.')
    } catch (e) {
      setStatus('Error parsing: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!parsed) return
    setLoading(true)
    setStatus('Importing into CRM...')
    try {
      // Create or link to deal
      let dealId = selectedDeal
      if (!dealId && parsed.brand_name) {
        const { data: newDeal, error: dealErr } = await supabase.from('deals').insert({
          property_id: propertyId,
          brand_name: parsed.brand_name,
          contact_name: parsed.contact_name || '',
          contact_email: parsed.contact_email || '',
          contact_first_name: parsed.contact_name?.split(' ')[0] || '',
          contact_last_name: parsed.contact_name?.split(' ').slice(1).join(' ') || '',
          contact_phone: parsed.contact_phone || '',
          contact_position: parsed.contact_position || '',
          contact_company: parsed.contact_company || parsed.brand_name,
          value: parsed.total_value || 0,
          start_date: parsed.effective_date || null,
          end_date: parsed.expiration_date || null,
          stage: 'Contracted',
          date_added: new Date().toISOString().split('T')[0],
          source: 'Other',
        }).select().single()
        if (dealErr) throw dealErr
        dealId = newDeal.id
      }

      // Create contract
      const { data: contract, error: contractErr } = await supabase.from('contracts').insert({
        property_id: propertyId,
        deal_id: dealId,
        brand_name: parsed.brand_name,
        contract_number: parsed.contract_number || null,
        effective_date: parsed.effective_date || null,
        expiration_date: parsed.expiration_date || null,
        total_value: parsed.total_value || null,
        contract_text: pdfText,
        ai_summary: parsed.summary || null,
        ai_extracted_benefits: parsed.benefits || null,
        status: 'In Review',
        signed: false,
        created_by: profileId,
      }).select().single()
      if (contractErr) throw contractErr

      // Insert benefits if extracted
      if (parsed.benefits?.length > 0) {
        const benefitRows = parsed.benefits.map((b) => ({
          contract_id: contract.id,
          benefit_description: b.description,
          quantity: b.quantity || 1,
          frequency: b.frequency || 'Per Season',
          value: b.value || null,
          fulfillment_auto_generated: false,
        }))
        await supabase.from('contract_benefits').insert(benefitRows)
      }

      setStatus('Imported! Contract, deal, and benefits created.')
      setTimeout(() => onImported(), 1500)
    } catch (e) {
      setStatus('Error importing: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-text-primary">Import Contract from PDF / Text</h3>
        <p className="text-xs text-text-muted">Upload a contract file or paste the text. Claude AI will extract deal info, benefits, and contact details.</p>

        <div className="flex gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="bg-bg-card border border-border text-text-secondary px-4 py-2 rounded text-sm hover:text-text-primary hover:border-accent"
          >
            Upload File
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" onChange={handleFileUpload} className="hidden" />
          <span className="text-xs text-text-muted self-center">or paste text below</span>
        </div>

        <textarea
          value={pdfText}
          onChange={(e) => setPdfText(e.target.value)}
          rows={10}
          placeholder="Paste contract text here..."
          className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-y font-mono"
        />

        <div className="flex gap-2">
          <button
            onClick={handleParse}
            disabled={loading || !pdfText.trim()}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Parsing...' : 'Parse with AI'}
          </button>
        </div>

        {status && (
          <p className={`text-xs font-mono ${status.startsWith('Error') ? 'text-danger' : 'text-accent'}`}>{status}</p>
        )}
      </div>

      {/* Parsed Results */}
      {parsed && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Extracted Data</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-text-muted block">Brand</span>
              <span className="text-text-primary">{parsed.brand_name || '—'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Contact</span>
              <span className="text-text-primary">{parsed.contact_name || '—'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Company</span>
              <span className="text-text-primary">{parsed.contact_company || '—'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Contract #</span>
              <span className="text-text-primary font-mono">{parsed.contract_number || '—'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Total Value</span>
              <span className="text-text-primary font-mono">${Number(parsed.total_value || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Term</span>
              <span className="text-text-primary font-mono">{parsed.effective_date || '?'} &rarr; {parsed.expiration_date || '?'}</span>
            </div>
          </div>

          {parsed.summary && (
            <div>
              <span className="text-xs text-text-muted block mb-1">Summary</span>
              <p className="text-sm text-text-secondary">{parsed.summary}</p>
            </div>
          )}

          {parsed.benefits?.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Extracted Benefits ({parsed.benefits.length})</span>
              <div className="space-y-1">
                {parsed.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs bg-bg-card rounded px-3 py-2">
                    <span className="text-text-primary flex-1">{b.description}</span>
                    <span className="text-text-muted font-mono">{b.category}</span>
                    <span className="text-text-muted font-mono">x{b.quantity}</span>
                    <span className="text-text-muted font-mono">{b.frequency}</span>
                    {b.value && <span className="text-accent font-mono">${Number(b.value).toLocaleString()}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link to existing deal or create new */}
          <div>
            <label className="text-xs text-text-muted block mb-1">Link to Existing Deal (optional)</label>
            <select
              value={selectedDeal}
              onChange={(e) => setSelectedDeal(e.target.value)}
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">Create new deal from contract</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.brand_name}</option>)}
            </select>
          </div>

          <button
            onClick={handleImport}
            disabled={loading}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 w-full"
          >
            {loading ? 'Importing...' : 'Import into CRM'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ============ Contract Form (Manual) ============ */
function ContractForm({ contract, deals, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    deal_id: contract?.deal_id || '',
    brand_name: contract?.brand_name || '',
    contract_number: contract?.contract_number || '',
    effective_date: contract?.effective_date || '',
    expiration_date: contract?.expiration_date || '',
    total_value: contract?.total_value || '',
    signed: contract?.signed || false,
    signed_date: contract?.signed_date || '',
    status: contract?.status || 'Draft',
    ...(contract?.id ? { id: contract.id } : {}),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-text-primary mb-4">{contract ? 'Edit Contract' : 'New Contract'}</h2>
        <div className="space-y-3">
          <select
            value={form.deal_id}
            onChange={(e) => setForm({ ...form, deal_id: e.target.value })}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">Select Deal</option>
            {deals.map((d) => <option key={d.id} value={d.id}>{d.brand_name} (${Number(d.value || 0).toLocaleString()})</option>)}
          </select>
          <input placeholder="Brand Name" value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          <input placeholder="Contract #" value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          <input type="number" placeholder="Total Value" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text-muted">Effective</label><input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" /></div>
            <div><label className="text-xs text-text-muted">Expires</label><input type="date" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" /></div>
          </div>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {['Draft', 'In Review', 'Final', 'Signed', 'Expired'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={form.signed} onChange={(e) => setForm({ ...form, signed: e.target.checked })} className="accent-accent" />
            Signed
          </label>
          {form.signed && (
            <div><label className="text-xs text-text-muted">Signed Date</label><input type="date" value={form.signed_date} onChange={(e) => setForm({ ...form, signed_date: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" /></div>
          )}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => onSave(form)} disabled={saving || !form.deal_id} className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          <button onClick={onCancel} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm hover:text-text-primary">Cancel</button>
        </div>
      </div>
    </div>
  )
}
