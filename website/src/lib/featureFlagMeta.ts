// Human-readable labels + plain-language descriptions for every
// public feature flag. Used by the Dev Tools toggle UI so flag rows
// surface "Account Management Hub" instead of "hub_accounts" and an
// inline ⓘ tells the dev exactly what flipping it does.
//
// Anything not in this map falls back to the raw module name +
// "Toggle the <name> module on or off." — so a brand-new flag added
// to ALL_MODULES is still readable, just less specific.

export interface FlagMeta {
  label: string
  description: string
}

export const FLAG_META: Record<string, FlagMeta> = {
  // ─── Hubs (overarching) ────────────────────────────────────
  hub_accounts: {
    label: 'Account Management Hub',
    description: 'Shows the Account Management hub button in the top bar. Reps use this hub to manage signed contracts, fulfillment, and renewal pipeline. Default ON.',
  },
  hub_business_ops: {
    label: 'Business Operations Hub',
    description: 'Exposes the Business Operations hub to non-developer roles. Holds finance, marketing, automations, and admin tooling. Default OFF — keep it hidden from reps unless your team uses these tools.',
  },
  dev_addon_panel: {
    label: 'Sidebar add-on panel',
    description: 'Shows the "Additional Features" + "Suggest a Feature" buttons at the bottom of the left sidebar. Hidden by default for the launch positioning (CRM + Prospecting only). Flip ON when the add-on catalog is ready to expose to customers.',
  },

  // ─── Sports ────────────────────────────────────────────────
  show_sports: {
    label: 'Show Sports industry',
    description: 'Lets new signups pick "Sports" as their property type during onboarding. Turn off to hide the option.',
  },
  sportify: {
    label: 'Sportify event manager',
    description: 'Sports-specific event / game scheduling module. Used by sports properties to plan game-day inventory.',
  },

  // ─── Entertainment ─────────────────────────────────────────
  show_entertainment: {
    label: 'Show Entertainment industry',
    description: 'Lets new signups pick "Entertainment" during onboarding.',
  },
  industry_entertainment: {
    label: 'Entertainment features',
    description: 'Industry-specific deal stages, asset categories, and report templates for entertainment properties.',
  },

  // ─── Conference ────────────────────────────────────────────
  show_conference: {
    label: 'Show Conference / Trade show industry',
    description: 'Lets new signups pick "Conference / Trade show" during onboarding.',
  },
  industry_conference: {
    label: 'Conference features',
    description: 'Conference-specific sponsor packages, booth inventory, and attendee data flows.',
  },

  // ─── Nonprofit ─────────────────────────────────────────────
  show_nonprofit: {
    label: 'Show Nonprofit industry',
    description: 'Lets new signups pick "Nonprofit" during onboarding.',
  },
  industry_nonprofit: {
    label: 'Nonprofit features',
    description: 'Donor portal, campaign tracking, gift acknowledgement letters, and tax-receipt automation.',
  },

  // ─── Media ─────────────────────────────────────────────────
  show_media: {
    label: 'Show Media industry',
    description: 'Lets new signups pick "Media" during onboarding.',
  },
  industry_media: {
    label: 'Media features',
    description: 'Ad inventory, audience metrics, and media-kit builders for publisher / broadcaster customers.',
  },

  // ─── Real Estate ───────────────────────────────────────────
  show_realestate: {
    label: 'Show Real Estate industry',
    description: 'Lets new signups pick "Real Estate" during onboarding.',
  },
  industry_realestate: {
    label: 'Real Estate features',
    description: 'Listing-based deal pipeline, agent assignments, and commission splits.',
  },

  // ─── Agency ────────────────────────────────────────────────
  show_agency: {
    label: 'Show Agency industry',
    description: 'Lets new signups pick "Agency" during onboarding.',
  },
  industry_agency: {
    label: 'Agency features',
    description: 'Multi-property management, client billing, and per-account team views for agencies repping multiple brands.',
  },

  // ─── Other industry ────────────────────────────────────────
  show_other: {
    label: 'Show "Other" industry option',
    description: 'Lets new signups pick "Other" during onboarding when no listed industry fits.',
  },

  // ─── Inbox + email infrastructure ──────────────────────────
  inbox_outlook: {
    label: 'Outlook inbox',
    description: 'OAuth + 2-way sync with Microsoft 365 / Outlook.com. Required for any user that wants to send and receive mail through the CRM via an Outlook account.',
  },
  inbox_gmail: {
    label: 'Gmail inbox',
    description: 'OAuth + 2-way sync with Google Workspace / personal Gmail. Required for any user sending and receiving mail through the CRM via Google.',
  },

  // ─── Client growth tools ───────────────────────────────────
  client_growth_hub: {
    label: 'Growth Hub',
    description: 'Top-level Growth Hub page with KPI dashboard, ad-spend tracker, and goal-progress widgets.',
  },
  client_marketing_hub: {
    label: 'Marketing Hub',
    description: 'Email campaigns, broadcast lists, subscriber management, and templates.',
  },
  client_ad_spend: {
    label: 'Ad Spend tracker',
    description: 'Per-channel spend, CAC, and ROAS aggregation pulled from connected ad accounts.',
  },
  client_goal_tracker: {
    label: 'Goal tracker',
    description: 'Quarterly / yearly revenue and unit goals with progress bars and slip warnings.',
  },
  client_connection_manager: {
    label: 'Connection manager',
    description: 'Centralised view of every third-party integration (Stripe, Apollo, Hunter, Outlook, Gmail, etc.) with reconnect controls.',
  },
  client_financial_projections: {
    label: 'Financial projections',
    description: 'Forward-looking revenue / cash-flow projections derived from current pipeline and renewal rates.',
  },
  client_finance_dashboard: {
    label: 'Finance dashboard',
    description: 'Booked, paid, outstanding, and forecast revenue rolled up to the property and account level.',
  },
  client_growth_workbook: {
    label: 'Growth workbook',
    description: 'Editable spreadsheet of growth experiments, hypotheses, and results — replaces ad-hoc Notion docs.',
  },
  client_report_builder: {
    label: 'Report builder',
    description: 'Drag-and-drop report builder for delivering recap decks to sponsors / accounts.',
  },
  client_strategic_workbooks: {
    label: 'Strategic workbooks',
    description: 'Annual planning, OKR, and ICP-cluster workbooks for revenue leadership.',
  },

  // ─── Hidden developer flags (dev-only console) ─────────────
  outlook_integration: {
    label: 'Developer-only Outlook integration',
    description: 'Legacy gate on the developer-only Outlook sandbox. Independent of inbox_outlook (which controls customer-facing Outlook).',
  },
  email_marketing_developer: {
    label: 'Email Marketing (developer)',
    description: 'Enables the full /app/marketing/email UI for the developer role only — used to QA campaigns before flipping email_marketing_public.',
  },
  email_marketing_public: {
    label: 'Email Marketing (admin+ public beta)',
    description: 'When ON, admin / businessops users see Email Marketing in their sidebar. Flip ON only after the email_marketing_developer flow is confirmed.',
  },

  // ─── Core modules ──────────────────────────────────────────
  crm: {
    label: 'CRM (Pipeline, Deals, Contacts)',
    description: 'Foundational pipeline + deals + contacts surface. Turning OFF disables most of the application — only flip during a controlled migration.',
  },
  valora: {
    label: 'Valora valuation engine',
    description: 'AI-driven sponsorship valuations comparing your assets to industry benchmarks.',
  },
  businessnow: {
    label: 'Business Now',
    description: 'Daily intelligence digest — funding rounds, news signals, and prospect-relevant events.',
  },
  newsletter: {
    label: 'Newsletter module',
    description: 'Internal newsletter publishing for properties that send periodic updates to their fans / customers.',
  },
  automations: {
    label: 'Automations engine',
    description: 'Trigger-based workflows: stage-change webhooks, follow-up sequences, scheduled tasks.',
  },
  businessops: {
    label: 'Business Ops legacy module',
    description: 'Legacy operations module — superseded by hub_business_ops gating + the Ops sidebar group. Keep ON unless intentionally archiving.',
  },
  developer: {
    label: 'Developer mode',
    description: 'Exposes Dev Tools in the top bar. ON by default for developer-role users.',
  },
  marketing: {
    label: 'Marketing legacy module',
    description: 'Legacy marketing module — most surface area moved into Marketing Hub. Kept for back-compat.',
  },
}

// Small helper used by both rendering paths so a flag without a
// specific entry still gets a sensible label + description.
export function getFlagMeta(module: string): FlagMeta {
  if (FLAG_META[module]) return FLAG_META[module]
  return {
    // Replace underscores with spaces and Title-case-ish so a
    // freshly-added flag without metadata is still readable.
    label: module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: `Toggle the ${module} module on or off. (No detailed description available — add one to FLAG_META.)`,
  }
}
