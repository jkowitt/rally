import { supabase } from './supabase'

// Run on Mon/Thu/Sun at midnight — check if we should run when app loads
export async function maybeRunScheduledHealthCheck() {
  try {
    const now = new Date()
    const day = now.getDay() // 0=Sun, 1=Mon, 4=Thu
    const scheduleDays = [0, 1, 4] // Sun, Mon, Thu

    if (!scheduleDays.includes(day)) return

    const scheduleNames = { 0: 'sunday', 1: 'monday', 4: 'thursday' }
    const scheduleName = scheduleNames[day]
    const todayStr = now.toISOString().slice(0, 10)

    // Check if already ran today
    const { data: existing } = await supabase
      .from('health_check_reports')
      .select('id')
      .gte('run_date', todayStr + 'T00:00:00')
      .lte('run_date', todayStr + 'T23:59:59')
      .limit(1)

    if (existing?.length > 0) return // already ran today

    // Run the health check
    await runHealthCheck(scheduleName)
  } catch { /* non-blocking */ }
}

async function runHealthCheck(schedule) {
  const results = []
  let passed = 0
  let failed = 0

  // Table checks
  const tables = [
    'profiles', 'properties', 'deals', 'contracts', 'assets', 'contacts',
    'fulfillment_records', 'events', 'teams', 'team_members', 'feature_flags',
    'newsletters', 'valuations', 'valuation_training_data', 'activities',
    'tasks', 'audit_log', 'login_history', 'usage_tracker', 'automations',
    'webhooks', 'ui_content', 'cms_media',
  ]

  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (error) {
        results.push({ name: `table:${table}`, ok: false, detail: error.message })
        failed++
      } else {
        results.push({ name: `table:${table}`, ok: true, detail: `${count} rows` })
        passed++
      }
    } catch (e) {
      results.push({ name: `table:${table}`, ok: false, detail: e.message })
      failed++
    }
  }

  // Auth check
  try {
    const { data } = await supabase.auth.getSession()
    results.push({ name: 'auth:session', ok: !!data.session, detail: data.session ? 'Active' : 'No session' })
    if (data.session) passed++; else failed++
  } catch (e) {
    results.push({ name: 'auth:session', ok: false, detail: e.message })
    failed++
  }

  // Edge function check
  try {
    const { error } = await supabase.functions.invoke('contract-ai', { body: { action: 'ping' } })
    results.push({ name: 'edge:contract-ai', ok: !error, detail: error ? error.message : 'Reachable' })
    if (!error) passed++; else failed++
  } catch (e) {
    results.push({ name: 'edge:contract-ai', ok: false, detail: e.message })
    failed++
  }

  // Get platform stats
  const stats = {}
  for (const table of ['profiles', 'properties', 'deals', 'contracts', 'assets', 'contacts']) {
    try {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
      stats[table] = count || 0
    } catch { stats[table] = -1 }
  }

  // Count errors in last 24h
  let errorCount = 0
  try {
    const { count } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'client_error')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())
    errorCount = count || 0
  } catch {}

  const total = passed + failed
  const status = failed === 0 ? 'passed' : failed <= 3 ? 'warnings' : 'failed'

  // Store report
  await supabase.from('health_check_reports').insert({
    schedule,
    status,
    total_checks: total,
    passed_checks: passed,
    failed_checks: failed,
    results,
    platform_stats: stats,
    error_count_24h: errorCount,
  })

  console.log(`Health check (${schedule}): ${passed}/${total} passed, ${errorCount} errors in 24h`)
  return { status, passed, failed, total }
}
