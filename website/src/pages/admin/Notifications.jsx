import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useState } from 'react'

const TYPE_COLORS = {
  new_paid_signup: 'text-success',
  payment_failure: 'text-danger',
  churn_risk: 'text-warning',
  hot_lead: 'text-accent',
  automation_failure: 'text-danger',
  daily_digest: 'text-[#7c3aed]',
  upgrade_opportunity: 'text-success',
}

export default function Notifications() {
  const { profile, realIsDeveloper } = useAuth()
  const { notifications, unreadCount, read, readAll, loaded } = useNotifications()
  const [filter, setFilter] = useState('all')

  const canAccess = realIsDeveloper || profile?.role === 'businessops' || profile?.role === 'admin'
  if (profile && !canAccess) return <Navigate to="/app" replace />

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter)
  const types = ['all', ...new Set(notifications.map(n => n.type))]

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Notifications</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">{unreadCount} unread of {notifications.length} total</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={readAll} className="text-xs text-accent hover:underline">Mark all as read</button>
        )}
      </div>

      <div className="flex gap-1 flex-wrap">
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`text-[10px] px-2 py-1 rounded capitalize ${filter === t ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary'}`}>
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {!loaded && <div className="text-center text-text-muted text-sm py-4">Loading...</div>}
        {filtered.map(n => (
          <div
            key={n.id}
            onClick={() => !n.read && read(n.id)}
            className={`p-3 rounded-lg border cursor-pointer ${n.read ? 'bg-bg-surface border-border opacity-70' : 'bg-bg-card border-accent/30'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[9px] font-mono uppercase ${TYPE_COLORS[n.type] || 'text-text-muted'}`}>{n.type.replace(/_/g, ' ')}</span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                </div>
                <p className="text-sm text-text-primary font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-text-secondary mt-0.5">{n.body}</p>}
                <p className="text-[9px] text-text-muted mt-1 font-mono">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {n.link && <a href={n.link} className="text-[10px] text-accent hover:underline shrink-0">Open →</a>}
            </div>
          </div>
        ))}
        {loaded && filtered.length === 0 && (
          <div className="text-center text-text-muted text-sm py-8">No notifications.</div>
        )}
      </div>
    </div>
  )
}
