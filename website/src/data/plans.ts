// Single source of truth for plan pricing + features.
// Used by:
//   - Welcome gate plan picker (LandingPage.jsx 'plans' step)
//   - Public /pricing marketing page
// Anywhere a plan card or comparison table needs to render
// should import from here so we don't drift between the two
// surfaces.

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise'

export interface PlanFeature {
  label: string
  included: boolean
}

export interface PlanTier {
  id: PlanId
  name: string
  tagline: string
  audience: string
  monthly: number          // dollars/month
  annual: number           // dollars/year (2 months free vs monthly × 12)
  cta: string
  featured: boolean
  // Quick-scan bullets for the welcome-gate card. Keep <= 7.
  highlights: PlanFeature[]
}

export const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try the platform, free forever',
    audience: 'For solo reps trying the platform',
    monthly: 0,
    annual: 0,
    cta: 'Start Free',
    featured: false,
    highlights: [
      { label: '1 user · 100 contacts · 25 deals', included: true },
      { label: '10 prospect lookups / month', included: true },
      { label: 'Drag-and-drop CRM pipeline', included: true },
      { label: 'AI prospect search (5 results / query)', included: true },
      { label: 'Outreach sequences', included: false },
      { label: 'Outlook + Gmail integration', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Cheaper than 1 seat of HubSpot',
    audience: 'For solo reps and small teams running an active pipeline',
    monthly: 29,
    annual: 290,
    cta: 'Start with Starter',
    featured: false,
    highlights: [
      { label: '3 users · 2,500 contacts · 500 deals', included: true },
      { label: '100 prospect lookups / month (pooled)', included: true },
      { label: 'Custom deal stages + pipelines', included: true },
      { label: 'Lookalike companies + ICP filters', included: true },
      { label: 'Weighted forecast + stale-deal alerts', included: true },
      { label: 'Outreach sequences', included: false },
      { label: 'Outlook + Gmail integration', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'One-tenth the cost of HubSpot Pro',
    audience: 'For revenue teams that need to move volume',
    monthly: 79,
    annual: 790,
    cta: 'Start with Pro',
    featured: true,
    highlights: [
      { label: '10 users · 25,000 contacts · unlimited deals', included: true },
      { label: '500 prospect lookups / month (pooled)', included: true },
      { label: 'Bulk paste + CSV with AI enrichment queue', included: true },
      { label: 'Outreach sequences + reply-intent classification', included: true },
      { label: 'Outreach copilot + email coach', included: true },
      { label: 'Custom dashboards + role-based permissions', included: true },
      { label: 'Outlook + Gmail integration', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For teams that live in their inbox',
    audience: 'For revenue teams that live in their inbox',
    monthly: 249,
    annual: 2490,
    cta: 'Start with Enterprise',
    featured: false,
    highlights: [
      { label: 'Unlimited users · contacts · deals', included: true },
      { label: '2,500 prospect lookups / month (pooled)', included: true },
      { label: 'Outlook + Gmail full inbox sync', included: true },
      { label: 'Send from CRM with open + click tracking', included: true },
      { label: 'AI reply suggestions + auto-log to deals', included: true },
      { label: 'Priority support + custom onboarding', included: true },
    ],
  },
]

// Detailed feature comparison for the marketing page table.
// Sections collapse on mobile; the table renders all four plans
// side-by-side on desktop.
export interface ComparisonRow {
  label: string
  // Either a boolean (rendered as ✓ / ─), a string (rendered as
  // text in the cell — used for numeric limits like "100 / mo"),
  // or "unlimited" for the dimmed unlimited indicator.
  values: Record<PlanId, boolean | string>
}

export interface ComparisonSection {
  title: string
  rows: ComparisonRow[]
}

export const COMPARISON_SECTIONS: ComparisonSection[] = [
  {
    title: 'Workspace',
    rows: [
      { label: 'Users included',           values: { free: '1',     starter: '3',      pro: '10',        enterprise: 'Unlimited' } },
      { label: 'Contacts',                 values: { free: '100',   starter: '2,500',  pro: '25,000',    enterprise: 'Unlimited' } },
      { label: 'Active deals',             values: { free: '25',    starter: '500',    pro: 'Unlimited', enterprise: 'Unlimited' } },
      { label: 'Prospect lookups / month', values: { free: '10',    starter: '100',    pro: '500',       enterprise: '2,500' } },
      { label: 'Add seats / lookups à la carte', values: { free: false, starter: true, pro: true, enterprise: true } },
    ],
  },
  {
    title: 'CRM',
    rows: [
      { label: 'Drag-and-drop pipeline',                 values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'Contacts + activity timeline',           values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'Notes, tasks, reminders',                values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'CSV import',                             values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'Custom stages + pipelines',              values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Industry / category tags + filters',     values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Weighted forecast + win-rate tracking',  values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Stale-deal alerts',                      values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Multi-year deal tracking',               values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Audit log',                              values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Custom dashboards + saved views',        values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Bulk edit (stage, owner, tags)',         values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Custom fields',                          values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Team goals + per-rep performance',       values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Role-based permissions',                 values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'AI deal insights + risk flags',          values: { free: false, starter: false, pro: true,  enterprise: true } },
    ],
  },
  {
    title: 'Prospecting',
    rows: [
      { label: 'AI prospect search',                     values: { free: '5 / query', starter: '15 / query', pro: 'Unlimited depth', enterprise: 'Unlimited depth' } },
      { label: 'Apollo + Hunter contact lookup',         values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'ICP score on every prospect',            values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'One-click "Add to pipeline"',            values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'Lookalike companies',                    values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'ICP filtering (industry, size, region)', values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Saved searches + alerts',                values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Verified-email confidence (Hunter)',     values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Bulk paste + CSV prospect import',       values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'AI enrichment queue',                    values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Outreach sequences',                     values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Reply-intent classification',            values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Outreach copilot (chat)',                values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Email coach (score + rewrite)',          values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Advanced signal radar',                  values: { free: false, starter: false, pro: false, enterprise: true } },
    ],
  },
  {
    title: 'Email integration',
    rows: [
      { label: 'Outlook + Gmail inbox sync',             values: { free: false, starter: false, pro: false, enterprise: true } },
      { label: 'Send from CRM with your signature',      values: { free: false, starter: false, pro: false, enterprise: true } },
      { label: 'Open + click tracking',                  values: { free: false, starter: false, pro: false, enterprise: true } },
      { label: 'Auto-log emails to deal timeline',       values: { free: false, starter: false, pro: false, enterprise: true } },
      { label: 'AI reply suggestions',                   values: { free: false, starter: false, pro: false, enterprise: true } },
      { label: 'Auto-create contacts from inbound mail', values: { free: false, starter: false, pro: false, enterprise: true } },
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Community + docs',                       values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'Email support',                          values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Priority support (<4h response)',        values: { free: false, starter: false, pro: false, enterprise: true } },
      { label: 'Custom onboarding session',              values: { free: false, starter: false, pro: false, enterprise: true } },
      { label: 'Quarterly account review',               values: { free: false, starter: false, pro: false, enterprise: true } },
    ],
  },
]

export const ADDONS = [
  { label: '+100 prospect lookups', price: 'one-time', amount: 15 },
  { label: '+1 user above plan limit', price: 'per month', amount: 10 },
] as const
