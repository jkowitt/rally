import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Aggregates events across activities, contracts, contract_versions,
// fulfillment_records, and tasks for a single deal, then renders
// a unified chronological feed. Read-only.
export default function DealActivityTimeline({ dealId, propertyId, limit = 20 }) {
  const [events, setEvents] = useState([])
  // We track "loading" via a key that resets when dealId changes;
  // setLoading(true) inside the effect would violate hook rules.
  const [loadedKey, setLoadedKey] = useState(null)
  const loading = loadedKey !== dealId

  useEffect(() => {
    if (!dealId) return
    let cancelled = false
    Promise.all([
      supabase
        .from('activities')
        .select('id, activity_type, subject, description, occurred_at, created_at')
        .eq('deal_id', dealId)
        .order('occurred_at', { ascending: false })
        .limit(limit),
      supabase
        .from('contracts')
        .select('id, brand_name, status, file_name, created_at, archived_at')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('contract_versions')
        .select('id, version_number, archived_at, archived_reason, snapshot')
        .eq('property_id', propertyId)
        .order('archived_at', { ascending: false })
        .limit(limit),
      supabase
        .from('fulfillment_records')
        .select('id, delivered, delivered_at, scheduled_date, contract_id, contract_benefits(benefit_description)')
        .eq('deal_id', dealId)
        .eq('delivered', true)
        .order('delivered_at', { ascending: false })
        .limit(limit),
      supabase
        .from('tasks')
        .select('id, title, status, due_date, completed_at, created_at')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]).then(([acts, contracts, versions, fulfill, tasks]) => {
      if (cancelled) return
      const merged = []

      for (const a of acts.data || []) {
        merged.push({
          kind: 'activity',
          icon: '📞',
          when: a.occurred_at || a.created_at,
          title: a.subject || a.activity_type || 'Activity',
          subtitle: a.description || a.activity_type,
        })
      }

      for (const c of contracts.data || []) {
        merged.push({
          kind: 'contract_created',
          icon: '📄',
          when: c.created_at,
          title: 'Contract added',
          subtitle: c.file_name || c.brand_name || 'Contract',
        })
        if (c.archived_at) {
          merged.push({
            kind: 'contract_archived',
            icon: '📁',
            when: c.archived_at,
            title: 'Contract archived',
            subtitle: c.brand_name || 'Contract',
          })
        }
      }

      // contract_versions: filter to ones whose snapshot.contract.deal_id matches
      for (const v of versions.data || []) {
        const snapDealId = v.snapshot?.contract?.deal_id
        if (snapDealId !== dealId) continue
        merged.push({
          kind: 'contract_version',
          icon: '🗂',
          when: v.archived_at,
          title: `Contract v${v.version_number} archived`,
          subtitle: v.archived_reason || 'Prior contract terms preserved',
        })
      }

      for (const f of fulfill.data || []) {
        merged.push({
          kind: 'fulfillment',
          icon: '✓',
          when: f.delivered_at || f.scheduled_date,
          title: 'Benefit delivered',
          subtitle: f.contract_benefits?.benefit_description || 'Benefit',
        })
      }

      for (const t of tasks.data || []) {
        if (t.completed_at) {
          merged.push({
            kind: 'task_done',
            icon: '✓',
            when: t.completed_at,
            title: 'Task completed',
            subtitle: t.title,
          })
        } else {
          merged.push({
            kind: 'task_created',
            icon: '◷',
            when: t.created_at,
            title: 'Task created',
            subtitle: t.title,
          })
        }
      }

      merged.sort((a, b) => {
        const at = a.when ? new Date(a.when).getTime() : 0
        const bt = b.when ? new Date(b.when).getTime() : 0
        return bt - at
      })

      setEvents(merged.slice(0, limit))
      setLoadedKey(dealId)
    }).catch(() => {
      if (!cancelled) setLoadedKey(dealId)
    })

    return () => { cancelled = true }
  }, [dealId, propertyId, limit])

  if (loading) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-3 text-xs text-text-muted">
        Loading activity…
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-3 text-xs text-text-muted">
        No activity yet. Logged calls, contract uploads, and fulfillment events will show up here.
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-text-muted font-mono mb-1">
        Recent activity
      </div>
      <ol className="space-y-2">
        {events.map((e, i) => (
          <li key={`${e.kind}-${i}-${e.when}`} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 mt-0.5" aria-hidden="true">{e.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-text-primary truncate">{e.title}</div>
              {e.subtitle && (
                <div className="text-text-muted truncate">{e.subtitle}</div>
              )}
            </div>
            <span className="text-text-muted shrink-0 font-mono">{formatRel(e.when)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function formatRel(d) {
  if (!d) return ''
  const t = new Date(d).getTime()
  const ago = Date.now() - t
  if (ago < 60_000) return 'now'
  if (ago < 3_600_000) return `${Math.floor(ago / 60_000)}m`
  if (ago < 86_400_000) return `${Math.floor(ago / 3_600_000)}h`
  if (ago < 7 * 86_400_000) return `${Math.floor(ago / 86_400_000)}d`
  return new Date(d).toLocaleDateString()
}
