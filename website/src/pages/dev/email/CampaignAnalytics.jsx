import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCampaignAnalytics, getCampaignReplies } from '@/services/email/emailAnalyticsService'

export default function CampaignAnalytics() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [replies, setReplies] = useState([])

  useEffect(() => {
    Promise.all([getCampaignAnalytics(id), getCampaignReplies(id)]).then(([a, r]) => {
      setData(a)
      setReplies(r)
    })
  }, [id])

  if (!data) return <div className="p-6 text-xs text-text-muted">Loading…</div>

  const { campaign, funnel } = data
  const rate = (num, denom) => (denom > 0 ? ((num / denom) * 100).toFixed(1) : '0.0')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <Link to="/app/marketing/email/campaigns" className="text-[10px] text-text-muted hover:text-accent">← Campaigns</Link>
        <h2 className="text-xl font-semibold mt-1">{campaign.name}</h2>
        <p className="text-[11px] text-text-muted">{campaign.subject_line}</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <Tile label="Recipients" value={funnel.total} />
        <Tile label="Delivered" value={funnel.delivered} />
        <Tile label="Opened" value={funnel.opened} />
        <Tile label="Clicked" value={funnel.clicked} />
        <Tile label="Replied" value={funnel.replied} color="accent" />
        <Tile label="Bounced" value={funnel.bounced} color="danger" />
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">Funnel</div>
        <FunnelBar label="Sent" value={funnel.total} max={funnel.total} />
        <FunnelBar label={`Delivered (${rate(funnel.delivered, funnel.total)}%)`} value={funnel.delivered} max={funnel.total} />
        <FunnelBar label={`Opened (${rate(funnel.opened, funnel.delivered)}%)`} value={funnel.opened} max={funnel.total} />
        <FunnelBar label={`Clicked (${rate(funnel.clicked, funnel.opened)}%)`} value={funnel.clicked} max={funnel.total} />
        <FunnelBar label={`Replied (${rate(funnel.replied, funnel.delivered)}%)`} value={funnel.replied} max={funnel.total} />
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Replies & conversations</div>
        <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left p-2">Subscriber</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Last reply</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {replies.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-text-muted">No replies yet</td></tr>}
              {replies.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2">
                    {r.email_subscribers?.first_name} {r.email_subscribers?.last_name}
                    <div className="text-[10px] text-text-muted">{r.email_subscribers?.email}</div>
                  </td>
                  <td className="p-2"><span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-surface">{r.status}</span></td>
                  <td className="p-2 text-[10px] text-text-muted">{new Date(r.last_message_at).toLocaleString()}</td>
                  <td className="p-2 text-right">
                    <Link to={`/app/marketing/email/conversations/${r.id}`} className="text-[10px] text-accent hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Tile({ label, value, color = 'accent' }) {
  const cls = color === 'success' ? 'text-success' : color === 'danger' ? 'text-danger' : 'text-accent'
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}

function FunnelBar({ label, value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary">{value}</span>
      </div>
      <div className="w-full bg-bg-surface h-1.5 rounded-full">
        <div className="bg-accent h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
