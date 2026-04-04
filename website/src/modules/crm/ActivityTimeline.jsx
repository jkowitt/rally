import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

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

const TYPE_CONFIG = {
  Call:            { color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',   dot: 'bg-blue-500',   icon: '📞' },
  Email:           { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500', icon: '✉️' },
  Meeting:         { color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', dot: 'bg-purple-500', icon: '🤝' },
  Note:            { color: 'bg-gray-500/20 text-gray-400 border-gray-500/40',   dot: 'bg-gray-500',   icon: '📝' },
  'Task Completed':{ color: 'bg-teal-500/20 text-teal-400 border-teal-500/40',   dot: 'bg-teal-500',   icon: '✅' },
  'Stage Change':  { color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', dot: 'bg-amber-500',  icon: '📊' },
  'Contract Sent': { color: 'bg-rose-500/20 text-rose-400 border-rose-500/40',   dot: 'bg-rose-500',   icon: '📄' },
  'Follow Up':     { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',   dot: 'bg-cyan-500',   icon: '🔔' },
}

function groupByDate(activities) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] }

  for (const activity of activities) {
    const d = new Date(activity.occurred_at)
    const activityDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (activityDate.getTime() === today.getTime()) {
      groups.Today.push(activity)
    } else if (activityDate.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(activity)
    } else if (activityDate >= weekAgo) {
      groups['This Week'].push(activity)
    } else {
      groups.Earlier.push(activity)
    }
  }

  return Object.entries(groups).filter(([, items]) => items.length > 0)
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

export default function ActivityTimeline() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const propertyId = profile?.property_id

  const [filterType, setFilterType] = useState('All')
  const [filterRange, setFilterRange] = useState('all') // all, week, month
  const [showModal, setShowModal] = useState(false)
  const [quickLogDeal, setQuickLogDeal] = useState('')

  // Fetch activities with deal brand_name join
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

  // Fetch deals for the "Log Activity" form dropdown
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

  // Quick-log mutation
  const quickLogMutation = useMutation({
    mutationFn: async ({ type, dealId }) => {
      const deal = deals?.find(d => d.id === dealId)
      await supabase.from('activities').insert({
        property_id: propertyId,
        deal_id: dealId || null,
        activity_type: type,
        subject: `${type}${deal ? ' — ' + deal.brand_name : ''}`,
        occurred_at: new Date().toISOString(),
        created_by: profile?.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', propertyId] })
      toast({ title: 'Activity logged', type: 'success' })
    },
  })

  // Date range filter
  const now = new Date()
  const rangeFiltered = (activities || []).filter(a => {
    if (filterRange === 'all') return true
    const d = new Date(a.occurred_at)
    if (filterRange === 'week') return (now - d) < 7 * 86400000
    if (filterRange === 'month') return (now - d) < 30 * 86400000
    return true
  })

  const filtered = filterType === 'All'
    ? rangeFiltered
    : rangeFiltered.filter((a) => a.activity_type === filterType)

  const grouped = groupByDate(filtered)
  const totalCount = activities?.length || 0

  // Activity stats
  const stats = ACTIVITY_TYPES.map(type => ({
    type,
    count: rangeFiltered.filter(a => a.activity_type === type).length,
    icon: TYPE_CONFIG[type]?.icon || '📋',
  })).filter(s => s.count > 0)

  // Export CSV
  function exportCSV() {
    const rows = [['Date', 'Type', 'Subject', 'Deal', 'Description']]
    filtered.forEach(a => {
      rows.push([
        new Date(a.occurred_at).toLocaleDateString(),
        a.activity_type,
        a.subject || '',
        a.deals?.brand_name || '',
        (a.description || '').replace(/,/g, ';'),
      ])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activities-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="px-3 py-2 bg-bg-card border border-border text-text-secondary text-xs font-medium rounded-lg hover:text-text-primary disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-accent text-black text-sm font-medium rounded-lg hover:brightness-110 transition-all"
          >
          Log Activity
          </button>
        </div>
      </div>

      {/* Activity Stats */}
      {stats.length > 0 && (
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          {stats.map(s => (
            <div key={s.type} className="bg-bg-surface border border-border rounded-lg px-3 py-2 flex items-center gap-1.5">
              <span className="text-sm">{s.icon}</span>
              <span className="text-xs font-mono text-text-primary">{s.count}</span>
              <span className="text-[10px] text-text-muted">{s.type}{s.count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick-Log Buttons */}
      {deals?.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={quickLogDeal}
            onChange={(e) => setQuickLogDeal(e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent sm:w-48"
          >
            <option value="">Select deal for quick log</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.brand_name}</option>)}
          </select>
          <div className="flex gap-1.5 flex-wrap">
            {['Call', 'Email', 'Meeting', 'Note', 'Follow Up'].map(type => (
              <button
                key={type}
                onClick={() => quickLogMutation.mutate({ type, dealId: quickLogDeal })}
                disabled={quickLogMutation.isPending}
                className="flex items-center gap-1 bg-bg-card border border-border rounded px-2.5 py-1.5 text-[11px] text-text-secondary hover:text-accent hover:border-accent/30 transition-colors disabled:opacity-50"
              >
                <span>{TYPE_CONFIG[type]?.icon}</span>
                <span>{type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range */}
        <div className="flex gap-1 bg-bg-card rounded p-0.5">
          {[{ key: 'all', label: 'All Time' }, { key: 'week', label: 'This Week' }, { key: 'month', label: 'This Month' }].map(r => (
            <button
              key={r.key}
              onClick={() => setFilterRange(r.key)}
              className={`px-2 py-1 rounded text-[10px] font-mono ${filterRange === r.key ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <span className="text-text-muted text-xs">|</span>
      <div className="flex flex-wrap gap-2">
        {['All', ...ACTIVITY_TYPES].map((type) => {
          const isActive = filterType === type
          const config = TYPE_CONFIG[type]
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                isActive
                  ? type === 'All'
                    ? 'bg-accent/20 text-accent border-accent/40'
                    : config.color
                  : 'bg-bg-surface text-text-muted border-border hover:text-text-secondary'
              }`}
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
        <div className="bg-bg-surface border border-border rounded-lg p-12 text-center">
          <p className="text-text-muted text-sm">
            {totalCount === 0
              ? 'No activities logged yet. Click "Log Activity" to record your first one.'
              : 'No activities match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([label, items]) => (
            <div key={label}>
              <h2 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-4">{label}</h2>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />

                <div className="space-y-1">
                  {items.map((activity) => {
                    const config = TYPE_CONFIG[activity.activity_type] || TYPE_CONFIG.Note
                    return (
                      <div key={activity.id} className="relative flex gap-4 group">
                        {/* Dot */}
                        <div className="relative z-10 flex-shrink-0 mt-3">
                          <div className={`w-[9px] h-[9px] rounded-full ${config.dot} ring-4 ring-bg-primary`} />
                        </div>

                        {/* Card */}
                        <div className="flex-1 bg-bg-surface border border-border rounded-lg p-4 mb-2 hover:border-border/80 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${config.color}`}>
                                  {config.icon} {activity.activity_type}
                                </span>
                                {activity.deals?.brand_name && (
                                  <span className="text-[11px] font-mono text-accent">
                                    {activity.deals.brand_name}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-text-primary font-medium mt-1.5 truncate">
                                {activity.subject}
                              </p>
                              {activity.description && (
                                <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                                  {activity.description}
                                </p>
                              )}
                              {activity.contact_email && (
                                <p className="text-[11px] text-text-muted mt-1 font-mono">
                                  {activity.contact_email}
                                </p>
                              )}
                            </div>
                            <span className="text-[11px] text-text-muted font-mono whitespace-nowrap flex-shrink-0">
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

      {/* Log Activity Modal */}
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

  // Close on escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Log Activity</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Deal */}
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

          {/* Activity Type */}
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

          {/* Subject */}
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

          {/* Description */}
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

          {/* Contact Email */}
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

          {/* Date/Time */}
          <div>
            <label className="block text-xs font-mono text-text-muted uppercase mb-1.5">Date &amp; Time</label>
            <input
              type="datetime-local"
              value={form.occurred_at}
              onChange={(e) => update('occurred_at', e.target.value)}
              className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
            />
          </div>

          {/* Error */}
          {createMutation.isError && (
            <p className="text-xs text-danger">
              Failed to save activity. Please try again.
            </p>
          )}

          {/* Actions */}
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
