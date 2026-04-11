import { supabase } from '@/lib/supabase'

/**
 * Stripe price sync utilities. Called from /dev/pricing to verify
 * that database prices match Stripe and to batch-create missing prices.
 *
 * All Stripe API calls go through the stripe-billing edge function —
 * never from the browser.
 */

/**
 * Verify every plan + addon has a Stripe price ID configured and
 * that the amounts match what's in the DB.
 */
export async function verifyStripeAlignment() {
  const [plans, addons, credits] = await Promise.all([
    supabase.from('pricing_plans').select('*').eq('is_active', true),
    supabase.from('addons').select('*').eq('is_active', true),
    supabase.from('ai_credit_packs').select('*').eq('is_active', true),
  ])

  const issues = []

  for (const p of plans.data || []) {
    if (p.monthly_price_cents > 0 && !p.stripe_monthly_price_id) {
      issues.push({ type: 'plan', key: p.plan_key, severity: 'red', message: 'Missing monthly Stripe price ID' })
    }
    if (p.annual_price_cents > 0 && !p.stripe_annual_price_id) {
      issues.push({ type: 'plan', key: p.plan_key, severity: 'yellow', message: 'Missing annual Stripe price ID' })
    }
  }

  for (const a of addons.data || []) {
    if (a.monthly_price_cents > 0 && !a.stripe_monthly_price_id) {
      issues.push({ type: 'addon', key: a.addon_key, severity: 'red', message: 'Missing monthly Stripe price ID' })
    }
  }

  for (const c of credits.data || []) {
    if (c.monthly_price_cents > 0 && !c.stripe_price_id) {
      issues.push({ type: 'credit_pack', key: c.pack_key, severity: 'red', message: 'Missing Stripe price ID' })
    }
  }

  return { issues, healthy: issues.length === 0 }
}

/**
 * Create or update a Stripe price for a plan. Delegates to the
 * stripe-pricing-sync edge function which holds the Stripe secret key.
 */
export async function syncPlanToStripe(planKey) {
  const { data, error } = await supabase.functions.invoke('stripe-pricing-sync', {
    body: { action: 'sync_plan', plan_key: planKey },
  })
  if (error) return { success: false, error: error.message }
  return data
}

export async function syncAddonToStripe(addonKey) {
  const { data, error } = await supabase.functions.invoke('stripe-pricing-sync', {
    body: { action: 'sync_addon', addon_key: addonKey },
  })
  if (error) return { success: false, error: error.message }
  return data
}

export async function syncCreditPackToStripe(packKey) {
  const { data, error } = await supabase.functions.invoke('stripe-pricing-sync', {
    body: { action: 'sync_credit_pack', pack_key: packKey },
  })
  if (error) return { success: false, error: error.message }
  return data
}

/** Batch sync everything — used by the big red "sync all" button in /dev/pricing. */
export async function syncAllToStripe() {
  const { data, error } = await supabase.functions.invoke('stripe-pricing-sync', {
    body: { action: 'sync_all' },
  })
  if (error) return { success: false, error: error.message }
  return data
}
