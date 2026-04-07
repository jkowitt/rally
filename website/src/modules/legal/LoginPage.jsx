import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const INDUSTRY_OPTIONS = [
  { value: 'college', label: 'College / University Athletics' },
  { value: 'professional', label: 'Professional Sports Team' },
  { value: 'minor_league', label: 'Minor League / Independent' },
  { value: 'agency', label: 'Partnership / Sponsorship Agency' },
  { value: 'entertainment', label: 'Entertainment Venue' },
  { value: 'conference', label: 'Conference / Trade Show' },
  { value: 'nonprofit', label: 'Nonprofit / Foundation' },
  { value: 'media', label: 'Media / Publishing' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
]

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function LoginPage() {
  const { signIn, signUp, session, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const industryParam = searchParams.get('industry')
  const premiumToken = searchParams.get('premium')
  const teamToken = searchParams.get('team')

  // Map landing page industry IDs to property types
  const industryToType = { sports: 'college', entertainment: 'entertainment', conference: 'conference', nonprofit: 'nonprofit', media: 'media', realestate: 'realestate', agency: 'agency' }

  const [premiumLink, setPremiumLink] = useState(null)
  const [teamInviteProperty, setTeamInviteProperty] = useState(null)
  const [mode, setMode] = useState(inviteToken ? 'invite' : (premiumToken || teamToken) ? 'signup' : 'signin') // signin | signup | invite | onboard | confirm
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invitation, setInvitation] = useState(null)

  // Company setup fields (all on one screen)
  const [companyName, setCompanyName] = useState('')
  const [industryType, setIndustryType] = useState(industryToType[industryParam] || 'college')
  const [companyCity, setCompanyCity] = useState('')
  const [companyState, setCompanyState] = useState('')

  // Invite flow: load invitation
  useEffect(() => {
    if (inviteToken) {
      supabase.from('invitations').select('*, properties(name)').eq('token', inviteToken).single()
        .then(({ data, error: invErr }) => {
          if (invErr || !data || data.accepted) {
            setError('This invitation has expired or already been used.')
            setMode('signin')
          } else {
            setInvitation(data)
            setEmail(data.email || '')
          }
        })
    }
  }, [inviteToken])

  // Premium invite link: validate token
  useEffect(() => {
    if (premiumToken) {
      supabase.from('premium_invite_links').select('*').eq('token', premiumToken).eq('active', true).single()
        .then(({ data, error: pErr }) => {
          if (pErr || !data || data.claimed_by || new Date(data.expires_at) < new Date()) {
            setError('This invite link is invalid or has expired. Contact the sender for a new one.')
            setMode('signin')
          } else {
            setPremiumLink(data)
            setMode('signup')
          }
        })
    }
  }, [premiumToken])

  // Team invite link: validate token
  useEffect(() => {
    if (teamToken) {
      supabase.from('properties').select('id, name, team_invite_role').eq('team_invite_token', teamToken).single()
        .then(({ data, error: tErr }) => {
          if (tErr || !data) {
            setError('This team invite link is invalid.')
            setMode('signin')
          } else {
            setTeamInviteProperty(data)
            setMode('signup')
          }
        })
    }
  }, [teamToken])

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
      localStorage.setItem('ll-has-account', '1')
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    if (!fullName || !email || !password) return setError('Full name, email, and password are required')
    if (password.length < 6) return setError('Password must be at least 6 characters')

    if (invitation) {
      // Invite flow: create account and link to existing property
      setLoading(true)
      try {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        })
        if (authErr) throw authErr
        if (authData.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            property_id: invitation.property_id,
            full_name: fullName,
            email,
            role: email.toLowerCase() === 'jlkowitt25@gmail.com' ? 'developer' : (invitation.role || 'rep'),
            onboarding_completed: true,
          })
          await supabase.from('invitations').update({ accepted: true, accepted_at: new Date().toISOString() }).eq('id', invitation.id)
          await fetchProfile(authData.user.id)
        }
        localStorage.setItem('ll-has-account', '1')
        navigate('/app', { replace: true })
      } catch (err) { setError(err.message) }
      setLoading(false)
      return
    }

    // Team invite link flow: join existing property
    if (teamInviteProperty) {
      setLoading(true)
      try {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: fullName } },
        })
        if (authErr) throw authErr
        if (authData.user && !authData.session) { setMode('confirm'); setLoading(false); return }
        if (authData.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id, property_id: teamInviteProperty.id,
            full_name: fullName, email,
            role: email.toLowerCase() === 'jlkowitt25@gmail.com' ? 'developer' : (teamInviteProperty.team_invite_role || 'rep'),
            onboarding_completed: true,
          })
          localStorage.setItem('ll-has-account', '1')
          await fetchProfile(authData.user.id)
          navigate('/app', { replace: true })
        }
      } catch (err) { setError(err.message) }
      setLoading(false)
      return
    }

    // New user signup — single step
    if (!companyName) return setError('Company name is required')
    setLoading(true)
    try {
      // 1. Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } },
      })
      if (authErr) throw authErr
      localStorage.setItem('ll-has-account', '1')

      // Email confirmation required?
      if (authData.user && !authData.session) {
        setMode('confirm')
        setLoading(false)
        return
      }

      if (authData.user) {
        // 2. Create company/property (premium link upgrades plan)
        const assignedPlan = premiumLink ? premiumLink.plan : 'free'
        const propertyData = {
          name: companyName,
          plan: assignedPlan,
          billing_email: email,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + (premiumLink ? 30 : 7) * 86400000).toISOString(),
        }
        if (companyCity) propertyData.city = companyCity
        if (companyState) propertyData.state = companyState

        let property
        const { data: p1, error: e1 } = await supabase.from('properties').insert({ ...propertyData, type: industryType }).select().single()
        if (e1) {
          const { data: p2, error: e2 } = await supabase.from('properties').insert(propertyData).select().single()
          if (e2) throw e2
          property = p2
        } else { property = p1 }
        if (!property) throw new Error('Company creation failed')

        // Mark premium link as claimed
        if (premiumLink) {
          await supabase.from('premium_invite_links').update({
            claimed_by: authData.user.id, claimed_at: new Date().toISOString(), property_id: property.id,
          }).eq('id', premiumLink.id)
        }

        // 3. Create profile — first person at a company = admin (developer for jlkowitt25)
        const userRole = email.toLowerCase() === 'jlkowitt25@gmail.com' ? 'developer' : 'admin'
        const { error: profErr } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          property_id: property.id,
          full_name: fullName,
          email,
          role: userRole,
          onboarding_completed: false,
        })
        if (profErr) {
          // Fallback without optional columns
          await supabase.from('profiles').upsert({ id: authData.user.id, property_id: property.id, full_name: fullName, role: userRole })
        }

        // 4. Create team + owner membership
        try {
          const { data: team } = await supabase.from('teams').insert({
            name: companyName, property_id: property.id,
            type: industryType === 'agency' ? 'agency' : 'property',
            created_by: authData.user.id,
          }).select().single()
          if (team) {
            await supabase.from('team_members').insert({ team_id: team.id, user_id: authData.user.id, role: 'owner', invited_by: authData.user.id })
          }
        } catch { /* team tables may not exist */ }

        // 5. Enable default modules
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
      }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  async function handleFinishOnboarding() {
    try {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', session.user.id)
      navigate('/app', { replace: true })
    } catch { navigate('/app', { replace: true }) }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 onClick={() => navigate('/')} className="font-mono font-bold text-accent text-xl sm:text-2xl cursor-pointer hover:opacity-80 transition-opacity" style={{letterSpacing:'0.08em',wordSpacing:'-0.3em'}}>LOUD LEGACY</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">The operating system for revenue teams</p>
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
            <button type="button" onClick={() => { setMode('signup'); setError('') }} className="w-full text-center text-text-muted text-xs hover:text-text-secondary">
              Don't have an account? Sign up free
            </button>
          </form>
        )}

        {/* SIGN UP — single step */}
        {(mode === 'signup' || mode === 'invite') && (
          <form onSubmit={handleSignUp} className="bg-bg-surface border border-border rounded-lg p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {invitation ? `Join ${invitation.properties?.name}` :
                 teamInviteProperty ? `Join ${teamInviteProperty.name}` :
                 premiumLink ? 'Claim Your Premium Access' : 'Create Your Account'}
              </h2>
              {invitation && (
                <p className="text-xs text-text-muted mt-1">You've been invited as a {invitation.role}</p>
              )}
              {teamInviteProperty && (
                <p className="text-xs text-text-muted mt-1">Join <span className="text-accent">{teamInviteProperty.name}</span> as a {teamInviteProperty.team_invite_role || 'rep'}</p>
              )}
              {premiumLink && (
                <div className="mt-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
                  <div className="text-[10px] font-mono text-accent uppercase">Premium Access Invite</div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    You've been invited to try the <span className="text-accent font-medium">{premiumLink.plan}</span> plan free for 30 days.
                    {premiumLink.label && <span className="text-text-muted"> ({premiumLink.label})</span>}
                  </div>
                </div>
              )}
              {!invitation && !premiumLink && !teamInviteProperty && (
                <p className="text-xs text-text-muted mt-1">One form. Takes 30 seconds.</p>
              )}
            </div>

            <input type="text" placeholder="Full Name *" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" autoFocus />
            <input type="email" placeholder="Work Email *" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!invitation} className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent disabled:opacity-60" />
            <input type="password" placeholder="Password (6+ characters) *" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />

            {!invitation && !teamInviteProperty && (
              <>
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-2">Your Company</div>
                </div>
                <input type="text" placeholder="Company / Organization Name *" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
                <select value={industryType} onChange={(e) => setIndustryType(e.target.value)} className="w-full bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent">
                  {INDUSTRY_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="City" value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
                  <select value={companyState} onChange={(e) => setCompanyState(e.target.value)} className="bg-bg-card border border-border rounded px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent">
                    <option value="">State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </>
            )}

            {error && <div className="text-danger text-xs">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-accent text-bg-primary font-semibold py-2.5 rounded hover:opacity-90 disabled:opacity-50 text-sm">
              {loading ? 'Creating your account...' : invitation ? 'Join Team' : 'Get Started Free'}
            </button>
            <button type="button" onClick={() => { setMode('signin'); setError('') }} className="w-full text-center text-text-muted text-xs hover:text-text-secondary">
              Already have an account? Sign in
            </button>
          </form>
        )}

        {/* EMAIL CONFIRMATION NEEDED */}
        {mode === 'confirm' && (
          <div className="bg-bg-surface border border-border rounded-lg p-5 sm:p-6 space-y-4 text-center">
            <div className="text-4xl">📧</div>
            <h2 className="text-lg font-semibold text-text-primary">Check Your Email</h2>
            <p className="text-sm text-text-secondary">
              We sent a confirmation link to <strong className="text-accent">{email}</strong>. Click the link to activate your account, then come back here and sign in.
            </p>
            <button
              onClick={() => { setMode('signin'); setError('') }}
              className="w-full bg-accent text-bg-primary font-semibold py-2.5 rounded hover:opacity-90 text-sm"
            >
              Go to Sign In
            </button>
          </div>
        )}

        {/* ONBOARDING - Welcome */}
        {mode === 'onboard' && (
          <div className="bg-bg-surface border border-border rounded-lg p-5 sm:p-6 space-y-5 text-center">
            <div className="text-4xl">🎉</div>
            <h2 className="text-lg font-semibold text-text-primary">Welcome to Loud Legacy!</h2>
            <p className="text-sm text-text-secondary">
              <span className="text-accent font-medium">{companyName}</span> is set up and ready to go.
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
