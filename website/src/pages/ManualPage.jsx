import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'

// In-app user manual. Single source of truth for "how do I use X?".
// Reachable from the user menu and from the AUTO/MANUAL badge in
// the top bar. The shape — Quick Start → Playbooks → grouped TOC →
// reference sections → FAQ — is deliberate: lets a brand-new rep
// finish a useful flow in 5 minutes without reading the whole page,
// while a returning user can ⌘F or click straight to the section
// they need.
export default function ManualPage() {
  useSeo({
    title: 'User Manual — Loud Legacy',
    description: 'Quick start, common playbooks, and feature reference for the Loud Legacy CRM and prospecting tool.',
  })

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-12 space-y-12">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">User Manual</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mt-2 leading-tight">
          How to work the platform
        </h1>
        <p className="text-text-secondary mt-3 leading-relaxed">
          Loud Legacy is built around one job: turn the people you should be talking to into signed sponsors. This page covers the five-minute quick start, two end-to-end playbooks, every feature in the sidebar, and the questions that come up most.
        </p>
      </header>

      <QuickStart />

      <Playbooks />

      <ContentsGrid />

      <Reference />

      <FAQ />

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

// ─── Quick Start ─────────────────────────────────────────────

function QuickStart() {
  return (
    <section id="quick-start" className="scroll-mt-20">
      <div className="bg-accent/5 border border-accent/30 rounded-xl p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <h2 className="text-lg sm:text-xl font-semibold text-text-primary">
            Quick start — 5 minutes
          </h2>
          <span className="text-[10px] font-mono uppercase tracking-widest text-accent">~5 min</span>
        </div>
        <p className="text-sm text-text-secondary mb-4 leading-relaxed">
          The shortest path from "just signed up" to "actively prospecting." Skip any step you've already done.
        </p>
        <ol className="space-y-3">
          <QuickStep
            n="1"
            title="Add a deal you're already working"
            body={<>Open <Link to="/app/crm/pipeline" className="text-accent hover:underline">Deal Pipeline</Link> → click <Code>+ New Deal</Code>. Sponsor name + value are enough.</>}
          />
          <QuickStep
            n="2"
            title="Run an AI prospect search"
            body={<>Top right of the pipeline, click <Code>Find Prospects</Code>. Type a sentence describing who you want to reach. Add the matches that fit.</>}
          />
          <QuickStep
            n="3"
            title="Bulk-add a list you already have"
            body={<>Open <Link to="/app/crm/enrichment-queue" className="text-accent hover:underline">Bulk Add</Link> → paste names or drop a CSV. Each row is enriched in the background.</>}
          />
          <QuickStep
            n="4"
            title="Schedule a follow-up"
            body={<>From any deal, open the <em>Activity</em> tab → <Code>+ Schedule task</Code>. Tasks land in your <Link to="/app/todo" className="text-accent hover:underline">To-Do List</Link> at the right time.</>}
          />
          <QuickStep
            n="5"
            title="Open AI Insights on a stuck deal"
            body={<>Pick any deal that's been quiet → <Link to="/app/crm/insights" className="text-accent hover:underline">AI Insights</Link> tells you what to do next based on stage, scoring, and history.</>}
          />
        </ol>
      </div>
    </section>
  )
}

function QuickStep({ n, title, body }) {
  return (
    <li className="flex items-start gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-accent text-bg-primary text-xs font-mono font-bold flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="text-sm font-medium text-text-primary">{title}</div>
        <div className="text-[12px] text-text-secondary mt-1 leading-relaxed">{body}</div>
      </div>
    </li>
  )
}

// ─── Playbooks ───────────────────────────────────────────────

function Playbooks() {
  return (
    <section id="playbooks" className="scroll-mt-20">
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-text-primary">Playbooks</h2>
        <p className="text-sm text-text-secondary mt-1">
          End-to-end workflows that span multiple features. Use these as the canonical "how do I do X" answers.
        </p>
      </div>

      <div className="space-y-3">
        <Playbook
          anchor="playbook-sponsor"
          title="Sign your first sponsor end-to-end"
          summary="From cold prospect to signed contract, using every tool the way it's meant to be used."
          steps={[
            <>Run <Link to="/app/crm/pipeline?find=1" className="text-accent hover:underline">Find Prospects</Link>. Add 5–10 fits to the pipeline as Prospect-stage deals.</>,
            <>Use <Link to="/app/crm/sequences" className="text-accent hover:underline">Sequences</Link> to build a 4-step outreach (email → wait → LinkedIn → wait → follow-up). Enroll your new prospects.</>,
            <>Approve each draft when it lands in your <Link to="/app/todo" className="text-accent hover:underline">To-Do list</Link>. The <Code>Coach</Code> button rewrites for tone and goal before you send.</>,
            <>When a prospect replies, drag the deal from <Code>Prospect</Code> → <Code>Proposal Sent</Code>, then to <Code>Negotiation</Code> as the conversation progresses.</>,
            <>Once verbal yes lands, drag to <Code>Contracted</Code>, upload the signed PDF in the deal's <em>Contract</em> tab, and run a <Link to="/app/crm/postmortems" className="text-accent hover:underline">Postmortem</Link> to capture what worked.</>,
          ]}
        />
        <Playbook
          anchor="playbook-stalled"
          title="Recover a stalled deal"
          summary="A deal hasn't moved in 14+ days. Here's how to figure out if it's salvageable and act on it."
          steps={[
            <>From the dashboard, click the <Code>Stale Deals</Code> KPI to filter the pipeline to dormant deals.</>,
            <>Open the deal → <em>Activity</em> tab. Read the last few touches; check the timeline for what's missing (no contract, no recent email, etc.).</>,
            <>Click <Link to="/app/crm/insights" className="text-accent hover:underline">AI Insights</Link> on the deal — the model recommends next-action based on similar closed-won deals.</>,
            <>If the path is clear: schedule a task with a reminder, or compose a fresh email with the <Code>Coach</Code> goal set to "re-open conversation".</>,
            <>If it's lost: drag to <Code>Declined</Code>, fill out a Postmortem so the team learns from it. Restore later if the buyer re-surfaces.</>,
          ]}
        />
      </div>
    </section>
  )
}

function Playbook({ anchor, title, summary, steps }) {
  return (
    <details id={anchor} className="bg-bg-card border border-border rounded-lg open:border-accent/40 group scroll-mt-20">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-start justify-between gap-3 hover:bg-bg-surface/40 transition-colors rounded-lg">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text-primary">{title}</div>
          <div className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{summary}</div>
        </div>
        <span className="shrink-0 text-text-muted group-open:rotate-90 transition-transform text-sm">▸</span>
      </summary>
      <ol className="px-4 pb-4 pt-1 space-y-2 border-t border-border">
        {steps.map((body, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-mono font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1">{body}</div>
          </li>
        ))}
      </ol>
    </details>
  )
}

// ─── Grouped Contents ────────────────────────────────────────

function ContentsGrid() {
  const groups = [
    {
      label: 'Get oriented',
      items: [
        ['navigation', 'Navigating the app'],
        ['dashboard', 'Dashboard'],
        ['ai-brief', 'Morning AI Brief'],
        ['ai-research', 'AI deal research'],
        ['todo', 'To-Do List'],
      ],
    },
    {
      label: 'Daily workflow',
      items: [
        ['pipeline', 'Deal Pipeline'],
        ['find-prospects', 'Find Prospects (AI)'],
        ['bulk-enrich', 'Bulk Add'],
        ['sequences', 'Sequences'],
        ['inbox', 'Inbox'],
        ['tasks', 'Task Manager'],
        ['ai-capture', 'AI call capture (Enterprise)'],
        ['activities', 'Activity timeline'],
      ],
    },
    {
      label: 'Insights & reporting',
      items: [
        ['velocity', 'Sales Velocity'],
        ['analytics', 'Sales Analytics'],
        ['insights', 'AI Insights'],
        ['outreach-analytics', 'Outreach Analytics'],
        ['postmortems', 'Postmortems'],
        ['priority', 'Priority Queue'],
        ['signals', 'Signal Radar'],
        ['lookalikes', 'Lookalikes'],
        ['relationships', 'Relationship Search'],
      ],
    },
    {
      label: 'Pipeline support',
      items: [
        ['assets', 'Asset Catalog'],
        ['contracts', 'Contracts'],
        ['declined', 'Declined deals'],
        ['brand-report', 'Brand Report'],
      ],
    },
    {
      label: 'Account management',
      items: [
        ['accounts', 'Account Management'],
      ],
    },
    {
      label: 'Workspace',
      items: [
        ['ops', 'Operations (Team / Newsletter / Automations / Projects)'],
        ['industry', 'Industry modules'],
        ['addons', 'Add-ons'],
        ['settings', 'Settings'],
        ['plan', 'Plan + credits'],
        ['custom-dashboard', 'Custom dashboards'],
        ['audit', 'Audit Log'],
      ],
    },
    {
      label: 'Reference',
      items: [
        ['shortcuts', 'Keyboard shortcuts'],
        ['bug', 'Reporting an issue'],
        ['faq', 'FAQ'],
      ],
    },
  ]

  return (
    <section aria-label="Contents" className="scroll-mt-20">
      <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-3">Find what you need</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map(g => (
          <div key={g.label} className="bg-bg-card border border-border rounded-lg p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">
              {g.label}
            </div>
            <ul className="space-y-1">
              {g.items.map(([anchor, label]) => (
                <li key={anchor}>
                  <a href={`#${anchor}`} className="text-sm text-accent hover:underline">{label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Reference sections ──────────────────────────────────────

function Reference() {
  return (
    <div className="space-y-10">
      <Section title="Navigating the app" anchor="navigation">
        <p>The left sidebar groups every feature by job-to-be-done; the top bar holds search, notifications, and account actions.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li><strong className="text-text-primary">Sidebar sections</strong> — Overview, Pipeline, Prospecting, Performance, Activity, Admin, plus any industry modules and add-ons your workspace has enabled.</li>
          <li><strong className="text-text-primary">Top bar</strong> — workspace name, global search (<Code>⌘K</Code> or <Code>Ctrl+K</Code>), API-usage pill, automation status, the bug-report button, the notifications bell, and your user menu.</li>
          <li><strong className="text-text-primary">Mobile</strong> — the sidebar collapses behind the menu icon and the most-used pages get a sticky bottom nav (Home / Pipeline / Assets / Tasks / Accounts / Contracts / Ops / Team / Settings).</li>
        </ul>
        <Tip>The user menu has a <Code>User manual</Code> entry that opens this page from anywhere, plus a <Code>Replay setup</Code> entry for the first-login walkthrough.</Tip>
      </Section>

      <Section title="Dashboard" anchor="dashboard">
        <p>The landing page after sign-in. Shows the workspace's pipeline, win rate, weighted forecast, expiring deals, stale deals, today's tasks, and recent activity.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Click any KPI card to drill into the underlying list (e.g. clicking <Code>Stale Deals</Code> filters the pipeline to deals with no activity in 14+ days).</li>
          <li>Use the gear in the top-right to <em>hide</em> or <em>reorder</em> dashboard cards. Settings persist per browser.</li>
          <li>The overdue-tasks and due-today banners deep-link straight into <Link to="/app/crm/tasks" className="text-accent hover:underline">Task Manager</Link>.</li>
        </ul>
      </Section>

      <Section title="To-Do List" anchor="todo">
        <p>Your daily plan. Combines two things into one prioritized list:</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Approved <strong className="text-text-primary">sequence drafts</strong> scheduled to fire today (or overdue).</li>
          <li>Open <strong className="text-text-primary">tasks</strong> assigned to you that aren't <Code>Done</Code> yet.</li>
        </ul>
        <p>Items are bucketed Overdue / Today / Tomorrow / Upcoming / No&nbsp;date. Click <Code>Done</Code> on a task to complete it; click <Code>Done</Code> on a draft to mark it sent.</p>
      </Section>

      <Section title="Deal Pipeline" anchor="pipeline">
        <p>Kanban or table view of every deal in the workspace.</p>
        <Step n="1" body={<>Stages: <Code>Prospect</Code> → <Code>Proposal Sent</Code> → <Code>Negotiation</Code> → <Code>Contracted</Code> → <Code>In Fulfillment</Code> → <Code>Renewed</Code>. Drag cards between columns to advance the deal; the move is auto-logged in the activity timeline.</>} />
        <Step n="2" body={<>Click any card to open the deal drawer with tabs for Overview, Contracts, and Activity. Inline-edit name, value, contact, stage, priority, source, and start date.</>} />
        <Step n="3" body={<>Toggle to <Code>Table</Code> view (top-left of the board) for bulk edits — double-click a cell to inline-edit.</>} />
        <Step n="4" body={<>Click <Code>Find Prospects</Code> in the top right to open AI prospect search inline (covered below).</>} />
        <Step n="5" body={<>Use <Code>Share</Code> on any deal to generate a tokenized sponsor portal link — the prospect can review the deal without logging in.</>} />
        <Tip>Stale deals (no activity in 14+ days) are tagged <Code>STALE</Code> automatically. The Dashboard surfaces these so they don't rot.</Tip>
      </Section>

      <Section title="Asset Catalog" anchor="assets">
        <p>Every sponsorable asset your property sells (logos on jersey, on-site signage, naming rights, social mentions, etc.).</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Add an asset with category, base price, quantity, and any default benefits.</li>
          <li>Assets attached to a deal show in the deal's Overview tab.</li>
          <li>Use the catalog as the source of truth when building proposals — the deal form pulls from it.</li>
        </ul>
      </Section>

      <Section title="Declined deals" anchor="declined">
        <p>Deals you marked lost. Hidden from the active board but kept for retros and recovery. Click a deal to restore it to <Code>Prospect</Code> if the buyer comes back.</p>
      </Section>

      <Section title="Find Prospects (AI)" anchor="find-prospects">
        <p>Open from <Code>Deal Pipeline → Find Prospects</Code>, the sidebar <em>Find Prospects</em> link, or the keyboard shortcut <Code>P</Code>.</p>
        <Step n="1" body={<>Type a sentence describing who you want to reach — industry, size, region, anything specific. Example: <em>"mid-market SaaS in the US, 50–250 employees, raised in the last 18 months"</em>.</>} />
        <Step n="2" body={<>The AI returns 10–20 named matches with an ICP score and the verified decision-maker(s) at each. Each lookup costs one credit from your monthly pool (see top-bar pill).</>} />
        <Step n="3" body={<>Click <Code>Add to pipeline</Code> on any result to create a Prospect-stage deal with the contact attached.</>} />
        <Tip>Filters down the right side scope by industry, size, region, persona, and any saved ICP — apply them before searching to bias results.</Tip>
      </Section>

      <Section title="Bulk Add" anchor="bulk-enrich">
        <p>Paste a list or upload a CSV of companies and prospects. Each row is automatically enriched with firmographics + decision-makers in the background; click <Code>Add to CRM</Code> on any enriched row to turn it into a deal or contact.</p>
      </Section>

      <Section title="Signal Radar" anchor="signals">
        <p>A live feed of buying signals across your prospects: funding rounds, hiring, exec moves, news mentions. Click any signal to open the related deal or create a new one.</p>
      </Section>

      <Section title="Lookalikes" anchor="lookalikes">
        <p>Pick a closed-won deal and the AI returns similar companies you haven't worked yet, ranked by ICP fit.</p>
      </Section>

      <Section title="Relationship Search" anchor="relationships">
        <p>Search across every contact in every deal. Useful when you remember a name but not the company, or want to find every person you've talked to at a target account.</p>
      </Section>

      <Section title="Sequences" anchor="sequences">
        <p>Multi-step outreach campaigns (email → wait 3 days → LinkedIn → wait 5 days → call, etc.).</p>
        <Step n="1" body={<>Click <Code>New sequence</Code> and either build steps manually or let the AI Sequence Builder draft them from a goal ("warm intro → discovery call").</>} />
        <Step n="2" body={<>Enroll deals or contacts into the sequence. Each step generates a draft you must approve before it sends.</>} />
        <Step n="3" body={<>Approved drafts land in your To-Do List at the scheduled time. Click <Code>Done</Code> to mark sent.</>} />
        <Tip>The AI <Code>Coach</Code> button on every draft scores the message and rewrites it against a chosen goal (more concise, push for meeting, more human).</Tip>
      </Section>

      <Section title="Priority Queue" anchor="priority">
        <p>Single-pane "what should I work on right now" view. Surfaces the deals most likely to close this month, weighted by score, last-contact age, and stage probability.</p>
      </Section>

      <Section title="Outreach Analytics" anchor="outreach-analytics">
        <p>Open rates, reply rates, and response times across your sequences and one-off sends. Filter by rep, sequence, or template.</p>
      </Section>

      <Section title="Sales Velocity" anchor="velocity">
        <p>How fast deals move stage-to-stage and where they pile up. Each stage shows median dwell time and a leak-rate.</p>
      </Section>

      <Section title="Sales Analytics" anchor="analytics">
        <p>Revenue by month / quarter / year, win-rate by rep, by source, by industry. Use the date-range picker for any window.</p>
      </Section>

      <Section title="AI Insights" anchor="insights">
        <p>AI-generated recommendations on any active deal: what to do next, what's blocking, which similar deals closed and why.</p>
      </Section>

      <Section title="Postmortems" anchor="postmortems">
        <p>Structured retros for closed-won and closed-lost deals so the team learns. Add tags like "price", "timing", or "no champion" so you can spot patterns over time.</p>
      </Section>

      <Section title="Inbox" anchor="inbox">
        <p>Connect Outlook or Gmail (Enterprise) to send and receive from the CRM. Replies auto-attach to the matching deal's activity timeline.</p>
        <Step n="1" body={<>Open <em>Inbox connections</em> from the user menu to authorize Outlook or Gmail. Tokens are encrypted at rest.</>} />
        <Step n="2" body={<>Set your signature from <em>Profile &amp; signature</em> in the user menu.</>} />
        <Step n="3" body={<>Click <Code>Compose</Code> on any contact to draft. <Code>✨ Draft with AI</Code> generates a first pass; <Code>Coach</Code> rewrites against a goal; <Code>Chat</Code> opens the outreach copilot.</>} />
        <Tip>Lower-tier plans without inbox sync can still draft and copy — paste into your own client when sending.</Tip>
      </Section>

      <Section title="Activity timeline" anchor="activities">
        <p>A unified feed of every interaction: emails, calls, meetings, notes, contract uploads, sequence steps, completed tasks. Filter by deal, rep, type, or date.</p>
      </Section>

      <Section title="Task Manager" anchor="tasks">
        <p>Every task across the workspace. Tasks created here for yourself appear in your To-Do List; the two views stay in sync.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Quick-add bar at the top creates a task due today, Medium priority, in one Enter.</li>
          <li>Click <Code>+ Schedule Activity</Code> for the full form — type (Call, Email, Meeting, Follow-up, etc.), description, scheduled time, reminder, priority, linked deal.</li>
          <li>Filter buttons let you scope to one activity type. Overdue tasks get a red banner.</li>
          <li>Enable browser push notifications and the reminder fires at the scheduled time, even if the tab is in the background.</li>
          <li>Marking a task <Code>Done</Code> auto-creates a matching activity on the deal so the timeline stays accurate.</li>
        </ul>
        <Tip>From a deal's <em>Activity</em> tab, click <Code>+ Schedule task</Code> to open Task Manager with that deal pre-selected.</Tip>
      </Section>

      <Section title="Morning AI Brief" anchor="ai-brief">
        <p>Every morning at ~8 AM Eastern an AI agent reads your closed-won pattern, recent activity, pipeline, and market signals to produce a five-lane brief: new prospects to add, emails to send, deals to push, renewal risks, and signals worth acting on. The brief is already warm when you open the app.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Each prospect is grounded in a specific data point — a closed-won pattern, a recent recording theme, or a current signal — never a generic ICP description. Items the system can't substantiate are dropped before you ever see them.</li>
          <li><Code>Add + draft</Code> on a prospect creates the deal AND opens Compose pre-filled with the AI's first-touch email so you can edit and send in one motion.</li>
          <li><Code>Send</Code> on an outbound email card opens Compose with the subject and body pre-filled. Edit before sending.</li>
          <li>The brief auto-marks itself as <em>dirty</em> when something material changes — a new signal lands on one of your accounts, a recording finishes processing, you complete a task. You'll see a "New activity since this brief was generated — Refresh" banner so you know it's stale. Click it to rebuild on demand; the morning cron will also pick it up automatically.</li>
          <li>Hit <Code>Refresh</Code> to regenerate manually (capped at 5 user-initiated regens / day to keep API spend in check; dirty-trigger regens aren't counted).</li>
        </ul>
      </Section>

      <Section title="AI deal research (background agent)" anchor="ai-research">
        <p>A background agent runs every two hours and picks active deals that haven't been researched in the last 14 days. For each, it reads the deal's activities, recordings, signals, and a set of comparable closed-won deals, then produces a structured brief: a headline, a 2–3 sentence situation summary, up to five talking points, up to three red flags, and up to three comparable wins.</p>
        <p>The brief renders at the top of every deal's <em>Overview</em> tab. Click <Code>Refresh</Code> to force a regenerate; click <Code>Run research now</Code> if a deal has never been touched by the agent and you want a brief before the next cron pass.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>Every talking point cites a specific data point — a signal, a quote from a recording summary, a comparable win. Generic suggestions are dropped during validation.</li>
          <li>Comparable wins link directly to the matching deal so you can open it inline.</li>
          <li>Low-data deals (no activities, recordings, or signals) get a "thin data" warning — the brief is still produced but with low confidence.</li>
        </ul>
      </Section>

      <Section title="AI call &amp; meeting capture (Enterprise)" anchor="ai-capture">
        <p>On any deal's Activity tab, record a sales call in the browser or drop a Zoom / Google Meet / Teams audio export. AI transcribes the file (Whisper), then extracts the activity type, summary, sentiment, buying-intent score, action items, contact updates, and competitor mentions (Claude). Action items become tasks automatically with sensible due dates.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li><strong>Enterprise tier only.</strong> Lower tiers see the upgrade CTA.</li>
          <li>Per-user daily cap of 50 transcriptions. Browser recording auto-stops at 30 minutes; for longer calls, split into segments.</li>
          <li>Max file size: 24MB per recording. Whisper rejects larger files.</li>
          <li>Audio files are kept for 90 days, then auto-deleted from storage. The transcript and extracted fields stay forever.</li>
          <li>Each captured activity feeds tomorrow's morning brief — what your team heard yesterday becomes tomorrow's grounded recommendation.</li>
        </ul>
      </Section>

      <Section title="Contracts" anchor="contracts">
        <p>Store the signed PDF (or DOCX, image, scan) for each deal. Pick the deal, attach the file, set a few fields (status, dates, value) and save. Anyone on the team can download it later.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li>The deal drawer's <em>Contract</em> tab also lets you upload directly from inside a deal.</li>
          <li>Editing a contract row lets you change status, dates, or value without re-uploading the file.</li>
        </ul>
      </Section>

      <Section title="Brand Report" anchor="brand-report">
        <p>From any deal, click <Code>Generate Brand Report</Code> to produce a one-page PDF showing the sponsor's logo placements, social mentions, and audience reach. Sharable with the sponsor as a quarterly recap.</p>
      </Section>

      <Section title="Audit Log" anchor="audit">
        <p>Admin-only — every write across the workspace: who edited which deal, when, and what changed. Use for compliance and to debug "who moved my deal?" disputes.</p>
      </Section>

      <Section title="Account Management" anchor="accounts">
        <p>For account managers running renewals on the book of business they own.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li><strong className="text-text-primary">Accounts dashboard</strong> — every active account with health score, ARR, days-to-renewal, last touch.</li>
          <li><strong className="text-text-primary">Renewal pipeline</strong> — pipeline view of upcoming renewals by quarter.</li>
          <li><strong className="text-text-primary">Account detail</strong> — single-account drill-in with contracts, contacts, activity.</li>
        </ul>
      </Section>

      <Section title="Operations" anchor="ops">
        <p>Cross-cutting workspace tools.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li><strong className="text-text-primary">Team</strong> — invite reps, set roles (rep / admin / developer), revoke access.</li>
          <li><strong className="text-text-primary">Newsletter</strong> — send updates to your sponsor list with open/click tracking.</li>
          <li><strong className="text-text-primary">Automations</strong> — workflow rules (when X happens, do Y) — assign reps, set priority, create tasks, fire webhooks.</li>
          <li><strong className="text-text-primary">Projects</strong> — multi-step initiatives with subtasks, owners, and due dates. Use for activations or campaigns that span weeks.</li>
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
        <p>Set the property type in <em>Settings → Workspace</em>.</p>
      </Section>

      <Section title="Add-ons" anchor="addons">
        <p>Toggle optional modules (Activations, VALORA valuations, Business Now intelligence) from <em>Settings → Add-ons</em>. Each appears in the sidebar once enabled.</p>
      </Section>

      <Section title="Settings" anchor="settings">
        <p>Settings covers workspace name, industry type, terminology, do-not-contact list, custom fields, data export, and integrations.</p>
        <ul className="space-y-1.5 list-disc ml-4">
          <li><strong className="text-text-primary">Billing</strong> — current plan, payment method, top-up extra prospect lookups.</li>
          <li><strong className="text-text-primary">Add-ons</strong> — request access to modules outside your plan.</li>
        </ul>
      </Section>

      <Section title="Plan + credits" anchor="plan">
        <p>The pill in the top bar (<Code>X / Y</Code> with a person icon) shows your AI prospect-lookup usage this month vs. your plan's cap.</p>
        <ul className="space-y-1.5 ml-4 list-disc">
          <li><strong>Free</strong> — $0/mo · 1 user, 25 deals, 10 lookups/mo · AI Brief on-demand</li>
          <li><strong>Starter</strong> — $39/mo ($31 annual) · up to 5 users, 500 deals, 100 lookups/mo · daily AI Brief + lookalikes + signal radar</li>
          <li><strong>Pro</strong> — $99/mo ($79 annual) · unlimited users, unlimited deals, 500 lookups/mo · background research agent, AI sequence builder, email coach, bulk add</li>
          <li><strong>Enterprise</strong> — $249/mo ($199 annual) · 2,500 lookups/mo · AI call + meeting capture, full inbox integration, SSO, dedicated CSM</li>
        </ul>
        <p>Annual plans save 20% (billed yearly). Need more lookups? Top up with +100 for $15 from <em>Settings → Billing</em>.</p>
        <Tip>Pro replaces what most teams pay for HubSpot Sales Pro ($90) + Apollo ($99) separately — one tool, $99/seat, and the AI sees both halves of your funnel.</Tip>
      </Section>

      <Section title="Custom dashboards" anchor="custom-dashboard">
        <p>Request a bespoke dashboard tailored to your property's KPIs. The team builds it and it shows up in your workspace for everyone on the team.</p>
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
    </div>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────

function FAQ() {
  const items = [
    {
      q: 'Does an onboarding window pop up every time I sign in?',
      a: 'No. The onboarding modal only auto-runs on your very first login. After that, you can re-open it from the user menu under "Replay setup" if you want to revisit the walkthrough.',
    },
    {
      q: 'How do my To-Do list and Task Manager stay in sync?',
      a: 'They share a single tasks table. A task you create in either view shows up in both immediately, and marking one Done removes it from both. New tasks default to "assigned to me" so they appear on your daily plan automatically.',
    },
    {
      q: 'What happens if I run out of prospect lookups?',
      a: 'The Find Prospects search will tell you when you hit the cap. You can buy +100 lookups for $15 from Settings → Billing, wait until next month for the cap to reset, or upgrade your plan for a higher monthly allowance.',
    },
    {
      q: 'Can I pre-fill my company info during signup so I don\'t have to enter it again?',
      a: 'You already do. Signup collects company name, city, state, and industry up front, and we stash that in your account so it survives email confirmation. The "One last step" prompt only fires for the rare cases where that metadata is missing.',
    },
    {
      q: 'Is there an API or webhook layer for integrating with other tools?',
      a: 'Webhooks, API keys, and if-this-then-that workflow rules are not user-facing right now while we focus on the core CRM. The underlying schema supports them — if you have an integration use-case, email jason@loud-legacy.com and we\'ll hand you an API key.',
    },
    {
      q: 'How do contracts work? I don\'t see AI extraction or fulfillment tracking anymore.',
      a: 'Contracts are file storage for now: pick the deal, upload the file, set status / dates / value, and save. The AI extraction + fulfillment tracking surface was creating more problems than it solved at launch — we\'ll likely revive it once the core flow is rock-solid.',
    },
    {
      q: 'My pipeline is empty. Where do I start?',
      a: 'Three options, fastest to slowest: (1) Open Find Prospects with a one-sentence ICP description and add the matches. (2) Open Bulk Add and paste a list or CSV you already have. (3) Click "+ New Deal" on the pipeline and add deals you\'re already working manually.',
    },
    {
      q: 'How do I invite my team?',
      a: 'Operations → Team. Enter their email, pick a role (rep, admin, or developer), and they get an invite link. Existing accounts get auto-attached to your workspace; new accounts go through a shorter signup flow.',
    },
    {
      q: 'Can prospects see anything I do in the CRM?',
      a: 'Only what you explicitly share. Click Share on any deal to generate a tokenized sponsor portal link — they can review the deal status without logging in. Everything else is gated by row-level security to your workspace.',
    },
    {
      q: 'Where do I report bugs or request features?',
      a: 'The bug icon in the top bar opens a capture modal that auto-includes the URL, browser, and module. You can also email jason@loud-legacy.com for anything bigger.',
    },
    {
      q: 'Why is the morning AI Brief sometimes empty or short?',
      a: 'The brief grounds every recommendation in your own data — closed-won deals, recent activity, recordings, signals. New accounts with thin history will see fewer items because the system would rather show 2 grounded prospects than 5 generic ones. Run a few prospect searches and log a couple of calls; the brief gets richer fast.',
    },
    {
      q: 'Can I record sales calls on the free or starter plans?',
      a: 'No. AI call capture (Whisper transcription + Claude extraction + auto-task creation) is on the Enterprise tier. Lower tiers can still log activities manually on the deal\'s Activity tab. The morning AI Brief is available on every plan.',
    },
    {
      q: 'How long do you keep my recordings?',
      a: 'Audio files are deleted from storage 90 days after upload. The transcript, summary, sentiment score, action items, and any other extracted fields stay attached to the activity row forever — those are what the AI Brief references in future days.',
    },
  ]
  return (
    <section id="faq" className="scroll-mt-20">
      <h2 className="text-lg sm:text-xl font-semibold text-text-primary mb-3">FAQ</h2>
      <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
        {items.map((it, i) => (
          <details key={i} className="group">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-start justify-between gap-3 hover:bg-bg-surface/40 transition-colors">
              <span className="text-sm font-medium text-text-primary">{it.q}</span>
              <span className="shrink-0 text-text-muted group-open:rotate-90 transition-transform text-sm">▸</span>
            </summary>
            <div className="px-4 pb-4 text-[13px] text-text-secondary leading-relaxed">
              {it.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

// ─── Reusable bits ───────────────────────────────────────────

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
