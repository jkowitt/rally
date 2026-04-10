import { supabase } from '@/lib/supabase'

// Cache settings for 30s to avoid hitting DB on every check
let cached = null
let cachedAt = 0
const TTL = 30000

// Categories that map to sub-system toggles
const CATEGORY_TO_FLAG = {
  email: 'email_sequences_enabled',
  trial: 'trial_nurture_enabled',
  upgrade: 'upgrade_prompts_enabled',
  operational: 'operational_tasks_enabled',
  social: 'social_scheduling_enabled',
  ad: 'ad_campaigns_enabled',
}

export async function getSettings() {
  if (cached && Date.now() - cachedAt < TTL) return cached
  const { data } = await supabase.from('automation_settings').select('*').limit(1).maybeSingle()
  cached = data || { master_automation_enabled: false }
  cachedAt = Date.now()
  return cached
}

export function invalidateCache() {
  cached = null
  cachedAt = 0
}

// Primary gate check — every automated action must call this first
export async function checkGate(category, eventType = null, payload = {}) {
  const settings = await getSettings()

  if (!settings.master_automation_enabled) {
    await logSkip(category, eventType, payload, 'master_disabled')
    return false
  }

  const flagKey = CATEGORY_TO_FLAG[category]
  if (flagKey && settings[flagKey] === false) {
    await logSkip(category, eventType, payload, 'category_disabled')
    return false
  }

  return true
}

async function logSkip(category, eventType, payload, reason) {
  try {
    await supabase.from('automation_log').insert({
      event_category: category,
      event_type: eventType || 'unknown',
      triggered_by: 'automation',
      status: 'skipped',
      payload: { ...payload, skip_reason: reason },
    })
  } catch {}
}

export async function logEvent(category, eventType, status, payload = {}, errorMessage = null) {
  try {
    await supabase.from('automation_log').insert({
      event_category: category,
      event_type: eventType,
      triggered_by: 'automation',
      status,
      payload,
      error_message: errorMessage,
      executed_at: status === 'sent' ? new Date().toISOString() : null,
      target_user_id: payload.user_id || null,
      target_email: payload.email || null,
    })
  } catch {}
}

export async function setMasterToggle(enabled, userId) {
  const timestamp = new Date().toISOString()
  const updates = {
    master_automation_enabled: enabled,
    last_updated_by: userId,
    updated_at: timestamp,
  }
  if (enabled) updates.automation_enabled_at = timestamp
  else updates.automation_disabled_at = timestamp

  // Upsert — there's always exactly one row
  const { data: existing } = await supabase.from('automation_settings').select('id').limit(1).maybeSingle()
  if (existing) {
    await supabase.from('automation_settings').update(updates).eq('id', existing.id)
  } else {
    await supabase.from('automation_settings').insert(updates)
  }
  invalidateCache()
}

export async function setSubToggle(flagKey, enabled, userId) {
  const { data: existing } = await supabase.from('automation_settings').select('id').limit(1).maybeSingle()
  const updates = { [flagKey]: enabled, last_updated_by: userId, updated_at: new Date().toISOString() }
  if (existing) {
    await supabase.from('automation_settings').update(updates).eq('id', existing.id)
  } else {
    await supabase.from('automation_settings').insert({ master_automation_enabled: false, ...updates })
  }
  invalidateCache()
}
