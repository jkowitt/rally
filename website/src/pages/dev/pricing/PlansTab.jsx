import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as pricingService from '@/services/pricingService'
import * as stripeSync from '@/services/stripeSyncService'

export default function PlansTab() {
  const { profile } = useAuth()
  const [plans, setPlans] = useState([])
  const [editing, setEditing] = useState(null)

  useEffect(() => { reload() }, [])

  async function reload() {
    setPlans(await pricingService.listPlans())
  }

  async function save(id, patch) {
    await pricingService.updatePlan(id, patch, profile.id)
    setEditing(null)
    reload()
  }

  async function sync(planKey) {
    const r = await stripeSync.syncPlanToStripe(planKey)
    if (r.success) { alert('Synced to Stripe'); reload() }
    else alert(r.error || 'Sync failed')
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
          <tr>
            <th className="text-left p-3">Plan</th>
            <th className="text-left p-3">Display</th>
            <th className="text-right p-3">Monthly</th>
            <th className="text-right p-3">Annual</th>
            <th className="text-left p-3">Badge</th>
            <th className="text-left p-3">Featured</th>
            <th className="text-left p-3">Stripe</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {plans.map(p => {
            const isEditing = editing?.id === p.id
            return (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-mono text-text-muted">{p.plan_key}</td>
                <td className="p-3">
                  {isEditing
                    ? <input value={editing.display_name} onChange={e => setEditing({ ...editing, display_name: e.target.value })} className="bg-bg-surface border border-border rounded px-1 py-0.5 w-24" />
                    : p.display_name}
                </td>
                <td className="p-3 text-right font-mono">
                  {isEditing
                    ? <input type="number" value={editing.monthly_price_cents / 100} onChange={e => setEditing({ ...editing, monthly_price_cents: Math.round(Number(e.target.value) * 100) })} className="bg-bg-surface border border-border rounded px-1 py-0.5 w-20 text-right" />
                    : `$${(p.monthly_price_cents / 100).toFixed(0)}`}
                </td>
                <td className="p-3 text-right font-mono">
                  {isEditing
                    ? <input type="number" value={editing.annual_price_cents / 100} onChange={e => setEditing({ ...editing, annual_price_cents: Math.round(Number(e.target.value) * 100) })} className="bg-bg-surface border border-border rounded px-1 py-0.5 w-24 text-right" />
                    : `$${(p.annual_price_cents / 100).toFixed(0)}`}
                </td>
                <td className="p-3">
                  {isEditing
                    ? <input value={editing.badge_text || ''} onChange={e => setEditing({ ...editing, badge_text: e.target.value })} className="bg-bg-surface border border-border rounded px-1 py-0.5 w-24" />
                    : (p.badge_text && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent">{p.badge_text}</span>)}
                </td>
                <td className="p-3">
                  {isEditing
                    ? <input type="checkbox" checked={editing.is_featured} onChange={e => setEditing({ ...editing, is_featured: e.target.checked })} />
                    : (p.is_featured ? '✓' : '—')}
                </td>
                <td className="p-3">
                  {p.stripe_monthly_price_id
                    ? <span className="text-[9px] text-success">✓</span>
                    : <span className="text-[9px] text-danger">✗</span>}
                </td>
                <td className="p-3 text-right">
                  {isEditing ? (
                    <>
                      <button onClick={() => save(p.id, editing)} className="text-[10px] text-accent">Save</button>
                      <button onClick={() => setEditing(null)} className="text-[10px] text-text-muted ml-2">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditing(p)} className="text-[10px] text-accent">Edit</button>
                      <button onClick={() => sync(p.plan_key)} className="text-[10px] text-text-muted ml-2">Sync</button>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
