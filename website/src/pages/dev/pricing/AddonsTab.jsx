import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as pricingService from '@/services/pricingService'

export default function AddonsTab() {
  const { profile } = useAuth()
  const [addons, setAddons] = useState([])
  const [editing, setEditing] = useState(null)

  useEffect(() => { reload() }, [])

  async function reload() {
    setAddons(await pricingService.listAddons())
  }

  async function save(addon) {
    await pricingService.updateAddon(addon.id, {
      display_name: addon.display_name,
      description: addon.description,
      long_description: addon.long_description,
      monthly_price_cents: addon.monthly_price_cents,
      icon: addon.icon,
      badge_text: addon.badge_text,
      available_for_plans: addon.available_for_plans,
      is_active: addon.is_active,
    }, profile.id)
    setEditing(null)
    reload()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {addons.map(a => {
        const isEditing = editing?.id === a.id
        return (
          <div key={a.id} className="bg-bg-card border border-border rounded-lg p-4 space-y-2">
            {isEditing ? (
              <>
                <div className="flex items-center gap-2">
                  <input value={editing.icon || ''} onChange={e => setEditing({ ...editing, icon: e.target.value })} className="bg-bg-surface border border-border rounded px-2 py-1 w-14 text-center text-xl" />
                  <input value={editing.display_name} onChange={e => setEditing({ ...editing, display_name: e.target.value })} className="flex-1 bg-bg-surface border border-border rounded px-2 py-1" />
                </div>
                <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={2} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-[11px]" placeholder="Short description" />
                <textarea value={editing.long_description || ''} onChange={e => setEditing({ ...editing, long_description: e.target.value })} rows={3} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-[11px]" placeholder="Long description" />
                <label className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted">$/mo</span>
                  <input type="number" value={editing.monthly_price_cents / 100} onChange={e => setEditing({ ...editing, monthly_price_cents: Math.round(Number(e.target.value) * 100) })} className="flex-1 bg-bg-surface border border-border rounded px-2 py-1" />
                </label>
                <div>
                  <div className="text-[10px] text-text-muted mb-1">Available for plans</div>
                  <div className="flex gap-2 flex-wrap">
                    {['free', 'starter', 'pro', 'enterprise'].map(pk => (
                      <label key={pk} className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={editing.available_for_plans?.includes(pk)}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...(editing.available_for_plans || []), pk]
                              : (editing.available_for_plans || []).filter(x => x !== pk)
                            setEditing({ ...editing, available_for_plans: next })
                          }}
                        />
                        {pk}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[11px]">
                  <input type="checkbox" checked={editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
                  Active
                </label>
                <div className="flex gap-2">
                  <button onClick={() => save(editing)} className="flex-1 bg-accent text-bg-primary py-1.5 rounded text-xs font-semibold">Save</button>
                  <button onClick={() => setEditing(null)} className="flex-1 border border-border py-1.5 rounded text-xs">Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{a.icon}</span>
                    <div>
                      <div className="text-sm font-semibold">{a.display_name}</div>
                      <div className="text-[10px] text-text-muted font-mono">{a.addon_key}</div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono ${a.is_active ? 'text-success' : 'text-text-muted'}`}>
                    {a.is_active ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary line-clamp-2">{a.description}</div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-lg font-bold text-accent">${(a.monthly_price_cents / 100).toFixed(0)}/mo</div>
                  <div className="flex gap-1">
                    {a.available_for_plans?.map(pk => (
                      <span key={pk} className="text-[9px] font-mono px-1 py-0.5 rounded bg-bg-surface text-text-muted">{pk}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => setEditing(a)} className="w-full text-[10px] border border-border py-1 rounded hover:border-accent/50">Edit</button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
