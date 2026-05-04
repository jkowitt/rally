import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useComposeEmail } from '@/hooks/useComposeEmail'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { Mail, Inbox as InboxIcon, Send, Reply, Sparkles } from 'lucide-react'
import { draftReplyEmail, classifyReplyIntent } from '@/lib/claude'

// Maps the classifier's intent string → user-facing label + tone.
const INTENT_META = {
  interested:      { label: 'Interested',      tone: 'success' },
  meeting_request: { label: 'Meeting request', tone: 'success' },
  objection:       { label: 'Objection',       tone: 'warning' },
  not_now:         { label: 'Not now',         tone: 'warning' },
  wrong_person:    { label: 'Wrong person',    tone: 'info' },
  out_of_office:   { label: 'Out of office',   tone: 'neutral' },
  unsubscribe:     { label: 'Unsubscribe',     tone: 'danger' },
  closed_lost:     { label: 'Closed lost',     tone: 'danger' },
  unclear:         { label: 'Unclear',         tone: 'neutral' },
}

// Customer-facing unified inbox. Reads from the email_messages_unified
// view so Outlook + Gmail messages render side-by-side without
// provider-specific code.
//
// Skeleton today — list + selected-message body. Compose lives in
// ComposeEmail.jsx and is launched from this surface or from a deal.
export default function InboxView() {
  const { profile } = useAuth()
  const [folder, setFolder] = useState('inbox')   // 'inbox' | 'sent'
  const [selected, setSelected] = useState(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['email-messages-unified', profile?.property_id, folder],
    queryFn: async () => {
      if (!profile?.property_id) return []
      let q = supabase
        .from('email_messages_unified')
        .select('*')
        .eq('property_id', profile.property_id)
        .eq('ignored', false)
        .order('received_at', { ascending: false })
        .limit(200)
      if (folder === 'inbox') q = q.eq('is_sent', false)
      if (folder === 'sent') q = q.eq('is_sent', true)
      const { data } = await q
      return data || []
    },
    enabled: !!profile?.property_id,
  })

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'CRM & Prospecting', to: '/app' },
        { label: 'Inbox' },
      ]} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Mail className="w-6 h-6 text-accent" />
            Inbox
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Unified view of every connected mailbox.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/crm/inbox/connect">
            <Button variant="secondary" size="sm">Manage connections</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit">
        <FolderTab id="inbox" label="Inbox" icon={InboxIcon} active={folder === 'inbox'} onClick={() => setFolder('inbox')} />
        <FolderTab id="sent" label="Sent" icon={Send} active={folder === 'sent'} onClick={() => setFolder('sent')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
        <Card padding="none" className="overflow-hidden md:col-span-1">
          {isLoading && (
            <div className="divide-y divide-border">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="p-3 space-y-1.5">
                  <div className="h-3 w-2/3 bg-bg-card rounded" />
                  <div className="h-2 w-1/2 bg-bg-card/60 rounded" />
                </div>
              ))}
            </div>
          )}
          {!isLoading && messages.length === 0 && (
            <EmptyState
              icon={<InboxIcon className="w-7 h-7 text-text-muted" />}
              title={folder === 'sent' ? 'No sent messages yet' : 'Your inbox is empty'}
              description={folder === 'sent'
                ? 'Compose a message and any sent mail will land here.'
                : "Once you've connected a mailbox, your messages sync here automatically. New senders become contacts."}
              primaryAction={
                <Link to="/app/crm/inbox/connect">
                  <Button>Connect inbox</Button>
                </Link>
              }
              className="border-0"
            />
          )}
          {!isLoading && messages.length > 0 && (
            <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {messages.map(m => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelected(m)}
                    className={`w-full text-left p-3 hover:bg-bg-card transition-colors ${
                      selected?.id === m.id ? 'bg-bg-card border-l-2 border-accent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm text-text-primary font-medium truncate">
                        {m.from_name || m.from_email || '(unknown sender)'}
                      </div>
                      <Badge tone={m.provider === 'gmail' ? 'danger' : 'info'} className="shrink-0 text-[9px]">
                        {m.provider}
                      </Badge>
                    </div>
                    <div className="text-xs text-text-secondary truncate mt-0.5">
                      {m.subject || '(no subject)'}
                    </div>
                    <div className="text-[11px] text-text-muted truncate mt-0.5">
                      {m.preview}
                    </div>
                    <div className="text-[10px] text-text-muted font-mono mt-1">
                      {m.received_at ? new Date(m.received_at).toLocaleString() : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="lg" className="md:col-span-2">
          {selected ? (
            <MessageDetail message={selected} />
          ) : (
            <div className="text-sm text-text-muted text-center py-12">
              Pick a message on the left to read it.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function FolderTab({ label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

function MessageDetail({ message }) {
  const { profile } = useAuth()
  const composeEmail = useComposeEmail()
  const isInbound = !message.is_sent

  // Auto-classify inbound messages on first open. Cached on the
  // outreach_log row that was created when the email was synced —
  // we look it up by (provider, message_id) and reuse the existing
  // classification if present, else call Claude + persist.
  const { data: intent, isLoading: classifying } = useQuery({
    queryKey: ['reply-intent', message.id, message.provider, message.message_id],
    enabled: !!isInbound && !!message.message_id && !!profile?.property_id,
    staleTime: 1000 * 60 * 60, // 1 hour client-side cache
    queryFn: async () => {
      // 1. Look up the outreach_log row for this provider+message_id
      const { data: log } = await supabase
        .from('outreach_log')
        .select('id, contact_id, deal_id')
        .eq('provider', message.provider)
        .eq('message_id', message.message_id)
        .eq('direction', 'inbound')
        .maybeSingle()

      // 2. Already classified? return the cached row.
      if (log?.id) {
        const { data: existing } = await supabase
          .from('reply_intent_classifications')
          .select('*')
          .eq('outreach_log_id', log.id)
          .order('classified_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (existing) return existing
      }

      // 3. Otherwise classify + persist. Skip persistence if no log row.
      const classification = await classifyReplyIntent({
        subject: message.subject,
        body: message.body_text || message.preview,
        original_subject: '',
      })
      if (!classification) return null
      if (log?.id && profile?.property_id) {
        await supabase.from('reply_intent_classifications').insert({
          property_id: profile.property_id,
          outreach_log_id: log.id,
          contact_id: log.contact_id,
          deal_id: log.deal_id,
          intent: classification.intent,
          confidence: classification.confidence,
          rationale: classification.rationale,
          suggested_action: classification.suggested_action,
        })
      }
      return classification
    },
  })

  // Build the reply Compose payload. The "Suggest reply" button
  // routes the inbound message through contract-ai's draft_email
  // action with email_type='reply' and prefills the body before
  // the user clicks Send.
  function openReply({ withDraft } = {}) {
    if (!message.from_email && !isInbound) return
    const replyTo = isInbound ? message.from_email : (message.to_emails?.[0] || '')
    const subj = (message.subject || '').replace(/^re:\s*/i, '')
    composeEmail.open({
      to: replyTo,
      defaultSubject: `Re: ${subj || '(no subject)'}`,
      defaultBody: '',
      dealId: message.linked_deal_id || null,
      // Threading: pass provider message_id + thread_id so the
      // edge function can stitch In-Reply-To/References (Gmail)
      // or route through /messages/{id}/reply (Outlook).
      inReplyToMessageId: message.message_id,
      threadId: message.thread_id,
      provider: message.provider,
      generateDraft: withDraft
        ? async () => await draftReplyEmail({
            incoming: {
              subject: message.subject,
              body: message.body_text || message.preview,
              from_name: message.from_name,
              from_email: message.from_email,
            },
            senderName: profile?.full_name,
            senderProperty: profile?.properties?.name,
          })
        : undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          {message.subject || '(no subject)'}
        </h2>
        <div className="text-xs text-text-muted mt-1">
          From <strong className="text-text-secondary">{message.from_name || message.from_email}</strong>
          {' '}&middot;{' '}
          {message.received_at ? new Date(message.received_at).toLocaleString() : ''}
        </div>
        {message.linked_deal_id && (
          <Link
            to={`/app/crm/pipeline?deal=${message.linked_deal_id}`}
            className="inline-block text-xs text-accent hover:underline mt-1"
          >
            → Linked to deal
          </Link>
        )}
      </div>

      {isInbound && (intent || classifying) && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-text-muted">AI read:</span>
          {classifying ? (
            <Badge tone="neutral">classifying…</Badge>
          ) : intent ? (
            <>
              <Badge tone={INTENT_META[intent.intent]?.tone || 'neutral'}>
                {INTENT_META[intent.intent]?.label || intent.intent}
              </Badge>
              {intent.confidence != null && (
                <span className="text-[10px] font-mono text-text-muted">
                  {Math.round(Number(intent.confidence) * 100)}%
                </span>
              )}
              {intent.rationale && (
                <span className="text-[11px] text-text-secondary">{intent.rationale}</span>
              )}
            </>
          ) : null}
        </div>
      )}

      {isInbound && message.from_email && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={() => openReply({ withDraft: false })}>
            <Reply className="w-3.5 h-3.5" /> Reply
          </Button>
          <Button size="sm" onClick={() => openReply({ withDraft: true })} title="AI will draft a personalized reply using the inbound message + linked deal context">
            <Sparkles className="w-3.5 h-3.5" /> Suggest reply
          </Button>
        </div>
      )}

      <div className="text-sm text-text-secondary whitespace-pre-wrap">
        {message.body_text || message.preview || '(no body content available)'}
      </div>
    </div>
  )
}
