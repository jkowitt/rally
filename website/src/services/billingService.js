import { supabase } from '@/lib/supabase'

/**
 * Billing period + plan management. Wraps the existing stripe-billing
 * edge function, adding annual billing support and retention tracking.
 */

export async function getBilling(propertyId) {
  const { data } = await supabase
    .from('organization_billing')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle()
  return data
}

/** Ensure a billing row exists for the property. */
export async function ensureBillingRow(propertyId, planKey = 'free') {
  const existing = await getBilling(propertyId)
  if (existing) return existing

  const { data: plan } = await supabase
    .from('pricing_plans')
    .select('monthly_price_cents, annual_price_cents')
    .eq('plan_key', planKey)
    .single()

  const { data } = await supabase
    .from('organization_billing')
    .insert({
      property_id: propertyId,
      billing_period: 'monthly',
      plan_key: planKey,
      monthly_base_price_cents: plan?.monthly_price_cents || 0,
      annual_base_price_cents: plan?.annual_price_cents || 0,
    })
    .select()
    .single()
  return data
}

/** Switch between monthly and annual billing periods for the current plan. */
export async function switchBillingPeriod(propertyId, newPeriod) {
  const billing = await ensureBillingRow(propertyId)
  if (billing.billing_period === newPeriod) return { success: true, noop: true }

  const { data: plan } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('plan_key', billing.plan_key)
    .single()

  const priceId = newPeriod === 'annual' ? plan?.stripe_annual_price_id : plan?.stripe_monthly_price_id
  if (!priceId) return { success: false, error: `Stripe price ID not configured for ${newPeriod} billing` }

  // Invoke stripe-billing to swap the subscription
  const { data: stripeResult, error: stripeErr } = await supabase.functions.invoke('stripe-billing', {
    body: {
      action: 'switch_billing_period',
      property_id: propertyId,
      new_price_id: priceId,
      new_period: newPeriod,
    },
  })
  if (stripeErr) return { success: false, error: stripeErr.message }

  await supabase
    .from('organization_billing')
    .update({
      billing_period: newPeriod,
      updated_at: new Date().toISOString(),
    })
    .eq('property_id', propertyId)

  return { success: true, ...stripeResult }
}

/** Cancel the subscription at period end with a retention reason. */
export async function cancelSubscription(propertyId, reason) {
  const billing = await getBilling(propertyId)
  if (!billing?.stripe_subscription_id) return { success: false, error: 'No active subscription' }

  const { error: stripeErr } = await supabase.functions.invoke('stripe-billing', {
    body: {
      action: 'cancel_subscription',
      subscription_id: billing.stripe_subscription_id,
      reason,
    },
  })
  if (stripeErr) return { success: false, error: stripeErr.message }

  await supabase
    .from('organization_billing')
    .update({
      cancels_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('property_id', propertyId)

  return { success: true }
}

export async function getInvoiceHistory(propertyId, limit = 12) {
  // Pulled from Stripe via edge function — no local invoice table
  const { data } = await supabase.functions.invoke('stripe-billing', {
    body: { action: 'list_invoices', property_id: propertyId, limit },
  }).catch(() => ({ data: { invoices: [] } }))
  return data?.invoices || []
}

export const CANCELLATION_REASONS = [
  { key: 'too_expensive', label: 'Too expensive', offer: 'downgrade' },
  { key: 'missing_features', label: 'Missing features', offer: 'feedback' },
  { key: 'not_using', label: 'Not using it enough', offer: 'pause' },
  { key: 'found_alternative', label: 'Found an alternative', offer: 'feedback' },
  { key: 'other', label: 'Something else', offer: 'feedback' },
]
