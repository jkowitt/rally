import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

export default function MediaKitBuilder() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const propertyId = profile?.property_id
  const [generating, setGenerating] = useState(false)

  const { data: assets } = useQuery({
    queryKey: ['mediakit-assets', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('assets').select('*').eq('property_id', propertyId).eq('active', true).order('category')
      return data || []
    },
    enabled: !!propertyId,
  })

  const { data: audiences } = useQuery({
    queryKey: ['mediakit-audiences', propertyId],
    queryFn: async () => {
      const { data } = await supabase.from('audience_metrics').select('*').eq('property_id', propertyId).order('metric_date', { ascending: false }).limit(20)
      return data || []
    },
    enabled: !!propertyId,
  })

  const categories = [...new Set((assets || []).map(a => a.category))].sort()
  const totalInventory = (assets || []).reduce((s, a) => s + (a.quantity || 1), 0)
  const totalValue = (assets || []).reduce((s, a) => s + ((a.base_price || 0) * (a.quantity || 1)), 0)

  function generateMediaKit() {
    setGenerating(true)
    const doc = []
    doc.push(`${profile?.properties?.name || 'Company'} — Media Kit & Rate Card`)
    doc.push(`\nGenerated: ${new Date().toLocaleDateString()}\n`)

    if (audiences?.length) {
      doc.push('AUDIENCE METRICS')
      const latest = {}
      for (const m of audiences) { if (!latest[m.metric_name]) latest[m.metric_name] = m }
      for (const [name, m] of Object.entries(latest)) {
        doc.push(`  ${name}: ${Number(m.metric_value).toLocaleString()} (${m.channel})`)
      }
      doc.push('')
    }

    doc.push('AD INVENTORY & RATES\n')
    for (const cat of categories) {
      doc.push(`  ${cat}`)
      const catAssets = (assets || []).filter(a => a.category === cat)
      for (const a of catAssets) {
        doc.push(`    ${a.name} — $${Number(a.base_price || 0).toLocaleString()} × ${a.quantity || 1} available`)
      }
      doc.push('')
    }

    doc.push(`\nTotal inventory: ${totalInventory} placements`)
    doc.push(`Total value: $${totalValue.toLocaleString()}`)

    const text = doc.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `media-kit-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setGenerating(false)
    toast({ title: 'Media kit exported', type: 'success' })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Media Kit Builder</h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">Auto-generate rate cards from your ad inventory</p>
        </div>
        <button onClick={generateMediaKit} disabled={generating || !assets?.length} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {generating ? 'Generating...' : 'Export Media Kit'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Categories</div>
          <div className="text-2xl font-bold font-mono text-accent mt-1">{categories.length}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Total Placements</div>
          <div className="text-2xl font-bold font-mono text-text-primary mt-1">{totalInventory}</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted font-mono">Total Value</div>
          <div className="text-2xl font-bold font-mono text-accent mt-1">${(totalValue / 1000).toFixed(0)}K</div>
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4">
        <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Rate Card Preview</h2>
        {categories.map(cat => (
          <div key={cat} className="mb-4">
            <h3 className="text-xs font-mono text-accent uppercase tracking-wider mb-2">{cat}</h3>
            <div className="space-y-1">
              {(assets || []).filter(a => a.category === cat).map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-text-primary">{a.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-mono text-accent">${Number(a.base_price || 0).toLocaleString()}</span>
                    <span className="text-[10px] text-text-muted ml-1">× {a.quantity || 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {categories.length === 0 && <div className="text-xs text-text-muted text-center py-8">Add assets to your catalog to build a media kit.</div>}
      </div>
    </div>
  )
}
