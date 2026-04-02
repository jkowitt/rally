import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function BrandReport() {
  const { dealId } = useParams()
  const { profile } = useAuth()

  const { data: deal } = useQuery({
    queryKey: ['deal-report', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, deal_assets(*, assets(*)), contracts(*, contract_benefits(*)), fulfillment_records(*)')
        .eq('id', dealId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!dealId,
  })

  if (!deal) {
    return <div className="text-text-muted text-sm p-6">Loading report...</div>
  }

  const deliveredCount = deal.fulfillment_records?.filter((r) => r.delivered).length || 0
  const totalFulfillment = deal.fulfillment_records?.length || 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-semibold text-text-primary">Brand Report</h1>
        <button
          onClick={() => window.print()}
          className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          Print Report
        </button>
      </div>

      {/* Header */}
      <div className="bg-bg-surface border border-border rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{deal.brand_name}</h2>
            <p className="text-text-secondary text-sm mt-1">
              {deal.contact_name} &middot; {deal.contact_email}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-accent">${Number(deal.value || 0).toLocaleString()}</div>
            <div className="text-xs font-mono text-text-muted mt-1">{deal.stage}</div>
          </div>
        </div>
        <div className="flex gap-6 mt-4 text-xs text-text-muted font-mono">
          <span>FY Start: {deal.start_date || 'TBD'}</span>
          <span>FY End: {deal.end_date || 'TBD'}</span>
          {deal.renewal_flag && <span className="text-warning">RENEWAL</span>}
        </div>
      </div>

      {/* Assets */}
      {deal.deal_assets?.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-6">
          <h3 className="text-sm font-mono text-text-muted uppercase mb-3">Included Assets</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-xs text-text-muted font-mono">Asset</th>
                <th className="pb-2 text-left text-xs text-text-muted font-mono">Category</th>
                <th className="pb-2 text-left text-xs text-text-muted font-mono">Qty</th>
                <th className="pb-2 text-right text-xs text-text-muted font-mono">Value</th>
              </tr>
            </thead>
            <tbody>
              {deal.deal_assets.map((da) => (
                <tr key={da.id} className="border-b border-border last:border-0">
                  <td className="py-2 text-text-primary">{da.assets?.name}</td>
                  <td className="py-2 text-text-secondary text-xs font-mono">{da.assets?.category}</td>
                  <td className="py-2 text-text-secondary font-mono">{da.quantity}</td>
                  <td className="py-2 text-right text-text-primary font-mono">${Number(da.custom_price || da.assets?.base_price || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fulfillment */}
      <div className="bg-bg-surface border border-border rounded-lg p-6">
        <h3 className="text-sm font-mono text-text-muted uppercase mb-3">Fulfillment Status</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-2xl font-mono text-text-primary">{deliveredCount}/{totalFulfillment}</div>
          <div className="flex-1 h-2 bg-bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${totalFulfillment > 0 ? (deliveredCount / totalFulfillment) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-text-muted font-mono">
            {totalFulfillment > 0 ? Math.round((deliveredCount / totalFulfillment) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Contracts */}
      {deal.contracts?.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-6">
          <h3 className="text-sm font-mono text-text-muted uppercase mb-3">Contracts</h3>
          {deal.contracts.map((c) => (
            <div key={c.id} className="border-b border-border last:border-0 py-3">
              <div className="flex justify-between">
                <span className="text-sm text-text-primary">#{c.contract_number || 'N/A'}</span>
                <span className={`text-xs font-mono ${c.signed ? 'text-success' : 'text-warning'}`}>
                  {c.signed ? 'Signed' : 'Pending'}
                </span>
              </div>
              <div className="text-xs text-text-muted font-mono mt-1">
                ${Number(c.total_value || 0).toLocaleString()} &middot; {c.effective_date} → {c.expiration_date}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-text-muted py-4 print-only">
        Generated by Loud Legacy &middot; {new Date().toLocaleDateString()} &middot; {profile?.properties?.name}
      </div>
    </div>
  )
}
