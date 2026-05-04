import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { generatePostmortemQuestions } from '@/lib/claude'
import { Trophy, XCircle, Sparkles, Clock, CheckCircle } from 'lucide-react'

// Postmortems — auto-created on deal stage→Renewed/Contracted/Declined
// (075 trigger). For each pending row, generate 5-7 structured
// questions and capture answers. Feeds future ICP + lookalike work.
export default function Postmortems() {
  const { profile } = useAuth()

  const { data: rows = [] } = useQuery({
    queryKey: ['postmortems', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('deal_postmortems')
        .select('*, deals(id, brand_name, value, stage, sub_industry, notes)')
        .eq('property_id', profile.property_id)
        .order('created_at', { ascending: false })
        .limit(50)
      return data || []
    },
  })

  const pending = rows.filter(r => r.status !== 'complete')
  const complete = rows.filter(r => r.status === 'complete')

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'CRM & Prospecting', to: '/app' }, { label: 'Postmortems' }]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Trophy className="w-6 h-6 text-accent" />
          Win/Loss Postmortems
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Every deal that closes (won or lost) gets a debrief. Lessons feed the next cycle.
        </p>
      </div>

      {rows.length === 0 && (
        <EmptyState
          icon={<Trophy className="w-7 h-7 text-text-muted" />}
          title="No closed deals yet"
          description="When a deal moves to Renewed, Contracted, or Declined, a postmortem lands here."
        />
      )}

      {pending.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-text-primary">Pending ({pending.length})</h2>
          </div>
          <div className="space-y-2">
            {pending.map(p => <PostmortemCard key={p.id} row={p} />)}
          </div>
        </section>
      )}

      {complete.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-2">Completed ({complete.length})</h2>
          <div className="space-y-2">
            {complete.slice(0, 20).map(p => <PostmortemCard key={p.id} row={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function PostmortemCard({ row }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [questions, setQuestions] = useState(null)
  const [answers, setAnswers] = useState(row.rep_responses || {})
  const [loading, setLoading] = useState(false)
  const [primaryReason, setPrimaryReason] = useState(row.primary_reason || '')
  const [whatWorked, setWhatWorked] = useState(row.what_worked || '')
  const [whatDidnt, setWhatDidnt] = useState(row.what_didnt || '')
  const [lessons, setLessons] = useState(row.lessons_learned || '')

  const isWon = row.outcome === 'won'

  async function loadQuestions() {
    if (questions) return
    setLoading(true)
    try {
      const result = await generatePostmortemQuestions({ deal: row.deals, outcome: row.outcome })
      setQuestions(result || { rep_questions: [], contact_questions: [] })
    } catch (e) {
      toast({ title: 'Could not generate questions', description: humanError(e), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const save = useMutation({
    mutationFn: async (markComplete) => {
      const { error } = await supabase.from('deal_postmortems').update({
        primary_reason: primaryReason || null,
        what_worked: whatWorked || null,
        what_didnt: whatDidnt || null,
        lessons_learned: lessons || null,
        rep_responses: answers,
        rep_response_at: new Date().toISOString(),
        status: markComplete ? 'complete' : 'in_progress',
        completed_at: markComplete ? new Date().toISOString() : null,
      }).eq('id', row.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['postmortems'] })
      toast({ title: 'Saved', type: 'success' })
    },
    onError: (e) => toast({ title: 'Save failed', description: humanError(e), type: 'error' }),
  })

  return (
    <Card padding="md">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isWon ? <Trophy className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-danger" />}
          <span className="text-sm font-semibold text-text-primary">{row.deals?.brand_name || 'Deal'}</span>
          <Badge tone={isWon ? 'success' : 'danger'}>{isWon ? 'Won' : 'Lost'}</Badge>
          {row.deals?.value && <span className="text-xs text-text-muted font-mono">${Number(row.deals.value).toLocaleString()}</span>}
          {row.status === 'pending' && <Badge tone="warning"><Clock className="w-3 h-3 inline mr-0.5" />pending</Badge>}
          {row.status === 'in_progress' && <Badge tone="accent">in progress</Badge>}
          {row.status === 'complete' && <Badge tone="success"><CheckCircle className="w-3 h-3 inline mr-0.5" />complete</Badge>}
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(!open); if (!open) loadQuestions() }}>
          {open ? 'Close' : 'Open debrief'}
        </Button>
      </div>

      {open && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Primary reason</label>
              <input
                type="text" value={primaryReason}
                onChange={(e) => setPrimaryReason(e.target.value)}
                placeholder={isWon ? 'Why we won — one sentence' : 'Why we lost — one sentence'}
                className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-mono text-text-muted">What worked</label>
              <textarea rows={2} value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)}
                className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent resize-none" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-mono text-text-muted">What didn't</label>
              <textarea rows={2} value={whatDidnt} onChange={(e) => setWhatDidnt(e.target.value)}
                className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent resize-none" />
            </div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Lessons learned</label>
            <textarea rows={2} value={lessons} onChange={(e) => setLessons(e.target.value)}
              placeholder="What should we do differently next time?"
              className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent resize-none" />
          </div>

          {loading && <div className="text-xs text-text-muted">AI is generating debrief questions…</div>}
          {questions?.rep_questions?.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider font-mono text-text-muted flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI debrief questions
              </div>
              {questions.rep_questions.map(q => (
                <div key={q.id}>
                  <label className="text-xs text-text-secondary">{q.prompt}</label>
                  <textarea
                    rows={2}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button size="sm" variant="ghost" onClick={() => save.mutate(false)} disabled={save.isPending}>
              Save draft
            </Button>
            <Button size="sm" onClick={() => save.mutate(true)} disabled={save.isPending}>
              Mark complete
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
