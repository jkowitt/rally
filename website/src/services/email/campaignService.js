import { supabase } from '@/lib/supabase'

/**
 * Campaign CRUD + recipient resolution + compliance validation.
 * Actual sending happens in the email-marketing-send edge function.
 */

export async function listCampaigns({ status, limit = 100 } = {}) {
  let q = supabase
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status && status !== 'all') q = q.eq('status', status)
  const { data, error } = await q
  return error ? { campaigns: [], error: error.message } : { campaigns: data || [] }
}

export async function getCampaign(id) {
  const { data, error } = await supabase.from('email_campaigns').select('*').eq('id', id).maybeSingle()
  return error ? { campaign: null, error: error.message } : { campaign: data }
}

export async function createCampaign(fields, userId, propertyId) {
  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({ ...fields, created_by: userId, property_id: propertyId, status: 'draft' })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, campaign: data }
}

export async function updateCampaign(id, patch) {
  const { data, error } = await supabase
    .from('email_campaigns')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, campaign: data }
}

export async function deleteCampaign(id) {
  const { error } = await supabase.from('email_campaigns').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

/**
 * Resolve a recipient list for a campaign: union of all list_ids, minus
 * exclude_list_ids, minus globally unsubscribed/bounced/complained, and
 * deduplicated by email.
 */
export async function resolveRecipients(campaign) {
  if (!campaign.list_ids || campaign.list_ids.length === 0) return []

  const { data: members } = await supabase
    .from('email_list_subscribers')
    .select('subscriber_id')
    .in('list_id', campaign.list_ids)
  const includeIds = new Set((members || []).map(m => m.subscriber_id))

  let excludeIds = new Set()
  if (campaign.exclude_list_ids?.length > 0) {
    const { data: exMembers } = await supabase
      .from('email_list_subscribers')
      .select('subscriber_id')
      .in('list_id', campaign.exclude_list_ids)
    excludeIds = new Set((exMembers || []).map(m => m.subscriber_id))
  }

  const finalIds = [...includeIds].filter(id => !excludeIds.has(id))
  if (finalIds.length === 0) return []

  // Apply segment filters + eligibility in one query
  let q = supabase
    .from('email_subscribers')
    .select('*')
    .in('id', finalIds)
    .eq('status', 'active')
    .eq('global_unsubscribe', false)

  const sf = campaign.segment_filters || {}
  if (sf.industry) q = q.eq('industry', sf.industry)
  if (sf.deal_stage) q = q.eq('deal_stage', sf.deal_stage)
  if (sf.engagement_min != null) q = q.gte('engagement_score', sf.engagement_min)
  if (sf.recent_adds_only) q = q.eq('is_recent_add', true)
  if (sf.crm_synced_only) q = q.eq('crm_synced', true)
  if (sf.tags && sf.tags.length) q = q.contains('tags', sf.tags)

  const { data } = await q
  return data || []
}

/**
 * CAN-SPAM + deliverability checklist. Returns { ok, issues[] }.
 * Blocks send if any `critical` issue exists.
 *
 * Important: the email-marketing-send edge function guarantees a
 * compliant unsubscribe footer + physical address at send time —
 * if a template doesn't include {{unsubscribe_url}}, the function
 * injects a fallback footer with the unsubscribe link AND the
 * physical address from the FROM_PHYSICAL_ADDRESS env var.
 *
 * Because of that safety net, the checks below are informational.
 * They're not blockers for sending.
 */
export function validateCampaign(campaign) {
  const issues = []

  // Hard blockers — no template can recover from these
  if (!campaign.subject_line?.trim()) issues.push({ critical: true, msg: 'Missing subject line' })
  if (!campaign.from_name?.trim()) issues.push({ critical: true, msg: 'Missing from name' })
  if (!campaign.from_email?.trim()) issues.push({ critical: true, msg: 'Missing from email' })
  if (!campaign.html_content?.trim()) issues.push({ critical: true, msg: 'Missing content' })
  if (!campaign.list_ids || campaign.list_ids.length === 0) issues.push({ critical: true, msg: 'No recipient lists selected' })

  // Soft warnings — the backend injects a compliant footer as a fallback,
  // so these don't block sending. They do encourage authors to include
  // the unsub link inline where design matters (top of footer, branded
  // button, etc).
  const html = campaign.html_content || ''
  if (!html.includes('{{unsubscribe_url}}')) {
    issues.push({
      critical: false,
      msg: 'Template is missing {{unsubscribe_url}} — an unsubscribe footer will be injected automatically, but you may prefer to place it yourself for design control',
    })
  }
  if (!html.match(/\b(street|ave|avenue|road|suite|boulevard|drive|lane|pkwy|\d{5}(-\d{4})?)\b/i)) {
    issues.push({
      critical: false,
      msg: 'No physical address detected — one will be appended from the FROM_PHYSICAL_ADDRESS env var. Set that in Supabase edge function secrets or include an address in your template',
    })
  }
  return { ok: !issues.some(i => i.critical), issues }
}

/**
 * Kick off a send. Writes pending campaign_sends rows for every recipient,
 * then invokes the email-marketing-send edge function which processes in batches.
 */
export async function sendCampaign(campaignId) {
  const { campaign } = await getCampaign(campaignId)
  if (!campaign) return { success: false, error: 'Campaign not found' }
  const validation = validateCampaign(campaign)
  if (!validation.ok) return { success: false, error: 'Validation failed', issues: validation.issues }

  const recipients = await resolveRecipients(campaign)
  if (recipients.length === 0) return { success: false, error: 'No eligible recipients' }

  // Pre-create pending send rows
  const sendRows = recipients.map(r => ({
    campaign_id: campaignId,
    subscriber_id: r.id,
    email: r.email,
    status: 'pending',
  }))
  await supabase.from('email_campaign_sends').insert(sendRows)

  await updateCampaign(campaignId, {
    status: 'sending',
    total_recipients: recipients.length,
    sent_at: new Date().toISOString(),
  })

  // Invoke edge function to process the queue
  const { data, error } = await supabase.functions.invoke('email-marketing-send', {
    body: { campaign_id: campaignId },
  })
  if (error) return { success: false, error: error.message }
  return { success: true, result: data, total: recipients.length }
}

export async function scheduleCampaign(campaignId, scheduledFor) {
  return updateCampaign(campaignId, { status: 'scheduled', scheduled_for: scheduledFor })
}

export async function pauseCampaign(campaignId) {
  return updateCampaign(campaignId, { status: 'paused' })
}

export async function cancelCampaign(campaignId) {
  return updateCampaign(campaignId, { status: 'cancelled' })
}

/** Rollup metrics for the campaign list header. */
export async function getGlobalCampaignStats() {
  const [total, draft, scheduled, sent] = await Promise.all([
    supabase.from('email_campaigns').select('id', { count: 'exact', head: true }),
    supabase.from('email_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('email_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase.from('email_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
  ])
  return {
    total: total.count || 0,
    draft: draft.count || 0,
    scheduled: scheduled.count || 0,
    sent: sent.count || 0,
  }
}
