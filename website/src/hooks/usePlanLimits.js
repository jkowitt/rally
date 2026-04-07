import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    prospect_search: 3,
    contact_research: 0,
    contract_upload: 2,
    ai_valuation: 0,
    newsletter_generate: 1,
    deals: 15,
    users: 3,
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
    users: 10,
    modules: ['crm', 'sportify'],
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
    contract_upload: 999,
    ai_valuation: 200,
    newsletter_generate: 999,
    deals: 999999,
    users: 999,
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

export function usePlanLimits() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const propertyId = profile?.property_id
  const plan = profile?.properties?.plan || 'free'
  const isDeveloper = profile?.role === 'developer'

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

  // Get current month's usage
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
      return data || []
    },
    enabled: !!propertyId,
    refetchInterval: 60000,
  })

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

  // Count usage per action type
  const usageCounts = {}
  for (const row of usageData || []) {
    usageCounts[row.action_type] = (usageCounts[row.action_type] || 0) + 1
  }

  // Trial check
  const trialEnds = profile?.properties?.trial_ends_at ? new Date(profile.properties.trial_ends_at) : null
  const trialActive = trialEnds ? trialEnds > new Date() : false
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - new Date()) / 86400000)) : 0

  function getUsageCount(actionType) {
    return usageCounts[actionType] || 0
  }

  function getLimit(actionType) {
    return limits[actionType] || 0
  }

  function getRemaining(actionType) {
    return Math.max(0, getLimit(actionType) - getUsageCount(actionType))
  }

  function canUse(actionType) {
    if (isDeveloper) return true
    // During trial, use pro limits
    if (trialActive) return getUsageCount(actionType) < (PLAN_LIMITS.pro[actionType] || 999999)
    return getUsageCount(actionType) < getLimit(actionType)
  }

  async function trackUsage(actionType) {
    if (isDeveloper) return
    if (!propertyId) return
    try {
      await supabase.from('usage_tracker').insert({
        property_id: propertyId,
        user_id: profile?.id,
        action_type: actionType,
      })
      queryClient.invalidateQueries({ queryKey: ['usage-tracker', propertyId] })
    } catch (e) { console.warn('Usage tracking failed:', e) }
  }

  function isOverage(actionType) {
    if (isDeveloper || plan === 'enterprise') return false
    return getUsageCount(actionType) >= getLimit(actionType)
  }

  function getOverageCount(actionType) {
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
