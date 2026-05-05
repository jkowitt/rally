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

export interface UseUnreadEmailsAPI {
  count: number
  refresh: () => Promise<void>
}

export function useUnreadEmails(): UseUnreadEmailsAPI {
  const { profile } = useAuth()
  const [count, setCount] = useState(0)
  const lastSeenIds = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!profile?.id) {
      setCount(0)
      return
    }
    const { count: c } = await supabase
      .from('email_messages_unified')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)
      .eq('is_sent', false)        // only inbound
      .eq('ignored', false)
    setCount(c || 0)
  }, [profile?.id])

  useEffect(() => { refresh() }, [refresh])

  // Realtime: react to inserts/updates on either provider's table.
  // We don't subscribe to the unioned view — Postgres doesn't emit
  // changes for views — so we listen to both underlying tables.
  useEffect(() => {
    if (!profile?.id) return
    const handle = (payload: any) => {
      // Refresh count immediately.
      refresh()
      // OS-level notification for genuinely new inbound mail. Don't
      // re-fire for the same id (tabs that lose+regain focus would
      // otherwise notify twice). Skip when the tab is already
      // focused — the realtime event itself + sidebar dot is enough.
      try {
        const row = payload.new
        if (!row || row.is_sent || row.is_read || row.ignored) return
        if (lastSeenIds.current.has(row.id)) return
        lastSeenIds.current.add(row.id)
        if (typeof Notification === 'undefined') return
        if (Notification.permission !== 'granted') return
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') return
        const from = row.from_name || row.from_email || 'New email'
        const subject = row.subject || '(no subject)'
        const n = new Notification(`${from}`, {
          body: subject,
          tag: row.id,
          icon: '/favicon.svg',
        })
        n.onclick = () => {
          window.focus()
          window.location.href = '/app/crm/inbox'
        }
      } catch { /* ignore — notifications are best-effort */ }
    }
    const channels = [
      supabase.channel(`outlook_emails_${profile.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'outlook_emails', filter: `user_id=eq.${profile.id}` }, handle)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'outlook_emails', filter: `user_id=eq.${profile.id}` }, () => refresh())
        .subscribe(),
      supabase.channel(`gmail_emails_${profile.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gmail_emails', filter: `user_id=eq.${profile.id}` }, handle)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gmail_emails', filter: `user_id=eq.${profile.id}` }, () => refresh())
        .subscribe(),
    ]
    return () => { channels.forEach(c => supabase.removeChannel(c)) }
  }, [profile?.id, refresh])

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
