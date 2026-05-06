import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import {
  getOrCreateProgress,
  advanceStep as advanceStepSvc,
  markStepComplete as markStepCompleteSvc,
  completeOnboarding as completeOnboardingSvc,
  skipOnboarding as skipOnboardingSvc,
  fetchChecklist,
  markChecklistItem,
  trackEvent,
} from '@/services/onboardingService'

// Onboarding is now CRM + Prospecting only — three screens:
//   1. Welcome
//   2. Add first deal (CRM)
//   3. Find prospects (Prospecting)
// Email integration is Enterprise-only and lives in Settings,
// not the universal first-run flow.
const TOTAL_STEPS = 3

// localStorage key that records the user has *seen* the modal
// at least once. Belt-and-suspenders against the modal popping
// up on subsequent logins if the DB completion write hadn't
// landed by the time the page reloaded. Per-user so multiple
// accounts on one browser don't cross-contaminate.
const seenOnceKey = (uid: string) => `ll_onboarding_seen_${uid}`

export interface OnboardingProgressRow {
  current_step?: number
  completed_steps?: number[]
  onboarding_completed?: boolean
  skipped_at?: string | null
}

export interface ChecklistItem {
  key: string
  label: string
  link?: string
  completed: boolean
  completed_at?: string | null
}

export interface UseOnboardingAPI {
  loaded: boolean
  currentStep: number
  completedSteps: number[]
  totalSteps: number
  progressPercent: number
  isOnboardingComplete: boolean
  isOnboardingSkipped: boolean
  isOnboardingVisible: boolean
  setIsOnboardingVisible: (v: boolean) => void
  advanceStep: (stepNumber: number) => Promise<void>
  markStepComplete: (stepNumber: number) => Promise<void>
  skipOnboarding: () => Promise<void>
  completeOnboarding: () => Promise<void>
  resumeOnboarding: () => void
  checklistItems: ChecklistItem[]
  updateChecklistItem: (itemKey: string) => Promise<void>
}

export function useOnboarding(): UseOnboardingAPI {
  const { profile, session } = useAuth()
  const [progress, setProgress] = useState<OnboardingProgressRow | null>(null)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [isOnboardingVisible, setIsOnboardingVisible] = useState<boolean>(false)
  const [loaded, setLoaded] = useState<boolean>(false)

  const userId = session?.user?.id || profile?.id
  const propertyId = profile?.property_id
  const isOnboardingComplete: boolean =
    Boolean((profile as { onboarding_completed?: boolean } | null)?.onboarding_completed) ||
    Boolean(progress?.onboarding_completed)
  const isOnboardingSkipped: boolean =
    Boolean((profile as { onboarding_skipped?: boolean } | null)?.onboarding_skipped) ||
    Boolean(progress?.skipped_at)

  // Load progress and checklist on mount
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function load() {
      const p = (await getOrCreateProgress(userId, propertyId)) as OnboardingProgressRow | null
      if (cancelled) return
      setProgress(p)
      setCurrentStep(p?.current_step || 1)
      setCompletedSteps(p?.completed_steps || [])
      const cl = (await fetchChecklist(userId)) as ChecklistItem[]
      if (!cancelled) setChecklistItems(cl)
      setLoaded(true)

      // First-login-only auto-show. Three independent guards must
      // all be clean for the modal to open automatically:
      //   1. DB hasn't recorded a completion or skip
      //   2. profile flags don't say complete or skipped
      //   3. localStorage hasn't recorded that we already showed
      //      this modal once for this user
      // Once we show, immediately set the localStorage flag so a
      // refresh during the flow doesn't reopen the modal on the
      // next mount — the user stays in whatever step they were on
      // but it won't *reappear* uninvited. Resume from the banner
      // still works.
      let seenOnce = false
      try { seenOnce = localStorage.getItem(seenOnceKey(userId!)) === '1' } catch { /* SSR / private mode */ }
      const shouldAutoShow =
        !seenOnce &&
        !isOnboardingComplete &&
        !isOnboardingSkipped &&
        !p?.onboarding_completed &&
        !p?.skipped_at
      if (shouldAutoShow) {
        setIsOnboardingVisible(true)
        try { localStorage.setItem(seenOnceKey(userId!), '1') } catch { /* ignore */ }
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, propertyId, isOnboardingComplete, isOnboardingSkipped])

  const advanceStep = useCallback(async (stepNumber: number) => {
    if (!userId) return
    const next = Math.min(stepNumber, TOTAL_STEPS)
    setCurrentStep(next)
    await advanceStepSvc(userId, next)
  }, [userId])

  const markStepComplete = useCallback(async (stepNumber: number) => {
    if (!userId) return
    const updated = Array.from(new Set([...completedSteps, stepNumber]))
    setCompletedSteps(updated)
    await markStepCompleteSvc(userId, stepNumber)
    trackEvent('onboarding_step_completed', { step_number: stepNumber })
  }, [userId, completedSteps])

  const skipOnboarding = useCallback(async () => {
    if (!userId) return
    await skipOnboardingSvc(userId)
    setIsOnboardingVisible(false)
    trackEvent('onboarding_dismissed', { current_step: currentStep })
  }, [userId, currentStep])

  const completeOnboarding = useCallback(async () => {
    if (!userId) return
    await completeOnboardingSvc(userId)
    setIsOnboardingVisible(false)
    // Session-scoped trigger so TooltipTour runs the feature tour
    // exactly once after onboarding completes in THIS session.
    try { sessionStorage.setItem('ll_tour_trigger', 'true') } catch { /* sessionStorage unavailable */ }
    trackEvent('onboarding_completed', {})
  }, [userId])

  const resumeOnboarding = useCallback(() => {
    setIsOnboardingVisible(true)
    trackEvent('onboarding_resumed', {})
  }, [])

  const updateChecklistItem = useCallback(async (itemKey: string) => {
    if (!userId) return
    await markChecklistItem(userId, propertyId, itemKey)
    setChecklistItems(prev => prev.map(i => i.key === itemKey ? { ...i, completed: true, completed_at: new Date().toISOString() } : i))
  }, [userId, propertyId])

  const progressPercent = Math.round((completedSteps.length / TOTAL_STEPS) * 100)

  return {
    loaded,
    currentStep,
    completedSteps,
    totalSteps: TOTAL_STEPS,
    progressPercent,
    isOnboardingComplete,
    isOnboardingSkipped,
    isOnboardingVisible,
    setIsOnboardingVisible,
    advanceStep,
    markStepComplete,
    skipOnboarding,
    completeOnboarding,
    resumeOnboarding,
    checklistItems,
    updateChecklistItem,
  }
}
