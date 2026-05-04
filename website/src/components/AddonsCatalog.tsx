import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useAddons } from '@/hooks/useAddons'
import { useToast } from '@/components/Toast'
import { Card, Button, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { Check, MessageCircle, ShoppingCart, Loader2 } from 'lucide-react'

interface CatalogRow {
  key: string
  name: string
  short_description: string
  long_description: string | null
  category: string
  icon: string | null
  price_hint: string | null
  position: number
  purchase_mode?: 'contact_sales' | 'self_serve'
  unit_price_cents?: number | null
  billing_interval?: string | null
  per_seat?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  features: 'Features',
  integrations: 'Integrations',
  service: 'Service',
  compliance: 'Compliance',
}

// AddonsCatalog — public-facing grid of all add-ons. Authenticated
// users see "Active" badges on what they already have and can fire
// a Contact-Sales request inline; unauthenticated visitors get a
// CTA that bounces them to sign-up first.
//
// Reads from addon_catalog (RLS = read-all). Contact-Sales flow
// writes to addon_requests, which fans out a notification to every
// developer (handled by the migration 081 trigger).
export default function AddonsCatalog({ embedded = false }: { embedded?: boolean }) {
  const { profile } = useAuth()
  const addons = useAddons()
  const { toast } = useToast()
  const [catalog, setCatalog] = useState<CatalogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [requestModal, setRequestModal] = useState<CatalogRow | null>(null)
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())
  const [checkingOut, setCheckingOut] = useState<string | null>(null)

  // Self-serve buy: opens Stripe Checkout via the existing stripe-billing
  // edge function (extended with action='addon_checkout' in 082). On
  // checkout.session.completed, the webhook flips property_addons →
  // realtime → useAddons → UI unlocks instantly.
  async function handleBuyNow(row: CatalogRow) {
    if (!profile?.property_id) {
      toast({ title: 'Sign in first', type: 'warning' })
      return
    }
    setCheckingOut(row.key)
    try {
      const { data, error } = await supabase.functions.invoke('stripe-billing', {
        body: {
          action: 'addon_checkout',
          property_id: profile.property_id,
          addon_key: row.key,
          return_url: window.location.origin,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      if (data?.url) {
        window.location.href = data.url
        return
      }
      throw new Error('No checkout URL returned')
    } catch (e: any) {
      toast({ title: 'Could not start checkout', description: humanError(e), type: 'error' })
    } finally {
      setCheckingOut(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('addon_catalog')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true })
      if (cancelled) return
      setCatalog((data || []) as CatalogRow[])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Track which add-ons have an in-flight request to render
  // a "Requested" pill instead of the Contact-Sales CTA again.
  useEffect(() => {
    if (!profile?.property_id) return
    let cancelled = false
    supabase
      .from('addon_requests')
      .select('addon_key')
      .eq('property_id', profile.property_id)
      .eq('status', 'pending')
      .then(({ data }) => {
        if (cancelled) return
        setPendingKeys(new Set((data || []).map(r => r.addon_key)))
      })
    return () => { cancelled = true }
  }, [profile?.property_id])

  const grouped = catalog.reduce<Record<string, CatalogRow[]>>((acc, row) => {
    acc[row.category] = acc[row.category] || []
    acc[row.category].push(row)
    return acc
  }, {})

  return (
    <div className={embedded ? '' : 'max-w-5xl mx-auto px-4 py-12'}>
      {!embedded && (
        <div className="text-center mb-8">
          <h2 id="addons" className="text-3xl font-bold text-text-primary mb-2">Add-ons</h2>
          <p className="text-sm text-text-muted max-w-xl mx-auto">
            Specialty modules priced per property. Pick what you need; everything else stays out of the way.
          </p>
        </div>
      )}

      {loading && <div className="text-center text-sm text-text-muted">Loading…</div>}

      <div className="space-y-8">
        {['features', 'integrations', 'service', 'compliance'].map(cat => {
          const rows = grouped[cat] || []
          if (rows.length === 0) return null
          return (
            <section key={cat}>
              <h3 className="text-[11px] uppercase tracking-widest font-mono text-text-muted mb-3">
                {CATEGORY_LABELS[cat] || cat}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rows.map(row => {
                  const active = addons.has(row.key)
                  const pending = pendingKeys.has(row.key)
                  return (
                    <Card key={row.key} padding="md" className={active ? 'border-success/40 bg-success/5' : ''}>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          {row.icon && <span className="text-2xl">{row.icon}</span>}
                          <h4 className="text-base font-semibold text-text-primary">{row.name}</h4>
                        </div>
                        {active && <Badge tone="success"><Check className="w-3 h-3 inline mr-0.5" />Active</Badge>}
                        {!active && pending && <Badge tone="accent">Requested</Badge>}
                      </div>
                      <p className="text-sm text-text-secondary mb-2">{row.short_description}</p>
                      {row.long_description && (
                        <p className="text-[11px] text-text-muted leading-relaxed mb-3">{row.long_description}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-text-muted">
                          {row.price_hint || 'Contact sales'}
                        </span>
                        {!active && !pending && (
                          <div className="flex items-center gap-2">
                            {row.purchase_mode === 'self_serve' && row.unit_price_cents ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleBuyNow(row)}
                                  disabled={checkingOut === row.key || !profile}
                                  title={profile ? 'Buy now via Stripe' : 'Sign in to buy'}
                                >
                                  {checkingOut === row.key
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening…</>
                                    : <><ShoppingCart className="w-3.5 h-3.5" /> Buy now</>}
                                </Button>
                                <button
                                  onClick={() => setRequestModal(row)}
                                  className="text-[11px] text-text-muted hover:text-accent underline"
                                >
                                  or contact sales
                                </button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant={profile ? 'primary' : 'secondary'}
                                onClick={() => setRequestModal(row)}
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> Contact sales
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {requestModal && (
        <ContactSalesModal
          addon={requestModal}
          onClose={() => setRequestModal(null)}
          onSubmitted={() => {
            setPendingKeys(prev => new Set([...prev, requestModal.key]))
            setRequestModal(null)
            toast({
              title: 'Request sent',
              description: `Sales will reach out about ${requestModal.name}. We'll notify you when it's enabled.`,
              type: 'success',
            })
          }}
        />
      )}
    </div>
  )
}

function ContactSalesModal({ addon, onClose, onSubmitted }: {
  addon: CatalogRow
  onClose: () => void
  onSubmitted: () => void
}) {
  const { profile } = useAuth()
  const addons = useAddons()
  const { toast } = useToast()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Unauthenticated users get a fallback that bounces them to sign-up.
  // Authenticated users can submit directly.
  const isAuthed = !!profile

  async function submit() {
    if (!isAuthed) return
    setSubmitting(true)
    const { ok, error } = await addons.request(addon.key, message || undefined)
    setSubmitting(false)
    if (!ok) {
      toast({ title: 'Could not submit', description: humanError(error), type: 'error' })
      return
    }
    onSubmitted()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-bg-surface border border-border rounded-lg max-w-md w-full p-5">
        <div className="flex items-start gap-3 mb-3">
          {addon.icon && <span className="text-3xl">{addon.icon}</span>}
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{addon.name}</h3>
            <p className="text-xs text-text-muted">{addon.short_description}</p>
          </div>
        </div>

        {!isAuthed ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Create an account first — once you're in, you can request this add-on with one click.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Maybe later</Button>
              <a href="/auth/signup" className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium hover:opacity-90">
                Sign up free
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Tell us a bit about your use case (optional). Sales will reach out to{' '}
              <span className="text-text-primary font-medium">{profile?.email}</span> with pricing.
            </p>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What problem are you trying to solve? Any specific timing or scale needs?"
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? 'Sending…' : 'Send request'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
