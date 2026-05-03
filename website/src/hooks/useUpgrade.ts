import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { PLAN_LIMITS, planHasFeature, planHasModule } from '@/config/planLimits'
import { getCurrentUsage } from '@/services/usageTracker'
import { logPromptShown, logPromptDismissed, logPromptCTAClicked, getRecommendedPlan, TRIGGERS } from '@/services/upgradePromptService'
import { trackEvent } from '@/services/onboardingService'

export type Plan = 'free' | 'starter' | 'pro' | 'enterprise' | string

export interface PlanConfig {
  [key: string]: number | boolean | string | undefined
}

export type UsageMap = Record<string, number>

export interface UpgradeModalOptions {
  targetPlan?: Plan
  isBlocking?: boolean
  showComparison?: boolean
  headline?: string
  body?: string
  highlightFeatures?: string[]
}

export interface UpgradeModalState {
  trigger: string
  targetPlan: Plan
  isBlocking: boolean
  showComparison: boolean
  headline?: string
  body?: string
  highlightFeatures: string[]
}

export interface UseUpgradeAPI {
  plan: Plan
  currentPlan: PlanConfig
  isDeveloper: boolean
  usage: UsageMap
  refreshUsage: () => void
  hasCapacity: (limitType: string) => boolean
  getRemaining: (limitType: string) => number
  getUsagePct: (limitType: string) => number
  hasFeature: (featureKey: string) => boolean
  hasModule: (moduleName: string) => boolean
  showUpgradeModal: (trigger: string, options?: UpgradeModalOptions) => void
  modalState: UpgradeModalState | null
  dismissModal: () => void
  clickUpgradeCTA: (targetPlan: Plan) => void
  TRIGGERS: Record<string, string>
}

// Central hook used by any component that needs to gate features
// or trigger upgrade prompts. The plan-config and trigger services
// are still in JS — this wrapper gives consumers typed access to
// the API surface even before those services migrate.
export function useUpgrade(): UseUpgradeAPI {
  const { profile, session } = useAuth()
  const [usage, setUsage] = useState<UsageMap>({})
  const [modalState, setModalState] = useState<UpgradeModalState | null>(null)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  const plan = (profile?.properties?.plan as Plan) || 'free'
  const isDeveloper = profile?.role === 'developer'
  const propertyId = profile?.property_id
  const userId = session?.user?.id || profile?.id
  const planLimits = PLAN_LIMITS as Record<string, PlanConfig>
  const currentPlan = planLimits[plan] || planLimits.free || {}

  useEffect(() => {
    if (!propertyId) return
    ;(getCurrentUsage(propertyId) as Promise<UsageMap>).then(setUsage)
  }, [propertyId, refreshKey])

  const refreshUsage = useCallback(() => setRefreshKey(k => k + 1), [])

  const hasCapacity = useCallback((limitType: string) => {
    if (isDeveloper) return true
    const limit = (currentPlan[limitType] as number | undefined) ?? 0
    if (limit >= 999999) return true
    return (usage[limitType] || 0) < limit
  }, [currentPlan, usage, isDeveloper])

  const getRemaining = useCallback((limitType: string) => {
    if (isDeveloper) return 999999
    const limit = (currentPlan[limitType] as number | undefined) ?? 0
    return Math.max(0, limit - (usage[limitType] || 0))
  }, [currentPlan, usage, isDeveloper])

  const getUsagePct = useCallback((limitType: string) => {
    if (isDeveloper) return 0
    const limit = (currentPlan[limitType] as number | undefined) ?? 0
    if (limit >= 999999) return 0
    return Math.min(100, Math.round(((usage[limitType] || 0) / limit) * 100))
  }, [currentPlan, usage, isDeveloper])

  const hasFeature = useCallback((featureKey: string) => {
    if (isDeveloper) return true
    return planHasFeature(plan, featureKey)
  }, [plan, isDeveloper])

  const hasModule = useCallback((moduleName: string) => {
    if (isDeveloper) return true
    return planHasModule(plan, moduleName)
  }, [plan, isDeveloper])

  const showUpgradeModal = useCallback((trigger: string, options: UpgradeModalOptions = {}) => {
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

  const clickUpgradeCTA = useCallback((targetPlan: Plan) => {
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
