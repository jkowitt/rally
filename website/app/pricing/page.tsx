"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

// Tier type definition
interface PlatformTier {
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
  free?: boolean;
}

interface Platform {
  name: string;
  tagline: string;
  color: string;
  tiers: PlatformTier[];
}

// Platform-specific plans
const platformPlans: Record<string, Platform> = {
  valora: {
    name: "Legacy RE",
    tagline: "Real Estate Intelligence",
    color: "#1B2A4A",
    tiers: [
      { name: "Starter", price: 29, features: ["10 valuations/month", "Basic analytics", "Comparable sales", "Email support"] },
      { name: "Professional", price: 79, features: ["50 valuations/month", "Advanced analytics", "Underwriting engine", "Rent roll & P&L", "API access", "Priority support"], popular: true },
      { name: "Enterprise", price: 199, features: ["Unlimited valuations", "Portfolio management", "Custom integrations", "Team collaboration", "Dedicated support", "SLA guarantee"] },
    ],
  },
};

// Bundle plans
const bundlePlans = [
  {
    id: "STARTER",
    name: "Starter",
    price: 29,
    description: "Get started with Legacy RE",
    highlight: false,
    includes: ["Legacy RE Starter"],
    features: [
      "10 valuations/month",
      "Basic analytics",
      "Comparable sales",
      "Email support",
    ],
    cta: "Start 7-Day Free Trial",
    trial: true,
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    price: 79,
    description: "Everything you need for serious analysis",
    highlight: true,
    popular: true,
    includes: ["Legacy RE Pro"],
    features: [
      "50 valuations/month",
      "Advanced analytics",
      "Underwriting engine",
      "Rent roll & P&L",
      "API access",
      "Priority support",
    ],
    cta: "Start 7-Day Free Trial",
    trial: true,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 199,
    description: "Complete platform access for teams",
    highlight: false,
    includes: ["Legacy RE Enterprise"],
    features: [
      "Unlimited valuations",
      "Portfolio management",
      "Custom integrations",
      "Team collaboration",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Start 7-Day Free Trial",
    trial: true,
  },
  {
    id: "CUSTOM",
    name: "Custom",
    price: null,
    description: "Custom solutions for large organizations",
    highlight: false,
    includes: ["Custom Configuration", "Dedicated Support"],
    features: [
      "Everything in Enterprise",
      "Unlimited team members",
      "Custom integrations",
      "On-premise option",
      "SLA guarantee",
      "Dedicated success manager",
    ],
    cta: "Contact Sales",
    contactSales: true,
  },
];

const faqs = [
  {
    q: "What happens after the 7-day free trial?",
    a: "After your trial, you'll be automatically upgraded to your selected plan. You can cancel anytime during the trial with no charge. We'll remind you 2 days before the trial ends."
  },
  {
    q: "Can I switch between individual products and bundles?",
    a: "Yes! You can switch anytime. If you're on individual plans and switch to a bundle, you'll get credit for any unused time. Bundles save you 30-40% compared to individual products."
  },
  {
    q: "Is Legacy CRM really free?",
    a: "Yes, Legacy CRM is free forever for unlimited contacts. The Professional tier adds automation and integrations, but the core CRM is always free."
  },
  {
    q: "What's included in the BETA program?",
    a: "BETA testers get free access to all features while we're in development. Your feedback helps shape the platform. BETA testers will receive special pricing when we fully launch."
  },
  {
    q: "Do you offer discounts for nonprofits or education?",
    a: "Yes! We offer 50% off all paid plans for verified nonprofits and educational institutions. Contact us with proof of status."
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. No long-term contracts. Cancel anytime and keep access until your billing period ends. Your data is retained for 30 days."
  },
];

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [viewMode, setViewMode] = useState<"bundles" | "individual">("bundles");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("valora");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const session: any = null;
  const router = useRouter();

  const handleSubscribe = async (planId: string, contactSales?: boolean, isTrial?: boolean) => {
    if (contactSales) {
      router.push("/contact?inquiry=enterprise");
      return;
    }

    // For trials and free plans, go directly to signup
    if (!session) {
      const trialParam = isTrial ? "&trial=7" : "";
      router.push(`/auth/signup?plan=${planId.toLowerCase()}&interval=${billingInterval}${trialParam}`);
      return;
    }

    setIsLoading(planId);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          interval: billingInterval,
          trial: isTrial ? 7 : 0,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.redirect) {
        router.push(data.redirect);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "Custom";
    if (price === 0) return "Free";
    return `$${billingInterval === "yearly" ? Math.round(price * 10) : price}`;
  };

  const getYearlyPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 10); // ~17% discount
  };

  return (
    <main className="pricing-page-new">
      <Header />

      {/* Hero */}
      <section className="pricing-hero-new">
        <div className="container">
          <div className="pricing-beta-badge">
            <span className="beta-dot"></span>
            Currently in BETA - Sign up free, no payment required
          </div>
          <h1>Simple, transparent pricing</h1>
          <p className="pricing-subtitle">Start with a 7-day free trial. No credit card required during BETA.</p>

          {/* View Toggle */}
          <div className="pricing-view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === "bundles" ? "active" : ""}`}
              onClick={() => setViewMode("bundles")}
            >
              Bundles
              <span className="save-tag">Save 30%+</span>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === "individual" ? "active" : ""}`}
              onClick={() => setViewMode("individual")}
            >
              Individual Products
            </button>
          </div>

          {/* Billing Toggle */}
          <div className="billing-toggle-new">
            <button
              className={`billing-btn ${billingInterval === "monthly" ? "active" : ""}`}
              onClick={() => setBillingInterval("monthly")}
            >
              Monthly
            </button>
            <button
              className={`billing-btn ${billingInterval === "yearly" ? "active" : ""}`}
              onClick={() => setBillingInterval("yearly")}
            >
              Yearly
              <span className="yearly-save">Save 17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Bundle Plans */}
      {viewMode === "bundles" && (
        <section className="pricing-plans-new">
          <div className="container">
            <div className="plans-grid-new">
              {bundlePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`plan-card-new ${plan.highlight ? "plan-card-highlighted" : ""}`}
                >
                  {plan.popular && <div className="popular-badge">Most Popular</div>}
                  {plan.trial && <div className="trial-badge">7-Day Free Trial</div>}

                  <h3 className="plan-name">{plan.name}</h3>
                  <p className="plan-description">{plan.description}</p>

                  <div className="plan-price-new">
                    <span className="current-price">{formatPrice(plan.price)}</span>
                    {plan.price !== null && plan.price > 0 && (
                      <span className="price-period">/{billingInterval === "yearly" ? "year" : "month"}</span>
                    )}
                  </div>

                  <div className="plan-includes">
                    <span className="includes-label">Includes:</span>
                    {plan.includes.map((item, i) => (
                      <span key={i} className="includes-item">{item}</span>
                    ))}
                  </div>

                  <ul className="plan-features-new">
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.id, plan.contactSales, plan.trial)}
                    disabled={isLoading === plan.id}
                    className={`plan-cta-new ${plan.highlight ? "plan-cta-primary" : "plan-cta-secondary"}`}
                  >
                    {isLoading === plan.id ? "Loading..." : plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Individual Product Pricing */}
      {viewMode === "individual" && (
        <section className="pricing-individual">
          <div className="container">
            {/* Platform Selector */}
            <div className="platform-tabs">
              {Object.entries(platformPlans).map(([key, platform]) => (
                <button
                  key={key}
                  className={`platform-tab ${selectedPlatform === key ? "active" : ""}`}
                  onClick={() => setSelectedPlatform(key)}
                  style={{ "--platform-color": platform.color } as React.CSSProperties}
                >
                  {platform.name}
                </button>
              ))}
            </div>

            {/* Selected Platform Pricing */}
            <div className="platform-pricing">
              <div className="platform-header" style={{ "--platform-color": platformPlans[selectedPlatform].color } as React.CSSProperties}>
                <h2>{platformPlans[selectedPlatform].name}</h2>
                <p>{platformPlans[selectedPlatform].tagline}</p>
              </div>

              <div className="platform-tiers">
                {platformPlans[selectedPlatform].tiers.map((tier, index) => (
                  <div key={index} className={`tier-card ${tier.popular ? "tier-popular" : ""}`}>
                    {tier.popular && <div className="popular-badge">Recommended</div>}
                    <h4>{tier.name}</h4>
                    <div className="tier-price">
                      <span className="price">{tier.free ? "Free" : `$${billingInterval === "yearly" ? getYearlyPrice(tier.price) : tier.price}`}</span>
                      {!tier.free && <span className="period">/{billingInterval === "yearly" ? "year" : "month"}</span>}
                    </div>
                    <ul className="tier-features">
                      {tier.features.map((feature, i) => (
                        <li key={i}>
                          <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`tier-cta ${tier.popular ? "tier-cta-primary" : "tier-cta-secondary"}`}
                      onClick={() => handleSubscribe(`${selectedPlatform.toUpperCase()}_${tier.name.toUpperCase().replace(" ", "_")}`, false, !tier.free)}
                    >
                      {tier.free ? "Start Free" : "Start 7-Day Trial"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BETA Program Banner */}
      <section className="beta-banner">
        <div className="container">
          <div className="beta-content">
            <div className="beta-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="beta-text">
              <h3>Join Our BETA Program</h3>
              <p>Get free access to Legacy RE while we're in development. Your feedback shapes the future of the platform.</p>
            </div>
            <Link href="/auth/signup?beta=true" className="beta-cta">
              Join BETA Free
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pricing-faq-new">
        <div className="container">
          <h2>Frequently asked questions</h2>
          <div className="faq-grid-new">
            {faqs.map((faq, index) => (
              <details key={index} className="faq-item-new">
                <summary>
                  <h4>{faq.q}</h4>
                  <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pricing-cta-new">
        <div className="container">
          <h2>Ready to get started?</h2>
          <p>Join operators who trust Legacy RE for smarter real estate decisions.</p>
          <div className="cta-actions">
            <Link href="/auth/signup?beta=true" className="button button--primary">
              Start Free BETA Access
            </Link>
            <Link href="/contact" className="button button--secondary">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
