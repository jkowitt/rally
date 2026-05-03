import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from '@/services/notificationService'

// notificationService is still .js without typed exports.
// Define the slice we use here so consumers of useNotifications
// get type-checked access to notification fields.
export interface Notification {
  id: string
  recipient_id: string
  title: string | null
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
  category?: string | null
}

export interface UseNotificationsAPI {
  loaded: boolean
  notifications: Notification[]
  unreadCount: number
  read: (id: string) => Promise<void>
  readAll: () => Promise<void>
  refresh: () => Promise<void>
}

export function useNotifications(): UseNotificationsAPI {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loaded, setLoaded] = useState<boolean>(false)

  const refresh = useCallback(async () => {
    if (!profile?.id) return
    const [notifs, count] = await Promise.all([
      getNotifications(profile.id) as Promise<Notification[]>,
      getUnreadCount(profile.id) as Promise<number>,
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

  const read = useCallback(async (id: string) => {
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
