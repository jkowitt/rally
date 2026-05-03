import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const CATEGORIES = [
  'Pipeline', 'Contracts', 'Assets', 'Fulfillment', 'Events', 'Valuations',
  'Newsletter', 'Contacts', 'Dashboard', 'Mobile', 'Integrations',
  'Reporting', 'Team', 'Billing', 'Other',
]

export default function FeatureSuggestion({ onClose }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({
    user_name: profile?.full_name || '',
    user_email: profile?.email || '',
    contact_me: true,
    category: 'Other',
    title: '',
    description: '',
    priority: 'nice_to_have',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('feature_suggestions').insert({
        ...form,
        property_id: profile?.property_id || null,
      })
      if (error) throw error
      setSubmitted(true)
      toast({ title: 'Suggestion submitted! Thank you.', type: 'success' })
    } catch (e) {
      toast({ title: 'Error', description: e.message, type: 'error' })
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feature-suggestion-success-title"
          className="bg-bg-surface border border-border rounded-lg p-6 sm:p-8 w-full max-w-md text-center"
        >
          <div className="text-4xl mb-3" aria-hidden="true">💡</div>
          <h2 id="feature-suggestion-success-title" className="text-lg font-semibold text-text-primary mb-2">Thank You!</h2>
          <p className="text-sm text-text-secondary mb-4">Your suggestion has been submitted. We review every submission and use them to prioritize what we build next.</p>
          {form.contact_me && <p className="text-xs text-text-muted mb-4">We'll reach out to {form.user_email} if we have questions.</p>}
          <button onClick={onClose} className="bg-accent text-bg-primary px-6 py-2 rounded text-sm font-medium hover:opacity-90">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-suggestion-title"
        className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 id="feature-suggestion-title" className="text-base sm:text-lg font-semibold text-text-primary">Suggest a Feature</h2>
            <p className="text-[10px] sm:text-xs text-text-muted mt-0.5">Help us build what matters to you</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="text-text-muted hover:text-text-primary text-lg">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Your Name *</label>
              <input value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })} required className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1" />
            </div>
            <div>
              <label className="text-xs text-text-muted">Email *</label>
              <input type="email" value={form.user_email} onChange={(e) => setForm({ ...form, user_email: e.target.value })} required className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1">
                <option value="nice_to_have">Nice to Have</option>
                <option value="important">Important</option>
                <option value="critical">Critical / Blocking</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-text-muted">Feature Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Bulk email send from pipeline" className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1" />
          </div>
          <div>
            <label className="text-xs text-text-muted">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={4} placeholder="Describe the feature you'd like, how you'd use it, and why it would be valuable..." className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={form.contact_me} onChange={(e) => setForm({ ...form, contact_me: e.target.checked })} className="accent-accent" />
            Contact me about this feature
          </label>
          <button type="submit" disabled={submitting || !form.title.trim() || !form.description.trim()} className="w-full bg-accent text-bg-primary py-2.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Suggestion'}
          </button>
        </form>
      </div>
    </div>
  )
}
