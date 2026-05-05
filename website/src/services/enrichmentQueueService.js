import { supabase } from '@/lib/supabase'

/**
 * Read + materialize helpers for the enrichment_queue table.
 * Inserts go through the `bulk_enqueue_for_enrichment` RPC
 * (see migration 084) — that path is used directly by the import
 * modal because it batches hundreds of rows in a single round-trip.
 */

export const STATUSES = [
  'pending',
  'enriching',
  'enriched',
  'failed',
  'cancelled',
  'materialized',
]

export const ENRICHMENT_MODES = [
  { key: 'claude', label: 'Claude (free)' },
  { key: 'apollo', label: 'Apollo (paid)' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'none',   label: 'No enrichment' },
]

export async function listQueue({ propertyId, status = 'all', kind = 'all', limit = 500 } = {}) {
  if (!propertyId) return { rows: [] }
  let q = supabase
    .from('enrichment_queue')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status && status !== 'all') q = q.eq('status', status)
  if (kind && kind !== 'all') q = q.eq('kind', kind)
  const { data, error } = await q
  return error ? { rows: [], error: error.message } : { rows: data || [] }
}

export async function queueStats(propertyId) {
  if (!propertyId) return { total: 0, pending: 0, enriched: 0, failed: 0, materialized: 0 }
  const { data } = await supabase
    .from('enrichment_queue')
    .select('status')
    .eq('property_id', propertyId)
  const rows = data || []
  return {
    total: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    enriching: rows.filter(r => r.status === 'enriching').length,
    enriched: rows.filter(r => r.status === 'enriched').length,
    failed: rows.filter(r => r.status === 'failed').length,
    materialized: rows.filter(r => r.status === 'materialized').length,
  }
}

export async function deleteRow(id) {
  const { error } = await supabase.from('enrichment_queue').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function cancelRow(id) {
  const { error } = await supabase
    .from('enrichment_queue')
    .update({ status: 'cancelled' })
    .eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function retryRow(id) {
  const { error } = await supabase
    .from('enrichment_queue')
    .update({ status: 'pending', last_error: null })
    .eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function runEnrichment(propertyId) {
  const { data, error } = await supabase.functions.invoke('bulk-enrichment-runner', {
    body: { property_id: propertyId },
  })
  return error ? { success: false, error: error.message } : { success: true, ...data }
}

// Take an enriched queue row and create a real deal (kind='company')
// or contact (kind='contact'). The queue row is then marked
// 'materialized' so it stops appearing in the unfinished list.
export async function materialize(row) {
  if (!row?.id || row.status === 'materialized') {
    return { success: false, error: 'Row is already materialized.' }
  }

  const enriched = row.enriched_data || {}

  if (row.kind === 'company') {
    const payload = {
      property_id: row.property_id,
      brand_name: row.brand_name || enriched.brand_name || enriched.company_name || 'Unknown',
      stage: 'Prospect',
      website: row.website || enriched.website || null,
      industry: enriched.industry || null,
      employee_count: enriched.employee_count || null,
      annual_revenue: enriched.annual_revenue || null,
      hq_location: enriched.hq_location || null,
      description: enriched.description || null,
    }
    const { data, error } = await supabase
      .from('deals')
      .insert(payload)
      .select('id')
      .single()
    if (error) return { success: false, error: error.message }
    await supabase
      .from('enrichment_queue')
      .update({
        status: 'materialized',
        materialized_deal_id: data.id,
        materialized_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    return { success: true, dealId: data.id }
  }

  // contact
  const fullName = row.contact_name || enriched.full_name || ''
  const [first, ...rest] = fullName.split(/\s+/)
  const payload = {
    property_id: row.property_id,
    first_name: first || null,
    last_name: rest.join(' ') || null,
    email: row.contact_email || enriched.email || null,
    phone: row.contact_phone || enriched.phone || null,
    title: enriched.title || null,
    company: row.brand_name || enriched.company_name || null,
    linkedin_url: row.linkedin_url || enriched.linkedin_url || null,
  }
  const { data, error } = await supabase
    .from('contacts')
    .insert(payload)
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  await supabase
    .from('enrichment_queue')
    .update({
      status: 'materialized',
      materialized_contact_id: data.id,
      materialized_at: new Date().toISOString(),
    })
    .eq('id', row.id)
  return { success: true, contactId: data.id }
}
