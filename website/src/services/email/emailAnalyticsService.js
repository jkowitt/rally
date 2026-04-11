import { supabase } from '@/lib/supabase'

/**
 * Dashboard analytics — 30-day rollups over campaigns, sends, and conversations.
 * Kept simple: one-shot queries, no caching — the data volume here is small.
 */

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export async function getDashboardMetrics() {
  const thirty = daysAgo(30)
  const sixty = daysAgo(60)

  // Sends in last 30 days
  const { data: sends30 } = await supabase
    .from('email_campaign_sends')
    .select('status, first_opened_at, clicked_at, replied_at')
    .gte('sent_at', thirty)
  const { data: sendsPrev } = await supabase
    .from('email_campaign_sends')
    .select('status')
    .gte('sent_at', sixty)
    .lt('sent_at', thirty)

  const total30 = (sends30 || []).length
  const delivered = (sends30 || []).filter(s => s.status === 'delivered' || s.status === 'sent').length
  const opens = (sends30 || []).filter(s => s.first_opened_at).length
  const clicks = (sends30 || []).filter(s => s.clicked_at).length
  const replies = (sends30 || []).filter(s => s.replied_at).length
  const bounces = (sends30 || []).filter(s => s.status === 'bounced').length

  const rate = (num, denom) => (denom > 0 ? (num / denom) * 100 : 0)

  // Subscribers
  const [totalSubs, newSubs30, unsub30, pipelineSynced30] = await Promise.all([
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).gte('created_at', thirty),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).gte('unsubscribed_at', thirty),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('crm_synced', true).gte('crm_synced_at', thirty),
  ])

  const { data: convStats } = await supabase
    .from('email_conversations')
    .select('status, unread_count')
  const openConversations = (convStats || []).filter(c => c.status === 'open').length
  const unreadConversations = (convStats || []).reduce((sum, c) => sum + (c.unread_count || 0), 0)

  return {
    totalSubscribers: totalSubs.count || 0,
    newSubscribers30: newSubs30.count || 0,
    unsubscribes30: unsub30.count || 0,
    netGrowth30: (newSubs30.count || 0) - (unsub30.count || 0),
    pipelineSynced30: pipelineSynced30.count || 0,
    emailsSent30: total30,
    emailsSentPrev30: sendsPrev?.length || 0,
    openRate: rate(opens, delivered).toFixed(1),
    clickRate: rate(clicks, delivered).toFixed(1),
    replyRate: rate(replies, delivered).toFixed(1),
    bounceRate: rate(bounces, total30).toFixed(1),
    openConversations,
    unreadConversations,
  }
}

export async function getTopCampaigns(limit = 5) {
  const { data } = await supabase
    .from('email_campaigns')
    .select('id, name, subject_line, total_recipients, open_rate, click_rate, reply_rate, sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getCampaignAnalytics(campaignId) {
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()
  if (!campaign) return null

  const { data: sends } = await supabase
    .from('email_campaign_sends')
    .select('status, first_opened_at, clicked_at, replied_at, open_count, click_count')
    .eq('campaign_id', campaignId)

  const total = sends?.length || 0
  const delivered = sends?.filter(s => s.status !== 'pending' && s.status !== 'failed').length || 0
  const opened = sends?.filter(s => s.first_opened_at).length || 0
  const clicked = sends?.filter(s => s.clicked_at).length || 0
  const replied = sends?.filter(s => s.replied_at).length || 0
  const bounced = sends?.filter(s => s.status === 'bounced').length || 0

  return {
    campaign,
    funnel: { total, delivered, opened, clicked, replied, bounced },
    totalOpens: sends?.reduce((sum, s) => sum + (s.open_count || 0), 0) || 0,
    totalClicks: sends?.reduce((sum, s) => sum + (s.click_count || 0), 0) || 0,
  }
}

/** Subscribers who replied to a specific campaign. */
export async function getCampaignReplies(campaignId) {
  const { data } = await supabase
    .from('email_conversations')
    .select('id, status, last_message_at, unread_count, email_subscribers(first_name, last_name, email, organization)')
    .eq('campaign_id', campaignId)
    .order('last_message_at', { ascending: false })
  return data || []
}
