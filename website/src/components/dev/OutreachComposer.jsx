import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as templateService from '@/services/dev/templateService'
import * as outreach from '@/services/dev/outreachService'

/**
 * Composer modal — loads the appropriate template based on the prospect's
 * outreach status, personalizes via Claude, and opens Outlook via mailto:.
 */
export default function OutreachComposer({ prospect, onClose }) {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { templates: ts } = await templateService.listTemplates()
      setTemplates(ts)
      // Pick a default template based on prospect status
      const stage = stageForStatus(prospect.outreach_status)
      const match = ts.find(t => t.stage === stage && (t.industry === prospect.industry || t.industry === 'both')) || ts[0]
      if (match) {
        setSelectedTemplateId(match.id)
        const subbed = templateService.substituteVariables(match, prospect, { name: profile?.full_name })
        setSubject(subbed.subject)
        setBody(subbed.body)
      }
      setLoading(false)
    })()
  }, [prospect?.id])

  function onTemplateChange(id) {
    setSelectedTemplateId(id)
    const t = templates.find(t => t.id === id)
    if (!t) return
    const subbed = templateService.substituteVariables(t, prospect, { name: profile?.full_name })
    setSubject(subbed.subject)
    setBody(subbed.body)
  }

  async function personalize() {
    const t = templates.find(t => t.id === selectedTemplateId)
    if (!t) return
    setAiLoading(true)
    const result = await templateService.personalizeWithAI(t, prospect)
    setAiLoading(false)
    if (result?.subject) setSubject(result.subject)
    if (result?.body) setBody(result.body)
  }

  async function sendViaOutlook() {
    const url = templateService.buildMailtoLink(prospect.email, subject, body)
    window.location.href = url
    // Record as sent — updates status + logs activity
    await outreach.updateProspect(prospect.id, {
      outreach_status: prospect.outreach_status === 'not_contacted' ? 'contacted' : prospect.outreach_status,
      last_contacted_at: new Date().toISOString(),
      last_email_subject: subject,
      first_contacted_at: prospect.first_contacted_at || new Date().toISOString(),
      follow_up_due: addDays(5),
    })
    setSent(true)
    setTimeout(onClose, 600)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Draft Email → {prospect.first_name} {prospect.last_name}</div>
            <div className="text-[10px] text-text-muted">{prospect.email} · {prospect.organization}</div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-xs text-text-muted">Loading templates…</div>
          ) : (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-muted">Template</label>
                <select
                  value={selectedTemplateId || ''}
                  onChange={e => onTemplateChange(e.target.value)}
                  className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs mt-1"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.stage}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-muted">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-muted">Body</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={14}
                  className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs mt-1 font-mono resize-y"
                />
              </div>

              <button
                onClick={personalize}
                disabled={aiLoading}
                className="text-[11px] px-3 py-1.5 border border-accent/30 text-accent rounded hover:bg-accent/10 disabled:opacity-50"
              >
                {aiLoading ? 'Personalizing with Claude…' : '✨ Personalize with Claude'}
              </button>
            </>
          )}
        </div>

        <div className="border-t border-border p-4 flex gap-2">
          <button onClick={onClose} className="flex-1 border border-border text-text-secondary py-2 rounded text-xs">Cancel</button>
          <button
            onClick={sendViaOutlook}
            disabled={sent || !subject || !body}
            className="flex-1 bg-accent text-bg-primary py-2 rounded text-xs font-semibold disabled:opacity-50"
          >
            {sent ? 'Sent ✓' : 'Send via Outlook'}
          </button>
        </div>
      </div>
    </div>
  )
}

function stageForStatus(status) {
  switch (status) {
    case 'not_contacted': return 'initial'
    case 'contacted': return 'follow_up_1'
    case 'responded': return 'demo_request'
    case 'demo_scheduled': return 'post_demo'
    case 'trial_started': return 'trial_follow_up'
    default: return 'initial'
  }
}

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
