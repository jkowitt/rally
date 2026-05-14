import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { useDialog } from '@/hooks/useDialog'
import { Paperclip, X, Calendar, AlertTriangle, Brain, Sparkles } from 'lucide-react'
import { lintEmail, hasBlockers } from '@/lib/deliverability'
import EmailCoachPanel from '@/components/EmailCoachPanel'
import ProspectingChatPanel from '@/components/ProspectingChatPanel'
import { MessageCircle } from 'lucide-react'

const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB per Gmail/Outlook

// Read a File object and return its bytes as base64 (no data:URL prefix).
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const base64 = result.split(',')[1] || ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Compose-and-send email modal. Routes through the connected
// provider (Outlook → outlook-graph 'send' action; Gmail →
// gmail-graph 'send' action).
//
// Used standalone via the inbox compose button, or in-context from
// a deal/contact card with `to` pre-filled. `generateDraft` enables
// an AI-draft button that replaces the body with personalized copy.
export default function ComposeEmail({
  open,
  onClose,
  defaultTo,
  defaultCc,
  defaultSubject,
  defaultBody,
  dealId,
  generateDraft,
  inReplyToMessageId,
  threadId,
  defaultProvider,
}) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const dialogRef = useDialog({ isOpen: open, onClose })
  const fileInputRef = useRef(null)

  const [to, setTo] = useState(defaultTo || '')
  const [cc, setCc] = useState(defaultCc || '')
  const [showCc, setShowCc] = useState(!!defaultCc)
  const [subject, setSubject] = useState(defaultSubject || '')
  const [body, setBody] = useState(defaultBody || '')
  const [attachments, setAttachments] = useState([])    // [{ name, type, size, data }]
  const [provider, setProvider] = useState(defaultProvider || 'outlook')   // 'outlook' | 'gmail'
  const [sending, setSending] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  // Personality-aware tone hint. Looks up the recipient's
  // contact_personalities row by email + property; renders a
  // one-line nudge ("direct + fast pace · prefers data over story").
  const [tonePersonality, setTonePersonality] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const recipient = (to || '').split(',')[0]?.trim().toLowerCase()
      if (!recipient || !profile?.property_id) {
        setTonePersonality(null)
        return
      }
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('property_id', profile.property_id)
        .ilike('email', recipient)
        .maybeSingle()
      if (cancelled || !contact?.id) { setTonePersonality(null); return }
      const { data } = await supabase
        .from('contact_personalities')
        .select('disc_type, communication_style, preferred_pace, decision_drivers, recommended_phrases, avoid_phrases')
        .eq('contact_id', contact.id)
        .maybeSingle()
      if (!cancelled) setTonePersonality(data || null)
    }
    if (open) load()
    return () => { cancelled = true }
  }, [open, to, profile?.property_id])

  // Reset state when the modal opens with new defaults.
  useEffect(() => {
    if (!open) return
    setTo(defaultTo || '')
    setCc(defaultCc || '')
    setShowCc(!!defaultCc)
    setSubject(defaultSubject || '')
    setBody(defaultBody || '')
    setAttachments([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Resolved signature for the currently-selected provider. Loaded
  // once when the modal opens and re-resolves whenever the rep flips
  // between Outlook / Gmail. Order of preference: per-provider
  // override → profile.email_signature_html → profile.email_signature
  // (plain). HTML signatures get appended as HTML; plain ones as text.
  const [signature, setSignature] = useState({ html: '', isHtml: false })
  const [includeSignature, setIncludeSignature] = useState(true)
  useEffect(() => {
    if (!open || !profile?.id) return
    let alive = true
    ;(async () => {
      const { getEffectiveSignatures, pickSignatureForProvider } = await import('@/services/emailSignatureService')
      const sigs = await getEffectiveSignatures(profile.id)
      if (!alive) return
      setSignature(pickSignatureForProvider(sigs, provider))
    })()
    return () => { alive = false }
  }, [open, profile?.id, provider])

  // Concatenate body + signature for send. We keep them separate in
  // the UI so the textarea stays clean (the previous behaviour
  // injected raw signature HTML into a plain <textarea>, which the
  // user saw as `<div style="…">` markup).
  function buildOutgoingBody() {
    if (!includeSignature || !signature.html) return body
    if (signature.isHtml) {
      const baseHtml = body ? `<div>${body.replace(/\n/g, '<br/>')}</div>` : ''
      return baseHtml + `<br/><br/>${signature.html}`
    }
    return body ? `${body}\n\n${signature.html}` : `\n\n${signature.html}`
  }

  if (!open) return null

  async function handleDraft() {
    if (!generateDraft) return
    setDrafting(true)
    try {
      const result = await generateDraft()
      if (result) {
        if (result.subject && !subject) setSubject(result.subject)
        setBody(result.body || '')
        toast({ title: 'Draft generated', type: 'success' })
      }
    } catch (err) {
      toast({ title: 'Could not draft email', description: humanError(err), type: 'error' })
    } finally {
      setDrafting(false)
    }
  }

  async function handleAttach(e) {
    const files = Array.from(e.target.files || [])
    const next = []
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) {
        toast({ title: 'File too large', description: `${f.name} is over the 25 MB limit.`, type: 'warning' })
        continue
      }
      try {
        const data = await fileToBase64(f)
        next.push({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, data })
      } catch (err) {
        toast({ title: 'Couldn\'t read file', description: humanError(err), type: 'error' })
      }
    }
    setAttachments(prev => [...prev, ...next])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeAttachment(name) {
    setAttachments(prev => prev.filter(a => a.name !== name))
  }

  // Insert the user's booking link at the cursor (or end of body).
  // Pulled from profile.calendar_booking_url.
  function insertBookingLink() {
    const url = profile?.calendar_booking_url
    if (!url) {
      toast({
        title: 'No booking link set',
        description: 'Add one in Settings → Profile → Calendar booking URL.',
        type: 'warning',
      })
      return
    }
    const label = profile?.calendar_booking_label || 'Book a time'
    const snippet = `\n\n${label}: ${url}\n`
    setBody(prev => (prev || '') + snippet)
  }

  async function handleSend() {
    if (!to.trim()) {
      toast({ title: 'Add a recipient', type: 'warning' })
      return
    }
    // Pre-send deliverability lint. Hard-blocks on 'block' level
    // (empty subject/body, invalid email, unrendered merge tags);
    // warns are visible inline but do not block.
    const issues = lintEmail({ to, subject, body })
    if (hasBlockers(issues)) {
      toast({
        title: 'Cannot send yet',
        description: issues.find(i => i.level === 'block')?.message || 'Resolve the blocking issues first.',
        type: 'error',
      })
      return
    }
    setSending(true)
    try {
      const fnName = provider === 'gmail' ? 'gmail-graph' : 'outlook-graph'
      const { error } = await supabase.functions.invoke(fnName, {
        body: {
          action: 'send',
          to: to.split(',').map(s => s.trim()).filter(Boolean),
          cc: cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          subject,
          body: buildOutgoingBody(),
          attachments: attachments.map(a => ({
            filename: a.name,
            mimeType: a.type,
            data: a.data,
          })),
          deal_id: dealId,
          user_id: profile?.id,
          in_reply_to_message_id: inReplyToMessageId || undefined,
          thread_id: threadId || undefined,
        },
      })
      if (error) throw error
      toast({ title: 'Sent', description: `Email sent via ${provider}.`, type: 'success' })
      onClose()
    } catch (err) {
      toast({ title: 'Send failed', description: humanError(err), type: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-title"
        tabIndex={-1}
        className="bg-bg-surface border border-border rounded-t-xl sm:rounded-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <h2 id="compose-title" className="text-lg font-semibold text-text-primary">New message</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider">Send via</label>
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => setProvider('outlook')}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  provider === 'outlook' ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted hover:text-text-primary'
                }`}
              >
                Outlook
              </button>
              <button
                onClick={() => setProvider('gmail')}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  provider === 'gmail' ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted hover:text-text-primary'
                }`}
              >
                Gmail
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-text-muted uppercase tracking-wider">To</label>
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-[11px] text-text-muted hover:text-accent"
                >
                  + Cc
                </button>
              )}
            </div>
            <RecipientField
              value={to}
              onChange={setTo}
              placeholder="recipient@example.com (comma-separate or pick a contact)"
              propertyId={profile?.property_id}
              autoFocus
            />
          </div>

          {showCc && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-text-muted uppercase tracking-wider">Cc</label>
                <button
                  type="button"
                  onClick={() => { setShowCc(false); setCc('') }}
                  className="text-[11px] text-text-muted hover:text-text-primary"
                >
                  Remove Cc
                </button>
              </div>
              <RecipientField
                value={cc}
                onChange={setCc}
                placeholder="cc@example.com (comma-separate or pick a contact)"
                propertyId={profile?.property_id}
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1"
            />
          </div>

          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              rows={10}
              className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-accent mt-1 resize-none font-mono shadow-inner"
            />
          </div>

          {/* Signature preview. Kept separate from the textarea so
              HTML signatures (Outlook ships them with inline styles)
              don't pollute the compose box with raw markup. Rendered
              live so the rep can confirm what'll be appended. */}
          {signature.html && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-text-muted uppercase tracking-wider">
                  Signature {includeSignature ? '(will be appended)' : '(disabled for this message)'}
                </label>
                <button
                  type="button"
                  onClick={() => setIncludeSignature(v => !v)}
                  className="text-[11px] text-text-muted hover:text-accent"
                >
                  {includeSignature ? 'Don’t include' : 'Include signature'}
                </button>
              </div>
              {includeSignature && (
                signature.isHtml ? (
                  <div
                    className="bg-white border border-slate-200 rounded p-3 text-sm text-slate-700 max-h-40 overflow-y-auto shadow-inner"
                    dangerouslySetInnerHTML={{ __html: signature.html }}
                  />
                ) : (
                  <pre className="bg-white border border-slate-200 rounded p-3 text-sm text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans shadow-inner">
                    {signature.html}
                  </pre>
                )
              )}
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11px] text-text-muted uppercase tracking-wider">Attachments ({attachments.length})</label>
              <ul className="space-y-1">
                {attachments.map(a => (
                  <li key={a.name} className="flex items-center justify-between bg-bg-card border border-border rounded px-2 py-1.5 text-xs">
                    <span className="text-text-primary truncate">
                      📎 {a.name} <span className="text-text-muted">({(a.size / 1024).toFixed(0)} KB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.name)}
                      aria-label={`Remove ${a.name}`}
                      className="text-text-muted hover:text-danger ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dealId && (
            <div className="text-xs text-text-muted">
              This message will be logged to the deal timeline automatically.
            </div>
          )}
          <div className="text-[10px] text-text-muted font-mono">
            ✓ Tracked: opens + link clicks · plain text auto-converted to HTML so the tracking pixel and link rewriter fire.
          </div>

          {/* Personality-aware tone hint. Renders only when the
              recipient has a contact_personalities row. Hint is a
              suggestion — author keeps full control. */}
          {tonePersonality && (
            <div className="bg-accent/5 border border-accent/30 rounded p-2 flex items-start gap-2">
              <Brain className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
              <div className="text-[11px] text-text-secondary flex-1">
                <span className="font-medium text-text-primary">Tone hint:</span>{' '}
                {tonePersonality.disc_type && <span className="font-mono text-accent">{tonePersonality.disc_type}</span>}
                {tonePersonality.communication_style && (
                  <span className="ml-1">· {tonePersonality.communication_style}</span>
                )}
                {tonePersonality.preferred_pace && (
                  <span className="ml-1">· {tonePersonality.preferred_pace} pace</span>
                )}
                {tonePersonality.decision_drivers?.length > 0 && (
                  <span className="ml-1">· prioritizes {tonePersonality.decision_drivers.slice(0, 2).join(', ')}</span>
                )}
                {tonePersonality.recommended_phrases?.length > 0 && (
                  <div className="mt-0.5 text-text-muted">Use: <span className="italic">{tonePersonality.recommended_phrases.slice(0, 2).join('; ')}</span></div>
                )}
                {tonePersonality.avoid_phrases?.length > 0 && (
                  <div className="text-text-muted">Avoid: <span className="italic">{tonePersonality.avoid_phrases.slice(0, 2).join('; ')}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Deliverability lint output. Renders inline as the
              user types so they see warnings before clicking Send. */}
          {(() => {
            const issues = lintEmail({ to, subject, body })
            if (issues.length === 0) return null
            return (
              <div className="space-y-1 mt-1">
                {issues.map((i, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 text-[11px] rounded px-2 py-1.5 ${
                      i.level === 'block'
                        ? 'bg-danger/10 text-danger border border-danger/30'
                        : 'bg-warning/10 text-warning border border-warning/30'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{i.message}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        <div className="p-4 sm:p-5 border-t border-border flex items-center justify-between gap-2 flex-wrap">
          <div>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleAttach}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Paperclip className="w-3.5 h-3.5" /> Attach files
            </Button>
            {profile?.calendar_booking_url && (
              <Button
                variant="secondary"
                size="sm"
                onClick={insertBookingLink}
                type="button"
                title="Insert your calendar booking link at the bottom of the message"
              >
                <Calendar className="w-3.5 h-3.5" /> Insert booking link
              </Button>
            )}
            {generateDraft && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDraft}
                disabled={drafting || sending}
                type="button"
                title="AI-generate a personalized first draft from the prospect's data"
              >
                {drafting ? 'Drafting…' : '✨ Draft with AI'}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCoachOpen(true)}
              type="button"
              title="Open the email coach — goal-oriented rewrites + live score"
              disabled={sending}
            >
              <Sparkles className="w-3.5 h-3.5" /> Coach
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setChatOpen(true)}
              type="button"
              title="Open the outreach copilot — chat through email feedback, follow-up tactics, and rewrites"
              disabled={sending}
            >
              <MessageCircle className="w-3.5 h-3.5" /> Chat
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || !to.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </div>
      </div>

      <EmailCoachPanel
        open={coachOpen}
        onClose={() => setCoachOpen(false)}
        draft={body}
        onChangeDraft={setBody}
        subject={subject}
      />

      {/* Outreach copilot — same chat infra as the Pipeline copilot,
          but seeded with the live draft + recipient context so the
          model can analyze and rewrite specifically. */}
      <ProspectingChatPanel
        mode="outreach"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        emailContext={{
          draft: body,
          subject,
          recipient_email: (to || '').split(',')[0]?.trim() || '',
          recipient_name: tonePersonality?.full_name || '',
          recipient_company: tonePersonality?.company || '',
          recipient_title: tonePersonality?.position || tonePersonality?.title || '',
        }}
      />
    </div>
  )
}

// RecipientField — email input with an autocomplete dropdown that
// searches the workspace's contacts table by name + email + company.
// Comma-separated multi-recipient still works (the underlying input
// accepts any text); the picker just makes it one click instead of
// remembering an email address. Selecting a contact appends its
// email to whatever's already in the field, so the rep can build
// up multiple recipients from the picker, paste, or both.
function RecipientField({ value, onChange, placeholder, propertyId, autoFocus }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  // Live search the contacts table. Debounce 180ms so each
  // keystroke doesn't fire a request. Pulls top 8 contacts that
  // match the trailing token (the part the user is currently
  // typing after the last comma) — so "alice@x.com, bo" returns
  // contacts whose name/email starts with "bo".
  useEffect(() => {
    if (!propertyId) { setResults([]); return }
    // Extract the active token — everything after the last comma.
    const tokens = (value || '').split(',')
    const active = (tokens[tokens.length - 1] || '').trim()
    setQuery(active)
    if (active.length < 2) { setResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const like = `%${active.replace(/[%_]/g, '')}%`
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, company, position')
        .eq('property_id', propertyId)
        .not('email', 'is', null)
        .or(`email.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},company.ilike.${like}`)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(8)
      setResults(data || [])
      setHighlight(0)
    }, 180)
    return () => clearTimeout(debounceRef.current)
  }, [value, propertyId])

  function pick(contact) {
    if (!contact?.email) return
    // Replace the active (trailing) token with the picked email,
    // preserving any earlier comma-separated recipients.
    const tokens = (value || '').split(',').map(t => t.trim()).filter(Boolean)
    if (tokens.length > 0) tokens.pop()
    tokens.push(contact.email)
    const next = tokens.join(', ') + ', '
    onChange(next)
    setOpen(false)
    setResults([])
    inputRef.current?.focus()
  }

  function onKeyDown(e) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault()
      pick(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative mt-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}   /* let click register */
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 left-0 right-0 bg-bg-surface border border-border rounded-lg shadow-2xl max-h-64 overflow-y-auto">
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(c) }}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3 ${i === highlight ? 'bg-bg-card' : 'hover:bg-bg-card/60'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-text-primary truncate">
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                  </div>
                  <div className="text-[11px] text-text-muted truncate">
                    {c.email}
                    {c.position && <span className="text-text-secondary"> · {c.position}</span>}
                    {c.company && <span className="text-text-secondary"> · {c.company}</span>}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-accent shrink-0">↵</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
