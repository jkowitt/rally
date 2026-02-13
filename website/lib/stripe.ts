import Stripe from "stripe";

// Create Stripe instance only if key is available (prevents build errors)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      typescript: true,
    })
  : (null as unknown as Stripe); // Type assertion for build time

// Pricing plans configuration
export const PLANS = {
  STARTER: {
    name: "Starter",
    description: "For individuals getting started",
    features: [
      "Access to all products",
      "5 valuations per month",
      "Basic CRM features",
      "Email support",
    ],
    prices: {
      monthly: {
        amount: 0,
        priceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || "price_starter_monthly",
      },
      yearly: {
        amount: 0,
        priceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || "price_starter_yearly",
      },
    },
  },
  PROFESSIONAL: {
    name: "Professional",
    description: "For growing teams and businesses",
    features: [
      "Everything in Starter",
      "Unlimited valuations",
      "Advanced analytics",
      "Team collaboration (up to 10)",
      "API access",
      "Priority support",
    ],
    prices: {
      monthly: {
        amount: 4900, // $49.00
        priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly",
      },
      yearly: {
        amount: 47000, // $470.00 (2 months free)
        priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "price_pro_yearly",
      },
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "For large organizations with custom needs",
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "On-premise deployment option",
      "Custom training",
    ],
    prices: {
      monthly: {
        amount: null, // Custom pricing
        priceId: null,
      },
      yearly: {
        amount: null,
        priceId: null,
      },
    },
  },
  ALL_ACCESS: {
    name: "All-Access Bundle",
    description: "Full access to all Loud Legacy products",
    features: [
      "VALORA - Real estate intelligence",
      "Sportify - Event management",
      "Business Now - Operations",
      "Legacy CRM - Relationships",
      "Cross-platform data sync",
      "Unified dashboard",
      "Priority support",
    ],
    prices: {
      monthly: {
        amount: 7900, // $79.00
        priceId: process.env.STRIPE_ALL_ACCESS_MONTHLY_PRICE_ID || "price_all_access_monthly",
      },
      yearly: {
        amount: 79000, // $790.00 (2 months free)
        priceId: process.env.STRIPE_ALL_ACCESS_YEARLY_PRICE_ID || "price_all_access_yearly",
      },
    },
  },
} as const;

// Individual product add-ons
export const ADDONS = {
  VALORA: {
    name: "VALORA",
    description: "Real estate underwriting and analysis",
    prices: {
      monthly: {
        amount: 2900, // $29.00
        priceId: process.env.STRIPE_VALORA_MONTHLY_PRICE_ID || "price_valora_monthly",
      },
    },
  },
  SPORTIFY: {
    name: "Sportify",
    description: "Live event and sports management",
    prices: {
      monthly: {
        amount: 2900,
        priceId: process.env.STRIPE_SPORTIFY_MONTHLY_PRICE_ID || "price_sportify_monthly",
      },
    },
  },
  BUSINESS_NOW: {
    name: "Business Now",
    description: "Business operations and consulting tools",
    prices: {
      monthly: {
        amount: 2900,
        priceId: process.env.STRIPE_BUSINESS_NOW_MONTHLY_PRICE_ID || "price_business_now_monthly",
      },
    },
  },
  LEGACY_CRM: {
    name: "Legacy CRM",
    description: "Relationship management system",
    prices: {
      monthly: {
        amount: 1900, // $19.00
        priceId: process.env.STRIPE_LEGACY_CRM_MONTHLY_PRICE_ID || "price_legacy_crm_monthly",
      },
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type AddonKey = keyof typeof ADDONS;
export type BillingInterval = "monthly" | "yearly";

// Helper to format price for display
export function formatPrice(amount: number | null): string {
  if (amount === null) return "Custom";
  if (amount === 0) return "Free";
  return `$${(amount / 100).toFixed(0)}`;
}

// Helper to get plan by price ID
export function getPlanByPriceId(priceId: string): { plan: PlanKey; interval: BillingInterval } | null {
  for (const [planKey, plan] of Object.entries(PLANS)) {
    if (plan.prices.monthly.priceId === priceId) {
      return { plan: planKey as PlanKey, interval: "monthly" };
    }
    if (plan.prices.yearly.priceId === priceId) {
      return { plan: planKey as PlanKey, interval: "yearly" };
    }
  }
  return null;
}
