import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

// Live count of unread emails for the current user across both
// providers (outlook_emails + gmail_emails are unioned by the
// email_messages_unified view from migration 072). Subscribes to
// inserts/updates on the underlying tables so the badge in the
// sidebar updates within a couple seconds of the delta-sync cron
// landing a new message.
//
// Also fires a desktop notification (when permission granted) for
// every newly-arrived inbound message so the rep sees something
// pop in the OS even if the tab isn't focused.

// Disabled by default while we investigate a site-wide flicker /
// render-loop. Sidebar dot, bell entry, and desktop popups all
// silently no-op until VITE_ENABLE_UNREAD_EMAILS=true. Re-enable
// once the publication / loop issue is confirmed clean.
const DISABLED =
  typeof import.meta === 'undefined'
  // @ts-ignore — Vite injects env at build time
  || import.meta.env?.VITE_ENABLE_UNREAD_EMAILS !== 'true'

export interface UseUnreadEmailsAPI {
  count: number
  refresh: () => Promise<void>
}

export function useUnreadEmails(): UseUnreadEmailsAPI {
  const { profile } = useAuth()
  const [count, setCount] = useState(0)
  const lastSeenIds = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (DISABLED) return
    if (!profile?.id) {
      setCount(0)
      return
    }
    try {
      const { count: c } = await supabase
        .from('email_messages_unified')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .eq('is_sent', false)        // only inbound
        .eq('ignored', false)
      setCount(c || 0)
    } catch { /* swallow — count is best-effort */ }
  }, [profile?.id])

  useEffect(() => { if (!DISABLED) refresh() }, [refresh])

  // Polling — refresh the count every 60s while the tab is visible.
  // Originally used Supabase realtime channels here, but that path
  // caused render loops on tenants whose outlook_emails / gmail_emails
  // tables aren't in the supabase_realtime publication: subscribe
  // failed in a tight loop, hammering the websocket and the React
  // tree above. Polling is dumber but bulletproof.
  useEffect(() => {
    if (DISABLED) return
    if (!profile?.id) return
    let alive = true
    const tick = () => {
      if (!alive) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      refresh()
    }
    const handle = window.setInterval(tick, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.clearInterval(handle)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [profile?.id, refresh])

  // Suppress unused-ref lint — kept around so we can re-introduce
  // realtime later without touching the rest of the API.
  void lastSeenIds

  return { count, refresh }
}

// Ask the browser for notification permission once. Idempotent and
// safe to call multiple times. Returns the resulting state.
export async function requestEmailNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  return await Notification.requestPermission()
}
