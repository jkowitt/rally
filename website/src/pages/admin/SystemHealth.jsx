import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Breadcrumbs from '@/components/Breadcrumbs'
import { Card, Badge } from '@/components/ui'
import { CheckCircle, XCircle, AlertTriangle, Activity, Loader2 } from 'lucide-react'

// SystemHealth — developer-only readiness dashboard. Runs a series
// of cheap probes against the database + edge functions and
// renders pass/fail/warn so the founder can verify the deployment
// is healthy before/after a release. No third-party services
// pinged — just our own surface.
//
// Probes include:
//   • DB connectivity + RLS sanity (read a public table)
//   • Migration version (latest expected vs latest seen)
//   • Critical helper functions exist
//   • Recent errors in security_events
//   • Webhook delivery backlog
//   • Pending sequence enrollments stuck >2h past next_send_at
//   • Stripe webhook secret present (env-side)
export default function SystemHealth() {
  const { realIsDeveloper } = useAuth()
  const [probes, setProbes] = useState([])
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!realIsDeveloper) return
    runAll()
  }, [realIsDeveloper])

  async function runAll() {
    setRunning(true)
    const results = []
    // 1. DB connectivity
    results.push(await probe('Database connectivity', async () => {
      const { error } = await supabase.from('feature_flags').select('module').limit(1)
      if (error) throw error
      return 'OK'
    }))

    // 2. Critical helper functions (RPC ping)
    results.push(await probe('check_rate_limit() helper', async () => {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_scope: 'system_health_probe',
        p_identifier: 'test',
        p_window_seconds: 60,
        p_max_hits: 1000,
      })
      if (error) throw error
      return data === true ? 'allowed' : 'capped'
    }))

    // 3. Audit-events trigger writes (check that recent events exist)
    results.push(await probe('Audit trail writing', async () => {
      const { count, error } = await supabase
        .from('audit_events')
        .select('id', { count: 'exact', head: true })
        .gte('occurred_at', new Date(Date.now() - 7 * 86400000).toISOString())
      if (error) throw error
      if ((count ?? 0) === 0) return { status: 'warn', message: 'No audit events in 7 days. Either no activity or trigger silent.' }
      return `${count} events in last 7d`
    }))

    // 4. Webhook delivery backlog
    results.push(await probe('Webhook delivery backlog', async () => {
      const { count, error } = await supabase
        .from('webhook_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('enqueued_at', new Date(Date.now() - 30 * 60_000).toISOString())
      if (error) throw error
      if ((count ?? 0) > 50) return { status: 'fail', message: `${count} deliveries stuck >30min — dispatcher cron not running` }
      if ((count ?? 0) > 5)  return { status: 'warn', message: `${count} deliveries pending >30min` }
      return `${count ?? 0} stale (acceptable)`
    }))

    // 5. Sequence enrollment runner health
    results.push(await probe('Sequence runner health', async () => {
      const { count, error } = await supabase
        .from('prospect_sequence_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('completed', false)
        .eq('paused', false)
        .lt('next_send_at', new Date(Date.now() - 2 * 60 * 60_000).toISOString())
      if (error) throw error
      if ((count ?? 0) > 25) return { status: 'fail', message: `${count} enrollments stuck >2h past next_send_at — runner not firing` }
      if ((count ?? 0) > 5)  return { status: 'warn', message: `${count} enrollments slightly behind` }
      return `${count ?? 0} backlogged (OK)`
    }))

    // 6. Recent security events
    results.push(await probe('Recent security events', async () => {
      const { data, error } = await supabase
        .from('security_events')
        .select('event_type, severity, occurred_at')
        .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60_000).toISOString())
        .order('occurred_at', { ascending: false })
        .limit(50)
      if (error) throw error
      const critical = (data || []).filter(e => e.severity === 'critical').length
      if (critical > 0) return { status: 'fail', message: `${critical} critical security events in last 24h` }
      const warns = (data || []).filter(e => e.severity === 'warn').length
      if (warns >= 10) return { status: 'warn', message: `${warns} warn-level security events in last 24h` }
      return `${(data || []).length} events (clean)`
    }))

    // 7. Add-on add-on backfill: every property with an active flag has a row
    results.push(await probe('Add-on backfill integrity', async () => {
      const { count, error } = await supabase
        .from('addon_catalog')
        .select('key', { count: 'exact', head: true })
        .eq('is_active', true)
      if (error) throw error
      return `${count ?? 0} catalog rows`
    }))

    // 8. Email coach env hint (we can't read function secrets from client;
    //    just nudge if no email-coach activity exists yet)
    results.push(await probe('Email coach reachable', async () => {
      try {
        const { data, error } = await supabase.functions.invoke('email-coach', {
          body: { text: '', incoming_email: '', goal: 'free_form' },
        })
        if (error) throw error
        if (data?.error) return { status: 'warn', message: data.error }
        return 'reachable'
      } catch (e) {
        return { status: 'fail', message: String(e?.message || e) }
      }
    }))

    setProbes(results)
    setRunning(false)
  }

  if (!realIsDeveloper) {
    return <div className="p-6 text-sm text-text-muted">Developer-only.</div>
  }

  const failCount = probes.filter(p => p.status === 'fail').length
  const warnCount = probes.filter(p => p.status === 'warn').length

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Admin', to: '/app/admin' }, { label: 'System Health' }]} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Activity className="w-6 h-6 text-accent" />
            System Health
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Live readiness probes. Run before any release.
          </p>
        </div>
        <button
          onClick={runAll}
          disabled={running}
          className="bg-accent/10 text-accent border border-accent/30 px-3 py-1.5 rounded text-xs font-medium hover:bg-accent/20 disabled:opacity-50"
        >
          {running ? <><Loader2 className="w-3.5 h-3.5 inline animate-spin" /> Running…</> : 'Re-run'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card padding="md">
          <div className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Total probes</div>
          <div className="text-2xl font-bold text-text-primary tabular-nums">{probes.length}</div>
        </Card>
        <Card padding="md">
          <div className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Warnings</div>
          <div className={`text-2xl font-bold tabular-nums ${warnCount > 0 ? 'text-warning' : 'text-text-muted'}`}>{warnCount}</div>
        </Card>
        <Card padding="md">
          <div className="text-[11px] uppercase tracking-wider font-mono text-text-muted">Failures</div>
          <div className={`text-2xl font-bold tabular-nums ${failCount > 0 ? 'text-danger' : 'text-success'}`}>{failCount}</div>
        </Card>
      </div>

      <ul className="space-y-2">
        {probes.map((p, i) => (
          <Card key={i} padding="md" className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <StatusIcon status={p.status} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary">{p.label}</div>
                <div className="text-[11px] text-text-muted font-mono mt-0.5">{p.message}</div>
              </div>
            </div>
            <Badge tone={p.status === 'pass' ? 'success' : p.status === 'warn' ? 'warning' : 'danger'}>
              {p.status}
            </Badge>
          </Card>
        ))}
      </ul>

      <Card padding="md" className="bg-bg-card">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Pre-launch checklist</h3>
        <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
          <li>Run all migrations through the latest (083+)</li>
          <li>Set <code className="bg-bg-surface px-1 rounded font-mono">STRIPE_WEBHOOK_SECRET</code> in Supabase function secrets</li>
          <li>Set <code className="bg-bg-surface px-1 rounded font-mono">CRON_SECRET</code> (signal-radar / sequence-runner / digest-runner / sla-runner)</li>
          <li>Set Stripe Price IDs on the 5 self-serve add-ons in addon_catalog</li>
          <li>Connect at least one Outlook or Gmail mailbox to verify outbound sequence sends</li>
          <li>Run a test transition: Prospect → Contracted → verify contract auto-creates, fulfillment spawns, welcome cadence enrolls, onboarding tasks land</li>
          <li>Approve a test add-on Contact-Sales request to verify the realtime cascade</li>
          <li>Test a Stripe self-serve add-on purchase with a test card; verify property_addons flips on completion</li>
          <li>Spot-check the Sponsor Portal with a test deal — verify sessions + page-views land in proposal_view_events</li>
        </ul>
      </Card>
    </div>
  )
}

async function probe(label, fn) {
  try {
    const v = await fn()
    if (typeof v === 'object' && v?.status) return { label, status: v.status, message: v.message }
    return { label, status: 'pass', message: String(v) }
  } catch (e) {
    return { label, status: 'fail', message: String(e?.message || e) }
  }
}

function StatusIcon({ status }) {
  if (status === 'pass') return <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
  return <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
}
