import { supabase } from '@/lib/supabase'

/**
 * Email list CRUD + membership operations. List counts are maintained
 * via RPC-style refresh helper that's safe to call after any add/remove.
 */

export async function listLists({ pipelineOnly = false, propertyId } = {}) {
  let q = supabase
    .from('email_lists')
    .select('*')
    .order('created_at', { ascending: false })
  if (pipelineOnly) q = q.eq('is_pipeline_list', true)
  if (propertyId) q = q.eq('property_id', propertyId)
  const { data, error } = await q
  return error ? { lists: [], error: error.message } : { lists: data || [] }
}

export async function getList(id) {
  const { data, error } = await supabase.from('email_lists').select('*').eq('id', id).maybeSingle()
  return error ? { list: null, error: error.message } : { list: data }
}

export async function createList(fields, userId, propertyId) {
  const { data, error } = await supabase
    .from('email_lists')
    .insert({ ...fields, created_by: userId, property_id: propertyId })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, list: data }
}

export async function updateList(id, patch) {
  const { data, error } = await supabase
    .from('email_lists')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, list: data }
}

export async function deleteList(id) {
  const { error } = await supabase.from('email_lists').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function duplicateList(id) {
  const { data: original } = await supabase.from('email_lists').select('*').eq('id', id).single()
  if (!original) return { success: false, error: 'List not found' }
  const { id: _, created_at, updated_at, subscriber_count, active_count, unsubscribed_count, bounced_count, ...fields } = original
  fields.name = `${fields.name} (Copy)`
  const { data, error } = await supabase.from('email_lists').insert(fields).select().single()
  return error ? { success: false, error: error.message } : { success: true, list: data }
}

/** Add subscribers to a list. Idempotent — ignores conflicts. */
export async function addSubscribersToList(listId, subscriberIds, source = 'manual') {
  if (!subscriberIds || subscriberIds.length === 0) return { added: 0 }
  const rows = subscriberIds.map(sid => ({
    list_id: listId,
    subscriber_id: sid,
    source,
    status: 'active',
  }))
  // Upsert to handle duplicates gracefully
  const { data, error } = await supabase
    .from('email_list_subscribers')
    .upsert(rows, { onConflict: 'list_id,subscriber_id', ignoreDuplicates: true })
    .select()
  if (error) return { added: 0, error: error.message }
  await refreshListCounts(listId)
  return { added: data?.length || 0 }
}

export async function removeSubscribersFromList(listId, subscriberIds) {
  const { error } = await supabase
    .from('email_list_subscribers')
    .delete()
    .eq('list_id', listId)
    .in('subscriber_id', subscriberIds)
  if (error) return { success: false, error: error.message }
  await refreshListCounts(listId)
  return { success: true }
}

/**
 * Recalculate subscriber_count / active_count / etc for a list.
 * Called after any membership change. Cheap enough to run inline.
 */
export async function refreshListCounts(listId) {
  const { data: rows } = await supabase
    .from('email_list_subscribers')
    .select('subscriber_id, email_subscribers!inner(status)')
    .eq('list_id', listId)
  const total = rows?.length || 0
  let active = 0, unsubscribed = 0, bounced = 0
  ;(rows || []).forEach(r => {
    const status = r.email_subscribers?.status
    if (status === 'active') active++
    else if (status === 'unsubscribed') unsubscribed++
    else if (status === 'bounced') bounced++
  })
  await supabase
    .from('email_lists')
    .update({
      subscriber_count: total,
      active_count: active,
      unsubscribed_count: unsubscribed,
      bounced_count: bounced,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)
}

/** Global stats for the /dev/email/lists header. */
export async function getGlobalListStats() {
  const [lists, subs, active, unsub, bounced, pipelineSynced] = await Promise.all([
    supabase.from('email_lists').select('id', { count: 'exact', head: true }),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'bounced'),
    supabase.from('email_subscribers').select('id', { count: 'exact', head: true }).eq('crm_synced', true),
  ])
  return {
    totalLists: lists.count || 0,
    totalSubscribers: subs.count || 0,
    active: active.count || 0,
    unsubscribed: unsub.count || 0,
    bounced: bounced.count || 0,
    pipelineSynced: pipelineSynced.count || 0,
  }
}

/** Count of subscribers across all lists with is_recent_add=true. */
export async function getRecentAddsCount() {
  const { count } = await supabase
    .from('email_subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('is_recent_add', true)
  return count || 0
}

/**
 * Dynamic list evaluation — runs the saved dynamic_rules jsonb against
 * email_subscribers and returns matching rows without materializing.
 * Currently supports: {status, tags, industry, engagement_min, engagement_max}.
 */
export async function evaluateDynamicList(rules) {
  let q = supabase.from('email_subscribers').select('*')
  if (rules.status) q = q.eq('status', rules.status)
  if (rules.industry) q = q.eq('industry', rules.industry)
  if (rules.engagement_min != null) q = q.gte('engagement_score', rules.engagement_min)
  if (rules.engagement_max != null) q = q.lte('engagement_score', rules.engagement_max)
  if (rules.tags && rules.tags.length) q = q.contains('tags', rules.tags)
  const { data } = await q.limit(500)
  return data || []
}
