import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'
import * as digest from '@/services/digestIssueService'
import DigestSignupForm from '@/components/digest/DigestSignupForm'

/**
 * /digest — public archive of every published Digest issue.
 *
 * Branded with the Digest identity (coral #D85A30 / dark #1a1a18
 * / off-white #F1EFE8 / Georgia serif) — distinct from the main
 * Loud CRM dark theme. This brand is scoped to /digest/*
 * routes only via inline styles so it doesn't leak.
 */
export default function DigestArchive() {
  const [issues, setIssues] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useSeo({
    title: 'The Digest — Loud CRM Ventures',
    description: 'Monthly essays on real estate, sports, marketing, and general business. One deeply-researched article a month.',
    canonical: 'https://loud-legacy.com/digest',
  })

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    const data = await digest.listPublishedIssues({
      industry: filter === 'all' ? null : filter,
      limit: 100,
    })
    setIssues(data)
    setLoading(false)
  }

  return (
    <div style={{ background: '#F1EFE8', color: '#1a1a18', fontFamily: 'Georgia, "Times New Roman", serif', minHeight: '100vh' }}>
      <DigestHeader />

      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
        {/* Masthead */}
        <header className="text-center mb-16 sm:mb-20">
          <div style={{ fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', color: '#1a1a18' }}>
            The Digest
          </div>
          <div style={{ fontSize: '11px', color: '#7a7a75', marginTop: '6px' }}>
            by Loud CRM Ventures
          </div>
          <h1 className="mt-8 sm:mt-10" style={{ fontSize: '44px', lineHeight: '1.1', fontWeight: 700 }}>
            Monthly essays on<br />
            <span style={{ fontStyle: 'italic' }}>what's actually changing</span>
          </h1>
          <p className="mt-6 max-w-xl mx-auto" style={{ fontSize: '17px', lineHeight: '1.6', color: '#5a5a55' }}>
            One deeply-researched article a month on real estate, sports, marketing, or general business.
            No daily blasts. No listicles. Just the sharpest thing in your inbox that week.
          </p>
        </header>

        {/* Signup form */}
        <section className="max-w-md mx-auto mb-16 sm:mb-20">
          <DigestSignupForm source="archive_page" />
        </section>

        {/* Filter */}
        {issues.length > 0 && (
          <div className="flex items-center justify-center gap-1 mb-10 flex-wrap">
            {[
              { key: 'all', label: 'All' },
              ...digest.INDUSTRIES,
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '13px',
                  padding: '6px 14px',
                  borderRadius: '2px',
                  border: filter === f.key ? '1px solid #D85A30' : '1px solid #d4d0c3',
                  background: filter === f.key ? '#D85A30' : 'transparent',
                  color: filter === f.key ? '#F1EFE8' : '#5a5a55',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Issues list */}
        {loading && (
          <div className="text-center" style={{ color: '#7a7a75', fontSize: '13px' }}>Loading…</div>
        )}

        {!loading && issues.length === 0 && (
          <div className="text-center py-16" style={{ color: '#7a7a75', fontSize: '14px' }}>
            The first issue of The Digest is coming soon. Subscribe above to be notified when it lands.
          </div>
        )}

        <div className="space-y-12">
          {issues.map(i => (
            <article key={i.id} className="border-b pb-12" style={{ borderColor: '#d4d0c3' }}>
              <Link to={`/digest/${i.slug}`} className="block group">
                {i.featured_image_url && (
                  <div className="mb-6 overflow-hidden">
                    <img
                      src={i.featured_image_url}
                      alt={i.featured_image_alt || i.title}
                      className="w-full h-auto"
                      style={{ display: 'block' }}
                      loading="lazy"
                    />
                  </div>
                )}
                <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7a7a75', marginBottom: '8px' }}>
                  {digest.INDUSTRIES.find(x => x.key === i.industry)?.label || i.industry || 'General'}
                  {i.published_at && ' · ' + new Date(i.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <h2 className="group-hover:underline" style={{ fontSize: '32px', lineHeight: '1.2', fontWeight: 700, color: '#1a1a18' }}>
                  {i.title}
                </h2>
                {i.subtitle && (
                  <p className="mt-3" style={{ fontSize: '18px', lineHeight: '1.5', color: '#5a5a55', fontStyle: 'italic' }}>
                    {i.subtitle}
                  </p>
                )}
                <div className="mt-4" style={{ fontSize: '12px', color: '#7a7a75' }}>
                  {i.author || 'Loud CRM Ventures'}
                  {i.view_count > 0 && ` · ${i.view_count} reads`}
                  <span style={{ color: '#D85A30', marginLeft: '8px' }}>Read →</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </main>

      <DigestFooter />
    </div>
  )
}

function DigestHeader() {
  return (
    <div style={{ borderBottom: '1px solid #d4d0c3' }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/digest" style={{ fontFamily: 'Georgia, serif', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#1a1a18', textDecoration: 'none' }}>
          The Digest
        </Link>
        <Link
          to="/"
          style={{ fontFamily: 'Georgia, serif', fontSize: '12px', color: '#7a7a75', textDecoration: 'none' }}
        >
          loud-legacy.com ↗
        </Link>
      </div>
    </div>
  )
}

function DigestFooter() {
  return (
    <footer style={{ borderTop: '1px solid #d4d0c3', marginTop: '40px' }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 text-center" style={{ fontSize: '11px', color: '#7a7a75' }}>
        © {new Date().getFullYear()} Loud CRM Ventures ·{' '}
        <Link to="/" style={{ color: '#7a7a75' }}>Home</Link> ·{' '}
        <Link to="/digest" style={{ color: '#7a7a75' }}>The Digest</Link>
      </div>
    </footer>
  )
}
