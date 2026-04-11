import { supabase } from '@/lib/supabase'

/**
 * Deal velocity calculations derived from synced Outlook emails +
 * existing manual activities. Developer-only — consumed by /dev/*
 * views only. Does NOT touch the customer CRM code paths.
 *
 * Consuming the existing deal detail view with this data is done by
 * reading from here conditionally inside a DeveloperOnly wrapper, so
 * nothing leaks into the standard customer experience.
 */

/**
 * Compute touchpoint metrics for a single deal.
 * Returns null if the caller lacks access (RLS blocks the read).
 */
export async function getDealVelocity(dealId) {
  const { data: activities } = await supabase
    .from('activities')
    .select('id, activity_type, occurred_at')
    .eq('deal_id', dealId)
    .order('occurred_at', { ascending: true })
  if (!activities) return null

  const total = activities.length
  const now = Date.now()
  const last = total > 0 ? new Date(activities[total - 1].occurred_at).getTime() : null
  const daysSinceLast = last ? Math.floor((now - last) / 86400000) : null

  // Average gap between touchpoints
  let gapSum = 0, gapN = 0
  for (let i = 1; i < activities.length; i++) {
    const gap = (new Date(activities[i].occurred_at).getTime() - new Date(activities[i - 1].occurred_at).getTime()) / 86400000
    if (gap >= 0) { gapSum += gap; gapN++ }
  }
  const avgGapDays = gapN ? Math.round(gapSum / gapN) : null

  // Trend: compare last 30 days vs previous 30 days
  const last30 = activities.filter(a => (now - new Date(a.occurred_at).getTime()) / 86400000 <= 30).length
  const prev30 = activities.filter(a => {
    const age = (now - new Date(a.occurred_at).getTime()) / 86400000
    return age > 30 && age <= 60
  }).length
  let trend = 'stable'
  if (last30 > prev30 * 1.2) trend = 'increasing'
  else if (last30 < prev30 * 0.8) trend = 'declining'

  // Warning levels
  let warning = null
  if (daysSinceLast !== null) {
    if (daysSinceLast >= 21) warning = 'red'
    else if (daysSinceLast >= 14) warning = 'amber'
  }

  return {
    totalTouchpoints: total,
    avgGapDays,
    daysSinceLast,
    trend,
    warning,
  }
}

/**
 * List emails linked to a deal — surfaces Outlook-synced emails in the
 * deal timeline (developer-only consumers).
 */
export async function getDealEmails(dealId) {
  const { data } = await supabase
    .from('outlook_emails')
    .select('id, subject, body_preview, from_email, from_name, to_emails, is_sent, received_at, sent_at, has_attachments')
    .eq('linked_deal_id', dealId)
    .order('received_at', { ascending: false })
  return data || []
}
