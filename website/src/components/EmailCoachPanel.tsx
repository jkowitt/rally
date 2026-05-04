import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { Button, Badge } from '@/components/ui'
import { scoreEmail, type ScoreBreakdown } from '@/lib/emailScore'
import { Sparkles, X, RefreshCw, Send, Undo2, Copy, Loader2 } from 'lucide-react'

// EmailCoachPanel — close-able right-side rewriter. Strictly scoped:
// the AI only rewrites the supplied text per a goal. Refuses
// anything outside email rewriting (enforced by the edge function's
// system prompt).
//
// Live heuristic score-out-of-10 ticks on every keystroke (instant).
// AI score replaces the heuristic when a rewrite arrives.
//
// Three input paths:
//   • Goal chips — "more professional", "remove AI tells", etc.
//   • Free-form instruction — any goal-oriented sentence
//   • Apply / Undo / Reset — push the rewrite back to the parent
//     or revert to whatever was originally passed in.
//
// Props:
//   open               — show/hide
//   onClose            — slide closed
//   draft              — current draft text (controlled by parent)
//   onChangeDraft      — push the active text back to the parent
//   incomingEmail      — optional inbound message (for reply context)
//   subject            — optional subject (for richer scoring)

interface Props {
  open: boolean
  onClose: () => void
  draft: string
  onChangeDraft: (next: string) => void
  incomingEmail?: string
  subject?: string
}

const GOALS: Array<{ id: string; label: string; emoji: string }> = [
  { id: 'more_professional',   label: 'More professional', emoji: '👔' },
  { id: 'more_casual',         label: 'More casual',       emoji: '👋' },
  { id: 'less_robotic',        label: 'Less robotic',      emoji: '🤖' },
  { id: 'remove_ai_tells',     label: 'Remove AI tells',   emoji: '🧹' },
  { id: 'more_human',          label: 'More human',        emoji: '🫶' },
  { id: 'push_for_meeting',    label: 'Push for meeting',  emoji: '📅' },
  { id: 'shorter',             label: 'Shorter',           emoji: '✂' },
  { id: 'add_personalization', label: 'More personal',     emoji: '🎯' },
]

interface ChatTurn {
  id: string
  goal?: string
  instruction?: string
  rewrite: string
  score: number
  rationale: string
  message_to_user: string | null
  applied: boolean
}

export default function EmailCoachPanel({ open, onClose, draft, onChangeDraft, incomingEmail, subject }: Props) {
  const { toast } = useToast()
  const [originalDraft] = useState(draft)
  const [history, setHistory] = useState<ChatTurn[]>([])
  const [pendingGoal, setPendingGoal] = useState<string | null>(null)
  const [freeformText, setFreeformText] = useState('')
  const [submittingFreeform, setSubmittingFreeform] = useState(false)
  const [aiScore, setAiScore] = useState<number | null>(null)
  const [aiRationale, setAiRationale] = useState<string>('')

  // Live heuristic score on every keystroke. Cheap, no API call.
  const heuristic = useMemo<ScoreBreakdown>(
    () => scoreEmail(draft, { subject, incoming: incomingEmail }),
    [draft, subject, incomingEmail]
  )

  // The "currently displayed" score — prefer the AI's score if it's
  // attached to the current draft (i.e. the user just applied a rewrite
  // and hasn't typed since). Otherwise fall back to heuristic.
  const displayScore = aiScore ?? heuristic.score
  const displayRationale = aiScore != null ? aiRationale : null
  const scoreColor =
    displayScore >= 8 ? 'text-success' :
    displayScore >= 6 ? 'text-accent' :
    displayScore >= 4 ? 'text-warning' :
    'text-danger'

  useEffect(() => {
    // Whenever the user types, invalidate any stuck AI score.
    setAiScore(null)
  }, [draft])

  async function runGoal(goalId: string, customInstruction?: string) {
    if (!draft.trim()) {
      toast({ title: 'Add a draft first', description: 'The coach rewrites your existing text.', type: 'warning' })
      return
    }
    setPendingGoal(goalId)
    try {
      const { data, error } = await supabase.functions.invoke('email-coach', {
        body: {
          text: draft,
          incoming_email: incomingEmail || '',
          goal: goalId,
          instruction: customInstruction || '',
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const turn: ChatTurn = {
        id: `t${Date.now()}`,
        goal: goalId,
        instruction: customInstruction,
        rewrite: data.rewritten_text || draft,
        score: typeof data.score === 'number' ? data.score : 0,
        rationale: data.rationale || '',
        message_to_user: data.message_to_user || null,
        applied: false,
      }
      setHistory(prev => [turn, ...prev].slice(0, 10))

      if (turn.message_to_user) {
        toast({ title: 'Coach', description: turn.message_to_user, type: 'info' })
      }
    } catch (e: any) {
      toast({ title: 'Coach failed', description: String(e?.message || e), type: 'error' })
    } finally {
      setPendingGoal(null)
    }
  }

  async function runFreeform() {
    if (!freeformText.trim()) return
    const instruction = freeformText.trim()
    setFreeformText('')
    setSubmittingFreeform(true)
    await runGoal('free_form', instruction)
    setSubmittingFreeform(false)
  }

  function applyTurn(t: ChatTurn) {
    onChangeDraft(t.rewrite)
    setAiScore(t.score)
    setAiRationale(t.rationale)
    setHistory(prev => prev.map(x => ({ ...x, applied: x.id === t.id })))
  }

  function resetToOriginal() {
    onChangeDraft(originalDraft)
    setAiScore(null)
    setHistory(prev => prev.map(x => ({ ...x, applied: false })))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="email-coach-title">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <div className="w-full sm:w-[480px] max-w-full bg-bg-primary border-l border-border flex flex-col">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <div>
            <h2 id="email-coach-title" className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" /> Email coach
            </h2>
            <p className="text-[10px] text-text-muted mt-0.5">
              Rewrites your draft per a goal. Stays in scope — no off-topic chat.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Goal chips — quick rewrites */}
        <div className="border-b border-border px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider font-mono text-text-muted mb-2">Quick goals</div>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map(g => (
              <button
                key={g.id}
                onClick={() => runGoal(g.id)}
                disabled={!!pendingGoal}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-border bg-bg-card text-text-secondary hover:text-text-primary hover:border-accent/40 disabled:opacity-50"
              >
                <span>{g.emoji}</span> {g.label}
                {pendingGoal === g.id && <Loader2 className="w-3 h-3 animate-spin" />}
              </button>
            ))}
          </div>
        </div>

        {/* History — most recent first */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {history.length === 0 && (
            <div className="text-center text-xs text-text-muted py-8 px-4">
              Pick a goal above or type your own instruction below.
              <br />
              Examples: "Make it 3 sentences", "Stronger ask at the end", "Less stiff".
            </div>
          )}
          {history.map(t => (
            <div key={t.id} className={`bg-bg-card border rounded p-3 ${t.applied ? 'border-success/40' : 'border-border'}`}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                  {t.goal && t.goal !== 'free_form' && (
                    <Badge tone="info">{GOALS.find(g => g.id === t.goal)?.label || t.goal}</Badge>
                  )}
                  {t.instruction && (
                    <span className="text-text-muted italic truncate max-w-[200px]" title={t.instruction}>
                      "{t.instruction}"
                    </span>
                  )}
                </div>
                <Badge tone={t.score >= 8 ? 'success' : t.score >= 6 ? 'accent' : 'warning'}>
                  {t.score}/10
                </Badge>
              </div>
              <pre className="text-xs text-text-primary whitespace-pre-wrap font-sans leading-relaxed">{t.rewrite}</pre>
              {t.rationale && <p className="text-[10px] text-text-muted mt-2 italic">{t.rationale}</p>}
              <div className="flex items-center justify-end gap-1.5 mt-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(t.rewrite); toast({ title: 'Copied', type: 'success' }) }}
                  className="text-text-muted hover:text-accent p-1"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <Button size="sm" variant={t.applied ? 'ghost' : 'primary'} onClick={() => applyTurn(t)} disabled={t.applied}>
                  {t.applied ? '✓ Applied' : 'Apply to draft'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Free-form instruction box */}
        <div className="border-t border-border px-4 py-3">
          <textarea
            rows={2}
            value={freeformText}
            onChange={(e) => setFreeformText(e.target.value)}
            placeholder="Custom instruction… (e.g. 'cut the second paragraph')"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runFreeform() }}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
            disabled={submittingFreeform}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-text-muted font-mono">
              {heuristic.word_count} words · ⌘↵ to send
            </span>
            <Button size="sm" disabled={!freeformText.trim() || submittingFreeform} onClick={runFreeform}>
              {submittingFreeform ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Rewriting…</> : <><Send className="w-3.5 h-3.5" /> Rewrite</>}
            </Button>
          </div>
        </div>

        {/* Live score — pinned to bottom */}
        <div className="border-t border-border px-4 py-3 bg-bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-text-muted">
                {aiScore != null ? 'AI score' : 'Live score'}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{displayScore}</span>
                <span className="text-sm text-text-muted">/10</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={resetToOriginal}
                disabled={draft === originalDraft}
                className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-accent disabled:opacity-50"
              >
                <Undo2 className="w-3 h-3" /> Reset to original
              </button>
              <button
                onClick={() => runGoal('more_human')}
                disabled={!!pendingGoal}
                className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Run again
              </button>
            </div>
          </div>
          {displayRationale && (
            <p className="text-[10px] text-text-muted mt-2 italic">{displayRationale}</p>
          )}
          {aiScore == null && heuristic.factors.length > 0 && (
            <div className="text-[10px] text-text-muted mt-2 space-y-0.5">
              {heuristic.factors.slice(0, 3).map((f, i) => (
                <div key={i}>
                  <span className={f.delta > 0 ? 'text-success' : 'text-warning'}>{f.delta > 0 ? '+' : ''}{f.delta}</span>
                  {' '}{f.label}{f.note ? ` — ${f.note}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
