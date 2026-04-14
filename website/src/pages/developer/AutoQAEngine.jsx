import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { runFullPass, ALL_PROBES } from '@/lib/autoQAEngine'
import { detectPatterns } from '@/lib/qaPatternDetector'
import * as promptService from '@/services/qaRepairPromptService'

/**
 * /app/developer/auto-qa — the AutoQA control panel.
 *
 * Walks the entire site via probes (DB reads, DB writes, route
 * renders, edge function pings, uploads, integration flows) and
 * runs everything N times (default 10) to surface both consistent
 * failures and flaky tests. Then detects patterns in the results
 * and generates Claude Code repair prompts that can be archived.
 */
export default function AutoQAEngine() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [running, setRunning] = useState(false)
  const [runs, setRuns] = useState(10)
  const [progress, setProgress] = useState(null)
  const [results, setResults] = useState(null)
  const [patterns, setPatterns] = useState([])
  const [savingArchive, setSavingArchive] = useState(false)

  if (profile && profile.role !== 'developer') return <Navigate to="/app" replace />

  async function handleRun() {
    setRunning(true)
    setResults(null)
    setPatterns([])
    setProgress({ done: 0, total: runs * ALL_PROBES.length, label: 'Starting…' })

    const ctx = { userId: profile?.id, propertyId: profile?.property_id }

    try {
      const aggregate = await runFullPass({
        runs,
        ctx,
        onProgress: (p) => setProgress({
          done: p.done,
          total: p.total,
          label: `Run ${p.run}/${p.totalRuns} · ${p.probe}`,
        }),
      })
      setResults(aggregate)

      // Detect patterns
      const detected = detectPatterns(aggregate)
      setPatterns(detected)

      if (detected.length === 0) {
        toast({
          title: 'QA pass complete',
          description: `${aggregate.summary.totalPasses} passes · ${aggregate.summary.totalFails} fails · no patterns detected`,
          type: 'success',
        })
      } else {
        toast({
          title: `${detected.length} pattern${detected.length !== 1 ? 's' : ''} detected`,
          description: 'Review the prompts below and archive them if they look useful',
          type: detected.some(p => p.severity === 'critical') ? 'error' : 'warning',
        })
      }
    } catch (err) {
      toast({ title: 'QA run failed', description: err.message, type: 'error' })
    } finally {
      setRunning(false)
    }
  }

  async function saveAllToArchive() {
    if (patterns.length === 0) return
    setSavingArchive(true)
    const r = await promptService.bulkSavePatterns(patterns, profile.id)
    setSavingArchive(false)
    if (r.success) {
      toast({
        title: `${r.saved} prompts archived`,
        description: 'Find them in the Repair Prompts tab',
        type: 'success',
      })
    } else {
      toast({ title: 'Archive failed', description: r.error, type: 'error' })
    }
  }

  async function copyPrompt(text) {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: 'Prompt copied', description: 'Paste into Claude Code', type: 'success' })
    } catch {
      toast({ title: 'Copy failed', type: 'error' })
    }
  }

  const pctDone = progress ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/app/developer" className="text-[10px] text-text-muted hover:text-accent">← Dev Tools</Link>
          <h1 className="text-xl sm:text-2xl font-semibold mt-1">Auto QA Engine</h1>
          <p className="text-[11px] text-text-muted">
            Probes every module, repeated {runs} times. Detects patterns. Generates Claude Code repair prompts.
          </p>
        </div>
        <Link
          to="/app/developer/repair-prompts"
          className="text-xs px-3 py-1.5 border border-border rounded hover:border-accent/50 whitespace-nowrap"
        >
          View archive →
        </Link>
      </header>

      {/* Coverage summary */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Coverage</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <CoverageTile label="Probes per run" value={ALL_PROBES.length} />
          <CoverageTile label="Total checks" value={runs * ALL_PROBES.length} />
          <CoverageTile label="Runs" value={runs} />
          <CoverageTile label="Categories" value="6" />
        </div>
        <div className="text-[10px] text-text-muted mt-3">
          Covers: DB reads (27 tables), DB writes (2 sentinels),
          route metadata (26 routes), edge function pings (2),
          storage uploads (1), integration flows (2). Runs each
          probe {runs} times to catch flaky failures.
        </div>
      </div>

      {/* Runs selector + run button */}
      <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-text-secondary">Runs per probe:</label>
          <div className="flex gap-1">
            {[1, 3, 5, 10, 20].map(n => (
              <button
                key={n}
                onClick={() => setRuns(n)}
                disabled={running}
                className={`px-3 py-1 text-xs rounded ${runs === n ? 'bg-accent text-bg-primary' : 'border border-border text-text-muted'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          className="w-full bg-accent text-bg-primary py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
        >
          {running ? `Running… ${pctDone}%` : `Run full QA pass (${runs * ALL_PROBES.length} checks)`}
        </button>

        {running && progress && (
          <div className="space-y-1">
            <div className="w-full bg-bg-surface h-2 rounded overflow-hidden">
              <div className="bg-accent h-2 rounded transition-all" style={{ width: `${pctDone}%` }} />
            </div>
            <div className="text-[10px] text-text-muted font-mono">
              {progress.done} / {progress.total} · {progress.label}
            </div>
          </div>
        )}
      </div>

      {/* Results summary */}
      {results && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Tile label="Health" value={`${results.summary.healthPct}%`} color={results.summary.healthPct >= 90 ? 'success' : results.summary.healthPct >= 70 ? 'warning' : 'danger'} />
            <Tile label="Always passed" value={results.summary.alwaysPassed} color="success" />
            <Tile label="Always failed" value={results.summary.alwaysFailed} color="danger" />
            <Tile label="Flaky" value={results.summary.flaky} color="warning" />
            <Tile label="Patterns" value={patterns.length} color={patterns.length > 0 ? 'accent' : 'muted'} />
          </div>

          {/* Per-probe breakdown */}
          <details className="bg-bg-card border border-border rounded-lg">
            <summary className="p-3 cursor-pointer text-xs font-medium">
              Per-probe results ({results.totalProbes} probes · {results.totalChecks} total checks)
            </summary>
            <div className="p-3 pt-0 max-h-96 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="text-text-muted text-[9px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-1">Probe</th>
                    <th className="text-left p-1">Category</th>
                    <th className="text-right p-1">Pass</th>
                    <th className="text-right p-1">Fail</th>
                    <th className="text-left p-1">Error sample</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(results.results)
                    .sort((a, b) => b.fails - a.fails)
                    .map(r => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="p-1 font-mono">{r.label}</td>
                        <td className="p-1 text-text-muted">{r.category}</td>
                        <td className="p-1 text-right text-success">{r.passes}</td>
                        <td className={`p-1 text-right ${r.fails > 0 ? 'text-danger' : 'text-text-muted'}`}>{r.fails}</td>
                        <td className="p-1 text-text-muted text-[10px] truncate max-w-xs">
                          {r.errors[0]?.message || ''}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      {/* Detected patterns + generated prompts */}
      {patterns.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-accent">
                {patterns.length} repair prompt{patterns.length !== 1 ? 's' : ''} generated
              </div>
              <h2 className="text-lg font-semibold mt-1">Mass update prompts</h2>
            </div>
            <button
              onClick={saveAllToArchive}
              disabled={savingArchive}
              className="text-xs bg-accent text-bg-primary px-3 py-1.5 rounded font-semibold disabled:opacity-50"
            >
              {savingArchive ? 'Saving…' : `Archive all ${patterns.length}`}
            </button>
          </div>

          {patterns.map((p, i) => (
            <PromptCard key={i} pattern={p} onCopy={() => copyPrompt(p.prompt_text)} />
          ))}
        </section>
      )}
    </div>
  )
}

function CoverageTile({ label, value }) {
  return (
    <div className="bg-bg-surface rounded p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className="text-xl font-semibold text-accent mt-0.5">{value}</div>
    </div>
  )
}

function Tile({ label, value, color = 'accent' }) {
  const cls = color === 'success' ? 'text-success'
    : color === 'danger' ? 'text-danger'
    : color === 'warning' ? 'text-warning'
    : color === 'muted' ? 'text-text-muted'
    : 'text-accent'
  return (
    <div className="bg-bg-card border border-border rounded p-3">
      <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}

function PromptCard({ pattern, onCopy }) {
  const [expanded, setExpanded] = useState(false)
  const severityColor = pattern.severity === 'critical' ? 'danger'
    : pattern.severity === 'high' ? 'warning'
    : 'accent'
  const severityCls = `bg-${severityColor}/15 text-${severityColor} border-${severityColor}/30`

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${severityCls}`}>
                {pattern.severity}
              </span>
              <span className="text-[9px] font-mono text-text-muted">{pattern.pattern_detected}</span>
            </div>
            <h3 className="text-sm font-semibold">{pattern.title}</h3>
            <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{pattern.summary}</p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={onCopy}
              className="text-[10px] bg-accent text-bg-primary px-3 py-1 rounded font-semibold"
            >
              Copy prompt
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] border border-border px-3 py-1 rounded text-text-secondary"
            >
              {expanded ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {expanded && (
          <pre className="mt-3 bg-bg-surface border border-border rounded p-3 text-[10px] text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono">
            {pattern.prompt_text}
          </pre>
        )}
      </div>
    </div>
  )
}
