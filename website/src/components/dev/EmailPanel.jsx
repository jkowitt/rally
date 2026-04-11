import { useEffect, useState } from 'react'
import { getEmailDetail, getConversation } from '@/services/dev/emailSyncService'

/**
 * Center panel — full email detail + inline thread view.
 */
export default function EmailPanel({ emailId, onLink, onIgnore }) {
  const [email, setEmail] = useState(null)
  const [thread, setThread] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!emailId) { setEmail(null); setThread([]); return }
    setLoading(true)
    ;(async () => {
      const { email: e } = await getEmailDetail(emailId)
      setEmail(e)
      if (e?.conversation_id) {
        const { emails } = await getConversation(e.conversation_id)
        setThread(emails)
      }
      setLoading(false)
    })()
  }, [emailId])

  if (!emailId) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-text-muted">
        Select an email to view details
      </div>
    )
  }

  if (loading || !email) {
    return <div className="p-4 text-xs text-text-muted">Loading…</div>
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="border-b border-border pb-3 space-y-1">
        <div className="text-base font-semibold text-text-primary">{email.subject || '(no subject)'}</div>
        <div className="text-[11px] text-text-muted">
          <span className="font-medium text-text-secondary">{email.from_name || email.from_email}</span>
          {' · '}{new Date(email.received_at || email.sent_at).toLocaleString()}
        </div>
        <div className="text-[10px] text-text-muted">
          To: {(email.to_emails || []).join(', ')}
          {email.cc_emails?.length > 0 && ` · Cc: ${email.cc_emails.join(', ')}`}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge
            label={email.linked_contact_id ? 'Linked' : 'Unlinked'}
            ok={!!email.linked_contact_id}
          />
          {email.has_attachments && <StatusBadge label="📎 Attachments" />}
          {email.folder && <StatusBadge label={email.folder} />}
        </div>
      </div>

      {/* Body */}
      <div className="prose prose-invert max-w-none text-xs text-text-secondary">
        {email.body_html ? (
          <div
            dangerouslySetInnerHTML={{ __html: sanitize(email.body_html) }}
            className="email-body"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans">{email.body_text || email.body_preview || '(empty body)'}</pre>
        )}
      </div>

      {/* Thread */}
      {thread.length > 1 && (
        <div className="border-t border-border pt-4 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Thread ({thread.length})</div>
          {thread.map(t => (
            <div key={t.id} className="bg-bg-card border border-border rounded p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-text-primary">{t.from_name || t.from_email}</span>
                <span className="text-[9px] text-text-muted">{new Date(t.received_at).toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-text-muted mt-1 line-clamp-2">{t.body_preview}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 sticky bottom-0 bg-bg-primary pt-2 border-t border-border">
        <button onClick={() => onLink?.(email)} className="flex-1 bg-accent text-bg-primary py-2 rounded text-xs font-semibold">
          {email.linked_contact_id ? 'Re-link' : 'Link to Contact'}
        </button>
        <button onClick={() => onIgnore?.(email)} className="flex-1 border border-border text-text-secondary py-2 rounded text-xs">
          Ignore
        </button>
      </div>
    </div>
  )
}

function StatusBadge({ label, ok }) {
  const cls = ok ? 'bg-success/15 text-success border-success/30' : 'bg-bg-card text-text-muted border-border'
  return <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>
}

// Very conservative HTML sanitization — strip script/style/iframe tags.
// This is a developer-only tool so the caller is trusted, but we still
// want to prevent inline script execution from hostile senders.
function sanitize(html) {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}
