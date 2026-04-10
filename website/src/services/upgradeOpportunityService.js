import { supabase } from '@/lib/supabase'
import { PLAN_LIMITS } from '@/config/planLimits'
import { logEvent } from './automationGate'

export async function scanUpgradeOpportunities() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, properties!profiles_property_id_fkey(id, plan)')
  if (!profiles) return { flagged: 0 }

  let flagged = 0
  for (const user of profiles) {
    const plan = user.properties?.plan || 'free'
    const propertyId = user.properties?.id
    if (!propertyId || plan === 'pro' || plan === 'enterprise') continue

    const reasons = await checkUpgradeReasons(propertyId, plan)
    for (const reason of reasons) {
      const { data: existing } = await supabase
        .from('upgrade_opportunities')
        .select('id')
        .eq('user_id', user.id)
        .eq('reason', reason)
        .is('actioned_at', null)
        .maybeSingle()
      if (existing) continue
      await supabase.from('upgrade_opportunities').insert({ user_id: user.id, reason })
      flagged++
    }
  }
  await logEvent('upgrade', 'upgrade_opportunity_scan', 'sent', { flagged })
  return { flagged }
}

async function checkUpgradeReasons(propertyId, planName) {
  const plan = PLAN_LIMITS[planName] || PLAN_LIMITS.free
  const reasons = []

  const [deals, team, contracts] = await Promise.all([
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
  ])

  // 80% of deal limit
  if ((deals.count || 0) >= plan.deals * 0.8) {
    reasons.push(`${deals.count} deals — ${Math.round((deals.count / plan.deals) * 100)}% of ${plan.displayName} limit`)
  }
  // 3+ team members
  if ((team.count || 0) >= 3) {
    reasons.push(`${team.count} team members — team is growing`)
  }
  // 3+ contracts (power user)
  if ((contracts.count || 0) >= 3) {
    reasons.push(`${contracts.count} contracts uploaded — power user signal`)
  }
  return reasons
}

export async function getActiveOpportunities() {
  const { data } = await supabase
    .from('upgrade_opportunities')
    .select('*, profiles(full_name, email, properties!profiles_property_id_fkey(plan))')
    .is('actioned_at', null)
    .is('dismissed', false)
    .order('flagged_at', { ascending: false })
  return data || []
}
