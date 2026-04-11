import { supabase } from '@/lib/supabase'
import { logEvent } from './subscriberService'
import { addSubscribersToList, refreshListCounts } from './emailListService'

/**
 * Pipeline → Email Marketing sync.
 *
 * Rules:
 *  - Idempotent: running twice for the same contact is safe.
 *  - Never re-subscribes a globally unsubscribed email.
 *  - Updates CRM fields on existing subscribers (deal_stage, deal_value, etc).
 *  - Marks newly-synced subscribers with is_recent_add = true.
 *  - Respects pipeline_sync_settings filters (deal_stage, industry).
 */

export async function getSyncSettings(propertyId) {
  const { data } = await supabase
    .from('pipeline_sync_settings')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle()
  if (data) return data
  // Create default row
  const { data: created } = await supabase
    .from('pipeline_sync_settings')
    .insert({ property_id: propertyId })
    .select()
    .single()
  return created
}

export async function updateSyncSettings(propertyId, patch) {
  const { data, error } = await supabase
    .from('pipeline_sync_settings')
    .upsert({ property_id: propertyId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'property_id' })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, settings: data }
}

/**
 * Sync a single contact. Returns the action taken and optional skip reason.
 * Core building block — used by auto sync, manual sync, and bulk sync.
 */
export async function syncContact(contactId, { syncType = 'manual', syncedBy = null, targetListIds = null } = {}) {
  // Load contact with its deal if present
  const { data: contact } = await supabase
    .from('contacts')
    .select('*, deals(id, stage, value, brand_name)')
    .eq('id', contactId)
    .maybeSingle()

  if (!contact) return await logAndReturn(contactId, null, 'skipped', 'contact_not_found', syncType, syncedBy)

  if (!contact.email) return await logAndReturn(contactId, null, 'skipped', 'no_email', syncType, syncedBy)

  // Check global suppression
  const { data: suppressed } = await supabase
    .from('email_suppression_list')
    .select('email')
    .ilike('email', contact.email)
    .maybeSingle()
  if (suppressed) return await logAndReturn(contactId, null, 'skipped', 'globally_unsubscribed', syncType, syncedBy)

  // Load settings for this contact's property
  const settings = await getSyncSettings(contact.property_id)

  // Apply filters
  if (!settings.sync_all_contacts) {
    if (settings.sync_by_deal_stage?.length > 0 && !settings.sync_by_deal_stage.includes(contact.deals?.stage)) {
      return await logAndReturn(contactId, null, 'skipped', 'deal_stage_excluded', syncType, syncedBy)
    }
  }

  // Does a subscriber already exist for this email?
  const { data: existing } = await supabase
    .from('email_subscribers')
    .select('*')
    .ilike('email', contact.email)
    .maybeSingle()

  // Never override an unsubscribed subscriber
  if (existing?.global_unsubscribe || existing?.status === 'unsubscribed') {
    return await logAndReturn(contactId, existing?.id, 'skipped', 'subscriber_unsubscribed', syncType, syncedBy)
  }

  const subscriberPatch = {
    first_name: contact.first_name,
    last_name: contact.last_name,
    organization: contact.company,
    title: contact.position,
    phone: contact.phone,
    linkedin_url: contact.linkedin,
    crm_contact_id: contact.id,
    crm_synced: true,
    crm_synced_at: new Date().toISOString(),
    crm_sync_source: syncType,
    deal_stage: contact.deals?.stage || null,
    deal_value: contact.deals?.value || null,
    property_id: contact.property_id,
    is_recent_add: true,
    recent_add_flagged_at: new Date().toISOString(),
    recent_add_cleared_at: null,
    updated_at: new Date().toISOString(),
  }

  let subscriberId
  let action

  if (existing) {
    await supabase.from('email_subscribers').update(subscriberPatch).eq('id', existing.id)
    subscriberId = existing.id
    action = 'updated'
  } else {
    const { data: created, error } = await supabase
      .from('email_subscribers')
      .insert({
        ...subscriberPatch,
        email: contact.email.toLowerCase(),
        source: 'pipeline_sync',
        status: 'active',
      })
      .select()
      .single()
    if (error) return await logAndReturn(contactId, null, 'skipped', error.message, syncType, syncedBy)
    subscriberId = created.id
    action = 'created'
  }

  // Add to target lists
  const listIds = targetListIds || settings.auto_sync_target_list_ids || []
  if (listIds.length > 0) {
    await addSubscribersToList(listIds[0], [subscriberId], 'pipeline_sync')
    // If multiple lists, add to each
    for (const lid of listIds.slice(1)) {
      await addSubscribersToList(lid, [subscriberId], 'pipeline_sync')
    }
  }

  await logEvent(subscriberId, 'pipeline_synced', { contactId, syncType })
  return await logAndReturn(contactId, subscriberId, action, null, syncType, syncedBy)
}

async function logAndReturn(contactId, subscriberId, action, skipReason, syncType, syncedBy) {
  await supabase.from('pipeline_sync_log').insert({
    contact_id: contactId,
    subscriber_id: subscriberId,
    action,
    skip_reason: skipReason,
    sync_type: syncType,
    synced_by: syncedBy,
  })
  return { action, skipReason, subscriberId }
}

/** Bulk sync — processes in batches, reports progress via callback. */
export async function bulkSync(contactIds, options, onProgress) {
  const results = { created: 0, updated: 0, skipped: 0, errors: [] }
  const batchSize = 25
  for (let i = 0; i < contactIds.length; i += batchSize) {
    const batch = contactIds.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(id => syncContact(id, { syncType: 'bulk', ...options }))
    )
    batchResults.forEach(r => {
      if (r.action === 'created') results.created++
      else if (r.action === 'updated') results.updated++
      else results.skipped++
      if (r.skipReason) results.errors.push({ contactId: r.contactId, reason: r.skipReason })
    })
    onProgress?.(i + batch.length, contactIds.length)
  }

  // Refresh list counts for affected lists
  const listIds = options?.targetListIds || []
  for (const lid of listIds) await refreshListCounts(lid)

  // Update last_bulk_sync_at
  if (options?.propertyId) {
    await updateSyncSettings(options.propertyId, {
      last_bulk_sync_at: new Date().toISOString(),
      total_synced: (await getSyncSettings(options.propertyId)).total_synced + results.created,
    })
  }
  return results
}

/** Fetch CRM contacts that have NOT yet been synced to email marketing. */
export async function getUnsynced({ propertyId, dealStage, industry, limit = 500 } = {}) {
  // Get all crm contact ids currently in email_subscribers
  const { data: synced } = await supabase
    .from('email_subscribers')
    .select('crm_contact_id')
    .not('crm_contact_id', 'is', null)
  const syncedIds = new Set((synced || []).map(r => r.crm_contact_id))

  let q = supabase
    .from('contacts')
    .select('id, first_name, last_name, email, company, position, created_at, deals(id, stage, value, brand_name)')
    .not('email', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (propertyId) q = q.eq('property_id', propertyId)
  const { data } = await q
  return (data || []).filter(c => !syncedIds.has(c.id))
}

/** Recent sync log for dashboard. */
export async function getRecentSyncLog(limit = 50) {
  const { data } = await supabase
    .from('pipeline_sync_log')
    .select('*, contacts(first_name, last_name, email, company)')
    .order('synced_at', { ascending: false })
    .limit(limit)
  return data || []
}

/** Drain the pipeline_sync_queue (populated by DB trigger on contacts insert). */
export async function drainSyncQueue(limit = 100) {
  const { data: queued } = await supabase
    .from('pipeline_sync_queue')
    .select('*')
    .is('processed_at', null)
    .order('enqueued_at', { ascending: true })
    .limit(limit)

  const results = { processed: 0, skipped: 0 }
  for (const q of queued || []) {
    await syncContact(q.contact_id, { syncType: 'auto' })
    await supabase
      .from('pipeline_sync_queue')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', q.id)
    results.processed++
  }
  return results
}
