import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from '@/services/notificationService'

export function useNotifications() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    if (!profile?.id) return
    const [notifs, count] = await Promise.all([
      getNotifications(profile.id),
      getUnreadCount(profile.id),
    ])
    setNotifications(notifs)
    setUnreadCount(count)
    setLoaded(true)
  }, [profile?.id])

  useEffect(() => { refresh() }, [refresh])

  // Real-time subscription
  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel(`notifications_${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications', filter: `recipient_id=eq.${profile.id}` }, () => refresh())
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [profile?.id, refresh])

  const read = useCallback(async (id) => {
    await markAsRead(id)
    await refresh()
  }, [refresh])

  const readAll = useCallback(async () => {
    if (!profile?.id) return
    await markAllAsRead(profile.id)
    await refresh()
  }, [profile?.id, refresh])

  return { loaded, notifications, unreadCount, read, readAll, refresh }
}
