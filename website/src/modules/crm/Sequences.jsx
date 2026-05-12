import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { Mail, Linkedin, Phone, ListChecks, Activity, Zap, Plus, Trash2, BarChart3, Pencil, X } from 'lucide-react'
import SequenceAIBuilder from '@/components/sequences/SequenceAIBuilder'

// Sequences — list, create, edit, and review analytics for prospect
// outreach cadences. Two tabs:
//   • Builder  — list of sequences + step editor for the selected one
//   • Analytics — per-step reply rate from sequence_step_performance
export default function Sequences() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState('builder')
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)

  const { data: sequences = [] } = useQuery({
    queryKey: ['prospect-sequences', profile?.property_id],
    enabled: !!profile?.property_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('prospect_sequences')
        .select('*')
        .eq('property_id', profile.property_id)
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const createSeq = useMutation({
    mutationFn: async ({ name, description }) => {
      const { data, error } = await supabase.from('prospect_sequences').insert({
        property_id: profile.property_id,
        created_by: profile.id,
        name,
        description: description || null,
        is_active: true,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['prospect-sequences', profile.property_id] })
      setSelectedId(data.id)
      setCreating(false)
      toast({ title: 'Sequence created', type: 'success' })
    },
    onError: (e) => toast({ title: 'Could not create', description: humanError(e), type: 'error' }),
  })

  const deleteSeq = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('prospect_sequences').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospect-sequences', profile.property_id] })
      setSelectedId(null)
    },
  })

  const selected = sequences.find(s => s.id === selectedId)

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'CRM & Prospecting', to: '/app' },
        { label: 'Sequences' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Zap className="w-6 h-6 text-accent" />
          Sequences
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Multi-step cadences across email, LinkedIn, phone, and tasks.
        </p>
      </div>

      <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit">
        <button onClick={() => setTab('builder')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'builder' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}>Builder</button>
        <button onClick={() => setTab('ai')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'ai' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}>AI Builder</button>
        <button onClick={() => setTab('analytics')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'analytics' ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}>Analytics</button>
      </div>

      {tab === 'builder' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card padding="none" className="md:col-span-1 overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Your sequences</h2>
              <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
                <Plus className="w-3.5 h-3.5" /> New
              </Button>
            </div>
            {creating && (
              <NewSequenceForm
                onCancel={() => setCreating(false)}
                onCreate={(payload) => createSeq.mutate(payload)}
                saving={createSeq.isPending}
              />
            )}
            {sequences.length === 0 && !creating && (
              <EmptyState
                title="No sequences yet"
                description="Create your first cadence to start enrolling contacts."
                primaryAction={<Button size="sm" onClick={() => setCreating(true)}>+ New sequence</Button>}
                className="border-0 py-6"
              />
            )}
            <ul className="divide-y divide-border">
              {sequences.map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left p-3 hover:bg-bg-card transition-colors ${selectedId === s.id ? 'bg-bg-card border-l-2 border-accent' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">{s.name}</span>
                      <Badge tone={s.is_active ? 'success' : 'neutral'}>{s.is_active ? 'active' : 'paused'}</Badge>
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">{s.total_steps} step{s.total_steps === 1 ? '' : 's'}</div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <div className="md:col-span-2">
            {selected ? (
              <SequenceEditor sequence={selected} onDelete={() => { if (confirm('Delete sequence?')) deleteSeq.mutate(selected.id) }} />
            ) : (
              <Card padding="lg" className="text-sm text-text-muted text-center">
                Select a sequence on the left to edit, or click + New.
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <SequenceAIBuilder
          sequence={sequences.find(s => s.id === selectedId) || sequences[0]}
        />
      )}

      {tab === 'analytics' && <SequenceAnalytics propertyId={profile?.property_id} />}
    </div>
  )
}

function NewSequenceForm({ onCancel, onCreate, saving }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  return (
    <div className="p-3 bg-bg-card border-b border-border space-y-2">
      <input
        type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Sequence name (e.g. 5-touch enterprise)"
        className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        autoFocus
      />
      <input
        type="text" value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-bg-surface border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" disabled={!name.trim() || saving} onClick={() => onCreate({ name, description })}>
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </div>
  )
}

const CHANNEL_META = {
  email: { label: 'Email', icon: Mail, tone: 'info' },
  linkedin_dm: { label: 'LinkedIn DM', icon: Linkedin, tone: 'accent' },
  phone: { label: 'Phone', icon: Phone, tone: 'warning' },
  task: { label: 'Task', icon: ListChecks, tone: 'neutral' },
  engage_post: { label: 'Engage on post', icon: Activity, tone: 'success' },
}

function SequenceEditor({ sequence, onDelete }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)

  const { data: steps = [] } = useQuery({
    queryKey: ['sequence-steps', sequence.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('prospect_sequence_steps')
        .select('*')
        .eq('sequence_id', sequence.id)
        .order('step_index', { ascending: true })
      return data || []
    },
  })

  const upsertStep = useMutation({
    mutationFn: async (step) => {
      const payload = {
        sequence_id: sequence.id,
        step_index: step.step_index,
        day_offset: step.day_offset,
        channel: step.channel,
        name: step.name || null,
        subject_template: step.subject_template || null,
        body_template: step.body_template || '',
        task_template: step.task_template || null,
        use_business_days: !!step.use_business_days,
      }
      if (step.id) {
        const { error } = await supabase.from('prospect_sequence_steps').update(payload).eq('id', step.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('prospect_sequence_steps').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-steps', sequence.id] })
      qc.invalidateQueries({ queryKey: ['prospect-sequences'] })
      setCreating(false)
      toast({ title: 'Step saved', type: 'success' })
    },
    onError: (e) => toast({ title: 'Save failed', description: humanError(e), type: 'error' }),
  })

  const deleteStep = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('prospect_sequence_steps').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequence-steps', sequence.id] }),
  })

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{sequence.name}</h3>
          {sequence.description && <p className="text-xs text-text-muted mt-0.5">{sequence.description}</p>}
        </div>
        <button onClick={onDelete} className="text-text-muted hover:text-danger text-xs">
          <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Delete
        </button>
      </div>

      {steps.length === 0 && !creating && (
        <EmptyState
          title="No steps yet"
          description="Add the first touchpoint of this cadence."
          primaryAction={<Button size="sm" onClick={() => setCreating(true)}>+ Add first step</Button>}
          className="border-0 py-6"
        />
      )}

      <ul className="space-y-2">
        {steps.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            stepNumber={i + 1}
            onSave={(s) => upsertStep.mutate(s)}
            onDelete={() => { if (confirm('Delete this step?')) deleteStep.mutate(step.id) }}
            saving={upsertStep.isPending}
          />
        ))}
      </ul>

      {creating ? (
        <StepRow
          step={{ step_index: steps.length, day_offset: 0, channel: 'email', body_template: '' }}
          stepNumber={steps.length + 1}
          isNew
          onSave={(s) => upsertStep.mutate(s)}
          onCancel={() => setCreating(false)}
          saving={upsertStep.isPending}
        />
      ) : (
        steps.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="w-3.5 h-3.5" /> Add step
          </Button>
        )
      )}

      {/* Enrolled deals — every deal that's been pushed into this
          cadence, with a status badge so the rep can see at a
          glance which deals are stuck at step 0 (untouched) vs.
          mid-flow vs. done. Big lever for tracking who actually
          needs nudging. */}
      <EnrolledDeals sequenceId={sequence.id} propertyId={sequence.property_id} stepCount={steps.length} />
    </Card>
  )
}

function EnrolledDeals({ sequenceId, propertyId, stepCount }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [enrolling, setEnrolling] = useState(false)

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['sequence-enrollments', sequenceId],
    enabled: !!sequenceId,
    queryFn: async () => {
      const { data } = await supabase
        .from('prospect_sequence_enrollments')
        .select(`
          id, current_step, last_sent_at, next_send_at, completed, paused, paused_reason, enrolled_at,
          contact:contact_id (id, first_name, last_name, email, position),
          deal:deal_id (id, brand_name, stage, value)
        `)
        .eq('sequence_id', sequenceId)
        .order('enrolled_at', { ascending: false })
      return data || []
    },
  })

  const unenroll = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('prospect_sequence_enrollments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-enrollments', sequenceId] })
      toast({ title: 'Unenrolled', type: 'success' })
    },
    onError: (e) => toast({ title: 'Could not unenroll', description: humanError(e), type: 'error' }),
  })

  const untouchedCount = enrollments.filter(e => isUntouched(e)).length
  const activeCount = enrollments.filter(e => !e.completed && !e.paused).length

  return (
    <div className="pt-3 border-t border-border space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-text-primary">
          Enrolled deals
          {enrollments.length > 0 && (
            <span className="ml-2 text-[11px] font-mono text-text-muted">
              {activeCount} active
              {untouchedCount > 0 && (
                <> · <span className="text-warning">{untouchedCount} untouched</span></>
              )}
            </span>
          )}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setEnrolling(true)} disabled={stepCount === 0}>
          <Plus className="w-3.5 h-3.5" /> Enroll deal
        </Button>
      </div>

      {stepCount === 0 && enrollments.length === 0 && (
        <p className="text-[11px] text-text-muted">Add at least one step above before enrolling deals.</p>
      )}

      {isLoading && <div className="text-[11px] text-text-muted">Loading enrollments…</div>}

      {!isLoading && enrollments.length === 0 && stepCount > 0 && (
        <p className="text-[11px] text-text-muted">No deals enrolled yet. Click <em>Enroll deal</em> to push existing pipeline into this sequence.</p>
      )}

      {enrollments.length > 0 && (
        <ul className="space-y-1.5">
          {enrollments.map(e => (
            <EnrollmentRow key={e.id} enrollment={e} stepCount={stepCount} onUnenroll={() => unenroll.mutate(e.id)} />
          ))}
        </ul>
      )}

      {enrolling && (
        <EnrollDealDialog
          sequenceId={sequenceId}
          propertyId={propertyId}
          onClose={() => setEnrolling(false)}
          onEnrolled={() => {
            qc.invalidateQueries({ queryKey: ['sequence-enrollments', sequenceId] })
            setEnrolling(false)
          }}
        />
      )}
    </div>
  )
}

// "Untouched" = the runner hasn't actually sent a step yet. We key
// on last_sent_at being null AND current_step === 0 so an enrollment
// the user manually nudged with current_step++ but never sent
// doesn't get falsely marked untouched.
function isUntouched(e) {
  return !e.last_sent_at && (e.current_step ?? 0) === 0 && !e.completed && !e.paused
}

function EnrollmentRow({ enrollment, stepCount, onUnenroll }) {
  const c = enrollment.contact
  const d = enrollment.deal
  const untouched = isUntouched(enrollment)
  const tone = enrollment.completed ? 'success'
    : enrollment.paused ? 'warning'
    : untouched ? 'warning'
    : 'info'
  const label = enrollment.completed ? 'Completed'
    : enrollment.paused ? `Paused${enrollment.paused_reason ? ` (${enrollment.paused_reason})` : ''}`
    : untouched ? 'Untouched'
    : `Step ${enrollment.current_step}${stepCount ? `/${stepCount}` : ''}`

  return (
    <li className="bg-bg-card border border-border rounded p-2.5 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={tone}>{label}</Badge>
          {d?.brand_name && (
            <Link to={`/app/crm/pipeline?deal=${d.id}`} className="text-sm font-medium text-text-primary hover:text-accent truncate">
              {d.brand_name}
            </Link>
          )}
          {c && (
            <span className="text-[11px] text-text-muted truncate">
              {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
              {c.position && <span className="text-text-secondary"> · {c.position}</span>}
            </span>
          )}
        </div>
        <div className="text-[10px] font-mono text-text-muted mt-0.5 flex gap-3 flex-wrap">
          <span>enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}</span>
          {enrollment.last_sent_at && <span>last sent {new Date(enrollment.last_sent_at).toLocaleDateString()}</span>}
          {enrollment.next_send_at && !enrollment.completed && !enrollment.paused && (
            <span>next {new Date(enrollment.next_send_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => { if (confirm(`Unenroll ${d?.brand_name || 'this deal'} from the sequence?`)) onUnenroll() }}
        className="text-text-muted hover:text-danger text-xs shrink-0"
        title="Unenroll"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  )
}

function EnrollDealDialog({ sequenceId, propertyId, onClose, onEnrolled }) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(null)   // { deal, contacts }
  const [contactId, setContactId] = useState('')
  const [saving, setSaving] = useState(false)

  // Search active deals by brand name. Only show deals that aren't
  // already enrolled in this sequence — easier path than letting
  // the user pick a dup and then erroring on the unique constraint.
  const { data: deals = [] } = useQuery({
    queryKey: ['enroll-deal-search', propertyId, search],
    enabled: !!propertyId,
    queryFn: async () => {
      let q = supabase
        .from('deals')
        .select('id, brand_name, stage, value')
        .eq('property_id', propertyId)
        .not('stage', 'in', '(Declined)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (search.trim()) q = q.ilike('brand_name', `%${search.trim().replace(/[%_]/g, '')}%`)
      const { data } = await q
      return data || []
    },
  })

  // When a deal is picked, fetch its contacts so the rep can pick
  // which one to enroll. Enrollment requires a contact (the
  // sequence runner sends to a specific email).
  const { data: contactsForDeal } = useQuery({
    queryKey: ['enroll-deal-contacts', picked?.id],
    enabled: !!picked?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, position, is_primary')
        .eq('deal_id', picked.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  // Auto-pick the primary contact when contacts load so the rep
  // doesn't have to click the dropdown for the most common case.
  useEffect(() => {
    if (contactsForDeal && contactsForDeal.length > 0 && !contactId) {
      const primary = contactsForDeal.find(c => c.is_primary) || contactsForDeal[0]
      setContactId(primary.id)
    }
  }, [contactsForDeal, contactId])

  async function handleEnroll() {
    if (!picked || !contactId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('prospect_sequence_enrollments').insert({
        sequence_id: sequenceId,
        property_id: propertyId,
        contact_id: contactId,
        deal_id: picked.id,
        current_step: 0,
        completed: false,
        paused: false,
      })
      if (error) {
        // Unique constraint (sequence_id, contact_id) — friendly message.
        if (/duplicate key/.test(error.message)) {
          throw new Error('That contact is already enrolled in this sequence.')
        }
        throw error
      }
      toast({ title: 'Deal enrolled', description: picked.brand_name, type: 'success' })
      onEnrolled?.()
    } catch (e) {
      toast({ title: 'Enrollment failed', description: humanError(e), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Enroll a deal in this sequence</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {!picked && (
            <>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search deals by brand name…"
                className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <ul className="divide-y divide-border max-h-72 overflow-y-auto bg-bg-card border border-border rounded">
                {deals.length === 0 && <li className="px-3 py-2 text-xs text-text-muted">No deals match.</li>}
                {deals.map(d => (
                  <li key={d.id}>
                    <button
                      onClick={() => setPicked(d)}
                      className="w-full text-left px-3 py-2 hover:bg-bg-surface/60 transition-colors"
                    >
                      <div className="text-sm text-text-primary font-medium truncate">{d.brand_name || '(unnamed)'}</div>
                      <div className="text-[11px] text-text-muted font-mono">
                        {d.stage}{d.value ? ` · $${Number(d.value).toLocaleString()}` : ''}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {picked && (
            <>
              <div className="bg-bg-card border border-border rounded p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Picked deal</div>
                <div className="text-sm font-semibold text-text-primary mt-0.5">{picked.brand_name}</div>
                <button onClick={() => { setPicked(null); setContactId('') }} className="text-[11px] text-accent hover:underline mt-1">Change deal</button>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-text-muted">Enroll which contact?</label>
                {(contactsForDeal || []).length === 0 ? (
                  <div className="bg-warning/5 border border-warning/30 rounded p-2 text-[11px] text-warning mt-1">
                    This deal has no contacts with an email. Add one from the deal viewer first, then come back.
                  </div>
                ) : (
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent mt-1"
                  >
                    <option value="">— Pick a contact —</option>
                    {(contactsForDeal || []).filter(c => c.email).map(c => (
                      <option key={c.id} value={c.id}>
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                        {c.position ? ` · ${c.position}` : ''}
                        {c.is_primary ? ' (primary)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleEnroll} disabled={!picked || !contactId || saving}>
            {saving ? 'Enrolling…' : 'Enroll'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StepRow({ step, stepNumber, isNew, onSave, onCancel, onDelete, saving }) {
  const [editing, setEditing] = useState(!!isNew)
  const [form, setForm] = useState({
    step_index: step.step_index,
    day_offset: step.day_offset || 0,
    channel: step.channel || 'email',
    name: step.name || '',
    subject_template: step.subject_template || '',
    body_template: step.body_template || '',
    task_template: step.task_template || '',
    use_business_days: !!step.use_business_days,
  })

  const meta = CHANNEL_META[form.channel] || CHANNEL_META.email
  const Icon = meta.icon
  const isEmail = form.channel === 'email'

  if (!editing) {
    const StepIcon = (CHANNEL_META[step.channel] || CHANNEL_META.email).icon
    return (
      <li className="bg-bg-card border border-border rounded p-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold shrink-0">{stepNumber}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={(CHANNEL_META[step.channel] || CHANNEL_META.email).tone}><StepIcon className="w-3 h-3 inline mr-1" />{(CHANNEL_META[step.channel] || CHANNEL_META.email).label}</Badge>
              <span className="text-xs text-text-muted">Day +{step.day_offset}</span>
              {step.name && <span className="text-sm text-text-primary">{step.name}</span>}
            </div>
            {step.subject_template && <div className="text-xs text-text-secondary mt-1 truncate">📧 {step.subject_template}</div>}
            {step.body_template && <div className="text-[11px] text-text-muted mt-1 line-clamp-2">{step.body_template.slice(0, 200)}</div>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="text-text-muted hover:text-accent p-1"><Pencil className="w-3.5 h-3.5" /></button>
          {onDelete && <button onClick={onDelete} className="text-text-muted hover:text-danger p-1"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      </li>
    )
  }

  return (
    <li className="bg-accent/5 border border-accent/30 rounded p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full bg-accent text-bg-primary flex items-center justify-center text-xs font-semibold">{stepNumber}</div>
        <span className="text-xs font-medium text-text-primary">{isNew ? 'New step' : 'Edit step'}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Channel</label>
          <select
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
          >
            {Object.entries(CHANNEL_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Day offset</label>
          <input
            type="number" min={0} value={form.day_offset}
            onChange={(e) => setForm({ ...form, day_offset: Number(e.target.value) || 0 })}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Label</label>
          <input
            type="text" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Day 3 nudge"
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-text-muted">
        <input
          type="checkbox"
          checked={form.use_business_days}
          onChange={(e) => setForm({ ...form, use_business_days: e.target.checked })}
          className="accent-accent w-3.5 h-3.5"
        />
        <span>Skip weekends + US holidays for this step</span>
      </label>

      {isEmail && (
        <>
          <input
            type="text" value={form.subject_template}
            onChange={(e) => setForm({ ...form, subject_template: e.target.value })}
            placeholder="Subject — use {{first_name}}, {{company}}, {{position}}"
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
          />
          <textarea
            rows={6} value={form.body_template}
            onChange={(e) => setForm({ ...form, body_template: e.target.value })}
            placeholder="Body — use {{first_name}}, {{company}}, {{position}}"
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent resize-none font-mono"
          />
        </>
      )}

      {!isEmail && (
        <textarea
          rows={3} value={form.task_template}
          onChange={(e) => setForm({ ...form, task_template: e.target.value })}
          placeholder={`Task instructions for ${meta.label.toLowerCase()} step…`}
          className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
        />
      )}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); onCancel?.() }}>Cancel</Button>
        <Button size="sm" disabled={saving} onClick={() => { onSave({ ...step, ...form }); setEditing(false) }}>
          {saving ? 'Saving…' : 'Save step'}
        </Button>
      </div>
    </li>
  )
}

function SequenceAnalytics({ propertyId }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['sequence-step-performance', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('sequence_step_performance')
        .select('*')
        .eq('property_id', propertyId)
        .order('sequence_name', { ascending: true })
        .order('step_index', { ascending: true })
      return data || []
    },
  })

  const grouped = rows.reduce((acc, r) => {
    acc[r.sequence_name] = acc[r.sequence_name] || []
    acc[r.sequence_name].push(r)
    return acc
  }, {})

  if (isLoading) return <div className="text-sm text-text-muted">Loading…</div>
  if (!rows.length) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-7 h-7 text-text-muted" />}
        title="No sequence data yet"
        description="Once contacts are enrolled and the runner starts firing, per-step performance lands here."
      />
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([name, steps]) => (
        <Card key={name} padding="md">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" /> {name}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="text-left py-1.5">Step</th>
                  <th className="text-right py-1.5">Sends</th>
                  <th className="text-right py-1.5">Opens</th>
                  <th className="text-right py-1.5">Replies</th>
                  <th className="text-right py-1.5">Reply rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {steps.map(s => (
                  <tr key={s.step_index}>
                    <td className="py-2 text-text-primary font-mono">#{s.step_index + 1}</td>
                    <td className="py-2 text-right text-text-secondary">{s.sends}</td>
                    <td className="py-2 text-right text-text-secondary">{s.opens}</td>
                    <td className="py-2 text-right text-text-secondary">{s.replies}</td>
                    <td className="py-2 text-right">
                      <Badge tone={s.reply_rate >= 10 ? 'success' : s.reply_rate >= 5 ? 'accent' : 'neutral'}>
                        {s.reply_rate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  )
}
