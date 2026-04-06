import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const PROPERTY_TYPES = [
  { group: 'Sports', items: [
    { value: 'college', label: 'College / University Athletics' },
    { value: 'professional', label: 'Professional Team' },
    { value: 'minor_league', label: 'Minor League / Independent' },
  ]},
  { group: 'Entertainment', items: [
    { value: 'entertainment', label: 'Music Venue / Entertainment' },
    { value: 'esports', label: 'Esports / Gaming Organization' },
  ]},
  { group: 'Events & Media', items: [
    { value: 'conference', label: 'Conference / Trade Show' },
    { value: 'media', label: 'Media / Publishing' },
  ]},
  { group: 'Other', items: [
    { value: 'nonprofit', label: 'Nonprofit / Foundation' },
    { value: 'realestate', label: 'Real Estate / Property Advertising' },
    { value: 'agency', label: 'Agency / Company' },
    { value: 'other', label: 'Other' },
  ]},
]

const ALL_PROPERTY_TYPES = PROPERTY_TYPES.flatMap(g => g.items)

const SPORTS = ['Football', 'Basketball', 'Baseball', 'Soccer', 'Hockey', 'Lacrosse', 'Volleyball', 'Track & Field', 'Swimming', 'Tennis', 'Golf', 'Wrestling', 'Softball', 'Multi-Sport', 'Other']

export default function LoginPage() {
  const { signIn, signUp, session, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [mode, setMode] = useState(inviteToken ? 'invite' : 'signin') // signin | signup | invite | onboard
  const [step, setStep] = useState(1) // signup: 1=account, 2=property, 3=team
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invitation, setInvitation] = useState(null)

  // Property setup fields
  const [propertyName, setPropertyName] = useState('')
  const [propertyType, setPropertyType] = useState('college')
  const [sport, setSport] = useState('')
  const [conference, setConference] = useState('')
  const [propertyCity, setPropertyCity] = useState('')
  const [propertyState, setPropertyState] = useState('')

  // Invite flow: load invitation
  useEffect(() => {
    if (inviteToken) {
      supabase.from('invitations').select('*, properties(name)').eq('token', inviteToken).single()
        .then(({ data }) => {
          if (data && !data.accepted) {
            setInvitation(data)
            setEmail(data.email || '')
          } else {
            setError('This invitation has expired or already been used.')
            setMode('signin')
          }
        })
    }
  }, [inviteToken])

  if (session && mode !== 'onboard') {
    navigate('/app', { replace: true })
    return null
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleSignUpStep1(e) {
    e.preventDefault()
    setError('')
    if (!fullName || !email || !password) return setError('All fields required')
    if (password.length < 6) return setError('Password must be at least 6 characters')

    if (invitation) {
      // Invite flow: create account and link to existing property
      setLoading(true)
      try {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (authErr) throw authErr

        // Create profile linked to the invitation's property
        if (authData.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            property_id: invitation.property_id,
            full_name: fullName,
            email,
            role: invitation.role || 'rep',
            onboarding_completed: true,
          })
          // Mark invitation as accepted
          await supabase.from('invitations').update({ accepted: true, accepted_at: new Date().toISOString() }).eq('id', invitation.id)
          await fetchProfile(authData.user.id)
        }
        navigate('/app', { replace: true })
      } catch (err) {
        setError(err.message)
      }
      setLoading(false)
    } else {
      // New signup: go to property setup
      setStep(2)
    }
  }

  async function handlePropertySetup(e) {
    e.preventDefault()
    setError('')
    if (!propertyName) return setError('Property name is required')
    setLoading(true)
    try {
      // 1. Create Supabase auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (authErr) throw authErr

      if (authData.user) {
        // 2. Create property
        const { data: property, error: propErr } = await supabase.from('properties').insert({
          name: propertyName,
          type: propertyType,
          sport: sport || null,
          conference: conference || null,
          city: propertyCity || null,
          state: propertyState || null,
          plan: 'free',
          billing_email: email,
        }).select().single()
        if (propErr) throw propErr

        // 3. Create profile as admin of the property
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          property_id: property.id,
          full_name: fullName,
          email,
          role: 'admin',
          onboarding_completed: false,
        })

        // 4. Create team
        try {
          const { data: team } = await supabase.from('teams').insert({
            name: propertyName,
            property_id: property.id,
            type: propertyType === 'agency' ? 'agency' : 'property',
            created_by: authData.user.id,
          }).select().single()

          if (team) {
            await supabase.from('team_members').insert({
              team_id: team.id,
              user_id: authData.user.id,
              role: 'owner',
              invited_by: authData.user.id,
            })
          }
        } catch { /* team tables may not exist */ }

        // 5. Enable CRM by default
        try {
          await supabase.from('feature_flags').upsert([
            { module: 'crm', enabled: true },
            { module: 'sportify', enabled: false },
            { module: 'valora', enabled: false },
            { module: 'businessnow', enabled: false },
          ], { onConflict: 'module' })
        } catch { /* flags may already exist */ }

        await fetchProfile(authData.user.id)
        setMode('onboard')
        setStep(3)
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleFinishOnboarding() {
    try {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', session.user.id)
      navigate('/app', { replace: true })
    } catch {
      navigate('/app', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="font-mono font-bold text-accent text-xl sm:text-2xl" style={{letterSpacing:'0.08em',wordSpacing:'-0.15em'}}>LOUD LEGACY</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">Sports Business Operating Suite</p>
        </div>

        {/* SIGN IN */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="bg-bg-surface border border-border rounded-lg p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Sign In</h2>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            {error && <div className="text-danger text-xs">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-accent text-bg-primary font-semibold py-2.5 rounded hover:opacity-90 disabled:opacity-50 text-sm">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button type="button" onClick={() => { setMode('signup'); setError(''); setStep(1) }} className="w-full text-center text-text-muted text-xs hover:text-text-secondary">
              Don't have an account? Register your property
            </button>
          </form>
        )}

        {/* SIGN UP - Step 1: Account */}
        {(mode === 'signup' || mode === 'invite') && step === 1 && (
          <form onSubmit={handleSignUpStep1} className="bg-bg-surface border border-border rounded-lg p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {invitation ? `Join ${invitation.properties?.name}` : 'Create Account'}
              </h2>
              {invitation && (
                <p className="text-xs text-text-muted mt-1">You've been invited as a {invitation.role}</p>
              )}
              {!invitation && (
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 h-1 rounded bg-accent" />
                  <div className="flex-1 h-1 rounded bg-border" />
                </div>
              )}
            </div>
            <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" autoFocus />
            <input type="email" placeholder="Work Email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!invitation} className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent disabled:opacity-60" />
            <input type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            {error && <div className="text-danger text-xs">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-accent text-bg-primary font-semibold py-2.5 rounded hover:opacity-90 disabled:opacity-50 text-sm">
              {loading ? 'Creating...' : invitation ? 'Join Team' : 'Next: Set Up Property'}
            </button>
            <button type="button" onClick={() => { setMode('signin'); setError('') }} className="w-full text-center text-text-muted text-xs hover:text-text-secondary">
              Already have an account? Sign in
            </button>
          </form>
        )}

        {/* SIGN UP - Step 2: Property Setup */}
        {mode === 'signup' && step === 2 && (
          <form onSubmit={handlePropertySetup} className="bg-bg-surface border border-border rounded-lg p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Set Up Your Property</h2>
              <p className="text-xs text-text-muted mt-1">This is your team, school, or organization</p>
              <div className="flex gap-2 mt-2">
                <div className="flex-1 h-1 rounded bg-accent" />
                <div className="flex-1 h-1 rounded bg-accent" />
              </div>
            </div>
            <input type="text" placeholder="Property / Team Name *" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} required className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" autoFocus />
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent">
              {PROPERTY_TYPES.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </optgroup>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select value={sport} onChange={(e) => setSport(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent">
                <option value="">Sport</option>
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input placeholder="Conference" value={conference} onChange={(e) => setConference(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="City" value={propertyCity} onChange={(e) => setPropertyCity(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
              <input placeholder="State" value={propertyState} onChange={(e) => setPropertyState(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            </div>
            {error && <div className="text-danger text-xs">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-accent text-bg-primary font-semibold py-2.5 rounded hover:opacity-90 disabled:opacity-50 text-sm">
              {loading ? 'Setting up...' : 'Create Property & Get Started'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-center text-text-muted text-xs hover:text-text-secondary">
              &larr; Back
            </button>
          </form>
        )}

        {/* ONBOARDING - Step 3: Welcome */}
        {mode === 'onboard' && step === 3 && (
          <div className="bg-bg-surface border border-border rounded-lg p-5 sm:p-6 space-y-5 text-center">
            <div className="text-4xl">🎉</div>
            <h2 className="text-lg font-semibold text-text-primary">Welcome to Loud Legacy!</h2>
            <p className="text-sm text-text-secondary">
              Your property <span className="text-accent font-medium">{propertyName}</span> is set up and ready to go.
            </p>
            <div className="bg-bg-card border border-border rounded-lg p-4 text-left space-y-2">
              <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider">Quick Start</h3>
              <div className="space-y-1.5 text-xs text-text-secondary">
                <div className="flex gap-2"><span className="text-accent">1.</span> Add your sponsorship assets to the Asset Catalog</div>
                <div className="flex gap-2"><span className="text-accent">2.</span> Import or add your prospects to the Pipeline</div>
                <div className="flex gap-2"><span className="text-accent">3.</span> Upload existing contracts to track fulfillment</div>
                <div className="flex gap-2"><span className="text-accent">4.</span> Invite your team from the Team page</div>
              </div>
            </div>
            <div className="bg-bg-card border border-accent/20 rounded-lg p-3 text-left">
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">Your Plan</div>
              <div className="text-sm text-text-primary font-medium">Free Plan — 3 team members</div>
              <div className="text-xs text-text-muted mt-0.5">Upgrade anytime for unlimited users and premium features</div>
            </div>
            <button onClick={handleFinishOnboarding} className="w-full bg-accent text-bg-primary font-semibold py-2.5 rounded hover:opacity-90 text-sm">
              Go to Dashboard
            </button>
          </div>
        )}

        {mode !== 'onboard' && (
          <p className="text-center text-text-muted text-[10px] sm:text-xs mt-6">
            By signing up you agree to our Terms of Service and Privacy Policy
          </p>
        )}
      </div>
    </div>
  )
}
