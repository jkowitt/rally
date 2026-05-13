import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import EditableText, { EditableImage } from '@/components/cms/EditableText'
import { PLAN_TIERS } from '@/data/plans'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function LandingPage() {
  const [welcomed, setWelcomed] = useState(() => {
    // Skip gate if they've visited before in this browser session
    return sessionStorage.getItem('ll-welcomed') === '1'
  })

  function handleLogoClick() {
    sessionStorage.removeItem('ll-welcomed')
    setWelcomed(false)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <AnimatePresence>
        {!welcomed && <WelcomeGate />}
      </AnimatePresence>

      {welcomed && (
        <>
          <Nav onLogoClick={handleLogoClick} />
          <Hero />
          {/* Industry picker, Ecosystem, and Modules sections removed —
              the launch positioning is industry-agnostic CRM +
              Prospecting. Restore from git history if needed. */}
          <HowItWorks />
          <AISection />
          <WhyLoudCRM />
          <CTA />
          <SponsorsSection />
          <Footer />
        </>
      )}
    </div>
  )
}

/* ─── WELCOME GATE ─── */
function WelcomeGate() {
  // Two real steps after the launch positioning change:
  //   choose → the CRM + Prospecting welcome
  //   plans  → tier picker after Start Free
  // The 'returning' step is reachable only via the choose step's
  // existing "Sign in" link and is preserved for legacy paths.
  const [step, setStep] = useState('choose')
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="fixed inset-0 z-[100] bg-bg-primary flex items-center justify-center"
    >
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#E8B84B 1px, transparent 1px), linear-gradient(90deg, #E8B84B 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Parent wrapper stays at a single width so the AnimatePresence
          exit animation isn't interrupted by a parent reflow. Each
          step's motion.div sets its own max-width + mx-auto, so the
          choose / returning steps stay narrow while the plans grid
          fills out the wider modal. */}
      <div className="relative w-full mx-auto px-6 max-w-6xl">
        <AnimatePresence mode="wait">
          {/* Step 1: New or Returning */}
          {step === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="mx-auto max-w-lg text-center space-y-6"
            >
              <div>
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src="/logo-loud-legacy.svg"
                  alt="Loud CRM"
                  className="block mx-auto w-auto h-20 sm:h-24 mb-8"
                />
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-text-primary text-2xl sm:text-3xl font-bold mt-4 leading-tight"
                >
                  Grow Your Business
                  <br />
                  <span className="text-accent">Loud.</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-text-secondary text-sm mt-4"
                >
                  The CRM, Prospecting, and Tools platform built for revenue teams. Find prospects, close deals, and grow your business — all in one workspace. <span className="text-text-primary">Free to start, $39/mo Starter, $99/mo Pro</span>.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <button
                  onClick={() => setStep('plans')}
                  className="block w-full bg-accent text-bg-primary py-4 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity text-center"
                >
                  Start Free — No Credit Card
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
                className="grid grid-cols-3 gap-2 pt-6 mt-6 border-t border-border"
              >
                <div className="text-center">
                  <div className="text-base font-bold text-text-primary">CRM</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider">Pipeline</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold text-text-primary">AI</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider">Prospecting</div>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-6 mx-auto max-w-5xl"
            >
              <div className="text-center">
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-2xl font-semibold text-text-primary"
                >
                  Pick a plan to start
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-text-secondary text-sm mt-2"
                >
                  CRM + Prospecting on every plan. Email integration only on Enterprise.
                </motion.p>
              </div>

              {/* items-stretch on the grid + flex-1 on the bullet list
                  forces every card to the tallest sibling's height so
                  the CTA buttons line up across the row. pt-7 leaves
                  headroom for the absolutely-positioned "Most popular"
                  ribbon on the featured card. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch pt-3">
                {PLAN_TIERS.map((tier, i) => (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`relative h-full flex flex-col rounded-lg border p-5 text-left ${
                      tier.featured
                        ? 'border-accent bg-accent/5'
                        : 'border-border bg-bg-surface'
                    }`}
                  >
                    {tier.featured && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase tracking-widest bg-accent text-bg-primary px-2 py-0.5 rounded whitespace-nowrap">
                        Most popular
                      </div>
                    )}
                    <div className="text-sm font-semibold text-text-primary">{tier.name}</div>
                    <div className="text-[11px] text-text-muted mt-0.5 min-h-[28px]">{tier.tagline}</div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-text-primary">${tier.monthly}</span>
                      <span className="text-[11px] text-text-muted">/mo</span>
                    </div>
                    <ul className="mt-4 space-y-1.5 text-[12px] text-text-secondary flex-1">
                      {tier.highlights.map(f => (
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="mx-auto max-w-lg text-center space-y-8"
            >
              <div>
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src="/logo-loud-legacy.svg"
                  alt="Loud CRM"
                  className="block mx-auto w-auto h-20 sm:h-24 mb-8"
                />
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-text-primary text-lg mt-4 font-medium"
                >
                  Welcome back.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <Link
                  to="/login"
                  className="block w-full bg-accent text-bg-primary py-4 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity text-center"
                >
                  Sign In to Your Account
                </Link>
                <button
                  onClick={() => setStep('plans')}
                  className="w-full border border-border text-text-secondary py-3 rounded-lg text-sm font-medium hover:border-accent/50 hover:text-text-primary transition-colors"
                >
                  I'm new — explore the platform
                </button>
              </motion.div>
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
        <button
          onClick={onLogoClick}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="Loud CRM — Home"
        >
          <img src="/logo-loud-legacy.svg" alt="Loud CRM" className="h-6 w-auto" />
        </button>
        <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
          <a href="#how-it-works" className="hover:text-text-primary transition-colors">How It Works</a>
          <a href="#ai" className="hover:text-text-primary transition-colors">AI</a>
          <Link to="/pricing" className="hover:text-text-primary transition-colors">Pricing</Link>
          <Link to="/legal/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
          <Link to="/legal/terms" className="hover:text-text-primary transition-colors">Terms</Link>
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
// Industry-agnostic hero. Was previously fed an industry object that
// swapped the headline ("Sports Business" / "Media Sales" / etc.) and
// the eyebrow tag dynamically. Launch positioning is one pitch for
// every visitor.
function Hero() {
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
            CRM · Prospecting · Tools
          </span>
        </motion.div>

        <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
          Grow Your Business{' '}
          <span className="text-accent inline-block">Loud.</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-lg md:text-xl text-text-secondary mt-6 max-w-2xl mx-auto leading-relaxed"
        >
          Loud CRM gives you the CRM, Prospecting, and Tools to find your next customer, close the deal, and grow your business — all in one workspace.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            to="/login?mode=signup"
            className="bg-accent text-bg-primary px-8 py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
          <Link
            to="/pricing"
            className="border border-border text-text-secondary px-8 py-3.5 rounded-lg text-sm font-medium hover:border-text-muted hover:text-text-primary transition-colors"
          >
            See Pricing
          </Link>
        </motion.div>

        {/* Stats bar */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-6 mt-16 max-w-lg mx-auto">
          <div>
            <div className="text-2xl font-mono font-bold text-accent">CRM</div>
            <div className="text-xs text-text-muted mt-0.5">Pipeline &amp; Contacts</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-accent">AI</div>
            <div className="text-xs text-text-muted mt-0.5">Prospecting</div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-accent">$0</div>
            <div className="text-xs text-text-muted mt-0.5">To Start</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Set up your workspace', desc: 'Create your account, invite your team with role-based access, and configure your pipeline stages. Admins set revenue goals and monitor team performance in minutes.' },
    { num: '02', title: 'CRM — Build your pipeline', desc: 'Add deals, contacts, and accounts to your drag-and-drop pipeline. Track every stage from first touch to closed-won. Upload contracts and let AI extract the details automatically.' },
    { num: '03', title: 'Prospecting — Find your next customer', desc: 'AI discovers prospects with verified decision-maker contacts and LinkedIn profiles. Signal Radar surfaces job changes, funding rounds, and buying triggers. Bulk Add lets you enrich entire lists at once.' },
    { num: '04', title: 'Tools — Close faster', desc: 'Multi-step outreach sequences with AI coaching, Priority Queue to focus on the hottest leads, Outreach Analytics to see what\'s working, and Sales Velocity to forecast your pipeline.' },
    { num: '05', title: 'Grow loud', desc: 'AI morning brief surfaces your day\'s work before you open the app. Deal Insights and Sales Analytics show you exactly where to push. Renewals and account management keep revenue compounding.' },
  ]

  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          tag="Getting Started"
          title="Up and running in minutes"
          description="Loud CRM is designed to be adopted incrementally. Start with CRM, Prospecting, and Tools — unlock more as you grow."
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
          title="Intelligence built into every pillar"
          description="AI powers your CRM, Prospecting, and Tools — reading your deals, finding your next customers, and surfacing the actions that move revenue forward."
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
              title: 'CRM — AI Deal Intelligence',
              desc: 'Upload a PDF or Word contract and AI instantly extracts deal info, contacts, and revenue by year. Background research agent reads your deals every two hours and surfaces talking points, red flags, and comparable wins.',
              tag: 'CRM',
            },
            {
              title: 'Prospecting — Find Decision-Makers',
              desc: 'Search for prospects and AI discovers decision-makers with names, titles, emails, and LinkedIn profiles. Company firmographics — revenue, headcount, industry — enriched from verified databases.',
              tag: 'Prospecting',
            },
            {
              title: 'Tools — Signal Radar',
              desc: 'AI monitors job changes, funding rounds, and buying triggers across your prospect universe. Signal Radar surfaces the right moment to reach out — before your competitors do.',
              tag: 'Tools',
            },
            {
              title: 'Tools — Outreach Sequences',
              desc: 'Build multi-step outreach cadences with AI coaching. A/B test subject lines, track open and reply rates, and let the AI suggest the next best action for every prospect in your pipeline.',
              tag: 'Tools',
            },
            {
              title: 'CRM — AI Morning Brief',
              desc: 'Every morning, AI surfaces 5 prospects to reach out to, 5 emails to send, and the deals that need a push — grounded in your closed-won patterns and recent activity. You approve, click, ship.',
              tag: 'CRM',
            },
            {
              title: 'Prospecting — Verified Data',
              desc: 'Integrated with industry-leading contact databases for verified executive emails, direct phone numbers, and real LinkedIn profiles. Email verification confirms deliverability before you send.',
              tag: 'Prospecting',
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
// Three-pillar positioning: CRM, Prospecting, Tools.
function WhyLoudCRM() {
  const points = [
    { title: 'One tool, not three', desc: 'Replaces HubSpot Sales Pro + Apollo + Outreach. Most teams pay $300+/seat for these stitched together. Pro is $99 — and AI sees both halves of your funnel.' },
    { title: 'AI grounded in your data', desc: 'Every recommendation cites a specific data point — a closed-won pattern, a recent call, a signal that just fired. Generic ICP suggestions get filtered out before you see them.' },
    { title: 'Background research agent', desc: 'A background agent reads your deals every two hours and produces talking points, red flags, and comparable wins for the next conversation. You walk in prepared without doing the homework.' },
    { title: 'AI call + meeting capture', desc: 'Record a sales call in the browser or drop a Zoom export. AI transcribes, summarizes, and turns commitments into tasks automatically. Enterprise tier.' },
    { title: 'Pipeline you can trust', desc: 'Drag-and-drop CRM, weighted forecasts, stale-deal alerts, full activity timeline. The fundamentals are solid before you add the AI on top.' },
    { title: 'Free forever to start', desc: 'A real free tier — not a 14-day trial. Try the CRM, AI Brief, and prospecting with no credit card. Upgrade when you outgrow the caps.' },
  ]

  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag="Why Loud CRM"
          title="CRM, Prospecting, and Tools — built to grow your business loud."
          description="Most revenue teams stitch together three separate tools and pay $300+/seat. Loud CRM gives you everything in one workspace — and the AI does the heavy lifting so you can focus on closing."
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
// Industry-agnostic — same pitch every visitor sees, regardless of
// which industry chip they previously selected. Industry param kept
// in the signup link so the post-signup workspace still gets the
// right defaults.
function CTA() {
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
          Ready to grow your business loud?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-text-secondary mt-4 leading-relaxed">
          Loud CRM is built for teams who are ready to move beyond spreadsheets and disconnected tools.
          Start free — no credit card required.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link
            to="/login?mode=signup"
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
            <EditableText contentKey="sponsors_headline" fallback="Loud CRM is proudly supported by" tag="span" />
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
            <img src="/logo-loud-legacy.svg" alt="Loud CRM" className="h-6 w-auto" />
            <p className="text-text-secondary text-sm mt-3 max-w-md leading-relaxed">
              Loud CRM: Grow Your Business Loudly. CRM, Prospecting, and Tools in one workspace for revenue teams ready to grow.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Platform</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              <a href="#how-it-works" className="block hover:text-text-primary transition-colors">How It Works</a>
              <a href="#ai" className="block hover:text-text-primary transition-colors">AI Integration</a>
              <Link to="/pricing" className="block hover:text-text-primary transition-colors">Pricing</Link>
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
          <span className="text-xs text-text-muted">&copy; {new Date().getFullYear()} Loud CRM. All rights reserved.</span>
          <div className="flex gap-4 text-xs text-text-muted">
            <Link to="/legal/terms" className="hover:text-text-primary transition-colors">Terms of Service</Link>
            <Link to="/legal/privacy" className="hover:text-text-primary transition-colors">Privacy Policy</Link>
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
