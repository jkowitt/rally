import { supabase } from './supabase'

// Auto-create a QA ticket from an error
export async function createErrorTicket(error, context = {}) {
  try {
    const msg = error?.message || String(error)
    // Deduplicate — don't create if same error exists in last 24h
    const { data: existing } = await supabase
      .from('qa_tickets')
      .select('id')
      .eq('error_message', msg.slice(0, 200))
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())
      .limit(1)
    if (existing?.length > 0) return // already logged

    await supabase.from('qa_tickets').insert({
      title: `Error: ${msg.slice(0, 100)}`,
      description: `Auto-captured error on ${context.page || window.location.pathname}`,
      source: 'auto_error',
      priority: msg.includes('Cannot read') || msg.includes('undefined') ? 'high' : null,
      category: 'error',
      page_url: context.page || window.location.href,
      error_message: msg.slice(0, 500),
      stack_trace: error?.stack?.slice(0, 1000) || null,
    })
  } catch { /* never block the app */ }
}

// Auto-create a QA ticket for a new page/module
export async function createNewModuleTicket(moduleName, path) {
  try {
    await supabase.from('qa_tickets').insert({
      title: `QA: New module — ${moduleName}`,
      description: `A new module or page was detected at ${path}. Needs QA testing.`,
      source: 'auto_new_module',
      priority: null, // medium — no label
      category: 'new_module',
      page_url: path,
    })
  } catch { /* non-blocking */ }
}

// Create a manual QA ticket
export async function createManualTicket({ title, description, priority, category, assigned_to, created_by }) {
  const { data, error } = await supabase.from('qa_tickets').insert({
    title, description, priority: priority || null, category: category || 'bug',
    source: 'manual', assigned_to, created_by,
  }).select().single()
  if (error) throw error
  return data
}

// Auto-create QA test cases when a new feature is added
export async function createFeatureTestCases(module, features) {
  try {
    // Deduplicate — skip if test case with same title + module exists
    const { data: existing } = await supabase.from('qa_test_cases').select('title').eq('module', module)
    const existingTitles = new Set((existing || []).map(t => t.title.toLowerCase()))

    const newCases = features
      .filter(f => !existingTitles.has(f.title.toLowerCase()))
      .map(f => ({
        module,
        title: f.title,
        steps: f.steps || null,
        expected_result: f.expected_result || null,
        priority: f.priority || 'medium',
        category: f.category || 'functional',
      }))

    if (newCases.length === 0) return 0
    const { data } = await supabase.from('qa_test_cases').insert(newCases).select()

    // Also create a QA ticket to notify
    await supabase.from('qa_tickets').insert({
      title: `New QA tests: ${module} (${newCases.length} cases)`,
      description: `${newCases.length} new test cases added for the ${module} module:\n${newCases.map(c => `- ${c.title}`).join('\n')}`,
      source: 'auto_new_module',
      category: 'new_module',
    })

    return data?.length || 0
  } catch { return 0 }
}
