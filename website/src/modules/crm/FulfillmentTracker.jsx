import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function FulfillmentTracker() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id

  const { data: records, isLoading } = useQuery({
    queryKey: ['fulfillment', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fulfillment_records')
        .select('*, deals(brand_name, property_id), assets(name, category), contracts(contract_number)')
        .eq('deals.property_id', propertyId)
        .order('scheduled_date')
      if (error) throw error
      return data?.filter((r) => r.deals) || []
    },
    enabled: !!propertyId,
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, delivered }) => {
      const { error } = await supabase.from('fulfillment_records').update({ delivered }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fulfillment', propertyId] }),
  })

  const pending = records?.filter((r) => !r.delivered) || []
  const completed = records?.filter((r) => r.delivered) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Fulfillment Tracker</h1>
        <p className="text-text-secondary text-sm mt-1">
          {pending.length} pending &middot; {completed.length} delivered
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12" />)}</div>
      ) : (
        <>
          {/* Pending */}
          <div>
            <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Pending Delivery</h2>
            <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs text-text-muted font-mono">Brand</th>
                    <th className="px-4 py-2 text-left text-xs text-text-muted font-mono">Asset</th>
                    <th className="px-4 py-2 text-left text-xs text-text-muted font-mono">Date</th>
                    <th className="px-4 py-2 text-left text-xs text-text-muted font-mono">Notes</th>
                    <th className="px-4 py-2 text-left text-xs text-text-muted font-mono">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg-card/50">
                      <td className="px-4 py-2 text-text-primary">{r.deals?.brand_name}</td>
                      <td className="px-4 py-2 text-text-secondary text-xs font-mono">{r.assets?.name || '—'}</td>
                      <td className="px-4 py-2 text-text-secondary text-xs font-mono">{r.scheduled_date || '—'}</td>
                      <td className="px-4 py-2 text-text-muted text-xs">{r.delivery_notes || '—'}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => toggleMutation.mutate({ id: r.id, delivered: true })}
                          className="text-xs text-success hover:underline"
                        >
                          Mark Done
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pending.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-text-muted text-sm">All deliverables fulfilled!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Completed ({completed.length})</h2>
              <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2 text-left text-xs text-text-muted font-mono">Brand</th>
                      <th className="px-4 py-2 text-left text-xs text-text-muted font-mono">Asset</th>
                      <th className="px-4 py-2 text-left text-xs text-text-muted font-mono">Date</th>
                      <th className="px-4 py-2 text-left text-xs text-text-muted font-mono">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completed.slice(0, 20).map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0 opacity-60">
                        <td className="px-4 py-2 text-text-primary">{r.deals?.brand_name}</td>
                        <td className="px-4 py-2 text-text-secondary text-xs font-mono">{r.assets?.name || '—'}</td>
                        <td className="px-4 py-2 text-text-secondary text-xs font-mono">{r.scheduled_date || '—'}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => toggleMutation.mutate({ id: r.id, delivered: false })}
                            className="text-xs text-text-muted hover:text-warning"
                          >
                            Undo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
