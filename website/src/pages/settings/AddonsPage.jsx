import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as addonService from '@/services/addonService'
import * as creditService from '@/services/aiCreditService'
import { getCreditPacks } from '@/config/planLimits'
import { supabase } from '@/lib/supabase'

/**
 * /settings/addons — customer-facing addon management.
 * Accessible to any authenticated user (not developer-only).
 * Shows active addons, available addons, AI credits section, and
 * a purchase history of credit transactions.
 */
export default function AddonsPage() {
  const { profile } = useAuth()
  const [activeAddons, setActiveAddons] = useState([])
  const [availableAddons, setAvailableAddons] = useState([])
  const [packs, setPacks] = useState([])
  const [balance, setBalance] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailAddon, setDetailAddon] = useState(null)
  const [currentPlan, setCurrentPlan] = useState('free')

  useEffect(() => {
    if (!profile?.property_id) return
    reload()
  }, [profile?.property_id])

  async function reload() {
    setLoading(true)
    const { data: billing } = await supabase
      .from('organization_billing')
      .select('plan_key')
      .eq('property_id', profile.property_id)
      .maybeSingle()
    const planKey = billing?.plan_key || 'free'
    setCurrentPlan(planKey)

    const [active, available, pks, bal, hist] = await Promise.all([
      addonService.getActiveAddons(profile.property_id),
      addonService.getAvailableAddons(planKey),
      getCreditPacks(),
      creditService.getCreditBalance(profile.property_id),
      creditService.getCreditHistory(profile.property_id, 20),
    ])
    setActiveAddons(active)
    setAvailableAddons(available)
    setPacks(pks)
    setBalance(bal)
    setHistory(hist)
    setLoading(false)
  }

  async function handleActivate(addonKey) {
    const r = await addonService.activateAddon(profile.property_id, addonKey)
    if (r.success) reload()
    else alert(r.error)
  }

  async function handleCancel(addonKey) {
    if (!confirm('Cancel this addon at the end of the current billing period?')) return
    const r = await addonService.cancelAddon(profile.property_id, addonKey)
    if (r.success) reload()
    else alert(r.error)
  }

  if (loading) return <div className="p-6 text-xs text-text-muted">Loading…</div>

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Add-ons & Extras</h1>
        <p className="text-xs text-text-muted mt-1">
          Expand your plan with powerful add-ons · Current plan: <span className="text-accent font-mono">{currentPlan}</span>
        </p>
      </header>

      {activeAddons.length > 0 && (
        <section>
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Active add-ons</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeAddons.map(oa => (
              <div key={oa.id} className="bg-bg-card border border-accent/30 rounded-lg p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-2xl">{oa.addons?.icon || '✨'}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{oa.addons?.display_name}</div>
                    <div className="text-[10px] text-text-muted">
                      ${(oa.addons?.monthly_price_cents / 100).toFixed(0)}/mo · {oa.cancels_at_period_end ? 'Cancels at period end' : 'Active'}
                    </div>
                  </div>
                </div>
                {!oa.cancels_at_period_end && (
                  <button onClick={() => handleCancel(oa.addon_key)} className="text-[10px] text-danger hover:underline">Cancel</button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Available add-ons</div>
        {availableAddons.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-lg p-6 text-center text-xs text-text-muted">
            No add-ons available for your current plan. Upgrade to Pro to unlock more options.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableAddons.map(a => {
              const isActive = activeAddons.some(oa => oa.addon_key === a.addon_key)
              return (
                <div key={a.id} className="bg-bg-card border border-border rounded-lg p-4 space-y-2 hover:border-accent/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl">{a.icon || '✨'}</div>
                    {a.badge_text && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent">{a.badge_text}</span>}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{a.display_name}</div>
                    <div className="text-[11px] text-text-secondary line-clamp-2 mt-1">{a.description}</div>
                  </div>
                  <div className="text-lg font-semibold text-accent">${(a.monthly_price_cents / 100).toFixed(0)}<span className="text-[10px] text-text-muted">/mo</span></div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button onClick={() => setDetailAddon(a)} className="flex-1 text-[10px] text-text-muted hover:text-accent">Details</button>
                    {isActive ? (
                      <span className="flex-1 text-center text-[10px] bg-success/15 text-success py-1 rounded">Active</span>
                    ) : (
                      <button
                        onClick={() => handleActivate(a.addon_key)}
                        className="flex-1 text-[10px] bg-accent text-bg-primary py-1 rounded font-semibold"
                      >
                        Add to plan
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* AI Credits section */}
      <section id="credits">
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">AI Credits</div>
        <p className="text-[11px] text-text-muted mb-3">
          Power your AI features. Plan credits reset monthly. Purchased credits never expire.
        </p>

        {balance && (
          <div className="bg-bg-card border border-border rounded-lg p-4 mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Current balance</div>
              <div className="text-2xl font-bold text-accent">{balance.totalRemaining}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <div className="text-text-muted">Plan credits</div>
                <div className="text-text-primary font-mono">{balance.planCreditsRemaining}</div>
              </div>
              <div>
                <div className="text-text-muted">Purchased (no expiry)</div>
                <div className="text-text-primary font-mono">{balance.purchasedCreditsRemaining}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {packs.map(p => (
            <div key={p.id} id={`credits-${p.pack_key}`} className="bg-bg-card border border-border rounded-lg p-4 space-y-2 hover:border-accent/50">
              <div className="text-sm font-semibold">{p.display_name}</div>
              <div className="text-[11px] text-text-secondary">{p.best_for_text}</div>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-xl font-bold text-accent">${(p.monthly_price_cents / 100).toFixed(0)}</span>
                <span className="text-[10px] text-text-muted">/mo recurring</span>
              </div>
              <div className="text-[10px] text-text-muted">
                Or ${(p.one_time_price_cents / 100).toFixed(0)} one-time
              </div>
              <a
                href={`/checkout/credits/${p.pack_key}`}
                className="block text-center bg-accent text-bg-primary py-2 rounded text-xs font-semibold mt-2"
              >
                Purchase
              </a>
            </div>
          ))}
        </div>

        {history.length > 0 && (
          <details className="mt-4">
            <summary className="text-[11px] text-text-muted cursor-pointer">Credit usage history</summary>
            <div className="bg-bg-card border border-border rounded-lg mt-2 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-2">When</th>
                    <th className="text-left p-2">Feature / Type</th>
                    <th className="text-right p-2">Delta</th>
                    <th className="text-right p-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-t border-border">
                      <td className="p-2 text-[10px] text-text-muted">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="p-2 text-text-secondary">{h.feature_key || h.transaction_type}</td>
                      <td className={`p-2 text-right font-mono ${h.credits_delta > 0 ? 'text-success' : 'text-text-muted'}`}>
                        {h.credits_delta > 0 ? '+' : ''}{h.credits_delta}
                      </td>
                      <td className="p-2 text-right font-mono text-text-primary">{h.credits_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {detailAddon && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setDetailAddon(null)}>
          <div className="bg-bg-primary border border-border rounded-lg max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl">{detailAddon.icon}</div>
                <h3 className="text-xl font-semibold mt-2">{detailAddon.display_name}</h3>
                <div className="text-2xl font-bold text-accent mt-1">${(detailAddon.monthly_price_cents / 100).toFixed(0)}/mo</div>
              </div>
              <button onClick={() => setDetailAddon(null)} className="text-text-muted">×</button>
            </div>
            <div className="text-sm text-text-secondary">{detailAddon.long_description || detailAddon.description}</div>
            <button
              onClick={() => { handleActivate(detailAddon.addon_key); setDetailAddon(null) }}
              className="w-full bg-accent text-bg-primary py-3 rounded-lg font-semibold"
            >
              Add to plan — ${(detailAddon.monthly_price_cents / 100).toFixed(0)}/mo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
