import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { useDialog } from '@/hooks/useDialog'
import { Paperclip, X, Calendar } from 'lucide-react'

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

  // Auto-append signature on first open. Pull from profile.email_signature.
  useEffect(() => {
    if (!open || !profile) return
    const sig = profile?.email_signature
    if (sig && !body.includes(sig)) {
      setBody(prev => prev ? `${prev}\n\n${sig}` : `\n\n${sig}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile?.email_signature])

  if (!open) return null

  async function handleDraft() {
    if (!generateDraft) return
    setDrafting(true)
    try {
      const result = await generateDraft()
      if (result) {
        if (result.subject && !subject) setSubject(result.subject)
        // Replace body but keep signature if it was already there
        const sig = profile?.email_signature
        const draft = sig && !result.body.includes(sig)
          ? `${result.body}\n\n${sig}`
          : result.body
        setBody(draft)
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
    setSending(true)
    try {
      const fnName = provider === 'gmail' ? 'gmail-graph' : 'outlook-graph'
      const { error } = await supabase.functions.invoke(fnName, {
        body: {
          action: 'send',
          to: to.split(',').map(s => s.trim()).filter(Boolean),
          cc: cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          subject,
          body,
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
            <input
              type="email"
              multiple
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com (comma-separate multiple)"
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1"
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
              <input
                type="email"
                multiple
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com (comma-separate multiple)"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1"
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
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1 resize-none font-mono"
            />
          </div>

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
    </div>
  )
}
