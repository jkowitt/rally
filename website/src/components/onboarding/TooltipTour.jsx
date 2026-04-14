import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const TOOLTIPS = [
  { selector: 'a[href="/app/crm/pipeline"]', title: 'Deal Pipeline', body: 'Your deals live here — drag and drop to update stages.' },
  { selector: 'a[href="/app/crm/contracts"]', title: 'Contract Manager', body: 'Upload contracts here — AI extracts every benefit automatically.' },
  { selector: 'a[href="/app/crm/insights"]', title: 'AI Insights', body: 'Click here for AI-powered recommendations on any deal.' },
  { selector: 'a[href="/app/crm/fulfillment"]', title: 'Fulfillment Tracker', body: 'Track delivery of every sponsor benefit here.' },
]

// localStorage key — bumped version number to invalidate if the tour changes
const TOUR_SEEN_KEY = 'll_tour_seen_v1'
// sessionStorage flag set by useOnboarding.completeOnboarding() — the tour
// ONLY runs immediately after onboarding is completed in the same session
const TOUR_TRIGGER_KEY = 'll_tour_trigger'

/**
 * Feature tour that runs ONCE, immediately after a new user completes
 * their onboarding flow. Returning users never see this.
 *
 * Four independent gates all have to pass for the tour to run:
 *   1. Profile loaded and onboarding marked complete
 *   2. profile.tooltip_tour_completed is false in the DB
 *   3. localStorage TOUR_SEEN_KEY is not set (browser-level fail-safe)
 *   4. sessionStorage TOUR_TRIGGER_KEY IS set — only the completeOnboarding
 *      call path sets this, so returning users (who didn't just complete
 *      onboarding in this session) never hit the tour
 *
 * Gate #4 is the most important — it's what distinguishes "just finished
 * onboarding" from "returning user whose DB flag happens to be false".
 *
 * The tour marks itself complete as soon as the first tooltip renders,
 * not when the user reaches the last step. That way even if the user
 * dismisses mid-tour by navigating away, it's recorded as seen and won't
 * replay on the next session.
 */
export default function TooltipTour() {
  const { profile } = useAuth()
  const [index, setIndex] = useState(-1)
  const [targetRect, setTargetRect] = useState(null)

  useEffect(() => {
    if (!profile) return
    if (!profile.onboarding_completed) return

    // Gate 1: DB flag
    if (profile.tooltip_tour_completed) return

    // Gate 2: localStorage fail-safe
    try {
      if (localStorage.getItem(TOUR_SEEN_KEY) === 'true') return
    } catch {}

    // Gate 3: session trigger — only run if completeOnboarding was
    // just called in this session. This is the returning-user guard.
    let triggered = false
    try {
      triggered = sessionStorage.getItem(TOUR_TRIGGER_KEY) === 'true'
    } catch {}
    if (!triggered) {
      // Returning user or page reload after completion — mark the tour
      // as seen in the DB so this never fires again, even if sessionStorage
      // gets cleared. This converges stale "never marked complete" state
      // back to the correct state.
      try {
        localStorage.setItem(TOUR_SEEN_KEY, 'true')
      } catch {}
      markCompleteInDb(profile.id)
      return
    }

    // Consume the session trigger so reloads during the tour don't retrigger
    try {
      sessionStorage.removeItem(TOUR_TRIGGER_KEY)
    } catch {}

    // Start tour after a small delay so the layout settles
    const timer = setTimeout(() => {
      setIndex(0)
      // Mark complete IMMEDIATELY on tour start — not when it ends.
      // Covers the case where the user dismisses by navigating away.
      try {
        localStorage.setItem(TOUR_SEEN_KEY, 'true')
      } catch {}
      markCompleteInDb(profile.id)
    }, 1000)
    return () => clearTimeout(timer)
  }, [profile])

  useEffect(() => {
    if (index < 0 || index >= TOOLTIPS.length) return
    const el = document.querySelector(TOOLTIPS[index].selector)
    if (!el) {
      // Skip to next if element not found
      next()
      return
    }
    const rect = el.getBoundingClientRect()
    setTargetRect(rect)
  }, [index])

  function finish() {
    setIndex(-1)
    // Already marked complete on tour start — nothing to persist here
  }

  function next() {
    if (index >= TOOLTIPS.length - 1) finish()
    else setIndex(index + 1)
  }

  if (index < 0 || !targetRect) return null
  const tip = TOOLTIPS[index]

  // Position tooltip relative to target
  const tooltipStyle = {
    position: 'fixed',
    top: targetRect.bottom + 8,
    left: Math.min(targetRect.left, window.innerWidth - 280),
    maxWidth: 260,
    zIndex: 201,
  }

  const ringStyle = {
    position: 'fixed',
    top: targetRect.top - 4,
    left: targetRect.left - 4,
    width: targetRect.width + 8,
    height: targetRect.height + 8,
    zIndex: 200,
    pointerEvents: 'none',
  }

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 z-[199] bg-black/60" onClick={next} />

      {/* Gold pulsing ring around target */}
      <div style={ringStyle} className="rounded-lg border-2 border-accent animate-pulse" />

      {/* Tooltip */}
      <div style={tooltipStyle} className="bg-bg-surface border border-accent/50 rounded-lg shadow-2xl p-3">
        <div className="text-xs font-semibold text-accent mb-1">{tip.title}</div>
        <div className="text-[11px] text-text-secondary mb-3 leading-relaxed">{tip.body}</div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={finish} className="text-[10px] text-text-muted hover:text-text-primary">Skip tour</button>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-text-muted">{index + 1}/{TOOLTIPS.length}</span>
            <button onClick={next} className="bg-accent text-bg-primary px-3 py-1 rounded text-[11px] font-semibold hover:opacity-90">
              {index === TOOLTIPS.length - 1 ? 'Done' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Mark the tour as complete in the profiles table. Errors are logged
 * instead of silently swallowed so future debugging is possible. The
 * localStorage flag is the primary protection against replay — this
 * DB write is a best-effort convergence back to server state.
 */
async function markCompleteInDb(userId) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ tooltip_tour_completed: true })
      .eq('id', userId)
    if (error) console.warn('[TooltipTour] Failed to mark complete:', error.message)
  } catch (err) {
    console.warn('[TooltipTour] Failed to mark complete:', err?.message || err)
  }
}
