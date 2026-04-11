import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const CATEGORY_ICONS = {
  'LED Board': '📺',
  'Jersey Patch': '👕',
  'Radio Read': '📻',
  'Social Post': '📱',
  'Naming Right': '🏷',
  'Signage': '🎯',
  'Activation Space': '🎪',
  'Digital': '💻',
}

export default function AssetCatalogStep({ onNext, onSkip }) {
  const { profile } = useAuth()
  const [assets, setAssets] = useState([])

  useEffect(() => {
    if (!profile?.property_id) return
    supabase
      .from('assets')
      .select('id, name, category, base_price')
      .eq('property_id', profile.property_id)
      .limit(4)
      .then(({ data }) => setAssets(data || []))
  }, [profile?.property_id])

  // Fallback demo assets if none exist
  const demoAssets = [
    { id: 'd1', name: 'LED Scoreboard Display', category: 'LED Board', base_price: 25000 },
    { id: 'd2', name: 'Social Media Posts', category: 'Social Post', base_price: 5000 },
    { id: 'd3', name: 'PA Announcements', category: 'Radio Read', base_price: 3500 },
    { id: 'd4', name: 'VIP Suite Experience', category: 'Activation Space', base_price: 15000 },
  ]

  const displayAssets = assets.length > 0 ? assets : demoAssets

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-2">📦</div>
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-1">Your asset inventory is ready</h2>
        <p className="text-xs sm:text-sm text-text-secondary">Every benefit from your contract was added to your asset catalog automatically.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {displayAssets.map(asset => (
          <div key={asset.id} className="bg-bg-card border border-border rounded-lg p-3 hover:border-accent/30 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{CATEGORY_ICONS[asset.category] || '💎'}</span>
              <span className="text-xs text-text-muted">{asset.category || 'Asset'}</span>
            </div>
            <div className="text-sm text-text-primary font-medium truncate">{asset.name}</div>
            {asset.base_price && <div className="text-xs text-accent font-mono mt-0.5">${Number(asset.base_price).toLocaleString()}</div>}
          </div>
        ))}
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
        <p className="text-[11px] text-text-secondary">
          <span className="text-accent font-medium">Pro tip:</span> As you upload more contracts, your asset catalog grows automatically. The AI matches similar benefits to prevent duplicates.
        </p>
      </div>

      <div className="space-y-2">
        <button onClick={onNext} className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
          Explore my assets →
        </button>
        <button onClick={onSkip} className="w-full text-[11px] text-text-muted hover:text-text-secondary py-1">
          Skip
        </button>
      </div>
    </div>
  )
}
