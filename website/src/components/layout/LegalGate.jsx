import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function LegalGate({ children }) {
  const { profile, fetchProfile } = useAuth()
  const [documents, setDocuments] = useState([])
  const [accepting, setAccepting] = useState(false)
  const [loading, setLoading] = useState(true)

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
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-bg-surface border border-border rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Legal Agreements</h1>
          <p className="text-text-secondary mb-6">
            Please review and accept the following documents to continue.
          </p>

          <div className="space-y-6 mb-8">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-border rounded-lg p-4">
                <h2 className="text-lg font-medium text-text-primary mb-1">
                  {doc.type === 'terms_of_service' ? 'Terms of Service' : 'Privacy Policy'}
                  <span className="ml-2 text-xs text-text-muted font-mono">v{doc.version}</span>
                </h2>
                <div className="max-h-48 overflow-y-auto text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                  {doc.content}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAcceptAll}
            disabled={accepting}
            className="w-full bg-accent text-bg-primary font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {accepting ? 'Accepting...' : 'Accept All & Continue'}
          </button>
        </div>
      </div>
    )
  }

  return children
}
