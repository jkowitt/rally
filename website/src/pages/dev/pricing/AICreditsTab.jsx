import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as pricingService from '@/services/pricingService'

export default function AICreditsTab() {
  const { profile } = useAuth()
  const [costs, setCosts] = useState([])
  const [packs, setPacks] = useState([])
  const [editingCost, setEditingCost] = useState(null)
  const [editingPack, setEditingPack] = useState(null)

  useEffect(() => { reload() }, [])

  async function reload() {
    const [c, p] = await Promise.all([
      pricingService.listCreditCosts(),
      pricingService.listCreditPacks(),
    ])
    setCosts(c)
    setPacks(p)
  }

  async function saveCost(id, value) {
    await pricingService.updateCreditCost(id, { credits_per_use: Number(value) }, profile.id)
    setEditingCost(null)
    reload()
  }

  async function savePack(pack) {
    await pricingService.updateCreditPack(pack.id, {
      credit_amount: pack.credit_amount,
      monthly_price_cents: pack.monthly_price_cents,
      one_time_price_cents: pack.one_time_price_cents,
      display_name: pack.display_name,
      best_for_text: pack.best_for_text,
      is_active: pack.is_active,
    }, profile.id)
    setEditingPack(null)
    reload()
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Credit costs per feature</div>
        <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">Feature</th>
                <th className="text-left p-3">Key</th>
                <th className="text-right p-3">Credits per use</th>
                <th className="text-left p-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {costs.map(c => {
                const isEditing = editingCost?.id === c.id
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3 text-text-primary">{c.feature_display_name}</td>
                    <td className="p-3 font-mono text-text-muted">{c.feature_key}</td>
                    <td className="p-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          defaultValue={c.credits_per_use}
                          onBlur={e => saveCost(c.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCost(c.id, e.target.value) }}
                          autoFocus
                          className="bg-bg-surface border border-accent rounded px-1 py-0.5 w-16 text-right"
                        />
                      ) : (
                        <button onClick={() => setEditingCost(c)} className="text-accent font-mono">{c.credits_per_use}</button>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`text-[9px] font-mono ${c.is_active ? 'text-success' : 'text-text-muted'}`}>
                        {c.is_active ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Credit packs</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {packs.map(p => {
            const isEditing = editingPack?.id === p.id
            return (
              <div key={p.id} className="bg-bg-card border border-border rounded-lg p-4 space-y-2">
                {isEditing ? (
                  <>
                    <input value={editingPack.display_name} onChange={e => setEditingPack({ ...editingPack, display_name: e.target.value })} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-sm" />
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <span className="text-[9px] text-text-muted">Credits</span>
                        <input type="number" value={editingPack.credit_amount} onChange={e => setEditingPack({ ...editingPack, credit_amount: Number(e.target.value) })} className="w-full bg-bg-surface border border-border rounded px-2 py-1" />
                      </label>
                      <label className="flex-1">
                        <span className="text-[9px] text-text-muted">$/mo</span>
                        <input type="number" value={editingPack.monthly_price_cents / 100} onChange={e => setEditingPack({ ...editingPack, monthly_price_cents: Math.round(Number(e.target.value) * 100) })} className="w-full bg-bg-surface border border-border rounded px-2 py-1" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-[9px] text-text-muted">One-time $</span>
                      <input type="number" value={editingPack.one_time_price_cents / 100} onChange={e => setEditingPack({ ...editingPack, one_time_price_cents: Math.round(Number(e.target.value) * 100) })} className="w-full bg-bg-surface border border-border rounded px-2 py-1" />
                    </label>
                    <input value={editingPack.best_for_text || ''} onChange={e => setEditingPack({ ...editingPack, best_for_text: e.target.value })} placeholder="Best for…" className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-[11px]" />
                    <div className="flex gap-2">
                      <button onClick={() => savePack(editingPack)} className="flex-1 bg-accent text-bg-primary py-1.5 rounded text-xs font-semibold">Save</button>
                      <button onClick={() => setEditingPack(null)} className="flex-1 border border-border py-1.5 rounded text-xs">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold">{p.display_name}</div>
                    <div className="text-2xl font-bold text-accent">{p.credit_amount.toLocaleString()}</div>
                    <div className="text-[10px] text-text-muted">credits</div>
                    <div className="text-sm">${(p.monthly_price_cents / 100).toFixed(0)}/mo</div>
                    <div className="text-[10px] text-text-muted">${(p.one_time_price_cents / 100).toFixed(0)} one-time</div>
                    <button onClick={() => setEditingPack(p)} className="w-full text-[10px] border border-border py-1 rounded hover:border-accent/50">Edit</button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
