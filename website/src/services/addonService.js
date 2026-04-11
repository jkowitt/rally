import { supabase } from '@/lib/supabase'

/**
 * Addon activation + cancellation. Stripe sync happens via the
 * stripe-billing edge function (same pattern as plan upgrades).
 */

export async function getAvailableAddons(planKey) {
  const { data } = await supabase
    .from('addons')
    .select('*')
    .eq('is_active', true)
    .contains('available_for_plans', [planKey])
    .order('display_order')
  return data || []
}

export async function getActiveAddons(propertyId) {
  const { data } = await supabase
    .from('organization_addons')
    .select('*, addons(*)')
    .eq('property_id', propertyId)
    .eq('status', 'active')
  return data || []
}

export async function isAddonActive(propertyId, addonKey) {
  const { data } = await supabase
    .from('organization_addons')
    .select('id')
    .eq('property_id', propertyId)
    .eq('addon_key', addonKey)
    .eq('status', 'active')
    .maybeSingle()
  return !!data
}

/**
 * Activate an addon — creates a Stripe subscription item via the
 * stripe-billing edge function, then writes the organization_addons row.
 */
export async function activateAddon(propertyId, addonKey, billingPeriod = 'monthly') {
  const { data: addon } = await supabase.from('addons').select('*').eq('addon_key', addonKey).single()
  if (!addon) return { success: false, error: 'Addon not found' }

  const priceId = billingPeriod === 'annual' ? addon.stripe_annual_price_id : addon.stripe_monthly_price_id
  if (!priceId) return { success: false, error: 'Stripe price ID not configured — set it in /dev/pricing/addons' }

  // Invoke stripe-billing to add the subscription item
  const { data: stripeResult, error: stripeErr } = await supabase.functions.invoke('stripe-billing', {
    body: { action: 'add_subscription_item', price_id: priceId, property_id: propertyId },
  })
  if (stripeErr) return { success: false, error: stripeErr.message }

  const { error } = await supabase.from('organization_addons').upsert({
    property_id: propertyId,
    addon_id: addon.id,
    addon_key: addonKey,
    status: 'active',
    billing_period: billingPeriod,
    stripe_subscription_item_id: stripeResult?.subscription_item_id,
    activated_at: new Date().toISOString(),
    cancelled_at: null,
    cancels_at_period_end: false,
  }, { onConflict: 'property_id,addon_id' })
  if (error) return { success: false, error: error.message }

  return { success: true }
}

export async function cancelAddon(propertyId, addonKey) {
  const { data: row } = await supabase
    .from('organization_addons')
    .select('*')
    .eq('property_id', propertyId)
    .eq('addon_key', addonKey)
    .single()
  if (!row) return { success: false, error: 'Addon not active' }

  // Cancel Stripe subscription item at period end
  if (row.stripe_subscription_item_id) {
    await supabase.functions.invoke('stripe-billing', {
      body: { action: 'cancel_subscription_item', subscription_item_id: row.stripe_subscription_item_id },
    }).catch(() => {})
  }

  await supabase.from('organization_addons').update({
    cancels_at_period_end: true,
    cancelled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', row.id)

  return { success: true }
}

/** Get merged effective limits — base plan limits plus addon overrides. */
export async function getEffectiveLimits(propertyId, planKey) {
  const [planLimits, activeAddons] = await Promise.all([
    supabase.from('plan_limits').select('*, pricing_plans!inner(plan_key)').eq('pricing_plans.plan_key', planKey),
    getActiveAddons(propertyId),
  ])
  const limits = {}
  ;(planLimits.data || []).forEach(l => {
    limits[l.limit_key] = l.limit_value
  })
  // Apply addon overrides — additive for numeric limits
  activeAddons.forEach(oa => {
    const overrides = oa.addons?.limits_increased || {}
    Object.entries(overrides).forEach(([k, v]) => {
      if (limits[k] != null && limits[k] !== -1) {
        limits[k] = limits[k] + Number(v)
      }
    })
  })
  return limits
}
