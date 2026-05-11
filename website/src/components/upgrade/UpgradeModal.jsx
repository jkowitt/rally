import { useEffect } from 'react'
import { PLAN_LIMITS } from '@/config/planLimits'
import PlanComparisonTable from './PlanComparisonTable'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const TRIGGER_COPY = {
  deal_limit_approaching: {
    headline: "You're close to your deal limit",
    body: 'Free accounts cap at 25 deals. Starter ($39/mo) gives you 500 deals plus a daily AI Brief, lookalikes, and live signal radar.',
    features: ['500 deals included', 'Daily AI Brief with live refresh', 'Lookalikes + ICP filters', 'Signal radar (read-only)'],
  },
  deal_limit_reached: {
    headline: "You've hit your 25-deal limit",
    body: 'Upgrade to keep your momentum going. Starter ($39/mo) gives you 500 deals plus the daily AI Brief.',
    features: ['500 deals included', 'Daily AI Brief', 'Lookalikes + signal radar', 'Stale-deal alerts'],
  },
  ai_insights_gated: {
    headline: 'AI Deal Insights is a Pro feature',
    body: 'Get a health score, risk factors, and specific next actions on every deal — powered by the background research agent.',
    features: ['Background research agent on every deal', 'Health score + risk flags', 'Next-action recommendations', 'Comparable closed-won deals'],
  },
  prospect_limit_reached: {
    headline: "You've used all your prospect lookups this month",
    body: 'Upgrade for a bigger monthly pool, or buy +100 lookups for $15 from Settings → Billing.',
    features: ['Starter: 100 lookups / mo', 'Pro: 500 lookups / mo (pooled)', 'Enterprise: 2,500 lookups / mo', 'Top-up: $15 for +100 lookups'],
  },
  team_limit_reached: {
    headline: "You've reached your team size limit",
    body: 'Pro ($99/mo) supports unlimited users. Add teammates without surprise per-seat bills.',
    features: ['Unlimited users on Pro', 'Role-based permissions', 'Custom dashboards', 'Audit log'],
  },
  ai_capture_gated: {
    headline: 'AI call + meeting capture is an Enterprise feature',
    body: 'Record a sales call or drop a Zoom export — AI transcribes, summarizes, scores buying intent, and creates tasks for every commitment your team made. Enterprise tier ($249/mo).',
    features: ['In-browser recording + file upload', 'Auto-transcription via Whisper', 'Sentiment + commitment scoring', 'Action items become tasks automatically', '50 captures / user / day'],
  },
  email_integration_gated: {
    headline: 'Outlook + Gmail integration is Enterprise',
    body: 'Send from the CRM with open + click tracking. Inbound replies auto-log to the deal timeline. AI reply suggestions in one click.',
    features: ['Full inbox sync (Outlook + Gmail)', 'Send-from-CRM with your signature', 'Open + click tracking', 'AI reply suggestions', 'Auto-log to deal timeline'],
  },
  valora_gated: {
    headline: 'VALORA AI Valuations is an add-on',
    body: 'AI-powered media value estimation for every sponsorship asset. Broadcast analysis, cost-per-point analysis, and market positioning — automatically.',
    features: ['AI media valuations', 'Broadcast minute analysis', 'Cost-per-point calculations', 'Market positioning insights'],
  },
  sportify_gated: {
    headline: 'Activations is an add-on',
    body: 'Manage events, vendors, and run-of-show across your entire season.',
    features: ['Event management', 'Run-of-show planning', 'Vendor tracking', 'Activation coordination'],
  },
  businessnow_gated: {
    headline: 'Business Now Intelligence is an add-on',
    body: 'Live AI-generated business intelligence delivered daily. Market trends, competitive insights, and personalized briefings.',
    features: ['Daily AI briefings', 'Market trend analysis', 'Competitive intelligence', 'Personalized insights'],
  },
  bulk_import_gated: {
    headline: 'Bulk Add is a Pro feature',
    body: 'Paste a list or upload a CSV; AI enriches each row with firmographics and decision-makers, then you click Add to CRM.',
    features: ['Paste or CSV import', 'Automatic AI enrichment', 'Verified email scoring', 'One-click Add to CRM'],
  },
  day_18_prompt: {
    headline: "Here's what you're missing",
    body: 'Pro ($99/mo) replaces the HubSpot + Apollo stack most teams pay $189/seat for — one tool with AI that sees both halves of your funnel.',
    features: ['Background AI research agent', 'AI sequence builder + email coach', 'Unlimited users', 'Bulk Add + CSV with AI enrichment'],
  },
  day_25_prompt: {
    headline: "Don't lose your momentum",
    body: 'Upgrade today to keep everything plus unlock the AI agent that surfaces 5 prospects, 5 emails, and 3 deals to push every morning.',
    features: ['Daily AI Brief with live refresh', 'Background research on every deal', 'Unlimited users on Pro', 'AI call capture on Enterprise'],
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
