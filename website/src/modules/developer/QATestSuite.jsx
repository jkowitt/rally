import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'

const MODULES = [
  { id: 'all', label: 'All Modules' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'assets', label: 'Assets' },
  { id: 'fulfillment', label: 'Fulfillment' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'team', label: 'Team' },
  { id: 'settings', label: 'Settings' },
  { id: 'auth', label: 'Auth' },
  { id: 'sportify', label: 'Sportify' },
  { id: 'valora', label: 'VALORA' },
  { id: 'businessnow', label: 'BusinessNow' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'ai', label: 'AI Features' },
  { id: 'global', label: 'Global' },
  { id: 'businessops', label: 'Business Ops' },
  { id: 'security', label: 'Security' },
  { id: 'performance', label: 'Performance' },
]

const RUN_TYPES = [
  { id: 'full', label: 'Full Regression', desc: 'All test cases' },
  { id: 'smoke', label: 'Smoke Test', desc: 'Critical tests only' },
  { id: 'module', label: 'Module Test', desc: 'Single module' },
  { id: 'custom', label: 'Custom', desc: 'Pick specific tests' },
]

const STATUS_COLORS = {
  not_started: 'bg-bg-card text-text-muted',
  passed: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
  blocked: 'bg-warning/15 text-warning',
  skipped: 'bg-bg-card text-text-muted',
}

const PRIORITY_COLORS = {
  critical: 'text-danger',
  high: 'text-warning',
  medium: 'text-text-secondary',
  low: 'text-text-muted',
}

export default function QATestSuite({ profiles }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [view, setView] = useState('runs') // 'runs', 'cases', 'active'
  const [activeRunId, setActiveRunId] = useState(null)
  const [moduleFilter, setModuleFilter] = useState('all')
  const [showNewRun, setShowNewRun] = useState(false)
  const [newRunName, setNewRunName] = useState('')
  const [newRunType, setNewRunType] = useState('full')
  const [newRunModule, setNewRunModule] = useState('pipeline')
  const [expandedCase, setExpandedCase] = useState(null)

  const { data: testCases } = useQuery({
    queryKey: ['qa-test-cases'],
    queryFn: async () => {
      const { data } = await supabase.from('qa_test_cases').select('*').order('module').order('priority')
      return data || []
    },
  })

  const { data: testRuns } = useQuery({
    queryKey: ['qa-test-runs'],
    queryFn: async () => {
      const { data } = await supabase.from('qa_test_runs').select('*').order('created_at', { ascending: false })
      return data || []
    },
  })

  const { data: testResults } = useQuery({
    queryKey: ['qa-test-results', activeRunId],
    queryFn: async () => {
      if (!activeRunId) return []
      const { data } = await supabase.from('qa_test_results').select('*, qa_test_cases(*), assigned_profile:profiles!qa_test_results_assigned_to_fkey(full_name, email)').eq('run_id', activeRunId).order('created_at')
      return data || []
    },
    enabled: !!activeRunId,
  })

  const assignableUsers = (profiles || []).filter(p => p.role === 'developer' || p.role === 'businessops')

  // Stats for active run
  const runStats = useMemo(() => {
    if (!testResults?.length) return { total: 0, passed: 0, failed: 0, blocked: 0, skipped: 0, not_started: 0, progress: 0 }
    const s = { total: testResults.length, passed: 0, failed: 0, blocked: 0, skipped: 0, not_started: 0 }
    testResults.forEach(r => { s[r.status] = (s[r.status] || 0) + 1 })
    s.progress = Math.round(((s.passed + s.failed + s.skipped) / s.total) * 100)
    return s
  }, [testResults])

  // Module stats for test cases view
  const moduleStats = useMemo(() => {
    if (!testCases?.length) return {}
    const stats = {}
    testCases.forEach(tc => {
      if (!stats[tc.module]) stats[tc.module] = { total: 0, critical: 0, high: 0 }
      stats[tc.module].total++
      if (tc.priority === 'critical') stats[tc.module].critical++
      if (tc.priority === 'high') stats[tc.module].high++
    })
    return stats
  }, [testCases])

  const filteredCases = moduleFilter === 'all' ? testCases : (testCases || []).filter(tc => tc.module === moduleFilter)

  async function createTestRun() {
    if (!newRunName.trim()) return
    const { data: run, error } = await supabase.from('qa_test_runs').insert({
      name: newRunName.trim(),
      status: 'planned',
      run_type: newRunType,
      target_module: newRunType === 'module' ? newRunModule : null,
      created_by: profile?.id,
    }).select().single()
    if (error) { toast({ title: 'Error creating run', description: error.message, type: 'error' }); return }

    // Create test results for each applicable test case
    let cases = testCases || []
    if (newRunType === 'smoke') cases = cases.filter(tc => tc.priority === 'critical')
    else if (newRunType === 'module') cases = cases.filter(tc => tc.module === newRunModule)

    if (cases.length === 0) { toast({ title: 'No test cases match', type: 'warning' }); return }

    const results = cases.map(tc => ({
      run_id: run.id,
      test_case_id: tc.id,
      status: 'not_started',
    }))

    await supabase.from('qa_test_results').insert(results)
    queryClient.invalidateQueries({ queryKey: ['qa-test-runs'] })
    setShowNewRun(false)
    setNewRunName('')
    setActiveRunId(run.id)
    setView('active')
    toast({ title: `Created run with ${cases.length} tests`, type: 'success' })
  }

  async function updateResultStatus(resultId, status) {
    await supabase.from('qa_test_results').update({
      status,
      tested_by: status !== 'not_started' ? profile?.id : null,
      tested_at: status !== 'not_started' ? new Date().toISOString() : null,
    }).eq('id', resultId)
    queryClient.invalidateQueries({ queryKey: ['qa-test-results', activeRunId] })
  }

  async function updateResultNotes(resultId, notes) {
    await supabase.from('qa_test_results').update({ notes }).eq('id', resultId)
    queryClient.invalidateQueries({ queryKey: ['qa-test-results', activeRunId] })
  }

  async function assignResult(resultId, userId) {
    await supabase.from('qa_test_results').update({ assigned_to: userId || null }).eq('id', resultId)
    queryClient.invalidateQueries({ queryKey: ['qa-test-results', activeRunId] })
  }

  async function assignAllInModule(module, userId) {
    const ids = (testResults || []).filter(r => r.qa_test_cases?.module === module).map(r => r.id)
    if (!ids.length) return
    await supabase.from('qa_test_results').update({ assigned_to: userId || null }).in('id', ids)
    queryClient.invalidateQueries({ queryKey: ['qa-test-results', activeRunId] })
    toast({ title: `Assigned ${ids.length} tests`, type: 'success' })
  }

  async function completeRun() {
    await supabase.from('qa_test_runs').update({
      status: 'completed', completed_at: new Date().toISOString(),
    }).eq('id', activeRunId)
    queryClient.invalidateQueries({ queryKey: ['qa-test-runs'] })
    toast({ title: 'Test run completed', type: 'success' })
  }

  async function startRun() {
    await supabase.from('qa_test_runs').update({ status: 'in_progress' }).eq('id', activeRunId)
    queryClient.invalidateQueries({ queryKey: ['qa-test-runs'] })
  }

  async function createTicketFromFailure(result) {
    const tc = result.qa_test_cases
    const { data, error } = await supabase.from('qa_tickets').insert({
      title: `FAILED: ${tc?.title}`,
      description: `Test case failed during QA run.\n\nModule: ${tc?.module}\nSteps: ${tc?.steps || 'N/A'}\nExpected: ${tc?.expected_result || 'N/A'}\nNotes: ${result.notes || 'No notes'}`,
      source: 'manual',
      priority: tc?.priority === 'critical' ? 'high' : null,
      category: 'bug',
      created_by: profile?.id,
    }).select().single()
    if (!error && data) {
      await supabase.from('qa_test_results').update({ ticket_id: data.id }).eq('id', result.id)
      queryClient.invalidateQueries({ queryKey: ['qa-test-results', activeRunId] })
      toast({ title: 'QA ticket created', type: 'success' })
    }
  }

  async function deleteRun(runId) {
    if (!confirm('Delete this test run and all its results?')) return
    await supabase.from('qa_test_results').delete().eq('run_id', runId)
    await supabase.from('qa_test_runs').delete().eq('id', runId)
    if (activeRunId === runId) { setActiveRunId(null); setView('runs') }
    queryClient.invalidateQueries({ queryKey: ['qa-test-runs'] })
    toast({ title: 'Run deleted', type: 'success' })
  }

  // Group results by module for active run view
  const resultsByModule = useMemo(() => {
    if (!testResults?.length) return {}
    const grouped = {}
    testResults.forEach(r => {
      const mod = r.qa_test_cases?.module || 'unknown'
      if (!grouped[mod]) grouped[mod] = []
      grouped[mod].push(r)
    })
    return grouped
  }, [testResults])

  const activeRun = (testRuns || []).find(r => r.id === activeRunId)

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-bg-card rounded-lg p-1">
        {[
          { id: 'runs', label: `Test Runs (${(testRuns || []).length})` },
          { id: 'cases', label: `Test Cases (${(testCases || []).length})` },
          ...(activeRunId ? [{ id: 'active', label: activeRun?.name || 'Active Run' }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === t.id ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}>{t.label}</button>
        ))}
      </div>

      {/* TEST RUNS VIEW */}
      {view === 'runs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Create test runs to QA features by module or across the platform.</p>
            <button onClick={() => setShowNewRun(!showNewRun)} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium">{showNewRun ? 'Cancel' : 'New Test Run'}</button>
          </div>

          {showNewRun && (
            <div className="bg-bg-card border border-accent/30 rounded-lg p-4 space-y-3">
              <input value={newRunName} onChange={e => setNewRunName(e.target.value)} placeholder="Run name (e.g. Pre-Launch QA, Sprint 5 Regression)" className="w-full bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RUN_TYPES.map(rt => (
                  <button key={rt.id} onClick={() => setNewRunType(rt.id)} className={`p-2 rounded border text-left ${newRunType === rt.id ? 'border-accent bg-accent/10' : 'border-border'}`}>
                    <div className="text-xs font-medium text-text-primary">{rt.label}</div>
                    <div className="text-[9px] text-text-muted">{rt.desc}</div>
                  </button>
                ))}
              </div>
              {newRunType === 'module' && (
                <select value={newRunModule} onChange={e => setNewRunModule(e.target.value)} className="bg-bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary">
                  {MODULES.filter(m => m.id !== 'all').map(m => (
                    <option key={m.id} value={m.id}>{m.label} ({moduleStats[m.id]?.total || 0} tests)</option>
                  ))}
                </select>
              )}
              <button onClick={createTestRun} disabled={!newRunName.trim()} className="bg-accent text-bg-primary px-4 py-2 rounded text-sm font-medium disabled:opacity-50">Create Run</button>
            </div>
          )}

          <div className="space-y-2">
            {(testRuns || []).map(run => (
              <div key={run.id} className="bg-bg-surface border border-border rounded-lg p-3 hover:border-accent/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${run.status === 'completed' ? 'bg-success' : run.status === 'in_progress' ? 'bg-warning animate-pulse' : 'bg-bg-card border border-border'}`} />
                    <span className="text-sm text-text-primary font-medium truncate">{run.name}</span>
                    <span className="text-[9px] font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded">{run.run_type}</span>
                    {run.target_module && <span className="text-[9px] text-accent">{run.target_module}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted">{new Date(run.created_at).toLocaleDateString()}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${run.status === 'completed' ? 'bg-success/10 text-success' : run.status === 'in_progress' ? 'bg-warning/10 text-warning' : 'bg-bg-card text-text-muted'}`}>{run.status}</span>
                    <button onClick={() => { setActiveRunId(run.id); setView('active') }} className="text-[10px] text-accent hover:underline">Open</button>
                    <button onClick={() => deleteRun(run.id)} className="text-[10px] text-danger hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {(!testRuns || testRuns.length === 0) && (
              <div className="text-center py-8 text-text-muted text-sm">No test runs yet. Create one to start QA testing.</div>
            )}
          </div>
        </div>
      )}

      {/* TEST CASES VIEW */}
      {view === 'cases' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted">Filter:</span>
            <div className="flex gap-1 flex-wrap">
              {MODULES.map(m => (
                <button key={m.id} onClick={() => setModuleFilter(m.id)} className={`text-[10px] px-2 py-1 rounded ${moduleFilter === m.id ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}>
                  {m.label} {m.id !== 'all' && moduleStats[m.id] ? `(${moduleStats[m.id].total})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            {(filteredCases || []).map(tc => (
              <div key={tc.id} className="bg-bg-surface border border-border rounded p-2 hover:border-border">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedCase(expandedCase === tc.id ? null : tc.id)}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`text-[9px] font-mono ${PRIORITY_COLORS[tc.priority]}`}>{tc.priority}</span>
                    <span className="text-xs text-text-primary truncate">{tc.title}</span>
                    <span className="text-[9px] text-text-muted bg-bg-card px-1 py-0.5 rounded">{tc.module}</span>
                    <span className="text-[9px] text-text-muted">{tc.category}</span>
                  </div>
                  <span className="text-[10px] text-text-muted">{expandedCase === tc.id ? '−' : '+'}</span>
                </div>
                {expandedCase === tc.id && (
                  <div className="mt-2 pl-4 border-l-2 border-accent/20 space-y-1">
                    {tc.steps && <div><span className="text-[9px] text-text-muted uppercase">Steps:</span><pre className="text-[11px] text-text-secondary whitespace-pre-wrap mt-0.5">{tc.steps}</pre></div>}
                    {tc.expected_result && <div><span className="text-[9px] text-text-muted uppercase">Expected:</span><p className="text-[11px] text-text-secondary mt-0.5">{tc.expected_result}</p></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE RUN VIEW */}
      {view === 'active' && activeRunId && (
        <div className="space-y-4">
          {/* Run header */}
          <div className="bg-bg-card border border-accent/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-text-primary">{activeRun?.name}</h3>
                <p className="text-[10px] text-text-muted mt-0.5">{activeRun?.run_type} run — {runStats.total} tests</p>
              </div>
              <div className="flex gap-2">
                {activeRun?.status === 'planned' && <button onClick={startRun} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium">Start Run</button>}
                {activeRun?.status === 'in_progress' && <button onClick={completeRun} className="bg-success text-bg-primary px-3 py-1.5 rounded text-xs font-medium">Complete Run</button>}
                {activeRun?.status === 'completed' && <span className="text-success text-xs font-mono">Completed</span>}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-bg-surface rounded-full h-2 mb-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-success to-accent transition-all" style={{ width: `${runStats.progress}%` }} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <MiniStat label="Total" value={runStats.total} />
              <MiniStat label="Passed" value={runStats.passed} color="text-success" />
              <MiniStat label="Failed" value={runStats.failed} color="text-danger" />
              <MiniStat label="Blocked" value={runStats.blocked} color="text-warning" />
              <MiniStat label="Skipped" value={runStats.skipped} />
              <MiniStat label="Remaining" value={runStats.not_started} />
            </div>
          </div>

          {/* Results grouped by module */}
          {Object.entries(resultsByModule).map(([mod, results]) => {
            const modPassed = results.filter(r => r.status === 'passed').length
            const modFailed = results.filter(r => r.status === 'failed').length
            return (
              <div key={mod} className="bg-bg-surface border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-bg-card border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary capitalize">{mod}</span>
                    <span className="text-[9px] text-text-muted">{results.length} tests</span>
                    {modPassed > 0 && <span className="text-[9px] text-success">{modPassed} passed</span>}
                    {modFailed > 0 && <span className="text-[9px] text-danger">{modFailed} failed</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <select onChange={e => assignAllInModule(mod, e.target.value)} defaultValue="" className="text-[9px] bg-bg-surface border border-border rounded px-1.5 py-0.5 text-text-secondary">
                      <option value="">Assign all to...</option>
                      {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                    </select>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {results.map(result => {
                    const tc = result.qa_test_cases
                    const isExpanded = expandedCase === result.id
                    return (
                      <div key={result.id} className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {/* Status buttons */}
                          <div className="flex gap-0.5 shrink-0">
                            {['passed', 'failed', 'blocked', 'skipped'].map(s => (
                              <button key={s} onClick={() => updateResultStatus(result.id, result.status === s ? 'not_started' : s)} className={`w-5 h-5 rounded text-[7px] font-bold uppercase leading-none flex items-center justify-center ${result.status === s ? STATUS_COLORS[s] : 'bg-bg-card/50 text-text-muted/30 hover:text-text-muted'}`} title={s}>
                                {s[0].toUpperCase()}
                              </button>
                            ))}
                          </div>

                          {/* Test info */}
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedCase(isExpanded ? null : result.id)}>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[8px] font-mono ${PRIORITY_COLORS[tc?.priority]}`}>{tc?.priority?.slice(0, 4)}</span>
                              <span className="text-xs text-text-primary truncate">{tc?.title}</span>
                              <span className="text-[8px] text-text-muted bg-bg-card px-1 rounded">{tc?.category}</span>
                            </div>
                          </div>

                          {/* Assignee */}
                          <select value={result.assigned_to || ''} onChange={e => assignResult(result.id, e.target.value)} className="text-[9px] bg-bg-card border border-border rounded px-1 py-0.5 text-text-secondary max-w-[80px] sm:max-w-[120px]">
                            <option value="">Unassigned</option>
                            {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email?.split('@')[0]}</option>)}
                          </select>

                          {/* Create ticket from failure */}
                          {result.status === 'failed' && !result.ticket_id && (
                            <button onClick={() => createTicketFromFailure(result)} className="text-[8px] text-danger hover:underline shrink-0">+ticket</button>
                          )}
                          {result.ticket_id && <span className="text-[8px] text-accent shrink-0">ticket linked</span>}
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-2 ml-[90px] space-y-2">
                            {tc?.steps && <div><span className="text-[9px] text-text-muted uppercase">Steps:</span><pre className="text-[10px] text-text-secondary whitespace-pre-wrap mt-0.5">{tc.steps}</pre></div>}
                            {tc?.expected_result && <div><span className="text-[9px] text-text-muted uppercase">Expected:</span><p className="text-[10px] text-text-secondary mt-0.5">{tc.expected_result}</p></div>}
                            <div>
                              <span className="text-[9px] text-text-muted uppercase">Notes:</span>
                              <textarea defaultValue={result.notes || ''} onBlur={e => updateResultNotes(result.id, e.target.value)} placeholder="Add test notes..." rows={2} className="w-full mt-0.5 bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent" />
                            </div>
                            {result.tested_at && <div className="text-[9px] text-text-muted">Tested {new Date(result.tested_at).toLocaleString()} by {result.tested_by === profile?.id ? 'you' : 'another tester'}</div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color || 'text-text-primary'}`}>{value}</div>
      <div className="text-[9px] text-text-muted">{label}</div>
    </div>
  )
}
