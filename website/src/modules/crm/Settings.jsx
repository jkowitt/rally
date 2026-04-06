import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { useIndustryConfig } from '@/hooks/useIndustryConfig'
import { supabase } from '@/lib/supabase'

const PLANS = [
  { id: 'free', name: 'Free', price: '$0', period: 'forever', users: 3, features: ['CRM Pipeline', '50 deals', '5 AI researches/mo', 'Basic reports'] },
  { id: 'starter', name: 'Starter', price: '$49', period: '/month', users: 10, features: ['Everything in Free', 'Unlimited deals', '50 AI researches/mo', 'Events module', 'Email support'], recommended: false },
  { id: 'pro', name: 'Pro', price: '$149', period: '/month', users: 'Unlimited', features: ['Everything in Starter', 'All modules', '200 AI researches/mo', 'Apollo + Hunter enrichment', 'PowerPoint reports', 'Priority support'], recommended: true },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', period: '', users: 'Unlimited', features: ['Everything in Pro', 'White-label branding', 'API access', 'Custom integrations', 'Dedicated support', 'SLA guarantee'] },
]

export default function Settings() {
  const { profile, fetchProfile } = useAuth()
  const { toast } = useToast()
  const config = useIndustryConfig()
  const [loading, setLoading] = useState(false)

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
    </div>
  )
}
