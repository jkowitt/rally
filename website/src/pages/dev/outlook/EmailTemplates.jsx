import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import * as templateService from '@/services/dev/templateService'

/**
 * /dev/outlook/templates — personal outreach template CRUD.
 * Seeds defaults on first visit.
 */
export default function EmailTemplates() {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // template object or 'new'

  useEffect(() => { reload() }, [])

  async function reload() {
    setLoading(true)
    if (profile?.id) {
      await templateService.seedIfEmpty(profile.id)
    }
    const { templates } = await templateService.listTemplates()
    setTemplates(templates)
    setLoading(false)
  }

  async function save(fields) {
    if (editing?.id) {
      await templateService.updateTemplate(editing.id, fields)
    } else {
      await templateService.createTemplate(profile.id, fields)
    }
    setEditing(null)
    reload()
  }

  async function remove(id) {
    if (!confirm('Delete this template?')) return
    await templateService.deleteTemplate(id)
    reload()
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <Link to="/dev" className="text-[10px] text-text-muted hover:text-accent">← /dev</Link>
            <h1 className="text-xl font-semibold mt-1">Outreach Templates</h1>
            <p className="text-[11px] text-text-muted">Personal templates for Loud CRM BD prospecting</p>
          </div>
          <button onClick={() => setEditing('new')} className="text-xs px-3 py-1.5 bg-accent text-bg-primary rounded font-semibold">
            + New Template
          </button>
        </header>

        {loading && <div className="text-xs text-text-muted">Loading…</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(t => (
            <div key={t.id} className="bg-bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">{t.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-accent/30 text-accent">{t.stage}</span>
                    <span className="text-[9px] text-text-muted">{t.industry}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(t)} className="text-[10px] text-text-muted hover:text-accent">Edit</button>
                  <button onClick={() => remove(t.id)} className="text-[10px] text-text-muted hover:text-danger">Delete</button>
                </div>
              </div>
              <div className="text-[11px] text-text-secondary font-medium truncate">{t.subject}</div>
              <div className="text-[10px] text-text-muted line-clamp-3 whitespace-pre-wrap">{t.body}</div>
            </div>
          ))}
        </div>
      </div>
      {editing && <EditorModal template={editing === 'new' ? {} : editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  )
}

function EditorModal({ template, onSave, onClose }) {
  const [fields, setFields] = useState({
    name: template.name || '',
    stage: template.stage || 'initial',
    industry: template.industry || 'both',
    subject: template.subject || '',
    body: template.body || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(fields)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div className="text-sm font-semibold">{template.id ? 'Edit Template' : 'New Template'}</div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-muted">Name</label>
            <input value={fields.name} onChange={e => setFields({ ...fields, name: e.target.value })} className="w-full bg-bg-card border border-border rounded px-2 py-1.5 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-muted">Stage</label>
              <select value={fields.stage} onChange={e => setFields({ ...fields, stage: e.target.value })} className="w-full bg-bg-card border border-border rounded px-2 py-1.5 mt-1">
                {['initial', 'follow_up_1', 'follow_up_2', 'demo_request', 'post_demo', 'trial_follow_up'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-muted">Industry</label>
              <select value={fields.industry} onChange={e => setFields({ ...fields, industry: e.target.value })} className="w-full bg-bg-card border border-border rounded px-2 py-1.5 mt-1">
                <option value="both">Both</option>
                <option value="conference_events">Conference/Events</option>
                <option value="minor_league_sports">Minor League Sports</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-muted">Subject</label>
            <input value={fields.subject} onChange={e => setFields({ ...fields, subject: e.target.value })} className="w-full bg-bg-card border border-border rounded px-2 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-muted">
              Body <span className="text-text-muted">— supports {'{{first_name}}'}, {'{{organization}}'}, {'{{industry_pain_point}}'}, {'{{sender_name}}'}, {'{{trial_link}}'}</span>
            </label>
            <textarea value={fields.body} onChange={e => setFields({ ...fields, body: e.target.value })} rows={12} className="w-full bg-bg-card border border-border rounded px-2 py-1.5 mt-1 font-mono" />
          </div>
        </div>
        <div className="border-t border-border p-4 flex gap-2">
          <button onClick={onClose} className="flex-1 border border-border text-text-secondary py-2 rounded text-xs">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-accent text-bg-primary py-2 rounded text-xs font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
