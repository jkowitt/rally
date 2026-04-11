import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as creditService from '@/services/aiCreditService'
import { getCreditPacks } from '@/config/planLimits'

/**
 * Three components in one file — they share state and usage patterns.
 *
 *   - CreditGate        — wrapper that blocks rendering unless the user
 *                         has enough credits for a specific feature
 *   - CreditBalanceWidget — header widget showing current balance
 *   - InsufficientCreditsModal — purchase flow shown when gate trips
 */

/**
 * <CreditGate featureKey="contract_upload">
 *   <button onClick={runAI}>Parse contract</button>
 * </CreditGate>
 *
 * On mount: checks balance. If sufficient, renders children normally.
 * If insufficient, renders a lightweight "locked" wrapper that opens
 * the purchase modal on click.
 */
export function CreditGate({ featureKey, children, className = '' }) {
  const { profile } = useAuth()
  const [check, setCheck] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!profile?.property_id) return
    creditService.checkCredits(profile.property_id, featureKey).then(setCheck)
  }, [profile?.property_id, featureKey])

  if (!check) return <div className={className}>{children}</div>
  if (check.hasCredits) {
    return (
      <div className={className}>
        {children}
        <CreditBadge cost={check.creditsRequired} />
      </div>
    )
  }

  // Insufficient credits — intercept clicks on children
  return (
    <>
      <div
        className={`${className} relative opacity-60 cursor-not-allowed`}
        onClickCapture={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowModal(true)
        }}
      >
        {children}
        <CreditBadge cost={check.creditsRequired} low />
      </div>
      {showModal && (
        <InsufficientCreditsModal
          featureKey={featureKey}
          required={check.creditsRequired}
          available={check.totalRemaining}
          periodEnd={check.periodEnd}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

function CreditBadge({ cost, low = false }) {
  return (
    <span className={`inline-block ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded ${low ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent'}`}>
      {cost} credit{cost !== 1 ? 's' : ''}
    </span>
  )
}

/**
 * Header widget — shows total credits remaining with an expandable
 * detail panel on click.
 */
export function CreditBalanceWidget() {
  const { profile } = useAuth()
  const [balance, setBalance] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!profile?.property_id) return
    load()
    const interval = setInterval(load, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [profile?.property_id])

  async function load() {
    const b = await creditService.getCreditBalance(profile.property_id)
    setBalance(b)
  }

  async function openExpanded() {
    setExpanded(true)
    const h = await creditService.getCreditHistory(profile.property_id, 5)
    setHistory(h)
  }

  if (!balance) return null

  const daysUntilReset = balance.periodEnd
    ? Math.max(0, Math.floor((new Date(balance.periodEnd).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="relative">
      <button
        onClick={() => (expanded ? setExpanded(false) : openExpanded())}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-bg-card border border-border hover:border-accent/50"
      >
        <span className="text-accent">⚡</span>
        <span className="font-mono text-text-primary">{balance.totalRemaining}</span>
        <span className="text-text-muted text-[10px]">credits</span>
      </button>

      {expanded && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-bg-card border border-border rounded-lg shadow-lg p-4 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">AI Credits</span>
              <button onClick={() => setExpanded(false)} className="text-text-muted">×</button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-muted">Plan credits</span>
                <span className="text-text-primary font-mono">{balance.planCreditsRemaining}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Purchased (no expiry)</span>
                <span className="text-text-primary font-mono">{balance.purchasedCreditsRemaining}</span>
              </div>
              {daysUntilReset != null && (
                <div className="text-[10px] text-text-muted">Plan credits reset in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}</div>
              )}
            </div>

            {history.length > 0 && (
              <div className="border-t border-border mt-3 pt-3 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1">Recent activity</div>
                {history.map(h => (
                  <div key={h.id} className="flex justify-between text-[10px]">
                    <span className="text-text-secondary truncate">{h.feature_key || h.transaction_type}</span>
                    <span className={`font-mono ${h.credits_delta > 0 ? 'text-success' : 'text-text-muted'}`}>
                      {h.credits_delta > 0 ? '+' : ''}{h.credits_delta}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border mt-3 pt-3 flex gap-2">
              <Link to="/settings/addons#credits" className="flex-1 text-center bg-accent text-bg-primary py-1.5 rounded text-[11px] font-semibold">
                Buy credits
              </Link>
              <Link to="/pricing" className="flex-1 text-center border border-border py-1.5 rounded text-[11px]">
                Upgrade
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Modal shown when a CreditGate blocks an action. Lists pack options
 * and links to the addons page for purchase.
 */
export function InsufficientCreditsModal({ featureKey, required, available, periodEnd, onClose }) {
  const [packs, setPacks] = useState([])

  useEffect(() => {
    getCreditPacks().then(setPacks)
  }, [])

  const daysUntilReset = periodEnd
    ? Math.max(0, Math.floor((new Date(periodEnd).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-bg-primary border border-accent/30 rounded-lg max-w-lg w-full p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Out of credits</div>
          <h2 className="text-xl font-semibold mt-1">You need more AI credits</h2>
          <p className="text-xs text-text-muted mt-2">
            <span className="font-mono text-text-primary">{featureKey}</span> needs <strong className="text-accent">{required} credits</strong>.
            You have <strong className="text-danger">{available}</strong>.
          </p>
          {daysUntilReset != null && (
            <p className="text-[11px] text-text-muted mt-1">Plan credits reset in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}.</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Credit packs</div>
          {packs.map(p => (
            <Link
              key={p.id}
              to={`/settings/addons#credits-${p.pack_key}`}
              className="block bg-bg-card border border-border rounded-lg p-3 hover:border-accent/50"
              onClick={onClose}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-text-primary">{p.display_name}</div>
                  <div className="text-[10px] text-text-muted">{p.best_for_text}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-accent">${(p.monthly_price_cents / 100).toFixed(0)}/mo</div>
                  <div className="text-[9px] text-text-muted">or ${(p.one_time_price_cents / 100).toFixed(0)} one-time</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <button onClick={onClose} className="flex-1 border border-border text-text-secondary py-2 rounded text-xs">Cancel</button>
          <Link to="/pricing" className="flex-1 text-center bg-accent text-bg-primary py-2 rounded text-xs font-semibold">
            Upgrade plan
          </Link>
        </div>
      </div>
    </div>
  )
}
