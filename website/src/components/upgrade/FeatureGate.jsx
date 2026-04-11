import { useState } from 'react'
import { useUpgrade } from '@/hooks/useUpgrade'
import UpgradeModal from './UpgradeModal'
import { PLAN_LIMITS, planHasFeature, planHasModule } from '@/config/planLimits'

// Single source of truth for feature-based gating.
// Props:
//   feature — a feature key from planLimits (e.g. 'ai_insights')
//   module — a module name (e.g. 'valora')
//   trigger — which trigger to fire when gate is hit
//   targetPlan — which plan to recommend
//   children — content to show when feature is allowed
//   fallback — custom component shown instead of default gate
//   mode — 'block' (show gate instead) or 'intercept' (show children but intercept clicks)
export default function FeatureGate({ feature, module, trigger, targetPlan, children, fallback, mode = 'block' }) {
  const { plan, isDeveloper, TRIGGERS } = useUpgrade()
  const [modalOpen, setModalOpen] = useState(false)

  const hasAccess = isDeveloper ||
    (feature && planHasFeature(plan, feature)) ||
    (module && planHasModule(plan, module))

  if (hasAccess) return children

  const resolvedTrigger = trigger || (module ? `${module}_gated` : `${feature}_gated`)
  const resolvedTargetPlan = targetPlan || (module ? 'pro' : 'starter')

  const defaultFallback = (
    <div className="bg-bg-surface border border-accent/20 rounded-lg p-6 sm:p-8 text-center space-y-4">
      <div className="text-4xl">🔒</div>
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-1">
          {module ? `${module.charAt(0).toUpperCase() + module.slice(1)} is a Pro feature` : 'Upgrade to unlock'}
        </h3>
        <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
          This feature is included in the {PLAN_LIMITS[resolvedTargetPlan]?.displayName} plan. Upgrade to get access instantly.
        </p>
      </div>
      <button onClick={() => setModalOpen(true)} className="bg-accent text-bg-primary px-5 py-2 rounded text-sm font-semibold hover:opacity-90">
        See what's included →
      </button>
    </div>
  )

  return (
    <>
      {fallback || defaultFallback}
      {modalOpen && (
        <UpgradeModal
          trigger={resolvedTrigger}
          targetPlan={resolvedTargetPlan}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
