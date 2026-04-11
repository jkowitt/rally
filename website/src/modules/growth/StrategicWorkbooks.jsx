import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const CATEGORY_COLORS = {
  strategy: 'bg-accent/10 text-accent border-accent/30',
  marketing: 'bg-[#ec4899]/10 text-[#ec4899] border-[#ec4899]/30',
  sales: 'bg-success/10 text-success border-success/30',
  finance: 'bg-warning/10 text-warning border-warning/30',
  operations: 'bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/30',
}

export default function StrategicWorkbooks() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [workbooks, setWorkbooks] = useState([])
  const [completions, setCompletions] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [active, setActive] = useState(null) // currently open workbook
  const [responses, setResponses] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: books }, { data: mine }] = await Promise.all([
        supabase.from('strategic_workbooks').select('*').eq('is_active', true).order('category'),
        profile?.property_id
          ? supabase.from('workbook_completions').select('*').eq('property_id', profile.property_id)
          : Promise.resolve({ data: [] }),
      ])
      setWorkbooks(books || [])
      const map = {}
      ;(mine || []).forEach(c => { map[c.workbook_id] = c })
      setCompletions(map)
      setLoading(false)
    }
    load()
  }, [profile?.property_id])

  async function openWorkbook(wb) {
    setActive(wb)
    const existing = completions[wb.id]
    setResponses(existing?.responses || {})
  }

  async function saveResponses() {
    if (!active || !profile?.property_id) return
    setSaving(true)
    const existing = completions[active.id]
    if (existing) {
      await supabase.from('workbook_completions').update({
        responses,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      const { data } = await supabase.from('workbook_completions').insert({
        workbook_id: active.id,
        property_id: profile.property_id,
        user_id: profile.id,
        responses,
      }).select().single()
      if (data) setCompletions(c => ({ ...c, [active.id]: data }))
    }
    setSaving(false)
    toast({ title: 'Saved', type: 'success' })
  }

  async function markComplete() {
    await saveResponses()
    const existing = completions[active.id]
    if (existing) {
      await supabase.from('workbook_completions').update({
        completed: true,
        completed_at: new Date().toISOString(),
      }).eq('id', existing.id)
      setCompletions(c => ({ ...c, [active.id]: { ...existing, completed: true } }))
    }
    toast({ title: 'Workbook complete', type: 'success' })
    setActive(null)
  }

  const filtered = filter === 'all' ? workbooks : workbooks.filter(w => w.category === filter)

  if (loading) return <div className="text-center text-text-muted text-sm py-8">Loading workbooks...</div>

  // ─── Workbook detail view ───
  if (active) {
    const sections = active.sections || []
    const completion = completions[active.id]
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => setActive(null)} className="text-xs text-text-muted hover:text-text-primary">← Back to library</button>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{active.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-text-primary">{active.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[active.category]}`}>{active.category}</span>
                <span className="text-[10px] text-text-muted">{active.estimated_time_min} min · {active.difficulty}</span>
                {completion?.completed && <span className="text-[9px] bg-success/15 text-success px-1.5 py-0.5 rounded">COMPLETED</span>}
              </div>
            </div>
          </div>
          <p className="text-xs text-text-secondary">{active.description}</p>
        </div>

        <div className="space-y-5">
          {sections.map((section, si) => (
            <div key={si} className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">{section.title}</h3>
              {section.description && <p className="text-[11px] text-text-muted">{section.description}</p>}
              {(section.questions || []).map((q, qi) => {
                const key = `${si}_${qi}`
                return (
                  <div key={qi}>
                    <label className="text-xs text-text-secondary block mb-1">{q}</label>
                    <textarea
                      value={responses[key] || ''}
                      onChange={e => setResponses(r => ({ ...r, [key]: e.target.value }))}
                      onBlur={saveResponses}
                      rows={3}
                      className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-xs text-text-primary resize-none focus:outline-none focus:border-accent"
                      placeholder="Your answer..."
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex gap-2 sticky bottom-4">
          <button onClick={saveResponses} disabled={saving} className="flex-1 border border-border text-text-secondary py-3 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
          <button onClick={markComplete} className="flex-1 bg-accent text-bg-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90">
            Mark Complete
          </button>
        </div>
      </div>
    )
  }

  // ─── Library view ───
  const categories = ['all', 'strategy', 'marketing', 'sales', 'finance', 'operations']
  const completedCount = Object.values(completions).filter(c => c.completed).length

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Strategic Workbooks</h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">Structured playbooks for growth. {workbooks.length} workbooks available · {completedCount} completed.</p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`text-[10px] px-2 py-1 rounded capitalize ${filter === c ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(wb => {
          const done = completions[wb.id]?.completed
          return (
            <button
              key={wb.id}
              onClick={() => openWorkbook(wb)}
              className="bg-bg-surface border border-border rounded-lg p-4 text-left hover:border-accent/50 transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{wb.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-text-primary">{wb.name}</span>
                    {done && <span className="text-[9px] bg-success/15 text-success px-1.5 py-0.5 rounded">✓</span>}
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">{wb.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[wb.category]}`}>{wb.category}</span>
                    <span className="text-[9px] text-text-muted">{wb.estimated_time_min} min</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-text-muted text-sm py-12">No workbooks match this filter.</div>
      )}
    </div>
  )
}
