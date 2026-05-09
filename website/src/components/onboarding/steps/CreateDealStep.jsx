import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { trackEvent } from '@/services/onboardingService'

// CreateDealStep — second onboarding screen. Asks for the absolute
// minimum to make a usable deal card (sponsor name) and treats the
// other two fields as nice-to-haves with explicit "why we ask".
// Reasons we kept it three fields:
//   • brand_name — required, unique-ish, drives the card title
//   • contact_name — anchors the relationship; everything else
//     (email, role, linkedin) gets enriched on demand later
//   • value — sets weighted-pipeline + win-rate KPIs from day one;
//     ballpark is fine, the user can refine later
export default function CreateDealStep({ onNext, onSkip }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({ brand_name: '', contact_name: '', value: '' })
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!form.brand_name.trim()) {
      toast({ title: 'Sponsor name required', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('deals').insert({
        property_id: profile?.property_id,
        brand_name: form.brand_name.trim(),
        contact_name: form.contact_name.trim() || null,
        value: form.value ? Number(form.value) : null,
        stage: 'Prospect',
      })
      if (error) throw error
      trackEvent('deal_created_during_onboarding', { brand_name: form.brand_name })
      toast({ title: 'Deal added to pipeline', type: 'success' })
      onNext()
    } catch (err) {
      toast({ title: 'Error', description: err.message, type: 'error' })
    }
    setSaving(false)
  }

  const inputClass = 'w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent'

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-2">Step 2 — Pipeline</div>
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight">
          Drop in a deal you're already working
        </h2>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          One deal in <em>Prospect</em> is enough — you'll move it through the pipeline as the conversation progresses.
        </p>
      </div>

      <div className="space-y-3 bg-bg-card border border-border rounded-lg p-4">
        <Field
          label="Sponsor / company name"
          required
          hint="Goes on the deal card. Required."
        >
          <input
            value={form.brand_name}
            onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))}
            placeholder="e.g. Acme Bank"
            className={inputClass}
            autoFocus
          />
        </Field>
        <Field
          label="Primary contact"
          hint="Anchor for the relationship. We'll enrich title + email later."
        >
          <input
            value={form.contact_name}
            onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
            placeholder="e.g. Sarah Johnson"
            className={inputClass}
          />
        </Field>
        <Field
          label="Estimated value (USD)"
          hint="Sets weighted pipeline + win-rate KPIs. Ballpark is fine."
        >
          <input
            type="number"
            value={form.value}
            onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            placeholder="50000"
            className={inputClass}
          />
        </Field>
        <div className="text-[10px] text-text-muted">
          Stage starts at <span className="text-accent font-mono">Prospect</span>.
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleCreate}
          disabled={saving || !form.brand_name.trim()}
          className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Adding…' : 'Add deal & continue →'}
        </button>
        <button
          onClick={onSkip}
          className="w-full text-[11px] text-text-muted hover:text-text-secondary py-1"
        >
          Skip — I'll add deals later
        </button>
      </div>
    </div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-[10px] text-text-muted uppercase tracking-wider">
          {label}{required && ' *'}
        </label>
        {hint && <span className="text-[10px] text-text-muted/80 italic ml-2 truncate">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
