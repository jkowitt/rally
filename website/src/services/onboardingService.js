import { supabase } from '@/lib/supabase'

const DEFAULT_CHECKLIST_ITEMS = [
  { key: 'first_deal_added', label: 'Add your first deal', link: '/app/crm/pipeline' },
  { key: 'contract_uploaded', label: 'Upload a contract', link: '/app/crm/contracts' },
  { key: 'asset_catalog_viewed', label: 'View your asset catalog', link: '/app/crm/assets' },
  { key: 'team_member_invited', label: 'Invite a team member', link: '/app/ops/team' },
  { key: 'fulfillment_viewed', label: 'Set up your first fulfillment item', link: '/app/crm/fulfillment' },
  { key: 'ai_insights_run', label: 'Run your first AI Deal Insights', link: '/app/crm/insights' },
]

export { DEFAULT_CHECKLIST_ITEMS }

// Fetch or create the onboarding progress row for a user
export async function getOrCreateProgress(userId, propertyId) {
  if (!userId) return null
  const { data: existing } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) return existing

  const { data: created } = await supabase
    .from('onboarding_progress')
    .insert({ user_id: userId, property_id: propertyId, current_step: 1, completed_steps: [] })
    .select()
    .single()
  return created
}

export async function advanceStep(userId, stepNumber) {
  const { data } = await supabase
    .from('onboarding_progress')
    .update({ current_step: stepNumber, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  return data
}

export async function markStepComplete(userId, stepNumber) {
  const { data: current } = await supabase
    .from('onboarding_progress')
    .select('completed_steps')
    .eq('user_id', userId)
    .maybeSingle()
  const completed = Array.from(new Set([...(current?.completed_steps || []), stepNumber]))
  const { data } = await supabase
    .from('onboarding_progress')
    .update({ completed_steps: completed, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  return data
}

export async function completeOnboarding(userId) {
  await supabase.from('onboarding_progress').update({
    onboarding_completed: true,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId)
}

export async function skipOnboarding(userId) {
  await supabase.from('onboarding_progress').update({
    skipped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  await supabase.from('profiles').update({ onboarding_skipped: true }).eq('id', userId)
}

export async function fetchChecklist(userId) {
  if (!userId) return DEFAULT_CHECKLIST_ITEMS.map(i => ({ ...i, completed: false }))
  const { data } = await supabase
    .from('onboarding_checklist_items')
    .select('*')
    .eq('user_id', userId)
  const byKey = {}
  ;(data || []).forEach(d => { byKey[d.item_key] = d })
  return DEFAULT_CHECKLIST_ITEMS.map(item => ({
    ...item,
    completed: byKey[item.key]?.completed || false,
    completed_at: byKey[item.key]?.completed_at || null,
  }))
}

export async function markChecklistItem(userId, propertyId, itemKey) {
  if (!userId) return
  await supabase.from('onboarding_checklist_items').upsert({
    user_id: userId,
    property_id: propertyId,
    item_key: itemKey,
    completed: true,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'user_id,item_key' })
}

// Fire an analytics event (console-log fallback if no analytics setup)
export function trackEvent(eventName, properties = {}) {
  if (typeof window !== 'undefined' && window.analytics?.track) {
    window.analytics.track(eventName, properties)
  }
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${eventName}`, properties)
}
