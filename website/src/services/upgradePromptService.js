import { supabase } from '@/lib/supabase'
import { PLAN_LIMITS, getMinimumPlanFor } from '@/config/planLimits'
import { getCurrentUsage } from './usageTracker'
import { trackEvent } from './onboardingService'

export const TRIGGERS = {
  DEAL_LIMIT_APPROACHING: 'deal_limit_approaching',
  DEAL_LIMIT_REACHED: 'deal_limit_reached',
  AI_INSIGHTS_GATED: 'ai_insights_gated',
  PROSPECT_LIMIT_REACHED: 'prospect_limit_reached',
  TEAM_LIMIT_REACHED: 'team_limit_reached',
  VALORA_GATED: 'valora_gated',
  SPORTIFY_GATED: 'sportify_gated',
  BUSINESSNOW_GATED: 'businessnow_gated',
  BULK_IMPORT_GATED: 'bulk_import_gated',
  DAY_18_PROMPT: 'day_18_prompt',
  DAY_25_PROMPT: 'day_25_prompt',
}

// Log a prompt shown event
export async function logPromptShown(userId, propertyId, triggerEvent, targetPlan) {
  try {
    await supabase.from('upgrade_prompt_events').insert({
      user_id: userId,
      property_id: propertyId,
      trigger_event: triggerEvent,
      target_plan: targetPlan,
    })
    trackEvent('upgrade_prompt_shown', { trigger_event: triggerEvent, target_plan: targetPlan })
  } catch {}
}

export async function logPromptDismissed(userId, triggerEvent) {
  try {
    await supabase.from('upgrade_prompt_events')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('trigger_event', triggerEvent)
      .is('dismissed_at', null)
    trackEvent('upgrade_prompt_dismissed', { trigger_event: triggerEvent })
  } catch {}
}

export async function logPromptCTAClicked(triggerEvent, targetPlan) {
  trackEvent('upgrade_cta_clicked', { trigger_event: triggerEvent, target_plan: targetPlan })
}

// Check if we should show the day-18 prompt
export async function shouldShowDay18Prompt(profile) {
  if (!profile) return false
  if (profile.onboarding_completed === false) return false
  const plan = profile.properties?.plan || 'free'
  if (plan !== 'free') return false
  const accountAge = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
  if (accountAge < 18 || accountAge >= 25) return false
  // Check if user has at least 1 deal
  const { count } = await supabase.from('deals').select('*', { count: 'exact', head: true }).eq('property_id', profile.property_id)
  return (count || 0) >= 1
}

export async function shouldShowDay25Prompt(profile) {
  if (!profile) return false
  if (profile.shown_day25_prompt) return false
  const plan = profile.properties?.plan || 'free'
  if (plan !== 'free') return false
  const accountAge = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
  return accountAge >= 25
}

export async function markDay25PromptShown(userId) {
  await supabase.from('profiles').update({ shown_day25_prompt: true }).eq('id', userId)
}

// Get personalized stats for day-25 prompt
export async function getPersonalizedStats(propertyId) {
  const [deals, contracts] = await Promise.all([
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
  ])
  return { dealCount: deals.count || 0, contractCount: contracts.count || 0 }
}

// Decide which plan to recommend based on a trigger
export function getRecommendedPlan(triggerEvent, currentPlan) {
  const proOnlyTriggers = [TRIGGERS.VALORA_GATED, TRIGGERS.SPORTIFY_GATED, TRIGGERS.BUSINESSNOW_GATED]
  if (proOnlyTriggers.includes(triggerEvent)) return 'pro'
  if (currentPlan === 'free') return 'starter'
  if (currentPlan === 'starter') return 'pro'
  return 'pro'
}
