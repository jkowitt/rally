import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNowMinute } from '@/hooks/useNow'

export interface DealActivityTimelineProps {
  dealId: string
  propertyId?: string | null
  limit?: number
}

type EventKind =
  | 'activity'
  | 'contract_created'
  | 'contract_archived'
  | 'contract_version'
  | 'task_done'
  | 'task_created'

interface TimelineEvent {
  kind: EventKind
  icon: string
  when: string | null | undefined
  title: string
  subtitle?: string | null
}

// Aggregates events across activities, contracts, contract_versions,
// and tasks for a single deal, then renders a unified chronological
// feed. Read-only. (Fulfillment events used to live here too — that
// surface was retired with the contract review features.)
export default function DealActivityTimeline({ dealId, propertyId, limit = 20 }: DealActivityTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  // We track "loading" via a key that resets when dealId changes;
  // setLoading(true) inside the effect would violate hook rules.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const loading = loadedKey !== dealId
  const now = useNowMinute()

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
        .from('tasks')
        .select('id, title, status, due_date, completed_at, created_at')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]).then(([acts, contracts, versions, tasks]) => {
      if (cancelled) return
      const merged: TimelineEvent[] = []

      for (const a of (acts.data || []) as Array<Record<string, unknown>>) {
        merged.push({
          kind: 'activity',
          icon: '📞',
          when: (a.occurred_at as string) || (a.created_at as string),
          title: (a.subject as string) || (a.activity_type as string) || 'Activity',
          subtitle: (a.description as string) || (a.activity_type as string),
        })
      }

      for (const c of (contracts.data || []) as Array<Record<string, unknown>>) {
        merged.push({
          kind: 'contract_created',
          icon: '📄',
          when: c.created_at as string,
          title: 'Contract added',
          subtitle: (c.file_name as string) || (c.brand_name as string) || 'Contract',
        })
        if (c.archived_at) {
          merged.push({
            kind: 'contract_archived',
            icon: '📁',
            when: c.archived_at as string,
            title: 'Contract archived',
            subtitle: (c.brand_name as string) || 'Contract',
          })
        }
      }

      // contract_versions: filter to ones whose snapshot.contract.deal_id matches
      for (const v of (versions.data || []) as Array<Record<string, unknown>>) {
        const snap = v.snapshot as { contract?: { deal_id?: string } } | undefined
        const snapDealId = snap?.contract?.deal_id
        if (snapDealId !== dealId) continue
        merged.push({
          kind: 'contract_version',
          icon: '🗂',
          when: v.archived_at as string,
          title: `Contract v${v.version_number} archived`,
          subtitle: (v.archived_reason as string) || 'Prior contract terms preserved',
        })
      }

      for (const t of (tasks.data || []) as Array<Record<string, unknown>>) {
        if (t.completed_at) {
          merged.push({
            kind: 'task_done',
            icon: '✓',
            when: t.completed_at as string,
            title: 'Task completed',
            subtitle: t.title as string,
          })
        } else {
          merged.push({
            kind: 'task_created',
            icon: '◷',
            when: t.created_at as string,
            title: 'Task created',
            subtitle: t.title as string,
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
      <div className="bg-bg-card border border-border rounded-lg p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-text-muted font-mono mb-1">
          Recent activity
        </div>
        <ol className="space-y-2" aria-label="Loading recent activity">
          {[0, 1, 2, 3].map(i => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-3 h-3 rounded-full bg-bg-surface shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="h-2 w-2/3 bg-bg-surface rounded" />
                <div className="h-2 w-1/2 bg-bg-surface/60 rounded" />
              </div>
              <span className="w-6 h-2 bg-bg-surface rounded shrink-0" />
            </li>
          ))}
        </ol>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-3 text-xs text-text-muted">
        No activity yet. Logged calls, contract uploads, and completed tasks will show up here.
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
            <span className="text-text-muted shrink-0 font-mono">{formatRel(e.when, now)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function formatRel(d: string | null | undefined, now: number): string {
  if (!d) return ''
  const t = new Date(d).getTime()
  const ago = now - t
  if (ago < 60_000) return 'now'
  if (ago < 3_600_000) return `${Math.floor(ago / 60_000)}m`
  if (ago < 86_400_000) return `${Math.floor(ago / 3_600_000)}h`
  if (ago < 7 * 86_400_000) return `${Math.floor(ago / 86_400_000)}d`
  return new Date(d).toLocaleDateString()
}
