import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardMetrics, getTopCampaigns } from '@/services/email/emailAnalyticsService'
import { getRecentAddsCount } from '@/services/email/emailListService'

/**
 * /dev/email — Email marketing dashboard with 30-day rollups,
 * conversation widgets, and top-campaign list.
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {recentAdds > 0 && (
        <Link
          to="/dev/email/subscribers?recent=1"
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
          to="/dev/email/conversations"
          color={metrics.unreadConversations > 0 ? 'accent' : 'muted'}
        />
        <QuickWidget
          label="Open conversations"
          value={metrics.openConversations}
          action="Open"
          to="/dev/email/conversations"
        />
        <QuickWidget
          label="Pipeline new adds"
          value={recentAdds}
          action="Review"
          to="/dev/email/subscribers?recent=1"
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
                    <Link to={`/dev/email/campaigns/${c.id}/analytics`} className="text-text-primary hover:text-accent">
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
                <tr><td colSpan={6} className="p-4 text-center text-text-muted">No campaigns sent yet — <Link to="/dev/email/campaigns/new" className="text-accent">create one</Link></td></tr>
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
