import { useState } from 'react'
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
    </Card>
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
