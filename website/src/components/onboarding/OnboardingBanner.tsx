import { useState } from 'react'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useAuth } from '@/hooks/useAuth'
import { useNowMinute } from '@/hooks/useNow'

const SNOOZE_KEY = 'll_onboarding_banner_snoozed_until'
const DISMISS_KEY = 'll_onboarding_banner_dismissed'

// Persistent banner that survives "skip" — keeps reminding the user
// of unfinished setup until they explicitly dismiss it for good or
// progress hits 100%. Renders inline at the top of every authed page.
export default function OnboardingBanner() {
  const { profile } = useAuth()
  const {
    loaded,
    isOnboardingComplete,
    progressPercent,
    completedSteps,
    totalSteps,
    resumeOnboarding,
  } = useOnboarding()

  const [snoozedUntil, setSnoozedUntil] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(SNOOZE_KEY) || '0', 10) || 0 } catch { return 0 }
  })
  const [dismissedForever, setDismissedForever] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === 'true' } catch { return false }
  })

  const now = useNowMinute()

  if (!loaded || !profile || dismissedForever) return null
  if (snoozedUntil > now) return null
  if (isOnboardingComplete) return null

  const stepsDone = completedSteps.length
  // Banner used to fold in a post-onboarding checklist; that surface
  // was retired (the floating Getting Started widget caused too much
  // layout grief) so progress is just the modal steps now.
  const effectiveStepsDone = stepsDone
  const combinedPercent = totalSteps > 0
    ? Math.round((effectiveStepsDone / totalSteps) * 100)
    : progressPercent

  function snoozeOneDay() {
    const until = Date.now() + 24 * 60 * 60 * 1000
    try { localStorage.setItem(SNOOZE_KEY, String(until)) } catch { /* localStorage unavailable */ }
    setSnoozedUntil(until)
  }

  function dismissForever() {
    try { localStorage.setItem(DISMISS_KEY, 'true') } catch { /* localStorage unavailable */ }
    setDismissedForever(true)
  }

  return (
    <div
      role="region"
      aria-label="Onboarding progress"
      className="bg-accent/10 border-b border-accent/30 px-4 py-2 flex flex-wrap items-center gap-3 text-xs"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-accent font-mono font-semibold uppercase tracking-wider whitespace-nowrap">
          Setup {combinedPercent}%
        </span>
        <div className="flex-1 max-w-[200px] h-1.5 bg-bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${combinedPercent}%` }}
          />
        </div>
        <span className="text-text-secondary truncate hidden sm:inline">
          {effectiveStepsDone}/{totalSteps} steps
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={resumeOnboarding}
          className="bg-accent text-bg-primary text-[11px] font-medium px-3 py-1 rounded hover:opacity-90 transition-opacity"
        >
          Continue setup
        </button>
        <button
          onClick={snoozeOneDay}
          className="text-text-muted hover:text-text-primary text-[11px]"
        >
          Snooze 24h
        </button>
        <button
          onClick={dismissForever}
          className="text-text-muted hover:text-danger text-[11px] underline-offset-2 hover:underline"
          title="Hide this banner forever"
        >
          Don't remind me
        </button>
      </div>
    </div>
  )
}
