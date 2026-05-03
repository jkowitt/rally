import { useState, useRef, useEffect } from 'react'
import { extractPdfText, pdfjsLib } from '@/lib/pdf'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import {
  generateContract,
  editContractText,
  parsePdfText,
  summarizeContract,
  generateFulfillment,
} from '@/lib/claude'
import jsPDF from 'jspdf'
import { isAIFeatureEnabled } from '@/lib/featureCheck'
import Breadcrumbs from '@/components/Breadcrumbs'
import { on } from '@/lib/appEvents'

/* Guess asset category from benefit description */
function guessAssetCategory(description) {
  const d = description.toLowerCase()
  if (d.includes('led') || d.includes('board') || d.includes('ribbon') || d.includes('video')) return 'LED Board'
  if (d.includes('jersey') || d.includes('patch') || d.includes('uniform')) return 'Jersey Patch'
  if (d.includes('radio') || d.includes('read') || d.includes('announce') || d.includes('pa ') || d.includes('p.a.')) return 'PA Announcement'
  if (d.includes('social') || d.includes('instagram') || d.includes('twitter') || d.includes('tiktok') || d.includes('post')) return 'Social Post'
  if (d.includes('naming') || d.includes('title')) return 'Title Sponsorship'
  if (d.includes('sign') || d.includes('banner') || d.includes('billboard')) return 'Signage'
  if (d.includes('activation') || d.includes('booth') || d.includes('tent') || d.includes('experience')) return 'Activation Space'
  if (d.includes('digital') || d.includes('web') || d.includes('app') || d.includes('website')) return 'Website Banner'
  if (d.includes('email') || d.includes('newsletter')) return 'Email/Newsletter'
  if (d.includes('hospitality') || d.includes('suite') || d.includes('vip') || d.includes('lounge')) return 'VIP Experience'
  if (d.includes('first pitch') || d.includes('puck drop') || d.includes('coin toss') || d.includes('ceremonial')) return 'First Pitch/Puck Drop'
  if (d.includes('halftime') || d.includes('half-time') || d.includes('intermission')) return 'Halftime'
  if (d.includes('sample') || d.includes('giveaway') || d.includes('promotion')) return 'Sampling/Giveaway'
  if (d.includes('print') || d.includes('program') || d.includes('magazine')) return 'Print Ad'
  if (d.includes('podcast') || d.includes('audio') || d.includes('stream')) return 'Podcast/Audio'
  if (d.includes('branded') || d.includes('content') || d.includes('video content')) return 'Branded Content'
  if (d.includes('press') || d.includes('media') || d.includes('conference')) return 'Press Conference'
  if (d.includes('community') || d.includes('clinic') || d.includes('camp')) return 'Community Event'
  return 'Digital'
}

const STATUS_COLORS = {
  Draft: 'bg-bg-card text-text-secondary',
  'In Review': 'bg-warning/10 text-warning',
  Final: 'bg-accent/10 text-accent',
  Signed: 'bg-success/10 text-success',
  Expired: 'bg-danger/10 text-danger',
}

import AssetMatchQueue from './AssetMatchQueue'

export default function ContractManager() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [view, setView] = useState('list')

  // Listen for command-palette "Upload contract" event so the
  // palette can deep-link straight to the upload tab.
  useEffect(() => on('open-upload-contract', () => setView('upload')), [])
  const [selectedContract, setSelectedContract] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showPdfViewer, setShowPdfViewer] = useState(null)

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
      const { data } = await supabase.from('deals').select('id, brand_name, value, contact_first_name, contact_last_name, contact_email, contact_company, start_date, end_date').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(500)
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: assets } = useQuery({
    queryKey: ['assets', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('assets').select('id, name, category, base_price, quantity').eq('property_id', propertyId).eq('active', true).limit(1000)
      return data || []
    },
    enabled: !!propertyId,
  })

  // Team profiles for assignment
  const { data: teamProfiles } = useQuery({
    queryKey: ['team-profiles-cm', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email, role').eq('property_id', propertyId)
      return data || []
    },
    enabled: !!propertyId,
  })

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['contract-templates', propertyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id, template_name, brand_name, contract_text, pdf_file_data, pdf_file_name, contract_benefits(*)')
        .eq('property_id', propertyId)
        .eq('is_template', true)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!propertyId,
  })

  const saveMutation = useMutation({
    mutationFn: async (contract) => {
      const { _benefits, ...payload } = contract
      if (!payload.total_value) delete payload.total_value
      let savedContract
      let isNewContract = false
      if (payload.id) {
        // Snapshot the prior version before applying the update so the
        // old contract terms remain visible in Account Management → archives.
        // Skipped for templates (they're not signed agreements).
        if (!payload.is_template) {
          const { error: archiveErr } = await supabase.rpc('archive_contract_version', {
            p_contract_id: payload.id,
            p_reason: 'edit',
          })
          if (archiveErr) console.warn('Contract archive failed (non-fatal):', archiveErr.message)
        }
        const { data, error } = await supabase.from('contracts').update(payload).eq('id', payload.id).select().single()
        if (error) throw error
        savedContract = data
      } else {
        delete payload.id
        isNewContract = true
        // Auto-mark as active in Account Management when a real (non-template)
        // contract is created with a deal attached — this is the "send to AM" trigger.
        if (!payload.is_template && payload.deal_id && !payload.status) {
          payload.status = 'active'
        }
        const { data, error } = await supabase.from('contracts').insert({ ...payload, property_id: propertyId, created_by: profile.id }).select().single()
        if (error) throw error
        savedContract = data
      }
      savedContract._isNew = isNewContract

      // Save benefits and auto-sync to assets + fulfillment
      if (_benefits && _benefits.length > 0 && savedContract) {
        const syncErrors = []
        // Remove existing benefits for this contract and re-insert
        const { error: delErr } = await supabase.from('contract_benefits').delete().eq('contract_id', savedContract.id)
        if (delErr) syncErrors.push('Delete benefits: ' + delErr.message)
        const VALID_FREQ = ['Per Game', 'Per Month', 'Per Season', 'One Time']
        const benefitRows = _benefits.map(b => ({
          contract_id: savedContract.id,
          benefit_description: b.benefit_description || 'Benefit',
          quantity: parseInt(b.quantity) || 1,
          frequency: VALID_FREQ.includes(b.frequency) ? b.frequency : 'Per Season',
          value: b.value ? Number(String(b.value).replace(/[$,]/g, '')) : null,
        }))
        const { data: insertedBenefits, error: benErr } = await supabase.from('contract_benefits').insert(benefitRows).select()
        if (benErr) syncErrors.push('Insert benefits: ' + benErr.message)

        // Auto-create fulfillment records (deal_id is nullable since migration 021)
        if (insertedBenefits?.length > 0) {
          await supabase.from('fulfillment_records').delete().eq('contract_id', savedContract.id).eq('auto_generated', true)
          const fulfillmentRows = insertedBenefits.map(b => ({
            deal_id: savedContract.deal_id || null,
            contract_id: savedContract.id,
            benefit_id: b.id,
            scheduled_date: savedContract.effective_date || null,
            delivered: false,
            auto_generated: true,
          }))
          const { error: fulErr } = await supabase.from('fulfillment_records').insert(fulfillmentRows)
          if (fulErr) syncErrors.push('Fulfillment: ' + fulErr.message)
        }

        // Auto-sync to asset catalog
        if (insertedBenefits?.length > 0) {
          await supabase.from('assets').delete().eq('source_contract_id', savedContract.id).eq('from_contract', true)
          for (const b of insertedBenefits) {
            const category = guessAssetCategory(b.benefit_description || '')
            const { error: assetErr } = await supabase.from('assets').insert({
              property_id: propertyId,
              name: b.benefit_description || 'Contract Benefit',
              category,
              quantity: b.quantity || 1,
              base_price: b.value || null,
              active: true,
              from_contract: true,
              source_contract_id: savedContract.id,
              sold_count: b.quantity || 1,
              total_available: 0,
            })
            if (assetErr) {
              syncErrors.push('Asset: ' + assetErr.message)
              break
            }
          }
        }

        if (syncErrors.length > 0) {
          console.error('Benefit sync errors:', syncErrors)
          savedContract._syncErrors = syncErrors
        }
      }

      return savedContract
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['contract-templates', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['fulfillment-records'] })
      queryClient.invalidateQueries({ queryKey: ['contract-versions'] })
      if (data?._syncErrors?.length > 0) {
        toast({ title: 'Contract saved — sync issues', description: data._syncErrors[0], type: 'warning' })
      } else if (data?._isNew && !data?.is_template && data?.deal_id) {
        toast({
          title: 'Contract sent to Account Management',
          description: 'Benefits + fulfillment are now tracked under Account Management.',
          type: 'success',
        })
      } else if (data?.id && !data?._isNew && !data?.is_template) {
        toast({
          title: 'Contract updated — prior version archived',
          description: 'Previous terms are saved in the version history.',
          type: 'success',
        })
      } else {
        toast({ title: 'Contract saved — benefits synced to Assets & Fulfillment', type: 'success' })
      }
      setShowForm(false)
      if (data) setSelectedContract(data)
    },
    onError: (err) => toast({ title: 'Error saving contract', description: err.message, type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Clean up linked assets and fulfillment records first
      await supabase.from('assets').delete().eq('source_contract_id', id).eq('from_contract', true)
      await supabase.from('fulfillment_records').delete().eq('contract_id', id).eq('auto_generated', true)
      // contract_benefits cascade automatically on contract delete
      const { error } = await supabase.from('contracts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['fulfillment-records'] })
      queryClient.invalidateQueries({ queryKey: ['contract-templates', propertyId] })
      toast({ title: 'Contract deleted', type: 'success' })
      setSelectedContract(null)
    },
    onError: (err) => toast({ title: 'Error deleting contract', description: err.message, type: 'error' }),
  })

  function handleViewPdf(contract) {
    if (contract.pdf_file_data) {
      setShowPdfViewer(contract)
    } else {
      // Fallback: generate summary PDF
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
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Breadcrumbs items={[
        { label: 'Account Management', to: '/app/accounts' },
        { label: 'Contracts' },
      ]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Contract Manager</h1>
          <p className="text-text-secondary text-sm mt-1">{contracts?.length || 0} contracts &middot; {templates?.length || 0} templates</p>
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
      <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit overflow-x-auto">
        {[
          { key: 'list', label: 'Contracts' },
          { key: 'upload', label: 'Upload Contract' },
          { key: 'editor', label: 'Create from Template' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${view === key ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}
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
          onViewPdf={handleViewPdf}
          onDelete={(id) => { if (confirm('Delete this contract and all its benefits?')) deleteMutation.mutate(id) }}
          onOpenEditor={(c) => { setSelectedContract(c); setView('editor') }}
          onGenerateFulfillment={async (c) => {
            try {
              const result = await generateFulfillment({
                contract_id: c.id,
                deal_id: c.deal_id,
                start_date: c.effective_date || c.deals?.start_date,
                end_date: c.expiration_date || c.deals?.end_date,
              })
              queryClient.invalidateQueries({ queryKey: ['fulfillment-records'] })
              alert(`Generated ${result.count || 0} fulfillment records!`)
            } catch (e) {
              alert('Error generating fulfillment: ' + e.message)
            }
          }}
          onStatusChange={async (contractId, newStatus) => {
            const { error } = await supabase.from('contracts').update({ status: newStatus }).eq('id', contractId)
            if (error) {
              toast({ title: 'Error updating status', description: error.message, type: 'error' })
              return
            }
            queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
            toast({ title: `Contract status: ${newStatus}`, type: 'success' })

            // When marked as Signed, sync benefits to fulfillment + assets
            if (newStatus === 'Signed') {
              const contract = contracts?.find(c => c.id === contractId)
              if (contract?.contract_benefits?.length > 0) {
                let assetCount = 0
                let fulCount = 0
                for (const b of contract.contract_benefits) {
                  // Create fulfillment record if not exists
                  const { data: existing } = await supabase.from('fulfillment_records').select('id').eq('contract_id', contractId).eq('benefit_id', b.id).limit(1)
                  if (!existing?.length) {
                    await supabase.from('fulfillment_records').insert({
                      deal_id: contract.deal_id || null,
                      contract_id: contractId,
                      benefit_id: b.id,
                      scheduled_date: contract.effective_date || null,
                      delivered: false,
                      auto_generated: true,
                    })
                    fulCount++
                  }
                  // Create asset if not exists
                  const { data: existingAsset } = await supabase.from('assets').select('id').eq('source_contract_id', contractId).eq('name', b.benefit_description).limit(1)
                  if (!existingAsset?.length) {
                    await supabase.from('assets').insert({
                      property_id: propertyId,
                      name: b.benefit_description || 'Contract Benefit',
                      category: guessAssetCategory(b.benefit_description || ''),
                      quantity: b.quantity || 1,
                      base_price: b.value || null,
                      active: true,
                      from_contract: true,
                      source_contract_id: contractId,
                      sold_count: b.quantity || 1,
                      total_available: 0,
                    })
                    assetCount++
                  }
                }
                if (assetCount > 0 || fulCount > 0) {
                  queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
                  queryClient.invalidateQueries({ queryKey: ['fulfillment-records'] })
                  toast({ title: `Synced: ${assetCount} assets, ${fulCount} fulfillment records`, type: 'success' })
                }
              }
            }
          }}
          teamProfiles={teamProfiles}
          onAssign={async (contractId, userId) => {
            const { error } = await supabase.from('contracts').update({ assigned_to: userId }).eq('id', contractId)
            if (error) toast({ title: 'Error', description: error.message, type: 'error' })
            else {
              queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
              toast({ title: userId ? 'Contract assigned' : 'Contract unassigned', type: 'success' })
            }
          }}
        />
      )}

      {view === 'editor' && (
        <AIContractEditor
          contract={selectedContract}
          deals={deals || []}
          assets={assets || []}
          templates={templates || []}
          propertyId={propertyId}
          profileId={profile?.id}
          onSave={async (data) => {
            saveMutation.mutate(data)
          }}
          saving={saveMutation.isPending}
        />
      )}

      {view === 'upload' && (
        <UploadTemplate
          deals={deals || []}
          propertyId={propertyId}
          profileId={profile?.id}
          onImported={() => {
            queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
            queryClient.invalidateQueries({ queryKey: ['contract-templates', propertyId] })
            queryClient.invalidateQueries({ queryKey: ['deals-list', propertyId] })
            queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
            queryClient.invalidateQueries({ queryKey: ['fulfillment-records'] })
            queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
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

      {showPdfViewer && (
        <PDFViewerModal
          contract={showPdfViewer}
          onClose={() => setShowPdfViewer(null)}
        />
      )}

      {/* Smart Asset Match Queue — shows when benefits need approval */}
      <AssetMatchQueue
        propertyId={propertyId}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
          queryClient.invalidateQueries({ queryKey: ['assets', propertyId] })
        }}
      />
    </div>
  )
}

/* ============ PDF Viewer Modal ============ */
function PDFViewerModal({ contract, onClose }) {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contract.pdf_file_data) return
    renderPages()
  }, [contract.pdf_file_data])

  async function renderPages() {
    try {
      const byteCharacters = atob(contract.pdf_file_data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const pdf = await pdfjsLib.getDocument({ data: byteArray }).promise
      const rendered = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise
        rendered.push(canvas.toDataURL('image/png'))
      }
      setPages(rendered)
    } catch (err) {
      console.error('PDF render error:', err)
    }
    setLoading(false)
  }

  function handleDownload() {
    const byteCharacters = atob(contract.pdf_file_data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: contract.pdf_content_type || 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = contract.pdf_file_name || `contract-${contract.contract_number || 'download'}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col z-50">
      <div className="flex items-center justify-between px-6 py-3 bg-bg-surface border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-text-primary">
            {contract.pdf_file_name || contract.brand_name || 'Contract PDF'}
          </h3>
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${STATUS_COLORS[contract.status] || STATUS_COLORS.Draft}`}>
            {contract.status || 'Draft'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
            Download
          </button>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg px-2">&times;</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-bg-card p-4 flex flex-col items-center gap-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        )}
        {pages.map((src, i) => (
          <img key={i} src={src} alt={`Page ${i + 1}`} className="max-w-full shadow-lg rounded border border-border" />
        ))}
      </div>
    </div>
  )
}

/* ============ Contract List ============ */
function ContractList({ contracts, isLoading, onEdit, onViewPdf, onDelete, onOpenEditor, onGenerateFulfillment, onStatusChange, teamProfiles, onAssign }) {
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
                {contract.is_template && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent/10 text-accent">Template</span>
                )}
                {contract.pdf_file_data && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-success/10 text-success">PDF Stored</span>
                )}
              </div>
              {/* Assignment */}
              <div className="mt-1">
                <select
                  value={contract.assigned_to || ''}
                  onChange={(e) => onAssign?.(contract.id, e.target.value || null)}
                  className="bg-bg-card border border-border rounded px-2 py-0.5 text-[10px] text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Unassigned</option>
                  {(teamProfiles || []).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 mt-1 text-xs text-text-secondary font-mono flex-wrap">
                <span>${Number(contract.total_value || 0).toLocaleString()}</span>
                <span>{contract.effective_date || '\u2014'} &rarr; {contract.expiration_date || '\u2014'}</span>
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
              <select
                value={contract.status || 'Draft'}
                onChange={(e) => onStatusChange(contract.id, e.target.value)}
                className={`text-xs font-mono px-2 py-1 rounded focus:outline-none focus:border-accent ${STATUS_COLORS[contract.status] || STATUS_COLORS.Draft}`}
              >
                {['Draft', 'In Review', 'Final', 'Signed', 'Expired'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => onOpenEditor(contract)} className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded">AI Edit</button>
              <button onClick={() => onViewPdf(contract)} className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded">PDF</button>
              <button onClick={() => onEdit(contract)} className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded">Edit</button>
              <button onClick={() => onGenerateFulfillment(contract)} className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded">Fulfill</button>
              <button onClick={() => onDelete(contract.id)} className="text-xs text-text-muted hover:text-danger px-2 py-1 bg-bg-card rounded">Delete</button>
            </div>
          </div>
        </div>
      ))}
      {contracts?.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="text-text-muted text-sm">
            No contracts yet. Create one manually, use the AI Editor, or upload a template.
          </div>
          <div className="inline-block bg-gradient-to-br from-accent/10 to-transparent border border-accent/30 rounded-lg p-4 max-w-md">
            <div className="text-xs text-text-secondary mb-2">
              Bringing contracts in from another system?
            </div>
            <a
              href="/app/crm/migrate"
              className="inline-block bg-accent text-bg-primary font-semibold px-4 py-2 rounded text-xs hover:opacity-90"
            >
              Migrate from existing system →
            </a>
            <div className="text-[10px] text-text-muted mt-2">
              Upload all your contracts at once — AI extracts every benefit automatically.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============ AI Contract Editor ============ */
function AIContractEditor({ contract, deals, assets, templates, propertyId, profileId, onSave, saving }) {
  const [selectedDeal, setSelectedDeal] = useState(contract?.deal_id || '')
  const [selectedAssets, setSelectedAssets] = useState([])
  const [terms, setTerms] = useState('')
  const [contractText, setContractText] = useState(contract?.contract_text || '')
  const [editInstructions, setEditInstructions] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState('')
  const [summary, setSummary] = useState(contract?.ai_summary || '')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [loadedFromTemplate, setLoadedFromTemplate] = useState(false)

  // Company detail fields (editable when loaded from template/PDF)
  const [companyDetails, setCompanyDetails] = useState({
    company_name: contract?.company_name || '',
    company_address: contract?.company_address || '',
    company_signee: contract?.company_signee || '',
    company_email: contract?.company_email || '',
    notice_address: contract?.notice_address || '',
    notice_email: contract?.notice_email || '',
  })

  // Benefits editor
  const [benefits, setBenefits] = useState(
    contract?.contract_benefits?.map(b => ({
      benefit_description: b.benefit_description || '',
      quantity: b.quantity || 1,
      frequency: b.frequency || 'Per Season',
      value: b.value || '',
    })) || []
  )

  // Sync state when contract prop changes (e.g. user selects a different contract to edit)
  useEffect(() => {
    if (contract) {
      setSelectedDeal(contract.deal_id || '')
      setContractText(contract.contract_text || '')
      setSummary(contract.ai_summary || '')
      setCompanyDetails({
        company_name: contract.company_name || '',
        company_address: contract.company_address || '',
        company_signee: contract.company_signee || '',
        company_email: contract.company_email || '',
        notice_address: contract.notice_address || '',
        notice_email: contract.notice_email || '',
      })
      setBenefits(contract.contract_benefits?.map(b => ({
        benefit_description: b.benefit_description || '',
        quantity: b.quantity || 1,
        frequency: b.frequency || 'Per Season',
        value: b.value || '',
      })) || [])
      setSelectedTemplate('')
      setLoadedFromTemplate(false)
    }
  }, [contract?.id])

  // Load template
  async function handleLoadTemplate(templateId) {
    if (!templateId) return
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    setSelectedTemplate(templateId)
    setLoadedFromTemplate(true)

    // If template has PDF, extract text from it
    if (template.pdf_file_data) {
      setAiLoading(true)
      setAiStatus('Extracting text from template PDF...')
      try {
        const byteCharacters = atob(template.pdf_file_data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const uint8Array = new Uint8Array(byteNumbers)
        const fullText = await extractPdfText(uint8Array.buffer)
        setContractText(fullText.trim() || template.contract_text || '')
        setAiStatus('Template loaded! Edit the company details and benefits below, then generate your updated contract.')
      } catch (err) {
        setContractText(template.contract_text || '')
        setAiStatus('Template loaded (could not extract PDF text: ' + err.message + ')')
      } finally {
        setAiLoading(false)
      }
    } else {
      setContractText(template.contract_text || '')
      setAiStatus('Template loaded! Edit the company details and benefits below.')
    }

    // Load template benefits
    if (template.contract_benefits?.length > 0) {
      setBenefits(template.contract_benefits.map(b => ({
        benefit_description: b.benefit_description || '',
        quantity: b.quantity || 1,
        frequency: b.frequency || 'Per Season',
        value: b.value || '',
      })))
    }
  }

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

  async function handleApplyCompanyEdits() {
    if (!contractText) return alert('No contract text to edit')
    setAiLoading(true)
    setAiStatus('Claude is applying your company detail changes...')
    try {
      const instructions = []
      if (companyDetails.company_name) instructions.push(`Change the company/brand name to "${companyDetails.company_name}"`)
      if (companyDetails.company_address) instructions.push(`Change the company address to "${companyDetails.company_address}"`)
      if (companyDetails.company_signee) instructions.push(`Change the signee/authorized representative name to "${companyDetails.company_signee}"`)
      if (companyDetails.company_email) instructions.push(`Change the company email to "${companyDetails.company_email}"`)
      if (companyDetails.notice_address) instructions.push(`Change the notice address to "${companyDetails.notice_address}"`)
      if (companyDetails.notice_email) instructions.push(`Change the notice email to "${companyDetails.notice_email}"`)
      if (benefits.length > 0) {
        const benefitList = benefits.map((b, i) => `${i + 1}. ${b.benefit_description} (qty: ${b.quantity}, frequency: ${b.frequency}, value: $${b.value || 0})`).join('\n')
        instructions.push(`Replace the benefits/deliverables section with these benefits:\n${benefitList}`)
      }
      if (instructions.length === 0) return alert('Enter at least one field to change')

      const result = await editContractText({
        contract_text: contractText,
        instructions: instructions.join('\n\nAlso: '),
      })
      setContractText(result.contract_text)
      setAiStatus('Contract updated with your changes!')
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
    const template = templates?.find(t => t.id === selectedTemplate)
    onSave({
      ...(contract?.id ? { id: contract.id } : {}),
      deal_id: selectedDeal || undefined,
      brand_name: companyDetails.company_name || deal?.brand_name || contract?.brand_name || '',
      contract_text: contractText,
      ai_summary: summary || undefined,
      effective_date: deal?.start_date || contract?.effective_date,
      expiration_date: deal?.end_date || contract?.expiration_date,
      total_value: deal?.value || contract?.total_value,
      status: contract?.status || 'Draft',
      company_name: companyDetails.company_name || undefined,
      company_address: companyDetails.company_address || undefined,
      company_signee: companyDetails.company_signee || undefined,
      company_email: companyDetails.company_email || undefined,
      notice_address: companyDetails.notice_address || undefined,
      notice_email: companyDetails.notice_email || undefined,
      // Pass benefits to save handler for auto-sync
      _benefits: benefits.filter(b => b.benefit_description),
      // Preserve template PDF if loaded from one
      ...(template?.pdf_file_data && !contract?.pdf_file_data ? {
        pdf_file_data: template.pdf_file_data,
        pdf_file_name: template.pdf_file_name,
        pdf_content_type: template.pdf_content_type || 'application/pdf',
      } : {}),
    })
  }

  function addBenefit() {
    setBenefits(prev => [...prev, { benefit_description: '', quantity: 1, frequency: 'Per Season', value: '' }])
  }

  function removeBenefit(index) {
    setBenefits(prev => prev.filter((_, i) => i !== index))
  }

  function updateBenefit(index, field, value) {
    setBenefits(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b))
  }

  return (
    <div className="space-y-4">
      {/* Template + Deal Selection */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-text-primary">Generate or Load Contract</h3>

        {/* Load from template */}
        {templates?.length > 0 && (
          <div>
            <label className="text-xs text-text-muted block mb-1">Load from Template</label>
            <div className="flex gap-2">
              <select
                value={selectedTemplate}
                onChange={(e) => handleLoadTemplate(e.target.value)}
                className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.template_name || t.brand_name || 'Untitled Template'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <label className="text-xs text-text-muted block mb-1">Or generate from deal</label>
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
        </div>

        {/* Asset selection for generation */}
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

      {/* Company Details Editor (shown when template loaded or contract has text) */}
      {(loadedFromTemplate || contract?.pdf_file_data || contractText) && (
        <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-accent">Company Details & Benefits</h3>
            <span className="text-xs text-text-muted">Edit these fields and click "Apply Changes" to update the contract</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Company Name</label>
              <input
                value={companyDetails.company_name}
                onChange={(e) => setCompanyDetails(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Company name in contract"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Signee Name</label>
              <input
                value={companyDetails.company_signee}
                onChange={(e) => setCompanyDetails(prev => ({ ...prev, company_signee: e.target.value }))}
                placeholder="Authorized signee"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Company Address</label>
              <input
                value={companyDetails.company_address}
                onChange={(e) => setCompanyDetails(prev => ({ ...prev, company_address: e.target.value }))}
                placeholder="Company street address"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Company Email</label>
              <input
                value={companyDetails.company_email}
                onChange={(e) => setCompanyDetails(prev => ({ ...prev, company_email: e.target.value }))}
                placeholder="company@email.com"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Notice Address</label>
              <input
                value={companyDetails.notice_address}
                onChange={(e) => setCompanyDetails(prev => ({ ...prev, notice_address: e.target.value }))}
                placeholder="Address for legal notices"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Notice Email</label>
              <input
                value={companyDetails.notice_email}
                onChange={(e) => setCompanyDetails(prev => ({ ...prev, notice_email: e.target.value }))}
                placeholder="Email for legal notices"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Benefits Editor */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-text-muted font-mono uppercase">Benefits / Deliverables</label>
              <button onClick={addBenefit} className="text-xs text-accent hover:text-accent/80">+ Add Benefit</button>
            </div>
            <div className="space-y-2">
              {benefits.map((b, i) => (
                <div key={i} className="flex gap-2 items-start bg-bg-card border border-border rounded p-2">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    <input
                      placeholder="Description"
                      value={b.benefit_description}
                      onChange={(e) => updateBenefit(i, 'benefit_description', e.target.value)}
                      className="sm:col-span-2 bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={b.quantity}
                      onChange={(e) => updateBenefit(i, 'quantity', parseInt(e.target.value) || 1)}
                      className="bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      placeholder="Value $"
                      value={b.value}
                      onChange={(e) => updateBenefit(i, 'value', e.target.value)}
                      className="bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                  </div>
                  <select
                    value={b.frequency}
                    onChange={(e) => updateBenefit(i, 'frequency', e.target.value)}
                    className="bg-bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    {['Per Game', 'Per Month', 'Per Season', 'One Time'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <button onClick={() => removeBenefit(i)} className="text-text-muted hover:text-danger text-sm px-1">&times;</button>
                </div>
              ))}
              {benefits.length === 0 && (
                <div className="text-xs text-text-muted text-center py-3 bg-bg-card rounded">No benefits added yet</div>
              )}
            </div>
          </div>

          <button
            onClick={handleApplyCompanyEdits}
            disabled={aiLoading}
            className="w-full bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {aiLoading ? 'Applying Changes...' : 'Apply Changes to Contract'}
          </button>
        </div>
      )}

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

/* ============ Upload Template (replaces PDF Import) ============ */
function UploadTemplate({ deals, propertyId, profileId, onImported }) {
  const [pdfText, setPdfText] = useState('')
  const [pdfBase64, setPdfBase64] = useState(null)
  const [pdfFileName, setPdfFileName] = useState('')
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [selectedDeal, setSelectedDeal] = useState('')
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [autoImport, setAutoImport] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const fileRef = useRef(null)

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setPdfFileName(file.name)

    // Read as base64 for storage — wait for it to complete
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.readAsDataURL(file)
    })
    setPdfBase64(base64)

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text()
      setPdfText(text)
      if (text.trim().length > 20) {
        setLoading(true)
        setStatus('AI is analyzing the contract...')
        try {
          const result = await parsePdfText(text)
          setParsed(result.parsed)
          setAutoImport(true)
          setStatus('Contract analyzed! Importing benefits...')
        } catch (e) {
          setStatus('Text loaded. AI analysis failed: ' + e.message)
        }
        setLoading(false)
      }
      return
    }

    // Extract text from Word documents
    // Extract text then auto-analyze
    let extractedText = ''

    if (file.name.endsWith('.docx') || file.name.endsWith('.doc') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setLoading(true)
      setStatus('Reading Word document...')
      try {
        const mammoth = await import('mammoth')
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.default.extractRawText({ arrayBuffer })
        extractedText = result.value?.trim() || ''
      } catch {
        setStatus('Could not read Word document. Try .docx format.')
        setLoading(false)
        return
      }
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setLoading(true)
      setStatus('Reading PDF — loading parser...')
      console.log('PDF detected:', file.name, 'type:', file.type, 'size:', file.size)
      try {
        const arrayBuffer = await file.arrayBuffer()
        console.log('PDF arrayBuffer size:', arrayBuffer.byteLength)
        setStatus('Reading PDF — extracting text...')
        extractedText = await extractPdfText(arrayBuffer, (msg) => setStatus(msg))
        console.log('PDF extracted text length:', extractedText.length, 'preview:', extractedText.slice(0, 200))
      } catch (err) {
        console.error('PDF extraction failed:', err.message, err)
        setStatus('PDF stored but extraction failed: ' + (err.message || 'Unknown error'))
      }
    } else {
      // Any other file type — try to read as text
      setLoading(true)
      setStatus('Reading file...')
      try {
        extractedText = await file.text()
      } catch {
        setStatus('File stored. Could not read text — paste contract text below to analyze.')
      }
    }

    // Auto-analyze with AI if text was extracted
    if (extractedText.length > 20) {
      setPdfText(extractedText)
      if (!isAIFeatureEnabled('ai_contract_analysis')) {
        setStatus('Contract text extracted. AI analysis is currently disabled by the developer.')
        setLoading(false)
        return
      }
      setStatus('AI is analyzing the contract...')
      try {
        const result = await parsePdfText(extractedText)
        setParsed(result.parsed)
        setAutoImport(true) // trigger auto-import via useEffect
        setStatus('Contract analyzed! Importing benefits...')
      } catch (e) {
        setStatus('Text extracted but AI analysis failed: ' + e.message)
      }
    } else if (pdfBase64) {
      // File was stored but text couldn't be extracted (scanned PDF, image, etc)
      setStatus('File stored successfully. Paste contract text below to analyze, or import as-is.')
      setPdfText('')
    } else {
      setStatus('File stored. Paste contract text below to analyze.')
    }
    setLoading(false)
  }

  async function handleParse() {
    if (!pdfText.trim()) return alert('Upload a file or paste contract text first')
    setLoading(true)
    setStatus('AI is analyzing the contract...')
    try {
      const result = await parsePdfText(pdfText)
      setParsed(result.parsed)
      setStatus('Contract analyzed! Review the data below and import.')
    } catch (e) {
      setStatus('Error parsing: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!parsed && !pdfBase64) return
    setLoading(true)
    setStatus('Importing into CRM...')
    try {
      // Create or link to deal
      let dealId = selectedDeal
      if (!dealId && parsed?.brand_name) {
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

      // Create contract with stored PDF
      const { data: contract, error: contractErr } = await supabase.from('contracts').insert({
        property_id: propertyId,
        deal_id: dealId || undefined,
        brand_name: parsed?.brand_name || templateName || pdfFileName,
        contract_number: parsed?.contract_number || null,
        effective_date: parsed?.effective_date || null,
        expiration_date: parsed?.expiration_date || null,
        total_value: parsed?.total_value || null,
        contract_text: pdfText || null,
        ai_summary: parsed?.summary || null,
        ai_extracted_benefits: parsed?.benefits || null,
        status: dealId ? 'active' : 'In Review',
        signed: false,
        created_by: profileId,
        // Store the original PDF exactly as uploaded
        pdf_file_data: pdfBase64 || null,
        pdf_file_name: pdfFileName || null,
        pdf_content_type: 'application/pdf',
        // Template fields
        is_template: saveAsTemplate,
        template_name: saveAsTemplate ? (templateName || pdfFileName) : null,
        // Company details
        company_name: parsed?.brand_name || null,
      }).select().single()
      if (contractErr) throw contractErr

      // Auto-insert benefits if extracted
      let benefitCount = 0
      let assetCount = 0
      let fulfillmentCount = 0

      if (parsed?.benefits?.length > 0) {
        const VALID_FREQ = ['Per Game', 'Per Month', 'Per Season', 'One Time']
        const benefitRows = parsed.benefits.map((b) => {
          const rawFreq = b.frequency || 'Per Season'
          const frequency = VALID_FREQ.includes(rawFreq) ? rawFreq : 'Per Season'
          return {
            contract_id: contract.id,
            benefit_description: b.description || b.benefit_description || b.name || 'Benefit',
            quantity: parseInt(b.quantity) || 1,
            frequency,
            value: b.value ? Number(String(b.value).replace(/[$,]/g, '')) : null,
          }
        })

        const { data: insertedBenefits, error: benefitsErr } = await supabase.from('contract_benefits').insert(benefitRows).select()
        if (benefitsErr) {
          console.error('Benefits insert error:', benefitsErr)
          setStatus('Warning: Benefits could not be saved — ' + benefitsErr.message)
        }

        benefitCount = insertedBenefits?.length || 0

        // Auto-create fulfillment records (deal_id nullable since migration 021)
        if (insertedBenefits?.length > 0) {
          const fulfillmentRows = insertedBenefits.map((b) => ({
            deal_id: dealId || null,
            contract_id: contract.id,
            benefit_id: b.id,
            scheduled_date: parsed?.effective_date || null,
            delivered: false,
            auto_generated: true,
          }))
          const { error: fulErr } = await supabase.from('fulfillment_records').insert(fulfillmentRows)
          if (fulErr) console.warn('Fulfillment insert error:', fulErr.message)
          else fulfillmentCount = fulfillmentRows.length
        }

        // Smart asset matching: use AI to match benefits to existing assets
        if (insertedBenefits?.length > 0) {
          try {
            const { data: matchResult } = await supabase.functions.invoke('contract-ai', {
              body: {
                action: 'smart_match_assets',
                contract_id: contract.id,
                property_id: propertyId,
                benefits: insertedBenefits.map(b => ({
                  id: b.id,
                  benefit_description: b.benefit_description,
                  quantity: b.quantity,
                  frequency: b.frequency,
                  value: b.value,
                })),
              },
            })

            const autoMatched = matchResult?.auto_matched || 0
            const needsApproval = matchResult?.needs_approval || 0

            // For auto-matched benefits, asset_id is already set
            // For unmatched/low confidence, they're queued for approval
            // Create assets ONLY for benefits that weren't matched at all (no queue entry)
            const unmatchedBenefits = insertedBenefits.filter(b => {
              const match = (matchResult?.matches || []).find(m => m.benefit_description === b.benefit_description)
              return !match || match.status === 'needs_approval'
            })

            assetCount = autoMatched
            if (needsApproval > 0) {
              toast({ title: `${autoMatched} auto-matched, ${needsApproval} need your approval`, description: 'Check the Asset Match Queue to review', type: 'info' })
            }
          } catch (matchErr) {
            // Fallback to old approach if smart matching fails
            console.warn('Smart match failed, using legacy:', matchErr.message)
            for (const b of insertedBenefits) {
              const category = guessAssetCategory(b.benefit_description || '')
              const { error: assetErr } = await supabase.from('assets').insert({
                property_id: propertyId,
                name: b.benefit_description || 'Contract Benefit',
                category,
                quantity: b.quantity || 1,
                base_price: b.value || null,
                active: true,
                from_contract: true,
                source_contract_id: contract.id,
                sold_count: b.quantity || 1,
                total_available: 0,
              })
              if (!assetErr) assetCount++
            }
          }
        }
      }

      // Calculate multi-year revenue and update deal
      if (dealId) {
        try {
          const updates = {}
          if (parsed?.effective_date && parsed?.expiration_date) {
            const startYear = parseInt(parsed.effective_date.slice(0, 4))
            const endYear = parseInt(parsed.expiration_date.slice(0, 4))
            const years = endYear - startYear + 1
            updates.is_multi_year = years > 1
            updates.deal_years = years
            updates.renewal_date = parsed.expiration_date

            // Use AI-returned annual_values if available, else calculate evenly
            if (parsed.annual_values && typeof parsed.annual_values === 'object' && Object.keys(parsed.annual_values).length > 0) {
              updates.annual_values = parsed.annual_values
            } else {
              const totalValue = Number(parsed.total_value) || 0
              const annualValue = years > 0 ? Math.round(totalValue / years) : totalValue
              const annualValues = {}
              for (let y = startYear; y <= endYear; y++) {
                annualValues[y] = annualValue
              }
              updates.annual_values = annualValues
            }
          }
          if (parsed?.effective_date) updates.start_date = parsed.effective_date
          if (parsed?.expiration_date) updates.end_date = parsed.expiration_date
          if (Object.keys(updates).length > 0) {
            await supabase.from('deals').update(updates).eq('id', dealId)
          }
        } catch { /* columns may not exist */ }
      }

      setStatus(saveAsTemplate
        ? 'Template saved! You can now use it in the AI Editor to create new contracts.'
        : `Imported! Sent to Account Management — ${benefitCount} benefit${benefitCount !== 1 ? 's' : ''}, ${assetCount} asset${assetCount !== 1 ? 's' : ''}, ${fulfillmentCount} fulfillment record${fulfillmentCount !== 1 ? 's' : ''} created.`
      )
      setTimeout(() => onImported(), 1500)
    } catch (e) {
      setStatus('Error importing: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-import after AI analysis completes
  useEffect(() => {
    if (autoImport && parsed && !loading) {
      setAutoImport(false)
      handleImport()
    }
  }, [autoImport, parsed, loading])

  return (
    <div className="space-y-4">
      <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-text-primary">Upload Contract</h3>
        <p className="text-xs text-text-muted">
          Upload a PDF or Word document. AI extracts deal info, benefits, and revenue by year automatically.
          Benefits sync to Assets and Fulfillment. Save as a template for future contracts.
        </p>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => fileRef.current?.click()}
            className="bg-bg-card border border-border text-text-secondary px-4 py-2 rounded text-sm hover:text-text-primary hover:border-accent"
          >
            Choose File (PDF or Word)
          </button>
          <input ref={fileRef} type="file" onChange={handleFileUpload} className="hidden" />
          {pdfFileName && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-accent font-mono">{pdfFileName}</span>
              {pdfBase64 && <span className="text-xs text-success font-mono">PDF stored</span>}
            </div>
          )}
        </div>

        {/* PDF Preview if uploaded */}
        {pdfBase64 && (
          <div className="border border-border rounded-lg overflow-hidden" style={{ height: '300px' }}>
            <iframe
              src={`data:application/pdf;base64,${pdfBase64}`}
              className="w-full h-full border-0"
              title="Uploaded PDF Preview"
            />
          </div>
        )}

        {/* Text area — always visible for paste or editing extracted text */}
        {(pdfBase64 && !pdfText) ? (
          <div className="bg-bg-card border border-accent/30 rounded-lg p-4 space-y-3">
            <div className="text-xs text-accent font-medium">PDF stored successfully — paste contract text to analyze</div>
            <p className="text-[11px] text-text-muted">Open the PDF on your device, select all text (Ctrl+A / Cmd+A), copy it, and paste below. AI will extract deal info, benefits, and revenue.</p>
            <textarea
              value={pdfText}
              onChange={(e) => setPdfText(e.target.value)}
              rows={8}
              placeholder="Paste contract text here..."
              className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-y font-mono"
              autoFocus
            />
          </div>
        ) : (
          <textarea
            value={pdfText}
            onChange={(e) => setPdfText(e.target.value)}
            rows={pdfBase64 ? 4 : 8}
            placeholder="Or paste contract text here..."
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-y font-mono"
          />
        )}

        {/* Template option */}
        <div className="flex items-center gap-4 bg-bg-card border border-border rounded-lg p-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="accent-accent"
            />
            Save as Template
          </label>
          {saveAsTemplate && (
            <input
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="flex-1 bg-bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleParse}
            disabled={loading || !pdfText.trim()}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze with AI'}
          </button>
          {pdfBase64 && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="bg-bg-card border border-accent text-accent px-4 py-2 rounded text-sm font-medium hover:bg-accent/10 disabled:opacity-50"
            >
              {saveAsTemplate ? 'Save as Template' : 'Import Without Analysis'}
            </button>
          )}
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
              <span className="text-text-primary">{parsed.brand_name || '\u2014'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Contact</span>
              <span className="text-text-primary">{parsed.contact_name || '\u2014'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Company</span>
              <span className="text-text-primary">{parsed.contact_company || '\u2014'}</span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Contract #</span>
              <span className="text-text-primary font-mono">{parsed.contract_number || '\u2014'}</span>
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
              <span className="text-xs text-text-muted block mb-2">Auto-Extracted Benefits ({parsed.benefits.length})</span>
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
            {loading ? 'Importing...' : saveAsTemplate ? 'Save as Template & Import' : 'Import into CRM'}
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
    company_name: contract?.company_name || '',
    company_address: contract?.company_address || '',
    company_signee: contract?.company_signee || '',
    company_email: contract?.company_email || '',
    notice_address: contract?.notice_address || '',
    notice_email: contract?.notice_email || '',
    ...(contract?.id ? { id: contract.id } : {}),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Company Details Section */}
          <div className="border-t border-border pt-3">
            <div className="text-xs text-text-muted font-mono uppercase tracking-wider mb-2">Company Details</div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Company Name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
                <input placeholder="Signee Name" value={form.company_signee} onChange={(e) => setForm({ ...form, company_signee: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
              </div>
              <input placeholder="Company Address" value={form.company_address} onChange={(e) => setForm({ ...form, company_address: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
              <input placeholder="Company Email" value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Notice Address" value={form.notice_address} onChange={(e) => setForm({ ...form, notice_address: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
                <input placeholder="Notice Email" value={form.notice_email} onChange={(e) => setForm({ ...form, notice_email: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
              </div>
            </div>
          </div>

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
