import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import jsPDF from 'jspdf'

export default function ContractManager() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const [showForm, setShowForm] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, deals(brand_name, value, stage), contract_benefits(*)')
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
      const { data } = await supabase.from('deals').select('id, brand_name, value').eq('property_id', propertyId)
      return data || []
    },
    enabled: !!propertyId,
  })

  const saveMutation = useMutation({
    mutationFn: async (contract) => {
      if (contract.id) {
        const { error } = await supabase.from('contracts').update(contract).eq('id', contract.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('contracts').insert({ ...contract, property_id: propertyId, created_by: profile.id })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', propertyId] })
      setShowForm(false)
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
    doc.text(`Signed: ${contract.signed ? 'Yes' : 'No'}`, 20, 85)

    if (contract.contract_benefits?.length > 0) {
      doc.setFontSize(14)
      doc.text('Benefits', 20, 105)
      doc.setFontSize(10)
      contract.contract_benefits.forEach((b, i) => {
        doc.text(`${i + 1}. ${b.benefit_description || 'Benefit'} - Qty: ${b.quantity || 0} - $${Number(b.value || 0).toLocaleString()}`, 25, 115 + i * 10)
      })
    }

    doc.save(`contract-${contract.contract_number || contract.id.slice(0, 8)}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Contract Manager</h1>
          <p className="text-text-secondary text-sm mt-1">{contracts?.length || 0} contracts</p>
        </div>
        <button
          onClick={() => { setSelectedContract(null); setShowForm(true) }}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + New Contract
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : (
        <div className="space-y-3">
          {contracts?.map((contract) => (
            <div key={contract.id} className="bg-bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {contract.brand_name || contract.deals?.brand_name}
                    {contract.contract_number && (
                      <span className="ml-2 text-xs text-text-muted font-mono">#{contract.contract_number}</span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-text-secondary font-mono">
                    <span>${Number(contract.total_value || 0).toLocaleString()}</span>
                    <span>{contract.effective_date} → {contract.expiration_date}</span>
                    <span className={contract.signed ? 'text-success' : 'text-warning'}>
                      {contract.signed ? 'Signed' : 'Unsigned'}
                    </span>
                  </div>
                  {contract.contract_benefits?.length > 0 && (
                    <div className="text-xs text-text-muted mt-1">
                      {contract.contract_benefits.length} benefit{contract.contract_benefits.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportPDF(contract)}
                    className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => { setSelectedContract(contract); setShowForm(true) }}
                    className="text-xs text-text-muted hover:text-accent px-2 py-1 bg-bg-card rounded"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
          {contracts?.length === 0 && (
            <div className="text-center text-text-muted text-sm py-12">
              No contracts yet. Create one from a deal.
            </div>
          )}
        </div>
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
    ...(contract?.id ? { id: contract.id } : {}),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg p-6 w-full max-w-md">
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
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={form.signed} onChange={(e) => setForm({ ...form, signed: e.target.checked })} className="accent-accent" />
            Signed
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => onSave(form)} disabled={saving || !form.deal_id} className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          <button onClick={onCancel} className="flex-1 bg-bg-card text-text-secondary py-2 rounded text-sm hover:text-text-primary">Cancel</button>
        </div>
      </div>
    </div>
  )
}
