import { useNavigate } from 'react-router-dom'
import { trackEvent } from '@/services/onboardingService'

// FindProspectsStep — closes the onboarding flow. We don't try to
// inline a real prospect search here because the UI lives behind a
// long-lived modal with filters, ICP scoring, etc., and a stripped
// version would just be a worse copy. Instead this screen sets
// expectations, then hands the user off — either straight into the
// search modal, or to one of three secondary destinations they're
// likely to want to explore on their own.
export default function FindProspectsStep({ onFinish, onSkip }) {
  const navigate = useNavigate()

  function go(path, eventName) {
    if (eventName) trackEvent(eventName, {})
    onFinish() // mark step + complete onboarding
    navigate(path)
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-2">Step 3 — Prospects</div>
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight">
          Pick where to start
        </h2>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          Most reps start with the AI prospect search — describe who you want to reach and the AI returns 10–20 named matches with an ICP score and the verified decision-makers at each. The other paths are equally valid; pick whichever maps to what you're trying to do today.
        </p>
      </div>

      <div className="space-y-2">
        <PathCard
          accent
          title="Find AI prospects"
          body="Describe the ideal sponsor — industry, size, region, anything. Add the matches that fit straight into your pipeline."
          cta="Open Find Prospects"
          onClick={() => go('/app/crm/pipeline?find=1', 'find_prospects_opened_during_onboarding')}
        />
        <PathCard
          title="Bulk add a list"
          body="Have a CSV or a list of company names already? Paste it once and we enrich each row with firmographics + decision-makers."
          cta="Open Bulk Add"
          onClick={() => go('/app/crm/enrichment-queue', 'bulk_add_opened_during_onboarding')}
        />
        <PathCard
          title="Run the pipeline you have"
          body="Already added a deal in step 2? Open the board, drag it through stages, and use AI Insights to figure out the next move."
          cta="Open Pipeline"
          onClick={() => go('/app/crm/pipeline', 'pipeline_opened_during_onboarding')}
        />
      </div>

      <div className="pt-2 border-t border-border">
        <button
          onClick={onSkip}
          className="w-full text-[11px] text-text-muted hover:text-text-secondary py-1"
        >
          I'll explore on my own — show me the dashboard
        </button>
      </div>
    </div>
  )
}

function PathCard({ accent, title, body, cta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        accent
          ? 'border-accent/40 bg-accent/5 hover:border-accent'
          : 'border-border bg-bg-card hover:border-accent/40'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-sm font-medium ${accent ? 'text-accent' : 'text-text-primary'}`}>{title}</div>
          <div className="text-[12px] text-text-secondary mt-1 leading-relaxed">{body}</div>
        </div>
        <span className={`shrink-0 text-[11px] font-mono whitespace-nowrap ${accent ? 'text-accent' : 'text-text-muted'}`}>
          {cta} →
        </span>
      </div>
    </button>
  )
}
