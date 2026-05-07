import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'

// In-app user manual for the launch CRM + Prospecting feature set.
// Reachable from the AUTO/MANUAL badge in the top bar (any plan)
// and from the user menu. Static content — keep it in sync with
// the actual feature surface as it ships.
export default function ManualPage() {
  useSeo({
    title: 'User Manual — Loud Legacy',
    description: 'How to use the Loud Legacy CRM and AI prospecting tool.',
  })

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-12 space-y-10">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">User Manual</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mt-2">
          How to work the platform
        </h1>
        <p className="text-text-secondary mt-3 leading-relaxed">
          Two tools, one workspace: a CRM for the deals you've already opened, and AI prospecting for the ones you haven't yet. This page walks through the day-to-day flow.
        </p>
      </header>

      <Section title="1. Find your first prospects" anchor="prospecting">
        <Step n="1" body={
          <>Open <Code>Deal Pipeline</Code> in the sidebar and click <Code>Find Prospects</Code> in the top right.</>
        } />
        <Step n="2" body={
          <>Type a sentence describing who you want to reach — industry, company size, region, anything specific. Example: <em>"mid-market SaaS companies in the US with 50–250 employees that have raised in the last 18 months"</em>.</>
        } />
        <Step n="3" body={
          <>The AI returns 10–20 named matches with an ICP score and the verified decision-maker(s) at each. Each lookup costs one credit from your monthly pool (see top-bar pill).</>
        } />
        <Step n="4" body={
          <>Click <Code>Add to pipeline</Code> on any result to create a Prospect-stage deal with the contact attached.</>
        } />
        <Tip>
          Bulk-paste a list of company names with <Code>Bulk Import</Code> (Pro+) — the AI enrichment queue runs them in the background and queues each for review.
        </Tip>
      </Section>

      <Section title="2. Run your pipeline" anchor="pipeline">
        <Step n="1" body={
          <>The board has four stages: <Code>Prospect</Code> → <Code>Proposal Sent</Code> → <Code>Negotiation</Code> → <Code>Contracted</Code>. Drag cards between columns as deals progress.</>
        } />
        <Step n="2" body={
          <>Click any card to open the deal drawer. Edit value, add notes, attach contacts, log activities.</>
        } />
        <Step n="3" body={
          <>Use the <Code>Table</Code> view (toggle top-left of the board) for bulk edits — change stage, owner, or tag dozens of deals at once.</>
        } />
        <Step n="4" body={
          <>The <Code>Declined</Code> stage is hidden from the active board but kept in the database. Move a deal to Declined if it's lost; restore from the Declined view if the prospect comes back.</>
        } />
        <Tip>
          The header KPIs (Weighted Pipeline, Win Rate, Avg Deal Age, Stale Deals) update live as you move cards. Hover any number for a definition.
        </Tip>
      </Section>

      <Section title="3. Personalize outreach" anchor="outreach">
        <Step n="1" body={
          <>From any deal drawer, click <Code>Compose</Code> to draft an email. The composer pulls the contact's name, company, and any tone hints from their personality profile.</>
        } />
        <Step n="2" body={
          <>Click <Code>✨ Draft with AI</Code> to generate a first draft based on the deal's context. Edit before sending.</>
        } />
        <Step n="3" body={
          <>Click <Code>Coach</Code> to score and rewrite the draft against a chosen goal (more concise, push for meeting, more human, etc.).</>
        } />
        <Step n="4" body={
          <>Click <Code>Chat</Code> to open the outreach copilot — talk through follow-up tactics, objection handling, or sequence ideas with the AI.</>
        } />
        <Tip>
          Email integration (sending from the CRM, inbox sync, open + click tracking) is Enterprise-only. Lower tiers can still draft and copy, then send from your own client.
        </Tip>
      </Section>

      <Section title="4. Track contacts" anchor="contacts">
        <Step n="1" body={
          <>Every contact you add — manually, via prospect search, or via CSV import — lives in <Code>Contacts</Code>.</>
        } />
        <Step n="2" body={
          <>Click any contact to see the full activity timeline: emails, calls, meetings, notes, tasks. The timeline auto-orders by recency.</>
        } />
        <Step n="3" body={
          <>Use <Code>ICP filters</Code> on the contact list to scope by industry, company size, region, or saved persona criteria.</>
        } />
      </Section>

      <Section title="5. Plan + credits" anchor="plan">
        <p className="text-sm text-text-secondary leading-relaxed">
          The pill in the top bar (<Code>X / Y</Code> with a person icon) shows your prospect-lookup usage this month vs. your plan's cap. Caps are per-user on Free, pooled at the workspace on Starter / Pro / Enterprise.
        </p>
        <ul className="space-y-1 text-sm text-text-secondary mt-3 ml-4 list-disc">
          <li><strong>Free</strong> — 10 lookups / mo</li>
          <li><strong>Starter</strong> — 100 lookups / mo</li>
          <li><strong>Pro</strong> — 500 lookups / mo</li>
          <li><strong>Enterprise</strong> — 2,500 lookups / mo + email integration</li>
        </ul>
        <p className="text-sm text-text-secondary mt-3 leading-relaxed">
          Need more? Buy +100 lookups for $15 from <Link to="/app/settings/billing" className="text-accent hover:underline">Settings → Billing</Link>.
        </p>
      </Section>

      <Section title="6. Keyboard shortcuts" anchor="shortcuts">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <Shortcut keys="⌘K / Ctrl+K" desc="Open global search" />
          <Shortcut keys="N" desc="New deal" />
          <Shortcut keys="P" desc="Find prospects" />
          <Shortcut keys="?" desc="Show all shortcuts" />
        </div>
      </Section>

      <footer className="border-t border-border pt-6">
        <p className="text-xs text-text-muted">
          Stuck on something this manual doesn't cover? Email{' '}
          <a href="mailto:jason@loud-legacy.com" className="text-accent hover:underline">
            jason@loud-legacy.com
          </a>.
        </p>
      </footer>
    </div>
  )
}

function Section({ title, anchor, children }) {
  return (
    <section id={anchor}>
      <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-text-secondary leading-relaxed">{children}</div>
    </section>
  )
}

function Step({ n, body }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-mono font-semibold flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 pt-0.5">{body}</div>
    </div>
  )
}

function Tip({ children }) {
  return (
    <div className="bg-bg-card border border-border rounded p-3 text-xs text-text-secondary">
      <span className="font-semibold text-accent">Tip — </span>
      {children}
    </div>
  )
}

function Code({ children }) {
  return (
    <span className="bg-bg-card border border-border rounded px-1.5 py-0.5 font-mono text-[12px] text-text-primary">
      {children}
    </span>
  )
}

function Shortcut({ keys, desc }) {
  return (
    <div className="flex items-center justify-between bg-bg-card border border-border rounded px-3 py-2">
      <span className="text-text-secondary">{desc}</span>
      <kbd className="text-[10px] font-mono bg-bg-surface border border-border rounded px-2 py-0.5 text-text-primary">
        {keys}
      </kbd>
    </div>
  )
}
