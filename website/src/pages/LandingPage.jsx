import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import EditableText, { EditableImage } from '@/components/cms/EditableText'
import { useIndustryVisibility, shouldShowIndustry } from '@/hooks/useIndustryVisibility'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

// Tiered plans shown on the welcome gate's 'plans' step. Kept
// intentionally narrow — CRM + Prospecting capabilities only —
// per product direction. Email integration (Outlook + Gmail
// inbox sync, send-from-CRM, open/click tracking) is the
// Enterprise differentiator and is the only line item that
// flips between included / excluded across tiers.
const PLAN_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For solo reps getting organized',
    price: 39,
    cta: 'Start with Starter',
    featured: false,
    features: [
      { label: 'AI prospect search (50 / mo)', included: true },
      { label: 'Drag-and-drop CRM pipeline', included: true },
      { label: 'Manual + CSV prospect import', included: true },
      { label: 'Up to 1,000 contacts', included: true },
      { label: 'Outlook + Gmail integration', included: false },
      { label: 'Email tracking (opens + clicks)', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For revenue teams closing deals',
    price: 99,
    cta: 'Start with Pro',
    featured: true,
    features: [
      { label: 'AI prospect search (500 / mo)', included: true },
      { label: 'Drag-and-drop CRM pipeline', included: true },
      { label: 'Bulk import + AI enrichment queue', included: true },
      { label: 'Up to 25,000 contacts', included: true },
      { label: 'Up to 5 seats', included: true },
      { label: 'Outlook + Gmail integration', included: false },
      { label: 'Email tracking (opens + clicks)', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For teams that live in their inbox',
    price: 299,
    cta: 'Start with Enterprise',
    featured: false,
    features: [
      { label: 'Unlimited AI prospect search', included: true },
      { label: 'Drag-and-drop CRM pipeline', included: true },
      { label: 'Bulk import + AI enrichment queue', included: true },
      { label: 'Unlimited contacts + seats', included: true },
      { label: 'Outlook + Gmail integration', included: true },
      { label: 'Email tracking (opens + clicks)', included: true },
      { label: 'Inbox sync + send-from-CRM', included: true },
    ],
  },
]

const INDUSTRIES = [
  {
    id: 'sports',
    label: 'Sports, Events & Entertainment',
    icon: '🏟',
    headline: 'Sports, Events & Entertainment',
    subtitle: 'Teams, venues, conferences, festivals, trade shows, and partnership agencies',
    description: 'AI-powered sponsorship CRM, verified contact intelligence, contract analysis, event operations, media valuations, and exhibitor management — built for sports teams, entertainment venues, conferences, festivals, and the agencies that represent them.',
    deals: 'sponsorship deals',
    assets: 'sponsorship assets',
    cta: 'sponsorship business',
    modules: ['Pipeline', 'Contracts', 'Assets', 'Fulfillment', 'Events', 'Booth Inventory', 'VALORA', 'Newsletter'],
    stats: [{ value: '22', label: 'Asset Categories' }, { value: 'AI', label: 'Powered Intelligence' }, { value: '∞', label: 'Scalable Pipeline' }],
    subChoices: [
      { id: 'property', label: 'Property / Venue', description: 'Team, venue, conference, festival, or trade show', industryId: 'sports' },
      { id: 'agency', label: 'Partnership Agency', description: 'Sell sponsorships on behalf of properties', industryId: 'agency' },
    ],
  },
  {
    id: 'nonprofit',
    label: 'Nonprofits',
    icon: '💛',
    headline: 'Donor & Sponsor Management',
    subtitle: 'Foundations, charities, and nonprofit organizations',
    description: 'Manage corporate donors, track pledge fulfillment, generate impact reports, and grow your sponsorship revenue with AI-powered tools.',
    deals: 'donor pledges',
    assets: 'recognition benefits',
    cta: 'nonprofit',
    modules: ['Donor Pipeline', 'Pledge Contracts', 'Recognition Assets', 'Fulfillment', 'Events', 'Newsletter'],
    stats: [{ value: '10+', label: 'Recognition Types' }, { value: 'AI', label: 'Donor Research' }, { value: '∞', label: 'Donor Pipeline' }],
  },
  {
    id: 'media',
    label: 'Media',
    icon: '📡',
    headline: 'Ad Sales Operations',
    subtitle: 'Broadcast, digital, podcast, and media companies',
    description: 'Manage ad inventory, track insertion orders, automate fulfillment verification, and forecast revenue across all channels.',
    deals: 'ad campaigns',
    assets: 'ad inventory',
    cta: 'media sales',
    modules: ['Sales Pipeline', 'Insertion Orders', 'Ad Inventory', 'Delivery Tracking', 'Analytics', 'Newsletter'],
    stats: [{ value: '12+', label: 'Ad Formats' }, { value: 'AI', label: 'Revenue Forecast' }, { value: '∞', label: 'Campaign Pipeline' }],
  },
  {
    id: 'realestate',
    label: 'Real Estate',
    icon: '🏢',
    headline: 'Lease & Tenant Pipeline',
    subtitle: 'Commercial real estate, property management, and brokerages',
    description: 'Track tenant prospects, manage lease agreements, fulfill build-out commitments, and forecast occupancy revenue in one platform.',
    deals: 'lease prospects',
    assets: 'property units',
    cta: 'real estate operation',
    modules: ['Tenant Pipeline', 'Lease Contracts', 'Property Units', 'Build-Out Tracking', 'Analytics'],
    stats: [{ value: '8+', label: 'Property Types' }, { value: 'AI', label: 'Market Analysis' }, { value: '∞', label: 'Tenant Pipeline' }],
  },
  {
    id: 'other',
    label: 'Other',
    icon: '🔧',
    headline: 'Your Sales Pipeline',
    subtitle: 'Any business that sells packages, services, or deliverables',
    description: 'Pipeline management, contract tracking, deliverable fulfillment, and AI-powered tools — configured to fit your business.',
    deals: 'deals',
    assets: 'deliverables',
    cta: 'business',
    modules: ['Pipeline', 'Contracts', 'Deliverables', 'Fulfillment', 'Team Management', 'Newsletter'],
    stats: [{ value: '20+', label: 'Asset Categories' }, { value: 'AI', label: 'Powered Intelligence' }, { value: '∞', label: 'Scalable Pipeline' }],
  },
]

export default function LandingPage() {
  const { visibility } = useIndustryVisibility()
  const visibleIndustries = INDUSTRIES.filter(ind => shouldShowIndustry(visibility, ind.id))
  const [industry, setIndustry] = useState(INDUSTRIES[0])
  const [welcomed, setWelcomed] = useState(() => {
    // Skip gate if they've visited before in this browser session
    return sessionStorage.getItem('ll-welcomed') === '1'
  })
  const hasAccount = localStorage.getItem('ll-has-account') === '1'

  function handleNewUser() {
    sessionStorage.setItem('ll-welcomed', '1')
    setWelcomed(true)
  }

  function handleLogoClick() {
    sessionStorage.removeItem('ll-welcomed')
    setWelcomed(false)
    window.scrollTo({ top: 0 })
  }

  function handleReturningUser() {
    localStorage.setItem('ll-has-account', '1')
    sessionStorage.setItem('ll-welcomed', '1')
    // Navigate handled by Link in the gate
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <AnimatePresence>
        {!welcomed && (
          <WelcomeGate
            hasAccount={hasAccount}
            onNewUser={handleNewUser}
            onReturningUser={handleReturningUser}
            industries={visibleIndustries}
            selectedIndustry={industry}
            onSelectIndustry={setIndustry}
          />
        )}
      </AnimatePresence>

      {welcomed && (
        <>
          <Nav onLogoClick={handleLogoClick} />
          <Hero industry={industry} onSelectIndustry={setIndustry} />
          <IndustrySelector selected={industry} onSelect={setIndustry} industries={visibleIndustries} />
          <Ecosystem industry={industry} />
          <Modules industry={industry} />
          <HowItWorks />
          <AISection />
          <WhyLoudLegacy />
          <CTA industry={industry} />
          <SponsorsSection />
          <Footer />
        </>
      )}
    </div>
  )
}

/* ─── WELCOME GATE ─── */
function WelcomeGate({ hasAccount, onNewUser, onReturningUser, industries, selectedIndustry, onSelectIndustry }) {
  // Always open on the 'choose' step — that's the prospecting/CRM
  // welcome page and it's where every visitor (new OR returning)
  // should land first. Returning users still have a "Sign in" link
  // there, plus the dedicated /login route.
  const [step, setStep] = useState('choose') // choose | industry | sub-choice | returning
  const [pendingIndustry, setPendingIndustry] = useState(null)
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="fixed inset-0 z-[100] bg-bg-primary flex items-center justify-center"
    >
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#E8B84B 1px, transparent 1px), linear-gradient(90deg, #E8B84B 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className={`relative w-full mx-auto px-6 ${step === 'plans' ? 'max-w-4xl' : 'max-w-lg'}`}>
        <AnimatePresence mode="wait">
          {/* Step 1: New or Returning */}
          {step === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="text-center space-y-6"
            >
              <div>
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="font-mono font-bold text-accent text-2xl inline-block"
                  style={{ letterSpacing: '0.08em', wordSpacing: '-0.3em' }}
                >
                  LOUD LEGACY
                </motion.span>
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-text-primary text-2xl sm:text-3xl font-bold mt-4 leading-tight"
                >
                  Find your next customer.
                  <br />
                  <span className="text-accent">Close them in one workspace.</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-text-secondary text-sm mt-4"
                >
                  AI-powered prospecting + a CRM built for revenue teams. Discover decision-makers, run your pipeline, and personalize outreach — all in one place. <span className="text-text-primary">$39/mo</span>.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <button
                  onClick={() => setStep('plans')}
                  className="block w-full bg-accent text-bg-primary py-4 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity text-center"
                >
                  Start Free — No Credit Card
                </button>
                <button
                  onClick={() => setStep('industry')}
                  className="w-full border border-border text-text-secondary py-3 rounded-lg text-xs font-medium hover:border-accent/50 hover:text-text-primary transition-colors"
                >
                  See how it works for my industry
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('ll-has-account', '1')
                    navigate('/login')
                  }}
                  className="w-full text-[11px] text-text-muted hover:text-text-secondary py-1"
                >
                  Already have an account? Sign in
                </button>
              </motion.div>

              {/* Social proof row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="grid grid-cols-3 gap-2 pt-6 mt-6 border-t border-border"
              >
                <div className="text-center">
                  <div className="text-base font-bold text-text-primary">AI</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider">Prospecting</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold text-text-primary">∞</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider">Pipeline</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold text-accent">$0</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider">To Start</div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Step 1c: Plan picker. "Start Free" routes here so the
              visitor sees the three tiers before signing up. Each
              card carries the plan into /login so signup can
              pre-select it (read in the LoginPage from the
              `plan` query param). */}
          {step === 'plans' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="space-y-6 max-w-3xl"
            >
              <div className="text-center">
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-semibold text-text-primary"
                >
                  Pick a plan to start
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-text-secondary text-sm mt-2"
                >
                  CRM + Prospecting on every plan. Email integration only on Enterprise.
                </motion.p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PLAN_TIERS.map((tier, i) => (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.08 }}
                    className={`relative flex flex-col rounded-lg border p-5 text-left ${
                      tier.featured
                        ? 'border-accent bg-accent/5'
                        : 'border-border bg-bg-surface'
                    }`}
                  >
                    {tier.featured && (
                      <div className="absolute -top-2 right-4 text-[9px] font-mono uppercase tracking-widest bg-accent text-bg-primary px-2 py-0.5 rounded">
                        Most popular
                      </div>
                    )}
                    <div className="text-sm font-semibold text-text-primary">{tier.name}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{tier.tagline}</div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-text-primary">${tier.price}</span>
                      <span className="text-[11px] text-text-muted">/mo</span>
                    </div>
                    <ul className="mt-4 space-y-1.5 text-[12px] text-text-secondary">
                      {tier.features.map(f => (
                        <li key={f.label} className="flex items-start gap-2">
                          <span
                            className={`mt-[2px] inline-block w-3 text-center font-mono text-[11px] ${
                              f.included ? 'text-accent' : 'text-text-muted/50'
                            }`}
                            aria-hidden="true"
                          >
                            {f.included ? '✓' : '–'}
                          </span>
                          <span className={f.included ? '' : 'line-through text-text-muted/60'}>
                            {f.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={`/login?mode=signup&plan=${tier.id}`}
                      onClick={() => { localStorage.setItem('ll-welcomed', '1') }}
                      className={`mt-5 block w-full text-center py-2.5 rounded text-sm font-semibold transition-opacity ${
                        tier.featured
                          ? 'bg-accent text-bg-primary hover:opacity-90'
                          : 'border border-border text-text-primary hover:border-accent/50'
                      }`}
                    >
                      {tier.cta}
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setStep('choose')}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  &larr; Go back
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 1b: Returning user shortcut */}
          {step === 'returning' && (
            <motion.div
              key="returning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="text-center space-y-8"
            >
              <div>
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="font-mono font-bold text-accent text-2xl inline-block"
                  style={{ letterSpacing: '0.08em', wordSpacing: '-0.3em' }}
                >
                  LOUD LEGACY
                </motion.span>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-text-primary text-lg mt-4 font-medium"
                >
                  Welcome back.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <Link
                  to="/login"
                  className="block w-full bg-accent text-bg-primary py-4 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity text-center"
                >
                  Sign In to Your Account
                </Link>
                <button
                  onClick={() => setStep('industry')}
                  className="w-full border border-border text-text-secondary py-3 rounded-lg text-sm font-medium hover:border-accent/50 hover:text-text-primary transition-colors"
                >
                  I'm new — explore the platform
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* Step 2: Industry Selection */}
          {step === 'industry' && (
            <motion.div
              key="industry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="text-center space-y-6"
            >
              <div>
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl font-semibold text-text-primary"
                >
                  What industry are you in?
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-text-secondary text-sm mt-2"
                >
                  We'll customize everything to fit your workflow
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-3"
              >
                {industries.map((ind, i) => (
                  <motion.button
                    key={ind.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    onClick={() => {
                      if (ind.subChoices) {
                        setPendingIndustry(ind)
                        setStep('sub-choice')
                      } else {
                        onSelectIndustry(ind)
                        onNewUser()
                      }
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all hover:border-accent/50 hover:bg-accent/5 ${
                      selectedIndustry.id === ind.id ? 'border-accent bg-accent/5' : 'border-border'
                    }`}
                  >
                    <span className="text-xl">{ind.icon}</span>
                    <div>
                      <div className="text-sm text-text-primary font-medium">{ind.label}</div>
                      <div className="text-[10px] text-text-muted leading-tight mt-0.5">{ind.subtitle.split(',')[0]}</div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={() => setStep('choose')}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                &larr; Go back
              </motion.button>
            </motion.div>
          )}

          {/* Step 2b: Sub-choice (e.g. Sports Property vs Agency) */}
          {step === 'sub-choice' && pendingIndustry && (
            <motion.div
              key="sub-choice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="text-center space-y-6"
            >
              <div>
                <span className="text-3xl">{pendingIndustry.icon}</span>
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl font-semibold text-text-primary mt-3"
                >
                  Which best describes you?
                </motion.h2>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                {pendingIndustry.subChoices.map((sub, i) => (
                  <motion.button
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.1 }}
                    onClick={() => {
                      // Use the parent industry for landing page display
                      onSelectIndustry({ ...pendingIndustry, _subChoice: sub.id, _registrationId: sub.industryId })
                      onNewUser()
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border border-border text-left transition-all hover:border-accent/50 hover:bg-accent/5"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                      {sub.id === 'property' ? '🏟' : '📋'}
                    </div>
                    <div>
                      <div className="text-sm text-text-primary font-medium">{sub.label}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">{sub.description}</div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setStep('industry')}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                &larr; Pick a different industry
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ─── NAV ─── */
function Nav({ onLogoClick }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={onLogoClick} className="font-mono font-bold text-accent text-base cursor-pointer hover:opacity-80 transition-opacity" style={{letterSpacing:'0.08em',wordSpacing:'-0.3em'}}>LOUD LEGACY</button>
        <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
          <a href="#ecosystem" className="hover:text-text-primary transition-colors">Ecosystem</a>
          <a href="#modules" className="hover:text-text-primary transition-colors">Modules</a>
          <a href="#how-it-works" className="hover:text-text-primary transition-colors">How It Works</a>
          <a href="#ai" className="hover:text-text-primary transition-colors">AI</a>
          <a href="#contact" className="hover:text-text-primary transition-colors">Contact</a>
        </div>
        <Link
          to="/login"
          className="bg-accent text-bg-primary px-5 py-2 rounded text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Sign In
        </Link>
      </div>
    </nav>
  )
}

/* ─── HERO ─── */
function Hero({ industry }) {
  return (
    <section className="pt-32 pb-16 px-6 relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#E8B84B 1px, transparent 1px), linear-gradient(90deg, #E8B84B 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="max-w-4xl mx-auto text-center relative"
      >
        <motion.div variants={fadeUp} className="inline-block mb-6">
          <span className="text-xs font-mono text-accent bg-accent/10 px-3 py-1.5 rounded-full tracking-wider uppercase">
            {industry.id === 'sports' ? 'Sports Business Operating Suite' : `${industry.label} Operating Suite`}
          </span>
        </motion.div>

        <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
          The Operating System For{' '}
          <AnimatePresence mode="wait">
            <motion.span
              key={industry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-accent inline-block"
            >
              {industry.headline}
            </motion.span>
          </AnimatePresence>
        </motion.h1>

        <AnimatePresence mode="wait">
          <motion.p
            key={industry.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-lg md:text-xl text-text-secondary mt-6 max-w-2xl mx-auto leading-relaxed"
          >
            {industry.description}
          </motion.p>
        </AnimatePresence>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            to={`/login?industry=${industry._registrationId || industry.id}`}
            className="bg-accent text-bg-primary px-8 py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
          <a
            href="#industries"
            className="border border-border text-text-secondary px-8 py-3.5 rounded-lg text-sm font-medium hover:border-text-muted hover:text-text-primary transition-colors"
          >
            See All Industries
          </a>
        </motion.div>

        {/* Stats bar */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-6 mt-16 max-w-lg mx-auto">
          {industry.stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-mono font-bold text-accent">{stat.value}</div>
              <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ─── INDUSTRY SELECTOR ─── */
// `industries` is passed in from the parent LandingPage so we respect
// the show_* visibility flags. Previously this function referenced a
// `visibleIndustries` variable that was only in LandingPage's scope,
// which threw ReferenceError at render time — causing the whole
// section (and any CTA inside it, like "Other") to fail silently.
function IndustrySelector({ selected, onSelect, industries = [] }) {
  return (
    <section id="industries" className="py-16 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag="Select Your Industry"
          title="One platform. Every industry."
          description="Loud Legacy adapts its terminology, asset categories, and workflows to your industry. Pick yours to see how it works for you."
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-12">
          {industries.map((ind) => (
            <button
              key={ind.id}
              onClick={() => { onSelect(ind); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all text-center ${
                selected.id === ind.id
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-bg-surface border-border text-text-secondary hover:border-accent/30 hover:text-text-primary'
              }`}
            >
              <span className="text-2xl">{ind.icon}</span>
              <span className="text-xs font-mono">{ind.label}</span>
            </button>
          ))}
        </div>

        {/* Selected industry detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-8 bg-bg-surface border border-border rounded-lg p-6"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{selected.icon}</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary">{selected.headline}</h3>
                <p className="text-sm text-text-muted mt-1">{selected.subtitle}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {selected.modules.map(m => (
                    <span key={m} className="text-[10px] font-mono bg-bg-card border border-border px-2.5 py-1 rounded text-text-secondary">{m}</span>
                  ))}
                </div>
                <div className="mt-4">
                  <Link
                    to={`/login?industry=${selected._registrationId || selected.id}`}
                    className="inline-block bg-accent text-bg-primary px-6 py-2.5 rounded text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Start Free — {selected.label}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

/* ─── ECOSYSTEM OVERVIEW ─── */
function Ecosystem({ industry }) {
  return (
    <section id="ecosystem" className="py-24 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag="The Ecosystem"
          title="Four modules. One platform. Zero silos."
          description={`Every piece of your ${industry.cta} operation—from prospecting to contract execution to fulfillment—lives in one connected system. Data flows between modules automatically so your team works from a single source of truth.`}
        />

        {/* Ecosystem diagram */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="mt-16 relative"
        >
          {/* Center hub */}
          <motion.div variants={fadeUp} className="flex justify-center mb-8">
            <div className="bg-accent/10 border-2 border-accent rounded-2xl px-8 py-5 text-center">
              <div className="font-mono font-bold text-accent text-lg " style={{letterSpacing:'0.08em',wordSpacing:'-0.3em'}}>LOUD LEGACY</div>
              <div className="text-xs text-text-muted mt-1">Unified Data Layer + Claude AI</div>
            </div>
          </motion.div>

          {/* Connection lines visual */}
          <div className="hidden md:flex justify-center mb-6">
            <div className="w-px h-8 bg-border" />
          </div>
          <div className="hidden md:block max-w-3xl mx-auto h-px bg-border mb-6" />
          <div className="hidden md:flex justify-between max-w-3xl mx-auto mb-6 px-16">
            {[...Array(4)].map((_, i) => <div key={i} className="w-px h-8 bg-border" />)}
          </div>

          {/* Module cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Legacy CRM', icon: '▣', color: 'text-accent', desc: 'Pipeline & partnerships', detail: 'AI-powered prospecting, deal pipeline, contract intelligence, asset inventory, fulfillment tracking, and verified contact enrichment — all connected.' },
              { name: 'Activations', icon: '◈', color: 'text-success', desc: 'Events & operations', detail: 'Run-of-show, sponsor activations, vendor coordination, attendance tracking, and broadcast analytics — works for game days, galas, conferences, and launches alike.' },
              { name: 'VALORA', icon: '◇', color: 'text-warning', desc: 'AI valuations', detail: 'Know what every asset is worth. Market position analysis, pricing intelligence, and AI-calculated media values tied to real sponsor data.' },
              { name: 'Business Now', icon: '◆', color: 'text-text-primary', desc: 'Intelligence & metrics', detail: 'Live pipeline alerts, AI daily briefings, sports business newsletters, and team performance dashboards — your real-time command center.' },
            ].map((mod, i) => (
              <motion.div
                key={mod.name}
                variants={fadeUp}
                custom={i}
                className="bg-bg-surface border border-border rounded-xl p-5 hover:border-accent/20 transition-colors group"
              >
                <div className={`text-2xl mb-3 ${mod.color}`}>{mod.icon}</div>
                <h3 className="font-semibold text-text-primary text-sm">{mod.name}</h3>
                <p className="text-xs text-text-muted mt-0.5 font-mono">{mod.desc}</p>
                <p className="text-sm text-text-secondary mt-3 leading-relaxed">{mod.detail}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── MODULE DEEP DIVES ─── */
function Modules({ industry }) {
  const id = industry?.id || 'sports'

  // Industry-specific module content
  const CRM_FEATURES = {
    sports: [
      { title: 'Smart Prospecting', desc: 'AI-powered prospect search discovers sponsors by industry, brand, or keyword. Verified decision-maker contacts with LinkedIn profiles.' },
      { title: 'Deal Pipeline', desc: 'Drag-and-drop Kanban board tracks deals from Prospect to Renewed. Multi-year revenue tracking and stage-by-stage forecasting.' },
      { title: 'Contract Intelligence', desc: 'Upload PDF or Word contracts — AI extracts benefits, revenue, and contact info. Auto-creates assets and fulfillment records.' },
      { title: 'Asset Catalog', desc: '22 sponsorship asset categories with real-time inventory. Every asset linked to deals and fulfillment tracking.' },
      { title: 'Fulfillment Tracker', desc: 'Contracted benefits auto-populate. Mark delivered, upload proof photos, track overdue items.' },
      { title: 'Verified Contacts', desc: 'Real executive contacts with email verification and enriched company data. One click to verify.' },
    ],
    entertainment: [
      { title: 'Partner Prospecting', desc: 'AI finds brands that sponsor venues, concerts, and live events. Verified contacts at target companies.' },
      { title: 'Partnership Pipeline', desc: 'Track venue partnerships from lead to renewal. Manage VIP packages, naming rights, and activations.' },
      { title: 'Contract Intelligence', desc: 'Upload partnership agreements — AI extracts deliverables and auto-creates tracking records.' },
      { title: 'Package Catalog', desc: '20 venue package types from stage banners to VIP lounges. Price and track availability.' },
      { title: 'Delivery Tracker', desc: 'Track every deliverable per partner. Upload proof photos, mark delivered, generate reports.' },
      { title: 'Verified Contacts', desc: 'Real decision-makers at brands with email verification. One click to verify.' },
    ],
    conference: [
      { title: 'Exhibitor Prospecting', desc: 'AI finds companies that exhibit at trade shows and sponsor conferences. Verified contacts at target companies.' },
      { title: 'Exhibitor Pipeline', desc: 'Track exhibitor deals from lead to signed. Manage booth packages, speaking slots, and sponsorships.' },
      { title: 'Contract Intelligence', desc: 'Upload exhibitor agreements — AI extracts packages and creates fulfillment records automatically.' },
      { title: 'Package Catalog', desc: '20 exhibitor package types from booth space to keynote sponsorships. Real-time availability.' },
      { title: 'Delivery Tracker', desc: 'Track every exhibitor deliverable. Badge branding, booth setup, WiFi sponsorship — all tracked.' },
      { title: 'Verified Contacts', desc: 'Real marketing directors and event managers at target companies. Email verified.' },
    ],
    nonprofit: [
      { title: 'Donor Prospecting', desc: 'AI finds corporations with active CSR programs and community giving budgets. Verified contacts.' },
      { title: 'Donor Pipeline', desc: 'Track corporate partnerships from prospect to pledge to renewal. Multi-year giving tracked.' },
      { title: 'Pledge Agreements', desc: 'Upload pledge agreements — AI extracts recognition benefits and creates tracking records.' },
      { title: 'Recognition Catalog', desc: '16 recognition types from title sponsorship to scholarship naming. Track what\'s committed.' },
      { title: 'Recognition Tracker', desc: 'Track every donor recognition deliverable. Annual reports, event signage, website logos — all tracked.' },
      { title: 'Verified Contacts', desc: 'Real CSR directors and foundation managers at target companies. Email verified.' },
    ],
    media: [
      { title: 'Advertiser Prospecting', desc: 'AI finds brands buying advertising and sponsored content. Verified contacts at agencies and brands.' },
      { title: 'Campaign Pipeline', desc: 'Track ad campaigns from pitch to insertion order to delivery. Multi-channel revenue tracking.' },
      { title: 'Insertion Orders', desc: 'Upload IO documents — AI extracts placements, dates, and rates. Auto-creates delivery records.' },
      { title: 'Ad Inventory', desc: '16 ad placement types from display ads to podcast sponsorships. Price and track availability.' },
      { title: 'Delivery Tracking', desc: 'Track impression delivery per campaign. Display, video, audio, native — all in one view.' },
      { title: 'Verified Contacts', desc: 'Real media buyers and brand managers at target companies. Email verified.' },
    ],
    realestate: [
      { title: 'Tenant Prospecting', desc: 'AI finds businesses looking for commercial space. Verified contacts at target companies.' },
      { title: 'Lease Pipeline', desc: 'Track tenant prospects from inquiry to signed lease. Multi-year lease revenue tracked.' },
      { title: 'Lease Agreements', desc: 'Upload lease documents — AI extracts terms, rates, and build-out requirements.' },
      { title: 'Property Units', desc: '16 unit types from office suites to retail space. Track availability and pricing.' },
      { title: 'Build-Out Tracker', desc: 'Track every tenant build-out milestone. Inspections, completions, and handoffs.' },
      { title: 'Verified Contacts', desc: 'Real commercial real estate decision-makers. Email verified.' },
    ],
    other: [
      { title: 'Smart Prospecting', desc: 'AI finds companies matching your target profile. Verified decision-maker contacts.' },
      { title: 'Deal Pipeline', desc: 'Track deals from prospect to close to fulfillment. Multi-year revenue tracking.' },
      { title: 'Contract Intelligence', desc: 'Upload contracts — AI extracts deliverables and creates tracking records.' },
      { title: 'Deliverable Catalog', desc: 'Organize your service offerings. Price and track availability.' },
      { title: 'Fulfillment Tracker', desc: 'Track every deliverable per client. Mark delivered, upload proof, generate reports.' },
      { title: 'Verified Contacts', desc: 'Real decision-makers at target companies. Email verified.' },
    ],
  }

  const VALORA_FEATURE = {
    sports: { name: 'VALORA', tagline: 'Know what your inventory is worth', features: [
      { title: 'AI Media Valuation', desc: 'Calculate estimated media value from broadcast data, audience metrics, and market benchmarks.' },
      { title: 'Market Position', desc: 'Every asset classified as below, fair, or above market value.' },
      { title: 'Pricing Intelligence', desc: 'Historical pricing data with AI recommendations on when to raise prices.' },
    ]},
    entertainment: { name: 'ValueIQ', tagline: 'Price your partnerships accurately', features: [
      { title: 'Attendance-Based Valuation', desc: 'Calculate partnership value from event attendance, dwell time, and impressions per person.' },
      { title: 'Market Position', desc: 'Compare your pricing to venue industry benchmarks.' },
    ]},
    conference: { name: 'ValueIQ', tagline: 'Price exhibitor packages right', features: [
      { title: 'Lead Value Model', desc: 'Calculate sponsorship value from registrations, booth visits, and average lead value.' },
      { title: 'Market Benchmarks', desc: 'Compare your exhibitor pricing to industry standards.' },
    ]},
    media: { name: 'AdPriceIQ', tagline: 'Optimize your ad rates', features: [
      { title: 'CPM/CPC Analysis', desc: 'Calculate ad value from impressions, click-through rates, and placement premiums.' },
      { title: 'Rate Optimization', desc: 'AI recommendations on pricing by placement, format, and audience.' },
    ]},
    realestate: { name: 'MarketValue', tagline: 'Price your spaces competitively', features: [
      { title: 'Lease Valuation', desc: 'Calculate annual lease value from square footage, market rates, and occupancy.' },
      { title: 'Market Comparison', desc: 'Compare your rates to local commercial real estate benchmarks.' },
    ]},
  }

  const EVENTS_FEATURE = {
    sports: { name: 'Activations', tagline: 'Event operations, elevated', features: [
      { title: 'Event Command Center', desc: 'Grid and calendar views for every game day, tournament, and banquet.' },
      { title: 'Game Day Checklist', desc: 'Sponsor activation checklist with status tracking and proof photo uploads.' },
      { title: 'Run of Show', desc: 'Minute-by-minute event schedule with completion tracking.' },
    ]},
    entertainment: { name: 'VenueOps', tagline: 'Run flawless events', features: [
      { title: 'Event Manager', desc: 'Concerts, festivals, comedy shows, theater — all tracked with vendor and activation management.' },
      { title: 'Activation Checklist', desc: 'Partner setup tracking with proof photos and status updates.' },
    ]},
    conference: { name: 'EventOps', tagline: 'Conference operations simplified', features: [
      { title: 'Event Manager', desc: 'Conferences, trade shows, summits, workshops — schedule, vendors, and logistics in one place.' },
      { title: 'Exhibitor Setup Tracking', desc: 'Track every booth, sponsorship activation, and deliverable on event day.' },
    ]},
    nonprofit: { name: 'Programs', tagline: 'Manage your events and programs', features: [
      { title: 'Event Manager', desc: 'Galas, fundraisers, golf tournaments, charity runs — all tracked with vendor management.' },
      { title: 'Donor Activation Tracking', desc: 'Track sponsor recognition at events with proof photos.' },
    ]},
  }

  // Build modules list based on industry
  const crmFeatures = CRM_FEATURES[id] || CRM_FEATURES.other
  const terminology = industry?.deals || 'deals'

  const modules = [
    {
      id: 'crm',
      name: 'Legacy CRM',
      tagline: `From prospect to renewal in one view`,
      features: crmFeatures,
    },
  ]

  // Add events module if relevant
  const eventsModule = EVENTS_FEATURE[id]
  if (eventsModule) {
    modules.push({ id: 'events', ...eventsModule })
  }

  // Add valuation module if relevant (not for nonprofit or other)
  const valoraModule = VALORA_FEATURE[id]
  if (valoraModule) {
    modules.push({ id: 'valora', ...valoraModule })
  }

  // Always add Business Intelligence
  modules.push({
    id: 'businessnow',
    name: 'Business Now',
    tagline: 'Your real-time business command center',
    features: [
      { title: 'Live Pipeline Alerts', desc: 'Real-time monitoring flags stale deals, expiring contracts, and overdue tasks.' },
      { title: 'AI Daily Briefings', desc: 'Morning intelligence report analyzes your pipeline and delivers prioritized recommendations.' },
      { title: 'Industry Newsletter', desc: `Auto-generated weekly digest covering ${industry?.deals || 'deal'} trends and market intelligence.` },
    ],
  })

  return (
    <section id="modules" className="py-24 px-6 bg-bg-surface border-t border-border">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag="Deep Dive"
          title={`Everything your ${industry?.cta || 'revenue'} team needs`}
          description={`Each module is purpose-built for ${industry?.label?.toLowerCase() || 'your industry'}. Here's what's inside.`}
        />

        <div className="mt-16 space-y-20">
          {modules.map((mod, mi) => (
            <motion.div
              key={mod.id}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
            >
              <motion.div variants={fadeUp} className="mb-6">
                <span className="text-xs font-mono text-accent bg-accent/10 px-2.5 py-1 rounded tracking-wider">{mod.name}</span>
                <h3 className="text-2xl font-semibold text-text-primary mt-3">{mod.tagline}</h3>
              </motion.div>

              <div className={`grid grid-cols-1 md:grid-cols-2 ${mod.features.length > 4 ? 'lg:grid-cols-3' : ''} gap-4`}>
                {mod.features.map((feat, fi) => (
                  <motion.div
                    key={feat.title}
                    variants={fadeUp}
                    custom={fi}
                    className="bg-bg-card border border-border rounded-lg p-5"
                  >
                    <h4 className="text-sm font-semibold text-text-primary">{feat.title}</h4>
                    <p className="text-sm text-text-secondary mt-2 leading-relaxed">{feat.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Set up your property', desc: 'Add your team, sport, and conference. Invite your sales staff with role-based access. Admins set revenue goals and monitor team performance.' },
    { num: '02', title: 'Build your asset catalog', desc: '22 sponsorship asset categories — LED boards to VIP experiences. Set pricing, track inventory, and see what\'s sold, pitched, and available.' },
    { num: '03', title: 'Find and close sponsors', desc: 'AI discovers prospects with verified contacts and LinkedIn profiles. Move deals through your pipeline, attach assets, and generate contracts in clicks.' },
    { num: '04', title: 'Upload contracts & track fulfillment', desc: 'Upload PDF or Word contracts — AI extracts benefits automatically. Fulfillment tracker shows exactly what\'s been delivered and what\'s outstanding.' },
    { num: '05', title: 'Execute events & prove value', desc: 'Run of show, sponsor activations, broadcast tracking, and media valuations — everything you need to deliver and prove ROI.' },
  ]

  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          tag="Getting Started"
          title="Up and running in minutes"
          description="Loud Legacy is designed to be adopted incrementally. Start with CRM, unlock modules as you grow."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mt-16 space-y-0"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              variants={fadeUp}
              custom={i}
              className="flex gap-6 relative"
            >
              {/* Vertical line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[19px] top-12 bottom-0 w-px bg-border" />
              )}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-mono text-xs font-bold relative z-10">
                {step.num}
              </div>
              <div className="pb-10">
                <h3 className="text-base font-semibold text-text-primary">{step.title}</h3>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── AI SECTION ─── */
function AISection() {
  return (
    <section id="ai" className="py-24 px-6 bg-bg-surface border-t border-border">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag="AI + Verified Data"
          title="Intelligence that does the work for you"
          description="AI reads your contracts, finds your prospects, values your assets, and writes your briefings. Verified contact databases ensure the data is real."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
        >
          {[
            {
              title: 'Contract Analysis',
              desc: 'Upload a PDF or Word document and AI instantly extracts sponsor info, benefits, revenue by year, and contact details. Multi-year contracts are automatically broken down with per-year revenue tracking.',
              tag: 'Contracts',
            },
            {
              title: 'Prospect Intelligence',
              desc: 'Search for prospects and AI discovers decision-makers with names, titles, emails, and LinkedIn profiles. Company firmographics — revenue, headcount, industry — enriched from verified databases.',
              tag: 'CRM',
            },
            {
              title: 'Media Valuations',
              desc: 'AI calculates estimated media value from broadcast data and market benchmarks, then classifies each asset as below, fair, or above market price. Pricing recommendations tell you exactly when to raise rates.',
              tag: 'VALORA',
            },
            {
              title: 'Daily Intelligence',
              desc: 'AI monitors your pipeline for stale deals, hot opportunities, and expiring contracts. Weekly sports business newsletters and daily afternoon digests keep your team informed on industry trends.',
              tag: 'Business Now',
            },
            {
              title: 'Email & Outreach',
              desc: 'AI drafts follow-up emails, proposal messages, and meeting notes based on your deal context. Pipeline forecasting predicts 30/60/90 day revenue with best-case and worst-case scenarios.',
              tag: 'Insights',
            },
            {
              title: 'Verified Data',
              desc: 'Integrated with industry-leading contact databases for verified executive emails, direct phone numbers, and real LinkedIn profiles. Email verification confirms deliverability before you send.',
              tag: 'Enrichment',
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              custom={i}
              className="bg-bg-card border border-border rounded-xl p-6"
            >
              <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-1 rounded tracking-wider uppercase">{item.tag}</span>
              <h3 className="text-lg font-semibold text-text-primary mt-4">{item.title}</h3>
              <p className="text-sm text-text-secondary mt-3 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-10 bg-bg-card border border-border rounded-xl p-6 text-center"
        >
          <p className="text-sm text-text-secondary max-w-2xl mx-auto leading-relaxed">
            <span className="text-text-primary font-medium">Your data stays yours.</span>{' '}
            Enterprise-grade security with row-level access control. Every team sees only their data.
            AI interactions are scoped to your organization and are never used for training.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── WHY LOUD LEGACY ─── */
function WhyLoudLegacy() {
  const points = [
    { title: 'Built exclusively for sports', desc: 'Not a generic CRM. Every workflow, asset category, and data model is designed for the sponsorship sales process.' },
    { title: 'Verified contact intelligence', desc: 'Real decision-maker names, verified emails, and LinkedIn profiles from industry-leading databases. Not guesses — actual contacts.' },
    { title: 'Upload-to-insight in seconds', desc: 'Upload a contract PDF and watch AI extract every benefit, contact, and revenue figure instantly. No manual data entry.' },
    { title: 'Know your inventory value', desc: 'VALORA tells you if you\'re underpricing assets, when to raise rates, and what similar properties charge. Data-driven pricing.' },
    { title: 'Mobile-first design', desc: 'Full functionality on your phone. Click-to-call contacts, manage your pipeline, read newsletters, and update deals from anywhere.' },
    { title: 'Enterprise security, startup speed', desc: 'Row-level security, team hierarchy with role-based access, and modular design. Start with CRM, unlock modules as you grow.' },
  ]

  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag="Why Us"
          title="Purpose-built for the sports business"
          description="Generic tools weren't built for the unique workflows of sponsorship sales, event operations, and media valuations."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-16"
        >
          {points.map((point, i) => (
            <motion.div
              key={point.title}
              variants={fadeUp}
              custom={i}
              className="border border-border rounded-lg p-5 hover:border-accent/20 transition-colors"
            >
              <h3 className="text-sm font-semibold text-text-primary">{point.title}</h3>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">{point.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── CTA ─── */
function CTA({ industry }) {
  return (
    <section id="contact" className="py-24 px-6 bg-bg-surface border-t border-border">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="max-w-2xl mx-auto text-center"
      >
        <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-text-primary">
          Ready to modernize your {industry.cta}?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-text-secondary mt-4 leading-relaxed">
          Loud Legacy is built for teams who are ready to move beyond spreadsheets and disconnected tools.
          Start free — no credit card required.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link
            to={`/login?industry=${industry._registrationId || industry.id}`}
            className="bg-accent text-bg-primary px-8 py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Create Your Free Account
          </Link>
          <a
            href="mailto:jason@loud-legacy.com"
            className="border border-border text-text-secondary px-8 py-3.5 rounded-lg text-sm font-medium hover:border-text-muted hover:text-text-primary transition-colors"
          >
            Contact Us
          </a>
        </motion.div>
        <motion.p variants={fadeUp} className="text-text-muted text-sm mt-6">
          Questions? Reach out to{' '}
          <a href="mailto:jason@loud-legacy.com" className="text-accent hover:underline">jason@loud-legacy.com</a>
        </motion.p>
      </motion.div>
    </section>
  )
}

/* ─── SPONSORS / PARTNERS ─── */
// Inline CMS editable sponsor slots. Developer clicks any empty slot
// in edit mode to upload a logo. Edit mode is toggled from the CMS
// toolbar (top right). Slots with no image render nothing in normal
// mode, so an empty state looks clean rather than broken.
function SponsorsSection() {
  return (
    <section className="py-16 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">
            <EditableText contentKey="sponsors_eyebrow" fallback="Partners & Sponsors" tag="span" />
          </div>
          <h3 className="text-xl text-text-primary font-semibold">
            <EditableText contentKey="sponsors_headline" fallback="Loud Legacy is proudly supported by" tag="span" />
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-center">
          {['sponsor_logo_1', 'sponsor_logo_2', 'sponsor_logo_3', 'sponsor_logo_4', 'sponsor_logo_5', 'sponsor_logo_6'].map(key => (
            <div key={key} className="flex items-center justify-center h-16 opacity-80 hover:opacity-100 transition-opacity">
              <EditableImage
                contentKey={key}
                fallback=""
                alt="Sponsor logo"
                className="max-h-16 max-w-full object-contain"
              />
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <EditableText
            contentKey="sponsors_caption"
            fallback=""
            tag="p"
            className="text-xs text-text-muted"
            multiline
          />
        </div>
      </div>
    </section>
  )
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <span className="font-mono font-bold text-accent text-sm " style={{letterSpacing:'0.08em',wordSpacing:'-0.3em'}}>LOUD LEGACY</span>
            <p className="text-text-secondary text-sm mt-3 max-w-md leading-relaxed">
              The operating suite for partnership sales teams — sports, entertainment, conferences, nonprofits, media, and more.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Platform</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              <a href="#ecosystem" className="block hover:text-text-primary transition-colors">Ecosystem</a>
              <a href="#modules" className="block hover:text-text-primary transition-colors">Modules</a>
              <a href="#how-it-works" className="block hover:text-text-primary transition-colors">How It Works</a>
              <a href="#ai" className="block hover:text-text-primary transition-colors">AI Integration</a>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Connect</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              <a href="mailto:jason@loud-legacy.com" className="block hover:text-text-primary transition-colors">jason@loud-legacy.com</a>
              <Link to="/login" className="block hover:text-text-primary transition-colors">Sign In</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs text-text-muted">&copy; {new Date().getFullYear()} Loud Legacy. All rights reserved.</span>
          <div className="flex gap-4 text-xs text-text-muted">
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ─── SHARED COMPONENTS ─── */
function SectionHeader({ tag, title, description }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
      className="text-center max-w-3xl mx-auto"
    >
      <motion.span variants={fadeUp} className="text-xs font-mono text-accent bg-accent/10 px-3 py-1.5 rounded-full tracking-wider uppercase">
        {tag}
      </motion.span>
      <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-text-primary mt-5">
        {title}
      </motion.h2>
      <motion.p variants={fadeUp} className="text-text-secondary mt-4 leading-relaxed">
        {description}
      </motion.p>
    </motion.div>
  )
}
