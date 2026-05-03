import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { useDialog } from '@/hooks/useDialog'

// Compose-and-send email modal. Routes through the connected
// provider (Outlook → outlook-graph 'send' action; Gmail →
// gmail-graph 'send' action).
//
// Used standalone via the inbox compose button, or in-context from
// a deal/contact card with `to` pre-filled.
export default function ComposeEmail({ open, onClose, defaultTo, defaultSubject, dealId }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const dialogRef = useDialog({ isOpen: open, onClose })
  const [to, setTo] = useState(defaultTo || '')
  const [subject, setSubject] = useState(defaultSubject || '')
  const [body, setBody] = useState('')
  const [provider, setProvider] = useState('outlook')   // 'outlook' | 'gmail'
  const [sending, setSending] = useState(false)

  if (!open) return null

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
          subject,
          body,
          deal_id: dealId,
          user_id: profile?.id,
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
            <label className="text-[11px] text-text-muted uppercase tracking-wider">To</label>
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
              className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent mt-1 resize-none"
            />
          </div>

          {dealId && (
            <div className="text-xs text-text-muted">
              This message will be logged to the deal timeline automatically.
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-border flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !to.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
