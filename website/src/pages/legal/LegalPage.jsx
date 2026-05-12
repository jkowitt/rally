import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSeo } from '@/hooks/useSeo'

// Public legal pages — Terms of Service and Privacy Policy. Reads
// the latest active document of the matching type from the
// legal_documents table (RLS already allows public select). The
// table content is plain text; we render whitespace-preserved.
//
// Two routes use this component:
//   /legal/terms   → type='terms_of_service'
//   /legal/privacy → type='privacy_policy'
export default function LegalPage({ type }) {
  const isTerms = type === 'terms_of_service'
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy'
  const navigate = useNavigate()

  useSeo({
    title: `${title} — Loud Legacy`,
    description: isTerms
      ? 'The terms of service governing use of the Loud Legacy CRM and prospecting platform.'
      : 'How Loud Legacy collects, uses, and protects your data.',
  })

  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('legal_documents')
        .select('id, version, content, effective_date, is_active')
        .eq('type', type)
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (err) {
        setError(err.message)
      } else if (!data) {
        setError('not_found')
      } else {
        setDoc(data)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [type])

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-text-muted hover:text-accent inline-flex items-center gap-1"
            aria-label="Go back"
          >
            ← Back
          </button>
          <Link to="/" aria-label="Loud Legacy — Home">
            <img src="/logo-loud-legacy.svg" alt="Loud Legacy" className="h-6 w-auto" />
          </Link>
          <Link to="/login" className="text-xs text-text-muted hover:text-accent">
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Legal</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mt-2">{title}</h1>
        {doc && (
          <div className="mt-3 text-xs text-text-muted font-mono">
            Version {doc.version} · effective {new Date(doc.effective_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        )}

        <div className="mt-8">
          {loading && (
            <div className="text-sm text-text-muted">Loading…</div>
          )}
          {error === 'not_found' && (
            <div className="bg-bg-card border border-border rounded-lg p-5 text-sm text-text-secondary">
              The {title} hasn't been published yet. If you reached this page from a link in our app or an email, please contact{' '}
              <a href="mailto:jason@loud-legacy.com" className="text-accent hover:underline">jason@loud-legacy.com</a>{' '}
              and we'll get you a copy directly.
            </div>
          )}
          {error && error !== 'not_found' && (
            <div className="bg-danger/5 border border-danger/30 rounded-lg p-5 text-sm text-danger">
              Could not load the {title}: {error}
            </div>
          )}
          {doc && !loading && !error && (
            <article className="text-text-secondary text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
              {doc.content}
            </article>
          )}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
          <Link to={isTerms ? '/legal/privacy' : '/legal/terms'} className="hover:text-accent">
            {isTerms ? 'Privacy Policy →' : 'Terms of Service →'}
          </Link>
          <a href="mailto:jason@loud-legacy.com" className="hover:text-accent">
            Questions? jason@loud-legacy.com
          </a>
        </div>
      </main>
    </div>
  )
}
