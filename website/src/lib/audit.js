import { supabase } from './supabase'

// Log an action to the audit trail
export async function logAudit({ action, entityType, entityId, entityName, changes, metadata }) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('audit_log').insert({
      user_id: user?.id || null,
      user_email: user?.email || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      entity_name: entityName || null,
      changes: changes || null,
      metadata: metadata || null,
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
