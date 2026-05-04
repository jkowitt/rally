import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as exportService from '@/services/dataExportService'
import { useToast } from '@/components/Toast'
import { useIndustryConfig } from '@/hooks/useIndustryConfig'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usePlanLimits } from '@/hooks/usePlanLimits'

const PLANS = [
  { id: 'free', name: 'Free', price: '$0', period: '7-day trial', users: 2, features: ['CRM Pipeline (15 deals)', '3 prospect searches/mo', '2 contract uploads/mo', 'Basic CSV export', 'No verified contact lookups'] },
  { id: 'starter', name: 'Starter', price: '$39', period: '/month', users: 5, features: ['Everything in Free', '500 deals', '50 prospect searches/mo', '40 verified contact lookups/mo', '25 contract uploads/mo', 'AI insights', 'Fulfillment reports', 'Team goals', 'Bulk import'] },
  { id: 'pro', name: 'Pro', price: '$99', period: '/month', users: 15, features: ['Everything in Starter', 'All modules', '200 prospect searches/mo', '160 verified contact lookups/mo', 'Unlimited contracts', 'Verified contacts', 'Email verification', 'PowerPoint reports', 'Custom dashboard eligible', 'Priority support'], recommended: true },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', period: '', users: 'Unlimited', features: ['Everything in Pro', 'Unlimited everything', 'Unlimited users', 'White-label dashboard', 'Custom integrations', 'API access', 'Dedicated support', 'SLA guarantee'] },
]

export default function Settings() {
  const { profile, fetchProfile, signOut } = useAuth()
  const { toast } = useToast()
  const config = useIndustryConfig()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const currentPlan = profile?.properties?.plan || 'free'
  const propertyId = profile?.property_id

  async function handleUpgrade(planId) {
    if (planId === 'enterprise') {
      window.open('mailto:jason@loud-legacy.com?subject=Enterprise Plan Inquiry', '_blank')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('stripe-billing', {
        body: { action: 'create_checkout', property_id: propertyId, plan: planId, return_url: window.location.origin },
      })
      if (error) throw error
      if (data?.error) {
        if (data.error.includes('not configured')) {
          toast({ title: 'Billing not yet enabled', description: 'Stripe integration coming soon. Contact us for early access.', type: 'warning' })
        } else {
          throw new Error(data.error)
        }
      } else if (data?.url) {
        window.location.href = data.url
      }
    } catch (e) {
      toast({ title: 'Upgrade failed', description: e.message, type: 'error' })
    }
    setLoading(false)
  }

  async function handleManageBilling() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('stripe-billing', {
        body: { action: 'create_portal', property_id: propertyId, return_url: window.location.origin + '/app/settings' },
      })
      if (error) throw error
      if (data?.url) window.location.href = data.url
      else if (data?.error) toast({ title: 'Error', description: data.error, type: 'error' })
    } catch (e) {
      toast({ title: 'Error', description: e.message, type: 'error' })
    }
    setLoading(false)
  }

  async function handleProfileUpdate(field, value) {
    try {
      await supabase.from('profiles').update({ [field]: value }).eq('id', profile.id)
      fetchProfile(profile.id)
      toast({ title: 'Updated', type: 'success' })
    } catch (e) {
      toast({ title: 'Error', description: e.message, type: 'error' })
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">Account, billing, and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
        <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted">Full Name</label>
            <input
              defaultValue={profile?.full_name || ''}
              onBlur={(e) => handleProfileUpdate('full_name', e.target.value)}
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Email</label>
            <input
              value={profile?.email || ''}
              disabled
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-muted mt-1 opacity-60"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Title</label>
            <input
              defaultValue={profile?.title || ''}
              onBlur={(e) => handleProfileUpdate('title', e.target.value)}
              placeholder="e.g. Director of Partnerships"
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Role</label>
            <input value={profile?.role || 'rep'} disabled className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-muted mt-1 opacity-60" />
          </div>
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-text-muted">Calendar booking URL</label>
              <p className="text-[10px] text-text-muted/70 mt-0.5 mb-1">e.g. calendly.com/jane-15min — surfaces a one-click "Insert booking link" button in Compose.</p>
              <input
                type="url"
                defaultValue={profile?.calendar_booking_url || ''}
                onBlur={(e) => handleProfileUpdate('calendar_booking_url', e.target.value || null)}
                placeholder="https://calendly.com/your-handle/15min"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">Booking link label</label>
              <p className="text-[10px] text-text-muted/70 mt-0.5 mb-1">Text shown before the link.</p>
              <input
                type="text"
                defaultValue={profile?.calendar_booking_label || ''}
                onBlur={(e) => handleProfileUpdate('calendar_booking_label', e.target.value || null)}
                placeholder="Book a 15-min intro"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Property */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
        <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Property</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-text-primary font-medium">{profile?.properties?.name}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{config.industryName}</span>
          {profile?.properties?.sport && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-card text-text-muted">{profile.properties.sport}</span>}
        </div>
      </div>

      {/* Current Plan + Upgrade */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-mono text-text-muted uppercase">Plan & Billing</h2>
          {currentPlan !== 'free' && (
            <button onClick={handleManageBilling} disabled={loading} className="text-xs text-accent hover:underline disabled:opacity-50">
              Manage Billing
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlan
            return (
              <div key={plan.id} className={`border rounded-lg p-4 ${plan.recommended ? 'border-accent ring-1 ring-accent/20' : 'border-border'} ${isCurrent ? 'bg-accent/5' : 'bg-bg-card'}`}>
                {plan.recommended && <div className="text-[9px] font-mono text-accent uppercase tracking-wider mb-2">Recommended</div>}
                <h3 className="text-sm font-semibold text-text-primary">{plan.name}</h3>
                <div className="flex items-baseline gap-0.5 mt-1">
                  <span className="text-xl font-bold text-text-primary">{plan.price}</span>
                  <span className="text-xs text-text-muted">{plan.period}</span>
                </div>
                <div className="text-[10px] text-text-muted font-mono mt-1">{plan.users} user{plan.users !== 1 ? 's' : ''}</div>
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="text-[11px] text-text-secondary flex gap-1.5">
                      <span className="text-accent shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrent && handleUpgrade(plan.id)}
                  disabled={isCurrent || loading || plan.id === 'free'}
                  className={`w-full mt-4 py-2 rounded text-xs font-medium ${
                    isCurrent ? 'bg-success/10 text-success border border-success/30' :
                    plan.recommended ? 'bg-accent text-bg-primary hover:opacity-90' :
                    'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'
                  } disabled:opacity-50`}
                >
                  {isCurrent ? 'Current Plan' : plan.id === 'enterprise' ? 'Contact Us' : 'Upgrade'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Usage & Overage */}
      <UsageOverageSection propertyId={propertyId} currentPlan={currentPlan} />

      {/* Preferences */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
        <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Preferences</h2>
        <label className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            defaultChecked={profile?.click_to_call_confirm !== false}
            onChange={(e) => handleProfileUpdate('click_to_call_confirm', e.target.checked)}
            className="accent-accent"
          />
          Confirm before click-to-call on mobile
        </label>
      </div>

      {/* Email preferences */}
      <DigestSubscriptionSection userId={profile?.id} propertyId={propertyId} userEmail={profile?.email} />

      <DncDomainsSection propertyId={propertyId} userId={profile?.id} />

      <EmailPreferencesSection userEmail={profile?.email} />

      {/* Data Export */}
      <DataExportSection userId={profile?.id} />

      {/* Integrations */}
      <IntegrationsSection propertyId={propertyId} />

      {/* Account Deletion — Danger Zone */}
      <div className="bg-bg-surface border border-danger/30 rounded-lg p-4 sm:p-5">
        <h2 className="text-sm font-mono text-danger uppercase mb-1">Danger Zone</h2>
        <p className="text-xs text-text-muted mb-4">
          These actions are permanent and cannot be easily undone.
        </p>

        {profile?.properties?.scheduled_deletion_at ? (
          // Account is already scheduled for deletion — show revive option
          <div className="space-y-3">
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
              <div className="text-sm text-danger font-medium">Account scheduled for deletion</div>
              <p className="text-xs text-text-muted mt-1">
                Your account will be permanently deleted on{' '}
                <span className="text-text-primary font-mono">
                  {new Date(profile.properties.scheduled_deletion_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>.
                You have access until{' '}
                <span className="text-text-primary font-mono">
                  {profile.properties.access_until ? new Date(profile.properties.access_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'the end of your billing cycle'}
                </span>.
              </p>
              <p className="text-xs text-text-muted mt-2">Your data will be archived for 30 days after deletion. You can revive your account during that period.</p>
            </div>
            <button
              onClick={async () => {
                try {
                  await supabase.from('properties').update({
                    scheduled_deletion_at: null,
                    access_until: null,
                    deletion_requested_by: null,
                  }).eq('id', propertyId)
                  fetchProfile(profile.id)
                  toast({ title: 'Account revived!', description: 'Your account is active again.', type: 'success' })
                } catch (e) {
                  toast({ title: 'Error', description: e.message, type: 'error' })
                }
              }}
              className="bg-success/10 border border-success/30 text-success px-4 py-2.5 rounded text-sm font-medium hover:bg-success/20 transition-colors"
            >
              Revive My Account
            </button>
          </div>
        ) : !showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-bg-card border border-danger/30 text-danger px-4 py-2.5 rounded text-sm font-medium hover:bg-danger/10 transition-colors"
          >
            Cancel Account & Delete Data
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 space-y-3">
              <div className="text-sm text-danger font-medium">Are you sure you want to cancel?</div>
              <div className="space-y-2 text-xs text-text-secondary">
                <div className="flex gap-2"><span className="text-danger shrink-0">1.</span> Your subscription (if any) will be cancelled immediately.</div>
                <div className="flex gap-2"><span className="text-danger shrink-0">2.</span> You'll keep access through the end of your current billing cycle{currentPlan === 'free' ? ' (immediate for free plans)' : ''}.</div>
                <div className="flex gap-2"><span className="text-danger shrink-0">3.</span> After access expires, your account is archived for 30 days.</div>
                <div className="flex gap-2"><span className="text-danger shrink-0">4.</span> During the 30-day archive, you can sign in and click "Revive My Account" to restore everything.</div>
                <div className="flex gap-2"><span className="text-danger shrink-0">5.</span> After 30 days, all data is permanently deleted.</div>
              </div>
              <div className="pt-2">
                <label className="text-xs text-text-muted">Type <span className="text-danger font-mono">DELETE</span> to confirm</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-bg-card border border-danger/30 rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-danger mt-1 font-mono"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (deleteConfirmText !== 'DELETE') return toast({ title: 'Type DELETE to confirm', type: 'warning' })
                  setDeleting(true)
                  try {
                    // Calculate access end date (end of current billing cycle or immediate for free)
                    const now = new Date()
                    let accessUntil
                    if (currentPlan === 'free') {
                      accessUntil = now.toISOString()
                    } else if (profile.properties?.plan_expires_at) {
                      accessUntil = profile.properties.plan_expires_at
                    } else {
                      // Default: 30 days from now (one more billing cycle)
                      accessUntil = new Date(now.getTime() + 30 * 86400000).toISOString()
                    }
                    // Schedule deletion 30 days after access ends
                    const accessEnd = new Date(accessUntil)
                    const deletionDate = new Date(accessEnd.getTime() + 30 * 86400000).toISOString()

                    await supabase.from('properties').update({
                      scheduled_deletion_at: deletionDate,
                      access_until: accessUntil,
                      deletion_requested_by: profile.id,
                    }).eq('id', propertyId)

                    // Cancel Stripe subscription if exists
                    if (profile.properties?.stripe_subscription_id) {
                      try {
                        await supabase.functions.invoke('stripe-billing', {
                          body: { action: 'cancel_subscription', property_id: propertyId },
                        })
                      } catch { /* Stripe may not be configured */ }
                    }

                    fetchProfile(profile.id)
                    toast({ title: 'Account cancellation scheduled', description: `Access until ${new Date(accessUntil).toLocaleDateString()}. Data archived for 30 days after.`, type: 'warning' })
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')

                    // Sign out immediately for free plan
                    if (currentPlan === 'free') {
                      await signOut()
                      navigate('/')
                    }
                  } catch (e) {
                    toast({ title: 'Error', description: e.message, type: 'error' })
                  }
                  setDeleting(false)
                }}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="bg-danger text-white px-4 py-2.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {deleting ? 'Processing...' : 'Confirm Cancellation'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                className="text-text-muted text-sm hover:text-text-secondary"
              >
                Never mind
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UsageOverageSection({ propertyId, currentPlan }) {
  const planLimits = usePlanLimits()

  const { data: overagePricing } = useQuery({
    queryKey: ['overage-pricing'],
    queryFn: async () => {
      const { data } = await supabase.from('overage_pricing').select('*').eq('active', true)
      return data || []
    },
  })

  if (currentPlan === 'enterprise' || planLimits.plan === 'developer') return null
  if (!overagePricing || overagePricing.length === 0) return null

  const actionTypes = ['prospect_search', 'contact_research', 'contract_upload', 'ai_valuation', 'newsletter_generate']
  const rows = actionTypes.map(action => {
    const pricing = overagePricing.find(p => p.service === action)
    if (!pricing) return null
    const used = planLimits.getUsageCount(action)
    const included = pricing.included_qty
    const overage = Math.max(0, used - included)
    const charge = overage * (pricing.overage_price_cents / 100)
    return { action, label: pricing.label, used, included, overage, charge, price: pricing.overage_price_cents }
  }).filter(Boolean)

  const totalCharges = rows.reduce((s, r) => s + r.charge, 0)

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
      <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Usage This Month</h2>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.action} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
            <div>
              <span className="text-sm text-text-primary">{r.label}</span>
              <span className="text-xs text-text-muted ml-2">{r.used}/{r.included} included</span>
            </div>
            <div className="text-right">
              {r.overage > 0 ? (
                <div>
                  <span className="text-xs font-mono text-warning">{r.overage} extra @ ${(r.price / 100).toFixed(2)}/ea</span>
                  <span className="text-sm font-mono text-warning ml-2">${r.charge.toFixed(2)}</span>
                </div>
              ) : (
                <span className="text-xs text-text-muted font-mono">{r.included - r.used} remaining</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {totalCharges > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-sm text-text-primary font-medium">Overage charges this month</span>
          <span className="text-lg font-mono font-bold text-warning">${totalCharges.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Email preferences — opt in/out of The Digest and other marketing
 * emails from Loud Legacy. Backed by the email_subscribers table:
 * each row has a status field ('active', 'unsubscribed', 'bounced')
 * and the user is identified by their profile email address.
 *
 * New platform users are auto-enrolled in The Digest via a database
 * trigger on profile creation (migration 065). This section gives
 * them the opt-out control. Rows don't get deleted — they just get
 * marked unsubscribed so re-opts and analytics still work.
 */
/**
 * DigestSubscriptionSection: opt into the 8am email digest of priority
 * queue + signals + nudges. Slack delivery requires a webhook URL.
 */
function DigestSubscriptionSection({ userId, propertyId, userEmail }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [emailSub, setEmailSub] = useState(null)
  const [slackSub, setSlackSub] = useState(null)
  const [slackUrl, setSlackUrl] = useState('')

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const { data } = await supabase
        .from('digest_subscriptions')
        .select('*')
        .eq('user_id', userId)
      setEmailSub((data || []).find(s => s.channel === 'email') || null)
      const slack = (data || []).find(s => s.channel === 'slack')
      setSlackSub(slack || null)
      setSlackUrl(slack?.slack_webhook_url || '')
      setLoading(false)
    }
    load()
  }, [userId])

  async function toggle(channel, on) {
    if (!userId || !propertyId) return
    if (on) {
      const payload = {
        user_id: userId, property_id: propertyId, channel,
        send_hour_utc: 13, send_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        is_active: true,
        ...(channel === 'slack' ? { slack_webhook_url: slackUrl || null } : {}),
      }
      const { error, data } = await supabase
        .from('digest_subscriptions')
        .upsert(payload, { onConflict: 'user_id,channel' })
        .select().single()
      if (error) {
        toast({ title: 'Could not subscribe', description: error.message, type: 'error' })
        return
      }
      if (channel === 'email') setEmailSub(data)
      else setSlackSub(data)
      toast({ title: `Subscribed to ${channel} digest`, type: 'success' })
    } else {
      await supabase.from('digest_subscriptions').update({ is_active: false }).eq('user_id', userId).eq('channel', channel)
      if (channel === 'email') setEmailSub(prev => prev ? { ...prev, is_active: false } : null)
      else setSlackSub(prev => prev ? { ...prev, is_active: false } : null)
    }
  }

  if (loading) return null

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
      <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Daily digest</h2>
      <p className="text-xs text-text-muted mb-3">
        Get your priority queue, signals, and stale-deal nudges sent at 8am ET on weekdays.
      </p>

      <div className="space-y-3">
        <label className="flex items-center justify-between gap-3 bg-bg-card border border-border rounded p-3 cursor-pointer">
          <div>
            <div className="text-sm text-text-primary">Email to {userEmail || 'your address'}</div>
            <div className="text-[11px] text-text-muted">Plain-text digest, easy to scan on mobile.</div>
          </div>
          <input
            type="checkbox"
            checked={!!emailSub?.is_active}
            onChange={(e) => toggle('email', e.target.checked)}
            className="accent-accent w-4 h-4"
          />
        </label>

        <div className="bg-bg-card border border-border rounded p-3 space-y-2">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <div className="text-sm text-text-primary">Slack DM</div>
              <div className="text-[11px] text-text-muted">Paste your incoming-webhook URL below.</div>
            </div>
            <input
              type="checkbox"
              checked={!!slackSub?.is_active}
              onChange={(e) => toggle('slack', e.target.checked)}
              disabled={!slackUrl}
              className="accent-accent w-4 h-4"
            />
          </label>
          <input
            type="url"
            value={slackUrl}
            onChange={(e) => setSlackUrl(e.target.value)}
            onBlur={async () => {
              if (slackSub) {
                await supabase.from('digest_subscriptions').update({ slack_webhook_url: slackUrl || null }).eq('id', slackSub.id)
              }
            }}
            placeholder="https://hooks.slack.com/services/…"
            className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * DncDomainsSection: per-property domain blocklist. Sequence runner
 * skips any contact whose email lives at a blocklisted domain.
 */
function DncDomainsSection({ propertyId, userId }) {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [domain, setDomain] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!propertyId) return
    const load = async () => {
      const { data } = await supabase
        .from('dnc_domains').select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      setRows(data || [])
    }
    load()
  }, [propertyId])

  async function add() {
    const cleaned = domain.trim().toLowerCase().replace(/^@/, '')
    if (!cleaned) return
    const { error, data } = await supabase
      .from('dnc_domains')
      .insert({ property_id: propertyId, domain: cleaned, reason: reason || null, created_by: userId })
      .select().single()
    if (error) {
      toast({ title: 'Could not add', description: error.message, type: 'error' })
      return
    }
    setRows([data, ...rows])
    setDomain('')
    setReason('')
    toast({ title: `${cleaned} blocked from outreach`, type: 'success' })
  }

  async function remove(id) {
    await supabase.from('dnc_domains').delete().eq('id', id)
    setRows(rows.filter(r => r.id !== id))
  }

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
      <h2 className="text-sm font-mono text-text-muted uppercase mb-3">Do-not-contact domains</h2>
      <p className="text-xs text-text-muted mb-3">
        Block entire domains (e.g. an ex-customer's company). Sequences and bulk sends skip them automatically.
      </p>
      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          type="text" value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 min-w-[160px] bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        />
        <input
          type="text" value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="reason (optional)"
          className="flex-1 min-w-[160px] bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        />
        <button
          onClick={add}
          disabled={!domain.trim()}
          className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
        >
          Block
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-text-muted">No domains blocked.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(r => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="text-text-primary font-mono">@{r.domain}</span>
                {r.reason && <span className="text-text-muted ml-2 text-xs">— {r.reason}</span>}
              </div>
              <button onClick={() => remove(r.id)} className="text-xs text-text-muted hover:text-danger">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EmailPreferencesSection({ userEmail }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [subscriber, setSubscriber] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!userEmail) {
        if (mounted) setLoading(false)
        return
      }
      const { data } = await supabase
        .from('email_subscribers')
        .select('id, status, tags, global_unsubscribe, unsubscribe_token')
        .ilike('email', userEmail)
        .maybeSingle()
      if (mounted) {
        setSubscriber(data || null)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [userEmail])

  async function reload() {
    const { data } = await supabase
      .from('email_subscribers')
      .select('id, status, tags, global_unsubscribe, unsubscribe_token')
      .ilike('email', userEmail)
      .maybeSingle()
    setSubscriber(data || null)
  }

  async function setDigestSubscribed(enabled) {
    if (!userEmail) return
    setSaving(true)
    try {
      if (subscriber) {
        // Existing row — update status / global_unsubscribe
        const patch = enabled
          ? { status: 'active', global_unsubscribe: false, unsubscribed_at: null }
          : { status: 'unsubscribed', global_unsubscribe: true, unsubscribed_at: new Date().toISOString() }
        const { error } = await supabase
          .from('email_subscribers')
          .update(patch)
          .eq('id', subscriber.id)
        if (error) throw error
      } else if (enabled) {
        // No row exists but user wants in — create it
        const { error } = await supabase
          .from('email_subscribers')
          .insert({
            email: userEmail.toLowerCase(),
            status: 'active',
            source: 'settings_opt_in',
            tags: ['digest', 'platform_user'],
          })
        if (error) throw error
      }
      toast({
        title: enabled ? 'Subscribed' : 'Unsubscribed',
        description: enabled
          ? 'You will receive The Digest and platform announcements.'
          : 'You are unsubscribed from all marketing emails. Transactional messages (receipts, security) will still be sent.',
        type: 'success',
      })
      reload()
    } catch (err) {
      toast({ title: 'Save failed', description: String(err?.message || err), type: 'error' })
    }
    setSaving(false)
  }

  const isSubscribed = subscriber?.status === 'active' && !subscriber?.global_unsubscribe

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
      <h2 className="text-sm font-mono text-text-muted uppercase mb-1">Email Preferences</h2>
      <p className="text-xs text-text-muted mb-4">
        Manage the marketing emails you receive from Loud Legacy. Transactional
        emails (login, security, billing) cannot be turned off.
      </p>

      {loading ? (
        <div className="text-xs text-text-muted">Loading…</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 py-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary font-medium">The Digest</div>
              <div className="text-[11px] text-text-muted mt-1 leading-relaxed">
                One monthly editorial newsletter covering sponsorship, real estate, sports, and marketing.
                When you signed up, you were auto-subscribed per our Terms &amp; Conditions. Toggle off to
                stop receiving it. You can also unsubscribe from any email using the link in the footer.
              </div>
            </div>
            <button
              onClick={() => setDigestSubscribed(!isSubscribed)}
              disabled={saving}
              className={`shrink-0 px-3 py-1.5 rounded text-xs font-mono transition-opacity ${
                isSubscribed ? 'bg-success/20 text-success' : 'bg-bg-card text-text-muted border border-border'
              } ${saving ? 'opacity-50' : ''}`}
            >
              {saving ? '…' : isSubscribed ? 'Subscribed' : 'Unsubscribed'}
            </button>
          </div>

          {subscriber?.unsubscribe_token && (
            <div className="text-[10px] text-text-muted pt-2 border-t border-border">
              One-click unsubscribe link (same as email footer):{' '}
              <a
                href={`/unsubscribe/${subscriber.unsubscribe_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                /unsubscribe/...
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DataExportSection({ userId }) {
  const { toast } = useToast()
  const [exporting, setExporting] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (userId) exportService.getExportHistory(userId).then(setHistory)
  }, [userId])

  async function handleExport(type) {
    setExporting(type)
    try {
      let result
      if (type === 'deals') result = await exportService.exportDeals(userId)
      else if (type === 'contacts') result = await exportService.exportContacts(userId)
      else if (type === 'activities') result = await exportService.exportActivities(userId)
      else if (type === 'gdpr') result = await exportService.exportGdprData(userId)

      if (result?.success) {
        toast({ title: 'Export complete', description: `${result.count || 'All'} records downloaded`, type: 'success' })
        exportService.getExportHistory(userId).then(setHistory)
      } else {
        toast({ title: 'Export failed', description: result?.error || 'No data to export', type: 'error' })
      }
    } catch (err) {
      toast({ title: 'Export failed', description: String(err.message || err), type: 'error' })
    }
    setExporting(null)
  }

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
      <h2 className="text-sm font-mono text-text-muted uppercase mb-1">Data Export</h2>
      <p className="text-xs text-text-muted mb-4">
        Download your data as CSV files. For GDPR data portability, use the full export which
        includes your profile, deals, contacts, and activities as a single JSON file.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { type: 'deals', label: 'Deals CSV', icon: '📊' },
          { type: 'contacts', label: 'Contacts CSV', icon: '👥' },
          { type: 'activities', label: 'Activities CSV', icon: '📋' },
          { type: 'gdpr', label: 'Full Export (GDPR)', icon: '📦' },
        ].map(exp => (
          <button
            key={exp.type}
            onClick={() => handleExport(exp.type)}
            disabled={exporting === exp.type}
            className="flex flex-col items-center gap-1 p-3 bg-bg-card border border-border rounded-lg hover:border-accent/50 transition-colors text-center disabled:opacity-50"
          >
            <span className="text-lg">{exp.icon}</span>
            <span className="text-[10px] text-text-primary">{exp.label}</span>
            {exporting === exp.type && <span className="text-[9px] text-accent">Exporting…</span>}
          </button>
        ))}
      </div>
      {history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-[9px] text-text-muted font-mono uppercase tracking-widest mb-1">Recent exports</div>
          <div className="space-y-1">
            {history.slice(0, 5).map(h => (
              <div key={h.id} className="text-[10px] text-text-muted flex items-center justify-between">
                <span>{h.export_type} · {h.row_count} rows</span>
                <span>{new Date(h.requested_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function IntegrationsSection({ propertyId }) {
  const [integrations, setIntegrations] = useState([])

  useEffect(() => {
    if (!propertyId) return
    supabase
      .from('integration_status')
      .select('*')
      .eq('property_id', propertyId)
      .then(({ data }) => setIntegrations(data || []))
  }, [propertyId])

  const allIntegrations = [
    { name: 'outlook', label: 'Outlook', icon: '📧', description: 'Email sync and contact enrichment' },
    { name: 'stripe', label: 'Stripe', icon: '💳', description: 'Payment processing and billing' },
    { name: 'resend', label: 'Resend', icon: '📨', description: 'Email delivery (primary)' },
    { name: 'sendgrid', label: 'SendGrid', icon: '📬', description: 'Email delivery (fallback)' },
    { name: 'apollo', label: 'Apollo', icon: '🔍', description: 'Contact enrichment and prospecting' },
    { name: 'hunter', label: 'Hunter.io', icon: '✉', description: 'Email verification' },
  ]

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5">
      <h2 className="text-sm font-mono text-text-muted uppercase mb-1">Integrations</h2>
      <p className="text-xs text-text-muted mb-4">
        Connected services and their sync status. Contact support to configure new integrations.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allIntegrations.map(int => {
          const status = integrations.find(i => i.integration_name === int.name)
          const isConnected = status?.status === 'connected' || status?.status === 'syncing'
          return (
            <div key={int.name} className="flex items-center gap-3 p-3 bg-bg-card border border-border rounded-lg">
              <span className="text-xl shrink-0">{int.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-primary font-medium">{int.label}</div>
                <div className="text-[10px] text-text-muted">{int.description}</div>
                {status?.last_synced_at && (
                  <div className="text-[9px] text-text-muted mt-0.5">Last sync: {new Date(status.last_synced_at).toLocaleString()}</div>
                )}
                {status?.last_error && (
                  <div className="text-[9px] text-danger mt-0.5">{status.last_error}</div>
                )}
              </div>
              <div className={`text-[9px] font-mono uppercase px-2 py-1 rounded ${
                isConnected ? 'bg-success/15 text-success' : 'bg-bg-surface text-text-muted'
              }`}>
                {status?.status || 'not set up'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
