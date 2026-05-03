import { useState, useSyncExternalStore } from 'react'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useAuth } from '@/hooks/useAuth'

// Wall-clock store: ticks every minute, exposes a stable `Date.now()`
// snapshot to React via useSyncExternalStore so render stays pure.
// Interval auto-stops when no listeners remain so we don't leak a
// global timer when the banner unmounts.
const tickListeners = new Set()
let tickInterval = null
function ensureTick() {
  if (tickInterval) return
  tickInterval = setInterval(() => {
    for (const l of tickListeners) l()
  }, 60_000)
}
function maybeStopTick() {
  if (tickListeners.size === 0 && tickInterval) {
    clearInterval(tickInterval)
    tickInterval = null
  }
}
function subscribeTick(cb) {
  tickListeners.add(cb)
  ensureTick()
  return () => {
    tickListeners.delete(cb)
    maybeStopTick()
  }
}
function getNowSnapshot() { return Math.floor(Date.now() / 60_000) * 60_000 }

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
    checklistItems,
    resumeOnboarding,
  } = useOnboarding()

  const [snoozedUntil, setSnoozedUntil] = useState(() => {
    try { return parseInt(localStorage.getItem(SNOOZE_KEY) || '0', 10) || 0 } catch { return 0 }
  })
  const [dismissedForever, setDismissedForever] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === 'true' } catch { return false }
  })

  const now = useSyncExternalStore(subscribeTick, getNowSnapshot, getNowSnapshot)

  if (!loaded || !profile || dismissedForever) return null
  if (snoozedUntil > now) return null

  // Hide once everything is genuinely done. We use BOTH the modal
  // step completion AND the post-onboarding checklist to decide,
  // because users can finish the modal without completing the
  // checklist and vice-versa.
  const checklistDone = checklistItems.length === 0
    ? true
    : checklistItems.every(i => i.completed)
  if (isOnboardingComplete && checklistDone) return null

  const stepsDone = completedSteps.length
  const totalChecklist = checklistItems.length
  const checklistDoneCount = checklistItems.filter(i => i.completed).length

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
          Setup {progressPercent}%
        </span>
        <div className="flex-1 max-w-[200px] h-1.5 bg-bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-text-secondary truncate hidden sm:inline">
          {stepsDone}/{totalSteps} steps · {checklistDoneCount}/{totalChecklist} checklist items
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
