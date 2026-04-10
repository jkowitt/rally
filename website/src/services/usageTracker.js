import { supabase } from '@/lib/supabase'
import { PLAN_LIMITS, getPlanLimit } from '@/config/planLimits'

// Monthly usage cache per property to avoid repeated queries
const cache = new Map()
const CACHE_TTL_MS = 30000

function monthStart() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function getCurrentUsage(propertyId) {
  if (!propertyId) return { deals: 0, users: 0, prospect_search: 0, contact_research: 0, contract_upload: 0, ai_valuation: 0, newsletter_generate: 0 }
  const cached = cache.get(propertyId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  const [deals, users, monthly] = await Promise.all([
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
    supabase.from('usage_tracker').select('action_type').eq('property_id', propertyId).gte('created_at', monthStart()),
  ])

  const monthlyCounts = {}
  ;(monthly.data || []).forEach(r => {
    monthlyCounts[r.action_type] = (monthlyCounts[r.action_type] || 0) + 1
  })

  const data = {
    deals: deals.count || 0,
    users: users.count || 0,
    prospect_search: monthlyCounts.prospect_search || 0,
    contact_research: monthlyCounts.contact_research || 0,
    contract_upload: monthlyCounts.contract_upload || 0,
    ai_valuation: monthlyCounts.ai_valuation || 0,
    newsletter_generate: monthlyCounts.newsletter_generate || 0,
  }
  cache.set(propertyId, { ts: Date.now(), data })
  return data
}

export async function isAtLimit(propertyId, planName, limitType) {
  const usage = await getCurrentUsage(propertyId)
  const limit = getPlanLimit(planName, limitType)
  return (usage[limitType] || 0) >= limit
}

export async function getUsagePercentage(propertyId, planName, limitType) {
  const usage = await getCurrentUsage(propertyId)
  const limit = getPlanLimit(planName, limitType)
  if (limit >= 999999) return 0
  return Math.min(100, Math.round(((usage[limitType] || 0) / limit) * 100))
}

export async function trackAction(propertyId, userId, actionType) {
  if (!propertyId || !actionType) return
  try {
    await supabase.from('usage_tracker').insert({
      property_id: propertyId,
      user_id: userId,
      action_type: actionType,
    })
    cache.delete(propertyId) // bust cache so the next read is fresh
  } catch {}
}

export function invalidateUsageCache(propertyId) {
  if (propertyId) cache.delete(propertyId)
  else cache.clear()
}
