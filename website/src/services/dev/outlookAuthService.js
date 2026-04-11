import { supabase } from '@/lib/supabase'

/**
 * Developer-only Outlook OAuth flow.
 *
 * Access tokens NEVER touch the browser. The frontend only:
 *  - constructs the Microsoft consent URL (client_id is a public value)
 *  - forwards the authorization code to the outlook-auth Edge Function
 *    which exchanges it for tokens server-side and stores them encrypted
 *  - reads `outlook_auth` rows for connection status (no tokens)
 *
 * RLS ensures only the developer role can read any of these rows.
 */

const OUTLOOK_AUTHORITY = 'https://login.microsoftonline.com'
const OUTLOOK_SCOPES = [
  'offline_access',
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'Contacts.Read',
  'Contacts.ReadWrite',
  'Calendars.Read',
  'User.Read',
].join(' ')

/**
 * Build the Microsoft OAuth consent URL and redirect to it.
 */
export function startOAuthFlow({ clientId, tenantId = 'common', redirectUri, state }) {
  if (!clientId) throw new Error('OUTLOOK_CLIENT_ID not configured')
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: OUTLOOK_SCOPES,
    state: state || crypto.randomUUID(),
    prompt: 'select_account',
  })
  const url = `${OUTLOOK_AUTHORITY}/${tenantId}/oauth2/v2.0/authorize?${params}`
  // Persist state for CSRF check on callback
  sessionStorage.setItem('outlook_oauth_state', params.get('state'))
  window.location.href = url
}

/**
 * Called by the callback page. Sends the authorization code to the
 * outlook-auth Edge Function for server-side token exchange.
 */
export async function exchangeCodeForTokens({ code, state }) {
  const savedState = sessionStorage.getItem('outlook_oauth_state')
  sessionStorage.removeItem('outlook_oauth_state')
  if (!savedState || savedState !== state) {
    return { success: false, error: 'Invalid OAuth state (possible CSRF)' }
  }
  const { data, error } = await supabase.functions.invoke('outlook-auth', {
    body: { action: 'exchange_code', code },
  })
  if (error) return { success: false, error: error.message }
  return data
}

/**
 * Read current connection status. Returns null if not connected or
 * if the caller isn't a developer (RLS blocks the read).
 */
export async function getConnectionStatus() {
  const { data, error } = await supabase
    .from('outlook_auth')
    .select('outlook_email, outlook_display_name, is_connected, connected_at, last_synced_at, token_expires_at')
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  const now = Date.now()
  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0
  const minutesToExpiry = (expiresAt - now) / 60000
  let health = 'disconnected'
  if (data.is_connected) {
    health = minutesToExpiry < 5 ? 'expiring' : 'healthy'
  }
  return { ...data, health }
}

/**
 * Disconnect — clears tokens server-side. Does NOT delete emails already synced.
 */
export async function disconnect() {
  const { data, error } = await supabase.functions.invoke('outlook-auth', {
    body: { action: 'disconnect' },
  })
  if (error) return { success: false, error: error.message }
  return data
}

/**
 * Force a token refresh now. Used by the "Re-authenticate" button.
 */
export async function forceRefresh() {
  const { data, error } = await supabase.functions.invoke('outlook-auth', {
    body: { action: 'refresh_token' },
  })
  if (error) return { success: false, error: error.message }
  return data
}
