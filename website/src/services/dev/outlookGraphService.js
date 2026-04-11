import { supabase } from '@/lib/supabase'

/**
 * Frontend wrapper around all Microsoft Graph API operations.
 * Every call is proxied through the `outlook-graph` Edge Function so
 * access tokens never leave the server.
 *
 * Every request re-verifies the developer role server-side (the edge
 * function returns 404 for non-developers, not 403).
 */

async function invoke(action, body = {}) {
  const { data, error } = await supabase.functions.invoke('outlook-graph', {
    body: { action, ...body },
  })
  if (error) return { success: false, error: error.message }
  return data
}

/** Get the connected user's Outlook profile (email, display name). */
export function getProfile() {
  return invoke('get_profile')
}

/** List messages from a folder. Default: last 50 from inbox. */
export function listMessages({ folder = 'inbox', top = 50, skip = 0 } = {}) {
  return invoke('list_messages', { folder, top, skip })
}

/** Fetch a single message with full body. */
export function getMessage(messageId) {
  return invoke('get_message', { messageId })
}

/** Run a delta sync — returns new/changed messages since last delta link. */
export function runDeltaSync() {
  return invoke('delta_sync')
}

/** Run a full sync of the last N days (default 90). */
export function runFullSync({ days = 90 } = {}) {
  return invoke('full_sync', { days })
}
