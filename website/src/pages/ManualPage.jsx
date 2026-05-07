import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'

// In-app user manual. The single source of truth for "how do I use
// feature X?" — reachable from the user menu and from the AUTO/MANUAL
// badge in the top bar. Keep sections in the same order they appear
// in the sidebar so a user reading the manual can follow along by
// scanning down the nav.
export default function ManualPage() {
  useSeo({
    title: 'User Manual — Loud Legacy',
    description: 'How to use every feature in the Loud Legacy CRM, prospecting, contracts, fulfillment, and operations modules.',
  })

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-12 space-y-10">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">User Manual</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mt-2">
          How to work the platform
        </h1>
        <p className="text-text-secondary mt-3 leading-relaxed">
          Every feature, in the order it shows up in the sidebar. Use the table of contents to jump to a section, or scroll top-to-bottom for a guided tour.
        </p>
      </header>

      <Toc />

      <Section title="Navigating the app" anchor="navigation">
        <p>The left sidebar groups every feature by job-to-be-done; the top bar holds search, notifications, and account actions.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li><strong className="text-text-primary">Sidebar sections</strong> — Overview, Pipeline, Prospecting, Performance, Activity, Admin, plus any industry modules and add-ons your workspace has enabled.</li>
          <li><strong className="text-text-primary">Top bar</strong> — workspace name, global search (<Code>⌘K</Code> or <Code>Ctrl+K</Code>), API-usage pill, automation status, the bug-report button, the notifications bell, and your user menu.</li>
          <li><strong className="text-text-primary">Mobile</strong> — the sidebar collapses behind the menu icon and the most-used pages get a sticky bottom nav (Home / Pipeline / Assets / Tasks / Accounts / Contracts / Fulfill / Ops / Team / Settings).</li>
        </ul>
        <Tip>The user menu has a <Code>Help</Code> entry that opens this manual at any time, plus a link back to <Link to="/app" className="text-accent hover:underline">your Dashboard</Link>.</Tip>
      </Section>

      <Section title="Dashboard" anchor="dashboard">
        <p>The landing page after sign-in. Shows the workspace's pipeline, win-rate, weighted forecast, expiring deals, stale deals, today's tasks, and recent activity.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Click any KPI card to drill into the underlying list (e.g. clicking <Code>Stale Deals</Code> filters the pipeline to deals with no activity in 14+ days).</li>
          <li>Use the gear in the top-right to <em>hide</em> or <em>reorder</em> dashboard cards. Settings persist per browser.</li>
          <li>The overdue-tasks and due-today banners deep-link straight into <Link to="/app/crm/tasks" className="text-accent hover:underline">Task Manager</Link>.</li>
        </ul>
      </Section>

      <Section title="To-Do List" anchor="todo">
        <p><Link to="/app/todo" className="text-accent hover:underline">/app/todo</Link> — your daily plan. Combines two things into one prioritized list:</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Approved <strong className="text-text-primary">sequence drafts</strong> scheduled to fire today (or overdue).</li>
          <li>Open <strong className="text-text-primary">tasks</strong> assigned to you that aren't <Code>Done</Code> yet.</li>
        </ul>
        <p>Items are bucketed Overdue / Today / Tomorrow / Upcoming / No&nbsp;date. Click <Code>Done</Code> on a task to complete it; click <Code>Done</Code> on a draft to mark it sent.</p>
      </Section>

      <Section title="Deal Pipeline" anchor="pipeline">
        <p><Link to="/app/crm/pipeline" className="text-accent hover:underline">/app/crm/pipeline</Link> — kanban or table view of every deal in the workspace.</p>
        <Step n="1" body={<>Stages: <Code>Prospect</Code> → <Code>Proposal Sent</Code> → <Code>Negotiation</Code> → <Code>Contracted</Code> → <Code>In Fulfillment</Code> → <Code>Renewed</Code>. Drag cards between columns to advance the deal; the move is auto-logged in the activity timeline.</>} />
        <Step n="2" body={<>Click any card to open the deal drawer with tabs for Overview, Contracts, Fulfillment, and Activity. Inline-edit name, value, contact, stage, priority, source, and start date.</>} />
        <Step n="3" body={<>Toggle to <Code>Table</Code> view (top-left of the board) for bulk edits — double-click a cell to inline-edit.</>} />
        <Step n="4" body={<>Click <Code>Find Prospects</Code> in the top right to open AI prospect search inline (covered below).</>} />
        <Step n="5" body={<>Use <Code>Share</Code> on any deal to generate a tokenized sponsor portal link — the prospect can review the deal without logging in.</>} />
        <Tip>Stale deals (no activity in 14+ days) are tagged <Code>STALE</Code> automatically. The Dashboard surfaces these so they don't rot.</Tip>
      </Section>

      <Section title="Asset Catalog" anchor="assets">
        <p><Link to="/app/crm/assets" className="text-accent hover:underline">/app/crm/assets</Link> — every sponsorable asset your property sells (logos on jersey, on-site signage, naming rights, social mentions, etc.).</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Add an asset with category, base price, quantity, and any default benefits.</li>
          <li>Assets attached to a deal show in the deal's Overview tab and are auto-linked to contracts when one is uploaded.</li>
          <li>Use the catalog as the source of truth when building proposals — the deal form pulls from it.</li>
        </ul>
      </Section>

      <Section title="Declined deals" anchor="declined">
        <p><Link to="/app/crm/declined" className="text-accent hover:underline">/app/crm/declined</Link> — deals you marked lost. Hidden from the active board but kept for retros and recovery. Click a deal to restore it to <Code>Prospect</Code> if the buyer comes back.</p>
      </Section>

      <Section title="Find prospects (AI)" anchor="find-prospects">
        <p>Open from <Code>Deal Pipeline → Find Prospects</Code>, the sidebar <em>Find Prospects</em> link, or the keyboard shortcut <Code>P</Code>.</p>
        <Step n="1" body={<>Type a sentence describing who you want to reach — industry, size, region, anything specific. Example: <em>"mid-market SaaS in the US, 50–250 employees, raised in the last 18 months"</em>.</>} />
        <Step n="2" body={<>The AI returns 10–20 named matches with an ICP score and the verified decision-maker(s) at each. Each lookup costs one credit from your monthly pool (see top-bar pill).</>} />
        <Step n="3" body={<>Click <Code>Add to pipeline</Code> on any result to create a Prospect-stage deal with the contact attached.</>} />
        <Tip>Filters down the right side scope by industry, size, region, persona, and any saved ICP — apply them before searching to bias results.</Tip>
      </Section>

      <Section title="Bulk enrichment" anchor="bulk-enrich">
        <p><Link to="/app/crm/enrichment-queue" className="text-accent hover:underline">/app/crm/enrichment-queue</Link> — paste or upload a CSV of company names; the AI runs them through enrichment in the background and queues each for one-click review.</p>
      </Section>

      <Section title="Signal Radar" anchor="signals">
        <p><Link to="/app/crm/signals" className="text-accent hover:underline">/app/crm/signals</Link> — a live feed of buying signals across your prospects: funding rounds, hiring, exec moves, news mentions. Click any signal to open the related deal or create a new one.</p>
      </Section>

      <Section title="Lookalikes" anchor="lookalikes">
        <p><Link to="/app/crm/lookalikes" className="text-accent hover:underline">/app/crm/lookalikes</Link> — pick a closed-won deal and the AI returns similar companies you haven't worked yet, ranked by ICP fit.</p>
      </Section>

      <Section title="Relationship Search" anchor="relationships">
        <p><Link to="/app/crm/relationships" className="text-accent hover:underline">/app/crm/relationships</Link> — search across every contact in every deal. Useful when you remember a name but not the company, or want to find every person you've talked to at a target account.</p>
      </Section>

      <Section title="Sequences" anchor="sequences">
        <p><Link to="/app/crm/sequences" className="text-accent hover:underline">/app/crm/sequences</Link> — multi-step outreach campaigns (email → wait 3 days → LinkedIn → wait 5 days → call, etc.).</p>
        <Step n="1" body={<>Click <Code>New sequence</Code> and either build steps manually or let the AI Sequence Builder draft them from a goal ("warm intro → discovery call").</>} />
        <Step n="2" body={<>Enroll deals or contacts into the sequence. Each step generates a draft you must approve before it sends.</>} />
        <Step n="3" body={<>Approved drafts land in your <Link to="/app/todo" className="text-accent hover:underline">To-Do List</Link> at the scheduled time. Click <Code>Done</Code> to mark sent.</>} />
        <Tip>The AI <Code>Coach</Code> button on every draft scores the message and rewrites it against a chosen goal (more concise, push for meeting, more human).</Tip>
      </Section>

      <Section title="Priority Queue" anchor="priority">
        <p><Link to="/app/crm/priority" className="text-accent hover:underline">/app/crm/priority</Link> — single-pane "what should I work on right now" view. Surfaces the deals most likely to close this month, weighted by score, last-contact age, and stage probability.</p>
      </Section>

      <Section title="Outreach Analytics" anchor="outreach-analytics">
        <p><Link to="/app/crm/outreach-analytics" className="text-accent hover:underline">/app/crm/outreach-analytics</Link> — open rates, reply rates, and response times across your sequences and one-off sends. Filter by rep, sequence, or template.</p>
      </Section>

      <Section title="Sales Velocity" anchor="velocity">
        <p><Link to="/app/crm/velocity" className="text-accent hover:underline">/app/crm/velocity</Link> — how fast deals move stage-to-stage and where they pile up. Each stage shows median dwell time and a leak-rate.</p>
      </Section>

      <Section title="Sales Analytics" anchor="analytics">
        <p><Link to="/app/crm/analytics" className="text-accent hover:underline">/app/crm/analytics</Link> — revenue by month / quarter / year, win-rate by rep, by source, by industry. Use the date-range picker for any window.</p>
      </Section>

      <Section title="AI Insights" anchor="insights">
        <p><Link to="/app/crm/insights" className="text-accent hover:underline">/app/crm/insights</Link> — AI-generated recommendations on any active deal: what to do next, what's blocking, which similar deals closed and why.</p>
      </Section>

      <Section title="Postmortems" anchor="postmortems">
        <p><Link to="/app/crm/postmortems" className="text-accent hover:underline">/app/crm/postmortems</Link> — structured retros for closed-won and closed-lost deals so the team learns. Add tags like "price", "timing", or "no champion" so you can spot patterns over time.</p>
      </Section>

      <Section title="Inbox" anchor="inbox">
        <p><Link to="/app/crm/inbox" className="text-accent hover:underline">/app/crm/inbox</Link> — connect Outlook or Gmail (Enterprise) to send and receive from the CRM. Replies auto-attach to the matching deal's activity timeline.</p>
        <Step n="1" body={<>Visit <Link to="/app/crm/inbox/connect" className="text-accent hover:underline">/app/crm/inbox/connect</Link> to authorize Outlook or Gmail. Tokens are encrypted at rest.</>} />
        <Step n="2" body={<>Set your signature at <Link to="/app/crm/inbox/signature" className="text-accent hover:underline">/app/crm/inbox/signature</Link>.</>} />
        <Step n="3" body={<>Click <Code>Compose</Code> on any contact to draft. <Code>✨ Draft with AI</Code> generates a first pass; <Code>Coach</Code> rewrites against a goal; <Code>Chat</Code> opens the outreach copilot.</>} />
        <Tip>Lower-tier plans without inbox sync can still draft and copy — paste into your own client when sending.</Tip>
      </Section>

      <Section title="Activity timeline" anchor="activities">
        <p><Link to="/app/crm/activities" className="text-accent hover:underline">/app/crm/activities</Link> — a unified feed of every interaction: emails, calls, meetings, notes, contract uploads, fulfillment events, sequence steps. Filter by deal, rep, type, or date.</p>
      </Section>

      <Section title="Task Manager" anchor="tasks">
        <p><Link to="/app/crm/tasks" className="text-accent hover:underline">/app/crm/tasks</Link> — every task across the workspace. Tasks created here for yourself appear in your <Link to="/app/todo" className="text-accent hover:underline">To-Do List</Link>; the two views stay in sync.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Quick-add bar at the top creates a task due today, Medium priority, in one Enter.</li>
          <li>Click <Code>+ Schedule Activity</Code> for the full form — type (Call, Email, Meeting, Follow-up, etc.), description, scheduled time, reminder, priority, linked deal.</li>
          <li>Filter buttons let you scope to one activity type. Overdue tasks get a red banner.</li>
          <li>Enable browser push notifications and the reminder fires at the scheduled time, even if the tab is in the background.</li>
          <li>Marking a task <Code>Done</Code> auto-creates a matching activity on the deal so the timeline stays accurate.</li>
        </ul>
        <Tip>From a deal's <em>Activity</em> tab, click <Code>+ Schedule task</Code> to open Task Manager with that deal pre-selected.</Tip>
      </Section>

      <Section title="Contracts" anchor="contracts">
        <p><Link to="/app/crm/contracts" className="text-accent hover:underline">/app/crm/contracts</Link> — drop a PDF, DOCX, or scan; AI extracts every benefit, deliverable, deadline, and value. The result lands attached to the matching deal.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Re-uploads create a new <Code>contract_version</Code> so prior terms are preserved for audit.</li>
          <li>Edit extracted benefits inline; corrections improve future extraction quality.</li>
          <li><Link to="/app/crm/migrate" className="text-accent hover:underline">/app/crm/migrate</Link> bulk-imports a folder of legacy contracts in one pass.</li>
        </ul>
      </Section>

      <Section title="Fulfillment Tracker" anchor="fulfillment">
        <p><Link to="/app/crm/fulfillment" className="text-accent hover:underline">/app/crm/fulfillment</Link> — every benefit on every active contract, with scheduled date, status, and proof-of-delivery slot. Click a row to mark delivered, attach a photo or link, and notify the sponsor.</p>
        <Tip>The deal drawer's <em>Fulfillment</em> tab shows progress as <Code>X / Y</Code> delivered so account managers can see at a glance.</Tip>
      </Section>

      <Section title="Brand Report" anchor="brand-report">
        <p>From any deal, click <Code>Generate Brand Report</Code> to produce a one-page PDF showing the sponsor's logo placements, social mentions, and audience reach. Sharable with the sponsor as a quarterly recap.</p>
      </Section>

      <Section title="Audit Log" anchor="audit">
        <p><Link to="/app/crm/audit" className="text-accent hover:underline">/app/crm/audit</Link> (admin-only) — every write across the workspace: who edited which deal, when, and what changed. Use for compliance and to debug "who moved my deal?" disputes.</p>
      </Section>

      <Section title="Account Management" anchor="accounts">
        <p>For account managers running renewals on the book of business they own.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li><Link to="/app/accounts" className="text-accent hover:underline">/app/accounts</Link> — every active account with health score, ARR, days-to-renewal, last touch.</li>
          <li><Link to="/app/accounts/renewals" className="text-accent hover:underline">/app/accounts/renewals</Link> — pipeline view of upcoming renewals by quarter.</li>
          <li><Link to="/app/accounts" className="text-accent hover:underline">/app/accounts/[id]</Link> — single-account drill-in with contracts, fulfillment, contacts, activity.</li>
        </ul>
      </Section>

      <Section title="Operations" anchor="ops">
        <p>Cross-cutting workspace tools.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li><strong className="text-text-primary"><Link to="/app/ops/team" className="text-accent hover:underline">Team</Link></strong> — invite reps, set roles (rep / admin / developer), revoke access.</li>
          <li><strong className="text-text-primary"><Link to="/app/ops/newsletter" className="text-accent hover:underline">Newsletter</Link></strong> — send updates to your sponsor list with open/click tracking.</li>
          <li><strong className="text-text-primary"><Link to="/app/ops/automations" className="text-accent hover:underline">Automations</Link></strong> — workflow rules (when X happens, do Y) — assign reps, set priority, create tasks, fire webhooks.</li>
          <li><strong className="text-text-primary"><Link to="/app/ops/projects" className="text-accent hover:underline">Projects</Link></strong> — multi-step initiatives with subtasks, owners, and due dates. Use for activations or campaigns that span weeks.</li>
        </ul>
      </Section>

      <Section title="Industry modules" anchor="industry">
        <p>Modules that appear in the sidebar only when your property type matches.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li><strong>Nonprofit</strong> — Impact Metrics, Grant Tracker, Donor Portal.</li>
          <li><strong>Media</strong> — Campaign Calendar, Audience Analytics, Media Kit Builder.</li>
          <li><strong>Real estate</strong> — Occupancy Dashboard, Broker Network.</li>
          <li><strong>Entertainment</strong> — Booking Calendar.</li>
          <li><strong>Conference</strong> — Attendee Analytics.</li>
          <li><strong>Agency</strong> — Commission Tracker, Multi-Property View.</li>
        </ul>
        <p>Set the property type in <Link to="/app/settings" className="text-accent hover:underline">Settings → Workspace</Link>.</p>
      </Section>

      <Section title="Add-ons" anchor="addons">
        <p><Link to="/app/settings/addons" className="text-accent hover:underline">/app/settings/addons</Link> — toggle optional modules (Activations, VALORA valuations, Business Now intelligence). Each appears in the sidebar once enabled.</p>
      </Section>

      <Section title="Settings" anchor="settings">
        <p><Link to="/app/settings" className="text-accent hover:underline">/app/settings</Link> covers workspace name, industry type, terminology, do-not-contact list, custom fields, data export, and integrations.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li><Link to="/app/settings/billing" className="text-accent hover:underline">Billing</Link> — current plan, payment method, top-up extra prospect lookups.</li>
          <li><Link to="/app/settings/addons" className="text-accent hover:underline">Add-ons</Link> — request access to modules outside your plan.</li>
        </ul>
      </Section>

      <Section title="Plan + credits" anchor="plan">
        <p>The pill in the top bar (<Code>X / Y</Code> with a person icon) shows your prospect-lookup usage this month vs. your plan's cap.</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li><strong>Free</strong> — 10 lookups / mo</li>
          <li><strong>Starter</strong> — 100 lookups / mo</li>
          <li><strong>Pro</strong> — 500 lookups / mo</li>
          <li><strong>Enterprise</strong> — 2,500 lookups / mo + email integration</li>
        </ul>
        <p>Need more? Buy +100 lookups for $15 from <Link to="/app/settings/billing" className="text-accent hover:underline">Settings → Billing</Link>.</p>
      </Section>

      <Section title="Custom dashboards" anchor="custom-dashboard">
        <p><Link to="/app/custom-dashboard" className="text-accent hover:underline">/app/custom-dashboard</Link> — request a bespoke dashboard tailored to your property's KPIs. The team builds it and it appears at <Code>/app/custom/&lt;slug&gt;</Code> for everyone in the workspace.</p>
      </Section>

      <Section title="Reporting an issue" anchor="bug">
        <p>Click the bug icon in the top bar (right of the automation badge) to file an issue without leaving the page. URL, viewport, browser, and module are captured automatically — describe what went wrong and submit.</p>
      </Section>

      <Section title="Keyboard shortcuts" anchor="shortcuts">
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
          </a>{' '}
          or click the bug icon in the top bar.
        </p>
      </footer>
    </div>
  )
}

function Toc() {
  const items = [
    ['navigation', 'Navigating the app'],
    ['dashboard', 'Dashboard'],
    ['todo', 'To-Do List'],
    ['pipeline', 'Deal Pipeline'],
    ['assets', 'Asset Catalog'],
    ['declined', 'Declined deals'],
    ['find-prospects', 'Find prospects (AI)'],
    ['bulk-enrich', 'Bulk enrichment'],
    ['signals', 'Signal Radar'],
    ['lookalikes', 'Lookalikes'],
    ['relationships', 'Relationship Search'],
    ['sequences', 'Sequences'],
    ['priority', 'Priority Queue'],
    ['outreach-analytics', 'Outreach Analytics'],
    ['velocity', 'Sales Velocity'],
    ['analytics', 'Sales Analytics'],
    ['insights', 'AI Insights'],
    ['postmortems', 'Postmortems'],
    ['inbox', 'Inbox'],
    ['activities', 'Activity timeline'],
    ['tasks', 'Task Manager'],
    ['contracts', 'Contracts'],
    ['fulfillment', 'Fulfillment Tracker'],
    ['brand-report', 'Brand Report'],
    ['audit', 'Audit Log'],
    ['accounts', 'Account Management'],
    ['ops', 'Operations'],
    ['industry', 'Industry modules'],
    ['addons', 'Add-ons'],
    ['settings', 'Settings'],
    ['plan', 'Plan + credits'],
    ['custom-dashboard', 'Custom dashboards'],
    ['bug', 'Reporting an issue'],
    ['shortcuts', 'Keyboard shortcuts'],
  ]
  return (
    <nav aria-label="Table of contents" className="bg-bg-card border border-border rounded-lg p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Contents</div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
        {items.map(([anchor, label]) => (
          <li key={anchor}>
            <a href={`#${anchor}`} className="text-accent hover:underline">{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Section({ title, anchor, children }) {
  return (
    <section id={anchor} className="scroll-mt-20">
      <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-3">
        <a href={`#${anchor}`} className="hover:text-accent">{title}</a>
      </h2>
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
