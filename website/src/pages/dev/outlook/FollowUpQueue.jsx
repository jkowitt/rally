import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as outreach from '@/services/dev/outreachService'
import { getFollowUpProgress } from '@/services/dev/outreachAnalyticsService'
import OutreachComposer from '@/components/dev/OutreachComposer'

/**
 * /dev/outlook/follow-ups
 * Queue of prospects with follow-ups due today or overdue.
 */
export default function FollowUpQueue() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ completed: 0, target: 10 })
  const [composerFor, setComposerFor] = useState(null)

  useEffect(() => { reload() }, [])

  async function reload() {
    setLoading(true)
    const [q, p] = await Promise.all([
      outreach.getFollowUpQueue(),
      getFollowUpProgress(),
    ])
    setQueue(q)
    setProgress(p)
    setLoading(false)
  }

  async function markNotInterested(id) {
    await outreach.updateStatus(id, 'not_interested')
    reload()
  }

  async function reschedule(id, days = 7) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    await outreach.updateProspect(id, { follow_up_due: d.toISOString().slice(0, 10) })
    reload()
  }

  function daysSince(ts) {
    if (!ts) return '—'
    const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)
    return `${days}d`
  }

  const pct = Math.min(100, (progress.completed / progress.target) * 100)

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <header>
          <Link to="/dev" className="text-[10px] text-text-muted hover:text-accent">← /dev</Link>
          <h1 className="text-xl font-semibold mt-1">Follow-up Queue</h1>
          <p className="text-[11px] text-text-muted">Prospects with follow-ups due today or overdue</p>
        </header>

        {/* Progress bar */}
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-text-secondary">Today's target</div>
            <div className="text-xs text-text-primary font-mono">{progress.completed} / {progress.target}</div>
          </div>
          <div className="w-full bg-bg-surface h-2 rounded-full overflow-hidden">
            <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {loading && <div className="text-xs text-text-muted">Loading…</div>}
        {!loading && queue.length === 0 && (
          <div className="text-center text-xs text-text-muted py-12">🎉 No follow-ups due. All caught up.</div>
        )}
        {queue.map(p => (
          <div key={p.id} className="bg-bg-card border border-border rounded-lg p-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm font-semibold text-text-primary">{p.first_name} {p.last_name}</div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-surface text-text-muted">{outreach.OUTREACH_LABELS[p.outreach_status]}</span>
              </div>
              <div className="text-[11px] text-text-muted">{p.email} · {p.organization}</div>
              {p.last_email_subject && (
                <div className="text-[10px] text-text-secondary mt-1 italic truncate">"{p.last_email_subject}"</div>
              )}
              <div className="text-[10px] text-text-muted mt-1">
                Last contact {daysSince(p.last_contacted_at)} ago · Due: {p.follow_up_due}
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => setComposerFor(p)} className="text-[10px] bg-accent text-bg-primary px-2 py-1 rounded font-semibold">
                Send follow-up
              </button>
              <button onClick={() => reschedule(p.id, 7)} className="text-[10px] border border-border text-text-secondary px-2 py-1 rounded">
                +7 days
              </button>
              <button onClick={() => markNotInterested(p.id)} className="text-[10px] border border-danger/30 text-danger px-2 py-1 rounded">
                Not interested
              </button>
            </div>
          </div>
        ))}
      </div>
      {composerFor && <OutreachComposer prospect={composerFor} onClose={() => { setComposerFor(null); reload() }} />}
    </div>
  )
}
