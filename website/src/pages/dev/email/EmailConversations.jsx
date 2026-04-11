import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as conv from '@/services/email/conversationService'

/**
 * Inbox-style two-panel layout. Left: conversation list with tabs.
 * Right: full thread + reply composer + smart replies + notes.
 */
export default function EmailConversations() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [notes, setNotes] = useState([])
  const [tab, setTab] = useState('open')
  const [search, setSearch] = useState('')
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyDraft, setReplyDraft] = useState({ subject: '', body: '' })
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  useEffect(() => { reload() }, [tab, search])
  useEffect(() => { if (id) openConversation(id) }, [id])

  async function reload() {
    const { conversations } = await conv.listConversations({ status: tab, search })
    setConversations(conversations)
  }

  async function openConversation(convId) {
    const { conversation } = await conv.getConversation(convId)
    setActive(conversation)
    const [m, n] = await Promise.all([
      conv.getMessages(convId),
      conv.getNotes(convId),
    ])
    setMessages(m)
    setNotes(n)
    await conv.markAsRead(convId)
    reload()
  }

  async function requestSuggestions() {
    if (!active || messages.length === 0) return
    setLoadingSuggestions(true)
    const last = [...messages].reverse().find(m => m.direction === 'inbound')
    const s = await conv.getSmartReplies(active, last)
    setSuggestions(s || [])
    setLoadingSuggestions(false)
  }

  function insertSuggestion(s) {
    setReplyDraft({ subject: s.subject, body: s.body })
    setSuggestions([])
  }

  async function sendReply() {
    if (!active || !replyDraft.body.trim()) return
    const r = await conv.sendReply(active.id, {
      subject: replyDraft.subject || `Re: ${active.subject}`,
      bodyHtml: replyDraft.body.replace(/\n/g, '<br>'),
      bodyText: replyDraft.body,
      fromEmail: profile.email,
      fromName: profile.full_name || 'Jason',
    })
    if (r.success) {
      setReplyOpen(false)
      setReplyDraft({ subject: '', body: '' })
      openConversation(active.id)
    }
  }

  async function changeStatus(status) {
    await conv.updateConversation(active.id, { status })
    openConversation(active.id)
    reload()
  }

  return (
    <div className="h-[calc(100vh-110px)] flex">
      {/* Left: list */}
      <aside className="w-[35%] min-w-[260px] border-r border-border flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs"
          />
          <div className="flex gap-1">
            {['all', 'open', 'replied', 'closed', 'archived'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-[10px] px-2 py-1 rounded capitalize ${tab === t ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && <div className="p-4 text-xs text-text-muted text-center">No conversations</div>}
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => { navigate(`/dev/email/conversations/${c.id}`); openConversation(c.id) }}
              className={`w-full text-left p-3 border-b border-border hover:bg-bg-card ${active?.id === c.id ? 'bg-bg-card border-l-2 border-l-accent' : ''}`}
            >
              <div className="flex items-center gap-2">
                {c.unread_count > 0 && <div className="w-2 h-2 rounded-full bg-accent" />}
                <div className={`text-[11px] ${c.unread_count > 0 ? 'font-semibold text-text-primary' : 'text-text-secondary'} truncate flex-1`}>
                  {c.email_subscribers?.first_name} {c.email_subscribers?.last_name}
                </div>
                {c.crm_contact_id && <span className="text-[9px] text-accent">🔗</span>}
              </div>
              <div className="text-[10px] text-text-muted truncate">{c.email_subscribers?.email}</div>
              <div className="text-[10px] text-text-secondary truncate mt-0.5">{c.subject}</div>
              <div className="text-[9px] text-text-muted mt-0.5">{new Date(c.last_message_at).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* Right: thread */}
      <section className="flex-1 flex flex-col min-w-0">
        {!active && <div className="flex-1 flex items-center justify-center text-xs text-text-muted">Select a conversation</div>}
        {active && (
          <>
            <div className="border-b border-border p-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{active.subject}</div>
                <div className="text-[11px] text-text-muted truncate">
                  {active.email_subscribers?.first_name} {active.email_subscribers?.last_name} · {active.email_subscribers?.email}
                </div>
                {active.deals?.brand_name && (
                  <div className="text-[10px] text-accent mt-0.5">Deal: {active.deals.brand_name} · {active.deals.stage}</div>
                )}
              </div>
              <select value={active.status} onChange={e => changeStatus(e.target.value)} className="text-[10px] bg-bg-card border border-border rounded px-2 py-1">
                <option value="open">Open</option>
                <option value="replied">Replied</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-lg p-3 ${m.direction === 'outbound' ? 'bg-accent/10 border border-accent/30' : 'bg-bg-card border border-border'}`}>
                    <div className="text-[10px] text-text-muted mb-1">
                      {m.direction === 'outbound' ? 'You' : m.from_name || m.from_email} · {new Date(m.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-text-primary whitespace-pre-wrap">
                      {m.body_text || stripHtml(m.body_html)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!replyOpen ? (
              <div className="border-t border-border p-4">
                <button onClick={() => setReplyOpen(true)} className="w-full bg-accent text-bg-primary py-2 rounded text-xs font-semibold">Reply</button>
              </div>
            ) : (
              <div className="border-t border-border p-4 space-y-2">
                {suggestions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => insertSuggestion(s)}
                        className="bg-bg-card border border-accent/20 hover:border-accent rounded p-2 text-left"
                      >
                        <div className="text-[9px] font-mono uppercase text-accent">{s.tone}</div>
                        <div className="text-[10px] text-text-secondary line-clamp-2 mt-1">{s.body}</div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={requestSuggestions} disabled={loadingSuggestions} className="text-[10px] px-2 py-1 border border-accent/30 text-accent rounded">
                    {loadingSuggestions ? 'Loading…' : '✨ Smart replies'}
                  </button>
                </div>
                <input
                  value={replyDraft.subject}
                  onChange={e => setReplyDraft({ ...replyDraft, subject: e.target.value })}
                  placeholder={`Re: ${active.subject}`}
                  className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs"
                />
                <textarea
                  value={replyDraft.body}
                  onChange={e => setReplyDraft({ ...replyDraft, body: e.target.value })}
                  rows={6}
                  placeholder="Your reply…"
                  className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs"
                />
                <div className="flex gap-2">
                  <button onClick={() => setReplyOpen(false)} className="flex-1 border border-border py-2 rounded text-xs">Cancel</button>
                  <button onClick={sendReply} disabled={!replyDraft.body.trim()} className="flex-1 bg-accent text-bg-primary py-2 rounded text-xs font-semibold disabled:opacity-50">
                    Send via email
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
}
