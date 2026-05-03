import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { EmptyState } from '@/components/ui'
import { Activity } from 'lucide-react'

const ACTIVITY_TYPES = [
  'Call',
  'Email',
  'Meeting',
  'Note',
  'Task Completed',
  'Stage Change',
  'Contract Sent',
  'Follow Up',
]

const QUICK_LOG_TYPES = ['Call', 'Email', 'Meeting', 'Note']

const TYPE_CONFIG = {
  Call:            { color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',   dot: 'bg-blue-500',   icon: '📞', label: 'Calls' },
  Email:           { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500', icon: '✉️', label: 'Emails' },
  Meeting:         { color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', dot: 'bg-purple-500', icon: '🤝', label: 'Meetings' },
  Note:            { color: 'bg-gray-500/20 text-gray-400 border-gray-500/40',   dot: 'bg-gray-500',   icon: '📝', label: 'Notes' },
  'Task Completed':{ color: 'bg-teal-500/20 text-teal-400 border-teal-500/40',   dot: 'bg-teal-500',   icon: '✅', label: 'Tasks' },
  'Stage Change':  { color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', dot: 'bg-amber-500',  icon: '📊', label: 'Changes' },
  'Contract Sent': { color: 'bg-rose-500/20 text-rose-400 border-rose-500/40',   dot: 'bg-rose-500',   icon: '📄', label: 'Contracts' },
  'Follow Up':     { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',   dot: 'bg-cyan-500',   icon: '🔔', label: 'Follow Ups' },
}

const DATE_RANGES = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
]

function groupByDate(activities) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const grouped = {}

  for (const activity of activities) {
    const d = new Date(activity.occurred_at)
    const activityDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    let label
    if (activityDate.getTime() === today.getTime()) {
      label = 'Today'
    } else if (activityDate.getTime() === yesterday.getTime()) {
      label = 'Yesterday'
    } else {
      const opts = { month: 'short', day: 'numeric' }
      if (d.getFullYear() !== now.getFullYear()) {
        opts.year = 'numeric'
      }
      label = d.toLocaleDateString('en-US', opts)
    }

    if (!grouped[label]) {
      grouped[label] = { items: [], sortDate: activityDate.getTime() }
    }
    grouped[label].items.push(activity)
  }

  return Object.entries(grouped)
    .sort(([, a], [, b]) => b.sortDate - a.sortDate)
    .map(([label, obj]) => [label, obj.items])
}

function formatTimestamp(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function toLocalDatetimeValue(date) {
  const d = new Date(date)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function computeStats(activities) {
  const stats = { Call: 0, Email: 0, Meeting: 0, Note: 0 }
  for (const a of activities) {
    if (stats[a.activity_type] !== undefined) {
      stats[a.activity_type]++
    }
  }
  return stats
}

function exportToCsv(activities) {
  const headers = ['Date', 'Type', 'Subject', 'Description', 'Deal', 'Contact Email']
  const rows = activities.map((a) => [
    new Date(a.occurred_at).toISOString(),
    a.activity_type,
    '"' + (a.subject || '').replace(/"/g, '""') + '"',
    '"' + (a.description || '').replace(/"/g, '""') + '"',
    '"' + (a.deals?.brand_name || '').replace(/"/g, '""') + '"',
    a.contact_email || '',
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'activities-' + new Date().toISOString().slice(0, 10) + '.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function QuickLogForm({ type, deals, isPending, onSubmit, onCancel }) {
  const [dealId, setDealId] = useState(deals.length === 1 ? deals[0].id : '')
  const [subject, setSubject] = useState('')
  const config = TYPE_CONFIG[type]

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(dealId, subject)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-bg-card border border-border rounded-lg space-y-3">
      <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
        <span>{config.icon}</span>
        <span>Quick {type}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          required
          className="bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">Select deal...</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>{d.brand_name}</option>
          ))}
        </select>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder={type + ' subject...'}
          className="sm:col-span-1 bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 px-3 py-2 bg-accent text-black text-sm font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Log'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm text-text-muted hover:text-text-secondary border border-border rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

function LogActivityModal({ deals, propertyId, profileId, onClose, onCreated }) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    deal_id: '',
    activity_type: 'Call',
    subject: '',
    description: '',
    contact_email: '',
    occurred_at: toLocalDatetimeValue(new Date()),
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { error } = await supabase.from('activities').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', propertyId] })
      onCreated?.()
      onClose()
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.deal_id || !form.subject.trim()) return

    createMutation.mutate({
      property_id: propertyId,
      created_by: profileId,
      deal_id: form.deal_id,
      activity_type: form.activity_type,
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      contact_email: form.contact_email.trim() || null,
      occurred_at: new Date(form.occurred_at).toISOString(),
    })
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border sticky top-0 bg-bg-surface z-10">
          <h2 className="text-lg font-semibold text-text-primary">Log Activity</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono text-text-muted uppercase mb-1.5">Deal</label>
            <select
              value={form.deal_id}
              onChange={(e) => update('deal_id', e.target.value)}
              required
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">Select a deal...</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.brand_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted uppercase mb-1.5">Activity Type</label>
            <select
              value={form.activity_type}
              onChange={(e) => update('activity_type', e.target.value)}
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted uppercase mb-1.5">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
              required
              placeholder="e.g. Discussed sponsorship renewal"
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted uppercase mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
              placeholder="Optional details..."
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted uppercase mb-1.5">Contact Email</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => update('contact_email', e.target.value)}
              placeholder="Optional"
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted uppercase mb-1.5">Date &amp; Time</label>
            <input
              type="datetime-local"
              value={form.occurred_at}
              onChange={(e) => update('occurred_at', e.target.value)}
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
            />
          </div>

          {createMutation.isError && (
            <p className="text-xs text-danger">
              Failed to save activity. Please try again.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-accent text-black text-sm font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ActivityTimeline() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [filterType, setFilterType] = useState('All')
  const [dateRange, setDateRange] = useState('month')
  const [showModal, setShowModal] = useState(false)
  const [quickLogType, setQuickLogType] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, deals(brand_name)')
        .eq('property_id', propertyId)
        .order('occurred_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  const { data: deals } = useQuery({
    queryKey: ['deals', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, brand_name')
        .eq('property_id', propertyId)
        .order('brand_name')
      if (error) throw error
      return data
    },
    enabled: !!propertyId,
  })

  const quickLogMutation = useMutation({
    mutationFn: async (payload) => {
      const { error } = await supabase.from('activities').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', propertyId] })
      toast({ title: 'Activity logged', type: 'success' })
      setQuickLogType(null)
    },
    onError: () => {
      toast({ title: 'Failed to log activity', type: 'error' })
    },
  })

  function handleQuickLog(type) {
    if (!deals || deals.length === 0) {
      setShowModal(true)
      return
    }
    setQuickLogType(type)
  }

  function submitQuickLog(dealId, subject) {
    if (!dealId || !subject.trim()) return
    quickLogMutation.mutate({
      property_id: propertyId,
      created_by: profile?.id,
      deal_id: dealId,
      activity_type: quickLogType,
      subject: subject.trim(),
      occurred_at: new Date().toISOString(),
    })
  }

  // Date range filtering
  const now = new Date()
  const dateFiltered = (activities || []).filter((a) => {
    if (dateRange === 'all') return true
    const d = new Date(a.occurred_at)
    if (dateRange === 'week') return (now - d) < 7 * 86400000
    if (dateRange === 'month') return (now - d) < 30 * 86400000
    return true
  })

  // Type filtering
  const filtered = filterType === 'All'
    ? dateFiltered
    : dateFiltered.filter((a) => a.activity_type === filterType)

  const grouped = groupByDate(filtered)
  const totalCount = activities?.length || 0
  const stats = computeStats(dateFiltered)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Activity Timeline</h1>
          <p className="text-text-secondary text-sm mt-1">
            {totalCount} activities across all deals
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCsv(filtered)}
            disabled={filtered.length === 0}
            className="px-3 py-2 bg-bg-surface border border-border text-text-secondary text-sm font-medium rounded-lg hover:text-text-primary hover:border-border/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-accent text-black text-sm font-medium rounded-lg hover:brightness-110 transition-all"
          >
            Log Activity
          </button>
        </div>
      </div>

      {/* Quick-Log Buttons */}
      <div className="bg-bg-surface border border-border rounded-lg p-3 sm:p-4">
        <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2.5">Quick Log</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_LOG_TYPES.map((type) => {
            const config = TYPE_CONFIG[type]
            return (
              <button
                key={type}
                onClick={() => handleQuickLog(type)}
                className={'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ' + config.color}
              >
                <span>{config.icon}</span>
                <span>{type}</span>
              </button>
            )
          })}
        </div>

        {quickLogType && (
          <QuickLogForm
            type={quickLogType}
            deals={deals || []}
            isPending={quickLogMutation.isPending}
            onSubmit={submitQuickLog}
            onCancel={() => setQuickLogType(null)}
          />
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {['Call', 'Email', 'Meeting', 'Note'].map((type) => {
          const config = TYPE_CONFIG[type]
          return (
            <div
              key={type}
              className="bg-bg-surface border border-border rounded-lg p-3 sm:p-4 text-center"
            >
              <div className="text-lg sm:text-2xl font-bold text-text-primary">{stats[type]}</div>
              <div className="text-xs text-text-muted mt-0.5 flex items-center justify-center gap-1">
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Date Range + Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1.5 bg-bg-surface border border-border rounded-lg p-1 shrink-0">
          {DATE_RANGES.map((range) => (
            <button
              key={range.key}
              onClick={() => setDateRange(range.key)}
              className={'px-3 py-1.5 text-xs font-medium rounded-md transition-all ' + (dateRange === range.key ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-secondary')}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 flex-1">
          {['All', ...ACTIVITY_TYPES].map((type) => {
            const isActive = filterType === type
            const config = TYPE_CONFIG[type]
            let cls = 'px-2.5 py-1 text-xs font-medium rounded-full border transition-all '
            if (isActive) {
              cls += type === 'All' ? 'bg-accent/20 text-accent border-accent/40' : config.color
            } else {
              cls += 'bg-bg-surface text-text-muted border-border hover:text-text-secondary'
            }
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cls}
              >
                {type !== 'All' && <span className="mr-1">{config.icon}</span>}
                {type}
              </button>
            )
          })}
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        totalCount === 0 ? (
          <EmptyState
            icon={<Activity className="w-8 h-8 text-text-muted" />}
            title="No activities logged yet"
            description="Calls, emails, meetings, and notes you log against deals show up here, sorted by recency. Click Log Activity to record your first one."
          />
        ) : (
          <EmptyState
            title="No activities match the selected filters"
            description="Try clearing the activity-type or date filters to see everything."
          />
        )
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {grouped.map(([label, items]) => (
            <div key={label}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xs font-mono text-text-muted uppercase tracking-wider whitespace-nowrap">{label}</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-mono text-text-muted">{items.length}</span>
              </div>

              <div className="relative ml-3 sm:ml-5">
                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-gradient-to-b from-border via-border to-transparent" />

                <div className="space-y-1">
                  {items.map((activity) => {
                    const config = TYPE_CONFIG[activity.activity_type] || TYPE_CONFIG.Note
                    const isExpanded = expandedId === activity.id

                    return (
                      <div key={activity.id} className="relative flex gap-3 sm:gap-4 group">
                        <div className="relative z-10 flex-shrink-0 mt-4">
                          <div className={'w-2.5 h-2.5 rounded-full ring-[3px] ring-bg-card -ml-[4px] transition-transform group-hover:scale-125 ' + config.dot} />
                        </div>

                        <div
                          onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                          className="flex-1 bg-bg-card border border-border rounded-lg p-3 sm:p-4 mb-2 hover:border-accent/30 transition-all cursor-pointer"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ' + config.color}>
                                  {config.icon} {activity.activity_type}
                                </span>
                                {activity.deals?.brand_name && (
                                  <span className="text-[11px] font-mono text-accent">
                                    {activity.deals.brand_name}
                                  </span>
                                )}
                              </div>
                              <p className={'text-sm text-text-primary font-medium mt-1.5 ' + (isExpanded ? '' : 'truncate')}>
                                {activity.subject}
                              </p>

                              {!isExpanded && activity.description && (
                                <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                                  {activity.description}
                                </p>
                              )}

                              {isExpanded && (
                                <div className="mt-2 space-y-2 border-t border-border pt-2">
                                  {activity.description && (
                                    <p className="text-xs sm:text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                                      {activity.description}
                                    </p>
                                  )}
                                  {activity.contact_email && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-text-muted">Contact:</span>
                                      <span className="text-[11px] text-accent font-mono">
                                        {activity.contact_email}
                                      </span>
                                    </div>
                                  )}
                                  <p className="text-[11px] text-text-muted font-mono">
                                    {new Date(activity.occurred_at).toLocaleString('en-US', {
                                      weekday: 'long',
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                  {!activity.description && !activity.contact_email && (
                                    <p className="text-[11px] text-text-muted italic">No additional details.</p>
                                  )}
                                </div>
                              )}

                              {!isExpanded && activity.contact_email && (
                                <p className="text-[11px] text-text-muted mt-1 font-mono">
                                  {activity.contact_email}
                                </p>
                              )}
                            </div>
                            <span className="text-[11px] text-text-muted font-mono whitespace-nowrap flex-shrink-0 order-first sm:order-last">
                              {formatTimestamp(activity.occurred_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <LogActivityModal
          deals={deals || []}
          propertyId={propertyId}
          profileId={profile?.id}
          onClose={() => setShowModal(false)}
          onCreated={() => toast({ title: 'Activity logged', type: 'success' })}
        />
      )}
    </div>
  )
}
