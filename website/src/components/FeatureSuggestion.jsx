import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { useDialog } from '@/hooks/useDialog'

const CATEGORIES = [
  'Pipeline', 'Contracts', 'Assets', 'Fulfillment', 'Events', 'Valuations',
  'Newsletter', 'Contacts', 'Dashboard', 'Mobile', 'Integrations',
  'Reporting', 'Team', 'Billing', 'Other',
]

// Single form, two surfaces. `kind="feature"` (default) is the
// "Suggest a Feature" sidebar entry; `kind="issue"` is the floating
// bug-report bubble. Schema discriminates via submission_type
// (migration 094) — same DB row shape, different intent.
export default function FeatureSuggestion({ onClose, kind = 'feature' }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const dialogRef = useDialog({ isOpen: true, onClose })
  const isIssue = kind === 'issue'
  const [form, setForm] = useState({
    user_name: profile?.full_name || '',
    user_email: profile?.email || '',
    contact_me: true,
    category: 'Other',
    title: '',
    description: '',
    priority: isIssue ? 'important' : 'nice_to_have',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Copy strings flip based on kind so we don't render the bug
  // form with feature-request labels (or vice-versa).
  const copy = isIssue ? {
    title: 'Report an Issue',
    subtitle: 'Tell us what broke — we triage every report.',
    titleField: 'What went wrong? *',
    titlePlaceholder: 'e.g. Pipeline cards stuck at "Negotiation"',
    descField: 'Steps to reproduce + what you expected *',
    descPlaceholder: '1. Opened Pipeline\n2. Dragged card to Contracted\n3. Card snapped back to Negotiation\nExpected: card moves and stage updates.',
    submit: 'Submit Issue',
    contact: 'Contact me about this issue',
    successTitle: 'Issue logged',
    successBody: 'We log every report. If we have follow-up questions about reproduction, we\'ll reach out.',
    icon: '🐛',
  } : {
    title: 'Suggest a Feature',
    subtitle: 'Help us build what matters to you',
    titleField: 'Feature Title *',
    titlePlaceholder: 'e.g. Bulk email send from pipeline',
    descField: 'Description *',
    descPlaceholder: "Describe the feature you'd like, how you'd use it, and why it would be valuable...",
    submit: 'Submit Suggestion',
    contact: 'Contact me about this feature',
    successTitle: 'Thank you!',
    successBody: 'Your suggestion has been submitted. We review every submission and use them to prioritize what we build next.',
    icon: '💡',
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('feature_suggestions').insert({
        ...form,
        submission_type: kind,
        property_id: profile?.property_id || null,
      })
      if (error) throw error
      setSubmitted(true)
      toast({ title: `${isIssue ? 'Issue' : 'Suggestion'} submitted! Thank you.`, type: 'success' })
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
          <div className="text-4xl mb-3" aria-hidden="true">{copy.icon}</div>
          <h2 id="feature-suggestion-success-title" className="text-lg font-semibold text-text-primary mb-2">{copy.successTitle}</h2>
          <p className="text-sm text-text-secondary mb-4">{copy.successBody}</p>
          {form.contact_me && <p className="text-xs text-text-muted mb-4">We'll reach out to {form.user_email} if we have questions.</p>}
          <button onClick={onClose} className="bg-accent text-bg-primary px-6 py-2 rounded text-sm font-medium hover:opacity-90">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-suggestion-title"
        tabIndex={-1}
        className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg w-full sm:max-w-lg max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 id="feature-suggestion-title" className="text-base sm:text-lg font-semibold text-text-primary">{copy.title}</h2>
            <p className="text-[10px] sm:text-xs text-text-muted mt-0.5">{copy.subtitle}</p>
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
            <label className="text-xs text-text-muted">{copy.titleField}</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder={copy.titlePlaceholder} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1" />
          </div>
          <div>
            <label className="text-xs text-text-muted">{copy.descField}</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={4} placeholder={copy.descPlaceholder} className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={form.contact_me} onChange={(e) => setForm({ ...form, contact_me: e.target.checked })} className="accent-accent" />
            {copy.contact}
          </label>
          <button type="submit" disabled={submitting || !form.title.trim() || !form.description.trim()} className="w-full bg-accent text-bg-primary py-2.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {submitting ? 'Submitting...' : copy.submit}
          </button>
        </form>
      </div>
    </div>
  )
}
