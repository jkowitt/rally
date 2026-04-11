import { supabase } from '@/lib/supabase'

/**
 * AI credit engine. Wraps every AI feature call to enforce + deduct credits.
 *
 * Ordering rules:
 *  - Plan credits (monthly reset) are consumed first
 *  - Purchased credits (never expire) are consumed second
 *  - Both balances are never allowed below zero
 *
 * checkCredits() is non-destructive. deductCredits() is destructive and
 * should only be called AFTER a successful AI API call (so a failed
 * Claude call doesn't burn credits).
 */

export class InsufficientCreditsError extends Error {
  constructor(required, available) {
    super(`Need ${required} credits, only ${available} available`)
    this.name = 'InsufficientCreditsError'
    this.required = required
    this.available = available
  }
}

/** Ensure the org has a credits row. Creates one if missing. */
async function ensureCreditsRow(propertyId, planCreditAllocation = 100) {
  const { data } = await supabase
    .from('organization_ai_credits')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle()
  if (data) return data
  const { data: created } = await supabase
    .from('organization_ai_credits')
    .insert({
      property_id: propertyId,
      plan_credits_remaining: planCreditAllocation,
      purchased_credits_remaining: 0,
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    })
    .select()
    .single()
  return created
}

/** Non-destructive check — returns balance + whether the call would succeed. */
export async function checkCredits(propertyId, featureKey) {
  const [row, cost] = await Promise.all([
    ensureCreditsRow(propertyId),
    getCreditCost(featureKey),
  ])
  const total = (row?.plan_credits_remaining || 0) + (row?.purchased_credits_remaining || 0)
  return {
    hasCredits: total >= cost,
    creditsRequired: cost,
    planCreditsRemaining: row?.plan_credits_remaining || 0,
    purchasedCreditsRemaining: row?.purchased_credits_remaining || 0,
    totalRemaining: total,
    periodEnd: row?.period_end,
  }
}

/**
 * Deduct credits from an org. Plan credits drain first, then purchased.
 * Logs a transaction row. Throws InsufficientCreditsError if balance is low.
 */
export async function deductCredits(propertyId, featureKey, userId) {
  const row = await ensureCreditsRow(propertyId)
  const cost = await getCreditCost(featureKey)
  const totalBefore = (row.plan_credits_remaining || 0) + (row.purchased_credits_remaining || 0)
  if (totalBefore < cost) {
    throw new InsufficientCreditsError(cost, totalBefore)
  }

  // Drain plan credits first
  let fromPlan = Math.min(row.plan_credits_remaining || 0, cost)
  let fromPurchased = cost - fromPlan
  const newPlan = (row.plan_credits_remaining || 0) - fromPlan
  const newPurchased = (row.purchased_credits_remaining || 0) - fromPurchased
  const totalAfter = newPlan + newPurchased

  await supabase
    .from('organization_ai_credits')
    .update({
      plan_credits_remaining: newPlan,
      purchased_credits_remaining: newPurchased,
      total_credits_used_this_period: (row.total_credits_used_this_period || 0) + cost,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  await supabase.from('ai_credit_transactions').insert({
    property_id: propertyId,
    user_id: userId,
    transaction_type: 'usage',
    feature_key: featureKey,
    credits_delta: -cost,
    credits_before: totalBefore,
    credits_after: totalAfter,
    description: `Used ${featureKey}`,
  })

  return { totalRemaining: totalAfter, planRemaining: newPlan, purchasedRemaining: newPurchased }
}

/** Add credits from a purchase / refund / adjustment. */
export async function addCredits(propertyId, amount, transactionType = 'purchase', description = '', stripePaymentIntentId = null) {
  const row = await ensureCreditsRow(propertyId)
  const before = (row.plan_credits_remaining || 0) + (row.purchased_credits_remaining || 0)
  const newPurchased = (row.purchased_credits_remaining || 0) + amount
  const after = (row.plan_credits_remaining || 0) + newPurchased

  await supabase
    .from('organization_ai_credits')
    .update({
      purchased_credits_remaining: newPurchased,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  await supabase.from('ai_credit_transactions').insert({
    property_id: propertyId,
    transaction_type: transactionType,
    credits_delta: amount,
    credits_before: before,
    credits_after: after,
    description: description || `Added ${amount} credits`,
    stripe_payment_intent_id: stripePaymentIntentId,
  })
  return { totalRemaining: after }
}

/** Monthly reset — called by the cron edge function. */
export async function resetMonthlyCredits(propertyId, planAllocation) {
  const row = await ensureCreditsRow(propertyId, planAllocation)
  const before = (row.plan_credits_remaining || 0) + (row.purchased_credits_remaining || 0)
  const newPlan = planAllocation
  const after = newPlan + (row.purchased_credits_remaining || 0)

  await supabase
    .from('organization_ai_credits')
    .update({
      plan_credits_remaining: newPlan,
      total_credits_used_this_period: 0,
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      last_reset_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  await supabase.from('ai_credit_transactions').insert({
    property_id: propertyId,
    transaction_type: 'plan_allocation',
    credits_delta: newPlan - (row.plan_credits_remaining || 0),
    credits_before: before,
    credits_after: after,
    description: 'Monthly plan credit reset',
  })
}

/** Read current balance without mutating. */
export async function getCreditBalance(propertyId) {
  const row = await ensureCreditsRow(propertyId)
  return {
    planCreditsRemaining: row?.plan_credits_remaining || 0,
    purchasedCreditsRemaining: row?.purchased_credits_remaining || 0,
    totalRemaining: (row?.plan_credits_remaining || 0) + (row?.purchased_credits_remaining || 0),
    totalUsedThisPeriod: row?.total_credits_used_this_period || 0,
    periodStart: row?.period_start,
    periodEnd: row?.period_end,
  }
}

/** Recent credit transactions for the history widget. */
export async function getCreditHistory(propertyId, limit = 20) {
  const { data } = await supabase
    .from('ai_credit_transactions')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

/** Credit cost for a feature (cached in planLimits.js). */
async function getCreditCost(featureKey) {
  const { data } = await supabase
    .from('ai_credit_costs')
    .select('credits_per_use')
    .eq('feature_key', featureKey)
    .eq('is_active', true)
    .maybeSingle()
  return data?.credits_per_use || 0
}

/**
 * Convenience wrapper — runs an async AI function with credit enforcement.
 * If credits are insufficient, throws InsufficientCreditsError BEFORE
 * calling the AI. If the AI call throws, credits are NOT deducted.
 *
 * Usage:
 *   const result = await withCredits(propertyId, 'contract_upload', userId, () =>
 *     callClaudeContractParser(pdfBuffer)
 *   )
 */
export async function withCredits(propertyId, featureKey, userId, aiCall) {
  const check = await checkCredits(propertyId, featureKey)
  if (!check.hasCredits) {
    throw new InsufficientCreditsError(check.creditsRequired, check.totalRemaining)
  }
  const result = await aiCall()
  await deductCredits(propertyId, featureKey, userId)
  return result
}
