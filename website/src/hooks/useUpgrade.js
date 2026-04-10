import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { PLAN_LIMITS, planHasFeature, planHasModule } from '@/config/planLimits'
import { getCurrentUsage } from '@/services/usageTracker'
import { logPromptShown, logPromptDismissed, logPromptCTAClicked, getRecommendedPlan, TRIGGERS } from '@/services/upgradePromptService'
import { trackEvent } from '@/services/onboardingService'

// Central hook used by any component that needs to gate features or trigger upgrade prompts.
export function useUpgrade() {
  const { profile, session } = useAuth()
  const [usage, setUsage] = useState({})
  const [modalState, setModalState] = useState(null) // { trigger, targetPlan, isBlocking, ... }
  const [refreshKey, setRefreshKey] = useState(0)

  const plan = profile?.properties?.plan || 'free'
  const isDeveloper = profile?.role === 'developer'
  const propertyId = profile?.property_id
  const userId = session?.user?.id || profile?.id
  const currentPlan = PLAN_LIMITS[plan] || PLAN_LIMITS.free

  useEffect(() => {
    if (!propertyId) return
    getCurrentUsage(propertyId).then(setUsage)
  }, [propertyId, refreshKey])

  const refreshUsage = useCallback(() => setRefreshKey(k => k + 1), [])

  // Check if the current plan has a numeric limit remaining for an action
  const hasCapacity = useCallback((limitType) => {
    if (isDeveloper) return true
    const limit = currentPlan[limitType] ?? 0
    if (limit >= 999999) return true
    return (usage[limitType] || 0) < limit
  }, [currentPlan, usage, isDeveloper])

  const getRemaining = useCallback((limitType) => {
    if (isDeveloper) return 999999
    const limit = currentPlan[limitType] ?? 0
    return Math.max(0, limit - (usage[limitType] || 0))
  }, [currentPlan, usage, isDeveloper])

  const getUsagePct = useCallback((limitType) => {
    if (isDeveloper) return 0
    const limit = currentPlan[limitType] ?? 0
    if (limit >= 999999) return 0
    return Math.min(100, Math.round(((usage[limitType] || 0) / limit) * 100))
  }, [currentPlan, usage, isDeveloper])

  // Feature gating
  const hasFeature = useCallback((featureKey) => {
    if (isDeveloper) return true
    return planHasFeature(plan, featureKey)
  }, [plan, isDeveloper])

  const hasModule = useCallback((moduleName) => {
    if (isDeveloper) return true
    return planHasModule(plan, moduleName)
  }, [plan, isDeveloper])

  // Trigger an upgrade modal
  const showUpgradeModal = useCallback((trigger, options = {}) => {
    const targetPlan = options.targetPlan || getRecommendedPlan(trigger, plan)
    setModalState({
      trigger,
      targetPlan,
      isBlocking: options.isBlocking || false,
      showComparison: options.showComparison ?? true,
      headline: options.headline,
      body: options.body,
      highlightFeatures: options.highlightFeatures || [],
    })
    logPromptShown(userId, propertyId, trigger, targetPlan)
  }, [userId, propertyId, plan])

  const dismissModal = useCallback(() => {
    if (modalState) logPromptDismissed(userId, modalState.trigger)
    setModalState(null)
  }, [modalState, userId])

  const clickUpgradeCTA = useCallback((targetPlan) => {
    if (modalState) logPromptCTAClicked(modalState.trigger, targetPlan)
    trackEvent('upgrade_cta_clicked', { trigger: modalState?.trigger, target_plan: targetPlan })
  }, [modalState])

  return {
    plan,
    currentPlan,
    isDeveloper,
    usage,
    refreshUsage,
    hasCapacity,
    getRemaining,
    getUsagePct,
    hasFeature,
    hasModule,
    showUpgradeModal,
    modalState,
    dismissModal,
    clickUpgradeCTA,
    TRIGGERS,
  }
}
