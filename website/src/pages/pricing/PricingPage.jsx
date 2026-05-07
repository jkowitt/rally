import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'
import { PLAN_TIERS, COMPARISON_SECTIONS, ADDONS } from '@/data/plans'
import { Check, Minus, ChevronDown } from 'lucide-react'

// Public /pricing page.
//
// Layout: cards on top (quick scan, primary buy CTAs), comparison
// table below (deep-dive feature parity). On mobile the cards stack
// vertically and the table collapses each section behind a tap-to-
// expand accordion so it fits a thumb-scroll.
//
// All copy + numbers come from src/data/plans.ts so the welcome-gate
// plan picker and this page never drift.

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly') // 'monthly' | 'annual'

  useSeo({
    title: 'Pricing — Loud Legacy',
    description: 'Free CRM and AI prospecting. Paid plans from $29/month — cheaper than one seat of HubSpot.',
    canonical: 'https://loud-legacy.com/pricing',
  })

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <TopNav />

      {/* Hero */}
      <header className="max-w-5xl mx-auto px-5 sm:px-8 pt-20 pb-10 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
          Simple pricing for revenue teams.
        </h1>
        <p className="text-sm sm:text-lg text-text-secondary mt-4 max-w-2xl mx-auto">
          CRM and AI prospecting on every plan. Free forever to start. Email integration unlocks on Enterprise.
        </p>
        <div className="mt-6 inline-flex items-center gap-1 bg-bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-1.5 rounded text-xs ${
              billing === 'monthly' ? 'bg-accent text-bg-primary font-semibold' : 'text-text-secondary'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-4 py-1.5 rounded text-xs ${
              billing === 'annual' ? 'bg-accent text-bg-primary font-semibold' : 'text-text-secondary'
            }`}
          >
            Annual <span className="text-[9px] opacity-70 ml-1">2 months free</span>
          </button>
        </div>
      </header>

      {/* Plan cards. items-stretch + flex-1 inside the cards keeps
          every CTA button on the same baseline regardless of how many
          highlight bullets each tier has. */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch pt-3">
          {PLAN_TIERS.map(tier => (
            <PlanCard key={tier.id} tier={tier} billing={billing} />
          ))}
        </div>

        {/* Add-ons */}
        <div className="mt-10 bg-bg-surface border border-border rounded-lg p-5 sm:p-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">Add-ons (any plan)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ADDONS.map(a => (
              <div key={a.label} className="flex items-center justify-between bg-bg-card rounded p-3">
                <span className="text-sm text-text-primary">{a.label}</span>
                <span className="text-sm font-mono text-accent">${a.amount} <span className="text-[10px] text-text-muted">{a.price}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">Compare every feature</h2>
          <p className="text-sm text-text-secondary mt-2">Tap any section to see the full breakdown.</p>
        </div>

        <ComparisonTable />
      </section>

      {/* CTA strip */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 pb-24 text-center">
        <h3 className="text-xl sm:text-2xl font-semibold text-text-primary">
          Try it free. No credit card.
        </h3>
        <p className="text-sm text-text-secondary mt-2">
          Get a CRM and AI prospect search in under two minutes.
        </p>
        <Link
          to="/login?mode=signup"
          className="inline-block mt-6 bg-accent text-bg-primary px-8 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Start Free →
        </Link>
      </section>
    </div>
  )
}

function PlanCard({ tier, billing }) {
  const isAnnual = billing === 'annual'
  const isFree = tier.monthly === 0
  // Annual is sold as 10×monthly billed yearly. The yearly /yr label
  // makes it explicit; the monthly equivalent helps comparison shop.
  const displayPrice = isFree
    ? '$0'
    : isAnnual
      ? `$${Math.round(tier.annual / 12)}`
      : `$${tier.monthly}`
  const periodLabel = isFree ? 'forever' : '/mo'
  const billingNote = !isFree && isAnnual
    ? `Billed annually — $${tier.annual}/yr`
    : !isFree && !isAnnual
      ? 'Billed monthly'
      : null

  return (
    <div
      className={`relative h-full flex flex-col rounded-lg border p-5 text-left ${
        tier.featured
          ? 'border-accent bg-accent/5 shadow-lg shadow-accent/10'
          : 'border-border bg-bg-surface'
      }`}
    >
      {tier.featured && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase tracking-widest bg-accent text-bg-primary px-2 py-0.5 rounded whitespace-nowrap">
          Most popular
        </div>
      )}
      <div className="text-sm font-semibold text-text-primary">{tier.name}</div>
      <div className="text-[11px] text-text-muted mt-0.5 min-h-[28px]">{tier.tagline}</div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-text-primary">{displayPrice}</span>
        <span className="text-[11px] text-text-muted">{periodLabel}</span>
      </div>
      {billingNote && (
        <div className="text-[10px] text-text-muted mt-1 font-mono">{billingNote}</div>
      )}

      <ul className="mt-5 space-y-2 text-[12px] text-text-secondary flex-1">
        {tier.highlights.map(f => (
          <li key={f.label} className="flex items-start gap-2">
            {f.included ? (
              <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-[2px]" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-text-muted/50 shrink-0 mt-[2px]" />
            )}
            <span className={f.included ? '' : 'line-through text-text-muted/60'}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      <Link
        to={`/login?mode=signup&plan=${tier.id}`}
        className={`mt-6 block w-full text-center py-2.5 rounded text-sm font-semibold transition-opacity ${
          tier.featured
            ? 'bg-accent text-bg-primary hover:opacity-90'
            : 'border border-border text-text-primary hover:border-accent/50'
        }`}
      >
        {tier.cta}
      </Link>
    </div>
  )
}

function ComparisonTable() {
  // First section open by default so the user sees something
  // immediately even on mobile. Other sections expand on tap.
  const [openSections, setOpenSections] = useState(() => new Set([COMPARISON_SECTIONS[0].title]))

  function toggleSection(title) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  return (
    <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
      {/* Sticky-ish header so the user knows which plan they're scanning */}
      <div className="hidden sm:grid grid-cols-5 sticky top-0 z-10 bg-bg-surface border-b border-border">
        <div className="px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-text-muted">Feature</div>
        {PLAN_TIERS.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 text-center text-[11px] font-semibold ${
              t.featured ? 'text-accent' : 'text-text-primary'
            }`}
          >
            {t.name}
          </div>
        ))}
      </div>

      {COMPARISON_SECTIONS.map(section => {
        const isOpen = openSections.has(section.title)
        return (
          <div key={section.title} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => toggleSection(section.title)}
              className="w-full flex items-center justify-between px-4 py-3 bg-bg-card hover:bg-bg-card/70 transition-colors text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-text-primary">{section.title}</span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="divide-y divide-border">
                {section.rows.map(row => (
                  <div
                    key={row.label}
                    className="grid grid-cols-2 sm:grid-cols-5"
                  >
                    <div className="px-4 py-3 text-xs sm:text-sm text-text-secondary col-span-2 sm:col-span-1 sm:border-r sm:border-border">
                      {row.label}
                    </div>
                    {PLAN_TIERS.map(t => (
                      <div
                        key={t.id}
                        className="px-4 py-3 text-center text-xs sm:text-sm border-t border-border sm:border-t-0 flex items-center justify-center"
                      >
                        {/* Mobile-only column label so the cell makes sense without the header row */}
                        <div className="sm:hidden text-[9px] font-mono uppercase tracking-wider text-text-muted mr-2">
                          {t.name}:
                        </div>
                        <CellValue value={row.values[t.id]} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CellValue({ value }) {
  if (value === true) return <Check className="w-4 h-4 text-accent" aria-label="Included" />
  if (value === false) return <Minus className="w-4 h-4 text-text-muted/40" aria-label="Not included" />
  return <span className="text-text-primary text-xs sm:text-sm font-mono">{value}</span>
}

function TopNav() {
  return (
    <nav className="border-b border-border/50 bg-bg-primary/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="font-mono font-bold text-accent text-sm" style={{ letterSpacing: '0.08em', wordSpacing: '-0.3em' }}>
          LOUD LEGACY
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-xs text-text-muted hover:text-text-primary">Sign in</Link>
          <Link
            to="/login?mode=signup"
            className="bg-accent text-bg-primary px-4 py-1.5 rounded text-xs font-semibold hover:opacity-90"
          >
            Start Free
          </Link>
        </div>
      </div>
    </nav>
  )
}
