import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadEmails } from '@/hooks/useUnreadEmails'
import * as userNotifService from '@/services/userNotificationService'

export default function NotificationCenter() {
  const { profile } = useAuth()
  const propertyId = profile?.property_id
  const { count: unreadEmails } = useUnreadEmails()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ll_dismissed_notifs') || '[]')) } catch { return new Set() }
  })
  // Real-time user notifications from DB
  const [dbNotifications, setDbNotifications] = useState([])
  const [dbUnread, setDbUnread] = useState(0)

  // Subscribe to real-time user_notifications via Supabase
  useEffect(() => {
    if (!profile?.id) return
    userNotifService.getUnreadCount().then(setDbUnread)
    userNotifService.getNotifications({ limit: 20 }).then(setDbNotifications)

    const unsub = userNotifService.subscribeToNotifications(profile.id, (newNotif) => {
      setDbNotifications(prev => [newNotif, ...prev].slice(0, 30))
      setDbUnread(prev => prev + 1)
      userNotifService.showBrowserNotification(newNotif.title, newNotif.body, newNotif.link)
    })
    return unsub
  }, [profile?.id])

  // Generate notifications from live data
  const { data: notifData } = useQuery({
    queryKey: ['notifications-data', propertyId],
    queryFn: async () => {
      if (!propertyId) return { deals: [], tasks: [], contracts: [] }
      const [deals, tasks, contracts] = await Promise.all([
        supabase.from('deals').select('id, brand_name, stage, last_contacted, end_date, renewal_date').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(1000),
        supabase.from('tasks').select('id, title, due_date, status, deals(brand_name)').eq('property_id', propertyId).neq('status', 'Done').limit(500),
        supabase.from('contracts').select('id, brand_name, expiration_date, status').eq('property_id', propertyId).order('created_at', { ascending: false }).limit(500),
      ])
      return { deals: deals.data || [], tasks: tasks.data || [], contracts: contracts.data || [] }
    },
    enabled: !!propertyId,
    refetchInterval: 5 * 60 * 1000,
  })

  const notifications = []
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  if (notifData) {
    // Overdue tasks
    notifData.tasks.forEach(t => {
      if (t.due_date && t.due_date < todayStr) {
        notifications.push({
          id: `task-overdue-${t.id}`,
          type: 'danger',
          icon: '⚠️',
          title: `Overdue: ${t.title}`,
          sub: t.deals?.brand_name || '',
          time: t.due_date,
          href: '/app/crm/tasks',
        })
      }
    })

    // Tasks due today
    notifData.tasks.forEach(t => {
      if (t.due_date === todayStr) {
        notifications.push({
          id: `task-today-${t.id}`,
          type: 'warning',
          icon: '📌',
          title: `Due today: ${t.title}`,
          sub: t.deals?.brand_name || '',
          time: 'Today',
          href: '/app/crm/tasks',
        })
      }
    })

    // Contracts expiring within 60 days
    const in60 = new Date(now.getTime() + 60 * 86400000).toISOString().split('T')[0]
    notifData.contracts.forEach(c => {
      if (c.expiration_date && c.expiration_date >= todayStr && c.expiration_date <= in60) {
        const days = Math.ceil((new Date(c.expiration_date) - now) / 86400000)
        notifications.push({
          id: `contract-expiring-${c.id}`,
          type: 'warning',
          icon: '📋',
          title: `${c.brand_name} contract expires in ${days} days`,
          sub: c.expiration_date,
          time: `${days}d`,
          href: '/app/crm/contracts',
        })
      }
    })

    // Stale deals (no contact in 14+ days)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0]
    notifData.deals.forEach(d => {
      if (!['Contracted', 'In Fulfillment', 'Renewed', 'Declined'].includes(d.stage)) {
        if (!d.last_contacted || d.last_contacted < twoWeeksAgo) {
          notifications.push({
            id: `stale-${d.id}`,
            type: 'info',
            icon: '💤',
            title: `${d.brand_name} — no activity in 14+ days`,
            sub: d.stage,
            time: d.last_contacted || 'Never',
            href: '/app/crm/pipeline',
          })
        }
      }
    })

    // Deals up for renewal (renewal_date within 90 days)
    const in90 = new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0]
    notifData.deals.forEach(d => {
      if (d.renewal_date && d.renewal_date >= todayStr && d.renewal_date <= in90) {
        const days = Math.ceil((new Date(d.renewal_date) - now) / 86400000)
        notifications.push({
          id: `renewal-${d.id}`,
          type: 'accent',
          icon: '🔄',
          title: `${d.brand_name} renewal in ${days} days`,
          sub: d.renewal_date,
          time: `${days}d`,
          href: '/app/crm/pipeline',
        })
      }
    })
  }

  // Merge DB-driven notifications with generated CRM alerts
  const dbMapped = dbNotifications.map(n => ({
    id: `db-${n.id}`,
    _dbId: n.id,
    type: n.type === 'deal_stage_changed' ? 'accent' : n.type === 'task_assigned' ? 'info' : 'info',
    icon: n.icon || '🔔',
    title: n.title,
    sub: n.body,
    time: timeAgo(n.created_at),
    href: n.link || '#',
    isDb: true,
    read: n.read,
  }))

  // Surface unread inbound emails as a single bell entry so the
  // rep doesn't have to flip to /app/crm/inbox to know there's
  // mail. Tapping it deep-links to the inbox.
  const emailEntries = unreadEmails > 0
    ? [{
        id: 'unread-emails',
        type: 'accent',
        icon: '✉',
        title: `${unreadEmails} unread email${unreadEmails === 1 ? '' : 's'}`,
        sub: 'Inbound mail synced from Outlook + Gmail.',
        time: '',
        href: '/app/crm/inbox',
      }]
    : []

  const allNotifications = [...emailEntries, ...dbMapped, ...notifications]
  const visible = allNotifications.filter(n => !dismissed.has(n.id))
  // Bell badge count = unread DB notifications + generated CRM
  // alerts + unread emails (counted as one bucket per inbox, not
  // per message, to avoid the badge screaming "127" the first time
  // a noisy mailbox syncs).
  const unreadCount =
    visible.filter(n => n.id !== 'unread-emails' && (n.isDb ? !n.read : true)).length
    + (unreadEmails > 0 ? 1 : 0)

  function dismiss(id) {
    const next = new Set([...dismissed, id])
    setDismissed(next)
    localStorage.setItem('ll_dismissed_notifs', JSON.stringify([...next].slice(-200)))
  }

  async function dismissAll() {
    const next = new Set([...dismissed, ...visible.map(n => n.id)])
    setDismissed(next)
    localStorage.setItem('ll_dismissed_notifs', JSON.stringify([...next].slice(-200)))
    // Also mark all DB notifications as read
    await userNotifService.markAllRead()
    setDbNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setDbUnread(0)
    setOpen(false)
  }

  async function handleEnablePush() {
    await userNotifService.requestBrowserNotifications()
  }

  const typeColors = {
    danger: 'border-l-danger',
    warning: 'border-l-warning',
    info: 'border-l-accent',
    accent: 'border-l-accent',
    success: 'border-l-success',
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 text-text-muted hover:text-text-primary transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-bg-surface border border-border rounded-lg shadow-2xl z-50 max-h-[70vh] flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-primary">Notifications</h3>
              <div className="flex items-center gap-2">
                {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                  <button onClick={handleEnablePush} className="text-[9px] text-accent hover:underline">Enable push</button>
                )}
                {visible.length > 0 && (
                  <button onClick={dismissAll} className="text-[10px] text-text-muted hover:text-accent">Clear all</button>
                )}
                <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">&times;</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {visible.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-xs">No notifications</div>
              ) : (
                visible.slice(0, 20).map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-2 px-3 py-2.5 border-b border-border/50 last:border-0 border-l-2 ${typeColors[n.type] || 'border-l-border'} hover:bg-bg-card/50`}
                  >
                    <span className="text-sm shrink-0 mt-0.5">{n.icon}</span>
                    <a href={n.href} className="flex-1 min-w-0" onClick={() => setOpen(false)}>
                      <div className="text-xs text-text-primary truncate">{n.title}</div>
                      {n.sub && <div className="text-[10px] text-text-muted truncate">{n.sub}</div>}
                    </a>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-text-muted font-mono">{n.time}</span>
                      <button onClick={() => dismiss(n.id)} className="text-text-muted hover:text-text-primary text-xs px-0.5">&times;</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
