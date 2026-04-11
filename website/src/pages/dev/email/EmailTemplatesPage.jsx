import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as templateService from '@/services/email/emailTemplateService'

export default function EmailTemplatesPage() {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState([])
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { reload() }, [category])

  async function reload() {
    setLoading(true)
    if (profile?.id) await templateService.seedIfEmpty(profile.id, profile.property_id)
    const { templates } = await templateService.listTemplates({ category })
    setTemplates(templates)
    setLoading(false)
  }

  async function save(fields) {
    if (editing?.id) await templateService.updateTemplate(editing.id, fields)
    else await templateService.createTemplate(fields, profile.id, profile.property_id)
    setEditing(null)
    reload()
  }

  async function remove(id) {
    if (!confirm('Delete this template?')) return
    await templateService.deleteTemplate(id)
    reload()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Templates</h2>
          <p className="text-[11px] text-text-muted">Reusable HTML templates for campaigns</p>
        </div>
        <button onClick={() => setEditing({})} className="text-xs px-3 py-1.5 bg-accent text-bg-primary rounded font-semibold">+ New Template</button>
      </header>

      <div className="flex gap-1 border-b border-border">
        {['all', 'newsletter', 'promotional', 'transactional', 'drip', 'announcement', 'custom'].map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-2 text-xs capitalize ${category === c ? 'text-accent border-b-2 border-accent' : 'text-text-secondary'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <div className="text-xs text-text-muted">Loading…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map(t => (
          <div key={t.id} className="bg-bg-card border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text-primary truncate">{t.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-accent/30 text-accent">{t.category}</span>
                  {t.is_system_template && <span className="text-[9px] text-text-muted">System</span>}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-text-secondary truncate">{t.subject_line}</div>
            <div className="text-[10px] text-text-muted line-clamp-2">{t.preview_text}</div>
            <div className="flex gap-2 pt-2 border-t border-border">
              <button onClick={() => setEditing(t)} className="text-[10px] text-accent">Edit</button>
              <button onClick={() => remove(t.id)} className="text-[10px] text-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing !== null && <EditModal template={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  )
}

function EditModal({ template, onSave, onClose }) {
  const [fields, setFields] = useState({
    name: template.name || '',
    category: template.category || 'custom',
    subject_line: template.subject_line || '',
    preview_text: template.preview_text || '',
    html_content: template.html_content || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    fields.plain_text_content = templateService.htmlToText(fields.html_content)
    await onSave(fields)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="border-b border-border p-4 flex justify-between">
          <div className="text-sm font-semibold">{template.id ? 'Edit template' : 'New template'}</div>
          <button onClick={onClose} className="text-text-muted">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          <Field label="Name" value={fields.name} onChange={v => setFields({ ...fields, name: v })} />
          <div>
            <label className="text-text-muted block mb-1">Category</label>
            <select value={fields.category} onChange={e => setFields({ ...fields, category: e.target.value })} className="w-full bg-bg-card border border-border rounded px-2 py-1.5">
              {['newsletter', 'promotional', 'transactional', 'drip', 'announcement', 'custom'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Subject line" value={fields.subject_line} onChange={v => setFields({ ...fields, subject_line: v })} />
          <Field label="Preview text" value={fields.preview_text} onChange={v => setFields({ ...fields, preview_text: v })} />
          <div>
            <label className="text-text-muted block mb-1">
              HTML content <span className="text-[10px]">(variables: {'{{first_name}} {{organization}} {{unsubscribe_url}}'})</span>
            </label>
            <textarea value={fields.html_content} onChange={e => setFields({ ...fields, html_content: e.target.value })} rows={18} className="w-full bg-bg-card border border-border rounded px-2 py-1.5 font-mono" />
          </div>
        </div>
        <div className="border-t border-border p-4 flex gap-2">
          <button onClick={onClose} className="flex-1 border border-border py-2 rounded">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-accent text-bg-primary py-2 rounded font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-text-muted block mb-1">{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-bg-card border border-border rounded px-2 py-1.5" />
    </div>
  )
}
