import { supabase } from '@/lib/supabase'
import { invalidateCache } from '@/config/planLimits'

/**
 * Pricing control plane. All mutations flow through here so we can
 * (1) log to pricing_change_history and (2) invalidate the client cache.
 */

// ─── Plans ──────────────────────────────────────────────────────────
export async function listPlans() {
  const { data } = await supabase.from('pricing_plans').select('*').order('display_order')
  return data || []
}

export async function updatePlan(id, patch, userId) {
  const { data: before } = await supabase.from('pricing_plans').select('*').eq('id', id).single()
  const { error } = await supabase
    .from('pricing_plans')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }

  // Audit each changed field
  for (const [k, v] of Object.entries(patch)) {
    if (before?.[k] !== v) {
      await logChange(userId, 'plan', 'pricing_plan', before?.plan_key, k, before?.[k], v)
    }
  }
  invalidateCache()
  return { success: true }
}

export async function createPlan(fields, userId) {
  const { data, error } = await supabase.from('pricing_plans').insert(fields).select().single()
  if (error) return { success: false, error: error.message }
  await logChange(userId, 'plan', 'pricing_plan', fields.plan_key, 'created', null, JSON.stringify(fields))
  invalidateCache()
  return { success: true, plan: data }
}

// ─── Limits ─────────────────────────────────────────────────────────
export async function listLimitsMatrix() {
  const [plans, limits] = await Promise.all([
    supabase.from('pricing_plans').select('id, plan_key, display_name').order('display_order'),
    supabase.from('plan_limits').select('*, pricing_plans(plan_key)').order('display_order'),
  ])
  return { plans: plans.data || [], limits: limits.data || [] }
}

export async function updateLimit(id, patch, userId) {
  const { data: before } = await supabase.from('plan_limits').select('*, pricing_plans(plan_key)').eq('id', id).single()
  const { error } = await supabase
    .from('plan_limits')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  for (const [k, v] of Object.entries(patch)) {
    if (before?.[k] !== v) {
      await logChange(userId, 'limit', before?.limit_key, before?.pricing_plans?.plan_key, k, before?.[k], v)
    }
  }
  invalidateCache()
  return { success: true }
}

export async function createLimitForAllPlans(limitKey, displayName, defaultValue, userId) {
  const { data: plans } = await supabase.from('pricing_plans').select('id')
  const rows = (plans || []).map(p => ({
    plan_id: p.id,
    limit_key: limitKey,
    limit_display_name: displayName,
    limit_value: defaultValue,
  }))
  const { error } = await supabase.from('plan_limits').insert(rows)
  if (error) return { success: false, error: error.message }
  await logChange(userId, 'limit', 'new_limit', limitKey, 'created', null, String(defaultValue))
  invalidateCache()
  return { success: true }
}

// ─── Features ───────────────────────────────────────────────────────
export async function listFeaturesMatrix() {
  const [plans, features] = await Promise.all([
    supabase.from('pricing_plans').select('id, plan_key, display_name').order('display_order'),
    supabase.from('plan_features').select('*, pricing_plans(plan_key)').order('display_order'),
  ])
  return { plans: plans.data || [], features: features.data || [] }
}

export async function updateFeature(id, patch, userId) {
  const { data: before } = await supabase.from('plan_features').select('*, pricing_plans(plan_key)').eq('id', id).single()
  const { error } = await supabase
    .from('plan_features')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  for (const [k, v] of Object.entries(patch)) {
    if (before?.[k] !== v) {
      await logChange(userId, 'feature', before?.feature_key, before?.pricing_plans?.plan_key, k, String(before?.[k]), String(v))
    }
  }
  invalidateCache()
  return { success: true }
}

// ─── Credit Packs ───────────────────────────────────────────────────
export async function listCreditPacks() {
  const { data } = await supabase.from('ai_credit_packs').select('*').order('display_order')
  return data || []
}

export async function updateCreditPack(id, patch, userId) {
  const { data: before } = await supabase.from('ai_credit_packs').select('*').eq('id', id).single()
  const { error } = await supabase
    .from('ai_credit_packs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  for (const [k, v] of Object.entries(patch)) {
    if (before?.[k] !== v) {
      await logChange(userId, 'credit_pack', 'ai_credit_pack', before?.pack_key, k, String(before?.[k]), String(v))
    }
  }
  invalidateCache()
  return { success: true }
}

// ─── Credit Costs ───────────────────────────────────────────────────
export async function listCreditCosts() {
  const { data } = await supabase.from('ai_credit_costs').select('*').order('feature_display_name')
  return data || []
}

export async function updateCreditCost(id, patch, userId) {
  const { data: before } = await supabase.from('ai_credit_costs').select('*').eq('id', id).single()
  const { error } = await supabase
    .from('ai_credit_costs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  for (const [k, v] of Object.entries(patch)) {
    if (before?.[k] !== v) {
      await logChange(userId, 'credit_cost', 'ai_credit_cost', before?.feature_key, k, String(before?.[k]), String(v))
    }
  }
  invalidateCache()
  return { success: true }
}

// ─── Addons ─────────────────────────────────────────────────────────
export async function listAddons() {
  const { data } = await supabase.from('addons').select('*').order('display_order')
  return data || []
}

export async function updateAddon(id, patch, userId) {
  const { data: before } = await supabase.from('addons').select('*').eq('id', id).single()
  const { error } = await supabase
    .from('addons')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  for (const [k, v] of Object.entries(patch)) {
    if (before?.[k] !== v) {
      await logChange(userId, 'addon', 'addon', before?.addon_key, k, String(before?.[k]), String(v))
    }
  }
  invalidateCache()
  return { success: true }
}

// ─── Page Config ────────────────────────────────────────────────────
export async function listPageConfig() {
  const { data } = await supabase.from('pricing_page_config').select('*').order('display_order')
  return data || []
}

export async function updatePageConfig(configKey, newValue, userId) {
  const { data: before } = await supabase.from('pricing_page_config').select('*').eq('config_key', configKey).single()
  const { error } = await supabase
    .from('pricing_page_config')
    .update({ config_value: newValue, updated_at: new Date().toISOString() })
    .eq('config_key', configKey)
  if (error) return { success: false, error: error.message }
  if (before?.config_value !== newValue) {
    await logChange(userId, 'page', 'pricing_page_config', configKey, 'config_value', before?.config_value, newValue)
  }
  invalidateCache()
  return { success: true }
}

// ─── FAQs ───────────────────────────────────────────────────────────
export async function listFaqs() {
  const { data } = await supabase.from('pricing_page_faqs').select('*').order('display_order')
  return data || []
}

export async function createFaq(fields, userId) {
  const { data, error } = await supabase.from('pricing_page_faqs').insert(fields).select().single()
  if (error) return { success: false, error: error.message }
  await logChange(userId, 'page', 'faq', null, 'created', null, fields.question)
  invalidateCache()
  return { success: true, faq: data }
}

export async function updateFaq(id, patch, userId) {
  const { error } = await supabase
    .from('pricing_page_faqs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  invalidateCache()
  return { success: true }
}

export async function deleteFaq(id) {
  const { error } = await supabase.from('pricing_page_faqs').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  invalidateCache()
  return { success: true }
}

// ─── History ────────────────────────────────────────────────────────
export async function listHistory({ type, limit = 100 } = {}) {
  let q = supabase
    .from('pricing_change_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (type && type !== 'all') q = q.eq('change_type', type)
  const { data } = await q
  return data || []
}

async function logChange(userId, changeType, entityType, entityKey, fieldName, before, after) {
  await supabase.from('pricing_change_history').insert({
    changed_by: userId,
    change_type: changeType,
    entity_type: entityType,
    entity_key: entityKey,
    field_name: fieldName,
    previous_value: before == null ? null : String(before),
    new_value: after == null ? null : String(after),
    change_summary: `${entityKey || entityType} · ${fieldName}: ${before} → ${after}`,
  })
}

// ─── Dashboard metrics ──────────────────────────────────────────────
export async function getControlCenterStats() {
  const [customers, addons, credits] = await Promise.all([
    supabase.from('organization_billing').select('plan_key, monthly_base_price_cents, billing_period'),
    supabase.from('organization_addons').select('addon_id, status').eq('status', 'active'),
    supabase.from('ai_credit_transactions').select('credits_delta, transaction_type').eq('transaction_type', 'purchase'),
  ])
  const rows = customers.data || []
  const paying = rows.filter(r => r.plan_key !== 'free')
  const mrr = paying.reduce((s, r) => {
    const monthly = r.billing_period === 'annual'
      ? (r.monthly_base_price_cents || 0)
      : (r.monthly_base_price_cents || 0)
    return s + monthly
  }, 0) / 100
  const arpu = paying.length > 0 ? mrr / paying.length : 0
  const annualCount = paying.filter(r => r.billing_period === 'annual').length
  return {
    payingCustomers: paying.length,
    mrr,
    arpu,
    activeAddons: addons.data?.length || 0,
    annualPct: paying.length > 0 ? Math.round((annualCount / paying.length) * 100) : 0,
  }
}
