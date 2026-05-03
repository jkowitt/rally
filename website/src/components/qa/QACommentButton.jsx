import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import * as qaComments from '@/services/qaCommentService'

/**
 * Floating QA comment button + capture modal.
 *
 * Visibility rules:
 *   - Only shows for authenticated users
 *   - Only shows when the user has opted in via localStorage key
 *     'll_qa_mode' === 'on', OR is a developer (developers get it
 *     automatically so Jason doesn't have to opt in)
 *
 * To toggle for non-developers: run localStorage.setItem('ll_qa_mode','on')
 * in the console. The button will appear after next reload.
 *
 * Context (URL, title, module, viewport, user agent) is auto-captured
 * on submit — no manual entry required.
 */
export default function QACommentButton() {
  const { profile, realIsDeveloper, session } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [qaMode, setQaMode] = useState(false)

  useEffect(() => {
    try {
      setQaMode(localStorage.getItem('ll_qa_mode') === 'on')
    } catch {}
  }, [])

  // Don't render anything until auth is resolved
  if (!session || !profile) return null

  // Real developer status — survives impersonation so QA capture stays
  // available while the dev is previewing the app as a different role.
  if (!realIsDeveloper && !qaMode) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[90] bg-accent text-bg-primary rounded-full shadow-2xl hover:opacity-90 transition-all w-12 h-12 flex items-center justify-center text-xl font-bold"
        title="Leave a QA comment about this page"
        aria-label="Leave QA comment"
      >
        💬
      </button>

      {open && <CaptureModal profile={profile} onClose={() => setOpen(false)} toast={toast} />}
    </>
  )
}

function CaptureModal({ profile, onClose, toast }) {
  const [comment, setComment] = useState('')
  const [category, setCategory] = useState('note')
  const [priority, setPriority] = useState('normal')
  const [saving, setSaving] = useState(false)
  const [context, setContext] = useState(null)

  useEffect(() => {
    setContext(qaComments.getPageContext())
  }, [])

  async function submit() {
    if (!comment.trim()) return
    setSaving(true)
    const r = await qaComments.createComment(
      { comment: comment.trim(), category, priority },
      profile.id,
      profile.property_id
    )
    setSaving(false)
    if (r.success) {
      toast({ title: 'Comment captured', description: `Saved to QA walkthrough report`, type: 'success' })
      onClose()
    } else {
      toast({ title: 'Failed to save', description: r.error || 'Unknown error', type: 'error' })
    }
  }

  // Keyboard shortcut: Cmd/Ctrl + Enter to submit
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [comment, category, priority])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div
        className="bg-bg-primary border border-accent/30 rounded-lg shadow-2xl max-w-lg w-full p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent">QA Walkthrough</div>
            <h3 className="text-lg font-semibold">Leave a comment</h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">×</button>
        </div>

        {/* Auto-captured context */}
        {context && (
          <div className="bg-bg-card border border-border rounded p-2 text-[10px] space-y-1 text-text-muted">
            <div>
              <span className="text-text-secondary">Page:</span>{' '}
              <span className="font-mono text-text-primary">{context.page_title || context.page_url}</span>
            </div>
            <div>
              <span className="text-text-secondary">URL:</span>{' '}
              <span className="font-mono text-[9px] break-all">{context.page_url}</span>
            </div>
            <div>
              <span className="text-text-secondary">Module:</span>{' '}
              <span className="font-mono text-accent">{context.module}</span>
              {' · '}
              <span className="font-mono">{context.viewport_width}×{context.viewport_height}</span>
            </div>
          </div>
        )}

        {/* Category picker */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-1">Category</label>
          <div className="flex gap-1 flex-wrap">
            {qaComments.CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1 ${category === c.key ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-muted hover:text-text-primary'}`}
              >
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority picker */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-1">Priority</label>
          <div className="flex gap-1">
            {qaComments.PRIORITIES.map(p => (
              <button
                key={p.key}
                onClick={() => setPriority(p.key)}
                className={`text-[11px] px-2 py-1 rounded border ${priority === p.key ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-muted'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comment textarea */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-1">Comment</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            autoFocus
            rows={4}
            placeholder="What did you notice? Be specific — this goes straight into the QA report."
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-y"
          />
          <div className="text-[9px] text-text-muted mt-1">
            Cmd/Ctrl + Enter to submit · Esc to cancel
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-border text-text-secondary py-2 rounded text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !comment.trim()}
            className="flex-1 bg-accent text-bg-primary py-2 rounded text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
