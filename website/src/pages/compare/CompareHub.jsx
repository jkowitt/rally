import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'
import { COMPARISONS, LOUD_LEGACY } from '@/data/comparisons'

const SITE = 'https://loud-legacy.com'

export default function CompareHub() {
  const canonical = `${SITE}/compare`

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': canonical,
        url: canonical,
        name: 'Loud Legacy Comparisons',
        description: 'Side-by-side comparisons of Loud Legacy vs Airtable, SponsorCX, HubSpot, Monday.com, spreadsheets, and Notion for sponsorship management.',
      },
      {
        '@type': 'ItemList',
        name: 'Sponsorship CRM comparisons',
        itemListElement: COMPARISONS.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE}/compare/${c.slug}`,
          name: `${LOUD_LEGACY.name} vs ${c.competitor}`,
        })),
      },
    ],
  }

  useSeo({
    title: 'Loud Legacy Comparisons — Sponsorship CRM Alternatives',
    description: 'Honest side-by-side comparisons of Loud Legacy vs Airtable, SponsorCX, HubSpot, Monday.com, spreadsheets, and Notion. See which sponsorship CRM fits your team.',
    canonical,
    schema,
  })

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Top nav */}
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="font-mono font-bold text-accent text-base">LOUD LEGACY</Link>
          <nav className="flex items-center gap-4 text-xs">
            <Link to="/compare" className="text-accent">Compare</Link>
            <Link to="/#pricing" className="text-text-secondary hover:text-accent">Pricing</Link>
            <Link to="/login" className="bg-accent text-bg-primary font-semibold px-3 py-1.5 rounded hover:opacity-90">Start free</Link>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <header className="max-w-4xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-10 text-center">
        <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-3">
          Loud Legacy vs the alternatives
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
          Which sponsorship CRM is right for you?
        </h1>
        <p className="text-sm sm:text-base text-text-secondary mt-4 max-w-2xl mx-auto leading-relaxed">
          Honest side-by-side comparisons of Loud Legacy against the tools sponsorship teams
          actually consider — Airtable, SponsorCX, HubSpot, Monday, spreadsheets, and Notion.
          We'll tell you when the other tool wins.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/login" className="bg-accent text-bg-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:opacity-90">
            Start free trial
          </Link>
          <Link to="/#pricing" className="border border-border text-text-secondary px-5 py-2.5 rounded-lg text-sm hover:border-accent/50 hover:text-accent">
            See pricing
          </Link>
        </div>
      </header>

      {/* Comparison cards */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMPARISONS.map(c => (
            <Link
              key={c.slug}
              to={`/compare/${c.slug}`}
              className="bg-bg-card border border-border rounded-lg p-6 hover:border-accent/50 hover:bg-bg-surface transition-all group"
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Loud Legacy vs</div>
              <div className="text-xl font-bold text-text-primary mt-1 group-hover:text-accent transition-colors">
                {c.competitor}
              </div>
              <p className="text-xs text-text-secondary mt-3 line-clamp-3 leading-relaxed">
                {c.summary}
              </p>
              <div className="text-[11px] text-accent mt-4 font-semibold">
                Read comparison →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick-pick section */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
        <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-3 text-center">
          Quick guidance
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Not sure where to start?</h2>
        <div className="mt-6 space-y-3">
          {QUICK_PICK.map((pick, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-lg p-4 flex items-start gap-4">
              <div className="text-accent text-xl font-mono shrink-0">{String(i + 1).padStart(2, '0')}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-text-primary">{pick.when}</div>
                <div className="text-xs text-text-secondary mt-1">{pick.answer}</div>
              </div>
              <Link to={pick.to} className="text-[11px] text-accent shrink-0 self-center hover:underline">
                Read →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">Ready to see it yourself?</h2>
        <p className="text-sm text-text-secondary mt-3">
          14-day free trial, no credit card, cancel anytime. Upload a sponsor contract and
          watch AI pull every benefit in 30 seconds.
        </p>
        <Link to="/login" className="inline-block mt-6 bg-accent text-bg-primary font-semibold px-6 py-3 rounded-lg text-sm hover:opacity-90">
          Start free trial
        </Link>
      </section>

      <footer className="border-t border-border py-10 text-center">
        <div className="text-[10px] text-text-muted">
          © {new Date().getFullYear()} Loud Legacy · <Link to="/" className="hover:text-accent">Home</Link> · <Link to="/compare" className="hover:text-accent">Compare</Link> · <Link to="/#pricing" className="hover:text-accent">Pricing</Link>
        </div>
      </footer>
    </div>
  )
}

const QUICK_PICK = [
  { when: 'You\'re running on spreadsheets and missing renewals', answer: 'Start here — the fastest ROI of any comparison we offer', to: '/compare/loud-legacy-vs-spreadsheets' },
  { when: 'You\'ve priced SponsorCX and can\'t justify $15K+/year', answer: '97% cost reduction with AI contract parsing built in', to: '/compare/loud-legacy-vs-sponsorcx' },
  { when: 'You tried to force HubSpot into a sponsorship workflow', answer: 'HubSpot is great for B2B sales, not for sponsor benefits and fulfillment', to: '/compare/loud-legacy-vs-hubspot' },
  { when: 'You built a custom Airtable base and outgrew it', answer: 'Everything you built in Airtable, working on day one', to: '/compare/loud-legacy-vs-airtable' },
  { when: 'You use Monday.com for everything across your org', answer: 'When to keep Monday and when sponsorship needs its own tool', to: '/compare/loud-legacy-vs-monday' },
  { when: 'You love Notion and wish it had a sponsorship template', answer: 'Why a sponsorship-specific CRM beats any Notion database', to: '/compare/loud-legacy-vs-notion' },
]
