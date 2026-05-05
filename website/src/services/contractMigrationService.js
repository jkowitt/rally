import { supabase } from '@/lib/supabase'

/**
 * Bulk contract migration orchestration.
 *
 * Flow:
 *   1. createSession — user drops N files → session + file rows created
 *   2. uploadFile — each file uploaded to storage bucket (one at a time)
 *   3. startProcessing — user clicks "Extract All", session → 'processing'
 *   4. (edge function processes batch, writes extracted_data + benefits)
 *   5. User reviews in UI, approves/edits/rejects each benefit
 *   6. finalizeSession — creates deals / contacts / contracts / assets /
 *      fulfillment_records in the main CRM tables
 */

const BUCKET = 'contract-migrations'

// ─── Session lifecycle ──────────────────────────────────────
export async function createSession(userId, propertyId) {
  const { data, error } = await supabase
    .from('contract_migration_sessions')
    .insert({
      user_id: userId,
      property_id: propertyId,
      status: 'uploading',
    })
    .select()
    .single()
  return error ? { success: false, error: error.message } : { success: true, session: data }
}

export async function getSession(sessionId) {
  const { data, error } = await supabase
    .from('contract_migration_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  return error ? { session: null, error: error.message } : { session: data }
}

export async function updateSession(sessionId, patch) {
  const { error } = await supabase
    .from('contract_migration_sessions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
  return error ? { success: false, error: error.message } : { success: true }
}

// ─── File upload + queue ────────────────────────────────────
export async function uploadFile(sessionId, propertyId, file) {
  // Upload to storage
  const path = `${propertyId}/${sessionId}/${Date.now()}_${file.name}`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type })

  // If bucket doesn't exist, create the file row anyway so the UI can
  // still show the queue — the edge function will retry
  let fileUrl = null
  if (!upErr) {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    fileUrl = urlData?.publicUrl || null
  }

  const { data, error } = await supabase
    .from('contract_migration_files')
    .insert({
      session_id: sessionId,
      property_id: propertyId,
      original_filename: file.name,
      storage_path: path,
      file_url: fileUrl,
      file_type: file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf',
      file_size_bytes: file.size,
      status: upErr ? 'failed' : 'queued',
      error_message: upErr?.message || null,
    })
    .select()
    .single()

  return error ? { success: false, error: error.message } : { success: true, file: data }
}

export async function listFiles(sessionId) {
  const { data } = await supabase
    .from('contract_migration_files')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  return data || []
}

export async function deleteFile(fileId) {
  const { error } = await supabase
    .from('contract_migration_files')
    .delete()
    .eq('id', fileId)
  return error ? { success: false, error: error.message } : { success: true }
}

// ─── Processing ─────────────────────────────────────────────
export async function startProcessing(sessionId) {
  const files = await listFiles(sessionId)
  const queued = files.filter(f => f.status === 'queued')
  if (queued.length === 0) return { success: false, error: 'No files queued' }

  await updateSession(sessionId, {
    status: 'processing',
    total_contracts: files.length,
    started_at: new Date().toISOString(),
  })

  // Kick off the edge function — runs async, we just trigger
  const { data, error } = await supabase.functions.invoke('process-contract-batch', {
    body: { session_id: sessionId },
  })
  if (error) return { success: false, error: error.message }
  return { success: true, result: data }
}

// Flip every failed file back to queued and re-run the batch. Useful
// when a transient Anthropic error or storage glitch took out a few
// contracts mid-batch and the user just wants to retry them.
export async function retryFailed(sessionId) {
  const { error: updErr } = await supabase
    .from('contract_migration_files')
    .update({ status: 'queued', error_message: null, retry_count: 0 })
    .eq('session_id', sessionId)
    .eq('status', 'failed')
  if (updErr) return { success: false, error: updErr.message }
  await updateSession(sessionId, { status: 'processing' })
  const { data, error } = await supabase.functions.invoke('process-contract-batch', {
    body: { session_id: sessionId },
  })
  if (error) return { success: false, error: error.message }
  return { success: true, result: data }
}

// ─── Benefits review ────────────────────────────────────────
export async function listBenefits(sessionId, { reviewStatus, fileId } = {}) {
  let q = supabase
    .from('contract_migration_benefits')
    .select('*, assets(name, category)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (reviewStatus) q = q.eq('review_status', reviewStatus)
  if (fileId) q = q.eq('file_id', fileId)
  const { data, error } = await q
  return error ? { benefits: [], error: error.message } : { benefits: data || [] }
}

export async function updateBenefit(benefitId, patch, userId) {
  const { error } = await supabase
    .from('contract_migration_benefits')
    .update({
      ...patch,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', benefitId)
  return error ? { success: false, error: error.message } : { success: true }
}

export async function approveHighConfidence(sessionId, threshold = 85) {
  const { data, error } = await supabase
    .from('contract_migration_benefits')
    .update({ review_status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('review_status', 'pending')
    .gte('extracted_confidence', threshold)
    .select('id')
  return { approved: data?.length || 0, error: error?.message }
}

export async function bulkUpdateBenefits(benefitIds, patch, userId) {
  const { error } = await supabase
    .from('contract_migration_benefits')
    .update({
      ...patch,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .in('id', benefitIds)
  return error ? { success: false, error: error.message } : { success: true }
}

// ─── Sponsors (duplicate resolution) ────────────────────────
export async function listSponsors(sessionId) {
  const { data } = await supabase
    .from('contract_migration_sponsors')
    .select('*, contacts!duplicate_of_contact_id(first_name, last_name, email, company)')
    .eq('session_id', sessionId)
  return data || []
}

export async function updateSponsor(sponsorId, patch) {
  const { error } = await supabase
    .from('contract_migration_sponsors')
    .update(patch)
    .eq('id', sponsorId)
  return error ? { success: false, error: error.message } : { success: true }
}

// ─── Finalization ───────────────────────────────────────────
export async function finalizeSession(sessionId) {
  const { data, error } = await supabase.functions.invoke('finalize-migration', {
    body: { session_id: sessionId },
  })
  if (error) return { success: false, error: error.message }
  return { success: true, result: data }
}

// ─── Stats ──────────────────────────────────────────────────
export async function getSessionStats(sessionId) {
  const [session, files, benefits, sponsors] = await Promise.all([
    getSession(sessionId),
    listFiles(sessionId),
    listBenefits(sessionId),
    listSponsors(sessionId),
  ])
  const byStatus = {
    queued: files.filter(f => f.status === 'queued').length,
    processing: files.filter(f => f.status === 'processing').length,
    complete: files.filter(f => f.status === 'complete').length,
    failed: files.filter(f => f.status === 'failed').length,
  }
  const benefitCounts = {
    total: benefits.benefits?.length || 0,
    pending: benefits.benefits?.filter(b => b.review_status === 'pending').length || 0,
    approved: benefits.benefits?.filter(b => b.review_status === 'approved').length || 0,
    rejected: benefits.benefits?.filter(b => b.review_status === 'rejected').length || 0,
    autoMatched: benefits.benefits?.filter(b => b.asset_match_status === 'auto_matched').length || 0,
    needsReview: benefits.benefits?.filter(b => b.asset_match_confidence < 80).length || 0,
  }
  return {
    session: session.session,
    files,
    byStatus,
    benefits: benefits.benefits || [],
    benefitCounts,
    sponsors,
  }
}

// ─── Deduplication (sponsor + asset) ────────────────────────
export async function detectDuplicateSponsors(sessionId, propertyId) {
  const sponsors = await listSponsors(sessionId)
  const { data: existingContacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, company')
    .eq('property_id', propertyId)

  for (const s of sponsors) {
    if (!s.extracted_email && !s.extracted_name) continue
    const match = (existingContacts || []).find(c => {
      if (s.extracted_email && c.email && c.email.toLowerCase() === s.extracted_email.toLowerCase()) {
        return true
      }
      if (s.extracted_name && c.company && nameSimilarity(s.extracted_name, c.company) > 0.85) {
        return true
      }
      return false
    })
    if (match && !s.duplicate_of_contact_id) {
      await updateSponsor(s.id, {
        duplicate_of_contact_id: match.id,
        merge_status: 'conflict',
      })
    }
  }
}

/** Jaccard-ish name similarity — 0 to 1. */
export function nameSimilarity(a, b) {
  if (!a || !b) return 0
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return 1
  if (na.length === 0 || nb.length === 0) return 0
  // Simple character bigram Jaccard
  const bigrams = s => {
    const set = new Set()
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
    return set
  }
  const ba = bigrams(na)
  const bb = bigrams(nb)
  const intersection = new Set([...ba].filter(x => bb.has(x)))
  const union = new Set([...ba, ...bb])
  return union.size === 0 ? 0 : intersection.size / union.size
}

/** Match a benefit against existing assets + return best candidate. */
export async function matchBenefitToAsset(benefitName, benefitCategory, propertyId) {
  const { data: assets } = await supabase
    .from('assets')
    .select('id, name, category')
    .eq('property_id', propertyId)
  if (!assets || assets.length === 0) return { asset: null, confidence: 0 }

  let best = { asset: null, confidence: 0 }
  for (const a of assets) {
    const nameSim = nameSimilarity(benefitName, a.name)
    const catBonus = benefitCategory && a.category === benefitCategory ? 0.15 : 0
    const conf = Math.min(1, nameSim + catBonus)
    if (conf > best.confidence) best = { asset: a, confidence: conf }
  }
  return best
}
