import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Button, Card, EmptyState, Badge } from '@/components/ui'
import { humanError } from '@/lib/humanError'
import AccountHealthBadge from '@/components/AccountHealthBadge'
import { Building, Calendar, Activity, AlertOctagon, FileText, Users, BookOpen } from 'lucide-react'

const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'qbrs',       label: 'QBRs' },
  { id: 'cs',         label: 'CS activity' },
  { id: 'team',       label: 'Account team' },
  { id: 'risks',      label: 'Risks' },
  { id: 'recap',      label: 'Recap' },
  { id: 'references', label: 'References' },
]

// AccountDetail — per-account workspace. All the per-account
// surfaces (QBRs, CS activities, account team, churn risks,
// recap metrics, references) live here under tabs.
export default function AccountDetail() {
  const { id: accountId } = useParams()
  const [tab, setTab] = useState('overview')

  const { data: account } = useQuery({
    queryKey: ['account-detail', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data } = await supabase.from('accounts').select('*').eq('id', accountId).maybeSingle()
      return data
    },
  })

  if (!account) return <div className="p-4 text-sm text-text-muted">Loading…</div>

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'Account Management', to: '/app/accounts' },
        { label: 'Accounts', to: '/app/crm/accounts' },
        { label: account.name },
      ]} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Building className="w-6 h-6 text-accent" />
            {account.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <AccountHealthBadge accountId={account.id} />
            {account.industry && <Badge tone="info">{account.industry}</Badge>}
            {account.website && (
              <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                 target="_blank" rel="noopener noreferrer"
                 className="text-[11px] text-accent hover:underline">{account.website}</a>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-bg-card rounded-lg p-1 w-fit overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'   && <OverviewTab account={account} />}
      {tab === 'qbrs'       && <QbrsTab     account={account} />}
      {tab === 'cs'         && <CsTab       account={account} />}
      {tab === 'team'       && <TeamTab     account={account} />}
      {tab === 'risks'      && <RisksTab    account={account} />}
      {tab === 'recap'      && <RecapTab    account={account} />}
      {tab === 'references' && <ReferencesTab account={account} />}
    </div>
  )
}

// ── Overview: pipeline rollup + recent timeline ───────────────
function OverviewTab({ account }) {
  const { data: deals = [] } = useQuery({
    queryKey: ['account-deals', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, brand_name, stage, value, created_at').eq('account_id', account.id).order('created_at', { ascending: false })
      return data || []
    },
  })

  // Account-level engagement timeline: emails + activities + portal events + cs activities
  // unioned client-side. Each source already filters by deal_id.
  const dealIds = deals.map(d => d.id)
  const { data: timeline = [] } = useQuery({
    queryKey: ['account-timeline', account.id, dealIds.join(',')],
    enabled: dealIds.length > 0,
    queryFn: async () => {
      const [{ data: outreach }, { data: activities }, { data: csActs }] = await Promise.all([
        supabase.from('outreach_log').select('id, deal_id, direction, subject, sent_at, to_email').in('deal_id', dealIds).order('sent_at', { ascending: false }).limit(40),
        supabase.from('activities').select('id, deal_id, activity_type, subject, occurred_at').in('deal_id', dealIds).order('occurred_at', { ascending: false }).limit(40),
        supabase.from('cs_activities').select('id, deal_id, activity_kind, subject, occurred_at').eq('account_id', account.id).order('occurred_at', { ascending: false }).limit(40),
      ])
      const merged = [
        ...(outreach || []).map(r => ({ id: 'o' + r.id, kind: r.direction, label: r.subject || '(no subject)', sub: r.to_email, at: r.sent_at })),
        ...(activities || []).map(r => ({ id: 'a' + r.id, kind: r.activity_type, label: r.subject || r.activity_type, at: r.occurred_at })),
        ...(csActs || []).map(r => ({ id: 'c' + r.id, kind: 'cs:' + r.activity_kind, label: r.subject, at: r.occurred_at })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 30)
      return merged
    },
  })

  const wonValue = deals.filter(d => ['Renewed', 'Contracted', 'In Fulfillment'].includes(d.stage)).reduce((s, d) => s + (Number(d.value) || 0), 0)
  const openValue = deals.filter(d => !['Renewed', 'Declined'].includes(d.stage)).reduce((s, d) => s + (Number(d.value) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card padding="md"><div className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Open pipeline</div><div className="text-2xl font-bold text-text-primary tabular-nums">${openValue.toLocaleString()}</div></Card>
        <Card padding="md"><div className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Won value</div><div className="text-2xl font-bold text-success tabular-nums">${wonValue.toLocaleString()}</div></Card>
        <Card padding="md"><div className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Total deals</div><div className="text-2xl font-bold text-text-primary tabular-nums">{deals.length}</div></Card>
      </div>

      <Card padding="md">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Deals at this account</h3>
        {deals.length === 0 ? <EmptyState title="No deals yet" description="Add a deal and link it here to start rolling up pipeline." className="border-0 py-3" /> : (
          <ul className="divide-y divide-border">
            {deals.map(d => (
              <li key={d.id}>
                <Link to={`/app/crm/pipeline?deal=${d.id}`} className="flex items-center justify-between p-2 hover:bg-bg-card">
                  <div>
                    <div className="text-sm text-text-primary">{d.brand_name}</div>
                    <div className="text-[11px] text-text-muted font-mono">{d.stage} · {d.value ? '$' + Number(d.value).toLocaleString() : '—'}</div>
                  </div>
                  <span className="text-[11px] text-accent">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padding="md">
        <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" /> Engagement timeline
        </h3>
        {timeline.length === 0 ? <EmptyState title="No activity yet" description="Emails, calls, CS touches will appear here as they happen." className="border-0 py-3" /> : (
          <ul className="space-y-1.5">
            {timeline.map(e => (
              <li key={e.id} className="text-xs text-text-secondary flex items-start gap-2">
                <Badge tone={e.kind === 'inbound' ? 'success' : e.kind?.startsWith('cs:') ? 'accent' : 'neutral'} className="shrink-0">
                  {e.kind}
                </Badge>
                <span className="flex-1 truncate">{e.label}</span>
                <span className="text-[10px] text-text-muted font-mono shrink-0">{new Date(e.at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// ── QBRs ──────────────────────────────────────────────────────
function QbrsTab({ account }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')

  const { data: rows = [] } = useQuery({
    queryKey: ['qbrs', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('qbr_meetings').select('*').eq('account_id', account.id).order('scheduled_for', { ascending: false })
      return data || []
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      // Read default agenda from the SQL helper.
      const { data: agenda } = await supabase.rpc('default_qbr_agenda')
      const { error } = await supabase.from('qbr_meetings').insert({
        property_id: account.property_id,
        account_id: account.id,
        scheduled_for: scheduledFor,
        agenda: agenda || [],
        status: 'scheduled',
        created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qbrs', account.id] })
      setAdding(false); setScheduledFor('')
      toast({ title: 'QBR scheduled', type: 'success' })
    },
    onError: (e) => toast({ title: 'Could not schedule', description: humanError(e), type: 'error' }),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-muted">{rows.length} QBR{rows.length === 1 ? '' : 's'}</span>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Calendar className="w-3.5 h-3.5" /> Schedule QBR</Button>}
      </div>
      {adding && (
        <Card padding="md" className="space-y-2 border-accent/30">
          <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)}
                 className="w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={!scheduledFor || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Scheduling…' : 'Schedule'}
            </Button>
          </div>
        </Card>
      )}
      {rows.length === 0 && !adding && (
        <EmptyState title="No QBRs scheduled" description="Quarterly business reviews keep accounts retained. Schedule one." />
      )}
      <ul className="space-y-2">
        {rows.map(q => (
          <Card key={q.id} padding="md">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-sm font-medium text-text-primary">{new Date(q.scheduled_for).toLocaleString()}</div>
                <div className="text-[11px] text-text-muted font-mono">{q.duration_minutes} min · {q.status}</div>
              </div>
              <Badge tone={q.status === 'complete' ? 'success' : q.status === 'cancelled' ? 'neutral' : 'accent'}>{q.status}</Badge>
            </div>
            {Array.isArray(q.agenda) && q.agenda.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-text-secondary list-disc list-inside">
                {q.agenda.slice(0, 6).map((a, i) => <li key={i}>{a.topic}</li>)}
              </ul>
            )}
          </Card>
        ))}
      </ul>
    </div>
  )
}

// ── CS Activity ───────────────────────────────────────────────
const CS_KINDS = ['qbr', 'escalation', 'exec_sync', 'training', 'kickoff', 'check_in', 'risk_review']
const CS_OUTCOMES = ['positive', 'neutral', 'concern']

function CsTab({ account }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ activity_kind: 'check_in', subject: '', notes: '', outcome: 'neutral', next_step: '' })

  const { data: rows = [] } = useQuery({
    queryKey: ['cs-activities', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('cs_activities').select('*').eq('account_id', account.id).order('occurred_at', { ascending: false })
      return data || []
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('cs_activities').insert({
        property_id: account.property_id,
        account_id: account.id,
        ...form,
        created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cs-activities', account.id] })
      setAdding(false); setForm({ activity_kind: 'check_in', subject: '', notes: '', outcome: 'neutral', next_step: '' })
      toast({ title: 'Activity logged', type: 'success' })
    },
    onError: (e) => toast({ title: 'Could not log', description: humanError(e), type: 'error' }),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-muted">{rows.length} CS activit{rows.length === 1 ? 'y' : 'ies'}</span>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>+ Log activity</Button>}
      </div>
      {adding && (
        <Card padding="md" className="space-y-2 border-accent/30">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.activity_kind} onChange={(e) => setForm({ ...form, activity_kind: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
              {CS_KINDS.map(k => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
            </select>
            <select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
              {CS_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject"
                 className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes"
                    className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent resize-none" />
          <input type="text" value={form.next_step} onChange={(e) => setForm({ ...form, next_step: e.target.value })} placeholder="Next step (optional)"
                 className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={!form.subject.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Card>
      )}
      {rows.length === 0 && !adding && (
        <EmptyState title="No CS activity yet" description="Log QBRs, escalations, exec syncs, training sessions — keep CS distinct from sales." />
      )}
      <ul className="space-y-2">
        {rows.map(a => (
          <Card key={a.id} padding="md">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={a.outcome === 'positive' ? 'success' : a.outcome === 'concern' ? 'danger' : 'neutral'}>{a.activity_kind.replace('_', ' ')}</Badge>
              <span className="text-sm font-medium text-text-primary">{a.subject}</span>
              <span className="text-[10px] text-text-muted font-mono ml-auto">{new Date(a.occurred_at).toLocaleDateString()}</span>
            </div>
            {a.notes && <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap">{a.notes}</p>}
            {a.next_step && <p className="text-[11px] text-accent mt-1">Next: {a.next_step}</p>}
          </Card>
        ))}
      </ul>
    </div>
  )
}

// ── Account team ──────────────────────────────────────────────
const TEAM_ROLES = [
  { id: 'ae',          label: 'Account Executive' },
  { id: 'am',          label: 'Account Manager' },
  { id: 'csm',         label: 'Customer Success Manager' },
  { id: 'se',          label: 'Solutions Engineer' },
  { id: 'sponsor_exec',label: 'Sponsor Executive' },
]

function TeamTab({ account }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('csm')

  const { data: members = [] } = useQuery({
    queryKey: ['account-team', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('account_team_members').select('*, profile:user_id(full_name, email, role)').eq('account_id', account.id)
      return data || []
    },
  })

  const { data: candidates = [] } = useQuery({
    queryKey: ['team-candidates', account.property_id],
    enabled: adding,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email').eq('property_id', account.property_id)
      return data || []
    },
  })

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('account_team_members').insert({
        property_id: account.property_id, account_id: account.id, user_id: userId, role,
      })
      if (error && error.code !== '23505') throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-team', account.id] })
      setAdding(false); setUserId('')
      toast({ title: 'Added to team', type: 'success' })
    },
    onError: (e) => toast({ title: 'Could not add', description: humanError(e), type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('account_team_members').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account-team', account.id] }),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-muted">{members.length} on team</span>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Users className="w-3.5 h-3.5" /> Add member</Button>}
      </div>
      {adding && (
        <Card padding="md" className="space-y-2 border-accent/30">
          <div className="grid grid-cols-2 gap-2">
            <select value={userId} onChange={(e) => setUserId(e.target.value)}
                    className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
              <option value="">— pick teammate —</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
            </select>
            <select value={role} onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
              {TEAM_ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={!userId || add.isPending} onClick={() => add.mutate()}>
              {add.isPending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </Card>
      )}
      {members.length === 0 && !adding && (
        <EmptyState title="No team members yet" description="Real accounts have AE + AM + CSM. Add them here so notifications + escalations route correctly." />
      )}
      <ul className="space-y-2">
        {members.map(m => (
          <Card key={m.id} padding="md" className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-primary">{m.profile?.full_name || m.profile?.email}</div>
              <div className="text-[11px] text-text-muted">{TEAM_ROLES.find(r => r.id === m.role)?.label || m.role}</div>
            </div>
            <button onClick={() => { if (confirm('Remove from account team?')) remove.mutate(m.id) }} className="text-text-muted hover:text-danger text-[11px]">
              Remove
            </button>
          </Card>
        ))}
      </ul>
    </div>
  )
}

// ── Risks ─────────────────────────────────────────────────────
function RisksTab({ account }) {
  const { profile } = useAuth()
  const { data: deals = [] } = useQuery({
    queryKey: ['account-deals-min', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id').eq('account_id', account.id)
      return data || []
    },
  })

  // churn_risks (migration 051) is keyed by user_id, not account_id.
  // For sponsorship, we treat per-deal stake-holder churn as account
  // risk by joining contacts → deals → account.
  const { data: signals = [] } = useQuery({
    queryKey: ['account-signals', account.id, deals.map(d => d.id).join(',')],
    enabled: deals.length > 0,
    queryFn: async () => {
      const ids = deals.map(d => d.id)
      const { data } = await supabase
        .from('prospect_signals')
        .select('*')
        .in('deal_id', ids)
        .is('dismissed_at', null)
        .is('acted_on_at', null)
        .order('surfaced_at', { ascending: false })
      return data || []
    },
  })

  return (
    <div className="space-y-3">
      <Card padding="md">
        <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-warning" /> Active signals on this account
        </h3>
        {signals.length === 0 ? <EmptyState title="No active risks" description="Champion job-changes, hiring posts, and earnings mentions feed here." className="border-0 py-3" /> : (
          <ul className="space-y-2">
            {signals.map(s => (
              <li key={s.id} className="bg-bg-card border border-border rounded p-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={s.severity === 'high' ? 'danger' : 'warning'}>{s.severity}</Badge>
                  <Badge tone="info">{s.signal_type}</Badge>
                  <span className="text-sm text-text-primary">{s.title}</span>
                </div>
                {s.description && <p className="text-xs text-text-secondary mt-1">{s.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// ── Recap (proof of performance) ──────────────────────────────
function RecapTab({ account }) {
  const { data: deals = [] } = useQuery({
    queryKey: ['recap-deals', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, brand_name, value, stage').eq('account_id', account.id)
      return data || []
    },
  })

  const { data: metrics = [] } = useQuery({
    queryKey: ['recap-metrics', account.id, deals.map(d => d.id).join(',')],
    enabled: deals.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('deal_recap_metrics')
        .select('*')
        .in('deal_id', deals.map(d => d.id))
      return data || []
    },
  })

  const totals = metrics.reduce((acc, m) => ({
    benefits_total:     acc.benefits_total     + (m.benefits_total || 0),
    benefits_delivered: acc.benefits_delivered + (m.benefits_delivered || 0),
    portal_sessions:    acc.portal_sessions    + (m.portal_sessions || 0),
    touches:            acc.touches            + (m.touches_outbound || 0) + (m.touches_inbound || 0),
  }), { benefits_total: 0, benefits_delivered: 0, portal_sessions: 0, touches: 0 })

  function downloadCSV() {
    const rows = [
      ['Brand', 'Stage', 'Deal value', 'Benefits total', 'Benefits delivered', 'Portal sessions', 'Outbound touches', 'Inbound touches'],
      ...deals.map(d => {
        const m = metrics.find(x => x.deal_id === d.id) || {}
        return [d.brand_name, d.stage, d.value || '', m.benefits_total || 0, m.benefits_delivered || 0, m.portal_sessions || 0, m.touches_outbound || 0, m.touches_inbound || 0]
      })
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${account.name}-recap.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card padding="md"><div className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Benefits delivered</div><div className="text-2xl font-bold text-text-primary tabular-nums">{totals.benefits_delivered}/{totals.benefits_total}</div></Card>
        <Card padding="md"><div className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Fulfillment %</div><div className="text-2xl font-bold text-success tabular-nums">{totals.benefits_total ? Math.round(100 * totals.benefits_delivered / totals.benefits_total) : 0}%</div></Card>
        <Card padding="md"><div className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Portal sessions</div><div className="text-2xl font-bold text-text-primary tabular-nums">{totals.portal_sessions}</div></Card>
        <Card padding="md"><div className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Touches</div><div className="text-2xl font-bold text-text-primary tabular-nums">{totals.touches}</div></Card>
      </div>
      <Card padding="md" className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-text-primary flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Recap export</div>
          <div className="text-xs text-text-muted mt-0.5">CSV with per-deal benefit, portal, and touch counts. Use it as the proof-of-performance backbone for QBR decks.</div>
        </div>
        <Button onClick={downloadCSV} disabled={metrics.length === 0}>Download CSV</Button>
      </Card>
    </div>
  )
}

// ── References ────────────────────────────────────────────────
function ReferencesTab({ account }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ contact_id: '', willing_to_reference: true, willing_to_case_study: false, willing_to_speak: false, notes: '' })

  const { data: refs = [] } = useQuery({
    queryKey: ['references', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('references_tracker').select('*, contacts(first_name, last_name, email)').eq('account_id', account.id)
      return data || []
    },
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['account-contacts', account.id],
    enabled: adding,
    queryFn: async () => {
      const { data: deals } = await supabase.from('deals').select('id').eq('account_id', account.id)
      if (!deals || deals.length === 0) return []
      const { data } = await supabase.from('contacts').select('id, first_name, last_name, email').in('deal_id', deals.map(d => d.id))
      return data || []
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('references_tracker').insert({
        property_id: account.property_id, account_id: account.id, ...form,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['references', account.id] })
      setAdding(false)
      setForm({ contact_id: '', willing_to_reference: true, willing_to_case_study: false, willing_to_speak: false, notes: '' })
      toast({ title: 'Reference recorded', type: 'success' })
    },
    onError: (e) => toast({ title: 'Could not save', description: humanError(e), type: 'error' }),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-muted">{refs.length} reference{refs.length === 1 ? '' : 's'}</span>
        {!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><BookOpen className="w-3.5 h-3.5" /> + Reference</Button>}
      </div>
      {adding && (
        <Card padding="md" className="space-y-2 border-accent/30">
          <select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent">
            <option value="">— pick contact —</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}</option>)}
          </select>
          <div className="flex gap-3 flex-wrap text-xs text-text-secondary">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.willing_to_reference} onChange={(e) => setForm({ ...form, willing_to_reference: e.target.checked })} className="accent-accent" /> Reference call</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.willing_to_case_study} onChange={(e) => setForm({ ...form, willing_to_case_study: e.target.checked })} className="accent-accent" /> Case study</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.willing_to_speak} onChange={(e) => setForm({ ...form, willing_to_speak: e.target.checked })} className="accent-accent" /> Speak at events</label>
          </div>
          <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (e.g. NDA constraints, preferred timing)"
                 className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={!form.contact_id || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Card>
      )}
      {refs.length === 0 && !adding && (
        <EmptyState title="No references yet" description="Track who's willing to do reference calls, case studies, or speak at events." />
      )}
      <ul className="space-y-2">
        {refs.map(r => (
          <Card key={r.id} padding="md">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-text-primary">
                {[r.contacts?.first_name, r.contacts?.last_name].filter(Boolean).join(' ') || r.contacts?.email}
              </span>
              {r.willing_to_reference && <Badge tone="success">reference</Badge>}
              {r.willing_to_case_study && <Badge tone="accent">case study</Badge>}
              {r.willing_to_speak && <Badge tone="info">speaker</Badge>}
              {r.last_used_at && <span className="text-[10px] text-text-muted font-mono ml-auto">last used {new Date(r.last_used_at).toLocaleDateString()}</span>}
            </div>
            {r.notes && <p className="text-xs text-text-secondary mt-1">{r.notes}</p>}
          </Card>
        ))}
      </ul>
    </div>
  )
}
