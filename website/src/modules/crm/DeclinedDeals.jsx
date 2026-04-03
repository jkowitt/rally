import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

export default function DeclinedDeals() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const { data: deals, isLoading } = useQuery({
    queryKey: ['declined-deals', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('property_id', propertyId)
        .eq('stage', 'Declined')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  const restoreMutation = useMutation({
    mutationFn: async ({ id, stage }) => {
      const { error } = await supabase.from('deals').update({ stage }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['declined-deals', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      toast({ title: 'Deal restored to pipeline', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error restoring deal', description: err.message, type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('deals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['declined-deals', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['deals', propertyId] })
      toast({ title: 'Deal permanently deleted', type: 'success' })
    },
    onError: (err) => toast({ title: 'Error deleting deal', description: err.message, type: 'error' }),
  })

  const totalLostValue = deals?.reduce((sum, d) => sum + (Number(d.value) || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Declined Prospects</h1>
        <p className="text-text-secondary text-sm mt-1">
          {deals?.length || 0} declined &middot; ${(totalLostValue / 1000).toFixed(0)}K lost pipeline
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : deals?.length === 0 ? (
        <div className="text-center text-text-muted text-sm py-16 bg-bg-surface border border-border rounded-lg">
          No declined prospects. All deals are active!
        </div>
      ) : (
        <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Brand</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Contact</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Email</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Value</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Source</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Added</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Reason Lost</th>
                <th className="px-4 py-3 text-xs text-text-muted font-mono uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="border-b border-border last:border-0 hover:bg-bg-card/50 opacity-75 hover:opacity-100">
                  <td className="px-4 py-3 text-text-primary font-medium">{deal.brand_name}</td>
                  <td className="px-4 py-3 text-text-secondary">{deal.contact_name || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{deal.contact_email || '—'}</td>
                  <td className="px-4 py-3 text-text-muted font-mono line-through">
                    {deal.value ? `$${Number(deal.value).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">{deal.source || '—'}</td>
                  <td className="px-4 py-3 text-text-muted text-xs font-mono">{deal.date_added || '—'}</td>
                  <td className="px-4 py-3 text-text-muted text-xs max-w-[200px] truncate">{deal.lost_reason || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => restoreMutation.mutate({ id: deal.id, stage: 'Prospect' })}
                        className="text-xs text-text-muted hover:text-success font-mono"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => { if (confirm('Permanently delete ' + deal.brand_name + '?')) deleteMutation.mutate(deal.id) }}
                        className="text-xs text-text-muted hover:text-danger font-mono"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
