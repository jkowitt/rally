import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Navigate } from 'react-router-dom'

export default function UpgradeOffer() {
  const { profile, isDeveloper } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    recipient_email: '',
    custom_message: '',
    offer_type: 'trial_21', // trial_21 | direct_pro
    stripe_link: '',
  })
  const [sending, setSending] = useState(false)

  const { data: offers } = useQuery({
    queryKey: ['upgrade-offers'],
    queryFn: async () => {
      const { data } = await supabase.from('upgrade_offers').select('*').order('created_at', { ascending: false }).limit(50)
      return data || []
    },
  })

  if (!isDeveloper && profile?.role !== 'businessops') {
    return <Navigate to="/app" replace />
  }

  async function sendOffer() {
    if (!form.recipient_email.trim()) {
      toast({ title: 'Recipient email required', type: 'warning' })
      return
    }
    setSending(true)
    try {
      // Save the offer record
      const { data: offer } = await supabase.from('upgrade_offers').insert({
        sent_by: profile?.id,
        recipient_email: form.recipient_email,
        custom_message: form.custom_message || null,
        offer_type: form.offer_type,
        stripe_link: form.stripe_link || null,
      }).select().single()

      // Try to send email via existing edge function
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: form.recipient_email,
            subject: form.offer_type === 'trial_21' ? 'Your Loud Legacy 21-day Enterprise trial' : 'Unlock Pro on Loud Legacy',
            body: buildEmailBody(form),
          },
        })
      } catch {}

      queryClient.invalidateQueries({ queryKey: ['upgrade-offers'] })
      toast({ title: 'Offer sent', type: 'success' })
      setForm({ recipient_email: '', custom_message: '', offer_type: 'trial_21', stripe_link: '' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, type: 'error' })
    }
    setSending(false)
  }

  function buildEmailBody(f) {
    const base = f.offer_type === 'trial_21'
      ? `You're invited to a 21-day Enterprise trial of Loud Legacy. Full access to every module, unlimited deals, AI insights, contract parsing, and priority support — no credit card required.`
      : `Unlock the full Loud Legacy platform with Pro. Unlimited deals, AI insights on every deal, advanced modules, and priority support.`
    return `${f.custom_message ? f.custom_message + '\n\n' : ''}${base}\n\n${f.stripe_link ? `Activate: ${f.stripe_link}` : 'Reply to this email to get started.'}\n\n— Jason\nLoud Legacy`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Manual Upgrade Offer</h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">Send personalized upgrade offers to prospects after live demos.</p>
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 space-y-4">
        <div>
          <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Recipient Email *</label>
          <input
            type="email"
            value={form.recipient_email}
            onChange={e => setForm(f => ({ ...f, recipient_email: e.target.value }))}
            placeholder="prospect@company.com"
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Offer Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, offer_type: 'trial_21' }))}
              className={`flex-1 p-3 rounded border-2 text-left ${form.offer_type === 'trial_21' ? 'border-accent bg-accent/5' : 'border-border bg-bg-card'}`}
            >
              <div className="text-xs font-medium text-text-primary">21-Day Enterprise Trial</div>
              <div className="text-[9px] text-text-muted">Full platform access, no credit card</div>
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, offer_type: 'direct_pro' }))}
              className={`flex-1 p-3 rounded border-2 text-left ${form.offer_type === 'direct_pro' ? 'border-accent bg-accent/5' : 'border-border bg-bg-card'}`}
            >
              <div className="text-xs font-medium text-text-primary">Direct Pro Upgrade</div>
              <div className="text-[9px] text-text-muted">One-click Stripe checkout</div>
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Custom Message (optional)</label>
          <textarea
            value={form.custom_message}
            onChange={e => setForm(f => ({ ...f, custom_message: e.target.value }))}
            placeholder="Great meeting you today..."
            rows={4}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Stripe Payment Link (optional)</label>
          <input
            value={form.stripe_link}
            onChange={e => setForm(f => ({ ...f, stripe_link: e.target.value }))}
            placeholder="https://buy.stripe.com/..."
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
          />
        </div>

        <button onClick={sendOffer} disabled={sending || !form.recipient_email.trim()} className="w-full bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          {sending ? 'Sending...' : 'Send Offer'}
        </button>
      </div>

      {/* History */}
      <div>
        <h3 className="text-sm font-mono text-text-muted uppercase mb-3">Recent Offers ({(offers || []).length})</h3>
        <div className="space-y-2">
          {(offers || []).map(o => (
            <div key={o.id} className="bg-bg-surface border border-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-text-primary truncate">{o.recipient_email}</span>
                  <div className="text-[10px] text-text-muted">
                    {o.offer_type} · {new Date(o.email_sent_at || o.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {o.email_opened_at && <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">opened</span>}
                  {o.link_clicked_at && <span className="text-[9px] bg-warning/10 text-warning px-1.5 py-0.5 rounded">clicked</span>}
                  {o.upgraded_at && <span className="text-[9px] bg-success/10 text-success px-1.5 py-0.5 rounded">converted</span>}
                </div>
              </div>
            </div>
          ))}
          {(!offers || offers.length === 0) && (
            <div className="text-center text-text-muted text-sm py-6">No offers sent yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
