import { supabase } from './supabase'

// Read impersonation state from the same localStorage key the
// useImpersonation hook writes to. Logging from outside React, so
// we can't use the hook directly.
function readImpersonationState() {
  try {
    const raw = localStorage.getItem('ll_impersonation')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.industry && !parsed.role && !parsed.tier) return null
    return parsed
  } catch {
    return null
  }
}

// Log an action to the audit trail. If the developer is currently
// impersonating, augments metadata with the impersonation context
// so the trail records "developer X did Y while previewing as rep".
export async function logAudit({ action, entityType, entityId, entityName, changes, metadata }) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const impersonation = readImpersonationState()
    const enrichedMetadata = impersonation
      ? { ...(metadata || {}), impersonation }
      : metadata || null
    await supabase.from('audit_log').insert({
      user_id: user?.id || null,
      user_email: user?.email || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      entity_name: entityName || null,
      changes: changes || null,
      metadata: enrichedMetadata,
    })
  } catch { /* audit logging should never block the main flow */ }
}

// Log a login event with IP and user agent
export async function logLogin(userId, email, success = true) {
  try {
    await supabase.from('login_history').insert({
      user_id: userId,
      email,
      user_agent: navigator.userAgent,
      success,
    })
  } catch { /* non-blocking */ }
}
