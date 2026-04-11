import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { runFullAutoQA } from '@/lib/autoQA'

export default function QAAutoReports() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [expandedReport, setExpandedReport] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const { data: reports } = useQuery({
    queryKey: ['qa-auto-reports', showArchived],
    queryFn: async () => {
      let q = supabase.from('qa_auto_reports').select('*').order('run_date', { ascending: false }).limit(50)
      if (!showArchived) q = q.eq('archived', false)
      const { data } = await q
      return data || []
    },
  })

  async function runNow() {
    setRunning(true)
    setProgress('Running full platform QA...')
    try {
      const reportId = await runFullAutoQA('manual')
      queryClient.invalidateQueries({ queryKey: ['qa-auto-reports'] })
      setExpandedReport(reportId)
      toast({ title: 'Auto QA complete', type: 'success' })
    } catch (err) {
      toast({ title: 'QA failed', description: err.message, type: 'error' })
    }
    setRunning(false)
    setProgress('')
  }

  async function archiveReport(id) {
    await supabase.from('qa_auto_reports').update({ archived: true }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['qa-auto-reports'] })
    toast({ title: 'Report archived', type: 'success' })
  }

  function copyInstructions(text, id) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast({ title: 'Copied to clipboard — paste into Claude Code', type: 'success' })
  }

  const scoreColor = (score) => {
    if (score >= 90) return 'text-success'
    if (score >= 70) return 'text-warning'
    return 'text-danger'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-medium text-text-primary">Automated QA Reports</h4>
            <p className="text-[10px] text-text-muted mt-0.5">Runs Mon/Wed/Fri at 1am ET. Auto-fixes issues and generates Claude Code improvement instructions.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowArchived(!showArchived)} className="text-[10px] text-text-muted hover:text-text-primary border border-border rounded px-2 py-1.5">
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <button onClick={runNow} disabled={running} className="bg-accent text-bg-primary px-4 py-1.5 rounded text-xs font-medium disabled:opacity-50 flex-1 sm:flex-none">
            {running ? progress : 'Run QA Now'}
          </button>
        </div>
      </div>

      {/* Schedule info */}
      <div className="bg-bg-card rounded-lg p-3 space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-4 sm:flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
          <span className="text-[10px] text-text-muted font-mono">Mon / Wed / Fri @ 1:00 AM ET</span>
        </div>
        <div className="text-[10px] text-text-muted">Next: {getNextRunDate()}</div>
        <div className="text-[10px] text-text-muted">Reports: {(reports || []).length}</div>
      </div>

      {/* Reports list */}
      {(reports || []).map(report => {
        const isExpanded = expandedReport === report.id
        const analysis = report.claude_analysis || {}
        const fixes = report.auto_fixes || []
        const scores = report.module_scores || {}
        const stats = report.platform_stats || {}

        return (
          <div key={report.id} className={`bg-bg-surface border rounded-lg overflow-hidden ${report.archived ? 'border-border/50 opacity-70' : 'border-border'}`}>
            {/* Report header — mobile stacked */}
            <div className="px-3 py-3 sm:px-4 cursor-pointer hover:bg-bg-card/50 active:bg-bg-card/50" onClick={() => setExpandedReport(isExpanded ? null : report.id)}>
              <div className="flex items-center gap-2">
                <div className={`text-lg font-bold shrink-0 ${scoreColor(report.health_score || 0)}`}>
                  {report.health_score || '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm text-text-primary font-medium">
                      {new Date(report.run_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[8px] font-mono text-text-muted bg-bg-card px-1 py-0.5 rounded">{report.schedule}</span>
                    <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${report.status === 'completed' ? 'bg-success/10 text-success' : report.status === 'running' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>{report.status}</span>
                  </div>
                  <p className="text-[10px] text-text-muted truncate mt-0.5">{analysis.summary || 'No analysis'}</p>
                </div>
                <span className="text-text-muted shrink-0 text-sm">{isExpanded ? '−' : '+'}</span>
              </div>
            </div>

            {/* Expanded report — fully mobile responsive */}
            {isExpanded && (
              <div className="border-t border-border">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 p-3 sm:p-4 sm:grid-cols-4 bg-bg-card">
                  <StatBox label="Health" value={`${report.health_score || 0}/100`} color={scoreColor(report.health_score || 0)} />
                  <StatBox label="Checks" value={`${report.passed_checks}/${report.total_checks}`} color={report.failed_checks === 0 ? 'text-success' : 'text-warning'} />
                  <StatBox label="Auto-Fixes" value={report.auto_fixes_applied || 0} color="text-accent" />
                  <StatBox label="Time" value={report.completed_at ? `${Math.round((new Date(report.completed_at) - new Date(report.run_date)) / 1000)}s` : '—'} />
                </div>

                {/* Module scores */}
                {Object.keys(scores).length > 0 && (
                  <div className="p-3 sm:p-4 border-b border-border">
                    <h5 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Module Health</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                      {Object.entries(scores).map(([mod, score]) => (
                        <div key={mod} className="flex items-center justify-between bg-bg-card rounded px-2 py-1.5">
                          <span className="text-[9px] text-text-secondary capitalize truncate">{mod}</span>
                          <span className={`text-[10px] font-bold ml-1 ${scoreColor(score)}`}>{score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-fixes */}
                {fixes.length > 0 && (
                  <div className="p-3 sm:p-4 border-b border-border">
                    <h5 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Auto-Fixes Applied</h5>
                    <div className="space-y-1">
                      {fixes.map((fix, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px]">
                          <span className="text-success shrink-0">+</span>
                          <span className="text-text-primary break-words"><span className="text-text-secondary font-mono">{fix.table}:</span> {fix.action} <span className="text-accent font-mono">({fix.count})</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Platform stats */}
                {Object.keys(stats).length > 0 && (
                  <div className="p-3 sm:p-4 border-b border-border">
                    <h5 className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Platform Snapshot</h5>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                      {Object.entries(stats).map(([table, count]) => (
                        <div key={table} className="text-center bg-bg-card rounded p-1.5">
                          <div className="text-[10px] font-bold text-text-primary">{(count || 0).toLocaleString()}</div>
                          <div className="text-[7px] text-text-muted truncate">{table.replace(/_/g, ' ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Claude Code Instructions */}
                {report.claude_code_instructions && (
                  <div className="p-3 sm:p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h5 className="text-[10px] text-text-muted uppercase tracking-wider">Claude Code Instructions</h5>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyInstructions(report.claude_code_instructions, report.id) }}
                        className={`text-[10px] px-2 py-1 rounded font-medium transition-colors shrink-0 ${copiedId === report.id ? 'bg-success text-bg-primary' : 'bg-accent text-bg-primary hover:opacity-90'}`}
                      >
                        {copiedId === report.id ? 'Copied!' : 'Copy All'}
                      </button>
                    </div>
                    <pre className="bg-[#0a0e14] rounded-lg p-3 sm:p-4 text-[9px] sm:text-[11px] text-text-primary font-mono whitespace-pre-wrap overflow-x-auto max-h-[300px] sm:max-h-[400px] overflow-y-auto leading-relaxed border border-accent/20">
                      {report.claude_code_instructions}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div className="p-3 bg-bg-card flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[9px] text-text-muted">
                    {report.completed_at ? `Completed ${new Date(report.completed_at).toLocaleDateString()}` : 'Running...'}
                  </div>
                  <div className="flex gap-2">
                    {report.claude_code_instructions && (
                      <button onClick={(e) => { e.stopPropagation(); copyInstructions(report.claude_code_instructions, report.id) }} className="text-[10px] text-accent hover:underline">Copy</button>
                    )}
                    {!report.archived && (
                      <button onClick={(e) => { e.stopPropagation(); archiveReport(report.id) }} className="text-[10px] text-text-muted hover:text-text-primary">Archive</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {(!reports || reports.length === 0) && (
        <div className="text-center py-8 text-text-muted text-sm">
          No QA reports yet. Click "Run QA Now" to generate your first report.
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-lg sm:text-xl font-bold ${color || 'text-text-primary'}`}>{value}</div>
      <div className="text-[8px] sm:text-[9px] text-text-muted">{label}</div>
    </div>
  )
}

function getNextRunDate() {
  const now = new Date()
  const days = [1, 3, 5]
  for (let i = 1; i <= 7; i++) {
    const next = new Date(now)
    next.setDate(now.getDate() + i)
    if (days.includes(next.getDay())) {
      return next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }
  }
  return 'Monday'
}
