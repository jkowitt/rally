import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise' | 'developer'

export interface PlanFeatures {
  ai_insights: boolean
  fulfillment_reports: boolean
  custom_dashboard: boolean
  bulk_import: boolean
  csv_export: boolean
  team_goals: boolean
}

export interface PlanLimits {
  prospect_search: number
  contact_research: number
  contract_upload: number
  ai_valuation: number
  newsletter_generate: number
  deals: number
  users: number
  modules: string[]
  features: PlanFeatures
  [key: string]: number | string[] | PlanFeatures
}

const PLAN_LIMITS: Record<Exclude<PlanId, 'developer'>, PlanLimits> = {
  free: {
    prospect_search: 3,
    contact_research: 0,
    contract_upload: 2,
    ai_valuation: 0,
    newsletter_generate: 1,
    deals: 15,
    users: 2,
    modules: ['crm'],
    features: {
      ai_insights: false,
      fulfillment_reports: false,
      custom_dashboard: false,
      bulk_import: false,
      csv_export: true,
      team_goals: false,
    },
  },
  starter: {
    prospect_search: 50,
    contact_research: 40,
    contract_upload: 25,
    ai_valuation: 25,
    newsletter_generate: 10,
    deals: 500,
    users: 5,
    modules: ['crm'],
    features: {
      ai_insights: true,
      fulfillment_reports: true,
      custom_dashboard: false,
      bulk_import: true,
      csv_export: true,
      team_goals: true,
    },
  },
  pro: {
    prospect_search: 200,
    contact_research: 160,
    contract_upload: 999999,
    ai_valuation: 200,
    newsletter_generate: 999999,
    deals: 999999,
    users: 15,
    modules: ['crm', 'sportify', 'valora', 'businessnow'],
    features: {
      ai_insights: true,
      fulfillment_reports: true,
      custom_dashboard: true,
      bulk_import: true,
      csv_export: true,
      team_goals: true,
    },
  },
  enterprise: {
    prospect_search: 999999,
    contact_research: 999999,
    contract_upload: 999999,
    ai_valuation: 999999,
    newsletter_generate: 999999,
    deals: 999999,
    users: 999999,
    modules: ['crm', 'sportify', 'valora', 'businessnow'],
    features: {
      ai_insights: true,
      fulfillment_reports: true,
      custom_dashboard: true,
      bulk_import: true,
      csv_export: true,
      team_goals: true,
    },
  },
}

export type UsageActionType =
  | 'prospect_search' | 'contact_research' | 'contract_upload'
  | 'ai_valuation' | 'newsletter_generate'

export interface UsePlanLimitsAPI {
  plan: PlanId
  limits: PlanLimits
  usage: Record<string, number>
  canUse: (actionType: UsageActionType | string) => boolean
  trackUsage: (actionType: UsageActionType | string) => Promise<void>
  isTrialActive: boolean
  trialDaysLeft: number
  showUpgrade: boolean
  getUsageCount: (actionType: string) => number
  getLimit: (actionType: string) => number
  getRemaining: (actionType: string) => number
  isOverage?: (actionType: string) => boolean
  getOverageCount?: (actionType: string) => number
}

export function usePlanLimits(): UsePlanLimitsAPI {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const plan = (profile?.properties?.plan as PlanId) || 'free'
  const isDeveloper = profile?.role === 'developer'

  // Fetch usage unconditionally — Rules of Hooks. We *use* it
  // conditionally below for non-developers.
  const { data: usageData } = useQuery({
    queryKey: ['usage-tracker', propertyId],
    queryFn: async () => {
      if (!propertyId) return []
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('usage_tracker')
        .select('action_type')
        .eq('property_id', propertyId)
        .gte('created_at', startOfMonth.toISOString())
      return (data || []) as Array<{ action_type: string }>
    },
    enabled: !!propertyId && !isDeveloper,
    refetchInterval: 60000,
  })

  // Developers have unlimited access
  if (isDeveloper) {
    return {
      plan: 'developer',
      limits: PLAN_LIMITS.enterprise,
      usage: {},
      canUse: () => true,
      trackUsage: async () => {},
      isTrialActive: true,
      trialDaysLeft: 999,
      showUpgrade: false,
      getUsageCount: () => 0,
      getLimit: () => 999999,
      getRemaining: () => 999999,
    }
  }

  const limits = PLAN_LIMITS[plan as Exclude<PlanId, 'developer'>] || PLAN_LIMITS.free

  // Count usage per action type
  const usageCounts: Record<string, number> = {}
  for (const row of usageData || []) {
    usageCounts[row.action_type] = (usageCounts[row.action_type] || 0) + 1
  }

  const trialEndsRaw = (profile?.properties as { trial_ends_at?: string } | null | undefined)?.trial_ends_at
  const trialEnds = trialEndsRaw ? new Date(trialEndsRaw) : null
  const trialActive = trialEnds ? trialEnds > new Date() : false
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000)) : 0

  function getUsageCount(actionType: string): number {
    return usageCounts[actionType] || 0
  }

  function getLimit(actionType: string): number {
    const v = limits[actionType]
    return typeof v === 'number' ? v : 0
  }

  function getRemaining(actionType: string): number {
    return Math.max(0, getLimit(actionType) - getUsageCount(actionType))
  }

  function canUse(actionType: string): boolean {
    if (trialActive) {
      const proLimit = PLAN_LIMITS.pro[actionType]
      const cap = typeof proLimit === 'number' ? proLimit : 999999
      return getUsageCount(actionType) < cap
    }
    return getUsageCount(actionType) < getLimit(actionType)
  }

  async function trackUsage(actionType: string): Promise<void> {
    if (!propertyId) return
    try {
      await supabase.from('usage_tracker').insert({
        property_id: propertyId,
        user_id: profile?.id,
        action_type: actionType,
      })
      queryClient.invalidateQueries({ queryKey: ['usage-tracker', propertyId] })
    } catch (e) {
      console.warn('Usage tracking failed:', e)
    }
  }

  function isOverage(actionType: string): boolean {
    if (plan === 'enterprise') return false
    return getUsageCount(actionType) >= getLimit(actionType)
  }

  function getOverageCount(actionType: string): number {
    return Math.max(0, getUsageCount(actionType) - getLimit(actionType))
  }

  return {
    plan,
    limits,
    usage: usageCounts,
    canUse,
    trackUsage,
    isTrialActive: trialActive,
    trialDaysLeft,
    showUpgrade: !trialActive && plan === 'free',
    getUsageCount,
    getLimit,
    getRemaining,
    isOverage,
    getOverageCount,
  }
}

export { PLAN_LIMITS }
