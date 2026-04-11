import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as pricingService from '@/services/pricingService'

export default function FeaturesTab() {
  const { profile } = useAuth()
  const [plans, setPlans] = useState([])
  const [features, setFeatures] = useState([])

  useEffect(() => { reload() }, [])

  async function reload() {
    const { plans, features } = await pricingService.listFeaturesMatrix()
    setPlans(plans)
    setFeatures(features)
  }

  async function toggleFeature(feat) {
    await pricingService.updateFeature(feat.id, { is_enabled: !feat.is_enabled }, profile.id)
    reload()
  }

  // Group features by key + category
  const byKey = {}
  features.forEach(f => {
    if (!byKey[f.feature_key]) byKey[f.feature_key] = { category: f.pricing_page_category, display: f.feature_display_name, plans: {} }
    byKey[f.feature_key].plans[f.pricing_plans?.plan_key] = f
  })

  // Group by category
  const byCategory = {}
  Object.entries(byKey).forEach(([key, row]) => {
    if (!byCategory[row.category]) byCategory[row.category] = []
    byCategory[row.category].push({ key, ...row })
  })

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
          <tr>
            <th className="text-left p-3">Feature</th>
            {plans.map(p => <th key={p.id} className="text-center p-3">{p.display_name}</th>)}
          </tr>
        </thead>
        <tbody>
          {Object.entries(byCategory).map(([category, rows]) => (
            <>
              <tr key={category} className="bg-bg-surface/50 border-t-2 border-accent/20">
                <td colSpan={plans.length + 1} className="p-2 text-[10px] font-mono uppercase tracking-widest text-accent">
                  {category}
                </td>
              </tr>
              {rows.map(r => (
                <tr key={r.key} className="border-t border-border">
                  <td className="p-3">
                    <div className="text-text-primary">{r.display}</div>
                    <div className="text-[9px] font-mono text-text-muted">{r.key}</div>
                  </td>
                  {plans.map(p => {
                    const f = r.plans[p.plan_key]
                    if (!f) return <td key={p.id} className="p-3 text-center text-text-muted">—</td>
                    return (
                      <td key={p.id} className="p-3 text-center">
                        <button
                          onClick={() => toggleFeature(f)}
                          className={`w-8 h-4 rounded-full transition-colors relative ${f.is_enabled ? 'bg-accent' : 'bg-bg-surface'}`}
                        >
                          <div className={`w-3 h-3 rounded-full bg-bg-primary border border-border absolute top-0.5 transition-transform ${f.is_enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
