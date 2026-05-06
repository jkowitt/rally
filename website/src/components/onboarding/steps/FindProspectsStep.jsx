import { useNavigate } from 'react-router-dom'
import { trackEvent } from '@/services/onboardingService'

// FindProspectsStep — closes the onboarding flow by handing the
// user off to the live Find Prospects UI. We don't try to inline
// a search here because the real search lives behind a long-lived
// modal with filters, ICP scoring, etc., and we don't want to
// duplicate that UX. Instead we explain what they're about to do
// and route them in.
export default function FindProspectsStep({ onFinish, onSkip }) {
  const navigate = useNavigate()

  function handleGo() {
    trackEvent('find_prospects_opened_during_onboarding', {})
    onFinish() // mark step + complete onboarding
    // /app/crm/pipeline auto-opens the Find Prospects modal when
    // ?find=1 is set; this is the same query param the Find
    // Prospects button on the pipeline uses.
    navigate('/app/crm/pipeline?find=1')
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-2">🎯</div>
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-1">
          Find your first prospects
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary">
          AI search returns real companies with verified contacts. Pick the ones that look like a fit and they drop straight into your pipeline.
        </p>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-4 space-y-2 text-xs text-text-secondary">
        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">What happens next</div>
        <div className="flex items-start gap-2">
          <span className="text-accent font-mono">1.</span>
          <span>Describe who you want — industry, company size, region, anything.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-accent font-mono">2.</span>
          <span>The AI returns 10–20 named matches with ICP scores and decision-makers.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-accent font-mono">3.</span>
          <span>Click any result to add it to your pipeline as a Prospect deal.</span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleGo}
          className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Open Find Prospects →
        </button>
        <button
          onClick={onSkip}
          className="w-full text-[11px] text-text-muted hover:text-text-secondary py-1"
        >
          I'll explore on my own
        </button>
      </div>
    </div>
  )
}
