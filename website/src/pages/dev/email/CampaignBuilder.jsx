import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as campaignService from '@/services/email/campaignService'
import * as listService from '@/services/email/emailListService'
import * as templateService from '@/services/email/emailTemplateService'

/**
 * Campaign builder — 4-step flow: Setup → Recipients → Content → Review.
 * Saves a draft after every step so nothing is lost.
 */
export default function CampaignBuilder() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [campaign, setCampaign] = useState({
    name: '',
    subject_line: '',
    preview_text: '',
    from_name: '',
    from_email: '',
    reply_to_email: '',
    html_content: '',
    plain_text_content: '',
    list_ids: [],
    exclude_list_ids: [],
    segment_filters: {},
  })
  const [lists, setLists] = useState([])
  const [templates, setTemplates] = useState([])
  const [recipientCount, setRecipientCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => { init() }, [id])

  async function init() {
    const [{ lists }, { templates }] = await Promise.all([
      listService.listLists(),
      templateService.listTemplates(),
    ])
    setLists(lists)
    setTemplates(templates)
    if (id) {
      const { campaign: c } = await campaignService.getCampaign(id)
      if (c) setCampaign(c)
    }
  }

  async function saveDraft(patch = {}) {
    setSaving(true)
    const merged = { ...campaign, ...patch }
    if (campaign.id) {
      await campaignService.updateCampaign(campaign.id, merged)
    } else {
      const r = await campaignService.createCampaign(merged, profile.id, profile.property_id)
      if (r.success) setCampaign(c => ({ ...c, ...merged, id: r.campaign.id }))
    }
    setSaving(false)
  }

  async function updateRecipientCount() {
    if (!campaign.list_ids?.length) return setRecipientCount(0)
    const recipients = await campaignService.resolveRecipients(campaign)
    setRecipientCount(recipients.length)
  }

  useEffect(() => { updateRecipientCount() }, [campaign.list_ids, campaign.segment_filters])

  function loadTemplate(templateId) {
    const t = templates.find(x => x.id === templateId)
    if (!t) return
    setCampaign(c => ({
      ...c,
      subject_line: c.subject_line || t.subject_line,
      preview_text: c.preview_text || t.preview_text,
      html_content: t.html_content,
      plain_text_content: t.plain_text_content,
    }))
  }

  const validation = campaignService.validateCampaign(campaign)

  async function handleSend() {
    await saveDraft()
    if (!campaign.id) return
    setSending(true)
    const r = await campaignService.sendCampaign(campaign.id)
    setSending(false)
    if (r.success) {
      alert(`Sending started — ${r.total} recipients queued`)
      navigate(`/app/marketing/email/campaigns/${campaign.id}/analytics`)
    } else {
      alert(`Failed: ${r.error}\n${(r.issues || []).map(i => i.msg).join('\n')}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/app/marketing/email/campaigns" className="text-[10px] text-text-muted hover:text-accent">← Campaigns</Link>
          <h2 className="text-xl font-semibold mt-1">{campaign.name || 'New Campaign'}</h2>
          <p className="text-[11px] text-text-muted">Step {step} of 4 {saving && '· saving…'}</p>
        </div>
      </header>

      <div className="flex gap-1">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className={`flex-1 h-1 rounded cursor-pointer ${n <= step ? 'bg-accent' : 'bg-bg-card'}`} onClick={() => setStep(n)} />
        ))}
      </div>

      {step === 1 && (
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
          <Field label="Campaign name" value={campaign.name} onChange={v => setCampaign({ ...campaign, name: v })} />
          <Field label="From name" value={campaign.from_name} onChange={v => setCampaign({ ...campaign, from_name: v })} />
          <Field label="From email" value={campaign.from_email} onChange={v => setCampaign({ ...campaign, from_email: v })} />
          <Field label="Reply-to email" value={campaign.reply_to_email} onChange={v => setCampaign({ ...campaign, reply_to_email: v })} />
          <button onClick={() => { saveDraft(); setStep(2) }} className="w-full bg-accent text-bg-primary py-2 rounded font-semibold">Next: Recipients</button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
          <div>
            <label className="text-text-muted block mb-1">Send to lists</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {lists.map(l => (
                <label key={l.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={campaign.list_ids?.includes(l.id)}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...(campaign.list_ids || []), l.id]
                        : (campaign.list_ids || []).filter(x => x !== l.id)
                      setCampaign({ ...campaign, list_ids: next })
                    }}
                  />
                  <span className="flex-1">{l.name}</span>
                  <span className="text-text-muted">{l.active_count}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-bg-surface rounded p-2 text-center text-accent font-semibold">
            Will send to ~{recipientCount} subscribers
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 border border-border py-2 rounded">Back</button>
            <button onClick={() => { saveDraft(); setStep(3) }} className="flex-1 bg-accent text-bg-primary py-2 rounded font-semibold">Next: Content</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
          <div>
            <label className="text-text-muted block mb-1">Start from template</label>
            <select onChange={e => e.target.value && loadTemplate(e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5">
              <option value="">— choose template —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Field label="Subject line" value={campaign.subject_line} onChange={v => setCampaign({ ...campaign, subject_line: v })} />
          <Field label="Preview text" value={campaign.preview_text} onChange={v => setCampaign({ ...campaign, preview_text: v })} />
          <div>
            <label className="text-text-muted block mb-1">HTML content <span className="text-[10px]">(must include {'{{unsubscribe_url}}'})</span></label>
            <textarea value={campaign.html_content || ''} onChange={e => setCampaign({ ...campaign, html_content: e.target.value })} rows={16} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 border border-border py-2 rounded">Back</button>
            <button onClick={() => { saveDraft(); setStep(4) }} className="flex-1 bg-accent text-bg-primary py-2 rounded font-semibold">Next: Review</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
          <div className="text-sm font-semibold">Review & send</div>
          <div className="space-y-1">
            <div><span className="text-text-muted">Name:</span> {campaign.name}</div>
            <div><span className="text-text-muted">From:</span> {campaign.from_name} &lt;{campaign.from_email}&gt;</div>
            <div><span className="text-text-muted">Subject:</span> {campaign.subject_line}</div>
            <div><span className="text-text-muted">Recipients:</span> ~{recipientCount}</div>
          </div>
          <div className="bg-bg-surface rounded p-3 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Compliance check</div>
            {validation.issues.length === 0 && <div className="text-success text-[11px]">✓ All checks pass</div>}
            {validation.issues.map((i, ix) => (
              <div key={ix} className={`text-[11px] ${i.critical ? 'text-danger' : 'text-warning'}`}>
                {i.critical ? '✗' : '⚠'} {i.msg}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="flex-1 border border-border py-2 rounded">Back</button>
            <button
              onClick={handleSend}
              disabled={!validation.ok || sending}
              className="flex-1 bg-accent text-bg-primary py-2 rounded font-semibold disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send now'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-text-muted block mb-1">{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-bg-surface border border-border rounded px-2 py-1.5" />
    </div>
  )
}
