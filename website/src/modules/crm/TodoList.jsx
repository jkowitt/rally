import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { invalidateTaskQueries } from '@/lib/taskCache'
import { Mail, Linkedin, Phone, ListChecks, CheckSquare, Clock, ExternalLink, Check } from 'lucide-react'

// To-Do List — single screen for "what should I work on today".
// Combines:
//   • Approved sequence drafts whose scheduled_at falls within
//     the next 24h (the rep ran a sequence; these are the queued
//     outreaches that fire today).
//   • Pending tasks owned by the rep due today or overdue.
//
// Both surfaces share the same row format so the rep can blast
// through them in order.

const METHOD_ICON = { email: Mail, linkedin: Linkedin, phone: Phone, task: ListChecks }
const METHOD_COLOR = {
  email: 'text-accent',
  linkedin: 'text-sky-400',
  phone: 'text-violet-400',
  task: 'text-text-muted',
}

export default function TodoList() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()

  const propertyId = profile?.property_id
  const userId = profile?.id

  // ─── Today's scheduled sequence drafts ──────────────────
  // Approved + has scheduled_at within +24h, OR overdue.
  const { data: drafts = [] } = useQuery({
    queryKey: ['todo-drafts', propertyId, userId],
    enabled: !!propertyId,
    queryFn: async () => {
      const cutoff = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      const { data } = await supabase
        .from('prospect_sequence_drafts')
        .select(`*,
                 enrollment:prospect_sequence_enrollments(deal_id, contact_id,
                   deals(brand_name),
                   contacts(first_name, last_name, email))`)
        .eq('property_id', propertyId)
        .eq('status', 'approved')
        .lte('scheduled_at', cutoff)
        .order('scheduled_at')
      return data || []
    },
  })

  // ─── Open tasks ─────────────────────────────────────────
  // Mirror what TaskManager shows for this rep: anything not yet
  // marked Done. Filtering on status='Pending' alone hid 'In Progress'
  // tasks here even though they were still active in TaskManager.
  const { data: tasks = [] } = useQuery({
    queryKey: ['todo-tasks', propertyId, userId],
    enabled: !!propertyId && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, deals(brand_name)')
        .eq('property_id', propertyId)
        .eq('assigned_to', userId)
        .neq('status', 'Done')
        .order('due_date', { ascending: true, nullsFirst: false })
      return data || []
    },
  })

  // ─── Mark draft sent ────────────────────────────────────
  // When the rep marks a queued draft as sent, we need to:
  //   1. Flip the draft itself to status='sent'
  //   2. Mark the underlying tasks row Done so it disappears from
  //      Task Manager + this list
  //   3. Drop an activities row on the deal so the timeline shows
  //      the touch — matches what the autosend runner does
  const markSent = useMutation({
    mutationFn: async (draftId) => {
      const { data: row } = await supabase
        .from('prospect_sequence_drafts')
        .select(`
          task_id, subject, body, method,
          enrollment:prospect_sequence_enrollments(deal_id, contact_id, contacts(email))
        `)
        .eq('id', draftId)
        .maybeSingle()
      await supabase.from('prospect_sequence_drafts')
        .update({ status: 'sent' })
        .eq('id', draftId)
      if (row?.task_id) {
        await supabase.from('tasks')
          .update({ status: 'Done', completed_at: new Date().toISOString() })
          .eq('id', row.task_id)
      }
      // Activity log mirror — gives the deal's Activity Timeline
      // the same touchpoint that an autosend would have created.
      if (row?.enrollment?.deal_id) {
        try {
          await supabase.from('activities').insert({
            property_id: profile?.property_id,
            deal_id: row.enrollment.deal_id,
            contact_email: row.enrollment?.contacts?.email || null,
            activity_type: row.method === 'phone' ? 'Call' : row.method === 'linkedin' ? 'LinkedIn Message' : 'Email',
            subject: row.subject || `${row.method || 'Email'} sent`,
            description: (row.body || '').slice(0, 1000),
            occurred_at: new Date().toISOString(),
            created_by: profile?.id,
            source: 'sequence',
          })
        } catch { /* activities table may not exist in dev — non-blocking */ }
      }
    },
    onSuccess: () => {
      invalidateTaskQueries(qc)
      toast({ title: 'Marked sent', type: 'success' })
    },
    onError: (err) => toast({ title: 'Update failed', description: humanError(err), type: 'error' }),
  })

  // ─── Mark task complete ─────────────────────────────────
  const completeTask = useMutation({
    mutationFn: async (taskId) => {
      await supabase.from('tasks')
        .update({ status: 'Done', completed_at: new Date().toISOString() })
        .eq('id', taskId)
    },
    onSuccess: () => {
      invalidateTaskQueries(qc)
      toast({ title: 'Task completed', type: 'success' })
    },
  })

  // ─── Merge + sort by scheduled / due time ───────────────
  const items = useMemo(() => {
    const draftItems = drafts.map(d => ({
      kind: 'draft',
      id: d.id,
      time: d.scheduled_at ? new Date(d.scheduled_at) : null,
      method: d.method,
      title: d.subject || (d.body || '').slice(0, 70),
      body: d.body,
      prospect: d.enrollment?.deals?.brand_name || 'Unknown',
      contact: d.enrollment?.contacts
        ? [d.enrollment.contacts.first_name, d.enrollment.contacts.last_name].filter(Boolean).join(' ')
        : null,
      dealId: d.enrollment?.deal_id || null,
      raw: d,
    }))
    const taskItems = tasks
      // Skip tasks already represented by a draft (sequence-spawned tasks).
      .filter(t => !drafts.find(d => d.task_id === t.id))
      .map(t => ({
        kind: 'task',
        id: t.id,
        time: t.due_date ? new Date(t.due_date) : null,
        method: 'task',
        title: t.title,
        body: t.description,
        prospect: t.deals?.brand_name || null,
        contact: null,
        dealId: t.deal_id || null,
        raw: t,
      }))
    const all = [...draftItems, ...taskItems]
    all.sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.getTime() - b.time.getTime()
    })
    return all
  }, [drafts, tasks])

  // Group by date bucket: Overdue / Today / Tomorrow / Upcoming
  const buckets = useMemo(() => {
    const now = new Date()
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999)
    const endOfTomorrow = new Date(endOfDay); endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)
    const out = { overdue: [], today: [], tomorrow: [], upcoming: [], unscheduled: [] }
    for (const it of items) {
      if (!it.time) { out.unscheduled.push(it); continue }
      if (it.time < now && it.time < startOfDay) { out.overdue.push(it); continue }
      if (it.time <= endOfDay) { out.today.push(it); continue }
      if (it.time <= endOfTomorrow) { out.tomorrow.push(it); continue }
      out.upcoming.push(it)
    }
    return out
  }, [items])

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">To-Do List</h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">
          Today's scheduled outreaches and open tasks. Approve sequence drafts in <Link to="/app/crm/sequences" className="text-accent hover:underline">Sequences</Link> to land them here.
        </p>
      </header>

      {items.length === 0 && (
        <div className="bg-bg-surface border border-border rounded-lg p-10 text-center">
          <CheckSquare className="w-8 h-8 mx-auto text-text-muted/40 mb-2" />
          <h2 className="text-base font-semibold text-text-primary">Nothing on the list</h2>
          <p className="text-xs text-text-muted mt-1">
            Approve sequence drafts or assign yourself a task to populate this view.
          </p>
        </div>
      )}

      <Bucket title="Overdue" tone="danger" items={buckets.overdue}
        markSent={markSent} completeTask={completeTask} />
      <Bucket title="Today" tone="accent" items={buckets.today}
        markSent={markSent} completeTask={completeTask} />
      <Bucket title="Tomorrow" tone="default" items={buckets.tomorrow}
        markSent={markSent} completeTask={completeTask} />
      <Bucket title="Upcoming" tone="default" items={buckets.upcoming}
        markSent={markSent} completeTask={completeTask} />
      <Bucket title="No date" tone="muted" items={buckets.unscheduled}
        markSent={markSent} completeTask={completeTask} />
    </div>
  )
}

function Bucket({ title, tone, items, markSent, completeTask }) {
  if (!items.length) return null
  const toneClass = {
    danger:  'border-danger/30',
    accent:  'border-accent/30',
    default: 'border-border',
    muted:   'border-border opacity-80',
  }[tone] || 'border-border'
  const titleClass = {
    danger:  'text-danger',
    accent:  'text-accent',
    default: 'text-text-primary',
    muted:   'text-text-muted',
  }[tone] || 'text-text-primary'
  return (
    <div className={`bg-bg-surface border rounded-lg overflow-hidden ${toneClass}`}>
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <h2 className={`text-sm font-semibold ${titleClass}`}>{title}</h2>
        <span className="text-[10px] font-mono text-text-muted">{items.length}</span>
      </div>
      <div className="divide-y divide-border">
        {items.map(it => (
          <Row key={`${it.kind}-${it.id}`} item={it}
            onComplete={() => it.kind === 'draft' ? markSent.mutate(it.id) : completeTask.mutate(it.id)} />
        ))}
      </div>
    </div>
  )
}

function Row({ item, onComplete }) {
  const Icon = METHOD_ICON[item.method] || ListChecks
  const iconColor = METHOD_COLOR[item.method] || 'text-text-muted'

  return (
    <div className="px-4 py-3 flex items-start gap-3 hover:bg-bg-card/40 transition-colors">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
          <span className="uppercase">{item.method === 'task' ? 'Task' : item.method}</span>
          {item.time && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {item.time.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
              </span>
            </>
          )}
          {item.prospect && (
            <>
              <span>·</span>
              <span className="text-text-secondary truncate max-w-[200px]">{item.prospect}</span>
            </>
          )}
        </div>
        <div className="text-sm text-text-primary mt-0.5 truncate">{item.title || '(no subject)'}</div>
        {item.body && (
          <div className="text-xs text-text-muted mt-0.5 line-clamp-2">{item.body}</div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {item.dealId && (
          <Link
            to={`/app/crm/pipeline?deal=${item.dealId}`}
            className="text-text-muted hover:text-accent p-1.5"
            title="Open deal"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
        <Button size="sm" variant="ghost" onClick={onComplete} title={item.kind === 'draft' ? 'Mark sent' : 'Complete task'}>
          <Check className="w-3.5 h-3.5" /> Done
        </Button>
      </div>
    </div>
  )
}
