// Database-driven pricing client.
//
// Every price, limit, and feature flag lives in Supabase (migration 055).
// This file is now a thin cache layer that hydrates from the DB on first
// use and refreshes every 5 minutes.
//
// Backwards compatibility: the previous hardcoded API (PLAN_LIMITS,
// planHasFeature, planHasModule, getPlanLimit, getMinimumPlanFor,
// getPlanValue, COMPARISON_ROWS) is preserved as SYNCHRONOUS getters
// that read from the in-memory cache. Existing callers don't need to
// change. The cache is seeded from sane defaults on first load (before
// the DB fetch resolves) so nothing crashes during cold start.

import { supabase } from '@/lib/supabase'

// ─── Synchronous fallback defaults (mirrors migration 055 seeds) ─────
// Used only when the DB hasn't responded yet. Matches the seed data
// exactly so existing behavior is preserved during the cold-start
// window before hydrate() completes.
const DEFAULT_PLAN_LIMITS = {
  free: {
    displayName: 'Free', price: 0, priceLabel: '$0',
    deals: 15, users: 2, prospect_search: 3, contact_research: 0,
    contract_upload: 2, ai_valuation: 0, newsletter_generate: 1,
    ai_credits_per_month: 10,
    modules: ['crm'],
    features: {
      ai_insights: false, fulfillment_reports: false, custom_dashboard: false,
      bulk_import: false, csv_export: true, team_goals: false,
      advanced_automations: false,
    },
    description: 'Perfect for getting started',
  },
  starter: {
    displayName: 'Starter', price: 39, priceLabel: '$39/mo', stripePriceId: null,
    deals: 500, users: 5, prospect_search: 50, contact_research: 40,
    contract_upload: 25, ai_valuation: 25, newsletter_generate: 10,
    ai_credits_per_month: 100,
    modules: ['crm'],
    features: {
      ai_insights: true, fulfillment_reports: true, custom_dashboard: false,
      bulk_import: true, csv_export: true, team_goals: true,
      advanced_automations: false,
    },
    description: 'For growing teams ready to scale',
  },
  pro: {
    displayName: 'Pro', price: 199, priceLabel: '$199/mo', stripePriceId: null,
    deals: 999999, users: 15, prospect_search: 200, contact_research: 160,
    contract_upload: 999999, ai_valuation: 200, newsletter_generate: 999999,
    ai_credits_per_month: 500,
    modules: ['crm', 'sportify', 'valora', 'businessnow'],
    features: {
      ai_insights: true, fulfillment_reports: true, custom_dashboard: true,
      bulk_import: true, csv_export: true, team_goals: true,
      advanced_automations: true,
    },
    description: 'Full platform access for serious operators',
  },
  enterprise: {
    displayName: 'Enterprise', price: null, priceLabel: 'Custom',
    deals: 999999, users: 999999, prospect_search: 999999,
    contact_research: 999999, contract_upload: 999999, ai_valuation: 999999,
    newsletter_generate: 999999, ai_credits_per_month: 999999,
    modules: ['crm', 'sportify', 'valora', 'businessnow'],
    features: {
      ai_insights: true, fulfillment_reports: true, custom_dashboard: true,
      bulk_import: true, csv_export: true, team_goals: true,
      advanced_automations: true, white_label: true, api_access: true,
      priority_support: true,
    },
    description: 'Unlimited everything plus priority support',
  },
}

// ─── In-memory cache ─────────────────────────────────────────────────
let cache = {
  plans: [],
  limits: DEFAULT_PLAN_LIMITS,
  features: null,
  creditCosts: {},
  creditPacks: [],
  addons: [],
  pageConfig: {},
  faqs: [],
}
let cacheExpiry = 0
let hydrating = false
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ─── Hydrate from DB ─────────────────────────────────────────────────
async function hydrateFromDb() {
  if (hydrating) return
  hydrating = true
  try {
    const [plans, limits, features, creditPacks, creditCosts, addons, pageConfig, faqs] = await Promise.all([
      supabase.from('pricing_plans').select('*').eq('is_active', true).order('display_order'),
      supabase.from('plan_limits').select('*, pricing_plans(plan_key)'),
      supabase.from('plan_features').select('*, pricing_plans(plan_key)'),
      supabase.from('ai_credit_packs').select('*').eq('is_active', true).order('display_order'),
      supabase.from('ai_credit_costs').select('*').eq('is_active', true),
      supabase.from('addons').select('*').eq('is_active', true).order('display_order'),
      supabase.from('pricing_page_config').select('*'),
      supabase.from('pricing_page_faqs').select('*').eq('is_active', true).order('display_order'),
    ])

    // Skip hydration if any call errored — keep defaults
    if (plans.error || limits.error || features.error) {
      return
    }

    // Rebuild PLAN_LIMITS shape from flat rows
    const planRows = plans.data || []
    const newLimits = {}
    const planLookup = {}
    planRows.forEach(p => {
      planLookup[p.plan_key] = p
      newLimits[p.plan_key] = {
        displayName: p.display_name,
        price: p.monthly_price_cents / 100,
        priceLabel: p.plan_key === 'enterprise' ? 'Custom' : `$${p.monthly_price_cents / 100}/mo`,
        stripePriceId: p.stripe_monthly_price_id,
        stripeAnnualPriceId: p.stripe_annual_price_id,
        annualPrice: p.annual_price_cents / 100,
        description: p.description || p.tagline,
        tagline: p.tagline,
        modules: [],
        features: {},
      }
    })

    ;(limits.data || []).forEach(l => {
      const key = l.pricing_plans?.plan_key
      if (!key || !newLimits[key]) return
      newLimits[key][l.limit_key] = l.limit_value === -1 ? 999999 : l.limit_value
    })

    ;(features.data || []).forEach(f => {
      const key = f.pricing_plans?.plan_key
      if (!key || !newLimits[key]) return
      if (f.feature_key.startsWith('module_') && f.is_enabled) {
        const module = f.feature_key.replace('module_', '')
        if (!newLimits[key].modules.includes(module)) newLimits[key].modules.push(module)
      } else {
        newLimits[key].features[f.feature_key] = f.is_enabled
      }
    })

    // Ensure crm module is always present
    Object.values(newLimits).forEach(p => {
      if (!p.modules.includes('crm')) p.modules.unshift('crm')
    })

    const creditCostMap = {}
    ;(creditCosts.data || []).forEach(c => { creditCostMap[c.feature_key] = c.credits_per_use })

    const pageConfigMap = {}
    ;(pageConfig.data || []).forEach(c => {
      let val = c.config_value
      if (c.config_type === 'boolean') val = val === 'true'
      if (c.config_type === 'number') val = Number(val)
      if (c.config_type === 'json') { try { val = JSON.parse(val) } catch {} }
      pageConfigMap[c.config_key] = val
    })

    cache = {
      plans: planRows,
      limits: newLimits,
      features: features.data,
      creditCosts: creditCostMap,
      creditPacks: creditPacks.data || [],
      addons: addons.data || [],
      pageConfig: pageConfigMap,
      faqs: faqs.data || [],
    }
    cacheExpiry = Date.now() + CACHE_TTL_MS
  } catch {
    // Keep defaults on any failure
  } finally {
    hydrating = false
  }
}

// Kick off hydration on first import — non-blocking
hydrateFromDb()

// Rehydrate if cache is stale next time something is accessed
function maybeRefresh() {
  if (Date.now() > cacheExpiry) hydrateFromDb()
}

// ─── Backwards-compatible sync API ───────────────────────────────────
// Returns the current cache (DB values if loaded, defaults otherwise).

export const PLAN_LIMITS = new Proxy({}, {
  get(_, prop) {
    maybeRefresh()
    return cache.limits[prop]
  },
  ownKeys() { return Object.keys(cache.limits) },
  getOwnPropertyDescriptor() { return { enumerable: true, configurable: true } },
})

export const COMPARISON_ROWS = [
  { key: 'deals', label: 'Deals', format: (v) => v >= 999999 ? 'Unlimited' : v.toLocaleString() },
  { key: 'users', label: 'Users', format: (v) => v >= 999999 ? 'Unlimited' : v.toString() },
  { key: 'features.ai_insights', label: 'AI Deal Insights' },
  { key: 'contract_upload', label: 'Contract Parse', format: (v) => v >= 999999 ? 'Unlimited' : `${v}/mo` },
  { key: 'features.fulfillment_reports', label: 'Fulfillment Reports' },
  { key: 'prospect_search', label: 'Prospect Searches', format: (v) => v >= 999999 ? 'Unlimited' : `${v}/mo` },
  { key: 'modules.sportify', label: 'Activations (Events & Run-of-Show)', format: (v, plan) => plan.modules.includes('sportify') },
  { key: 'modules.valora', label: 'VALORA Valuations', format: (v, plan) => plan.modules.includes('valora') },
  { key: 'features.custom_dashboard', label: 'Custom Dashboards' },
]

export function getPlanValue(plan, path) {
  return path.split('.').reduce((obj, key) => obj?.[key], plan)
}

export function planHasFeature(planName, featureKey) {
  maybeRefresh()
  const plan = cache.limits[planName] || cache.limits.free
  return plan?.features?.[featureKey] === true
}

export function planHasModule(planName, moduleName) {
  maybeRefresh()
  const plan = cache.limits[planName] || cache.limits.free
  return plan?.modules?.includes(moduleName) === true
}

export function getPlanLimit(planName, actionType) {
  maybeRefresh()
  const plan = cache.limits[planName] || cache.limits.free
  return plan?.[actionType] ?? 0
}

export function getMinimumPlanFor(featureOrAction) {
  maybeRefresh()
  const order = ['free', 'starter', 'pro', 'enterprise']
  for (const planName of order) {
    const plan = cache.limits[planName]
    if (!plan) continue
    if (plan.features?.[featureOrAction] === true) return planName
    if (plan.modules?.includes(featureOrAction)) return planName
    if (typeof plan[featureOrAction] === 'number' && plan[featureOrAction] > 0) return planName
  }
  return 'pro'
}

// ─── New async API (used by /pricing and /dev/pricing) ───────────────
export async function getAllPlans() {
  await ensureHydrated()
  return cache.plans
}

export async function getCreditPacks() {
  await ensureHydrated()
  return cache.creditPacks
}

export async function getCreditCost(featureKey) {
  await ensureHydrated()
  return cache.creditCosts[featureKey] || 0
}

export async function getAllCreditCosts() {
  await ensureHydrated()
  return cache.creditCosts
}

export async function getAddons(planKey) {
  await ensureHydrated()
  if (!planKey) return cache.addons
  return cache.addons.filter(a => a.available_for_plans?.includes(planKey))
}

export async function getPricingPageConfig() {
  await ensureHydrated()
  return cache.pageConfig
}

export async function getFaqs() {
  await ensureHydrated()
  return cache.faqs
}

async function ensureHydrated() {
  // If cache is empty (never hydrated) or expired, wait for hydration
  if (!cache.plans?.length || Date.now() > cacheExpiry) {
    await hydrateFromDb()
  }
}

// ─── Cache invalidation (called by /dev/pricing after any save) ──────
export function invalidateCache() {
  cacheExpiry = 0
  hydrateFromDb()
}

export async function refreshCache() {
  await hydrateFromDb()
  return cache
}

// Expose the cache for components that want to do their own reads
export function getRawCache() { return cache }
