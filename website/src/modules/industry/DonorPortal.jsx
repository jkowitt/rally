import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { EmptyState } from '@/components/ui'
import { Heart } from 'lucide-react'

export default function DonorPortal() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const { data: deals } = useQuery({
    queryKey: ['donor-portal-deals', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, brand_name, value, stage, start_date, end_date, contact_first_name, contact_last_name, contact_email').eq('property_id', propertyId).order('value', { ascending: false }).limit(500)
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: impacts } = useQuery({
    queryKey: ['donor-portal-impacts', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('impact_metrics').select('*').eq('property_id', propertyId)
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: portalLinks } = useQuery({
    queryKey: ['donor-portal-links', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('sponsor_portal_links').select('*, deals(brand_name)').eq('property_id', propertyId).order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!propertyId,
  })

  async function createPortalLink(dealId) {
    const { data, error } = await supabase.from('sponsor_portal_links').insert({ deal_id: dealId, property_id: propertyId, created_by: profile?.id }).select('token').single()
    if (error) { toast({ title: 'Error', description: error.message, type: 'error' }); return }
    const url = `${window.location.origin}/sponsor/${data.token}`
    navigator.clipboard.writeText(url)
    toast({ title: 'Donor portal link copied!', type: 'success' })
  }

  const totalGiving = (deals || []).filter(d => ['Contracted','In Fulfillment','Renewed'].includes(d.stage)).reduce((s, d) => s + (Number(d.value) || 0), 0)
  const activeDonors = (deals || []).filter(d => d.stage !== 'Declined').length
  const totalImpact = (impacts || []).reduce((s, m) => s + (Number(m.metric_value) || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Donor Portal</h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">Share impact dashboards with your corporate partners</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Active Donors</div>
          <div className="text-2xl font-bold font-mono text-accent mt-1">{activeDonors}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Total Giving</div>
          <div className="text-2xl font-bold font-mono text-accent mt-1">${(totalGiving / 1000).toFixed(0)}K</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Impact Points</div>
          <div className="text-2xl font-bold font-mono text-success mt-1">{totalImpact.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4">
        <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Generate Donor Portal Links</h2>
        <p className="text-xs text-text-muted mb-3">Create a shareable link for each donor. They'll see their giving history, recognition status, and impact metrics.</p>
        <div className="space-y-2">
          {(deals || []).filter(d => d.stage !== 'Declined').map(deal => {
            const existing = (portalLinks || []).find(l => l.deal_id === deal.id && l.active)
            return (
              <div key={deal.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="text-sm text-text-primary">{deal.brand_name}</span>
                  <span className="text-xs text-text-muted ml-2">${Number(deal.value || 0).toLocaleString()}</span>
                </div>
                {existing ? (
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/sponsor/${existing.token}`); toast({ title: 'Link copied!', type: 'success' }) }} className="text-xs text-accent hover:underline">Copy link</button>
                ) : (
                  <button onClick={() => createPortalLink(deal.id)} className="text-xs bg-accent text-bg-primary px-3 py-1 rounded hover:opacity-90">Create link</button>
                )}
              </div>
            )
          })}
          {(!deals || deals.length === 0) && (
            <div className="py-4">
              <EmptyState
                icon={<Heart className="w-8 h-8 text-text-muted" />}
                title="No donors yet"
                description="Add a deal to your pipeline first — it'll appear here once attached as a donor."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
