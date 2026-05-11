// Single source of truth for plan pricing + features.
// Used by:
//   - Welcome gate plan picker (LandingPage.jsx 'plans' step)
//   - Public /pricing marketing page
//   - In-app Settings → Billing pricing cards
//   - Upgrade modal
//
// Anywhere a plan card or comparison table needs to render
// should import from here so we don't drift between surfaces.
//
// Pricing strategy (sponsorship-vertical AI-native CRM + prospecting):
//   • Free → acquisition tier, modest caps so power users hit a wall.
//   • Starter ($39/mo) → solo reps + small properties. Net-new revenue;
//     not a downgrade target.
//   • Pro ($99/mo) → THE killer tier. Beats HubSpot Sales Pro ($90) +
//     Apollo Pro ($99) combined ($189) with one tool that does
//     everything plus background AI research and grounded brief.
//   • Enterprise ($249/mo) → wedge into KORE / SponsorUnited deals
//     priced at $300–500/seat. Voice capture, agent loop, full inbox
//     integration, dedicated success.
//
// Annual = 20% off (industry-aggressive vs. the typical 17%).

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
  annual: number           // dollars/year (20% off monthly × 12)
  cta: string
  featured: boolean
  // Quick-scan bullets for the welcome-gate card. Keep <= 7.
  highlights: PlanFeature[]
}

export const PLAN_TIERS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Get to first value in 5 minutes',
    audience: 'For solo reps trying the platform',
    monthly: 0,
    annual: 0,
    cta: 'Start Free',
    featured: false,
    highlights: [
      { label: '1 user · 100 contacts · 25 deals', included: true },
      { label: '10 AI prospect lookups / month', included: true },
      { label: 'Drag-and-drop CRM pipeline', included: true },
      { label: 'Morning AI Brief (on-demand)', included: true },
      { label: 'Outreach sequences', included: false },
      { label: 'AI call + meeting capture', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Run a real pipeline, no enterprise overhead',
    audience: 'For solo reps and small properties running an active pipeline',
    monthly: 39,
    annual: 372,  // $31/mo × 12 (20% off $39)
    cta: 'Start with Starter',
    featured: false,
    highlights: [
      { label: 'Up to 5 users · 2,500 contacts · 500 deals', included: true },
      { label: '100 AI prospect lookups / month (pooled)', included: true },
      { label: 'Daily AI Brief + dirty-refresh', included: true },
      { label: 'Lookalikes + ICP filters + signal radar', included: true },
      { label: 'Stale-deal alerts + weighted forecast', included: true },
      { label: 'AI background research agent', included: false },
      { label: 'AI call + meeting capture', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Replace HubSpot + Apollo with one AI-native tool',
    audience: 'For revenue teams who buy two tools today and want one',
    monthly: 99,
    annual: 948,  // $79/mo × 12 (20% off $99)
    cta: 'Start with Pro',
    featured: true,
    highlights: [
      { label: 'Unlimited users · 25,000 contacts · unlimited deals', included: true },
      { label: '500 AI prospect lookups / month (pooled)', included: true },
      { label: 'Background AI research agent on every deal', included: true },
      { label: 'AI sequence builder + email coach + outreach copilot', included: true },
      { label: 'Bulk add + CSV with AI enrichment queue', included: true },
      { label: 'Custom dashboards + role-based permissions', included: true },
      { label: 'AI call + meeting capture', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'AI runs your revenue motion 24/7',
    audience: 'For teams replacing KORE / SponsorUnited with a modern stack',
    monthly: 249,
    annual: 2388,  // $199/mo × 12 (20% off $249)
    cta: 'Talk to Sales',
    featured: false,
    highlights: [
      { label: 'Unlimited users · contacts · deals', included: true },
      { label: '2,500 AI prospect lookups / month (pooled)', included: true },
      { label: 'AI call + meeting capture (Whisper + Claude)', included: true },
      { label: 'Outlook + Gmail full inbox sync + send-from-CRM', included: true },
      { label: 'Goal-driven AI agent (coming soon)', included: true },
      { label: 'SSO + audit log + custom onboarding', included: true },
      { label: 'Dedicated CSM + quarterly account reviews', included: true },
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
      { label: 'Users included',           values: { free: '1',     starter: '5',      pro: 'Unlimited', enterprise: 'Unlimited' } },
      { label: 'Contacts',                 values: { free: '100',   starter: '2,500',  pro: '25,000',    enterprise: 'Unlimited' } },
      { label: 'Active deals',             values: { free: '25',    starter: '500',    pro: 'Unlimited', enterprise: 'Unlimited' } },
      { label: 'Prospect lookups / month', values: { free: '10',    starter: '100',    pro: '500',       enterprise: '2,500' } },
      { label: 'Add seats / lookups à la carte', values: { free: false, starter: true, pro: true, enterprise: true } },
    ],
  },
  {
    title: 'AI agent loop',
    rows: [
      { label: 'Morning AI Brief',                       values: { free: 'On-demand', starter: 'Daily',  pro: 'Daily + dirty refresh', enterprise: 'Live + dirty refresh' } },
      { label: 'Grounded prospect suggestions',          values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'Click-to-compose from brief',            values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Background research agent (per-deal)',   values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'AI call + meeting capture (transcribe + extract)', values: { free: false, starter: false, pro: false, enterprise: true } },
      { label: 'Auto-task creation from recordings',     values: { free: false, starter: false, pro: false, enterprise: true } },
      { label: 'Goal-driven agent (multi-step plans)',   values: { free: false, starter: false, pro: false, enterprise: 'Coming soon' } },
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
      { label: 'Role-based permissions + SSO',           values: { free: false, starter: false, pro: 'Permissions', enterprise: 'Permissions + SSO' } },
      { label: 'AI deal insights + risk flags',          values: { free: false, starter: false, pro: true,  enterprise: true } },
    ],
  },
  {
    title: 'Prospecting',
    rows: [
      { label: 'AI prospect search',                     values: { free: '5 / query', starter: '15 / query', pro: 'Unlimited depth', enterprise: 'Unlimited depth' } },
      { label: 'Verified contact lookup',                values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'ICP score on every prospect',            values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'One-click "Add to pipeline"',            values: { free: true,  starter: true,  pro: true,  enterprise: true } },
      { label: 'Lookalike companies',                    values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'ICP filtering (industry, size, region)', values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Saved searches + alerts',                values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Verified-email confidence scoring',      values: { free: false, starter: true,  pro: true,  enterprise: true } },
      { label: 'Bulk add (paste + CSV) with auto-enrichment', values: { free: false, starter: false, pro: true, enterprise: true } },
      { label: 'AI enrichment queue',                    values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Outreach sequences + AI builder',        values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Reply-intent classification',            values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Outreach copilot (chat)',                values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Email coach (score + rewrite)',          values: { free: false, starter: false, pro: true,  enterprise: true } },
      { label: 'Signal Radar (funding, hiring, EDGAR)',  values: { free: false, starter: 'Read-only', pro: true, enterprise: 'Real-time + alerts' } },
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
      { label: 'Dedicated CSM + quarterly account reviews', values: { free: false, starter: false, pro: false, enterprise: true } },
    ],
  },
]

export const ADDONS = [
  { label: '+100 prospect lookups', price: 'one-time', amount: 15 },
  { label: '+1 user above plan limit', price: 'per month', amount: 10 },
  { label: 'Custom dashboard build', price: 'one-time', amount: 1000 },
  { label: 'White-label sponsor portal', price: 'per month', amount: 500 },
] as const
