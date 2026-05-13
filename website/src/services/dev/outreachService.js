import { supabase } from '@/lib/supabase'

/**
 * Jason's personal Loud CRM outreach pipeline. This data is STRICTLY
 * isolated from customer CRM data — it's for his own BD prospecting and
 * never mixes with Van Wagner client records.
 */

export const OUTREACH_STATUSES = [
  'not_contacted',
  'contacted',
  'responded',
  'demo_scheduled',
  'trial_started',
  'converted',
  'not_interested',
]

export const OUTREACH_LABELS = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  responded: 'Responded',
  demo_scheduled: 'Demo Scheduled',
  trial_started: 'Trial Started',
  converted: 'Converted',
  not_interested: 'Not Interested',
}

export async function listProspects({ status, industry, search, limit = 200 } = {}) {
  let q = supabase
    .from('outlook_prospects')
    .select('*')
    .order('last_contacted_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (status && status !== 'all') q = q.eq('outreach_status', status)
  if (industry && industry !== 'all') q = q.eq('industry', industry)
  if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,organization.ilike.%${search}%`)
  const { data, error } = await q
  if (error) return { prospects: [], error: error.message }
  return { prospects: data || [] }
}

export async function getProspect(id) {
  const { data, error } = await supabase
    .from('outlook_prospects')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return error ? { prospect: null, error: error.message } : { prospect: data }
}

export async function createProspect(userId, fields) {
  const { data, error } = await supabase
    .from('outlook_prospects')
    .insert({ user_id: userId, ...fields })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, prospect: data }
}

export async function updateProspect(id, fields) {
  const { data, error } = await supabase
    .from('outlook_prospects')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, prospect: data }
}

export async function updateStatus(id, newStatus) {
  const patch = { outreach_status: newStatus, updated_at: new Date().toISOString() }
  if (newStatus === 'contacted') patch.last_contacted_at = new Date().toISOString()
  if (newStatus === 'converted') { patch.converted_to_paid = true; patch.converted_at = new Date().toISOString() }
  if (newStatus === 'trial_started') { patch.signed_up = true; patch.signed_up_at = new Date().toISOString() }
  return updateProspect(id, patch)
}

export async function deleteProspect(id) {
  const { error } = await supabase.from('outlook_prospects').delete().eq('id', id)
  return error ? { success: false, error: error.message } : { success: true }
}

/** Bulk CSV import. Expects array of { first_name, last_name, email, organization, industry, title?, linkedin_url?, notes? }. */
export async function bulkImport(userId, rows) {
  const summary = { added: 0, skipped: 0, failed: 0, errors: [] }
  if (!Array.isArray(rows) || rows.length === 0) return summary

  // Pull existing emails in one query to detect dupes
  const { data: existing } = await supabase
    .from('outlook_prospects')
    .select('email')
  const existingSet = new Set((existing || []).map(r => r.email.toLowerCase()))

  const toInsert = []
  for (const r of rows) {
    if (!r.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
      summary.failed++
      summary.errors.push({ email: r.email, reason: 'invalid email' })
      continue
    }
    if (existingSet.has(r.email.toLowerCase())) {
      summary.skipped++
      continue
    }
    toInsert.push({
      user_id: userId,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      organization: r.organization,
      industry: r.industry || 'conference_events',
      title: r.title || null,
      linkedin_url: r.linkedin_url || null,
      notes: r.notes || null,
    })
    existingSet.add(r.email.toLowerCase())
  }

  if (toInsert.length > 0) {
    const { error, data } = await supabase.from('outlook_prospects').insert(toInsert).select()
    if (error) {
      summary.failed += toInsert.length
      summary.errors.push({ reason: error.message })
    } else {
      summary.added = data?.length || 0
    }
  }
  return summary
}

/** Counts of prospects grouped by status — used for pipeline and analytics. */
export async function getStatusCounts() {
  const { data } = await supabase.from('outlook_prospects').select('outreach_status')
  const counts = Object.fromEntries(OUTREACH_STATUSES.map(s => [s, 0]))
  ;(data || []).forEach(r => { if (counts[r.outreach_status] !== undefined) counts[r.outreach_status]++ })
  return counts
}

/** Prospects with a follow-up due today or overdue. */
export async function getFollowUpQueue() {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('outlook_prospects')
    .select('*')
    .lte('follow_up_due', today)
    .in('outreach_status', ['contacted', 'responded'])
    .order('follow_up_due', { ascending: true })
  return data || []
}
