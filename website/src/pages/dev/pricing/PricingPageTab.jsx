import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as pricingService from '@/services/pricingService'

export default function PricingPageTab() {
  const { profile } = useAuth()
  const [config, setConfig] = useState([])
  const [faqs, setFaqs] = useState([])
  const [savingKey, setSavingKey] = useState(null)
  const [newFaq, setNewFaq] = useState(null)

  useEffect(() => { reload() }, [])

  async function reload() {
    const [c, f] = await Promise.all([
      pricingService.listPageConfig(),
      pricingService.listFaqs(),
    ])
    setConfig(c)
    setFaqs(f)
  }

  async function saveConfig(key, value) {
    setSavingKey(key)
    await pricingService.updatePageConfig(key, value, profile.id)
    setSavingKey(null)
    reload()
  }

  async function saveFaq(faq) {
    if (faq.id) {
      await pricingService.updateFaq(faq.id, { question: faq.question, answer: faq.answer, display_order: faq.display_order }, profile.id)
    } else {
      await pricingService.createFaq({ question: faq.question, answer: faq.answer, display_order: faqs.length + 1 }, profile.id)
    }
    setNewFaq(null)
    reload()
  }

  async function deleteFaq(id) {
    if (!confirm('Delete this FAQ?')) return
    await pricingService.deleteFaq(id)
    reload()
  }

  // Split config into sections
  const bySection = {}
  config.forEach(c => {
    if (!bySection[c.category]) bySection[c.category] = []
    bySection[c.category].push(c)
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        {Object.entries(bySection).map(([section, rows]) => (
          <section key={section}>
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">{section}</div>
            <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
              {rows.map(r => (
                <ConfigRow key={r.id} row={r} onSave={saveConfig} saving={savingKey === r.config_key} />
              ))}
            </div>
          </section>
        ))}

        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">FAQs</div>
            <button onClick={() => setNewFaq({ question: '', answer: '', display_order: faqs.length + 1 })} className="text-[10px] text-accent">+ Add FAQ</button>
          </div>
          <div className="space-y-2">
            {faqs.map(f => (
              <FaqRow key={f.id} faq={f} onSave={saveFaq} onDelete={deleteFaq} />
            ))}
            {newFaq && <FaqRow faq={newFaq} onSave={saveFaq} onDelete={() => setNewFaq(null)} />}
          </div>
        </section>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-4 sticky top-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Live preview</div>
        <iframe src="/pricing" className="w-full border border-border rounded" style={{ height: 'calc(100vh - 200px)' }} />
        <a href="/pricing" target="_blank" rel="noopener" className="block text-center text-[11px] text-accent hover:underline mt-2">
          Open /pricing in new tab →
        </a>
      </div>
    </div>
  )
}

function ConfigRow({ row, onSave, saving }) {
  const [value, setValue] = useState(row.config_value || '')

  if (row.config_type === 'boolean') {
    const isOn = row.config_value === 'true'
    return (
      <div className="p-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-text-primary">{row.description || row.config_key}</div>
          <div className="text-[9px] font-mono text-text-muted">{row.config_key}</div>
        </div>
        <button
          onClick={() => onSave(row.config_key, isOn ? 'false' : 'true')}
          className={`w-10 h-5 rounded-full transition-colors relative ${isOn ? 'bg-accent' : 'bg-bg-surface'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-bg-primary border border-border absolute top-0.5 transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-1">
      <label className="text-[11px] text-text-muted">{row.description || row.config_key}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          className="flex-1 bg-bg-surface border border-border rounded px-2 py-1 text-xs"
        />
        {value !== row.config_value && (
          <button onClick={() => onSave(row.config_key, value)} className="text-[10px] bg-accent text-bg-primary px-2 rounded" disabled={saving}>
            {saving ? '…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}

function FaqRow({ faq, onSave, onDelete }) {
  const [editing, setEditing] = useState(!faq.id)
  const [draft, setDraft] = useState(faq)

  if (!editing) {
    return (
      <div className="bg-bg-card border border-border rounded p-3 space-y-1">
        <div className="text-xs font-semibold">{faq.question}</div>
        <div className="text-[10px] text-text-muted line-clamp-2">{faq.answer}</div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setEditing(true)} className="text-[10px] text-accent">Edit</button>
          <button onClick={() => onDelete(faq.id)} className="text-[10px] text-danger">Delete</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-accent/30 rounded p-3 space-y-2">
      <input value={draft.question} onChange={e => setDraft({ ...draft, question: e.target.value })} placeholder="Question" className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs" />
      <textarea value={draft.answer} onChange={e => setDraft({ ...draft, answer: e.target.value })} placeholder="Answer" rows={3} className="w-full bg-bg-surface border border-border rounded px-2 py-1 text-xs" />
      <div className="flex gap-2">
        <button onClick={() => { onSave(draft); setEditing(false) }} className="flex-1 bg-accent text-bg-primary py-1 rounded text-[11px] font-semibold">Save</button>
        <button onClick={() => { setEditing(false); setDraft(faq) }} className="flex-1 border border-border py-1 rounded text-[11px]">Cancel</button>
      </div>
    </div>
  )
}
