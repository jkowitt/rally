import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

/**
 * /dev/flag-audit — lifecycle view of every feature_flags row.
 *
 * Backed by the feature_flags_audit view (migration 064) which
 * joins first_seen_at, last_flipped_at, and classifies each row
 * into lifecycle_state:
 *
 *   dead_candidate     — OFF for >90 days, never flipped → delete
 *   promote_candidate  — ON for >90 days, never flipped → hardcode
 *   stable_on          — ON and unchanged for >90 days
 *   stable_off         — OFF and unchanged for >90 days
 *   active             — recently flipped or still young
 *
 * Developer-only. Readonly — no mutations from this page.
 */
export default function DevFlagAudit() {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('feature_flags_audit')
        .select('*')
        .order('days_since_last_change', { ascending: false })
      if (mounted) {
        setRows(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (profile?.role !== 'developer') return <Navigate to="/app" replace />

  const filtered = filter === 'all' ? rows : rows.filter(r => r.lifecycle_state === filter)

  const counts = rows.reduce((acc, r) => {
    acc[r.lifecycle_state] = (acc[r.lifecycle_state] || 0) + 1
    return acc
  }, {})

  const stateColors = {
    dead_candidate: 'text-danger border-danger/30 bg-danger/10',
    promote_candidate: 'text-warning border-warning/30 bg-warning/10',
    stable_on: 'text-success border-success/30 bg-success/10',
    stable_off: 'text-text-muted border-border bg-bg-surface',
    active: 'text-accent border-accent/30 bg-accent/10',
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <Link to="/dev" className="text-[10px] text-text-muted hover:text-accent">← /dev</Link>
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Flag Lifecycle Audit</div>
          <h1 className="text-2xl font-semibold">Feature Flag Graveyard</h1>
          <p className="text-xs text-text-secondary max-w-2xl">
            Flags that have been OFF for &gt;90 days and never flipped on are candidates for
            deletion. Flags that have been ON continuously for &gt;90 days are candidates for
            hardcoding. Review and retire regularly to keep the flag surface area small.
          </p>
        </header>

        {/* Lifecycle filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`text-[11px] font-mono px-3 py-1.5 rounded border ${filter === 'all' ? 'border-accent text-accent' : 'border-border text-text-muted'}`}
          >
            All · {rows.length}
          </button>
          {['dead_candidate', 'promote_candidate', 'stable_on', 'stable_off', 'active'].map(state => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              className={`text-[11px] font-mono px-3 py-1.5 rounded border ${filter === state ? stateColors[state] : 'border-border text-text-muted'}`}
            >
              {state} · {counts[state] || 0}
            </button>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="text-xs text-text-muted">Loading flag audit…</div>
        ) : (
          <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-bg-surface">
                <tr className="text-left text-[10px] uppercase tracking-widest text-text-muted">
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Lifecycle</th>
                  <th className="px-4 py-3">Days since flip</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(row => (
                  <tr key={row.module}>
                    <td className="px-4 py-3 font-mono text-text-primary">{row.module}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${row.enabled ? 'bg-success/20 text-success' : 'bg-bg-surface text-text-muted border border-border'}`}>
                        {row.enabled ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${stateColors[row.lifecycle_state] || ''}`}>
                        {row.lifecycle_state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{row.days_since_last_change ?? '—'}</td>
                    <td className="px-4 py-3 text-text-muted">{row.days_since_created ?? '—'}d ago</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-muted text-[11px]">
                      No flags in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-[10px] text-text-muted font-mono">
          Source: feature_flags_audit view. last_flipped_at is maintained by a trigger installed in migration 064.
        </div>
      </div>
    </div>
  )
}
