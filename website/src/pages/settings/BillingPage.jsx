import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as billingService from '@/services/billingService'

/**
 * /settings/billing — plan + billing period + cancellation retention flow.
 */
export default function BillingPage() {
  const { profile } = useAuth()
  const [billing, setBilling] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [showRetention, setShowRetention] = useState(false)

  useEffect(() => { if (profile?.property_id) reload() }, [profile?.property_id])

  async function reload() {
    setLoading(true)
    const [b, inv] = await Promise.all([
      billingService.ensureBillingRow(profile.property_id),
      billingService.getInvoiceHistory(profile.property_id, 12),
    ])
    setBilling(b)
    setInvoices(inv)
    setLoading(false)
  }

  async function switchToAnnual() {
    if (!confirm(`Switch to annual billing? You'll be charged $${((billing.annual_base_price_cents || 0) / 100).toFixed(0)} today and save 2 months per year.`)) return
    setSwitching(true)
    const r = await billingService.switchBillingPeriod(profile.property_id, 'annual')
    setSwitching(false)
    if (r.success) reload()
    else alert(r.error)
  }

  if (loading || !billing) return <div className="p-6 text-xs text-text-muted">Loading…</div>

  const monthly = (billing.monthly_base_price_cents || 0) / 100
  const annual = (billing.annual_base_price_cents || 0) / 100
  const annualMonthly = annual / 12
  const savings = monthly * 12 - annual

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-xs text-text-muted mt-1">Plan, billing period, and invoice history</p>
      </header>

      <section className="bg-bg-card border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Current plan</div>
            <div className="text-xl font-bold capitalize">{billing.plan_key}</div>
            <div className="text-[11px] text-text-muted">
              Billed {billing.billing_period} — ${billing.billing_period === 'annual' ? annual.toFixed(0) : monthly.toFixed(0)}/{billing.billing_period === 'annual' ? 'year' : 'month'}
            </div>
          </div>
          {billing.plan_key !== 'free' && (
            <a href="/pricing" className="text-[11px] text-accent hover:underline">Change plan</a>
          )}
        </div>

        {billing.current_period_end && (
          <div className="text-[11px] text-text-muted pt-2 border-t border-border">
            Next charge: {new Date(billing.current_period_end).toLocaleDateString()}
          </div>
        )}

        {billing.billing_period === 'monthly' && billing.plan_key !== 'free' && annual > 0 && (
          <div className="bg-accent/5 border border-accent/30 rounded p-3 space-y-2">
            <div className="text-xs">
              Switch to annual and save <strong className="text-accent">${savings.toFixed(0)}/year</strong>
              <span className="text-text-muted"> (${annualMonthly.toFixed(2)}/mo equivalent)</span>
            </div>
            <button
              onClick={switchToAnnual}
              disabled={switching}
              className="w-full bg-accent text-bg-primary py-2 rounded text-xs font-semibold disabled:opacity-50"
            >
              {switching ? 'Switching…' : `Switch to annual — $${annual.toFixed(0)}/year`}
            </button>
          </div>
        )}
      </section>

      <section className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Invoice history</div>
        </div>
        {invoices.length === 0 ? (
          <div className="p-4 text-xs text-text-muted text-center">No invoices yet</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Description</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="p-3 text-text-muted">{new Date(inv.created * 1000).toLocaleDateString()}</td>
                  <td className="p-3 text-text-secondary">{inv.description || 'Subscription'}</td>
                  <td className="p-3 text-right font-mono">${(inv.amount_paid / 100).toFixed(2)}</td>
                  <td className="p-3 text-right">
                    {inv.hosted_invoice_url && (
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noopener" className="text-[10px] text-accent">View</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {billing.plan_key !== 'free' && !billing.cancels_at_period_end && (
        <section className="border border-danger/30 rounded-lg p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-danger mb-2">Danger zone</div>
          <button onClick={() => setShowRetention(true)} className="text-xs text-danger hover:underline">
            Cancel subscription
          </button>
        </section>
      )}

      {showRetention && (
        <RetentionFlow onClose={() => { setShowRetention(false); reload() }} propertyId={profile.property_id} />
      )}
    </div>
  )
}

function RetentionFlow({ propertyId, onClose }) {
  const [step, setStep] = useState(1)
  const [reason, setReason] = useState('')

  async function confirmCancel() {
    await billingService.cancelSubscription(propertyId, reason)
    setStep(4)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-lg max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        {step === 1 && (
          <>
            <h3 className="text-lg font-semibold">Are you sure?</h3>
            <p className="text-xs text-text-muted">Cancelling will disable these features at the end of your billing period:</p>
            <ul className="text-xs text-text-secondary space-y-1 ml-4 list-disc">
              <li>AI contract parsing</li>
              <li>Deal insights and pipeline forecasting</li>
              <li>Automated brand reports</li>
              <li>All premium modules</li>
            </ul>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 bg-accent text-bg-primary py-2 rounded text-xs font-semibold">Never mind</button>
              <button onClick={() => setStep(2)} className="flex-1 border border-danger/30 text-danger py-2 rounded text-xs">Continue</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-lg font-semibold">Can we help?</h3>
            <p className="text-xs text-text-muted">What's the reason for cancelling?</p>
            <div className="space-y-1">
              {billingService.CANCELLATION_REASONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => { setReason(r.key); setStep(3) }}
                  className="w-full text-left text-xs bg-bg-card border border-border rounded p-2 hover:border-accent/50"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="text-lg font-semibold">Final confirmation</h3>
            <p className="text-xs text-text-muted">
              Your subscription will stay active until the end of your current billing period, then cancel automatically.
            </p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 bg-accent text-bg-primary py-2 rounded text-xs font-semibold">Keep my plan</button>
              <button onClick={confirmCancel} className="flex-1 border border-danger/30 text-danger py-2 rounded text-xs">
                Cancel at period end
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3 className="text-lg font-semibold text-success">Cancelled</h3>
            <p className="text-xs text-text-muted">
              Your subscription will end at the close of the current billing period. You can reactivate any time before then.
            </p>
            <button onClick={onClose} className="w-full bg-accent text-bg-primary py-2 rounded text-xs font-semibold">Close</button>
          </>
        )}
      </div>
    </div>
  )
}
