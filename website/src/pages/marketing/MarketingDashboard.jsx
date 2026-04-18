import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/**
 * /app/marketing — aggregate dashboard across all marketing channels.
 * Pulls from email_campaigns, email_subscribers, automation_social_posts,
 * and digest_issues to give a single-screen view of "how is marketing doing."
 */
export default function MarketingDashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const now = new Date()
      const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString()

      const [
        subTotal,
        subActive,
        subNew30,
        campaigns30,
        campaignsSent30,
        digestPublished,
        digestDraft,
        socialDraft,
        socialPublished,
      ] = await Promise.all([
        supabase.from('email_subscribers').select('id', { count: 'exact', head: true }),
        supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
        supabase.from('email_campaigns').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
        supabase.from('email_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', thirtyDaysAgo),
        supabase.from('digest_issues').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('digest_issues').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('automation_social_posts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('automation_social_posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      ])

      // Top campaigns by open rate
      const { data: topCampaigns } = await supabase
        .from('email_campaigns')
        .select('id, name, subject_line, sent_at, total_recipients, unique_opens, open_rate, click_rate, status')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(5)

      // Recent digest issues
      const { data: recentDigest } = await supabase
        .from('digest_issues')
        .select('id, slug, title, status, published_at, view_count, email_sends, email_opens')
        .order('created_at', { ascending: false })
        .limit(5)

      if (mounted) {
        setData({
          subscribers: {
            total: subTotal.count || 0,
            active: subActive.count || 0,
            new30: subNew30.count || 0,
          },
          campaigns: {
            created30: campaigns30.count || 0,
            sent30: campaignsSent30.count || 0,
          },
          digest: {
            published: digestPublished.count || 0,
            draft: digestDraft.count || 0,
          },
          social: {
            draft: socialDraft.count || 0,
            published: socialPublished.count || 0,
          },
          topCampaigns: topCampaigns || [],
          recentDigest: recentDigest || [],
        })
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (!data) return <div className="p-6 text-xs text-text-muted">Loading marketing dashboard…</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">Marketing</div>
        <h1 className="text-2xl font-semibold text-text-primary">Marketing Dashboard</h1>
        <p className="text-xs text-text-muted mt-1">Aggregate view across email, social, and content channels.</p>
      </header>

      {/* Top-level metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Stat label="Total subscribers" value={data.subscribers.total} />
        <Stat label="Active" value={data.subscribers.active} color="success" />
        <Stat label="New (30d)" value={data.subscribers.new30} color="accent" />
        <Stat label="Campaigns sent" value={data.campaigns.sent30} />
        <Stat label="Digest published" value={data.digest.published} />
        <Stat label="Digest drafts" value={data.digest.draft} color="warning" />
        <Stat label="Social published" value={data.social.published} />
        <Stat label="Social drafts" value={data.social.draft} color="warning" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickAction
          label="New Campaign"
          description="Draft and send an email campaign to your subscribers"
          to="/app/marketing/email/campaigns/new"
        />
        <QuickAction
          label="New Digest Issue"
          description="Write or AI-research the next issue of The Digest"
          to="/app/developer/digest"
        />
        <QuickAction
          label="View Subscribers"
          description={`${data.subscribers.active} active subscribers across all lists`}
          to="/app/marketing/email/subscribers"
        />
      </div>

      {/* Two-column: recent campaigns + digest issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent campaigns */}
        <div className="bg-bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Recent Campaigns</span>
            <Link to="/app/marketing/email/campaigns" className="text-[10px] text-accent hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {data.topCampaigns.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-text-muted">
                No campaigns sent yet.{' '}
                <Link to="/app/marketing/email/campaigns/new" className="text-accent hover:underline">Create one</Link>
              </div>
            ) : (
              data.topCampaigns.map(c => (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">{c.name || c.subject_line}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : 'Draft'}
                        {c.total_recipients ? ` · ${c.total_recipients} recipients` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {c.open_rate != null && (
                        <div className="text-xs text-success font-mono">{Number(c.open_rate).toFixed(1)}% open</div>
                      )}
                      {c.click_rate != null && c.click_rate > 0 && (
                        <div className="text-[10px] text-accent font-mono">{Number(c.click_rate).toFixed(1)}% click</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent digest issues */}
        <div className="bg-bg-card border border-border rounded-lg">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">The Digest</span>
            <Link to="/app/developer/digest" className="text-[10px] text-accent hover:underline">Manage →</Link>
          </div>
          <div className="divide-y divide-border">
            {data.recentDigest.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-text-muted">
                No digest issues yet.{' '}
                <Link to="/app/developer/digest" className="text-accent hover:underline">Create one</Link>
              </div>
            ) : (
              data.recentDigest.map(d => (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">{d.title}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        <StatusChip status={d.status} />
                        {d.published_at && ` · ${new Date(d.published_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-[10px] font-mono text-text-muted">
                      {d.view_count > 0 && <div>{d.view_count} views</div>}
                      {d.email_opens > 0 && <div className="text-success">{d.email_opens} opens</div>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color = 'accent' }) {
  const cls = color === 'success' ? 'text-success' : color === 'warning' ? 'text-warning' : 'text-accent'
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}

function QuickAction({ label, description, to }) {
  return (
    <Link
      to={to}
      className="bg-bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-colors group"
    >
      <div className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">{label}</div>
      <div className="text-[11px] text-text-muted mt-1">{description}</div>
    </Link>
  )
}

function StatusChip({ status }) {
  const styles = {
    draft: 'bg-bg-surface text-text-muted',
    scheduled: 'bg-accent/15 text-accent',
    published: 'bg-success/15 text-success',
    archived: 'bg-bg-surface text-text-muted',
  }
  return (
    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${styles[status] || styles.draft}`}>
      {status}
    </span>
  )
}
