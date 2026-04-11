import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as analytics from '@/services/dev/outreachAnalyticsService'

/**
 * /dev/outlook/analytics — personal outreach funnel + volume metrics.
 */
export default function OutlookAnalytics() {
  const [volume, setVolume] = useState(null)
  const [funnel, setFunnel] = useState(null)
  const [templates, setTemplates] = useState([])
  const [timing, setTiming] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [v, f, t, ti] = await Promise.all([
      analytics.getVolumeMetrics(),
      analytics.getFunnelMetrics(),
      analytics.getTemplatePerformance(),
      analytics.getTimingMetrics(),
    ])
    setVolume(v); setFunnel(f); setTemplates(t); setTiming(ti)
    setLoading(false)
  }

  if (loading) return <div className="min-h-screen bg-bg-primary p-6"><div className="text-xs text-text-muted">Loading…</div></div>

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <Link to="/dev" className="text-[10px] text-text-muted hover:text-accent">← /dev</Link>
          <h1 className="text-xl font-semibold mt-1">Outreach Analytics</h1>
          <p className="text-[11px] text-text-muted">Personal BD funnel and conversion metrics</p>
        </header>

        {/* Volume */}
        <Section title="Outreach Volume">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Emails this week" value={volume.emailsThisWeek} />
            <Stat label="Emails this month" value={volume.emailsThisMonth} />
            <Stat label="New prospects (7d)" value={volume.prospectsThisWeek} />
            <Stat label="New prospects (30d)" value={volume.prospectsThisMonth} />
          </div>
        </Section>

        {/* Funnel */}
        <Section title="Conversion Funnel">
          <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
            <FunnelBar label="All prospects" value={funnel.total} max={funnel.total} />
            <FunnelBar label={`Contacted (${funnel.responseRate}% respond)`} value={funnel.contacted} max={funnel.total} />
            <FunnelBar label={`Responded (${funnel.demoRate}% → demo)`} value={funnel.responded} max={funnel.total} />
            <FunnelBar label={`Demos scheduled (${funnel.trialRate}% → trial)`} value={funnel.demos} max={funnel.total} />
            <FunnelBar label={`Trials started (${funnel.conversionRate}% → paid)`} value={funnel.trials} max={funnel.total} />
            <FunnelBar label="Converted" value={funnel.converted} max={funnel.total} />
          </div>
          <div className="text-center text-xs text-text-muted mt-3">
            Overall prospect → paid conversion: <span className="text-accent font-semibold">{funnel.overallRate}%</span>
          </div>
        </Section>

        {/* Timing */}
        <Section title="Timing">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Stat label="Avg days: first contact → signup" value={timing.avgDaysFirstContactToSignup ?? '—'} />
            <Stat label="Avg days: signup → paid" value={timing.avgDaysSignupToPaid ?? '—'} />
          </div>
        </Section>

        {/* Template performance */}
        <Section title="Template Performance">
          <div className="bg-bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-bg-surface text-text-muted text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left p-2">Template</th>
                  <th className="text-left p-2">Stage</th>
                  <th className="text-right p-2">Sent</th>
                  <th className="text-right p-2">Response %</th>
                  <th className="text-right p-2">Demo %</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="p-2 text-text-primary">{t.name}</td>
                    <td className="p-2 text-text-muted text-[10px]">{t.stage}</td>
                    <td className="p-2 text-right">{t.sent}</td>
                    <td className="p-2 text-right">{t.responseRate}%</td>
                    <td className="p-2 text-right">{t.demoRate}%</td>
                  </tr>
                ))}
                {templates.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-text-muted">No template usage yet</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">{title}</div>
      {children}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className="text-xl font-semibold text-accent mt-1">{value}</div>
    </div>
  )
}

function FunnelBar({ label, value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-mono">{value}</span>
      </div>
      <div className="w-full bg-bg-surface h-2 rounded-full overflow-hidden">
        <div className="bg-accent h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
