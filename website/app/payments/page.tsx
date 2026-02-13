"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the essentials at no cost.",
    features: [
      "Legacy CRM (unlimited contacts)",
      "Business Now basics",
      "Up to 5 team members",
      "Community support",
      "Basic analytics dashboard",
    ],
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    description: "For individuals and small teams getting serious.",
    features: [
      "Everything in Free",
      "Legacy RE (10 valuations/mo)",
      "Sportify (5 events/mo)",
      "Up to 10 team members",
      "Email support",
      "Standard analytics",
    ],
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "/mo",
    description: "For growing teams that need full product access.",
    features: [
      "Everything in Starter",
      "Legacy RE (50 valuations/mo)",
      "Sportify (10 events/mo)",
      "Business Now full suite",
      "Up to 25 team members",
      "Priority support",
      "Advanced analytics",
      "API access",
    ],
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "All-Access",
    price: "$79",
    period: "/mo",
    description: "Full platform access with unlimited usage.",
    features: [
      "All products included",
      "Unlimited valuations",
      "Unlimited events",
      "Loud Works full suite",
      "Up to 50 team members",
      "Cross-platform sync",
      "Priority support",
      "Custom workflows",
    ],
    highlighted: false,
  },
];

const paymentMethods = [
  {
    name: "Credit & Debit Cards",
    description: "We accept Visa, Mastercard, American Express, and Discover.",
  },
  {
    name: "ACH Bank Transfer",
    description: "Available for annual plans. Lower processing fees for your business.",
  },
  {
    name: "Wire Transfer",
    description: "Available for Enterprise plans and annual commitments over $5,000.",
  },
  {
    name: "Invoicing",
    description: "Net-30 invoicing available for Enterprise customers upon approval.",
  },
];

const billingFaqs = [
  {
    question: "When will I be charged?",
    answer:
      "Monthly plans are billed on the same date each month (your signup date). Annual plans are billed once per year on your subscription anniversary. You will receive an email receipt for each charge.",
  },
  {
    question: "Can I switch between monthly and annual billing?",
    answer:
      "Yes. You can switch from monthly to annual billing at any time to take advantage of our annual discount (save up to 17%). When switching from annual to monthly, the change takes effect at the end of your current annual term.",
  },
  {
    question: "What happens if my payment fails?",
    answer:
      "If a payment fails, we will retry the charge up to 3 times over 7 days. You will receive email notifications about the failed payment. If the issue is not resolved, your account may be downgraded to the Free plan. Your data will be retained for 30 days.",
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer:
      "You can upgrade at any time and will receive immediate access to new features. When upgrading mid-cycle, you will be charged a prorated amount. Downgrades take effect at the end of your current billing period.",
  },
  {
    question: "Do you offer discounts?",
    answer:
      "We offer 17% savings on annual plans compared to monthly billing. We also provide 50% off Professional and All-Access plans for verified nonprofits and educational institutions. Contact us to learn more.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel your subscription at any time through your account settings or by contacting our support team. When you cancel, you retain access to paid features until the end of your current billing period. No partial refunds are issued for unused time on monthly plans.",
  },
];

export default function PaymentsPage() {
  return (
    <main className="legal-page">
      <Header />

      {/* Hero */}
      <section className="legal-header">
        <div className="container">
          <h1>Payment Information</h1>
          <p className="legal-subtitle">
            Transparent pricing, flexible plans, and straightforward billing.
            Everything you need to know about paying for Loud Legacy.
          </p>
          <p className="legal-updated">Last updated: January 28, 2026</p>
        </div>
      </section>

      {/* Coming Soon Notice */}
      <section className="payments-notice">
        <div className="container">
          <div className="notice-banner">
            <h2>Payment processing coming soon</h2>
            <p>
              We are finalizing our payment infrastructure. In the meantime,
              please contact us directly for enterprise pricing, custom plans,
              or to get started with a subscription.
            </p>
            <Link href="/contact" className="button button--primary">
              Contact Us for Enterprise Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <div className="legal-content">
        <div className="container">

          <section className="legal-section">
            <h2>Pricing Tiers</h2>
            <p>
              Choose the plan that fits your needs. All plans include access to
              Legacy CRM and can be upgraded at any time.
            </p>
            <div className="payments-tiers-grid">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`payments-tier-card ${tier.highlighted ? "payments-tier-card--highlighted" : ""}`}
                >
                  {tier.badge && (
                    <span className="payments-tier-badge">{tier.badge}</span>
                  )}
                  <h3>{tier.name}</h3>
                  <div className="payments-tier-price">
                    <span className="payments-price-amount">{tier.price}</span>
                    <span className="payments-price-period">{tier.period}</span>
                  </div>
                  <p className="payments-tier-description">
                    {tier.description}
                  </p>
                  <ul className="payments-tier-features">
                    {tier.features.map((feature) => (
                      <li key={feature}>
                        <svg
                          className="check-icon"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="payments-enterprise-note">
              Need more than 50 team members, custom integrations, or a
              dedicated success manager?{" "}
              <Link href="/contact?inquiry=enterprise">
                Contact us about Enterprise pricing
              </Link>.
            </p>
          </section>

          <section className="legal-section">
            <h2>Accepted Payment Methods</h2>
            <p>
              We offer multiple payment options to make billing as convenient as
              possible for your business.
            </p>
            <div className="payments-methods-grid">
              {paymentMethods.map((method) => (
                <div key={method.name} className="payments-method-card">
                  <h3>{method.name}</h3>
                  <p>{method.description}</p>
                </div>
              ))}
            </div>
            <p>
              All payments are processed securely through Stripe. We never store
              your full credit card information on our servers. For more details
              on how we handle your data, see our{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </section>

          <section className="legal-section">
            <h2>Billing FAQ</h2>
            <div className="payments-faq-list">
              {billingFaqs.map((faq) => (
                <details key={faq.question} className="payments-faq-item">
                  <summary>
                    <h3>{faq.question}</h3>
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="legal-section">
            <h2>Refund Policy</h2>
            <p>
              We want you to be confident in your purchase. Our refund policy is
              designed to be fair and straightforward:
            </p>
            <ul>
              <li>
                <strong>Monthly Plans:</strong> No refunds for partial months.
                When you cancel, you retain access until the end of your current
                billing period.
              </li>
              <li>
                <strong>Annual Plans:</strong> If you cancel within the first 14
                days of a new annual subscription or renewal, you are eligible
                for a full refund. After 14 days, no refunds are issued, but you
                retain access for the remainder of the annual term.
              </li>
              <li>
                <strong>Billing Errors:</strong> If you believe you have been
                charged in error, contact us within 14 days of the charge. We
                will review and issue a refund if appropriate.
              </li>
              <li>
                <strong>Downgrades:</strong> When downgrading from a higher tier,
                you will not be charged the lower rate until the next billing
                cycle. No refunds are issued for the difference.
              </li>
              <li>
                <strong>Enterprise Plans:</strong> Refund terms for Enterprise
                customers are outlined in your individual service agreement.
              </li>
            </ul>
            <p>
              To request a refund, contact our support team at{" "}
              <a href="mailto:billing@loud-legacy.com">billing@loud-legacy.com</a>{" "}
              or through the{" "}
              <Link href="/contact">contact form</Link>. Refund requests are
              typically processed within 5-10 business days.
            </p>
          </section>

          <section className="legal-section">
            <h2>Tax Information</h2>
            <p>
              Prices listed on our website are exclusive of applicable taxes.
              Depending on your location, sales tax, VAT, or other local taxes
              may apply and will be calculated at checkout. Tax-exempt
              organizations may contact us with valid exemption documentation to
              have taxes removed from their account.
            </p>
          </section>

          <section className="legal-section">
            <h2>Contact Billing Support</h2>
            <p>
              If you have questions about billing, payments, or your
              subscription, our team is here to help:
            </p>
            <ul className="legal-contact-list">
              <li><strong>Billing Email:</strong> billing@loud-legacy.com</li>
              <li><strong>General Support:</strong> support@loud-legacy.com</li>
              <li>
                <strong>Contact Form:</strong>{" "}
                <Link href="/contact">loud-legacy.com/contact</Link>
              </li>
            </ul>
            <p>
              For details on our full terms, see our{" "}
              <Link href="/terms">Terms of Service</Link>.
            </p>
          </section>

        </div>
      </div>

      {/* CTA */}
      <section className="legal-cta">
        <div className="container">
          <h2>Ready to get started?</h2>
          <p>Choose a plan and start building your legacy today.</p>
          <div className="cta-actions">
            <Link href="/pricing" className="button button--primary">
              View Pricing
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
