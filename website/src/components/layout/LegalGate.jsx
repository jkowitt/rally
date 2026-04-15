import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function LegalGate({ children }) {
  const { profile, fetchProfile } = useAuth()
  const [documents, setDocuments] = useState([])
  const [accepting, setAccepting] = useState(false)
  const [loading, setLoading] = useState(true)
  // User must explicitly check these before the Accept button activates.
  // Separate checkboxes satisfy consent-specificity requirements
  // (CASL, GDPR, CCPA) for each distinct document.
  const [readTerms, setReadTerms] = useState(false)
  const [readPrivacy, setReadPrivacy] = useState(false)

  const needsTerms = profile && !profile.terms_accepted
  const needsPrivacy = profile && !profile.privacy_accepted

  useEffect(() => {
    if (needsTerms || needsPrivacy) {
      loadDocuments()
    } else {
      setLoading(false)
    }
  }, [profile])

  async function loadDocuments() {
    const types = []
    if (needsTerms) types.push('terms_of_service')
    if (needsPrivacy) types.push('privacy_policy')

    const { data } = await supabase
      .from('legal_documents')
      .select('*')
      .in('type', types)
      .order('effective_date', { ascending: false })

    // Get latest version of each type
    const latest = {}
    data?.forEach((doc) => {
      if (!latest[doc.type]) latest[doc.type] = doc
    })
    setDocuments(Object.values(latest))
    setLoading(false)
  }

  async function handleAcceptAll() {
    setAccepting(true)
    try {
      const updates = {}
      const acceptances = []

      for (const doc of documents) {
        acceptances.push({
          user_id: profile.id,
          document_type: doc.type,
          document_version: doc.version,
        })
        if (doc.type === 'terms_of_service') {
          updates.terms_accepted = true
          updates.terms_accepted_at = new Date().toISOString()
        }
        if (doc.type === 'privacy_policy') {
          updates.privacy_accepted = true
          updates.privacy_accepted_at = new Date().toISOString()
        }
      }

      await supabase.from('legal_acceptances').insert(acceptances)
      await supabase.from('profiles').update(updates).eq('id', profile.id)
      await fetchProfile(profile.id)
    } catch (err) {
      console.error('Failed to accept legal documents:', err)
    }
    setAccepting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary font-mono text-sm">Loading...</div>
      </div>
    )
  }

  if (needsTerms || needsPrivacy) {
    const canAccept = (!needsTerms || readTerms) && (!needsPrivacy || readPrivacy)

    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-bg-surface border border-border rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Legal Agreements</h1>
          <p className="text-text-secondary mb-6">
            Please read the documents below carefully. Scroll to the bottom of each and check the
            confirmation box to continue. This confirmation is your consent record and is stored
            alongside your account.
          </p>

          <div className="space-y-6 mb-6">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-border rounded-lg p-4">
                <h2 className="text-lg font-medium text-text-primary mb-1">
                  {doc.type === 'terms_of_service' ? 'Terms of Service' : 'Privacy Policy'}
                  <span className="ml-2 text-xs text-text-muted font-mono">v{doc.version}</span>
                </h2>
                <div className="max-h-64 overflow-y-auto text-text-secondary text-sm leading-relaxed whitespace-pre-wrap pr-2">
                  {doc.content}
                </div>
                <label className="flex items-start gap-3 mt-4 pt-3 border-t border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doc.type === 'terms_of_service' ? readTerms : readPrivacy}
                    onChange={(e) => {
                      if (doc.type === 'terms_of_service') setReadTerms(e.target.checked)
                      else setReadPrivacy(e.target.checked)
                    }}
                    className="accent-accent mt-0.5 w-4 h-4"
                  />
                  <span className="text-sm text-text-primary">
                    I have read and agree to the{' '}
                    <strong>{doc.type === 'terms_of_service' ? 'Terms of Service' : 'Privacy Policy'}</strong>
                    {' '}(version {doc.version}).
                  </span>
                </label>
              </div>
            ))}
          </div>

          {needsTerms && (
            <div className="text-[11px] text-text-muted bg-bg-primary border border-border rounded p-3 mb-6 leading-relaxed">
              <strong className="text-text-primary">Note about The Digest:</strong>{' '}
              By creating an account, you are subscribed to The Digest — our monthly editorial
              newsletter. You can unsubscribe at any time via the link at the bottom of every
              email or from your{' '}
              <a href="/app/settings" className="text-accent hover:underline">account settings</a>.
              This is spelled out in the Terms of Service above.
            </div>
          )}

          <button
            onClick={handleAcceptAll}
            disabled={accepting || !canAccept}
            className="w-full bg-accent text-bg-primary font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {accepting ? 'Accepting…' : canAccept ? 'Accept & Continue' : 'Check the boxes above to continue'}
          </button>
        </div>
      </div>
    )
  }

  return children
}
