import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { Mail, Linkedin, Phone, ListChecks, Sparkles, Check, X, RefreshCw, Send, ArrowLeft, ArrowRight, Bell, BellOff, Wand2 } from 'lucide-react'

// Four-step AI sequence builder.
//   1. Configure   — touchpoints, days, methods order, time of day
//   2. Pick deals  — multi-select prospects to enroll
//   3. Generate    — Claude drafts every (deal × step) cold open
//   4. Review      — approve / edit / OpenAI-coach each draft;
//                    approved drafts land as tasks in the rep's
//                    daily plan (and on the deal/contact timeline).
//
// The Review step is also reachable directly from a follow-up
// session by passing initialEnrollmentIds — so a rep can come
// back later and finish triaging drafts.

const METHOD_OPTIONS = [
  { id: 'email',    label: 'Email',          icon: Mail,       hint: 'Cold email with subject' },
  { id: 'linkedin', label: 'LinkedIn DM',    icon: Linkedin,   hint: '30–80 word DM, no signature' },
  { id: 'phone',    label: 'Phone / VM',     icon: Phone,      hint: 'Voicemail script — second person' },
  { id: 'task',     label: 'Internal task',  icon: ListChecks, hint: 'Research / pre-call note for the rep' },
]

const TIME_OF_DAY = [
  { id: 'morning',   label: '9 am' },
  { id: 'midday',    label: '12 pm' },
  { id: 'afternoon', label: '2 pm' },
  { id: 'evening',   label: '5 pm' },
]

export default function SequenceAIBuilder({ sequence }) {
  const [step, setStep] = useState('configure')
  const [config, setConfig] = useState({
    touchpoints: 5,
    duration_days: 14,
    methods_order: ['email', 'linkedin', 'phone'],
    time_of_day: 'morning',
    notify_user: true,
    // What this cadence is supposed to accomplish. Claude needs
    // this to drive toward something concrete instead of writing
    // generic "introduce yourself" copy.
    goal_summary: '',
    initiatives: '',
    final_ask: 'Book a 15-minute discovery call',
  })
  const [selectedDealIds, setSelectedDealIds] = useState([])

  if (!sequence) {
    return (
      <div className="text-sm text-text-muted p-6 text-center">
        Pick or create a sequence on the left to start.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Stepper current={step} />
      {step === 'configure' && (
        <ConfigureStep
          config={config}
          setConfig={setConfig}
          onNext={() => setStep('deals')}
        />
      )}
      {step === 'deals' && (
        <DealsStep
          selected={selectedDealIds}
          setSelected={setSelectedDealIds}
          onBack={() => setStep('configure')}
          onNext={() => setStep('generate')}
        />
      )}
      {step === 'generate' && (
        <GenerateStep
          sequence={sequence}
          config={config}
          dealIds={selectedDealIds}
          onBack={() => setStep('deals')}
          onDone={() => setStep('review')}
        />
      )}
      {step === 'review' && (
        <ReviewStep
          sequence={sequence}
          onBack={() => setStep('configure')}
        />
      )}
    </div>
  )
}

/* ─── Stepper ─────────────────────────────────────────── */
function Stepper({ current }) {
  const order = ['configure', 'deals', 'generate', 'review']
  const labels = { configure: 'Configure', deals: 'Pick Deals', generate: 'Generate', review: 'Review & Apply' }
  const idx = order.indexOf(current)
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider">
      {order.map((s, i) => {
        const active = i === idx
        const done = i < idx
        return (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`px-2 py-1 rounded ${active ? 'bg-accent text-bg-primary' : done ? 'bg-success/20 text-success' : 'bg-bg-card text-text-muted'}`}>
              {i + 1}. {labels[s]}
            </span>
            {i < order.length - 1 && <span className="text-text-muted">·</span>}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Step 1: Configure ───────────────────────────────── */
function ConfigureStep({ config, setConfig, onNext }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [pitchDraft, setPitchDraft] = useState('')
  const [pitchSaving, setPitchSaving] = useState(false)

  // Load the rep's company pitch from properties.company_context
  // so Claude can tailor outreach to what THIS company sells.
  // Without this, drafts read like every other generic SDR email.
  const { data: property } = useQuery({
    queryKey: ['property-context', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, name, company_context')
        .eq('id', profile.property_id)
        .maybeSingle()
      if (data?.company_context) setPitchDraft(data.company_context)
      return data
    },
  })

  async function savePitch() {
    if (!profile?.property_id) return
    setPitchSaving(true)
    try {
      const { error } = await supabase
        .from('properties')
        .update({ company_context: pitchDraft.trim() || null })
        .eq('id', profile.property_id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['property-context', profile.property_id] })
      toast({ title: 'Saved company pitch', type: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, type: 'error' })
    } finally {
      setPitchSaving(false)
    }
  }

  function updateMethod(idx, value) {
    const next = [...config.methods_order]
    next[idx] = value
    setConfig({ ...config, methods_order: next })
  }
  function addMethod() {
    if (config.methods_order.length >= 6) return
    setConfig({ ...config, methods_order: [...config.methods_order, 'email'] })
  }
  function removeMethod(idx) {
    if (config.methods_order.length <= 1) return
    setConfig({ ...config, methods_order: config.methods_order.filter((_, i) => i !== idx) })
  }

  const pitchDirty = (property?.company_context || '') !== pitchDraft

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5 space-y-5">
      {/* Company pitch — set once, reused across every sequence */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary">Your company pitch</h3>
        <p className="text-xs text-text-muted mt-0.5">
          One paragraph about what your company does + who you help. The AI uses this to write outreach that actually sounds like you.
        </p>
        <textarea
          value={pitchDraft}
          onChange={e => setPitchDraft(e.target.value)}
          placeholder={`e.g. ${property?.name || 'Acme'} is a sponsorship CRM for mid-market college athletic programs. We help ADs and sponsorship leads close partnerships 40% faster by automating contract analysis and deliverable tracking.`}
          rows={3}
          className="w-full mt-2 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-y"
        />
        {pitchDirty && (
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={savePitch} disabled={pitchSaving}>
              {pitchSaving ? 'Saving…' : 'Save pitch'}
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-text-primary">What's this sequence for?</h3>
        <p className="text-xs text-text-muted mt-0.5">
          Tell the AI what to drive toward. The more specific, the better the drafts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-[10px] font-mono uppercase text-text-muted">Sequence goal</label>
          <input
            value={config.goal_summary}
            onChange={e => setConfig({ ...config, goal_summary: e.target.value })}
            placeholder="e.g. Book a discovery call with their head of partnerships"
            className="w-full mt-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase text-text-muted">Initiatives or talking points</label>
          <textarea
            value={config.initiatives}
            onChange={e => setConfig({ ...config, initiatives: e.target.value })}
            placeholder="e.g. New AI contract reader feature; case study with University of Texas; reference their recent stadium renovation"
            rows={3}
            className="w-full mt-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-y"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase text-text-muted">Specific ask in the final touch</label>
          <input
            value={config.final_ask}
            onChange={e => setConfig({ ...config, final_ask: e.target.value })}
            placeholder="e.g. Reply with a 15-min slot next Tue/Thu"
            className="w-full mt-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-text-primary">Cadence shape</h3>
        <p className="text-xs text-text-muted mt-0.5">How many touchpoints, over how many days. AI will spread them evenly.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-mono uppercase text-text-muted">Touchpoints</label>
          <input
            type="number"
            min={1}
            max={12}
            value={config.touchpoints}
            onChange={e => setConfig({ ...config, touchpoints: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
            className="w-full mt-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase text-text-muted">Duration (days)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={config.duration_days}
            onChange={e => setConfig({ ...config, duration_days: Math.max(1, Math.min(90, Number(e.target.value) || 1)) })}
            className="w-full mt-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-mono uppercase text-text-muted">Methods (order cycles across touchpoints)</label>
        <div className="space-y-2 mt-1">
          {config.methods_order.map((m, i) => {
            const opt = METHOD_OPTIONS.find(o => o.id === m) || METHOD_OPTIONS[0]
            const Icon = opt.icon
            return (
              <div key={i} className="flex items-center gap-2 bg-bg-card border border-border rounded px-2 py-2">
                <span className="text-[10px] font-mono text-text-muted w-12">Step {i + 1}</span>
                <Icon className="w-4 h-4 text-accent" />
                <select
                  value={m}
                  onChange={e => updateMethod(i, e.target.value)}
                  className="flex-1 bg-bg-surface border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  {METHOD_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <button
                  onClick={() => removeMethod(i)}
                  disabled={config.methods_order.length <= 1}
                  className="text-text-muted hover:text-danger disabled:opacity-30 p-1"
                  aria-label="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
        <button
          onClick={addMethod}
          disabled={config.methods_order.length >= 6}
          className="mt-2 text-xs text-accent hover:underline disabled:opacity-50"
        >
          + Add another method
        </button>
        <p className="text-[10px] text-text-muted mt-2">
          With {config.touchpoints} touchpoints and {config.methods_order.length} methods, the cadence cycles {config.methods_order.map((m, i) => METHOD_OPTIONS.find(o => o.id === m)?.label).join(' → ')} → {METHOD_OPTIONS.find(o => o.id === config.methods_order[0])?.label} …
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-mono uppercase text-text-muted">Time of day</label>
          <select
            value={config.time_of_day}
            onChange={e => setConfig({ ...config, time_of_day: e.target.value })}
            className="w-full mt-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {TIME_OF_DAY.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase text-text-muted">Reminder</label>
          <button
            onClick={() => setConfig({ ...config, notify_user: !config.notify_user })}
            className="w-full mt-1 flex items-center gap-2 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary hover:border-accent/50"
          >
            {config.notify_user ? <Bell className="w-3.5 h-3.5 text-accent" /> : <BellOff className="w-3.5 h-3.5 text-text-muted" />}
            {config.notify_user ? 'Notify me' : 'No reminders'}
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onNext}>
          Pick deals <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

/* ─── Step 2: Pick Deals ──────────────────────────────── */
function DealsStep({ selected, setSelected, onBack, onNext }) {
  const { profile } = useAuth()
  const [search, setSearch] = useState('')

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['ai-builder-deals', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('id, brand_name, contact_first_name, contact_last_name, contact_position, stage, sub_industry')
        .eq('property_id', profile.property_id)
        .neq('stage', 'Declined')
        .order('created_at', { ascending: false })
        .limit(500)
      return data || []
    },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return deals
    return deals.filter(d => (d.brand_name || '').toLowerCase().includes(q))
  }, [deals, search])

  function toggle(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function selectAllVisible() {
    const ids = filtered.map(d => d.id)
    setSelected(prev => Array.from(new Set([...prev, ...ids])))
  }
  function clearAll() { setSelected([]) }

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Which prospects should this run on?</h3>
          <p className="text-xs text-text-muted mt-0.5">Each prospect gets a unique draft per step — not a templated mail-merge.</p>
        </div>
        <div className="text-xs text-text-muted">{selected.length} selected</div>
      </div>

      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by company name…"
          className="flex-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
        />
        <button onClick={selectAllVisible} className="text-xs text-accent hover:underline px-2">Select all</button>
        <button onClick={clearAll} className="text-xs text-text-muted hover:text-text-secondary px-2">Clear</button>
      </div>

      {isLoading ? (
        <div className="text-xs text-text-muted py-8 text-center">Loading deals…</div>
      ) : filtered.length === 0 ? (
        <div className="text-xs text-text-muted py-8 text-center">No deals match your search.</div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto border border-border rounded">
          {filtered.map(d => {
            const isSel = selected.includes(d.id)
            const contact = [d.contact_first_name, d.contact_last_name].filter(Boolean).join(' ') || 'No contact'
            return (
              <label
                key={d.id}
                className={`flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0 cursor-pointer hover:bg-bg-card transition-colors ${isSel ? 'bg-accent/5' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggle(d.id)}
                  className="accent-accent"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary truncate">{d.brand_name}</div>
                  <div className="text-[10px] text-text-muted truncate">
                    {contact}{d.contact_position ? ` · ${d.contact_position}` : ''}{d.sub_industry ? ` · ${d.sub_industry}` : ''}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-text-muted">{d.stage}</span>
              </label>
            )
          })}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
        <Button onClick={onNext} disabled={selected.length === 0}>
          Next <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

/* ─── Step 3: Generate ───────────────────────────────── */
function GenerateStep({ sequence, config, dealIds, onBack, onDone }) {
  const { toast } = useToast()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  async function handleGenerate() {
    setRunning(true)
    try {
      const { data, error } = await supabase.functions.invoke('sequence-generator', {
        body: {
          sequence_id: sequence.id,
          deal_ids: dealIds,
          touchpoints: config.touchpoints,
          duration_days: config.duration_days,
          methods_order: config.methods_order,
          time_of_day: config.time_of_day,
          notify_user: config.notify_user,
          goal_summary: config.goal_summary || undefined,
          initiatives: config.initiatives || undefined,
          final_ask: config.final_ask || undefined,
        },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Generation failed')
      setResult(data)
      toast({
        title: 'Drafts ready',
        description: `${data.drafts} drafts across ${data.enrolled} prospects`,
        type: 'success',
      })
    } catch (err) {
      toast({ title: 'Generation failed', description: humanError(err), type: 'error' })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-5 space-y-3">
      <h3 className="text-sm font-semibold text-text-primary">Generate first drafts</h3>
      <p className="text-xs text-text-muted">
        We'll write a unique cold open for every <strong className="text-text-primary">{dealIds.length}</strong> prospect ×{' '}
        <strong className="text-text-primary">{config.touchpoints}</strong> step =
        <strong className="text-text-primary"> {dealIds.length * config.touchpoints}</strong> drafts.
        Each draft is specific to the prospect — pulling from their CRM data, contact, and notes.
      </p>

      {!result && (
        <div className="bg-bg-card border border-border rounded p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-text-muted">Sequence:</span><span className="text-text-primary">{sequence.name}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">Touchpoints × Days:</span><span className="text-text-primary">{config.touchpoints} × {config.duration_days}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">Methods:</span><span className="text-text-primary">{config.methods_order.join(' → ')}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">Time of day:</span><span className="text-text-primary">{config.time_of_day}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">Reminder:</span><span className="text-text-primary">{config.notify_user ? 'on' : 'off'}</span></div>
        </div>
      )}

      {result && (
        <div className="bg-success/5 border border-success/30 rounded p-3 text-xs space-y-1">
          <div className="text-success font-semibold">Drafts ready</div>
          <div className="text-text-secondary">
            Generated {result.drafts} drafts across {result.enrolled} prospects.
            {result.errors?.length > 0 && (
              <div className="mt-1 text-warning">{result.errors.length} prospect(s) failed: {result.errors.join('; ')}</div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={running}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
        {!result ? (
          <Button onClick={handleGenerate} disabled={running}>
            {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {running ? 'Generating…' : 'Generate drafts'}
          </Button>
        ) : (
          <Button onClick={onDone}>
            Review drafts <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

/* ─── Step 4: Review & Apply ──────────────────────────── */
function ReviewStep({ sequence, onBack }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [openDraftId, setOpenDraftId] = useState(null)

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['sequence-drafts', sequence.id],
    enabled: !!sequence?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('prospect_sequence_drafts')
        .select(`*,
                 enrollment:prospect_sequence_enrollments(deal_id, contact_id,
                   deals(brand_name, contact_first_name, contact_last_name),
                   contacts(first_name, last_name, email))`)
        .eq('property_id', profile.property_id)
        .order('enrollment_id')
        .order('step_index')
      return (data || []).filter(d => {
        // Filter to drafts whose enrollment belongs to THIS sequence
        // (Supabase doesn't let us join-filter cleanly above)
        return d.enrollment !== null
      })
    },
  })

  // Group by enrollment so reps see one prospect at a time
  const grouped = useMemo(() => {
    const byEnrollment = new Map()
    for (const d of drafts) {
      const key = d.enrollment_id
      if (!byEnrollment.has(key)) byEnrollment.set(key, { enrollment: d.enrollment, drafts: [] })
      byEnrollment.get(key).drafts.push(d)
    }
    return Array.from(byEnrollment.values())
  }, [drafts])

  const approve = useMutation({
    mutationFn: async ({ draftId, body, subject }) => {
      const { data: row } = await supabase
        .from('prospect_sequence_drafts').select('*').eq('id', draftId).maybeSingle()
      if (!row) throw new Error('Draft not found')

      // Update draft state
      await supabase.from('prospect_sequence_drafts').update({
        body, subject,
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: profile.id,
      }).eq('id', draftId)

      // Spawn task
      const title = ({
        email: 'Send email',
        linkedin: 'Send LinkedIn DM',
        phone: 'Call / leave voicemail',
        task: 'Outreach prep',
      })[row.method] || 'Outreach'

      const { data: enr } = await supabase
        .from('prospect_sequence_enrollments').select('deal_id, contact_id').eq('id', row.enrollment_id).maybeSingle()

      const { data: task } = await supabase.from('tasks').insert({
        property_id: profile.property_id,
        deal_id: enr?.deal_id || null,
        contact_id: enr?.contact_id || null,
        title: `${title}: ${subject || (body.split('\n')[0] || '').slice(0, 60)}`,
        description: body,
        due_date: row.scheduled_at,
        priority: 'Medium',
        status: 'Pending',
        assigned_to: profile.id,
        created_by: profile.id,
      }).select().single()

      if (task?.id) {
        await supabase.from('prospect_sequence_drafts').update({ task_id: task.id }).eq('id', draftId)
      }

      // Drop a row in activities so the deal's timeline shows the
      // queued outreach.
      if (enr?.deal_id) {
        await supabase.from('activities').insert({
          property_id: profile.property_id,
          deal_id: enr.deal_id,
          activity_type: 'Sequence step queued',
          subject: title + (subject ? `: ${subject}` : ''),
          description: body.slice(0, 1000),
          occurred_at: row.scheduled_at || new Date().toISOString(),
          created_by: profile.id,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-drafts', sequence.id] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast({ title: 'Approved + scheduled', type: 'success' })
    },
    onError: (err) => toast({ title: 'Approve failed', description: humanError(err), type: 'error' }),
  })

  const skip = useMutation({
    mutationFn: async (draftId) => {
      await supabase.from('prospect_sequence_drafts').update({ status: 'skipped' }).eq('id', draftId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequence-drafts', sequence.id] }),
  })

  if (isLoading) {
    return <div className="text-xs text-text-muted py-8 text-center">Loading drafts…</div>
  }
  if (drafts.length === 0) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">No drafts on this sequence yet. Run the configure flow first.</p>
        <button onClick={onBack} className="mt-3 text-xs text-accent hover:underline">← Back to configure</button>
      </div>
    )
  }

  const pendingCount = drafts.filter(d => d.status === 'pending').length
  const approvedCount = drafts.filter(d => d.status === 'approved').length

  return (
    <div className="space-y-3">
      <div className="bg-bg-card border border-border rounded p-3 flex items-center justify-between text-xs">
        <div>
          <span className="text-text-muted">Total drafts: </span>
          <span className="text-text-primary font-mono">{drafts.length}</span>
          <span className="mx-3 text-text-muted">·</span>
          <span className="text-text-muted">Pending: </span>
          <span className="text-warning font-mono">{pendingCount}</span>
          <span className="mx-3 text-text-muted">·</span>
          <span className="text-text-muted">Approved: </span>
          <span className="text-success font-mono">{approvedCount}</span>
        </div>
        <button onClick={onBack} className="text-text-muted hover:text-accent">← Configure new run</button>
      </div>

      {grouped.map(({ enrollment, drafts: pdrafts }) => {
        const deal = enrollment?.deals
        const contact = enrollment?.contacts
        return (
          <div key={pdrafts[0]?.enrollment_id} className="bg-bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-bg-card border-b border-border flex items-center justify-between">
              <div className="text-sm">
                <span className="text-text-primary font-medium">{deal?.brand_name || 'Unknown company'}</span>
                {contact && (
                  <span className="text-text-muted ml-2 text-xs">
                    · {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-text-muted">
                {pdrafts.filter(d => d.status === 'approved').length}/{pdrafts.length} approved
              </div>
            </div>

            <div className="divide-y divide-border">
              {pdrafts.map(d => (
                <DraftRow
                  key={d.id}
                  draft={d}
                  open={openDraftId === d.id}
                  onToggle={() => setOpenDraftId(openDraftId === d.id ? null : d.id)}
                  onApprove={(payload) => approve.mutate({ draftId: d.id, ...payload })}
                  onSkip={() => skip.mutate(d.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Draft row + inline editor + OpenAI coach ───────── */
function DraftRow({ draft, open, onToggle, onApprove, onSkip }) {
  const { toast } = useToast()
  const [subject, setSubject] = useState(draft.subject || '')
  const [body, setBody] = useState(draft.body || '')
  const [coachInstr, setCoachInstr] = useState('')
  const [coachBusy, setCoachBusy] = useState(false)
  const [proposal, setProposal] = useState(null)

  async function runCoach() {
    if (!coachInstr.trim()) return
    setCoachBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('sequence-coach', {
        body: { draft_id: draft.id, instruction: coachInstr },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Coach failed')
      setProposal(data.proposal)
    } catch (err) {
      toast({ title: 'Coach failed', description: humanError(err), type: 'error' })
    } finally {
      setCoachBusy(false)
    }
  }

  function acceptProposal() {
    if (!proposal) return
    setSubject(proposal.subject || '')
    setBody(proposal.body || '')
    setProposal(null)
    setCoachInstr('')
  }

  const Icon = METHOD_OPTIONS.find(m => m.id === draft.method)?.icon || Mail
  const statusBadge = {
    pending:  { label: 'Pending',  className: 'bg-warning/10 text-warning border-warning/30' },
    approved: { label: 'Approved', className: 'bg-success/10 text-success border-success/30' },
    sent:     { label: 'Sent',     className: 'bg-bg-card text-text-muted border-border' },
    skipped:  { label: 'Skipped',  className: 'bg-bg-card text-text-muted border-border' },
  }[draft.status] || { label: draft.status, className: 'bg-bg-card text-text-muted border-border' }

  return (
    <div className="px-4 py-2.5">
      <button onClick={onToggle} className="w-full flex items-center gap-3 text-left">
        <Icon className="w-4 h-4 text-accent shrink-0" />
        <span className="text-[10px] font-mono text-text-muted w-14">Step {draft.step_index + 1}</span>
        <span className="text-[10px] font-mono uppercase text-text-muted w-16">{draft.method}</span>
        <span className="text-[10px] font-mono text-text-muted w-28">
          {draft.scheduled_at ? new Date(draft.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
        </span>
        <span className="flex-1 truncate text-xs text-text-secondary">
          {draft.subject || (draft.body || '').slice(0, 70)}
        </span>
        <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 pl-7">
          {draft.method === 'email' && (
            <div>
              <label className="text-[10px] font-mono uppercase text-text-muted">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full mt-1 bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] font-mono uppercase text-text-muted">
              {draft.method === 'phone' ? 'Voicemail script' : draft.method === 'linkedin' ? 'LinkedIn DM' : draft.method === 'task' ? 'Internal note' : 'Body'}
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={draft.method === 'task' ? 2 : 8}
              className="w-full mt-1 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-y"
            />
          </div>

          {/* OpenAI coach inline */}
          <div className="bg-bg-card border border-border rounded p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-text-muted">
              <Wand2 className="w-3 h-3 text-accent" /> Refine with AI
            </div>
            <div className="flex gap-2">
              <input
                value={coachInstr}
                onChange={e => setCoachInstr(e.target.value)}
                placeholder="e.g. make it more concise / less salesy / lead with the funding round"
                className="flex-1 bg-bg-surface border border-border rounded px-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                onKeyDown={e => { if (e.key === 'Enter') runCoach() }}
              />
              <Button size="sm" onClick={runCoach} disabled={coachBusy || !coachInstr.trim()}>
                {coachBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Refine'}
              </Button>
            </div>
            {proposal && (
              <div className="bg-bg-surface border border-accent/30 rounded p-2 space-y-2">
                <div className="text-[10px] font-mono uppercase text-accent">Proposal</div>
                {proposal.subject && (
                  <div className="text-xs"><span className="text-text-muted">Subject: </span><span className="text-text-primary">{proposal.subject}</span></div>
                )}
                <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans">{proposal.body}</pre>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={acceptProposal}><Check className="w-3 h-3" /> Accept</Button>
                  <Button size="sm" variant="ghost" onClick={() => setProposal(null)}><X className="w-3 h-3" /> Discard</Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {draft.status === 'pending' && (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                <X className="w-3.5 h-3.5" /> Skip
              </Button>
            )}
            <Button size="sm" onClick={() => onApprove({ subject, body })} disabled={!body.trim()}>
              <Send className="w-3.5 h-3.5" /> {draft.status === 'approved' ? 'Update + reschedule' : 'Approve + schedule'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
