import { useEffect } from 'react'
import { PLAN_LIMITS } from '@/config/planLimits'
import PlanComparisonTable from './PlanComparisonTable'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const TRIGGER_COPY = {
  deal_limit_approaching: {
    headline: "You're close to your deal limit",
    body: 'Free accounts include 15 deals. Upgrade to Starter for 500 deals, AI insights, and fulfillment reports.',
    features: ['500 deals included', 'AI Deal Insights on every deal', 'Bulk CSV import', 'Fulfillment reports'],
  },
  deal_limit_reached: {
    headline: "You've reached your 15-deal limit",
    body: 'Upgrade to keep your momentum going. Starter gives you 500 deals plus AI-powered insights for every one of them.',
    features: ['500 deals included', 'AI Deal Insights', 'Team goals', 'Bulk CSV import'],
  },
  ai_insights_gated: {
    headline: 'AI Deal Insights is a Starter feature',
    body: 'Get a health score, risk factors, and specific next actions for every deal in your pipeline.',
    features: ['Health score per deal', 'Next best actions', 'Risk factor detection', 'Suggested talking points'],
  },
  prospect_limit_reached: {
    headline: "You've used all your searches this month",
    body: 'Upgrade to find more sponsors and close more deals.',
    features: ['50+ searches per month', 'Verified contact lookups', 'AI-powered matching', 'Industry-specific prospecting'],
  },
  team_limit_reached: {
    headline: "You've reached your team size limit",
    body: 'Add more teammates by upgrading your plan.',
    features: ['More seats for your team', 'Role-based permissions', 'Team goals', 'Activity tracking'],
  },
  valora_gated: {
    headline: 'VALORA AI Valuations is a Pro feature',
    body: 'Get AI-powered media value estimation for every sponsorship asset. Broadcast analysis, clarity scoring, cost-per-point analysis, and market positioning — automatically.',
    features: ['AI media valuations', 'Broadcast minute analysis', 'Cost-per-point calculations', 'Market positioning insights', 'Training data history'],
  },
  sportify_gated: {
    headline: 'Sportify Events is a Pro feature',
    body: 'Manage events, activations, vendors, and run-of-show across your entire season.',
    features: ['Event management', 'Run-of-show planning', 'Vendor tracking', 'Activation coordination'],
  },
  businessnow_gated: {
    headline: 'Business Now Intelligence is a Pro feature',
    body: 'Live AI-generated business intelligence delivered daily. Market trends, competitive insights, and personalized briefings.',
    features: ['Daily AI briefings', 'Market trend analysis', 'Competitive intelligence', 'Personalized insights'],
  },
  bulk_import_gated: {
    headline: 'Bulk import is a Starter feature',
    body: 'Import hundreds of deals and contacts at once with fuzzy column matching and duplicate prevention.',
    features: ['CSV import wizard', 'Fuzzy column matching', 'Duplicate prevention', 'Company grouping'],
  },
  day_18_prompt: {
    headline: "Here's what you're missing",
    body: 'Your free account gives you a taste — upgrade to unlock the features that turn this platform into revenue.',
    features: ['Unlimited deals', 'AI insights on every deal', 'Full team collaboration', 'Contract analysis without limits'],
  },
  day_25_prompt: {
    headline: "Don't lose your data and momentum",
    body: 'Upgrade today to keep everything and unlock the features that turn this into revenue.',
    features: ['Keep all your data', 'Unlock AI insights', 'Remove deal limits', 'Team collaboration'],
  },
}

export default function UpgradeModal({ trigger, targetPlan = 'starter', isBlocking = false, showComparison = true, customHeadline, customBody, highlightFeatures, onClose, onUpgrade }) {
  const { toast } = useToast()
  const copy = TRIGGER_COPY[trigger] || { headline: 'Unlock more with an upgrade', body: 'Get access to the features that help you grow.', features: [] }
  const headline = customHeadline || copy.headline
  const body = customBody || copy.body
  const features = highlightFeatures?.length ? highlightFeatures : copy.features
  const plan = PLAN_LIMITS[targetPlan]

  useEffect(() => {
    function handleEsc(e) { if (e.key === 'Escape' && !isBlocking && onClose) onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isBlocking, onClose])

  async function handleUpgrade() {
    if (onUpgrade) return onUpgrade(targetPlan)
    // Call Stripe billing edge function
    try {
      const { data, error } = await supabase.functions.invoke('stripe-billing', {
        body: { action: 'create_checkout', plan: targetPlan },
      })
      if (error) throw error
      if (data?.url) window.location.href = data.url
    } catch (err) {
      toast({ title: 'Could not open checkout', description: err.message, type: 'error' })
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={!isBlocking ? onClose : undefined} />

      <div className="relative bg-bg-surface border border-accent/30 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        <div className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-3xl">✨</div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary">{headline}</h2>
            <p className="text-sm text-text-secondary">{body}</p>
          </div>

          {/* Features list */}
          {features.length > 0 && (
            <div className="bg-bg-card border border-accent/20 rounded-lg p-4 space-y-2">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-success text-sm shrink-0">✓</span>
                  <span className="text-xs text-text-secondary">{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Plan comparison */}
          {showComparison && <PlanComparisonTable highlightPlan={targetPlan} />}

          {/* CTAs */}
          <div className="space-y-2">
            <button onClick={handleUpgrade} className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              Upgrade to {plan.displayName} — {plan.priceLabel}
            </button>
            {!isBlocking && (
              <button onClick={onClose} className="w-full text-[11px] text-text-muted hover:text-text-secondary py-1">
                Not right now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
