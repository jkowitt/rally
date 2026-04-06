import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Nav />
      <Hero />
      <Ecosystem />
      <Modules />
      <HowItWorks />
      <AISection />
      <WhyLoudLegacy />
      <CTA />
      <Footer />
    </div>
  )
}

/* ─── NAV ─── */
function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="font-mono font-bold text-accent text-base " style={{letterSpacing:'0.08em',wordSpacing:'-0.15em'}}>LOUD LEGACY</span>
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
function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 relative overflow-hidden">
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
            Sports Business Operating Suite
          </span>
        </motion.div>

        <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
          The operating system for{' '}
          <span className="text-accent">sports partnerships</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="text-lg md:text-xl text-text-secondary mt-6 max-w-2xl mx-auto leading-relaxed">
          AI-powered sponsorship CRM, verified contact intelligence, contract analysis, event operations, and media valuations — built for college athletics, professional teams, and sports agencies.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            to="/login"
            className="bg-accent text-bg-primary px-8 py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
          <a
            href="#ecosystem"
            className="border border-border text-text-secondary px-8 py-3.5 rounded-lg text-sm font-medium hover:border-text-muted hover:text-text-primary transition-colors"
          >
            Explore the Platform
          </a>
        </motion.div>

        {/* Stats bar */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-6 mt-16 max-w-lg mx-auto">
          {[
            { value: '4', label: 'Integrated Modules' },
            { value: '22', label: 'Asset Categories' },
            { value: 'AI', label: 'Powered Intelligence' },
          ].map((stat) => (
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

/* ─── ECOSYSTEM OVERVIEW ─── */
function Ecosystem() {
  return (
    <section id="ecosystem" className="py-24 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag="The Ecosystem"
          title="Four modules. One platform. Zero silos."
          description="Every piece of your sports business operation—from sponsor prospecting to event execution to media valuation—lives in one connected system. Data flows between modules automatically so your team works from a single source of truth."
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
              <div className="font-mono font-bold text-accent text-lg " style={{letterSpacing:'0.08em',wordSpacing:'-0.15em'}}>LOUD LEGACY</div>
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
              { name: 'Sportify', icon: '◈', color: 'text-success', desc: 'Events & operations', detail: 'Game day command center with run-of-show, sponsor activations, vendor coordination, attendance tracking, and broadcast analytics.' },
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
function Modules() {
  const modules = [
    {
      id: 'crm',
      name: 'Legacy CRM',
      tagline: 'From prospect to renewal in one view',
      features: [
        { title: 'Smart Prospecting', desc: 'AI-powered prospect search discovers new sponsors by industry, brand, or keyword. Decision-maker contacts with LinkedIn profiles researched automatically.' },
        { title: 'Deal Pipeline', desc: 'Drag-and-drop Kanban board tracks deals from Prospect to Renewed. Multi-year revenue tracking, win rate analytics, and stage-by-stage forecasting.' },
        { title: 'Contract Intelligence', desc: 'Upload PDF or Word contracts and AI instantly extracts benefits, revenue, and contact info. Create contracts from templates with guided field entry.' },
        { title: 'Asset Catalog', desc: '22 sponsorship asset categories with real-time inventory. See what\'s sold, being pitched, and available at a glance. Every asset linked to deals and fulfillment.' },
        { title: 'Fulfillment Tracker', desc: 'Contracted benefits auto-populate for tracking. Mark delivered, add proof, generate recap reports. Know exactly where you stand with every sponsor.' },
        { title: 'Contact Intelligence', desc: 'Verified executive contacts with email validation, LinkedIn profiles, and enriched company data. Integrated with leading data providers for 95%+ accuracy.' },
      ],
    },
    {
      id: 'sportify',
      name: 'Sportify',
      tagline: 'Event operations, elevated',
      features: [
        { title: 'Event Command Center', desc: 'Grid and calendar views for every game day, tournament, banquet, and clinic. Days-until countdowns, sponsor logos, and progress tracking at a glance.' },
        { title: 'Run of Show', desc: 'Minute-by-minute event schedule with time, duration, owner, and completion tracking. Your entire event timeline in one place.' },
        { title: 'Sponsor Activations', desc: 'Track every sponsor setup with status, location, and proof of delivery. Link activations to deals and bulk-mark complete after events.' },
        { title: 'Attendance & Broadcast', desc: 'Expected vs actual attendance with capacity utilization. Broadcast channel, viewership tracking, and direct links to media valuations.' },
      ],
    },
    {
      id: 'valora',
      name: 'VALORA',
      tagline: 'Know what your inventory is worth',
      features: [
        { title: 'AI Media Valuation', desc: 'Calculate estimated media value from broadcast data, audience metrics, and market benchmarks. Every valuation includes AI reasoning and confidence levels.' },
        { title: 'Market Position Analysis', desc: 'Every asset automatically classified as below, fair, or above market value. See where you\'re leaving money on the table.' },
        { title: 'Pricing Intelligence', desc: 'Historical pricing data per asset category with trend analysis. AI-generated recommendations tell you when to raise prices and by how much.' },
        { title: 'Deal-Linked Valuations', desc: 'Valuations tied to specific sponsors show company size, revenue, and industry context — helping you price assets relative to what each brand can invest.' },
      ],
    },
    {
      id: 'businessnow',
      name: 'Business Now',
      tagline: 'Your real-time business command center',
      features: [
        { title: 'Live Pipeline Alerts', desc: 'Real-time monitoring flags stale deals, hot opportunities, expiring contracts, and overdue tasks. Actionable alerts, not noise.' },
        { title: 'AI Daily Briefings', desc: 'Morning intelligence report analyzes your entire pipeline and delivers prioritized recommendations. Know exactly what to focus on today.' },
        { title: 'Sports Business Newsletter', desc: 'Auto-generated weekly digest and daily afternoon highlights covering deals, trends, and market intelligence from the sports business world.' },
        { title: 'Team Performance', desc: 'Revenue goals, activity tracking, and deal analytics per team member. Admins see the full picture. Reps see their targets and progress.' },
      ],
    },
  ]

  return (
    <section id="modules" className="py-24 px-6 bg-bg-surface border-t border-border">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag="Deep Dive"
          title="Everything your partnership team needs"
          description="Each module is purpose-built for sports business operations. Here's what's inside."
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
          Ready to modernize your sports business?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-text-secondary mt-4 leading-relaxed">
          Loud Legacy is built for college athletic departments, professional sports teams, and minor league sports teams
          who are ready to move beyond spreadsheets and disconnected tools.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link
            to="/login"
            className="bg-accent text-bg-primary px-8 py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Create Your Account
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

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <span className="font-mono font-bold text-accent text-sm " style={{letterSpacing:'0.08em',wordSpacing:'-0.15em'}}>LOUD LEGACY</span>
            <p className="text-text-secondary text-sm mt-3 max-w-md leading-relaxed">
              The sports business operating suite for college athletic departments, professional sports teams, and minor league sports partnership sales teams.
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
