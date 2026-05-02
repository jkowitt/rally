import { supabase } from './supabase'

// Declarative registry of QA test cases that should always exist
// in the qa_test_cases table. Sync runs idempotently — adds new
// cases, updates titles/steps if they drift, leaves attempts alone.
//
// To register a test case for a new feature: add an entry below,
// then either run syncQATestRegistry() manually or click "Sync
// test cases" in the QATaskManager UI.

export const QA_TEST_REGISTRY = [
  // Pipeline / CRM
  { module: 'pipeline', title: 'Create a new deal from scratch', priority: 'high', target_pass_count: 5,
    steps: ['Open CRM → Pipeline', 'Click + New Deal', 'Fill brand + value + stage', 'Save', 'Confirm appears in pipeline'] },
  { module: 'pipeline', title: 'Drag a deal between stages', priority: 'high', target_pass_count: 5,
    steps: ['Open CRM → Pipeline', 'Drag a card to a different column', 'Reload', 'Confirm stage persists'] },
  { module: 'pipeline', title: 'Find Prospects search returns results', priority: 'high', target_pass_count: 3,
    steps: ['Open Find Prospects modal', 'Enter search term', 'Verify edge function returns prospects'] },

  // Contracts → Account Management
  { module: 'contracts', title: 'Upload a signed contract → benefits parsed', priority: 'critical', target_pass_count: 5,
    steps: ['Upload PDF in CRM Contracts', 'Wait for parse', 'Confirm benefits appear', 'Confirm fulfillment records created'] },
  { module: 'contracts', title: 'Update a contract → prior version archived', priority: 'high', target_pass_count: 3,
    steps: ['Edit an existing contract', 'Save', 'Open Account Management dashboard', 'Confirm archived version listed'] },
  { module: 'contracts', title: 'Signed contract auto-routes to Account Management', priority: 'high', target_pass_count: 3,
    steps: ['Sign a contract on a Contracted deal', 'Confirm status=active', 'Confirm appears in Account Management'] },

  // Account Management
  { module: 'fulfillment', title: 'Mark a benefit as delivered', priority: 'high', target_pass_count: 5,
    steps: ['Open Account Mgmt → Fulfillment', 'Toggle a benefit to delivered', 'Reload', 'Confirm state persisted'] },
  { module: 'fulfillment', title: 'Add a delivery note (autosave)', priority: 'medium', target_pass_count: 3,
    steps: ['Open a fulfillment record', 'Click into notes', 'Type', 'Wait 2s', 'Reload — note saved'] },

  // Hubs
  { module: 'global', title: 'Hub picker switches contexts', priority: 'high', target_pass_count: 3,
    steps: ['Click each hub button at top', 'Confirm sidebar updates', 'Confirm landing page changes'] },
  { module: 'global', title: 'URL-based hub auto-detection', priority: 'medium', target_pass_count: 3,
    steps: ['Navigate directly to /app/accounts', 'Confirm Account Mgmt hub becomes active in topbar'] },

  // Impersonation
  { module: 'global', title: 'Developer impersonation overlays correctly', priority: 'medium', target_pass_count: 3,
    steps: ['Open Impersonation panel', 'Set industry=nonprofit, role=admin, tier=pro', 'Confirm sidebar / flags reflect impersonation', 'Confirm banner shows', 'Reset and confirm normal view returns'] },

  // Save model
  { module: 'global', title: 'CMS autosave drafts work', priority: 'medium', target_pass_count: 3,
    steps: ['Enter CMS edit mode', 'Edit text', 'Wait 3s', 'Confirm "Saved" indicator appears', 'Reload — draft persisted'] },

  // AI / edge functions
  { module: 'ai', title: 'contract-ai edge function reachable', priority: 'critical', target_pass_count: 1,
    steps: ['Open dev console', 'Run smoke test', 'Confirm contract-ai responds'] },

  // Auth
  { module: 'auth', title: 'Sign in + session persistence', priority: 'critical', target_pass_count: 5,
    steps: ['Sign in', 'Reload', 'Confirm still signed in', 'Sign out', 'Confirm redirected'] },
]

// Idempotent sync: insert missing, update title/steps for existing,
// preserve attempts + completions.
export async function syncQATestRegistry() {
  const result = { inserted: 0, updated: 0, kept: 0 }
  const { data: existing } = await supabase
    .from('qa_test_cases')
    .select('id, module, title, steps, priority, target_pass_count')
  const byKey = new Map((existing || []).map(t => [`${t.module}::${t.title}`, t]))

  for (const entry of QA_TEST_REGISTRY) {
    const key = `${entry.module}::${entry.title}`
    const existingRow = byKey.get(key)
    const stepsText = entry.steps.join('\n')
    if (!existingRow) {
      const { error } = await supabase.from('qa_test_cases').insert({
        module: entry.module,
        title: entry.title,
        priority: entry.priority,
        target_pass_count: entry.target_pass_count,
        steps: stepsText,
        source: 'registry',
      })
      if (!error) result.inserted++
    } else {
      const drifted = (existingRow.title !== entry.title) ||
        (existingRow.priority !== entry.priority) ||
        (existingRow.target_pass_count !== entry.target_pass_count) ||
        (existingRow.steps !== stepsText)
      if (drifted) {
        const { error } = await supabase.from('qa_test_cases').update({
          title: entry.title,
          priority: entry.priority,
          target_pass_count: entry.target_pass_count,
          steps: stepsText,
          source: 'registry',
        }).eq('id', existingRow.id)
        if (!error) result.updated++
      } else {
        result.kept++
      }
    }
  }
  return result
}
