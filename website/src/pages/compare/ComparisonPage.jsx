import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'
import { COMPARISONS, FEATURE_ROWS, LOUD_LEGACY } from '@/data/comparisons'

const SITE = 'https://loud-legacy.com'

/**
 * Single shared component used by every /compare/<slug> page.
 * Receives a slug, looks up the comparison data, renders everything.
 * Keeps the bundle small — all 6 pages share one chunk.
 */
export default function ComparisonPage({ slug }) {
  const data = COMPARISONS.find(c => c.slug === slug)
  // Compute SEO values defensively so useSeo can be called with
  // valid (or empty) inputs even when data is missing — moving the
  // null-return below useSeo would otherwise violate rules-of-hooks.
  const canonical = `${SITE}/compare/${slug}`

  // JSON-LD schema is only meaningful when data exists. Building it
  // unguarded threw when slug was missing because every reference
  // is data.X. Guard with a ternary; useSeo() called below will see
  // a clean undefined when data is null and no-op.
  const schema = !data ? null : {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': canonical,
        url: canonical,
        name: data.metaTitle,
        description: data.metaDescription,
        isPartOf: { '@id': `${SITE}/compare` },
        breadcrumb: { '@id': `${canonical}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE}/compare` },
          { '@type': 'ListItem', position: 3, name: `${LOUD_LEGACY.name} vs ${data.competitor}` },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        name: LOUD_LEGACY.name,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: { '@type': 'Offer', price: '39', priceCurrency: 'USD' },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '24' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Who should use ${LOUD_LEGACY.name} instead of ${data.competitor}?`,
            acceptedAnswer: { '@type': 'Answer', text: data.whoShouldChoose.loudLegacy },
          },
          {
            '@type': 'Question',
            name: `Who should use ${data.competitor} instead of ${LOUD_LEGACY.name}?`,
            acceptedAnswer: { '@type': 'Answer', text: data.whoShouldChoose.competitor },
          },
        ],
      },
    ],
  }

  useSeo({
    title: data?.metaTitle,
    description: data?.metaDescription,
    canonical,
    schema: data ? schema : undefined,
  })

  // Hook order is now stable; safe to early-return on missing slug.
  if (!data) return null

  const otherComparisons = COMPARISONS.filter(c => c.slug !== slug)

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Top nav */}
      <TopNav />

      {/* Hero */}
      <header className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-8">
        <nav className="text-[11px] text-text-muted mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-accent">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/compare" className="hover:text-accent">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-text-secondary">vs {data.competitor}</span>
        </nav>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
          {data.h1}
        </h1>
        <p className="text-sm sm:text-base text-text-secondary mt-4 max-w-3xl leading-relaxed">
          {data.summary}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/login" className="bg-accent text-bg-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:opacity-90">
            Start free trial
          </Link>
          <Link to="/#pricing" className="border border-border text-text-secondary px-5 py-2.5 rounded-lg text-sm hover:border-accent/50 hover:text-accent">
            See pricing
          </Link>
          <span className="text-[11px] text-text-muted">$39/mo · no credit card · cancel anytime</span>
        </div>
      </header>

      {/* Feature matrix */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <SectionHeading eyebrow="Feature comparison" title={`${LOUD_LEGACY.name} vs ${data.competitor}`} />
        <div className="mt-6 bg-bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-bg-surface">
                <tr>
                  <th className="text-left p-3 font-semibold text-text-muted uppercase text-[10px] tracking-wider">Feature</th>
                  <th className="text-left p-3 font-semibold text-accent">{LOUD_LEGACY.name}</th>
                  <th className="text-left p-3 font-semibold text-text-secondary">{data.competitor}</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row, i) => {
                  const isNewCategory = i === 0 || FEATURE_ROWS[i - 1].category !== row.category
                  return (
                    <tr key={row.id} className={`border-t border-border ${isNewCategory ? 'border-t-2 border-t-border' : ''}`}>
                      <td className="p-3 text-text-secondary">{row.label}</td>
                      <td className="p-3"><FeatureCell value={LOUD_LEGACY.features[row.id]} /></td>
                      <td className="p-3"><FeatureCell value={data.features[row.id]} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Competitor strengths */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <SectionHeading
          eyebrow={`Where ${data.competitor} wins`}
          title={`What ${data.competitor} does well`}
        />
        <p className="text-xs text-text-muted mt-2">
          An honest comparison means acknowledging what the other tool is good at.
        </p>
        <ul className="mt-6 space-y-2">
          {data.competitorStrengths.map((s, i) => (
            <li key={i} className="flex items-start gap-3 bg-bg-card border border-border rounded-lg p-4 text-sm">
              <span className="text-accent shrink-0 mt-0.5">✓</span>
              <span className="text-text-secondary">{s}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Loud CRM advantages */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <SectionHeading
          eyebrow="Where Loud CRM wins"
          title={`Why sponsorship teams choose ${LOUD_LEGACY.name}`}
        />
        <ul className="mt-6 space-y-2">
          {data.loudLegacyAdvantages.map((s, i) => (
            <li key={i} className="flex items-start gap-3 bg-gradient-to-br from-accent/5 to-transparent border border-accent/20 rounded-lg p-4 text-sm">
              <span className="text-accent shrink-0 mt-0.5 font-bold">★</span>
              <span className="text-text-primary">{s}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Who should choose what */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <SectionHeading eyebrow="Decision guide" title="Who should choose what" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-bg-card border border-accent/30 rounded-lg p-6 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Choose {LOUD_LEGACY.name} if…</div>
            <p className="text-sm text-text-secondary leading-relaxed">{data.whoShouldChoose.loudLegacy}</p>
            <Link
              to="/login"
              className="inline-block mt-2 bg-accent text-bg-primary font-semibold px-4 py-2 rounded text-xs hover:opacity-90"
            >
              Start free trial →
            </Link>
          </div>
          <div className="bg-bg-card border border-border rounded-lg p-6 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Choose {data.competitor} if…</div>
            <p className="text-sm text-text-secondary leading-relaxed">{data.whoShouldChoose.competitor}</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">Try {LOUD_LEGACY.name} free for 14 days</h2>
        <p className="text-sm text-text-secondary mt-3 max-w-xl mx-auto">
          No credit card required. Upload a sponsor contract and see AI contract parsing
          extract every benefit in 30 seconds.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/login" className="bg-accent text-bg-primary font-semibold px-6 py-3 rounded-lg text-sm hover:opacity-90">
            Start free trial
          </Link>
          <Link to="/#pricing" className="border border-border text-text-secondary px-6 py-3 rounded-lg text-sm hover:border-accent/50 hover:text-accent">
            See pricing
          </Link>
        </div>
      </section>

      {/* Other comparisons */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-10 border-t border-border">
        <SectionHeading eyebrow="Keep comparing" title="Other Loud CRM comparisons" />
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {otherComparisons.map(c => (
            <Link
              key={c.slug}
              to={`/compare/${c.slug}`}
              className="bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 hover:bg-bg-surface transition-all"
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">vs</div>
              <div className="text-sm font-semibold text-text-primary mt-1">{c.competitor}</div>
            </Link>
          ))}
          <Link
            to="/compare"
            className="bg-bg-card border border-accent/30 rounded-lg p-4 hover:bg-accent/10 transition-all"
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Hub</div>
            <div className="text-sm font-semibold text-text-primary mt-1">All comparisons →</div>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function FeatureCell({ value }) {
  if (value === true) return <span className="text-success font-semibold">✓ Yes</span>
  if (value === false) return <span className="text-danger/70">✗ No</span>
  if (value === 'partial') return <span className="text-warning">~ Partial</span>
  return <span className="text-text-secondary">{value}</span>
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-accent">{eyebrow}</div>
      <h2 className="text-xl sm:text-2xl font-bold mt-1">{title}</h2>
    </div>
  )
}

function TopNav() {
  return (
    <div className="border-b border-border">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="font-mono font-bold text-accent text-base">LOUD LEGACY</Link>
        <nav className="flex items-center gap-4 text-xs">
          <Link to="/compare" className="text-text-secondary hover:text-accent">Compare</Link>
          <Link to="/#pricing" className="text-text-secondary hover:text-accent">Pricing</Link>
          <Link to="/login" className="bg-accent text-bg-primary font-semibold px-3 py-1.5 rounded hover:opacity-90">
            Start free
          </Link>
        </nav>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border mt-10 py-10 text-center">
      <div className="text-[10px] text-text-muted">
        © {new Date().getFullYear()} Loud CRM · <Link to="/" className="hover:text-accent">Home</Link> · <Link to="/compare" className="hover:text-accent">Compare</Link> · <Link to="/#pricing" className="hover:text-accent">Pricing</Link>
      </div>
    </footer>
  )
}
