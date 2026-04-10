import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const MODULES = [
  'all', 'pipeline', 'contracts', 'assets', 'fulfillment', 'dashboard',
  'team', 'settings', 'auth', 'sportify', 'valora', 'businessnow',
  'newsletter', 'ai', 'global', 'businessops', 'security', 'performance',
  'marketing', 'simulator',
]

const FILTER_TABS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'stale', label: 'Stale (need retest)' },
]

const PRIORITY_COLORS = {
  critical: 'text-danger',
  high: 'text-warning',
  medium: 'text-text-secondary',
  low: 'text-text-muted',
}

export default function QATaskManager() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [moduleFilter, setModuleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [notesDraft, setNotesDraft] = useState({})
  const [noteForm, setNoteForm] = useState(null)

  const { data: tasks } = useQuery({
    queryKey: ['qa-task-summary'],
    queryFn: async () => {
      // Fetch test cases, attempts, and completions in parallel — aggregate client-side
      const [casesRes, attemptsRes, completionsRes] = await Promise.all([
        supabase.from('qa_test_cases').select('*').order('module').order('priority'),
        supabase.from('qa_test_attempts').select('test_case_id, attempt_type, result, attempted_at'),
        supabase.from('qa_test_completions').select('*'),
      ])
      const cases = casesRes.data || []
      const attempts = attemptsRes.data || []
      const completions = completionsRes.data || []

      // Build lookup maps
      const attemptsByCase = {}
      attempts.forEach(a => {
        if (!attemptsByCase[a.test_case_id]) attemptsByCase[a.test_case_id] = []
        attemptsByCase[a.test_case_id].push(a)
      })
      const completionsByCase = {}
      completions.forEach(c => { completionsByCase[c.test_case_id] = c })

      // Aggregate
      return cases.map(tc => {
        const caseAttempts = attemptsByCase[tc.id] || []
        const passed = caseAttempts.filter(a => a.result === 'passed').length
        const failed = caseAttempts.filter(a => a.result === 'failed').length
        const total = caseAttempts.length
        const lastAttempted = caseAttempts.length ? caseAttempts.reduce((max, a) => a.attempted_at > max ? a.attempted_at : max, caseAttempts[0].attempted_at) : null
        const claudeAttempts = caseAttempts.filter(a => a.attempt_type === 'auto_claude')
        const lastAutoChecked = claudeAttempts.length ? claudeAttempts.reduce((max, a) => a.attempted_at > max ? a.attempted_at : max, claudeAttempts[0].attempted_at) : null
        const comp = completionsByCase[tc.id]
        const targetPassCount = tc.target_pass_count || 5
        return {
          ...tc,
          target_pass_count: targetPassCount,
          total_attempts: total,
          passed_attempts: passed,
          failed_attempts: failed,
          performance_score: total > 0 ? Math.round((passed / total) * 100) : 0,
          last_attempted: lastAttempted,
          last_auto_checked: lastAutoChecked,
          dev_completed: comp?.completed || false,
          dev_completed_at: comp?.completed_at || null,
          dev_notes: comp?.notes || null,
          target_met: passed >= targetPassCount,
        }
      })
    },
  })

  const { data: notes } = useQuery({
    queryKey: ['qa-improvement-notes'],
    queryFn: async () => {
      const { data } = await supabase.from('qa_improvement_notes').select('*').order('date_logged', { ascending: false })
      return data || []
    },
  })

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return []
    let filtered = tasks
    if (moduleFilter !== 'all') filtered = filtered.filter(t => t.module === moduleFilter)
    if (statusFilter === 'pending') filtered = filtered.filter(t => !t.dev_completed && !t.target_met)
    else if (statusFilter === 'in_progress') filtered = filtered.filter(t => (t.passed_attempts || 0) > 0 && !t.target_met)
    else if (statusFilter === 'completed') filtered = filtered.filter(t => t.target_met || t.dev_completed)
    else if (statusFilter === 'stale') {
      const staleDate = new Date(Date.now() - 14 * 86400000)
      filtered = filtered.filter(t => t.last_attempted && new Date(t.last_attempted) < staleDate)
    }
    return filtered
  }, [tasks, moduleFilter, statusFilter])

  // Stats
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, completed: 0, pending: 0, stale: 0, avgPerformance: 0 }
    const completed = tasks.filter(t => t.target_met || t.dev_completed).length
    const stale = tasks.filter(t => {
      if (!t.last_attempted) return false
      return new Date(t.last_attempted) < new Date(Date.now() - 14 * 86400000)
    }).length
    const perfSum = tasks.reduce((s, t) => s + (t.performance_score || 0), 0)
    const avgPerformance = tasks.length ? Math.round(perfSum / tasks.length) : 0
    return {
      total: tasks.length,
      completed,
      pending: tasks.length - completed,
      stale,
      avgPerformance,
    }
  }, [tasks])

  async function toggleDevComplete(task) {
    const newCompleted = !task.dev_completed
    try {
      // Upsert completion record
      await supabase.from('qa_test_completions').upsert({
        test_case_id: task.id,
        completed: newCompleted,
        completed_by: newCompleted ? profile?.id : null,
        completed_at: newCompleted ? new Date().toISOString() : null,
        notes: notesDraft[task.id] || task.dev_notes || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'test_case_id' })

      queryClient.invalidateQueries({ queryKey: ['qa-task-summary'] })
      toast({ title: newCompleted ? 'Marked complete' : 'Marked incomplete', type: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, type: 'error' })
    }
  }

  async function logAttempt(task, result) {
    try {
      await supabase.from('qa_test_attempts').insert({
        test_case_id: task.id,
        attempt_type: 'manual_dev',
        result,
        tested_by: profile?.id,
      })
      queryClient.invalidateQueries({ queryKey: ['qa-task-summary'] })
      toast({ title: `Attempt logged: ${result}`, type: result === 'passed' ? 'success' : 'warning' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, type: 'error' })
    }
  }

  async function addNote(task) {
    if (!noteForm?.notes?.trim()) {
      toast({ title: 'Notes required', type: 'warning' })
      return
    }
    try {
      await supabase.from('qa_improvement_notes').insert({
        test_case_id: task.id,
        module: task.module,
        industry: profile?.properties?.type || 'sports',
        page_url: task.page_url || noteForm.page_url || null,
        page_view: noteForm.page_view || null,
        action: task.action || noteForm.action || null,
        task: task.title,
        notes: noteForm.notes,
        severity: noteForm.severity || 'medium',
        category: noteForm.category || 'improvement',
        date_tested: new Date().toISOString(),
        logged_by: profile?.id,
      })
      queryClient.invalidateQueries({ queryKey: ['qa-improvement-notes'] })
      setNoteForm(null)
      toast({ title: 'Note logged', type: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, type: 'error' })
    }
  }

  function exportNotesToCSV() {
    if (!notes || notes.length === 0) {
      toast({ title: 'No notes to export', type: 'warning' })
      return
    }
    const headers = ['Module', 'Industry', 'Page Views', 'Action', 'Task', 'Notes', 'Severity', 'Category', 'Date Tested', 'Date Logged', 'Resolved']
    const rows = notes.map(n => [
      n.module || '',
      n.industry || '',
      n.page_view || n.page_url || '',
      n.action || '',
      n.task || '',
      (n.notes || '').replace(/"/g, '""').replace(/\n/g, ' '),
      n.severity || '',
      n.category || '',
      n.date_tested ? new Date(n.date_tested).toLocaleString() : '',
      n.date_logged ? new Date(n.date_logged).toLocaleString() : '',
      n.resolved ? 'Yes' : 'No',
    ])

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `qa-improvement-notes-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: `Exported ${notes.length} notes`, type: 'success' })
  }

  function formatLastChecked(date) {
    if (!date) return 'Never'
    const d = new Date(date)
    const daysAgo = Math.floor((Date.now() - d) / 86400000)
    if (daysAgo === 0) return 'Today'
    if (daysAgo === 1) return 'Yesterday'
    if (daysAgo < 7) return `${daysAgo}d ago`
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)}w ago`
    return `${Math.floor(daysAgo / 30)}mo ago`
  }

  function getProgressColor(passed, target) {
    if (passed >= target) return 'bg-success'
    if (passed >= target * 0.6) return 'bg-warning'
    return 'bg-bg-card'
  }

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatBox label="Total Tasks" value={stats.total} />
        <StatBox label="Completed" value={stats.completed} color="text-success" />
        <StatBox label="Pending" value={stats.pending} color="text-warning" />
        <StatBox label="Stale" value={stats.stale} color="text-danger" />
        <StatBox label="Avg Score" value={`${stats.avgPerformance}%`} color={stats.avgPerformance >= 90 ? 'text-success' : stats.avgPerformance >= 70 ? 'text-warning' : 'text-danger'} />
      </div>

      {/* Industry standard notice */}
      <div className="bg-bg-card border border-accent/20 rounded-lg p-3">
        <p className="text-[10px] text-text-muted">
          <span className="text-accent font-mono">INDUSTRY STANDARD:</span> Each task requires 5 successful passes within 14 days to be considered stable. Tests older than 14 days are marked stale and need retesting.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* Module filter — mobile dropdown, desktop buttons */}
        <div className="sm:hidden">
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary">
            {MODULES.map(m => <option key={m} value={m}>{m === 'all' ? 'All Modules' : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        </div>
        <div className="hidden sm:flex gap-1 flex-wrap">
          {MODULES.map(m => (
            <button key={m} onClick={() => setModuleFilter(m)} className={`text-[10px] px-2 py-1 rounded capitalize ${moduleFilter === m ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}>
              {m === 'all' ? 'All' : m}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map(t => (
            <button key={t.id} onClick={() => setStatusFilter(t.id)} className={`text-[10px] px-2 py-1 rounded ${statusFilter === t.id ? 'bg-[#7c3aed]/20 text-[#7c3aed] border border-[#7c3aed]/30' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-text-muted">{filteredTasks.length} tasks · {(notes || []).length} improvement notes logged</span>
        <button onClick={exportNotesToCSV} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
          Export Notes CSV ({(notes || []).length})
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-1">
        {filteredTasks.map(task => {
          const isExpanded = expanded === task.id
          const target = task.target_pass_count || 5
          const passed = task.passed_attempts || 0
          const total = task.total_attempts || 0
          const progressPct = Math.min(100, (passed / target) * 100)
          const isStale = task.last_attempted && new Date(task.last_attempted) < new Date(Date.now() - 14 * 86400000)

          return (
            <div key={task.id} className={`bg-bg-surface border rounded-lg overflow-hidden ${task.target_met || task.dev_completed ? 'border-success/30' : isStale ? 'border-danger/30' : 'border-border'}`}>
              {/* Main row */}
              <div className="px-3 py-2.5">
                <div className="flex items-start gap-2">
                  {/* Dev completion checkbox */}
                  <button
                    onClick={() => toggleDevComplete(task)}
                    className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center ${task.dev_completed ? 'bg-success border-success' : 'border-border hover:border-accent'}`}
                    title="Mark as manually tested by developer"
                  >
                    {task.dev_completed && <span className="text-[10px] text-bg-primary">✓</span>}
                  </button>

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : task.id)}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-mono ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                      <span className="text-xs text-text-primary">{task.title}</span>
                      <span className="text-[9px] text-text-muted bg-bg-card px-1 rounded">{task.module}</span>
                      {task.dev_completed && <span className="text-[8px] bg-success/15 text-success px-1.5 py-0.5 rounded">DEV ✓</span>}
                      {task.target_met && <span className="text-[8px] bg-success/15 text-success px-1.5 py-0.5 rounded">STABLE</span>}
                      {isStale && <span className="text-[8px] bg-danger/15 text-danger px-1.5 py-0.5 rounded">STALE</span>}
                    </div>

                    {/* Progress bar — X of 5 passed */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 bg-bg-card rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full transition-all ${getProgressColor(passed, target)}`} style={{ width: `${progressPct}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-text-muted shrink-0">{passed}/{target}</span>
                    </div>

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 mt-1 text-[9px] text-text-muted flex-wrap">
                      <span>
                        Score: <span className={task.performance_score >= 90 ? 'text-success' : task.performance_score >= 70 ? 'text-warning' : 'text-danger'}>
                          {task.performance_score || 0}/100
                        </span>
                      </span>
                      <span>Attempts: {total}</span>
                      <span>Last auto: {formatLastChecked(task.last_auto_checked)}</span>
                      <span>Last test: {formatLastChecked(task.last_attempted)}</span>
                    </div>
                  </div>

                  <span className="text-text-muted text-sm shrink-0">{isExpanded ? '−' : '+'}</span>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-border p-3 space-y-3 bg-bg-card/30">
                  {/* Steps */}
                  {task.steps && (
                    <div>
                      <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Steps</div>
                      <pre className="text-[10px] text-text-secondary whitespace-pre-wrap">{task.steps}</pre>
                    </div>
                  )}

                  {/* Expected */}
                  {task.expected_result && (
                    <div>
                      <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Expected Result</div>
                      <p className="text-[10px] text-text-secondary">{task.expected_result}</p>
                    </div>
                  )}

                  {/* Log attempt buttons */}
                  <div>
                    <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Log Test Attempt</div>
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => logAttempt(task, 'passed')} className="text-[10px] bg-success/15 text-success border border-success/30 px-2 py-1 rounded">+ Passed</button>
                      <button onClick={() => logAttempt(task, 'failed')} className="text-[10px] bg-danger/15 text-danger border border-danger/30 px-2 py-1 rounded">+ Failed</button>
                      <button onClick={() => logAttempt(task, 'blocked')} className="text-[10px] bg-warning/15 text-warning border border-warning/30 px-2 py-1 rounded">+ Blocked</button>
                      <button onClick={() => logAttempt(task, 'skipped')} className="text-[10px] bg-bg-card text-text-muted border border-border px-2 py-1 rounded">+ Skipped</button>
                    </div>
                  </div>

                  {/* Add improvement note */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[9px] text-text-muted uppercase tracking-wider">Improvement Notes</div>
                      <button onClick={() => setNoteForm(noteForm?.task_id === task.id ? null : { task_id: task.id, notes: '', severity: 'medium', category: 'improvement' })} className="text-[10px] text-accent hover:underline">
                        {noteForm?.task_id === task.id ? 'Cancel' : '+ Add Note'}
                      </button>
                    </div>

                    {noteForm?.task_id === task.id && (
                      <div className="bg-bg-surface border border-accent/20 rounded p-2 space-y-2">
                        <textarea
                          value={noteForm.notes}
                          onChange={e => setNoteForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="What needs improvement? Be specific..."
                          rows={3}
                          className="w-full bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary"
                        />
                        <div className="grid grid-cols-2 gap-1">
                          <input value={noteForm.page_view || ''} onChange={e => setNoteForm(f => ({ ...f, page_view: e.target.value }))} placeholder="Page view" className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary" />
                          <input value={noteForm.action || ''} onChange={e => setNoteForm(f => ({ ...f, action: e.target.value }))} placeholder="Action" className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary" />
                          <select value={noteForm.severity} onChange={e => setNoteForm(f => ({ ...f, severity: e.target.value }))} className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                          <select value={noteForm.category} onChange={e => setNoteForm(f => ({ ...f, category: e.target.value }))} className="bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary">
                            <option value="improvement">Improvement</option>
                            <option value="bug">Bug</option>
                            <option value="feature_request">Feature</option>
                            <option value="ui">UI</option>
                            <option value="performance">Performance</option>
                            <option value="security">Security</option>
                          </select>
                        </div>
                        <button onClick={() => addNote(task)} className="bg-accent text-bg-primary px-3 py-1 rounded text-[10px] font-medium">Save Note</button>
                      </div>
                    )}

                    {/* Show existing notes for this task */}
                    {(notes || []).filter(n => n.test_case_id === task.id).length > 0 && (
                      <div className="space-y-1 mt-1">
                        {(notes || []).filter(n => n.test_case_id === task.id).slice(0, 3).map(n => (
                          <div key={n.id} className="bg-bg-surface border border-border rounded p-2">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${n.severity === 'critical' ? 'bg-danger/15 text-danger' : n.severity === 'high' ? 'bg-warning/15 text-warning' : 'bg-bg-card text-text-muted'}`}>{n.severity}</span>
                              <span className="text-[8px] text-text-muted">{n.category}</span>
                              <span className="text-[8px] text-text-muted ml-auto">{new Date(n.date_logged).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[10px] text-text-secondary">{n.notes}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filteredTasks.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">No tasks match the current filter.</div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-bg-card rounded p-2.5 text-center">
      <div className={`text-lg font-bold ${color || 'text-text-primary'}`}>{value}</div>
      <div className="text-[9px] text-text-muted">{label}</div>
    </div>
  )
}
