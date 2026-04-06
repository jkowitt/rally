import { usePlanLimits } from '@/hooks/usePlanLimits'

export default function UpgradeGate({ action, children, fallback }) {
  const { canUse, getRemaining, getLimit, plan, isTrialActive, trialDaysLeft } = usePlanLimits()

  if (canUse(action)) {
    return children
  }

  if (fallback) return fallback

  const remaining = getRemaining(action)
  const limit = getLimit(action)
  const label = action.replace(/_/g, ' ')

  return (
    <div className="bg-bg-surface border border-accent/30 rounded-lg p-4 sm:p-5 text-center">
      <div className="text-2xl mb-2">🔒</div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        {label.charAt(0).toUpperCase() + label.slice(1)} limit reached
      </h3>
      <p className="text-xs text-text-secondary mb-3">
        You've used {limit} of {limit} {label}s this month on the {plan} plan.
      </p>
      <a
        href="/app/settings"
        className="inline-block bg-accent text-bg-primary px-5 py-2 rounded text-sm font-medium hover:opacity-90"
      >
        Upgrade Plan
      </a>
      <p className="text-[10px] text-text-muted mt-2">
        Starter: {action === 'prospect_search' ? '50' : action === 'contact_research' ? '50' : '25'}/month &middot;
        Pro: {action === 'prospect_search' ? '200' : action === 'contact_research' ? '200' : 'Unlimited'}/month
      </p>
    </div>
  )
}

export function UsageBadge({ action }) {
  const { getRemaining, getLimit, canUse, plan, isTrialActive } = usePlanLimits()

  if (plan === 'developer') return null

  const remaining = getRemaining(action)
  const limit = getLimit(action)

  if (limit >= 999) return null

  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
      remaining <= 0 ? 'bg-danger/10 text-danger' :
      remaining <= 3 ? 'bg-warning/10 text-warning' :
      'bg-bg-card text-text-muted'
    }`}>
      {remaining}/{limit} left
      {isTrialActive && ' (trial)'}
    </span>
  )
}

export function TrialBanner() {
  const { isTrialActive, trialDaysLeft, plan } = usePlanLimits()

  if (plan === 'developer') return null
  if (!isTrialActive && plan !== 'free') return null

  if (isTrialActive) {
    return (
      <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-2 flex items-center justify-between text-xs mb-4">
        <span className="text-accent font-medium">
          Free trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
        </span>
        <a href="/app/settings" className="text-accent hover:underline font-medium">
          Upgrade &rarr;
        </a>
      </div>
    )
  }

  if (plan === 'free') {
    return (
      <div className="bg-bg-surface border border-border rounded-lg px-4 py-2 flex items-center justify-between text-xs mb-4">
        <span className="text-text-muted">
          Free plan — limited features
        </span>
        <a href="/app/settings" className="text-accent hover:underline font-medium">
          Upgrade for full access &rarr;
        </a>
      </div>
    )
  }

  return null
}
