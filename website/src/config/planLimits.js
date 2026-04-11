// Single source of truth for plan limits and feature access.
// Every component that gates features MUST read from this file.

export const PLAN_LIMITS = {
  free: {
    displayName: 'Free',
    price: 0,
    priceLabel: '$0',
    deals: 15,
    users: 2,
    prospect_search: 3,
    contact_research: 0,
    contract_upload: 2,
    ai_valuation: 0,
    newsletter_generate: 1,
    modules: ['crm'],
    features: {
      ai_insights: false,
      fulfillment_reports: false,
      custom_dashboard: false,
      bulk_import: false,
      csv_export: true,
      team_goals: false,
      advanced_automations: false,
    },
    description: 'Perfect for getting started',
  },
  starter: {
    displayName: 'Starter',
    price: 39,
    priceLabel: '$39/mo',
    stripePriceId: null, // set via env or Stripe dashboard
    deals: 500,
    users: 5,
    prospect_search: 50,
    contact_research: 40,
    contract_upload: 25,
    ai_valuation: 25,
    newsletter_generate: 10,
    modules: ['crm'],
    features: {
      ai_insights: true,
      fulfillment_reports: true,
      custom_dashboard: false,
      bulk_import: true,
      csv_export: true,
      team_goals: true,
      advanced_automations: false,
    },
    description: 'For growing teams ready to scale',
  },
  pro: {
    displayName: 'Pro',
    price: 199,
    priceLabel: '$199/mo',
    stripePriceId: null,
    deals: 999999,
    users: 15,
    prospect_search: 200,
    contact_research: 160,
    contract_upload: 999999,
    ai_valuation: 200,
    newsletter_generate: 999999,
    modules: ['crm', 'sportify', 'valora', 'businessnow'],
    features: {
      ai_insights: true,
      fulfillment_reports: true,
      custom_dashboard: true,
      bulk_import: true,
      csv_export: true,
      team_goals: true,
      advanced_automations: true,
    },
    description: 'Full platform access for serious operators',
  },
  enterprise: {
    displayName: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    deals: 999999,
    users: 999999,
    prospect_search: 999999,
    contact_research: 999999,
    contract_upload: 999999,
    ai_valuation: 999999,
    newsletter_generate: 999999,
    modules: ['crm', 'sportify', 'valora', 'businessnow'],
    features: {
      ai_insights: true,
      fulfillment_reports: true,
      custom_dashboard: true,
      bulk_import: true,
      csv_export: true,
      team_goals: true,
      advanced_automations: true,
    },
    description: 'Unlimited everything plus priority support',
  },
}

// Feature comparison rows for the upgrade modal table
export const COMPARISON_ROWS = [
  { key: 'deals', label: 'Deals', format: (v) => v >= 999999 ? 'Unlimited' : v.toLocaleString() },
  { key: 'users', label: 'Users', format: (v) => v >= 999999 ? 'Unlimited' : v.toString() },
  { key: 'features.ai_insights', label: 'AI Deal Insights' },
  { key: 'contract_upload', label: 'Contract Parse', format: (v) => v >= 999999 ? 'Unlimited' : `${v}/mo` },
  { key: 'features.fulfillment_reports', label: 'Fulfillment Reports' },
  { key: 'prospect_search', label: 'Prospect Searches', format: (v) => v >= 999999 ? 'Unlimited' : `${v}/mo` },
  { key: 'modules.sportify', label: 'Sportify Events', format: (v, plan) => plan.modules.includes('sportify') },
  { key: 'modules.valora', label: 'VALORA Valuations', format: (v, plan) => plan.modules.includes('valora') },
  { key: 'features.custom_dashboard', label: 'Custom Dashboards' },
]

// Helper: resolve nested path like 'features.ai_insights' from plan object
export function getPlanValue(plan, path) {
  return path.split('.').reduce((obj, key) => obj?.[key], plan)
}

// Check if a plan has access to a feature key
export function planHasFeature(planName, featureKey) {
  const plan = PLAN_LIMITS[planName] || PLAN_LIMITS.free
  return plan.features?.[featureKey] === true
}

// Check if a plan has access to a module
export function planHasModule(planName, moduleName) {
  const plan = PLAN_LIMITS[planName] || PLAN_LIMITS.free
  return plan.modules?.includes(moduleName) === true
}

// Get limit for an action type (returns 999999 for unlimited)
export function getPlanLimit(planName, actionType) {
  const plan = PLAN_LIMITS[planName] || PLAN_LIMITS.free
  return plan[actionType] ?? 0
}

// Lowest plan that unlocks a given feature — used by upgrade prompts
export function getMinimumPlanFor(featureOrAction) {
  const order = ['free', 'starter', 'pro', 'enterprise']
  for (const planName of order) {
    const plan = PLAN_LIMITS[planName]
    // Check as a feature flag
    if (plan.features?.[featureOrAction] === true) return planName
    // Check as a module
    if (plan.modules?.includes(featureOrAction)) return planName
    // Check as a numeric limit
    if (typeof plan[featureOrAction] === 'number' && plan[featureOrAction] > 0) return planName
  }
  return 'pro'
}
