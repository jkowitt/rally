import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'
import * as digest from '@/services/digestIssueService'
import DigestSignupForm from '@/components/digest/DigestSignupForm'

/**
 * /digest/:slug — individual published article, branded with
 * the Digest identity (coral / dark / off-white / Georgia).
 * Renders the stored markdown body via the minimal renderer
 * in src/lib/digestMarkdown.js.
 */
export default function DigestArticle() {
  const { slug } = useParams()
  const [issue, setIssue] = useState(null)
  const [prevNext, setPrevNext] = useState({ prev: null, next: null })
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { load() }, [slug])

  async function load() {
    setLoading(true)
    const { issue } = await digest.getIssueBySlug(slug)
    if (!issue) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setIssue(issue)
    // Log view (fire and forget)
    digest.logArticleView(issue.id)
    // Fetch neighbors for prev/next nav
    const all = await digest.listPublishedIssues({ limit: 100 })
    const idx = all.findIndex(i => i.id === issue.id)
    setPrevNext({
      prev: idx > 0 ? all[idx - 1] : null,
      next: idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null,
    })
    setLoading(false)
  }

  const canonical = issue ? `https://loud-legacy.com/digest/${issue.slug}` : null
  const ogSchema = issue ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: issue.title,
    description: issue.meta_description || issue.subtitle || digest.excerpt(issue.body_markdown, 160),
    author: { '@type': 'Organization', name: issue.author || 'Loud Legacy Ventures' },
    publisher: { '@type': 'Organization', name: 'Loud Legacy Ventures' },
    datePublished: issue.published_at,
    dateModified: issue.updated_at,
    image: issue.featured_image_url || undefined,
    url: canonical,
  } : null

  useSeo({
    title: issue ? `${issue.title} — The Digest` : 'The Digest',
    description: issue?.meta_description || issue?.subtitle || (issue ? digest.excerpt(issue.body_markdown, 160) : ''),
    canonical,
    schema: ogSchema,
  })

  if (notFound) return <Navigate to="/digest" replace />
  if (loading || !issue) {
    return (
      <div style={{ background: '#F1EFE8', minHeight: '100vh', fontFamily: 'Georgia, serif' }}>
        <div className="max-w-2xl mx-auto p-12 text-center" style={{ color: '#7a7a75' }}>Loading…</div>
      </div>
    )
  }

  const html = digest.renderMarkdown(issue.body_markdown || '')
  const readMins = digest.readingTime(issue.body_markdown)
  const publishedStr = issue.published_at
    ? new Date(issue.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div style={{ background: '#F1EFE8', color: '#1a1a18', fontFamily: 'Georgia, "Times New Roman", serif', minHeight: '100vh' }}>
      {/* Scoped styles for the markdown body */}
      <style>{DIGEST_ARTICLE_CSS}</style>

      <DigestHeader />

      <article className="max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
        {/* Breadcrumb */}
        <Link
          to="/digest"
          style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7a7a75', textDecoration: 'none' }}
        >
          ← The Digest
        </Link>

        {/* Category eyebrow */}
        <div className="mt-8" style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7a7a75' }}>
          {digest.INDUSTRIES.find(x => x.key === issue.industry)?.label || 'General Business'}
          {publishedStr && ' · ' + publishedStr}
        </div>

        {/* Headline */}
        <h1 className="mt-4" style={{ fontSize: '44px', lineHeight: '1.1', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {issue.title}
        </h1>

        {/* Subtitle */}
        {issue.subtitle && (
          <p className="mt-5" style={{ fontSize: '22px', lineHeight: '1.4', color: '#5a5a55', fontStyle: 'italic' }}>
            {issue.subtitle}
          </p>
        )}

        {/* Byline */}
        <div className="mt-6 pb-6" style={{ borderBottom: '1px solid #d4d0c3', fontSize: '13px', color: '#7a7a75' }}>
          <span style={{ fontWeight: 600, color: '#1a1a18' }}>{issue.author || 'Loud Legacy Ventures'}</span>
          {readMins && ` · ${readMins} min read`}
        </div>

        {/* Featured image */}
        {issue.featured_image_url && (
          <figure className="mt-8">
            <img
              src={issue.featured_image_url}
              alt={issue.featured_image_alt || issue.title}
              style={{ width: '100%', display: 'block' }}
              loading="lazy"
            />
            {issue.featured_image_alt && (
              <figcaption className="mt-2" style={{ fontSize: '12px', color: '#7a7a75', fontStyle: 'italic', textAlign: 'center' }}>
                {issue.featured_image_alt}
              </figcaption>
            )}
          </figure>
        )}

        {/* Article body */}
        <div
          className="mt-10 digest-article-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Social sharing */}
        <ShareRow issue={issue} canonical={canonical} />

        {/* Prev/Next navigation */}
        <PrevNextNav prev={prevNext.prev} next={prevNext.next} />

        {/* Subscribe CTA */}
        <section className="mt-16 pt-12" style={{ borderTop: '1px solid #d4d0c3' }}>
          <div className="text-center mb-6">
            <div style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#1a1a18' }}>
              Subscribe to The Digest
            </div>
            <p className="mt-3 max-w-md mx-auto" style={{ fontSize: '15px', lineHeight: '1.5', color: '#5a5a55' }}>
              One good article a month. No daily blasts, no spam.
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <DigestSignupForm source="article_footer" />
          </div>
        </section>
      </article>

      <DigestFooter />
    </div>
  )
}

function ShareRow({ issue, canonical }) {
  function copyLink() {
    navigator.clipboard.writeText(canonical || window.location.href)
    alert('Link copied')
  }
  const text = encodeURIComponent(issue.title)
  const url = encodeURIComponent(canonical || window.location.href)
  return (
    <div className="mt-12 pt-6" style={{ borderTop: '1px solid #d4d0c3' }}>
      <div className="flex items-center gap-3 text-[12px]" style={{ color: '#7a7a75' }}>
        <span>Share:</span>
        <a
          href={`https://twitter.com/intent/tweet?text=${text}&url=${url}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#D85A30', textDecoration: 'none' }}
        >
          X / Twitter
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#D85A30', textDecoration: 'none' }}
        >
          LinkedIn
        </a>
        <a
          href={`mailto:?subject=${text}&body=${url}`}
          style={{ color: '#D85A30', textDecoration: 'none' }}
        >
          Email
        </a>
        <button
          onClick={copyLink}
          style={{ color: '#D85A30', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '12px' }}
        >
          Copy link
        </button>
      </div>
    </div>
  )
}

function PrevNextNav({ prev, next }) {
  if (!prev && !next) return null
  return (
    <nav className="mt-12 pt-6 grid grid-cols-2 gap-6" style={{ borderTop: '1px solid #d4d0c3' }}>
      <div>
        {prev && (
          <Link to={`/digest/${prev.slug}`} className="block" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7a7a75' }}>← Previous</div>
            <div className="mt-2" style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a18', lineHeight: '1.3' }}>{prev.title}</div>
          </Link>
        )}
      </div>
      <div className="text-right">
        {next && (
          <Link to={`/digest/${next.slug}`} className="block" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#7a7a75' }}>Next →</div>
            <div className="mt-2" style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a18', lineHeight: '1.3' }}>{next.title}</div>
          </Link>
        )}
      </div>
    </nav>
  )
}

function DigestHeader() {
  return (
    <div style={{ borderBottom: '1px solid #d4d0c3' }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/digest" style={{ fontFamily: 'Georgia, serif', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#1a1a18', textDecoration: 'none' }}>
          The Digest
        </Link>
        <Link to="/" style={{ fontFamily: 'Georgia, serif', fontSize: '12px', color: '#7a7a75', textDecoration: 'none' }}>
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
        © {new Date().getFullYear()} Loud Legacy Ventures ·{' '}
        <Link to="/" style={{ color: '#7a7a75' }}>Home</Link> ·{' '}
        <Link to="/digest" style={{ color: '#7a7a75' }}>The Digest</Link>
      </div>
    </footer>
  )
}

// Scoped CSS for the rendered markdown body so the Digest brand
// typography works without conflicting with the main site's
// Tailwind classes.
const DIGEST_ARTICLE_CSS = `
.digest-article-body { font-size: 18px; line-height: 1.75; color: #1a1a18; }
.digest-article-body p { margin: 0 0 1.2em; }
.digest-article-body .digest-h1,
.digest-article-body .digest-h2 { font-size: 28px; line-height: 1.2; font-weight: 700; margin: 2em 0 0.6em; color: #1a1a18; }
.digest-article-body .digest-h3 { font-size: 22px; line-height: 1.3; font-weight: 700; margin: 1.8em 0 0.5em; color: #1a1a18; }
.digest-article-body .digest-h4 { font-size: 18px; line-height: 1.3; font-weight: 700; margin: 1.6em 0 0.4em; color: #1a1a18; }
.digest-article-body a { color: #D85A30; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
.digest-article-body a:hover { text-decoration-thickness: 2px; }
.digest-article-body strong { font-weight: 700; }
.digest-article-body em { font-style: italic; }
.digest-article-body code { background: #e6e2d3; padding: 1px 6px; border-radius: 2px; font-family: Menlo, monospace; font-size: 0.9em; }
.digest-article-body .digest-quote { border-left: 3px solid #D85A30; padding: 0 0 0 24px; margin: 2em 0; font-style: italic; color: #5a5a55; }
.digest-article-body .digest-quote p { margin: 0 0 0.8em; }
.digest-article-body .digest-list { margin: 1.2em 0; padding-left: 1.5em; }
.digest-article-body .digest-list li { margin-bottom: 0.5em; }
.digest-article-body .digest-hr { border: none; border-top: 1px solid #d4d0c3; margin: 2.5em 0; }
.digest-article-body .digest-img,
.digest-article-body .digest-figure img { width: 100%; display: block; margin: 1.5em 0; }
.digest-article-body .digest-citation { color: #D85A30; text-decoration: none; font-size: 0.8em; }
.digest-article-body sup { font-size: 0.7em; }
.digest-article-body .digest-citations { margin-top: 3em; padding-top: 2em; border-top: 1px solid #d4d0c3; }
.digest-article-body .digest-citations ol { padding-left: 1.5em; font-size: 14px; color: #5a5a55; }
.digest-article-body .digest-citations li { margin-bottom: 0.6em; }
`
