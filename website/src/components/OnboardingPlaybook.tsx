import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, Badge, EmptyState } from '@/components/ui'
import { CheckCircle, Circle, Clock, BookOpen } from 'lucide-react'

interface Step {
  key: string
  title: string
  description?: string
  owner_role?: string
  due_at?: string
  completed_at?: string
  completed_by?: string
}

interface Run {
  id: string
  status: string
  steps: Step[]
  started_at: string
  completed_at: string | null
}

// OnboardingPlaybook — shown on a deal that's been Contracted+.
// Reads onboarding_runs (auto-created by 079 trigger when stage flips
// to Contracted). Lets the CSM check off steps; auto-marks the run
// complete when the last step is checked.
export default function OnboardingPlaybook({ dealId }: { dealId: string }) {
  const { profile } = useAuth()
  const qc = useQueryClient()

  const { data: run } = useQuery({
    queryKey: ['onboarding-run', dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<Run | null> => {
      const { data } = await supabase.from('onboarding_runs').select('*').eq('deal_id', dealId).maybeSingle()
      return (data as Run) || null
    },
  })

  const toggle = useMutation({
    mutationFn: async (key: string) => {
      if (!run) return
      const next = (run.steps || []).map(s =>
        s.key === key
          ? { ...s, completed_at: s.completed_at ? null : new Date().toISOString(), completed_by: s.completed_at ? null : profile?.id }
          : s
      )
      const allDone = next.every(s => !!s.completed_at)
      const { error } = await supabase.from('onboarding_runs').update({
        steps: next,
        status: allDone ? 'complete' : 'in_progress',
        completed_at: allDone ? new Date().toISOString() : null,
      }).eq('id', run.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding-run', dealId] }),
  })

  if (!run) {
    return (
      <Card padding="md">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Onboarding</h3>
        </div>
        <EmptyState
          title="Not in onboarding"
          description="When this deal moves to Contracted, an onboarding playbook starts automatically."
          className="border-0 py-3"
        />
      </Card>
    )
  }

  const steps = Array.isArray(run.steps) ? run.steps : []
  const done = steps.filter(s => !!s.completed_at).length
  const pct = steps.length ? Math.round(100 * done / steps.length) : 0

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Onboarding</h3>
          <Badge tone={run.status === 'complete' ? 'success' : 'accent'}>{run.status}</Badge>
        </div>
        <span className="text-[11px] font-mono text-text-muted">{done}/{steps.length} · {pct}%</span>
      </div>

      <div className="h-1.5 bg-bg-card rounded">
        <div className={`h-1.5 rounded ${pct === 100 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-1.5">
        {steps.map(s => {
          const isDone = !!s.completed_at
          const isOverdue = !isDone && s.due_at && new Date(s.due_at) < new Date()
          return (
            <li key={s.key}>
              <button
                onClick={() => toggle.mutate(s.key)}
                disabled={toggle.isPending}
                className="w-full text-left flex items-start gap-2 p-2 rounded hover:bg-bg-card transition-colors"
              >
                {isDone
                  ? <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  : <Circle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${isDone ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                    {s.title}
                  </div>
                  <div className="flex gap-2 text-[10px] text-text-muted font-mono mt-0.5">
                    {s.owner_role && <span>{s.owner_role}</span>}
                    {s.due_at && (
                      <span className={isOverdue ? 'text-warning' : ''}>
                        <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                        {isOverdue ? 'overdue' : `due ${new Date(s.due_at).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
