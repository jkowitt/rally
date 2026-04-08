import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const RECORD_TYPES = ['subscription', 'overage', 'refund', 'credit', 'payment']

export default function Accounting() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('records')
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [showCreateInvoice, setShowCreateInvoice] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [recordForm, setRecordForm] = useState({ property_id: '', record_type: 'subscription', amount: '', description: '', period: new Date().toISOString().slice(0, 7), plan: '' })

  // All properties for dropdown
  const { data: properties } = useQuery({
    queryKey: ['accounting-properties'],
    queryFn: async () => { const { data } = await supabase.from('properties').select('id, name, plan, billing_email'); return data || [] },
  })

  // Accounting records
  const { data: records } = useQuery({
    queryKey: ['accounting-records'],
    queryFn: async () => {
      const { data } = await supabase.from('accounting_records').select('*, properties(name, plan)').order('created_at', { ascending: false })
      return data || []
    },
  })

  // Invoices
  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => { const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false }); return data || [] },
  })

  // Auto-generate records from current subscriptions
  const generateRecordsMutation = useMutation({
    mutationFn: async () => {
      const period = new Date().toISOString().slice(0, 7)
      const paidProps = (properties || []).filter(p => p.plan && p.plan !== 'free')
      let count = 0
      for (const p of paidProps) {
        const amount = p.plan === 'starter' ? 39 : p.plan === 'pro' ? 99 : p.plan === 'enterprise' ? 249 : 0
        if (amount === 0) continue
        // Check if already recorded this period
        const { data: existing } = await supabase.from('accounting_records').select('id').eq('property_id', p.id).eq('period', period).eq('record_type', 'subscription').limit(1)
        if (existing?.length > 0) continue
        await supabase.from('accounting_records').insert({
          property_id: p.id, record_type: 'subscription', amount, plan: p.plan, period,
          description: `${p.plan} plan — ${p.name}`, status: 'recorded',
        })
        count++
      }
      return count
    },
    onSuccess: (count) => { queryClient.invalidateQueries({ queryKey: ['accounting-records'] }); toast({ title: `${count} subscription records generated`, type: 'success' }) },
  })

  const addRecordMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('accounting_records').insert({
        ...recordForm, amount: parseFloat(recordForm.amount) || 0,
        property_id: recordForm.property_id || null,
      })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounting-records'] }); toast({ title: 'Record added', type: 'success' }); setShowAddRecord(false) },
  })

  // Generate invoice for a property
  async function generateInvoice(propertyId, period) {
    const prop = (properties || []).find(p => p.id === propertyId)
    if (!prop) return
    const propRecords = (records || []).filter(r => r.property_id === propertyId && r.period === period)
    if (propRecords.length === 0) { toast({ title: 'No records for this period', type: 'warning' }); return }

    const lineItems = propRecords.map(r => ({
      description: r.description || `${r.record_type} — ${r.plan || ''}`,
      quantity: 1,
      unit_price: Number(r.amount),
      amount: Number(r.amount),
    }))
    const subtotal = lineItems.reduce((s, l) => s + l.amount, 0)
    const invoiceNumber = `INV-${period.replace('-', '')}-${propertyId.slice(0, 4).toUpperCase()}`

    const { error } = await supabase.from('invoices').insert({
      invoice_number: invoiceNumber,
      property_id: propertyId,
      property_name: prop.name,
      billing_email: prop.billing_email,
      period,
      subtotal,
      total: subtotal,
      line_items: lineItems,
      status: 'draft',
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    })
    if (error) { toast({ title: 'Error', description: error.message, type: 'error' }); return }
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    toast({ title: `Invoice ${invoiceNumber} created`, type: 'success' })
  }

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, updates }) => { await supabase.from('invoices').update(updates).eq('id', id) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })

  const totalRevenue = (records || []).filter(r => r.record_type === 'subscription' || r.record_type === 'overage' || r.record_type === 'payment').reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const totalRefunds = (records || []).filter(r => r.record_type === 'refund').reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const netRevenue = totalRevenue - totalRefunds
  const periods = [...new Set((records || []).map(r => r.period))].sort().reverse()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center"><div className="text-[9px] text-text-muted font-mono">Total Revenue</div><div className="text-xl font-bold font-mono text-success mt-0.5">${totalRevenue.toLocaleString()}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center"><div className="text-[9px] text-text-muted font-mono">Refunds</div><div className="text-xl font-bold font-mono text-danger mt-0.5">${totalRefunds.toLocaleString()}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center"><div className="text-[9px] text-text-muted font-mono">Net Revenue</div><div className="text-xl font-bold font-mono text-accent mt-0.5">${netRevenue.toLocaleString()}</div></div>
        <div className="bg-bg-surface border border-border rounded-lg p-3 text-center"><div className="text-[9px] text-text-muted font-mono">Invoices</div><div className="text-xl font-bold font-mono text-text-primary mt-0.5">{(invoices || []).length}</div></div>
      </div>

      <div className="flex gap-1">
        <button onClick={() => setTab('records')} className={`px-3 py-1.5 rounded text-sm font-medium ${tab === 'records' ? 'bg-accent text-bg-primary' : 'text-text-secondary'}`}>Records</button>
        <button onClick={() => setTab('invoices')} className={`px-3 py-1.5 rounded text-sm font-medium ${tab === 'invoices' ? 'bg-accent text-bg-primary' : 'text-text-secondary'}`}>Invoices</button>
      </div>

      {tab === 'records' && (
        <>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => generateRecordsMutation.mutate()} disabled={generateRecordsMutation.isPending} className="bg-accent/10 border border-accent/30 text-accent px-3 py-1.5 rounded text-xs font-medium hover:bg-accent/20 disabled:opacity-50">
              {generateRecordsMutation.isPending ? 'Generating...' : 'Auto-Generate This Month'}
            </button>
            <button onClick={() => setShowAddRecord(true)} className="bg-bg-surface border border-border text-text-secondary px-3 py-1.5 rounded text-xs hover:text-text-primary">+ Manual Record</button>
          </div>

          {showAddRecord && (
            <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select value={recordForm.property_id} onChange={e => setRecordForm({ ...recordForm, property_id: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  <option value="">Select account</option>
                  {(properties || []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.plan})</option>)}
                </select>
                <select value={recordForm.record_type} onChange={e => setRecordForm({ ...recordForm, record_type: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" placeholder="Amount $" value={recordForm.amount} onChange={e => setRecordForm({ ...recordForm, amount: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
                <input type="month" value={recordForm.period} onChange={e => setRecordForm({ ...recordForm, period: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                <input placeholder="Description" value={recordForm.description} onChange={e => setRecordForm({ ...recordForm, description: e.target.value })} className="bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => addRecordMutation.mutate()} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">Add</button>
                <button onClick={() => setShowAddRecord(false)} className="text-text-muted text-sm">Cancel</button>
              </div>
            </div>
          )}

          {periods.map(period => {
            const periodRecords = (records || []).filter(r => r.period === period)
            const periodTotal = periodRecords.reduce((s, r) => s + (r.record_type === 'refund' ? -(Number(r.amount) || 0) : (Number(r.amount) || 0)), 0)
            return (
              <div key={period} className="bg-bg-surface border border-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-mono text-text-primary">{new Date(period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-mono text-accent">${periodTotal.toLocaleString()}</span>
                    <button onClick={() => {
                      const propId = prompt('Property ID to invoice (or leave blank for all):')
                      if (propId !== null) {
                        if (propId) generateInvoice(propId, period)
                        else periodRecords.forEach(r => r.property_id && generateInvoice(r.property_id, period))
                      }
                    }} className="text-[10px] text-accent hover:underline font-mono">Generate Invoice</button>
                  </div>
                </div>
                <div className="space-y-1">
                  {periodRecords.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-1 border-b border-border last:border-0 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono px-1.5 py-0.5 rounded text-[9px] ${r.record_type === 'subscription' ? 'bg-success/10 text-success' : r.record_type === 'refund' ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'}`}>{r.record_type}</span>
                        <span className="text-text-secondary">{r.properties?.name || 'N/A'}</span>
                        <span className="text-text-muted">{r.description}</span>
                      </div>
                      <span className={`font-mono ${r.record_type === 'refund' ? 'text-danger' : 'text-success'}`}>${Number(r.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}

      {tab === 'invoices' && (
        <>
          {viewingInvoice ? (
            <div className="bg-bg-surface border border-border rounded-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{viewingInvoice.invoice_number}</h2>
                  <p className="text-xs text-text-muted">{viewingInvoice.property_name}</p>
                  <p className="text-xs text-text-muted">{viewingInvoice.billing_email}</p>
                </div>
                <div className="text-right">
                  <select value={viewingInvoice.status} onChange={e => { updateInvoiceMutation.mutate({ id: viewingInvoice.id, updates: { status: e.target.value, ...(e.target.value === 'paid' ? { paid_at: new Date().toISOString() } : {}) } }); setViewingInvoice({ ...viewingInvoice, status: e.target.value }) }} className={`text-[10px] font-mono px-2 py-1 rounded ${viewingInvoice.status === 'paid' ? 'bg-success/10 text-success' : viewingInvoice.status === 'sent' ? 'bg-accent/10 text-accent' : 'bg-bg-card text-text-muted'} focus:outline-none`}>
                    {['draft', 'sent', 'paid', 'void'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <p className="text-xs text-text-muted mt-1">Period: {viewingInvoice.period}</p>
                  {viewingInvoice.due_date && <p className="text-xs text-text-muted">Due: {viewingInvoice.due_date}</p>}
                </div>
              </div>
              <table className="w-full text-sm mb-4">
                <thead><tr className="border-b border-border"><th className="py-2 text-left text-text-muted text-xs">Description</th><th className="py-2 text-right text-text-muted text-xs">Qty</th><th className="py-2 text-right text-text-muted text-xs">Price</th><th className="py-2 text-right text-text-muted text-xs">Amount</th></tr></thead>
                <tbody>
                  {(viewingInvoice.line_items || []).map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 text-text-primary">{item.description}</td>
                      <td className="py-2 text-right font-mono text-text-muted">{item.quantity}</td>
                      <td className="py-2 text-right font-mono text-text-muted">${Number(item.unit_price).toLocaleString()}</td>
                      <td className="py-2 text-right font-mono text-accent">${Number(item.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-border pt-3 flex justify-between">
                <button onClick={() => setViewingInvoice(null)} className="text-text-muted text-sm hover:text-text-secondary">Back to list</button>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono text-accent">${Number(viewingInvoice.total).toLocaleString()}</div>
                  <div className="text-[10px] text-text-muted">Total due</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(invoices || []).map(inv => (
                <div key={inv.id} className="bg-bg-surface border border-border rounded-lg p-3 cursor-pointer hover:border-accent/30" onClick={() => setViewingInvoice(inv)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-text-primary">{inv.invoice_number}</span>
                      <span className="text-xs text-text-muted">{inv.property_name}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${inv.status === 'paid' ? 'bg-success/10 text-success' : inv.status === 'sent' ? 'bg-accent/10 text-accent' : inv.status === 'void' ? 'bg-danger/10 text-danger' : 'bg-bg-card text-text-muted'}`}>{inv.status}</span>
                    </div>
                    <span className="text-sm font-mono text-accent">${Number(inv.total).toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-text-muted font-mono mt-1">{inv.period} — Due: {inv.due_date || 'N/A'}</div>
                </div>
              ))}
              {(!invoices || invoices.length === 0) && <div className="text-text-muted text-center py-8 text-xs bg-bg-surface border border-border rounded-lg">No invoices yet. Generate from accounting records.</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
