import { supabase } from '@/lib/supabase'

export async function getNotifications({ unreadOnly = false, limit = 50 } = {}) {
  let q = supabase
    .from('user_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (unreadOnly) q = q.eq('read', false)
  const { data } = await q
  return data || []
}

export async function getUnreadCount() {
  const { count } = await supabase
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('read', false)
  return count || 0
}

export async function markRead(notificationId) {
  await supabase
    .from('user_notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
}

export async function markAllRead() {
  await supabase
    .from('user_notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('read', false)
}

export async function deleteNotification(id) {
  await supabase.from('user_notifications').delete().eq('id', id)
}

export function subscribeToNotifications(userId, onNew) {
  const channel = supabase
    .channel('user-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNew(payload.new),
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export async function requestBrowserNotifications() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export function showBrowserNotification(title, body, link) {
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, {
    body,
    icon: '/favicon.svg',
    tag: 'rally-notification',
  })
  if (link) {
    n.onclick = () => {
      window.focus()
      window.location.href = link
    }
  }
}
