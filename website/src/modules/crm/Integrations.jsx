import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import { Webhook, Key, Zap, Plus, Trash2, Copy, ExternalLink } from 'lucide-react'

const EVENT_TYPES = [
  { id: 'deal.created',          label: 'Deal created' },
  { id: 'deal.updated',          label: 'Deal updated' },
  { id: 'deal.stage_changed',    label: 'Deal stage changed' },
  { id: 'deal.value_changed',    label: 'Deal value changed' },
  { id: 'deal.deleted',          label: 'Deal deleted' },
]

const TRIGGER_TYPES = [
  { id: 'deal.created',           label: 'When a deal is created' },
  { id: 'deal.stage_changed',     label: 'When a deal\'s stage changes' },
  { id: 'contact.email_replied',  label: 'When a contact replies to email' },
  { id: 'sla.breached',           label: 'When an SLA breach fires' },
]

const ACTION_TYPES = [
  { id: 'assign_user',           label: 'Assign to user' },
  { id: 'set_priority',          label: 'Set priority' },
  { id: 'create_task',           label: 'Create task' },
  { id: 'enroll_in_sequence',    label: 'Enroll in sequence' },
  { id: 'fire_webhook',          label: 'Fire webhook' },
]

// Integrations — single page for webhooks, API keys, and workflow
// rules. Each section is independent; flip feature flags to enable.
export default function Integrations() {
  const { profile } = useAuth()
  const propertyId = profile?.property_id

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'CRM & Prospecting', to: '/app' }, { label: 'Integrations' }]} />

      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Zap className="w-6 h-6 text-accent" />
          Integrations
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Webhooks, API keys, and if-this-then-that workflow rules.
        </p>
      </div>

      <ApiKeysSection propertyId={propertyId} userId={profile?.id} />
      <WebhooksSection propertyId={propertyId} userId={profile?.id} />
      <WorkflowRulesSection propertyId={propertyId} userId={profile?.id} />
    </div>
  )
}

// ────────────────────────────────────────────────────
// API Keys
// ────────────────────────────────────────────────────
function ApiKeysSection({ propertyId, userId }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [revealed, setRevealed] = useState(null)

  const { data: keys = [] } = useQuery({
    queryKey: ['api-keys', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase.from('api_keys').select('*').eq('property_id', propertyId).order('created_at', { ascending: false })
      return data || []
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      // Generate a 40-char hex token client-side (sufficient for v1; rotate by deleting + creating).
      const arr = new Uint8Array(20)
      crypto.getRandomValues(arr)
      const token = 'rally_' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
      const { data, error } = await supabase.from('api_keys').insert({
        property_id: propertyId, created_by: userId, name: name.trim(), token, is_active: true,
      }).select().single()
      if (error) throw error
      setRevealed(token)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys', propertyId] })
      setAdding(false); setName('')
    },
    onError: (e) => toast({ title: 'Could not create', description: humanError(e), type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('api_keys').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys', propertyId] }),
  })

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">API keys</h2>
          {keys.length > 0 && <Badge tone="info">{keys.length}</Badge>}
        </div>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" /> New key</Button>}
      </div>

      <p className="text-xs text-text-muted">
        Use with Zapier, Make, or any HTTP client.
        Endpoint: <code className="bg-bg-card px-1 py-0.5 rounded font-mono text-[11px]">/functions/v1/public-api/deals</code>.
        Auth: <code className="bg-bg-card px-1 py-0.5 rounded font-mono text-[11px]">X-Rally-API-Key</code> header.
      </p>

      {adding && (
        <div className="bg-accent/5 border border-accent/30 rounded p-3 space-y-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name (e.g. Zapier prod)"
                 className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" autoFocus />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Creating…' : 'Generate key'}
            </Button>
          </div>
        </div>
      )}

      {revealed && (
        <div className="bg-warning/10 border border-warning/30 rounded p-3">
          <div className="text-xs text-warning mb-1">Copy this token now — you won't see it again.</div>
          <div className="flex items-center gap-2">
            <code className="bg-bg-card px-2 py-1 rounded font-mono text-[11px] flex-1 break-all">{revealed}</code>
            <button onClick={() => { navigator.clipboard.writeText(revealed); toast({ title: 'Copied', type: 'success' }) }} className="text-text-muted hover:text-accent">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setRevealed(null)} className="text-xs text-text-muted hover:text-text-primary">Dismiss</button>
          </div>
        </div>
      )}

      {keys.length === 0 && !adding && (
        <p className="text-xs text-text-muted">No API keys yet.</p>
      )}

      <ul className="space-y-1.5">
        {keys.map(k => (
          <li key={k.id} className="flex items-center justify-between bg-bg-card border border-border rounded p-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-primary">{k.name}</span>
                <Badge tone={k.is_active ? 'success' : 'neutral'}>{k.is_active ? 'active' : 'revoked'}</Badge>
              </div>
              <div className="text-[11px] text-text-muted font-mono mt-0.5">
                ••••{k.token?.slice(-8)} · created {new Date(k.created_at).toLocaleDateString()}
                {k.last_used_at && <span> · last used {new Date(k.last_used_at).toLocaleDateString()}</span>}
              </div>
            </div>
            <button onClick={() => { if (confirm(`Revoke ${k.name}? Apps using this key will stop working.`)) remove.mutate(k.id) }} className="text-text-muted hover:text-danger p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ────────────────────────────────────────────────────
// Webhooks
// ────────────────────────────────────────────────────
function WebhooksSection({ propertyId, userId }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', events: [] })

  const { data: subs = [] } = useQuery({
    queryKey: ['webhook-subs', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase.from('webhook_subscriptions').select('*').eq('property_id', propertyId).order('created_at', { ascending: false })
      return data || []
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      // Random secret for HMAC signing.
      const arr = new Uint8Array(24)
      crypto.getRandomValues(arr)
      const secret = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
      const { error } = await supabase.from('webhook_subscriptions').insert({
        property_id: propertyId, created_by: userId,
        name: form.name.trim(), url: form.url.trim(),
        events: form.events, secret, is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhook-subs', propertyId] })
      setAdding(false); setForm({ name: '', url: '', events: [] })
      toast({ title: 'Webhook saved', type: 'success' })
    },
    onError: (e) => toast({ title: 'Save failed', description: humanError(e), type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('webhook_subscriptions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhook-subs', propertyId] }),
  })

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">Webhooks</h2>
          {subs.length > 0 && <Badge tone="info">{subs.length}</Badge>}
        </div>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" /> New webhook</Button>}
      </div>
      <p className="text-xs text-text-muted">
        Push deal events to Zapier, Make, Slack, or your own server. POST with JSON body + HMAC-SHA256 signature in <code className="bg-bg-card px-1 py-0.5 rounded font-mono text-[11px]">X-Rally-Signature</code>.
      </p>

      {adding && (
        <div className="bg-accent/5 border border-accent/30 rounded p-3 space-y-2">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Webhook name (e.g. Slack #deals)"
                 className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" autoFocus />
          <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://hooks.zapier.com/…"
                 className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPES.map(e => {
              const active = form.events.includes(e.id)
              return (
                <button key={e.id} type="button" onClick={() => setForm({ ...form, events: active ? form.events.filter(x => x !== e.id) : [...form.events, e.id] })}
                        className={`px-2 py-1 rounded text-[11px] font-mono border ${active ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-card border-border text-text-muted'}`}>
                  {e.label}
                </button>
              )
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={!form.name.trim() || !form.url.trim() || form.events.length === 0 || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {subs.length === 0 && !adding && <p className="text-xs text-text-muted">No webhooks configured.</p>}

      <ul className="space-y-1.5">
        {subs.map(s => (
          <li key={s.id} className="bg-bg-card border border-border rounded p-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-text-primary font-medium">{s.name}</span>
                <Badge tone={s.is_active ? 'success' : 'neutral'}>{s.is_active ? 'active' : 'paused'}</Badge>
                {s.last_status && <Badge tone={s.last_status < 300 ? 'success' : 'danger'}>last: {s.last_status}</Badge>}
              </div>
              <div className="text-[11px] text-text-muted font-mono mt-0.5 break-all">
                <ExternalLink className="w-3 h-3 inline mr-1" />{s.url}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">{(s.events || []).join(' · ')}</div>
            </div>
            <button onClick={() => { if (confirm(`Delete webhook "${s.name}"?`)) remove.mutate(s.id) }} className="text-text-muted hover:text-danger p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ────────────────────────────────────────────────────
// Workflow rules
// ────────────────────────────────────────────────────
function WorkflowRulesSection({ propertyId, userId }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', trigger_type: 'deal.stage_changed', action_type: 'assign_user', action_payload: {} })

  const { data: rules = [] } = useQuery({
    queryKey: ['workflow-rules', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase.from('workflow_rules').select('*').eq('property_id', propertyId).order('created_at', { ascending: false })
      return data || []
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('workflow_rules').insert({
        property_id: propertyId, created_by: userId,
        name: form.name.trim(), trigger_type: form.trigger_type,
        action_type: form.action_type, action_payload: form.action_payload,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-rules', propertyId] })
      setAdding(false); setForm({ name: '', trigger_type: 'deal.stage_changed', action_type: 'assign_user', action_payload: {} })
      toast({ title: 'Rule saved', type: 'success' })
    },
    onError: (e) => toast({ title: 'Save failed', description: humanError(e), type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('workflow_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-rules', propertyId] }),
  })

  const toggle = useMutation({
    mutationFn: async (rule) => {
      const { error } = await supabase.from('workflow_rules').update({ is_active: !rule.is_active }).eq('id', rule.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-rules', propertyId] }),
  })

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-text-primary">Workflow rules</h2>
          {rules.length > 0 && <Badge tone="info">{rules.length}</Badge>}
        </div>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" /> New rule</Button>}
      </div>
      <p className="text-xs text-text-muted">If-this-then-that. Triggers fire when CRM events match; actions run automatically.</p>

      {adding && (
        <div className="bg-accent/5 border border-accent/30 rounded p-3 space-y-2">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rule name" autoFocus
                 className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider">When</label>
              <select value={form.trigger_type} onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                      className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent">
                {TRIGGER_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider">Then</label>
              <select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value, action_payload: {} })}
                      className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary mt-0.5 focus:outline-none focus:border-accent">
                {ACTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={!form.name.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Saving…' : 'Save rule'}
            </Button>
          </div>
        </div>
      )}

      {rules.length === 0 && !adding && (
        <EmptyState title="No rules yet" description="Add a rule like 'When stage changes to Negotiation, assign Mike.'" className="border-0 py-4" />
      )}

      <ul className="space-y-1.5">
        {rules.map(r => (
          <li key={r.id} className="bg-bg-card border border-border rounded p-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-text-primary font-medium">{r.name}</span>
                <Badge tone={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'active' : 'paused'}</Badge>
                {r.fired_count > 0 && <Badge tone="info">{r.fired_count} fires</Badge>}
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">
                When: {TRIGGER_TYPES.find(t => t.id === r.trigger_type)?.label || r.trigger_type}
                {' · '}Then: {ACTION_TYPES.find(t => t.id === r.action_type)?.label || r.action_type}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggle.mutate(r)} className="text-xs text-text-muted hover:text-accent">
                {r.is_active ? 'Pause' : 'Resume'}
              </button>
              <button onClick={() => { if (confirm(`Delete rule "${r.name}"?`)) remove.mutate(r.id) }} className="text-text-muted hover:text-danger p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
