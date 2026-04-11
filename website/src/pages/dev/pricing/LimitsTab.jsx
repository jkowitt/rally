import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as pricingService from '@/services/pricingService'

export default function LimitsTab() {
  const { profile } = useAuth()
  const [plans, setPlans] = useState([])
  const [limits, setLimits] = useState([])
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { reload() }, [])

  async function reload() {
    const { plans, limits } = await pricingService.listLimitsMatrix()
    setPlans(plans)
    setLimits(limits)
  }

  async function save(limitId, field, value) {
    await pricingService.updateLimit(limitId, { [field]: value }, profile.id)
    setEditing(null)
    setToast('Limit updated. Cache cleared.')
    setTimeout(() => setToast(null), 2500)
    reload()
  }

  // Group limits by key so we can show one row per limit_key with
  // columns per plan
  const byKey = {}
  limits.forEach(l => {
    if (!byKey[l.limit_key]) byKey[l.limit_key] = {}
    byKey[l.limit_key][l.pricing_plans?.plan_key] = l
  })

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 bg-success/15 border border-success/30 text-success text-xs px-3 py-2 rounded z-50">
          {toast}
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Limit</th>
              {plans.map(p => <th key={p.id} className="text-center p-3">{p.display_name}</th>)}
              <th className="text-left p-3">Reset</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byKey).map(([key, row]) => {
              const firstLimit = Object.values(row)[0]
              return (
                <tr key={key} className="border-t border-border">
                  <td className="p-3">
                    <div className="text-text-primary">{firstLimit?.limit_display_name}</div>
                    <div className="text-[9px] font-mono text-text-muted">{key}</div>
                  </td>
                  {plans.map(p => {
                    const l = row[p.plan_key]
                    if (!l) return <td key={p.id} className="p-3 text-center text-text-muted">—</td>
                    const isEditing = editing?.id === l.id
                    const display = l.limit_value === -1 ? '∞' : l.limit_value
                    return (
                      <td key={p.id} className="p-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            defaultValue={l.limit_value}
                            onBlur={e => save(l.id, 'limit_value', Number(e.target.value))}
                            onKeyDown={e => { if (e.key === 'Enter') save(l.id, 'limit_value', Number(e.target.value)) }}
                            autoFocus
                            className="bg-bg-surface border border-accent rounded px-1 py-0.5 w-16 text-center text-xs"
                          />
                        ) : (
                          <button onClick={() => setEditing(l)} className="text-text-primary hover:text-accent font-mono">
                            {display}
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td className="p-3 text-[10px] text-text-muted">{firstLimit?.reset_period}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[10px] text-text-muted mt-3">
        Click any value to edit. Use <code className="font-mono text-accent">-1</code> for unlimited.
        Changes go live within 5 minutes.
      </div>
    </>
  )
}
