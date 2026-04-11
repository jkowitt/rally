import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { approveMatch, rejectAndCreateAsset, syncMatchedToFulfillment } from '@/lib/smartMatch'

const ASSET_CATEGORIES = ['LED Board', 'Jersey Patch', 'Radio Read', 'Social Post', 'Naming Right', 'Signage', 'Activation Space', 'Digital', 'PA Announcement', 'Title Sponsorship', 'Website Banner', 'Email/Newsletter', 'VIP Experience', 'Halftime', 'Sampling/Giveaway', 'Print Ad', 'Podcast/Audio', 'Branded Content', 'Community Event']

export default function AssetMatchQueue({ contractId, propertyId, dealId, onComplete }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showNewAsset, setShowNewAsset] = useState(null)
  const [newAssetForm, setNewAssetForm] = useState({ name: '', category: 'Digital', quantity: 1, base_price: '' })

  const { data: queue } = useQuery({
    queryKey: ['asset-match-queue', contractId],
    queryFn: async () => {
      let q = supabase.from('asset_match_queue').select('*').eq('status', 'pending').order('confidence', { ascending: false })
      if (contractId) q = q.eq('contract_id', contractId)
      const { data } = await q.limit(50)
      return data || []
    },
  })

  const { data: assets } = useQuery({
    queryKey: ['property-assets', propertyId],
    queryFn: async () => {
      if (!propertyId) return []
      const { data } = await supabase.from('assets').select('id, name, category, base_price').eq('property_id', propertyId).eq('active', true).order('name')
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: matchHistory } = useQuery({
    queryKey: ['match-history-stats', propertyId],
    queryFn: async () => {
      if (!propertyId) return { total: 0, auto: 0 }
      const { count: total } = await supabase.from('asset_match_history').select('*', { count: 'exact', head: true }).eq('property_id', propertyId)
      const { count: auto } = await supabase.from('asset_match_history').select('*', { count: 'exact', head: true }).eq('property_id', propertyId).eq('was_auto', true)
      return { total: total || 0, auto: auto || 0 }
    },
    enabled: !!propertyId,
  })

  async function handleApprove(queueItem, assetId) {
    try {
      await approveMatch(queueItem.id, assetId || queueItem.suggested_asset_id, profile?.id)
      queryClient.invalidateQueries({ queryKey: ['asset-match-queue'] })
      toast({ title: 'Match approved — asset linked', type: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, type: 'error' })
    }
  }

  async function handleCreateNew(queueId) {
    if (!newAssetForm.name.trim()) return
    try {
      await rejectAndCreateAsset(queueId, {
        property_id: propertyId,
        name: newAssetForm.name,
        category: newAssetForm.category,
        quantity: parseInt(newAssetForm.quantity) || 1,
        base_price: parseFloat(newAssetForm.base_price) || null,
        active: true,
      }, profile?.id)
      queryClient.invalidateQueries({ queryKey: ['asset-match-queue'] })
      queryClient.invalidateQueries({ queryKey: ['property-assets'] })
      setShowNewAsset(null)
      setNewAssetForm({ name: '', category: 'Digital', quantity: 1, base_price: '' })
      toast({ title: 'New asset created and linked', type: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, type: 'error' })
    }
  }

  async function syncFulfillment() {
    if (!contractId || !dealId) return
    try {
      const count = await syncMatchedToFulfillment(contractId, dealId)
      toast({ title: count > 0 ? `${count} fulfillment records created` : 'Fulfillment already synced', type: 'success' })
    } catch (err) {
      toast({ title: 'Sync failed', description: err.message, type: 'error' })
    }
  }

  if (!queue?.length && !contractId) return null

  const pendingCount = (queue || []).length
  const confidenceColor = (c) => c >= 0.8 ? 'text-success' : c >= 0.5 ? 'text-warning' : 'text-danger'

  return (
    <div className="space-y-3">
      {/* Header with learning stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-medium text-text-primary">Smart Asset Matching</h4>
          <p className="text-[10px] text-text-muted">
            {pendingCount} pending approval{matchHistory ? ` — ${matchHistory.total} historical matches (${matchHistory.auto} auto)` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {contractId && dealId && (
            <button onClick={syncFulfillment} className="text-[10px] bg-bg-card border border-border rounded px-2 py-1 text-text-secondary hover:text-text-primary">
              Sync Fulfillment
            </button>
          )}
          {onComplete && pendingCount === 0 && (
            <button onClick={onComplete} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium">Done</button>
          )}
        </div>
      </div>

      {/* Learning indicator */}
      {matchHistory?.total > 0 && (
        <div className="bg-bg-card rounded p-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] text-text-muted">
            AI learning from {matchHistory.total} past matches — accuracy improves with each approval
          </span>
        </div>
      )}

      {/* Queue items */}
      {(queue || []).map(item => (
        <div key={item.id} className="bg-bg-surface border border-border rounded-lg p-3 space-y-2">
          {/* Benefit text */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-primary font-medium">"{item.benefit_text}"</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-mono ${confidenceColor(item.confidence)}`}>
                  {Math.round((item.confidence || 0) * 100)}% match
                </span>
                {item.suggested_category && (
                  <span className="text-[9px] text-text-muted bg-bg-card px-1.5 py-0.5 rounded">{item.suggested_category}</span>
                )}
              </div>
            </div>
          </div>

          {/* Suggested match */}
          {item.suggested_asset_id && (
            <div className="bg-bg-card rounded p-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-text-muted">Suggested:</span>
                <span className="text-xs text-text-primary ml-1 font-medium">{item.suggested_asset_name}</span>
              </div>
              <button onClick={() => handleApprove(item)} className="bg-success text-bg-primary px-3 py-1 rounded text-[10px] font-medium">
                Approve
              </button>
            </div>
          )}

          {/* Alternative matches */}
          {(item.alternative_assets || []).length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] text-text-muted uppercase">Alternatives:</span>
              {item.alternative_assets.map((alt, i) => (
                <div key={i} className="flex items-center justify-between bg-bg-card/50 rounded p-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono ${confidenceColor(alt.confidence)}`}>{Math.round((alt.confidence || 0) * 100)}%</span>
                    <span className="text-[10px] text-text-secondary">{alt.name}</span>
                  </div>
                  <button onClick={() => handleApprove(item, alt.asset_id)} className="text-[9px] text-accent hover:underline">Use this</button>
                </div>
              ))}
            </div>
          )}

          {/* Pick from all assets */}
          <div className="flex items-center gap-2">
            <select onChange={e => { if (e.target.value) handleApprove(item, e.target.value) }} defaultValue="" className="flex-1 bg-bg-card border border-border rounded px-2 py-1.5 text-[10px] text-text-secondary">
              <option value="">Choose different asset...</option>
              {(assets || []).map(a => <option key={a.id} value={a.id}>{a.name} ({a.category})</option>)}
            </select>
            <button onClick={() => {
              setShowNewAsset(item.id)
              setNewAssetForm({ name: item.benefit_text, category: item.suggested_category || 'Digital', quantity: 1, base_price: '' })
            }} className="text-[10px] text-accent hover:underline shrink-0">
              + New Asset
            </button>
          </div>

          {/* New asset form */}
          {showNewAsset === item.id && (
            <div className="bg-bg-card border border-accent/20 rounded p-3 space-y-2">
              <input value={newAssetForm.name} onChange={e => setNewAssetForm(f => ({ ...f, name: e.target.value }))} placeholder="Asset name" className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select value={newAssetForm.category} onChange={e => setNewAssetForm(f => ({ ...f, category: e.target.value }))} className="bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary">
                  {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={newAssetForm.quantity} onChange={e => setNewAssetForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Qty" className="bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
                <input type="number" value={newAssetForm.base_price} onChange={e => setNewAssetForm(f => ({ ...f, base_price: e.target.value }))} placeholder="Price" className="bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleCreateNew(item.id)} className="bg-accent text-bg-primary px-3 py-1 rounded text-xs font-medium">Create & Link</button>
                <button onClick={() => setShowNewAsset(null)} className="text-[10px] text-text-muted hover:text-text-primary">Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {pendingCount === 0 && (
        <div className="text-center py-6 text-text-muted text-sm">
          All benefits matched. The AI will use these decisions to improve future matching.
        </div>
      )}
    </div>
  )
}
