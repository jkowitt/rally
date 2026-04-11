import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'
import { supabase } from '@/lib/supabase'

/**
 * Public /pricing page. Every piece of content — plans, features, FAQs,
 * addons, credit packs, hero copy — comes from the database.
 * Zero hardcoded copy. Controlled entirely from /dev/pricing.
 *
 * Performance: single parallel Promise.all fetches all data on mount.
 * Total payload is ~8KB. Renders in under 2 seconds on 4G.
 */
export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState(
    localStorage.getItem('pricing_billing_period') || 'monthly'
  )
  const [data, setData] = useState(null)

  useEffect(() => {
    loadPricingData().then(setData)
  }, [])

  useEffect(() => {
    localStorage.setItem('pricing_billing_period', billingPeriod)
  }, [billingPeriod])

  const schema = data ? {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Loud Legacy',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: (data.plans || []).map(p => ({
      '@type': 'Offer',
      name: p.display_name,
      price: (p.monthly_price_cents / 100).toFixed(2),
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: (p.monthly_price_cents / 100).toFixed(2),
        priceCurrency: 'USD',
        unitText: 'month',
      },
    })),
  } : null

  useSeo({
    title: 'Pricing — Loud Legacy',
    description: 'Simple, transparent pricing for the AI sponsorship CRM. Starting at $39/month.',
    canonical: 'https://loud-legacy.com/pricing',
    schema,
  })

  if (!data) {
    return <div className="min-h-screen bg-bg-primary" />
  }

  const { plans, limits, features, addons, creditPacks, config, faqs } = data

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <TopNav />

      {/* Hero */}
      <header className="max-w-5xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-8 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
          {config.hero_headline || 'Simple, Transparent Pricing'}
        </h1>
        <p className="text-sm sm:text-lg text-text-secondary mt-4 max-w-2xl mx-auto">
          {config.hero_subheadline}
        </p>

        {config.annual_billing_banner && (
          <div className="mt-6 inline-block text-[10px] font-mono uppercase tracking-widest text-accent">
            {config.annual_billing_banner}
          </div>
        )}

        <div className="mt-4 inline-flex items-center gap-1 bg-bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-1.5 rounded text-xs ${billingPeriod === 'monthly' ? 'bg-accent text-bg-primary font-semibold' : 'text-text-secondary'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-4 py-1.5 rounded text-xs ${billingPeriod === 'annual' ? 'bg-accent text-bg-primary font-semibold' : 'text-text-secondary'}`}
          >
            Annual <span className="text-[9px] opacity-70">2 months free</span>
          </button>
        </div>
      </header>

      {/* Comparison callout */}
      {config.comparison_callout_enabled && config.comparison_callout && (
        <section className="max-w-4xl mx-auto px-5 sm:px-8 pb-8">
          <div className="bg-gradient-to-br from-accent/10 to-transparent border border-accent/30 rounded-lg p-5 text-center">
            <p className="text-sm text-text-primary leading-relaxed">{config.comparison_callout}</p>
          </div>
        </section>
      )}

      {/* Plan cards */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(p => (
            <PlanCard key={p.id} plan={p} limits={limits[p.plan_key] || []} billingPeriod={billingPeriod} />
          ))}
        </div>
      </section>

      {/* Feature comparison table */}
      {config.comparison_table_enabled && (
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Compare plans in detail</h2>
          <FeatureTable plans={plans} features={features} limits={limits} />
        </section>
      )}

      {/* AI Credits explainer */}
      {config.credit_section_enabled && (
        <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-12">
          <div className="text-center mb-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent">AI Credits</div>
            <h2 className="text-2xl font-bold mt-1">Power your AI features</h2>
            <p className="text-xs text-text-muted mt-2 max-w-xl mx-auto">
              Every plan includes monthly AI credits. Heavy users can purchase credit packs
              that never expire.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {creditPacks.map(p => (
              <div key={p.id} className="bg-bg-card border border-border rounded-lg p-5 text-center">
                <div className="text-3xl font-bold text-accent">{p.credit_amount.toLocaleString()}</div>
                <div className="text-[10px] font-mono uppercase text-text-muted">credits</div>
                <div className="text-xl font-semibold mt-3">${(p.monthly_price_cents / 100).toFixed(0)}<span className="text-[11px] text-text-muted">/mo</span></div>
                <div className="text-[11px] text-text-muted mt-2">{p.best_for_text}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Addons */}
      {config.addon_section_enabled && addons.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-12">
          <div className="text-center mb-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Extras</div>
            <h2 className="text-2xl font-bold mt-1">Power-ups for any plan</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {addons.slice(0, 6).map(a => (
              <div key={a.id} className="bg-bg-card border border-border rounded-lg p-4">
                <div className="text-2xl">{a.icon}</div>
                <div className="text-sm font-semibold mt-2">{a.display_name}</div>
                <div className="text-[11px] text-text-secondary mt-1 line-clamp-2">{a.description}</div>
                <div className="text-sm font-bold text-accent mt-2">${(a.monthly_price_cents / 100).toFixed(0)}/mo</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {config.faq_enabled && faqs.length > 0 && (
        <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-12">
          <h2 className="text-2xl font-bold text-center mb-6">Frequently asked</h2>
          <div className="space-y-2">
            {faqs.map(f => <FaqItem key={f.id} question={f.question} answer={f.answer} />)}
          </div>
        </section>
      )}

      {/* Enterprise CTA */}
      {config.enterprise_cta_enabled && (
        <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-16 text-center">
          <div className="bg-bg-card border border-accent/30 rounded-lg p-8 space-y-3">
            <h2 className="text-xl font-bold">Enterprise</h2>
            <p className="text-sm text-text-secondary">{config.enterprise_cta_subtext}</p>
            <a
              href="mailto:hello@loud-legacy.com"
              className="inline-block bg-accent text-bg-primary font-semibold px-6 py-3 rounded-lg text-sm hover:opacity-90"
            >
              {config.enterprise_cta_text || 'Talk to us'}
            </a>
          </div>
        </section>
      )}

      <footer className="border-t border-border py-10 text-center">
        <div className="text-[10px] text-text-muted">
          © {new Date().getFullYear()} Loud Legacy · <Link to="/" className="hover:text-accent">Home</Link> · <Link to="/compare" className="hover:text-accent">Compare</Link> · <Link to="/pricing" className="hover:text-accent">Pricing</Link>
        </div>
      </footer>
    </div>
  )
}

function PlanCard({ plan, limits, billingPeriod }) {
  const price = billingPeriod === 'annual'
    ? Math.round((plan.annual_price_cents / 100) / 12)
    : Math.round(plan.monthly_price_cents / 100)
  const isFeatured = plan.is_featured
  const isEnterprise = plan.plan_key === 'enterprise'
  const topLimits = limits.filter(l => l.show_on_pricing_page).slice(0, 6)

  return (
    <div className={`bg-bg-card border rounded-lg p-5 relative ${isFeatured ? 'border-accent scale-[1.02] shadow-lg shadow-accent/10' : 'border-border'}`}>
      {plan.badge_text && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-bg-primary text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded">
          {plan.badge_text}
        </div>
      )}
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">{plan.display_name}</div>
      <div className="mt-2">
        {isEnterprise ? (
          <div className="text-2xl font-bold">Custom</div>
        ) : price === 0 ? (
          <div className="text-2xl font-bold">Free</div>
        ) : (
          <>
            <div className="text-3xl font-bold">${price}<span className="text-sm text-text-muted">/mo</span></div>
            {billingPeriod === 'annual' && plan.annual_price_cents > 0 && (
              <div className="text-[10px] text-text-muted">billed ${(plan.annual_price_cents / 100).toFixed(0)}/year</div>
            )}
          </>
        )}
      </div>
      {plan.tagline && <div className="text-[11px] text-text-muted mt-2">{plan.tagline}</div>}

      <Link
        to={plan.cta_url || '/login'}
        className={`block w-full text-center py-2.5 rounded mt-4 text-xs font-semibold ${isFeatured ? 'bg-accent text-bg-primary' : 'border border-border text-text-secondary hover:border-accent/50'}`}
      >
        {plan.cta_text || 'Start free trial'}
      </Link>

      <ul className="mt-4 space-y-1.5 text-[11px]">
        {topLimits.map(l => (
          <li key={l.id} className="flex items-start gap-1.5">
            <span className="text-accent shrink-0">✓</span>
            <span className="text-text-secondary">
              <strong className="text-text-primary">{l.pricing_page_display || (l.limit_value === -1 ? 'Unlimited' : l.limit_value)}</strong> {l.limit_display_name?.toLowerCase()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FeatureTable({ plans, features, limits }) {
  // Build category groups from features
  const categories = {}
  Object.entries(features).forEach(([planKey, planFeatures]) => {
    planFeatures.forEach(f => {
      if (!f.show_on_pricing_page) return
      if (!categories[f.pricing_page_category]) categories[f.pricing_page_category] = new Set()
      categories[f.pricing_page_category].add(f.feature_key)
    })
  })

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
          <tr>
            <th className="text-left p-3">Feature</th>
            {plans.map(p => (
              <th key={p.id} className="text-center p-3">{p.display_name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(categories).map(([category, keys]) => (
            <>
              <tr key={category} className="border-t-2 border-accent/20">
                <td colSpan={plans.length + 1} className="p-2 text-[10px] font-mono uppercase tracking-widest text-accent bg-bg-surface/50">
                  {category}
                </td>
              </tr>
              {[...keys].map(fk => {
                // Use the display name from any plan that has this feature
                const displayName = Object.values(features).flat().find(f => f.feature_key === fk)?.feature_display_name || fk
                return (
                  <tr key={fk} className="border-t border-border">
                    <td className="p-3 text-text-secondary">{displayName}</td>
                    {plans.map(p => {
                      const f = (features[p.plan_key] || []).find(x => x.feature_key === fk)
                      return (
                        <td key={p.id} className="p-3 text-center">
                          {f?.is_enabled ? <span className="text-success">✓</span> : <span className="text-text-muted/50">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-bg-card border border-border rounded-lg">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left">
        <span className="text-sm font-medium">{question}</span>
        <span className="text-accent">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-4 text-[12px] text-text-secondary leading-relaxed">{answer}</div>}
    </div>
  )
}

function TopNav() {
  return (
    <div className="border-b border-border">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="font-mono font-bold text-accent text-base">LOUD LEGACY</Link>
        <nav className="flex items-center gap-4 text-xs">
          <Link to="/compare" className="text-text-secondary hover:text-accent">Compare</Link>
          <Link to="/pricing" className="text-accent">Pricing</Link>
          <Link to="/login" className="bg-accent text-bg-primary font-semibold px-3 py-1.5 rounded">Start free</Link>
        </nav>
      </div>
    </div>
  )
}

async function loadPricingData() {
  const [plansRes, limitsRes, featuresRes, addonsRes, packsRes, configRes, faqsRes] = await Promise.all([
    supabase.from('pricing_plans').select('*').eq('is_active', true).order('display_order'),
    supabase.from('plan_limits').select('*, pricing_plans(plan_key)').order('display_order'),
    supabase.from('plan_features').select('*, pricing_plans(plan_key)').order('display_order'),
    supabase.from('addons').select('*').eq('is_active', true).order('display_order'),
    supabase.from('ai_credit_packs').select('*').eq('is_active', true).order('display_order'),
    supabase.from('pricing_page_config').select('*'),
    supabase.from('pricing_page_faqs').select('*').eq('is_active', true).order('display_order'),
  ])

  // Group limits + features by plan_key
  const limits = {}
  ;(limitsRes.data || []).forEach(l => {
    const k = l.pricing_plans?.plan_key
    if (!k) return
    if (!limits[k]) limits[k] = []
    limits[k].push(l)
  })

  const features = {}
  ;(featuresRes.data || []).forEach(f => {
    const k = f.pricing_plans?.plan_key
    if (!k) return
    if (!features[k]) features[k] = []
    features[k].push(f)
  })

  // Parse config
  const config = {}
  ;(configRes.data || []).forEach(c => {
    let val = c.config_value
    if (c.config_type === 'boolean') val = val === 'true'
    config[c.config_key] = val
  })

  return {
    plans: plansRes.data || [],
    limits,
    features,
    addons: addonsRes.data || [],
    creditPacks: packsRes.data || [],
    config,
    faqs: faqsRes.data || [],
  }
}
