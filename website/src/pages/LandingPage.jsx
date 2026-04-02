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
        <span className="font-mono font-bold text-accent text-base tracking-widest">LOUD LEGACY</span>
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
          Loud Legacy unifies CRM, event management, AI-powered valuations, and business intelligence into one platform built for college athletic departments and minor league sports teams.
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
            { value: 'AI', label: 'Claude-Powered' },
            { value: '1', label: 'Unified Platform' },
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
              <div className="font-mono font-bold text-accent text-lg tracking-wider">LOUD LEGACY</div>
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
              { name: 'Legacy CRM', icon: '▣', color: 'text-accent', desc: 'Pipeline & partnerships', detail: 'Manage sponsors from prospect to renewal with drag-and-drop Kanban, contracts, and fulfillment tracking.' },
              { name: 'Sportify', icon: '◈', color: 'text-success', desc: 'Events & operations', detail: 'Plan and execute game days, tournaments, and activations with task management and vendor coordination.' },
              { name: 'VALORA', icon: '◇', color: 'text-warning', desc: 'AI valuations', detail: 'Claude-powered media valuation engine that calculates EMV from broadcast data and market benchmarks.' },
              { name: 'Business Now', icon: '◆', color: 'text-text-primary', desc: 'Intelligence & metrics', detail: 'AI-generated daily briefings, recommendations, and business metric tracking for executive insights.' },
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
        { title: 'Asset Catalog', desc: 'Inventory every sponsorship asset—LED boards, jersey patches, radio reads, naming rights—with pricing and availability.' },
        { title: 'Deal Pipeline', desc: 'Drag-and-drop Kanban board tracks deals from Prospect through Contracted to Renewed. Never lose a deal in email again.' },
        { title: 'Contract Manager', desc: 'Generate contracts tied to deals, track benefits and deliverables, export professional PDFs with one click.' },
        { title: 'Fulfillment Tracker', desc: 'Every promised deliverable tracked to completion. Know exactly what you owe each sponsor and when.' },
        { title: 'Brand Reports', desc: 'Print-ready partnership recaps showing asset delivery, contract status, and fulfillment progress.' },
      ],
    },
    {
      id: 'sportify',
      name: 'Sportify',
      tagline: 'Game day operations, organized',
      features: [
        { title: 'Event Manager', desc: 'Create and manage game days, tournaments, banquets, clinics, and fundraisers with status tracking.' },
        { title: 'Task Management', desc: 'Assign and track event tasks with due dates and completion status. Nothing falls through the cracks.' },
        { title: 'Vendor Coordination', desc: 'Track vendor confirmations, categories, and contacts for every event in one place.' },
        { title: 'Sponsor Activations', desc: 'Link sponsor activations to events and deals. Track setup, location, and completion for every activation.' },
      ],
    },
    {
      id: 'valora',
      name: 'VALORA',
      tagline: 'AI-powered media valuation',
      features: [
        { title: 'Valuation Engine', desc: 'Input broadcast minutes, screen share, audience size, and clarity—Claude AI calculates estimated media value with reasoning.' },
        { title: 'Market Benchmarks', desc: 'AI-maintained benchmark data keeps your valuations grounded in current market rates, updated automatically.' },
        { title: 'Training Data', desc: 'Historical valuation data feeds the AI, making each valuation more accurate than the last.' },
        { title: 'Visual Analytics', desc: 'Charts comparing calculated EMV vs. Claude-suggested EMV across assets and time periods.' },
      ],
    },
    {
      id: 'businessnow',
      name: 'Business Now',
      tagline: 'Your daily AI briefing',
      features: [
        { title: 'Intelligence Briefings', desc: 'Claude analyzes your deals, events, fulfillment, and metrics to produce an executive summary with prioritized recommendations.' },
        { title: 'Smart Alerts', desc: 'Renewal deadlines, overdue fulfillment, and opportunity flags surfaced automatically.' },
        { title: 'Metric Tracking', desc: 'Track custom business KPIs over time with trend visualization.' },
        { title: 'Briefing Archive', desc: 'Full history of AI briefings and data snapshots for longitudinal analysis.' },
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
    { num: '01', title: 'Set up your property', desc: 'Add your team, sport, and conference. Invite your partnership sales staff with role-based access.' },
    { num: '02', title: 'Build your asset catalog', desc: 'Inventory every sponsorship asset—from LED boards to social posts—with pricing and availability.' },
    { num: '03', title: 'Work your pipeline', desc: 'Add prospects, move deals through stages, generate contracts, and track fulfillment deliverables.' },
    { num: '04', title: 'Plan events & activations', desc: 'Manage game days, assign tasks, coordinate vendors, and link sponsor activations.' },
    { num: '05', title: 'Let AI do the heavy lifting', desc: 'VALORA calculates media values. Business Now generates daily intelligence briefings. Claude AI keeps you ahead.' },
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
          tag="Powered by Claude AI"
          title="Intelligence that actually understands sports business"
          description="Loud Legacy integrates Anthropic's Claude AI throughout the platform—not as a gimmick, but as a core part of how the system works."
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
              title: 'Valuation Engine',
              desc: 'Claude analyzes broadcast data, screen share percentages, audience metrics, and historical benchmarks to calculate estimated media values for every sponsorship asset. Each valuation includes reasoning so you understand the "why" behind the number.',
              tag: 'VALORA',
            },
            {
              title: 'Daily Intelligence',
              desc: 'Every morning, Claude reviews your active deals, upcoming events, pending fulfillment, and business metrics to produce an executive briefing with prioritized recommendations and alerts.',
              tag: 'Business Now',
            },
            {
              title: 'Benchmark Updater',
              desc: 'Claude periodically reviews valuation history and training data to refresh market benchmarks automatically—keeping your valuations grounded in current market reality.',
              tag: 'Background',
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
            <span className="text-text-primary font-medium">Privacy first.</span>{' '}
            Your data is processed through Supabase Edge Functions with row-level security.
            AI interactions are scoped to your property and are never used for model training.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── WHY LOUD LEGACY ─── */
function WhyLoudLegacy() {
  const points = [
    { title: 'Built for sports', desc: 'Not a generic CRM with a sports skin. Every table, field, and workflow is designed for partnership sales teams.' },
    { title: 'Property-scoped security', desc: 'Row-level security on every table. Each team sees only their data. Developer accounts manage the platform.' },
    { title: 'Modular by design', desc: 'Feature flags control which modules are active. Start with CRM, unlock Sportify, VALORA, and Business Now as you grow.' },
    { title: 'AI that adds value', desc: 'Claude AI handles valuations and intelligence—tasks that would take hours of manual research and analysis.' },
    { title: 'Legal compliance', desc: 'Versioned terms of service and privacy policy with audit-logged acceptances. Built-in compliance from day one.' },
    { title: 'Modern stack', desc: 'React, Vite, Supabase, Tailwind. Fast, reliable, and built to scale with your organization.' },
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
          Loud Legacy is built for college athletic departments and minor league sports teams
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
            <span className="font-mono font-bold text-accent text-sm tracking-widest">LOUD LEGACY</span>
            <p className="text-text-secondary text-sm mt-3 max-w-md leading-relaxed">
              The sports business operating suite for college athletic departments and minor league sports partnership sales teams.
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
