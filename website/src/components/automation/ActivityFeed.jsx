import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const STATUS_COLORS = {
  sent: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
  pending: 'bg-warning/10 text-warning',
  skipped: 'bg-bg-card text-text-muted',
}

const CATEGORY_COLORS = {
  email: 'text-accent',
  trial: 'text-success',
  upgrade: 'text-warning',
  operational: 'text-[#7c3aed]',
  social: 'text-[#ec4899]',
  ad: 'text-[#06b6d4]',
}

export default function ActivityFeed({ limit = 50 }) {
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    let q = supabase.from('automation_log').select('*').order('created_at', { ascending: false }).limit(limit)
    if (filter !== 'all') q = q.eq('event_category', filter)
    const { data } = await q
    setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [filter])

  const categories = ['all', 'email', 'trial', 'upgrade', 'operational', 'social', 'ad']

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`text-[10px] px-2 py-1 rounded capitalize ${filter === c ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {loading && <div className="text-xs text-text-muted text-center py-4">Loading...</div>}
        {!loading && events.length === 0 && (
          <div className="text-xs text-text-muted text-center py-6">No automation events yet. Activity will appear here as the engine runs.</div>
        )}
        {events.map(e => (
          <div key={e.id} className="bg-bg-card rounded px-2 py-1.5 flex items-center gap-2 text-[10px]">
            <span className={`font-mono ${CATEGORY_COLORS[e.event_category] || 'text-text-muted'}`}>{e.event_category}</span>
            <span className="text-text-primary flex-1 min-w-0 truncate">{e.event_type}</span>
            {e.target_email && <span className="text-text-muted hidden sm:inline truncate max-w-[140px]">{e.target_email}</span>}
            <span className={`font-mono px-1.5 py-0.5 rounded ${STATUS_COLORS[e.status] || 'bg-bg-surface'}`}>{e.status}</span>
            <span className="text-text-muted font-mono shrink-0 hidden sm:inline">{new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
