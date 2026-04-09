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

const MANUAL_COLORS = {
  not_started: 'bg-bg-card text-text-muted',
  passed: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
  blocked: 'bg-warning/15 text-warning',
  skipped: 'bg-bg-card text-text-muted',
}

const CLAUDE_COLORS = {
  not_checked: 'bg-bg-card text-text-muted',
  passed: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
  needs_review: 'bg-warning/15 text-warning',
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
  const [view, setView] = useState('runs')
  const [activeRunId, setActiveRunId] = useState(null)
  const [moduleFilter, setModuleFilter] = useState('all')
  const [showNewRun, setShowNewRun] = useState(false)
  const [newRunName, setNewRunName] = useState('')
  const [newRunType, setNewRunType] = useState('full')
  const [newRunModule, setNewRunModule] = useState('pipeline')
  const [expandedCase, setExpandedCase] = useState(null)
  const [autoQARunning, setAutoQARunning] = useState(false)
  const [autoQAProgress, setAutoQAProgress] = useState('')

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

  const runStats = useMemo(() => {
    if (!testResults?.length) return { total: 0, passed: 0, failed: 0, blocked: 0, skipped: 0, not_started: 0, progress: 0, claude_passed: 0, claude_failed: 0, claude_review: 0, claude_unchecked: 0 }
    const s = { total: testResults.length, passed: 0, failed: 0, blocked: 0, skipped: 0, not_started: 0, claude_passed: 0, claude_failed: 0, claude_review: 0, claude_unchecked: 0 }
    testResults.forEach(r => {
      s[r.status] = (s[r.status] || 0) + 1
      if (r.claude_status === 'passed') s.claude_passed++
      else if (r.claude_status === 'failed') s.claude_failed++
      else if (r.claude_status === 'needs_review') s.claude_review++
      else s.claude_unchecked++
    })
    s.progress = Math.round(((s.passed + s.failed + s.skipped) / s.total) * 100)
    return s
  }, [testResults])

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

    let cases = testCases || []
    if (newRunType === 'smoke') cases = cases.filter(tc => tc.priority === 'critical')
    else if (newRunType === 'module') cases = cases.filter(tc => tc.module === newRunModule)

    if (cases.length === 0) { toast({ title: 'No test cases match', type: 'warning' }); return }

    const results = cases.map(tc => ({
      run_id: run.id,
      test_case_id: tc.id,
      status: 'not_started',
      claude_status: 'not_checked',
    }))

    await supabase.from('qa_test_results').insert(results)
    queryClient.invalidateQueries({ queryKey: ['qa-test-runs'] })
    setShowNewRun(false)
    setNewRunName('')
    setActiveRunId(run.id)
    setView('active')
    toast({ title: `Created run with ${cases.length} tests`, type: 'success' })
  }

  // ── Auto QA: Send each test to Claude for code analysis ──
  async function runAutoQA() {
    if (!testResults?.length) return
    const unchecked = testResults.filter(r => r.claude_status === 'not_checked' || !r.claude_status)
    if (unchecked.length === 0) { toast({ title: 'All tests already checked by Claude', type: 'info' }); return }

    setAutoQARunning(true)
    let passed = 0, failed = 0, review = 0

    // Process in batches of 3 for speed
    for (let i = 0; i < unchecked.length; i++) {
      const result = unchecked[i]
      const tc = result.qa_test_cases
      if (!tc) continue

      setAutoQAProgress(`Checking ${i + 1}/${unchecked.length}: ${tc.title}`)

      try {
        const { data, error } = await supabase.functions.invoke('contract-ai', {
          body: {
            action: 'code_assistant',
            prompt: `You are performing automated QA on the Loud Legacy CRM platform. Analyze whether this feature is correctly implemented based on your knowledge of the codebase.

TEST CASE:
- Module: ${tc.module}
- Title: ${tc.title}
- Steps: ${tc.steps || 'N/A'}
- Expected Result: ${tc.expected_result || 'N/A'}
- Priority: ${tc.priority}
- Category: ${tc.category}

Based on the codebase structure and code conventions you know:
1. Does the relevant component/route exist?
2. Does the code handle the described functionality?
3. Are there obvious bugs, missing null checks, or unhandled edge cases?
4. For security tests: are the protections in place?
5. For mobile tests: are responsive classes used?
6. For performance tests: is lazy loading / optimization present?

Respond with EXACTLY this JSON format (no other text):
{"status": "passed" | "failed" | "needs_review", "summary": "1-2 sentence assessment", "issues": ["issue 1", "issue 2"] or [], "confidence": "high" | "medium" | "low"}`,
          },
        })

        let claudeResult = { status: 'needs_review', summary: 'Could not parse response', issues: [], confidence: 'low' }
        if (!error && data?.response) {
          try {
            const jsonMatch = data.response.match(/\{[\s\S]*\}/)
            if (jsonMatch) claudeResult = JSON.parse(jsonMatch[0])
          } catch {
            claudeResult.summary = data.response.slice(0, 300)
          }
        } else if (error) {
          claudeResult.summary = `Error: ${error.message || 'Edge function failed'}`
        }

        const notes = `${claudeResult.summary}${claudeResult.issues?.length ? '\n\nIssues:\n' + claudeResult.issues.map(i => '• ' + i).join('\n') : ''}\n\nConfidence: ${claudeResult.confidence || 'unknown'}`

        await supabase.from('qa_test_results').update({
          claude_status: claudeResult.status || 'needs_review',
          claude_notes: notes,
          claude_checked_at: new Date().toISOString(),
        }).eq('id', result.id)

        if (claudeResult.status === 'passed') passed++
        else if (claudeResult.status === 'failed') failed++
        else review++

      } catch (err) {
        await supabase.from('qa_test_results').update({
          claude_status: 'needs_review',
          claude_notes: `Auto-QA error: ${err.message}`,
          claude_checked_at: new Date().toISOString(),
        }).eq('id', result.id)
        review++
      }

      // Refresh results every 5 tests
      if ((i + 1) % 5 === 0 || i === unchecked.length - 1) {
        queryClient.invalidateQueries({ queryKey: ['qa-test-results', activeRunId] })
      }
    }

    setAutoQARunning(false)
    setAutoQAProgress('')
    queryClient.invalidateQueries({ queryKey: ['qa-test-results', activeRunId] })
    toast({ title: `Auto QA complete: ${passed} passed, ${failed} failed, ${review} needs review`, type: passed > 0 && failed === 0 ? 'success' : 'warning' })
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

  async function createTicketFromFailure(result, source) {
    const tc = result.qa_test_cases
    const notes = source === 'claude' ? result.claude_notes : result.notes
    const { data, error } = await supabase.from('qa_tickets').insert({
      title: `FAILED [${source}]: ${tc?.title}`,
      description: `Test failed during QA run (${source} check).\n\nModule: ${tc?.module}\nSteps: ${tc?.steps || 'N/A'}\nExpected: ${tc?.expected_result || 'N/A'}\n\n${source === 'claude' ? 'Claude Analysis' : 'Manual Notes'}:\n${notes || 'No notes'}`,
      source: source === 'claude' ? 'auto_error' : 'manual',
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

  const tabItems = [
    { id: 'runs', label: `Test Runs (${(testRuns || []).length})` },
    { id: 'cases', label: `Test Cases (${(testCases || []).length})` },
    ...(activeRunId ? [{ id: 'active', label: activeRun?.name || 'Active Run' }] : []),
  ]

  return (
    <div className="space-y-4">
      {/* Tab bar — mobile dropdown, desktop buttons */}
      <div className="sm:hidden">
        <select value={view} onChange={e => setView(e.target.value)} className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
          {tabItems.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div className="hidden sm:flex gap-1 bg-bg-card rounded-lg p-1 flex-wrap">
        {tabItems.map(t => (
          <button key={t.id} onClick={() => setView(t.id)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === t.id ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary'}`}>{t.label}</button>
        ))}
      </div>

      {/* TEST RUNS VIEW */}
      {view === 'runs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Create test runs to QA features. Each test has a Claude check and a manual check column.</p>
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
          {/* Module filter — mobile dropdown, desktop buttons */}
          <div className="sm:hidden">
            <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary">
              {MODULES.map(m => <option key={m.id} value={m.id}>{m.label} {m.id !== 'all' && moduleStats[m.id] ? `(${moduleStats[m.id].total})` : ''}</option>)}
            </select>
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted shrink-0">Filter:</span>
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
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-medium text-text-primary">{activeRun?.name}</h3>
                <p className="text-[10px] text-text-muted mt-0.5">{activeRun?.run_type} run — {runStats.total} tests</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={runAutoQA} disabled={autoQARunning} className="bg-[#7c3aed] text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50">
                  {autoQARunning ? autoQAProgress : 'Run Auto QA (Claude)'}
                </button>
                {activeRun?.status === 'planned' && <button onClick={startRun} className="bg-accent text-bg-primary px-3 py-1.5 rounded text-xs font-medium">Start Run</button>}
                {activeRun?.status === 'in_progress' && <button onClick={completeRun} className="bg-success text-bg-primary px-3 py-1.5 rounded text-xs font-medium">Complete Run</button>}
                {activeRun?.status === 'completed' && <span className="text-success text-xs font-mono">Completed</span>}
              </div>
            </div>

            {/* Dual progress bars */}
            <div className="space-y-2 mb-3">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-text-muted uppercase tracking-wider">Claude Auto-QA</span>
                  <span className="text-[9px] font-mono text-text-muted">{runStats.claude_passed + runStats.claude_failed + runStats.claude_review}/{runStats.total}</span>
                </div>
                <div className="w-full bg-bg-surface rounded-full h-2 flex overflow-hidden">
                  {runStats.claude_passed > 0 && <div className="h-2 bg-success transition-all" style={{ width: `${(runStats.claude_passed / runStats.total) * 100}%` }} />}
                  {runStats.claude_failed > 0 && <div className="h-2 bg-danger transition-all" style={{ width: `${(runStats.claude_failed / runStats.total) * 100}%` }} />}
                  {runStats.claude_review > 0 && <div className="h-2 bg-warning transition-all" style={{ width: `${(runStats.claude_review / runStats.total) * 100}%` }} />}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-text-muted uppercase tracking-wider">Manual Check</span>
                  <span className="text-[9px] font-mono text-text-muted">{runStats.passed + runStats.failed + runStats.skipped}/{runStats.total}</span>
                </div>
                <div className="w-full bg-bg-surface rounded-full h-2 flex overflow-hidden">
                  {runStats.passed > 0 && <div className="h-2 bg-success transition-all" style={{ width: `${(runStats.passed / runStats.total) * 100}%` }} />}
                  {runStats.failed > 0 && <div className="h-2 bg-danger transition-all" style={{ width: `${(runStats.failed / runStats.total) * 100}%` }} />}
                  {runStats.blocked > 0 && <div className="h-2 bg-warning transition-all" style={{ width: `${(runStats.blocked / runStats.total) * 100}%` }} />}
                </div>
              </div>
            </div>

            {/* Stats — dual row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-bg-surface rounded p-2">
                <div className="text-[9px] text-[#7c3aed] font-mono uppercase mb-1">Claude</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-center">
                  <MiniStat label="Passed" value={runStats.claude_passed} color="text-success" />
                  <MiniStat label="Failed" value={runStats.claude_failed} color="text-danger" />
                  <MiniStat label="Review" value={runStats.claude_review} color="text-warning" />
                  <MiniStat label="Pending" value={runStats.claude_unchecked} />
                </div>
              </div>
              <div className="bg-bg-surface rounded p-2">
                <div className="text-[9px] text-accent font-mono uppercase mb-1">Manual</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-center">
                  <MiniStat label="Passed" value={runStats.passed} color="text-success" />
                  <MiniStat label="Failed" value={runStats.failed} color="text-danger" />
                  <MiniStat label="Blocked" value={runStats.blocked} color="text-warning" />
                  <MiniStat label="Pending" value={runStats.not_started} />
                </div>
              </div>
            </div>
          </div>

          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_80px_100px_100px_80px] gap-2 px-3 text-[9px] text-text-muted uppercase tracking-wider">
            <span>Test Case</span>
            <span className="text-center">Claude</span>
            <span className="text-center">Manual</span>
            <span className="text-center">Assignee</span>
            <span className="text-center">Actions</span>
          </div>

          {/* Results grouped by module */}
          {Object.entries(resultsByModule).map(([mod, results]) => {
            const modClaudePassed = results.filter(r => r.claude_status === 'passed').length
            const modClaudeFailed = results.filter(r => r.claude_status === 'failed').length
            const modManualPassed = results.filter(r => r.status === 'passed').length
            const modManualFailed = results.filter(r => r.status === 'failed').length
            return (
              <div key={mod} className="bg-bg-surface border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-bg-card border-b border-border flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary capitalize">{mod}</span>
                    <span className="text-[9px] text-text-muted">{results.length} tests</span>
                    {(modClaudePassed > 0 || modClaudeFailed > 0) && (
                      <span className="text-[8px] font-mono text-[#7c3aed] bg-[#7c3aed]/10 px-1 rounded">C: {modClaudePassed}P {modClaudeFailed}F</span>
                    )}
                    {(modManualPassed > 0 || modManualFailed > 0) && (
                      <span className="text-[8px] font-mono text-accent bg-accent/10 px-1 rounded">M: {modManualPassed}P {modManualFailed}F</span>
                    )}
                  </div>
                  <select onChange={e => assignAllInModule(mod, e.target.value)} defaultValue="" className="text-[9px] bg-bg-surface border border-border rounded px-1.5 py-0.5 text-text-secondary">
                    <option value="">Assign all to...</option>
                    {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                  </select>
                </div>
                <div className="divide-y divide-border">
                  {results.map(result => {
                    const tc = result.qa_test_cases
                    const isExpanded = expandedCase === result.id
                    return (
                      <div key={result.id} className="px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {/* Test info */}
                          <div className="flex-1 min-w-0 cursor-pointer order-1" onClick={() => setExpandedCase(isExpanded ? null : result.id)}>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[8px] font-mono ${PRIORITY_COLORS[tc?.priority]}`}>{tc?.priority?.slice(0, 4)}</span>
                              <span className="text-xs text-text-primary truncate">{tc?.title}</span>
                              <span className="text-[8px] text-text-muted bg-bg-card px-1 rounded hidden sm:inline">{tc?.category}</span>
                            </div>
                          </div>

                          {/* Claude status */}
                          <div className="flex items-center gap-1 order-2 shrink-0" title={result.claude_notes || 'Not checked'}>
                            <span className="text-[7px] text-[#7c3aed] font-mono hidden sm:inline">AI</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${CLAUDE_COLORS[result.claude_status || 'not_checked']}`}>
                              {result.claude_status === 'passed' ? 'PASS' : result.claude_status === 'failed' ? 'FAIL' : result.claude_status === 'needs_review' ? 'REVIEW' : '—'}
                            </span>
                          </div>

                          {/* Manual status buttons */}
                          <div className="flex gap-0.5 shrink-0 order-3">
                            {['passed', 'failed', 'blocked', 'skipped'].map(s => (
                              <button key={s} onClick={() => updateResultStatus(result.id, result.status === s ? 'not_started' : s)} className={`w-5 h-5 rounded text-[7px] font-bold uppercase leading-none flex items-center justify-center ${result.status === s ? MANUAL_COLORS[s] : 'bg-bg-card/50 text-text-muted/30 hover:text-text-muted'}`} title={`Manual: ${s}`}>
                                {s[0].toUpperCase()}
                              </button>
                            ))}
                          </div>

                          {/* Assignee */}
                          <select value={result.assigned_to || ''} onChange={e => assignResult(result.id, e.target.value)} className="text-[9px] bg-bg-card border border-border rounded px-1 py-0.5 text-text-secondary max-w-[80px] sm:max-w-[100px] order-4 shrink-0">
                            <option value="">—</option>
                            {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email?.split('@')[0]}</option>)}
                          </select>

                          {/* Ticket actions */}
                          <div className="flex gap-1 order-5 shrink-0">
                            {result.claude_status === 'failed' && !result.ticket_id && (
                              <button onClick={() => createTicketFromFailure(result, 'claude')} className="text-[7px] text-[#7c3aed] hover:underline">+AI ticket</button>
                            )}
                            {result.status === 'failed' && !result.ticket_id && (
                              <button onClick={() => createTicketFromFailure(result, 'manual')} className="text-[7px] text-danger hover:underline">+ticket</button>
                            )}
                            {result.ticket_id && <span className="text-[7px] text-accent">linked</span>}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-2 sm:ml-4 space-y-2 border-l-2 border-accent/20 pl-3">
                            {tc?.steps && <div><span className="text-[9px] text-text-muted uppercase">Steps:</span><pre className="text-[10px] text-text-secondary whitespace-pre-wrap mt-0.5">{tc.steps}</pre></div>}
                            {tc?.expected_result && <div><span className="text-[9px] text-text-muted uppercase">Expected:</span><p className="text-[10px] text-text-secondary mt-0.5">{tc.expected_result}</p></div>}

                            {/* Claude analysis */}
                            {result.claude_notes && (
                              <div className="bg-[#7c3aed]/5 border border-[#7c3aed]/20 rounded p-2">
                                <span className="text-[9px] text-[#7c3aed] uppercase font-mono">Claude Analysis:</span>
                                <pre className="text-[10px] text-text-secondary whitespace-pre-wrap mt-0.5">{result.claude_notes}</pre>
                                {result.claude_checked_at && <div className="text-[8px] text-text-muted mt-1">Checked: {new Date(result.claude_checked_at).toLocaleString()}</div>}
                              </div>
                            )}

                            {/* Manual notes */}
                            <div>
                              <span className="text-[9px] text-text-muted uppercase">Manual Notes:</span>
                              <textarea defaultValue={result.notes || ''} onBlur={e => updateResultNotes(result.id, e.target.value)} placeholder="Add test notes..." rows={2} className="w-full mt-0.5 bg-bg-card border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent" />
                            </div>
                            {result.tested_at && <div className="text-[9px] text-text-muted">Manual test: {new Date(result.tested_at).toLocaleString()}</div>}
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
      <div className={`text-sm font-bold ${color || 'text-text-primary'}`}>{value}</div>
      <div className="text-[8px] text-text-muted">{label}</div>
    </div>
  )
}
