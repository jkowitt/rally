import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as subService from '@/services/email/subscriberService'
import * as listService from '@/services/email/emailListService'

export default function EmailSubscribers() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const [subscribers, setSubscribers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    source: 'all',
    search: '',
    recentAddsOnly: params.get('recent') === '1',
    crmSyncedOnly: null,
    listId: params.get('list') || null,
  })
  const [tab, setTab] = useState(params.get('recent') === '1' ? 'recent' : 'all')

  useEffect(() => { reload() }, [filters])

  async function reload() {
    setLoading(true)
    const result = await subService.listSubscribers(filters)
    setSubscribers(result.subscribers)
    setTotal(result.total)
    setLoading(false)
  }

  function setTabAndFilter(newTab) {
    setTab(newTab)
    if (newTab === 'recent') {
      setFilters({ ...filters, recentAddsOnly: true })
      setParams({ recent: '1' })
    } else {
      setFilters({ ...filters, recentAddsOnly: false })
      setParams({})
    }
  }

  async function markAllReviewed() {
    const ids = subscribers.map(s => s.id)
    await subService.clearRecentAddFlags(ids)
    reload()
  }

  async function handleUnsubscribe(id) {
    if (!confirm('Unsubscribe this subscriber globally?')) return
    await subService.unsubscribe(id, 'manual')
    reload()
  }

  async function handleAddSubscriber(fields) {
    // First, create the master email_subscribers row
    const r = await subService.createSubscriber(
      {
        email: fields.email.trim().toLowerCase(),
        first_name: fields.first_name.trim(),
        last_name: fields.last_name.trim(),
        organization: fields.organization.trim() || null,
        source: 'manual',
        status: 'active',
        tags: [],
      },
      profile?.property_id,
    )
    if (!r.success) {
      alert(r.error || 'Failed to add subscriber')
      return { ok: false }
    }
    // Then, if the user selected one or more lists, add the new
    // subscriber to each via the email_list_subscribers junction.
    // Without this step the subscriber exists but belongs to no
    // lists, meaning campaigns that target those lists will send
    // to 0 recipients — which is the bug we're fixing here.
    if (fields.list_ids && fields.list_ids.length > 0) {
      for (const listId of fields.list_ids) {
        await listService.addSubscribersToList(listId, [r.subscriber.id], 'manual')
      }
    }
    setShowAdd(false)
    reload()
    return { ok: true }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Subscribers</h2>
          <p className="text-[11px] text-text-muted">{total} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs px-3 py-1.5 bg-accent text-bg-primary rounded font-semibold hover:opacity-90"
          >
            + Add Subscriber
          </button>
          <Link to="/app/marketing/email/import" className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50">Import CSV</Link>
        </div>
      </header>

      <div className="flex items-center gap-2 flex-wrap border-b border-border pb-2">
        <button
          onClick={() => setTabAndFilter('all')}
          className={`px-3 py-1.5 text-xs rounded ${tab === 'all' ? 'bg-accent text-bg-primary' : 'text-text-secondary'}`}
        >
          All
        </button>
        <button
          onClick={() => setTabAndFilter('recent')}
          className={`px-3 py-1.5 text-xs rounded ${tab === 'recent' ? 'bg-accent text-bg-primary' : 'text-text-secondary'}`}
        >
          New Adds {tab !== 'recent' && <span className="ml-1 text-text-muted">({subscribers.filter(s => s.is_recent_add).length})</span>}
        </button>
        {tab === 'recent' && subscribers.length > 0 && (
          <button onClick={markAllReviewed} className="ml-auto text-[10px] px-2 py-1 border border-border rounded hover:border-accent/50">
            Mark all as reviewed
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search email, name, org…"
          className="bg-bg-card border border-border rounded px-3 py-1.5 text-xs w-64 focus:outline-none focus:border-accent"
        />
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs">
          <option value="all">All statuses</option>
          {subService.STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })} className="bg-bg-card border border-border rounded px-2 py-1.5 text-xs">
          <option value="all">All sources</option>
          <option value="manual">Manual</option>
          <option value="pipeline_sync">Pipeline Sync</option>
          <option value="import">Import</option>
          <option value="signup">Signup</option>
          <option value="outlook_sync">Outlook Sync</option>
        </select>
      </div>

      {showAdd && (
        <AddSubscriberModal
          onClose={() => setShowAdd(false)}
          onSave={handleAddSubscriber}
        />
      )}

      <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
            <tr>
              <th className="p-2 w-6"></th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Organization</th>
              <th className="p-2 text-left">Source</th>
              <th className="p-2 text-left">Engagement</th>
              <th className="p-2 text-left">Added</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="p-4 text-center text-text-muted">Loading…</td></tr>}
            {!loading && subscribers.length === 0 && (
              <tr><td colSpan={8} className="p-4 text-center text-text-muted">No subscribers match.</td></tr>
            )}
            {subscribers.map(s => (
              <tr key={s.id} className={`border-t border-border ${s.is_recent_add ? 'border-l-2 border-l-accent' : ''}`}>
                <td className="p-2"><StatusDot status={s.status} /></td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary">{s.email}</span>
                    {s.is_recent_add && <RecentAddBadge flaggedAt={s.recent_add_flagged_at} />}
                  </div>
                </td>
                <td className="p-2 text-text-secondary">{s.first_name} {s.last_name}</td>
                <td className="p-2 text-text-secondary">{s.organization}</td>
                <td className="p-2">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-surface text-text-muted">
                    {s.crm_synced ? '🔗 Pipeline' : s.source}
                  </span>
                  {s.deal_stage && <div className="text-[9px] text-text-muted mt-0.5">{s.deal_stage}</div>}
                </td>
                <td className="p-2">
                  <EngagementBadge score={s.engagement_score} />
                </td>
                <td className="p-2 text-[10px] text-text-muted">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="p-2 text-right">
                  {s.status === 'active' && (
                    <button onClick={() => handleUnsubscribe(s.id)} className="text-[10px] text-danger hover:underline">
                      Unsub
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusDot({ status }) {
  const color = status === 'active' ? 'bg-success' : status === 'bounced' ? 'bg-danger' : status === 'complained' ? 'bg-danger' : 'bg-text-muted'
  return <div className={`w-2 h-2 rounded-full ${color}`} />
}

function RecentAddBadge({ flaggedAt }) {
  const hours = Math.floor((Date.now() - new Date(flaggedAt).getTime()) / 3600000)
  return (
    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">
      New · {hours}h ago
    </span>
  )
}

function EngagementBadge({ score }) {
  const seg = subService.engagementSegment(score)
  const color = seg.color === 'success' ? 'text-success' : seg.color === 'warning' ? 'text-warning' : seg.color === 'danger' ? 'text-danger' : 'text-accent'
  return <span className={`text-[10px] font-mono ${color}`}>{score} · {seg.label}</span>
}

function AddSubscriberModal({ onClose, onSave }) {
  const [fields, setFields] = useState({
    first_name: '',
    last_name: '',
    email: '',
    organization: '',
    list_ids: [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [availableLists, setAvailableLists] = useState([])
  const [loadingLists, setLoadingLists] = useState(true)

  // Load the available lists once when the modal opens so the user
  // can pick which ones to enroll the new subscriber in. If there
  // are no lists yet, we show a note pointing them at /app/marketing/
  // email/lists to create one first.
  useEffect(() => {
    let mounted = true
    async function loadLists() {
      const result = await listService.listLists()
      if (mounted) {
        setAvailableLists(result?.lists || [])
        setLoadingLists(false)
      }
    }
    loadLists()
    return () => { mounted = false }
  }, [])

  function toggleList(listId) {
    setFields(prev => ({
      ...prev,
      list_ids: prev.list_ids.includes(listId)
        ? prev.list_ids.filter(id => id !== listId)
        : [...prev.list_ids, listId],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!fields.first_name || !fields.last_name || !fields.email) {
      setError('First name, last name, and email are required.')
      return
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)
    if (!emailOk) {
      setError('Enter a valid email address.')
      return
    }
    setSaving(true)
    const r = await onSave(fields)
    setSaving(false)
    if (!r?.ok) setError('Could not save — that email may already exist in the list.')
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-bg-primary border border-border rounded-lg max-w-md w-full p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">Add Subscriber</div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-text-muted mb-1">First name *</label>
              <input
                type="text"
                value={fields.first_name}
                onChange={e => setFields({ ...fields, first_name: e.target.value })}
                className="w-full bg-bg-card border border-border rounded px-2 py-2 focus:outline-none focus:border-accent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-text-muted mb-1">Last name *</label>
              <input
                type="text"
                value={fields.last_name}
                onChange={e => setFields({ ...fields, last_name: e.target.value })}
                className="w-full bg-bg-card border border-border rounded px-2 py-2 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-text-muted mb-1">Email *</label>
            <input
              type="email"
              value={fields.email}
              onChange={e => setFields({ ...fields, email: e.target.value })}
              placeholder="person@example.com"
              className="w-full bg-bg-card border border-border rounded px-2 py-2 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-text-muted mb-1">
              Organization <span className="text-text-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={fields.organization}
              onChange={e => setFields({ ...fields, organization: e.target.value })}
              placeholder="Acme Inc."
              className="w-full bg-bg-card border border-border rounded px-2 py-2 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-text-muted mb-1">
              Add to lists <span className="text-text-muted">(select at least one so campaigns can reach them)</span>
            </label>
            {loadingLists ? (
              <div className="text-[11px] text-text-muted py-2">Loading lists…</div>
            ) : availableLists.length === 0 ? (
              <div className="text-[11px] text-warning bg-warning/10 border border-warning/30 rounded p-2">
                No lists exist yet.{' '}
                <Link to="/app/marketing/email/lists" className="underline">
                  Create a list first
                </Link>{' '}
                — otherwise this subscriber won't be reachable by any campaign.
              </div>
            ) : (
              <div className="bg-bg-card border border-border rounded p-2 max-h-32 overflow-y-auto space-y-1">
                {availableLists.map(list => (
                  <label
                    key={list.id}
                    className="flex items-center gap-2 text-xs text-text-primary cursor-pointer py-1 px-1 hover:bg-bg-surface rounded"
                  >
                    <input
                      type="checkbox"
                      checked={fields.list_ids.includes(list.id)}
                      onChange={() => toggleList(list.id)}
                      className="accent-accent"
                    />
                    <span className="flex-1 truncate">{list.name}</span>
                    <span className="text-[10px] text-text-muted font-mono shrink-0">
                      {list.active_count ?? 0}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {error && <div className="text-danger text-[11px]">{error}</div>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-text-secondary py-2 rounded text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-accent text-bg-primary py-2 rounded text-xs font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add Subscriber'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
