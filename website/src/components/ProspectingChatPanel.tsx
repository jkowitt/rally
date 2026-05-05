import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { humanError } from '@/lib/humanError'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'

// ProspectingChatPanel — slide-out side panel with a Claude/OpenAI
// powered chat scoped to prospecting, outreach strategies, and
// possible targets. Lives at the right edge of the screen and toggles
// open via a floating button. Conversation is in-memory only — no
// persistence in v1, since the value is in the back-and-forth, not
// the transcript.

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface OutreachContext {
  draft?: string
  subject?: string
  recipient_name?: string
  recipient_email?: string
  recipient_company?: string
  recipient_title?: string
  prospect_notes?: string
}

interface Props {
  // 'prospecting' (default) — floating launcher on Pipeline page,
  // general target-list / outreach strategy chat.
  // 'outreach'  — opened from inside the email composer with a draft
  // attached. Different starter prompts focused on the draft.
  mode?: 'prospecting' | 'outreach'
  // When mode === 'outreach', pass the live draft + recipient info.
  // The edge function injects this into the system prompt so the
  // model can give specific feedback.
  emailContext?: OutreachContext
  // Caller-controlled open state for the outreach mode (since it's
  // typically launched from a button inside another panel rather
  // than its own floating launcher).
  open?: boolean
  onClose?: () => void
}

const PROSPECTING_PROMPTS = [
  'Who should I target first if my property is a college bowl game?',
  'Draft a first-touch email to a CMO at a regional auto dealer.',
  'Build me a 5-step outreach sequence for sponsorship cold outreach.',
  'I keep getting "send me a media kit" replies — what\'s a better follow-up?',
  'My ICP is mid-market beverage brands in the Midwest. Find me 8 targets.',
]

const OUTREACH_PROMPTS = [
  'Analyze this email and tell me what to fix.',
  'Make the subject line more specific to this recipient.',
  'Shorten the body to 80 words and tighten the ask.',
  'My open rates are low — rewrite the opener so it\'s less template-y.',
  'Suggest a follow-up to send if they don\'t respond in 4 days.',
]

export default function ProspectingChatPanel({
  mode = 'prospecting',
  emailContext,
  open: openProp,
  onClose: onCloseProp,
}: Props = {}) {
  const { profile } = useAuth()
  const { toast } = useToast()
  // Internal open state used when the parent doesn't drive it (i.e.
  // the floating-launcher prospecting variant).
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setInternalOpen(v)
    else if (!v) onCloseProp?.()
  }
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-scroll to the latest message whenever the transcript grows.
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
    }
  }, [messages, sending])

  // Focus the input when the panel opens — keeps the rep typing fast.
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open])

  async function send(rawText?: string) {
    const text = (rawText ?? draft).trim()
    if (!text || sending) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setDraft('')
    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('prospecting-chat', {
        body: {
          messages: next,
          property_id: profile?.property_id || null,
          email_context: mode === 'outreach' && emailContext ? emailContext : undefined,
        },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Chat failed')
      setMessages([...next, { role: 'assistant', content: data.reply || '' }])
    } catch (e: any) {
      const msg = humanError(e)
      // Surface as a chat bubble so the rep keeps the thread context.
      setMessages([...next, { role: 'assistant', content: `Sorry — ${msg}` }])
      toast({ title: 'Chat error', description: msg, type: 'error' })
    } finally {
      setSending(false)
    }
  }

  function reset() {
    if (messages.length === 0) return
    if (!confirm('Clear the chat?')) return
    setMessages([])
  }

  const SUGGESTED_PROMPTS = mode === 'outreach' ? OUTREACH_PROMPTS : PROSPECTING_PROMPTS
  const headerTitle = mode === 'outreach' ? 'Outreach copilot' : 'Prospecting copilot'
  const headerSub   = mode === 'outreach' ? 'Email analysis · rewrites · follow-up tactics' : 'Targets · outreach · list strategy'

  return (
    <>
      {/* Floating launcher — only for the standalone prospecting
          variant. In outreach mode the parent (ComposeEmail / coach
          panel) drives `open` via its own button. */}
      {openProp === undefined && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-accent text-bg-primary px-4 py-3 rounded-full shadow-lg hover:opacity-90 transition-opacity ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          aria-label="Open prospecting chat"
          title="Prospecting copilot — ask about target lists, outreach, ICP fit"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Prospecting copilot</span>
        </button>
      )}

      {/* Panel — slides in from the right */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] lg:w-[480px] bg-bg-surface border-l border-border shadow-2xl transition-transform duration-200 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">{headerTitle}</h2>
              <p className="text-[10px] text-text-muted">{headerSub}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={reset}
                className="text-[10px] font-mono text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-bg-card"
                title="Clear chat"
              >
                Reset
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-text-muted hover:text-text-primary p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Transcript */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="text-[11px] text-text-muted leading-relaxed">
                {mode === 'outreach'
                  ? <>I can see your draft and the recipient context. Ask for a critique, a rewrite, or follow-up tactics. I&rsquo;m scoped to email + outreach — not a general chatbot.</>
                  : <>Ask me about prospecting, outreach strategies, or possible targets. I&rsquo;m scoped to those — not a general chatbot. Firmographics I mention are AI-estimated; verify the hard numbers in Apollo/Hunter.</>
                }
              </div>
              <div className="space-y-1.5">
                <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">Try one of these</div>
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => send(p)}
                    className="block w-full text-left text-[11px] bg-bg-card border border-border rounded px-3 py-2 hover:border-accent/40 hover:text-text-primary text-text-secondary"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] text-xs leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-2 ${
                  m.role === 'user'
                    ? 'bg-accent text-bg-primary'
                    : 'bg-bg-card border border-border text-text-primary'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-bg-card border border-border rounded-lg px-3 py-2 text-xs text-text-muted">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="p-3 border-t border-border space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Ask about target lists, outreach, ICP fit…"
            rows={2}
            className="w-full bg-bg-card border border-border rounded px-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
            disabled={sending}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-text-muted">Enter sends · Shift+Enter for newline</span>
            <button
              onClick={() => send()}
              disabled={!draft.trim() || sending}
              className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
