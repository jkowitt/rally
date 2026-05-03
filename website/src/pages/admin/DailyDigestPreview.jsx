import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { buildDailyDigest } from '@/services/digestService'

export default function DailyDigestPreview() {
  const { profile, realIsDeveloper } = useAuth()
  const [digest, setDigest] = useState(null)
  const [loading, setLoading] = useState(true)

  const canAccess = realIsDeveloper || profile?.role === 'businessops' || profile?.role === 'admin'
  if (profile && !canAccess) return <Navigate to="/app" replace />

  useEffect(() => {
    buildDailyDigest().then(d => { setDigest(d); setLoading(false) })
  }, [])

  if (loading) return <div className="p-6 text-center text-text-muted">Building digest...</div>
  if (!digest) return null

  return (
    <div className="space-y-6 min-w-0 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Today's Daily Digest Preview</h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">Date: {digest.date} · Sends at 7am CT daily regardless of master toggle.</p>
      </div>

      {/* Revenue */}
      <Section title="Revenue Snapshot">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Current MRR" value={`$${digest.revenue.mrr.toLocaleString()}`} color="text-accent" />
          <Stat label="Paying Customers" value={digest.revenue.paidCount} color="text-success" />
          <Stat label="Free Trials" value={digest.revenue.freeCount} />
        </div>
      </Section>

      {/* Overnight Activity */}
      <Section title="Overnight Activity">
        <SubSection label={`New signups (${digest.newSignups.length})`}>
          {digest.newSignups.length === 0 && <EmptyText>None</EmptyText>}
          {digest.newSignups.map((u, i) => (
            <Line key={i} primary={u.full_name || u.email} secondary={`${u.properties?.name || 'No property'} · ${u.properties?.plan || 'free'}`} />
          ))}
        </SubSection>
        <SubSection label={`New paid signups (${digest.newPaidSignups.length})`}>
          {digest.newPaidSignups.length === 0 && <EmptyText>None</EmptyText>}
          {digest.newPaidSignups.map((u, i) => (
            <Line key={i} primary={u.full_name || u.email} secondary={u.properties?.plan} />
          ))}
        </SubSection>
      </Section>

      {/* Hot Leads */}
      <Section title={`Hot Leads (${digest.hotLeads.length})`}>
        {digest.hotLeads.length === 0 && <EmptyText>None today</EmptyText>}
        {digest.hotLeads.map(h => (
          <Line key={h.id} primary={h.profiles?.full_name || h.profiles?.email} secondary={`Score: ${h.score}`} />
        ))}
      </Section>

      {/* Churn Risks */}
      <Section title={`Churn Risks (${digest.churnRisks.length})`}>
        {digest.churnRisks.length === 0 && <EmptyText>None</EmptyText>}
        {digest.churnRisks.map(c => (
          <Line key={c.id} primary={c.profiles?.full_name || c.profiles?.email} secondary={`${c.risk_level}: ${c.reason}`} />
        ))}
      </Section>

      {/* Upgrade Opportunities */}
      <Section title={`Upgrade Opportunities (${digest.upgradeOpportunities.length})`}>
        {digest.upgradeOpportunities.length === 0 && <EmptyText>None flagged today</EmptyText>}
        {digest.upgradeOpportunities.map(o => (
          <Line key={o.id} primary={o.profiles?.full_name || o.profiles?.email} secondary={o.reason} />
        ))}
      </Section>

      {/* Automation Health */}
      <Section title="Automation Health">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Emails Sent" value={digest.automation.emailsSent} />
          <Stat label="Failed" value={digest.automation.failedAutomations} color={digest.automation.failedAutomations > 0 ? 'text-danger' : 'text-text-primary'} />
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-mono text-text-muted uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

function SubSection({ label, children }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-text-muted uppercase">{label}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function Line({ primary, secondary }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-text-primary truncate flex-1 min-w-0">{primary}</span>
      <span className="text-[10px] text-text-muted shrink-0">{secondary}</span>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center bg-bg-card rounded p-2">
      <div className={`text-lg font-bold ${color || 'text-text-primary'}`}>{value}</div>
      <div className="text-[9px] text-text-muted">{label}</div>
    </div>
  )
}

function EmptyText({ children }) {
  return <div className="text-[10px] text-text-muted italic">{children}</div>
}
