import { supabase } from '@/lib/supabase'

/**
 * Subscriber CRUD + filtering + recent-add management.
 */

export const STATUSES = ['active', 'unsubscribed', 'bounced', 'complained', 'cleaned']

export async function listSubscribers({
  status,
  source,
  search,
  recentAddsOnly,
  crmSyncedOnly,
  dealStage,
  listId,
  limit = 200,
  offset = 0,
} = {}) {
  let q = supabase
    .from('email_subscribers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (status && status !== 'all') q = q.eq('status', status)
  if (source && source !== 'all') q = q.eq('source', source)
  if (recentAddsOnly) q = q.eq('is_recent_add', true)
  if (crmSyncedOnly === true) q = q.eq('crm_synced', true)
  if (crmSyncedOnly === false) q = q.eq('crm_synced', false)
  if (dealStage) q = q.eq('deal_stage', dealStage)
  if (search) {
    q = q.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,organization.ilike.%${search}%`)
  }
  if (listId) {
    // Filter by list membership
    const { data: members } = await supabase
      .from('email_list_subscribers')
      .select('subscriber_id')
      .eq('list_id', listId)
    const ids = (members || []).map(m => m.subscriber_id)
    if (ids.length === 0) return { subscribers: [], total: 0 }
    q = q.in('id', ids)
  }
  const { data, error, count } = await q
  return error ? { subscribers: [], total: 0, error: error.message } : { subscribers: data || [], total: count || 0 }
}

export async function getSubscriber(id) {
  const { data, error } = await supabase.from('email_subscribers').select('*').eq('id', id).maybeSingle()
  return error ? { subscriber: null, error: error.message } : { subscriber: data }
}

export async function getSubscriberByEmail(email) {
  const { data } = await supabase
    .from('email_subscribers')
    .select('*')
    .ilike('email', email)
    .maybeSingle()
  return data
}

export async function createSubscriber(fields, propertyId) {
  const { data, error } = await supabase
    .from('email_subscribers')
    .insert({ ...fields, property_id: propertyId })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  await logEvent(data.id, 'subscribed', { source: fields.source || 'manual' })
  return { success: true, subscriber: data }
}

export async function updateSubscriber(id, patch) {
  const { data, error } = await supabase
    .from('email_subscribers')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, subscriber: data }
}

export async function deleteSubscriber(id) {
  const { error } = await supabase.from('email_subscribers').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

/** Mark a subscriber (or list) as unsubscribed. Also adds to suppression list. */
export async function unsubscribe(id, reason = 'user_request') {
  const { data: sub } = await supabase.from('email_subscribers').select('email').eq('id', id).single()
  await supabase
    .from('email_subscribers')
    .update({
      status: 'unsubscribed',
      global_unsubscribe: true,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (sub?.email) {
    await supabase
      .from('email_suppression_list')
      .upsert({ email: sub.email.toLowerCase(), reason: 'unsubscribed' }, { onConflict: 'email' })
  }
  await logEvent(id, 'unsubscribed', { reason })
}

/** Clear is_recent_add for all currently-flagged subscribers. */
export async function clearRecentAddFlags(subscriberIds = null) {
  const patch = {
    is_recent_add: false,
    recent_add_cleared_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  let q = supabase.from('email_subscribers').update(patch)
  if (subscriberIds && subscriberIds.length > 0) q = q.in('id', subscriberIds)
  else q = q.eq('is_recent_add', true)
  const { error } = await q
  return error ? { success: false, error: error.message } : { success: true }
}

/** Log an event to email_subscriber_events. */
export async function logEvent(subscriberId, eventType, metadata = {}, campaignId = null) {
  await supabase.from('email_subscriber_events').insert({
    subscriber_id: subscriberId,
    event_type: eventType,
    campaign_id: campaignId,
    metadata,
  })
}

/**
 * Update engagement score based on recent events. Formula:
 *   +20 opened (30d), +10 opened (60d), +5 opened (90d)
 *   +30 clicked (30d), +15 clicked (60d), +8 clicked (90d)
 *   +40 replied (30d), +25 replied (60d), +10 replied (90d)
 * Caps at 100.
 */
export async function recalculateEngagement(subscriberId) {
  const { data: sub } = await supabase
    .from('email_subscribers')
    .select('last_opened_at, last_clicked_at, last_replied_at')
    .eq('id', subscriberId)
    .single()
  if (!sub) return 0

  const daysSince = (ts) => ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86400000) : 999

  let score = 0
  const openDays = daysSince(sub.last_opened_at)
  if (openDays <= 30) score += 20
  else if (openDays <= 60) score += 10
  else if (openDays <= 90) score += 5

  const clickDays = daysSince(sub.last_clicked_at)
  if (clickDays <= 30) score += 30
  else if (clickDays <= 60) score += 15
  else if (clickDays <= 90) score += 8

  const replyDays = daysSince(sub.last_replied_at)
  if (replyDays <= 30) score += 40
  else if (replyDays <= 60) score += 25
  else if (replyDays <= 90) score += 10

  score = Math.min(100, score)
  await supabase
    .from('email_subscribers')
    .update({ engagement_score: score })
    .eq('id', subscriberId)
  return score
}

export function engagementSegment(score) {
  if (score >= 80) return { label: 'Champion', color: 'success' }
  if (score >= 60) return { label: 'Engaged', color: 'accent' }
  if (score >= 40) return { label: 'Responsive', color: 'accent' }
  if (score >= 20) return { label: 'Passive', color: 'warning' }
  return { label: 'Dormant', color: 'danger' }
}

/** Events for a single subscriber — used in detail view. */
export async function getSubscriberEvents(subscriberId, limit = 50) {
  const { data } = await supabase
    .from('email_subscriber_events')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .order('occurred_at', { ascending: false })
    .limit(limit)
  return data || []
}

/** Lists a subscriber belongs to. */
export async function getSubscriberLists(subscriberId) {
  const { data } = await supabase
    .from('email_list_subscribers')
    .select('list_id, subscribed_at, status, email_lists!inner(name, list_type)')
    .eq('subscriber_id', subscriberId)
  return data || []
}
