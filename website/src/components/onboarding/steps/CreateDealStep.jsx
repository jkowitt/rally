import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { trackEvent } from '@/services/onboardingService'

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

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-2">💼</div>
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-1">Add your first sponsor deal</h2>
        <p className="text-xs sm:text-sm text-text-secondary">This takes 30 seconds. You can add full details later.</p>
      </div>

      <div className="space-y-3 bg-bg-card border border-border rounded-lg p-4">
        <div>
          <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Sponsor / Company Name *</label>
          <input
            value={form.brand_name}
            onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))}
            placeholder="e.g. Acme Bank"
            className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>
        <div>
          <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Contact Name</label>
          <input
            value={form.contact_name}
            onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
            placeholder="e.g. Sarah Johnson"
            className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Estimated Value ($)</label>
          <input
            type="number"
            value={form.value}
            onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            placeholder="50000"
            className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
        <div className="text-[9px] text-text-muted">Stage will be set to <span className="text-accent">Prospect</span></div>
      </div>

      <div className="space-y-2">
        <button onClick={handleCreate} disabled={saving || !form.brand_name.trim()} className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? 'Adding...' : 'Add Deal & Continue →'}
        </button>
        <button onClick={onSkip} className="w-full text-[11px] text-text-muted hover:text-text-secondary py-1">
          I'll do this later
        </button>
      </div>
    </div>
  )
}
