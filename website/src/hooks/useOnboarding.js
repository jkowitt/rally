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

const TOTAL_STEPS = 5

export function useOnboarding() {
  const { profile, session } = useAuth()
  const [progress, setProgress] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState([])
  const [checklistItems, setChecklistItems] = useState([])
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const userId = session?.user?.id || profile?.id
  const propertyId = profile?.property_id
  const isOnboardingComplete = profile?.onboarding_completed || progress?.onboarding_completed || false
  const isOnboardingSkipped = profile?.onboarding_skipped || !!progress?.skipped_at

  // Load progress and checklist on mount
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function load() {
      const p = await getOrCreateProgress(userId, propertyId)
      if (cancelled) return
      setProgress(p)
      setCurrentStep(p?.current_step || 1)
      setCompletedSteps(p?.completed_steps || [])
      const cl = await fetchChecklist(userId)
      if (!cancelled) setChecklistItems(cl)
      setLoaded(true)
      // Auto-open onboarding for new users
      if (!isOnboardingComplete && !isOnboardingSkipped && !p?.onboarding_completed && !p?.skipped_at) {
        setIsOnboardingVisible(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, propertyId, isOnboardingComplete, isOnboardingSkipped])

  const advanceStep = useCallback(async (stepNumber) => {
    if (!userId) return
    const next = Math.min(stepNumber, TOTAL_STEPS)
    setCurrentStep(next)
    await advanceStepSvc(userId, next)
  }, [userId])

  const markStepComplete = useCallback(async (stepNumber) => {
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
    // Returning users never see the tour because they don't have
    // this flag set.
    try { sessionStorage.setItem('ll_tour_trigger', 'true') } catch {}
    trackEvent('onboarding_completed', {})
  }, [userId])

  const resumeOnboarding = useCallback(() => {
    setIsOnboardingVisible(true)
    trackEvent('onboarding_resumed', {})
  }, [])

  const updateChecklistItem = useCallback(async (itemKey) => {
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
