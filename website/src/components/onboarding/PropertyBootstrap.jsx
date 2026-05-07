import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { humanError } from '@/lib/humanError'
import { on } from '@/lib/appEvents'
import { Building } from 'lucide-react'

// Blocks the entire app until the signed-in user has a property.
//
// Why this exists: users can land in this state via three paths —
//   1. Email confirmation flow. signUp returns early when the
//      user has to click a link first, and the property creation
//      step in LoginPage never runs. Confirmed users then sign
//      in with profile.property_id = null.
//   2. Profile auto-create on first fetchProfile run. If the user
//      somehow ended up authed but with no profile row, useAuth
//      stamps a profile but can't infer the company.
//   3. Orphaned property reference. profile.property_id points
//      to a row that's been deleted. The join returns null
//      properties even though the FK column has a value.
//
// Without a usable property, RLS scopes everything to nothing —
// pipeline, contacts, prospecting all return zero rows. The app
// appears broken. This modal forces a property + updates the
// profile so the rest of the session works normally.
export default function PropertyBootstrap() {
  const { profile, fetchProfile, signOut } = useAuth()
  const { toast } = useToast()
  const [companyName, setCompanyName] = useState('')
  const [saving, setSaving] = useState(false)
  // Belt-and-suspenders trigger: action handlers can emit
  // 'open-property-bootstrap' if they detect a missing property
  // mid-flow. Once forced, the modal stays up until a property
  // exists.
  const [forced, setForced] = useState(false)
  useEffect(() => on('open-property-bootstrap', () => setForced(true)), [])

  // Render when profile is loaded AND either property_id is null
  // OR the joined properties row is missing (orphaned FK). Also
  // render when an action handler explicitly forced us open.
  if (!profile) return null
  const needsProperty = !profile.property_id || !profile.properties
  if (!needsProperty && !forced) return null

  async function handleCreate(e) {
    e.preventDefault()
    const name = companyName.trim()
    if (!name) return
    setSaving(true)
    try {
      // Create the property scoped to this user. plan defaults to
      // 'free' — they can upgrade later from /pricing.
      const { data: property, error: propErr } = await supabase
        .from('properties')
        .insert({
          name,
          plan: 'free',
          billing_email: profile.email || null,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        })
        .select()
        .single()
      if (propErr) throw propErr
      if (!property) throw new Error('Property creation returned no row.')

      // Link the profile to the new property.
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ property_id: property.id })
        .eq('id', profile.id)
      if (profErr) throw profErr

      // Reload the profile so the rest of the app picks up
      // property_id immediately.
      await fetchProfile(profile.id)
      setForced(false)
      toast({ title: 'Workspace created', description: name, type: 'success' })
    } catch (err) {
      toast({ title: 'Could not create workspace', description: humanError(err), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-bg-primary/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-bootstrap-title"
        className="bg-bg-surface border border-accent/40 rounded-xl shadow-2xl w-full max-w-md p-6 sm:p-7"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 id="property-bootstrap-title" className="text-lg font-semibold text-text-primary">
              One last step
            </h2>
            <p className="text-xs text-text-muted">Tell us what to call your workspace.</p>
          </div>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          Your account is ready, but we need a company name before you can use the CRM.
          This is the workspace your pipeline, contacts, and prospects live under — you can rename it later.
        </p>

        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Company name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Sports"
              autoFocus
              required
              className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !companyName.trim()}
            className="w-full bg-accent text-bg-primary py-2.5 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Creating workspace…' : 'Create workspace →'}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="w-full text-[11px] text-text-muted hover:text-text-secondary py-1"
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  )
}
