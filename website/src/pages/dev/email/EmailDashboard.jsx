import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardMetrics, getTopCampaigns } from '@/services/email/emailAnalyticsService'
import { getRecentAddsCount } from '@/services/email/emailListService'

/**
 * /app/marketing/email — Email marketing dashboard with 30-day rollups,
 * conversation widgets, and top-campaign list. First-run accounts
 * (zero subscribers + zero campaigns) see a getting-started card
 * instead of empty metric tiles.
 */
export default function EmailDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [topCampaigns, setTopCampaigns] = useState([])
  const [recentAdds, setRecentAdds] = useState(0)

  useEffect(() => {
    Promise.all([
      getDashboardMetrics(),
      getTopCampaigns(5),
      getRecentAddsCount(),
    ]).then(([m, c, r]) => {
      setMetrics(m)
      setTopCampaigns(c)
      setRecentAdds(r)
    })
  }, [])

  if (!metrics) return <div className="p-6 text-xs text-text-muted">Loading…</div>

  // First-run: zero subscribers AND zero sends AND no campaigns
  // → show getting-started card instead of empty dashboard.
  const isFirstRun =
    (metrics.totalSubscribers || 0) === 0 &&
    (metrics.emailsSent30 || 0) === 0 &&
    topCampaigns.length === 0

  if (isFirstRun) return <GettingStarted />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {recentAdds > 0 && (
        <Link
          to="/app/marketing/email/subscribers?recent=1"
          className="block bg-accent/10 border border-accent/40 rounded-lg p-3 text-sm text-accent hover:bg-accent/15"
        >
          {recentAdds} new contact{recentAdds !== 1 ? 's' : ''} synced from pipeline in the last 72 hours — View new adds →
        </Link>
      )}

      <section>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">30-day overview</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total subscribers" value={metrics.totalSubscribers} />
          <Stat label="Emails sent" value={metrics.emailsSent30} delta={metrics.emailsSent30 - metrics.emailsSentPrev30} />
          <Stat label="Open rate" value={`${metrics.openRate}%`} color={parseFloat(metrics.openRate) >= 22 ? 'success' : 'warning'} />
          <Stat label="Click rate" value={`${metrics.clickRate}%`} color={parseFloat(metrics.clickRate) >= 2.5 ? 'success' : 'warning'} />
          <Stat label="Reply rate" value={`${metrics.replyRate}%`} />
          <Stat label="Bounce rate" value={`${metrics.bounceRate}%`} color={parseFloat(metrics.bounceRate) > 2 ? 'danger' : 'success'} />
          <Stat label="Pipeline synced (30d)" value={metrics.pipelineSynced30} />
          <Stat label="Net growth" value={metrics.netGrowth30} delta={metrics.netGrowth30} />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <QuickWidget
          label="Unread conversations"
          value={metrics.unreadConversations}
          action="View"
          to="/app/marketing/email/conversations"
          color={metrics.unreadConversations > 0 ? 'accent' : 'muted'}
        />
        <QuickWidget
          label="Open conversations"
          value={metrics.openConversations}
          action="Open"
          to="/app/marketing/email/conversations"
        />
        <QuickWidget
          label="Pipeline new adds"
          value={recentAdds}
          action="Review"
          to="/app/marketing/email/subscribers?recent=1"
        />
      </section>

      <section>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Top campaigns</div>
        <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-right p-3">Sent</th>
                <th className="text-right p-3">Recipients</th>
                <th className="text-right p-3">Open %</th>
                <th className="text-right p-3">Click %</th>
                <th className="text-right p-3">Reply %</th>
              </tr>
            </thead>
            <tbody>
              {topCampaigns.map(c => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3">
                    <Link to={`/app/marketing/email/campaigns/${c.id}/analytics`} className="text-text-primary hover:text-accent">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-3 text-right text-text-muted text-[10px]">{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : '—'}</td>
                  <td className="p-3 text-right">{c.total_recipients || 0}</td>
                  <td className="p-3 text-right text-success">{Number(c.open_rate || 0).toFixed(1)}</td>
                  <td className="p-3 text-right text-success">{Number(c.click_rate || 0).toFixed(1)}</td>
                  <td className="p-3 text-right text-accent">{Number(c.reply_rate || 0).toFixed(1)}</td>
                </tr>
              ))}
              {topCampaigns.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-text-muted">No campaigns sent yet — <Link to="/app/marketing/email/campaigns/new" className="text-accent">create one</Link></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, delta, color = 'accent' }) {
  const colorCls = color === 'success' ? 'text-success' : color === 'warning' ? 'text-warning' : color === 'danger' ? 'text-danger' : 'text-accent'
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${colorCls}`}>{value}</div>
      {delta != null && delta !== 0 && (
        <div className={`text-[10px] mt-0.5 ${delta > 0 ? 'text-success' : 'text-danger'}`}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}
        </div>
      )}
    </div>
  )
}

function QuickWidget({ label, value, action, to, color = 'accent' }) {
  const cls = color === 'muted' ? 'text-text-muted' : 'text-accent'
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 flex items-center justify-between">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
        <div className={`text-2xl font-semibold mt-1 ${cls}`}>{value}</div>
      </div>
      <Link to={to} className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50 hover:text-accent">
        {action}
      </Link>
    </div>
  )
}

/**
 * First-run onboarding. Shown when the account has zero subscribers,
 * zero campaigns, and zero sends in the last 30 days. Walks the user
 * through the three steps needed to get an email out the door.
 */
function GettingStarted() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header className="text-center space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Email Marketing</div>
        <h1 className="text-3xl font-semibold">Let's send your first campaign.</h1>
        <p className="text-sm text-text-secondary max-w-xl mx-auto">
          Email Marketing runs on the same subscriber database as the rest of Rally.
          Three quick steps and you're ready to ship. Nothing is sent until you hit Send.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Step
          num={1}
          title="Create a list"
          body="Lists group subscribers by source or segment — prospects, trials, customers, or a custom slice you build. Your first list takes 10 seconds."
          cta="Create a list"
          to="/app/marketing/email/lists"
        />
        <Step
          num={2}
          title="Add subscribers"
          body="Import a CSV, sync contacts from your deal pipeline, or let the existing Digest signup form populate your list automatically."
          cta="Import or sync"
          to="/app/marketing/email/import"
        />
        <Step
          num={3}
          title="Build a campaign"
          body="Pick a list, write the email, preview it on desktop and mobile, and schedule or send. Analytics appear the moment the first open lands."
          cta="Draft a campaign"
          to="/app/marketing/email/campaigns/new"
        />
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">Good to know</div>
        <ul className="space-y-2 text-xs text-text-secondary">
          <li>• <strong className="text-text-primary">Deliverability:</strong> we send via Resend (primary) and SendGrid (fallback). Emails are signed with SPF + DKIM against loud-legacy.com — no configuration on your end.</li>
          <li>• <strong className="text-text-primary">Unsubscribe:</strong> every email includes a one-click token-based unsubscribe link and a proper List-Unsubscribe header for Gmail/Outlook compliance.</li>
          <li>• <strong className="text-text-primary">Tracking:</strong> opens and clicks are captured with a tracking pixel + redirect links. You can turn both off per-campaign in campaign settings.</li>
          <li>• <strong className="text-text-primary">Suppression list:</strong> bounced and complained addresses are added to a global suppression list automatically. They'll never receive another email, even across lists.</li>
          <li>• <strong className="text-text-primary">Templates:</strong> save any campaign as a template to reuse. The Digest by Loud CRM uses the same pipeline.</li>
        </ul>
      </div>
    </div>
  )
}

function Step({ num, title, body, cta, to }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold">{num}</div>
        <div className="text-sm font-semibold text-text-primary">{title}</div>
      </div>
      <p className="text-[11px] text-text-secondary leading-relaxed flex-1">{body}</p>
      <Link
        to={to}
        className="text-xs px-3 py-2 bg-accent text-bg-primary rounded font-semibold text-center hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  )
}
