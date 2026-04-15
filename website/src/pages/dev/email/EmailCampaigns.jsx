import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as campaignService from '@/services/email/campaignService'

export default function EmailCampaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState(null)
  const [statusTab, setStatusTab] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { reload() }, [statusTab])

  async function reload() {
    setLoading(true)
    const [c, s] = await Promise.all([
      campaignService.listCampaigns({ status: statusTab }),
      campaignService.getGlobalCampaignStats(),
    ])
    setCampaigns(c.campaigns)
    setStats(s)
    setLoading(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Campaigns</h2>
          {stats && <p className="text-[11px] text-text-muted">{stats.total} total · {stats.draft} draft · {stats.scheduled} scheduled · {stats.sent} sent</p>}
        </div>
        <Link to="/app/marketing/email/campaigns/new" className="text-xs px-3 py-1.5 bg-accent text-bg-primary rounded font-semibold">+ New Campaign</Link>
      </header>

      <div className="flex gap-1 border-b border-border">
        {['all', 'draft', 'scheduled', 'sending', 'sent'].map(t => (
          <button
            key={t}
            onClick={() => setStatusTab(t)}
            className={`px-3 py-2 text-xs capitalize ${statusTab === t ? 'text-accent border-b-2 border-accent' : 'text-text-secondary'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Recipients</th>
              <th className="text-right p-2">Open %</th>
              <th className="text-right p-2">Click %</th>
              <th className="text-right p-2">Reply %</th>
              <th className="text-left p-2">Sent</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="p-4 text-center text-text-muted">Loading…</td></tr>}
            {!loading && campaigns.length === 0 && (
              <tr><td colSpan={8} className="p-4 text-center text-text-muted">No campaigns yet. <Link to="/app/marketing/email/campaigns/new" className="text-accent">Create one</Link></td></tr>
            )}
            {campaigns.map(c => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-2">
                  <Link to={`/app/marketing/email/campaigns/${c.id}/edit`} className="text-text-primary hover:text-accent">{c.name}</Link>
                  <div className="text-[10px] text-text-muted truncate max-w-xs">{c.subject_line}</div>
                </td>
                <td className="p-2"><StatusBadge status={c.status} /></td>
                <td className="p-2 text-right">{c.total_recipients || 0}</td>
                <td className="p-2 text-right text-success">{Number(c.open_rate || 0).toFixed(1)}</td>
                <td className="p-2 text-right text-success">{Number(c.click_rate || 0).toFixed(1)}</td>
                <td className="p-2 text-right text-accent">
                  {c.reply_count > 0 ? (
                    <Link to={`/app/marketing/email/conversations?campaign=${c.id}`} className="hover:underline">
                      {Number(c.reply_rate || 0).toFixed(1)} ({c.reply_count})
                    </Link>
                  ) : '—'}
                </td>
                <td className="p-2 text-[10px] text-text-muted">{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : '—'}</td>
                <td className="p-2 text-right">
                  <Link to={`/app/marketing/email/campaigns/${c.id}/analytics`} className="text-[10px] text-accent hover:underline">Stats</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    draft: 'bg-bg-surface text-text-muted',
    scheduled: 'bg-warning/15 text-warning',
    sending: 'bg-accent/15 text-accent',
    sent: 'bg-success/15 text-success',
    paused: 'bg-text-muted/15 text-text-muted',
    cancelled: 'bg-danger/15 text-danger',
  }
  return <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${map[status] || 'bg-bg-surface'}`}>{status}</span>
}
