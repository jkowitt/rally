import { supabase } from './supabase'

// Schedule: Mon, Wed, Fri at 1am ET (5am/6am UTC depending on DST)
const SCHEDULE_DAYS = [1, 3, 5] // Mon, Wed, Fri
const SCHEDULE_NAMES = { 1: 'monday', 3: 'wednesday', 5: 'friday' }
const TARGET_HOUR_ET = 1 // 1am ET

// Check if we should run the scheduled QA
export async function maybeRunScheduledQA() {
  try {
    const now = new Date()
    const day = now.getDay()
    if (!SCHEDULE_DAYS.includes(day)) return false

    // Convert to ET using reliable Intl formatter
    const etHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now), 10)
    // Run between 1am-2am ET
    if (etHour !== TARGET_HOUR_ET) return false

    const todayStr = now.toISOString().slice(0, 10)

    // Already ran today?
    const { data: existing } = await supabase
      .from('qa_auto_reports')
      .select('id')
      .gte('run_date', todayStr + 'T00:00:00Z')
      .limit(1)
    if (existing?.length > 0) return false

    await runFullAutoQA(SCHEDULE_NAMES[day])
    return true
  } catch { return false }
}

// ── Main auto QA runner ──
export async function runFullAutoQA(schedule = 'manual') {
  // Create report
  const { data: report } = await supabase.from('qa_auto_reports').insert({
    schedule, status: 'running',
  }).select().single()
  if (!report) throw new Error('Failed to create report')

  const results = { passed: 0, failed: 0, total: 0 }
  const autoFixes = []
  const platformStats = {}
  const moduleScores = {}
  const issues = []

  try {
    // ═══════════════════════════════════════
    // PHASE 1: Database health checks
    // ═══════════════════════════════════════
    const tables = [
      'profiles', 'properties', 'deals', 'contracts', 'assets', 'contacts',
      'fulfillment_records', 'events', 'teams', 'feature_flags',
      'newsletters', 'valuations', 'activities', 'tasks',
      'audit_log', 'usage_tracker', 'ui_content', 'qa_tickets',
    ]

    for (const table of tables) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
        if (error) {
          results.failed++
          issues.push({ module: 'database', severity: 'high', description: `Table ${table}: ${error.message}` })
        } else {
          results.passed++
          platformStats[table] = count || 0
        }
        results.total++
      } catch (e) {
        results.failed++
        results.total++
      }
    }

    // ═══════════════════════════════════════
    // PHASE 2: Auto-fix common issues (all wrapped in try/catch)
    // ═══════════════════════════════════════
    let nullStageCount = 0
    let missingBrandCount = 0

    try {
      const { data: nullStageDeals } = await supabase.from('deals').select('id').is('stage', null)
      if (nullStageDeals?.length > 0) {
        nullStageCount = nullStageDeals.length
        const { error } = await supabase.from('deals').update({ stage: 'Prospect' }).is('stage', null)
        if (!error) autoFixes.push({ table: 'deals', action: 'Set null stage to Prospect', count: nullStageCount })
      }
    } catch {}

    try {
      const { data: nullPriorityDeals } = await supabase.from('deals').select('id').is('priority', null)
      if (nullPriorityDeals?.length > 0) {
        const { error } = await supabase.from('deals').update({ priority: 'Medium' }).is('priority', null)
        if (!error) autoFixes.push({ table: 'deals', action: 'Set null priority to Medium', count: nullPriorityDeals.length })
      }
    } catch {}

    try {
      const { data: missingBrandContracts } = await supabase.from('contracts').select('id, deal_id').is('brand_name', null)
      if (missingBrandContracts?.length > 0) {
        let fixed = 0
        for (const c of missingBrandContracts) {
          if (c.deal_id) {
            const { data: deal } = await supabase.from('deals').select('brand_name').eq('id', c.deal_id).maybeSingle()
            if (deal?.brand_name) {
              await supabase.from('contracts').update({ brand_name: deal.brand_name }).eq('id', c.id)
              fixed++
            }
          }
        }
        missingBrandCount = missingBrandContracts.length - fixed
        if (fixed > 0) autoFixes.push({ table: 'contracts', action: 'Copied missing brand_name from deal', count: fixed })
      }
    } catch {}

    try {
      const { data: doneTasks } = await supabase.from('tasks').select('id').eq('status', 'Done').is('completed_at', null)
      if (doneTasks?.length > 0) {
        await supabase.from('tasks').update({ completed_at: new Date().toISOString() }).eq('status', 'Done').is('completed_at', null)
        autoFixes.push({ table: 'tasks', action: 'Set completed_at on Done tasks', count: doneTasks.length })
      }
    } catch {}

    // Fix 5: Orphaned fulfillment records — skip (FK constraints handle this)

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
      const { data: staleTickets } = await supabase.from('qa_tickets').select('id').eq('status', 'open').lte('created_at', thirtyDaysAgo)
      if (staleTickets?.length > 0) {
        for (const t of staleTickets) {
          await supabase.from('qa_tickets').update({
            resolution_notes: 'Auto-marked stale (open 30+ days). Review or close.',
          }).eq('id', t.id)
        }
        autoFixes.push({ table: 'qa_tickets', action: 'Flagged stale tickets (30+ days open)', count: staleTickets.length })
      }
    } catch {}

    try {
      const { data: flags } = await supabase.from('feature_flags').select('module')
      const existingModules = new Set((flags || []).map(f => f.module))
      const requiredModules = ['crm', 'sportify', 'valora', 'businessnow']
      const missingFlags = requiredModules.filter(m => !existingModules.has(m))
      if (missingFlags.length > 0) {
        await supabase.from('feature_flags').insert(missingFlags.map(m => ({ module: m, enabled: m === 'crm' })))
        autoFixes.push({ table: 'feature_flags', action: 'Created missing feature flags', count: missingFlags.length })
      }
    } catch {}

    // ═══════════════════════════════════════
    // PHASE 3: Module-level QA scoring
    // ═══════════════════════════════════════
    const dealCount = platformStats.deals || 0
    const contractCount = platformStats.contracts || 0
    const assetCount = platformStats.assets || 0
    const fulfillmentCount = platformStats.fulfillment_records || 0
    const contactCount = platformStats.contacts || 0
    const eventCount = platformStats.events || 0
    const activityCount = platformStats.activities || 0
    const taskCount = platformStats.tasks || 0

    // Score each module based on data health
    moduleScores.pipeline = scoreModule(dealCount, [
      dealCount > 0,
      nullStageCount === 0,
      contactCount > 0,
      activityCount > 0,
    ])
    moduleScores.contracts = scoreModule(contractCount, [
      contractCount > 0 || dealCount === 0,
      missingBrandCount === 0,
      fulfillmentCount > 0 || contractCount === 0,
    ])
    moduleScores.assets = scoreModule(assetCount, [assetCount > 0 || dealCount === 0])
    moduleScores.fulfillment = scoreModule(fulfillmentCount, [fulfillmentCount > 0 || contractCount === 0])
    moduleScores.dashboard = scoreModule(dealCount, [dealCount > 0, results.failed < 3])
    moduleScores.team = scoreModule(platformStats.profiles || 0, [(platformStats.profiles || 0) > 0])
    moduleScores.events = scoreModule(eventCount, [eventCount >= 0])

    // ═══════════════════════════════════════
    // PHASE 3.5: Smoke tests — real round-trip checks
    // ═══════════════════════════════════════
    // Each smoke test calls a real endpoint / RPC / table and
    // records latency + pass/fail to qa_smoke_results so the report
    // captures actual end-to-end function health, not just data counts.
    const smokeTests = []

    async function smoke(name, category, fn) {
      const start = Date.now()
      try {
        await fn()
        smokeTests.push({ name, category, passed: true, latency_ms: Date.now() - start })
      } catch (e) {
        smokeTests.push({ name, category, passed: false, latency_ms: Date.now() - start, error_message: e?.message || String(e) })
      }
    }

    await smoke('contract-ai/summarize_contract', 'edge_function', async () => {
      const { error } = await supabase.functions.invoke('contract-ai', { body: { action: 'summarize_contract', contract_text: 'test' } })
      if (error) throw error
    })
    await smoke('auth/getSession', 'auth', async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!data?.session) throw new Error('No session')
    })
    await smoke('deals/select_count', 'crud', async () => {
      const { error } = await supabase.from('deals').select('id', { head: true, count: 'exact' }).limit(1)
      if (error) throw error
    })
    await smoke('contracts/select_count', 'crud', async () => {
      const { error } = await supabase.from('contracts').select('id', { head: true, count: 'exact' }).limit(1)
      if (error) throw error
    })
    await smoke('contract_versions/select', 'crud', async () => {
      const { error } = await supabase.from('contract_versions').select('id', { head: true, count: 'exact' }).limit(1)
      if (error) throw error
    })
    await smoke('fulfillment_records/select', 'crud', async () => {
      const { error } = await supabase.from('fulfillment_records').select('id', { head: true, count: 'exact' }).limit(1)
      if (error) throw error
    })
    await smoke('feature_flags/select', 'crud', async () => {
      const { error } = await supabase.from('feature_flags').select('module').limit(5)
      if (error) throw error
    })
    await smoke('archive_contract_version/rpc_signature', 'rpc', async () => {
      // Pass a non-existent uuid — should return null without throwing.
      const { error } = await supabase.rpc('archive_contract_version', {
        p_contract_id: '00000000-0000-0000-0000-000000000000',
        p_reason: 'qa-smoke',
      })
      if (error) throw error
    })

    const aiWorking = smokeTests.find(t => t.name === 'contract-ai/summarize_contract')?.passed
    const authWorking = smokeTests.find(t => t.name === 'auth/getSession')?.passed
    moduleScores.ai = aiWorking ? 90 : 30
    moduleScores.auth = authWorking ? 95 : 40

    const smokePassed = smokeTests.filter(t => t.passed).length
    moduleScores.smoke = scoreModule(smokePassed, [smokePassed === smokeTests.length, smokePassed > 0])

    moduleScores.global = scoreModule(results.passed, [results.failed === 0, results.passed > 10])

    const avgScore = Math.round(Object.values(moduleScores).reduce((a, b) => a + b, 0) / Object.keys(moduleScores).length)

    // ═══════════════════════════════════════
    // PHASE 4: Claude analysis for improvements
    // ═══════════════════════════════════════
    let claudeAnalysis = {}
    let claudeCodeInstructions = ''

    try {
      const { data: aiData, error: aiInvokeErr } = await supabase.functions.invoke('contract-ai', {
        body: {
          action: 'code_assistant',
          prompt: `You are auditing the Loud Legacy CRM platform. Your job is to diagnose problems and suggest improvements that are GROUNDED in the actual codebase below. You are forbidden from inventing file paths, table names, column names, hook names, or function names that are not in the GROUNDED FACTS section.

═══════════════════════════════════════
GROUNDED FACTS — these are the ONLY entities you may reference by exact name
═══════════════════════════════════════

REAL MODULE FILES (under website/src/modules/):
- crm/AssetCatalog.jsx           — sponsorship asset catalog
- crm/DealPipeline.jsx           — kanban + table pipeline view
- crm/ContractManager.jsx        — contract upload, generation, AI parsing (NOT ContractList.jsx)
- crm/FulfillmentTracker.jsx     — sponsor fulfillment tracking (NOT components/fulfillment/*)
- crm/BrandReport.jsx            — auto-generated brand report
- crm/DeclinedDeals.jsx
- crm/ActivityTimeline.jsx
- crm/TaskManager.jsx
- crm/DealInsights.jsx
- crm/Newsletter.jsx
- crm/TeamManager.jsx
- crm/Automations.jsx
- crm/Settings.jsx
- crm/HelpCenter.jsx
- crm/SponsorPortal.jsx
- sportify/EventManager.jsx, sportify/EventDetail.jsx
- valora/ValuationEngine.jsx
- businessnow/BusinessNow.jsx
- businessops/* (Accounting, AdSpendManager, ConnectionManager, FinanceDashboard, FinancialProjections, GoalTracker, MarketingHub, QATickets, ReportBuilder, RevenuePipeline, RoadmapTracker, ClaudeTerminal)
- developer/DeveloperDashboard.jsx, QAAutoReports.jsx, QATestSuite.jsx, QATaskManager.jsx, QAUsageSimulator.jsx, ChangeLog.jsx
- industry/* (12 industry-specific modules)
- legal/LoginPage.jsx
- dashboard/Dashboard.jsx
- growth/GrowthHub.jsx, GrowthWorkbook.jsx, StrategicWorkbooks.jsx

REAL SERVICES (under website/src/services/):
- emailSequenceService.js, automationGate.js, churnRiskService.js, digestService.js,
  notificationService.js, onboardingService.js, trialHealthService.js,
  upgradeOpportunityService.js, upgradePromptService.js, usageTracker.js, utmService.js,
  pricingService.js, aiCreditService.js, addonService.js, billingService.js, stripeSyncService.js,
  contractMigrationService.js
- email/* (emailListService, subscriberService, campaignService, emailTemplateService,
  conversationService, pipelineSyncService, importService, emailAnalyticsService)
- dev/* (outlookAuthService, outlookGraphService, emailSyncService, outreachService,
  templateService, outreachAnalyticsService, dealVelocityService)

REAL HOOKS (under website/src/hooks/):
- useAuth (returns { profile, session, loading, isDeveloper, isAdmin } — profile has id, email, role, property_id, full_name, onboarding_completed)
- useFeatureFlags (returns { flags, loaded, toggleFlag })
- useCMS, useIndustryConfig, useIndustryVisibility, useAutomation, useNotifications,
  useOnboarding, useUpgrade, useSeo
- dev/useDevAccess (developer role + flag check)
- THERE IS NO useToast HOOK. Toasts come from @/components/Toast which exports useToast() returning { toast }.
- THERE IS NO useHealthCheck HOOK.

REAL EDGE FUNCTIONS (under website/supabase/functions/):
- contract-ai (action-dispatched: generate_contract, edit_contract, parse_pdf_text,
  summarize_contract, extract_benefits, generate_fulfillment, deal_insights,
  pipeline_forecast, draft_email, code_assistant, smart_match_assets, etc.)
- automation-runner (action: daily_digest, weekly_report, trial_health, churn_scan,
  upgrade_scan, contract_expiry, send_queued_emails, generate_social_posts)
- send-email, claude-valuation, daily-intelligence, benchmark-updater, code-analysis,
  github-code, contact-form, apollo-enrichment, hunter-verify, stripe-billing,
  outlook-auth, outlook-graph, outlook-token-refresh, outlook-delta-sync, outlook-prospect-signup-webhook,
  email-marketing-send, email-marketing-track, email-marketing-webhook,
  email-marketing-pipeline-sync, email-marketing-unsubscribe,
  process-contract-batch, finalize-migration,
  reset-monthly-credits, stripe-pricing-sync, pricing-cache-invalidate
- THERE IS NO claude-api EDGE FUNCTION.

REAL KEY TABLES + COLUMNS (only the ones you might reference):
- profiles (id, email, full_name, role, property_id, onboarding_completed) — id IS auth.users.id, NOT auth_user_id
- properties (id, name, industry, ...)
- deals (id, property_id, brand_name, contact_name, contact_email, value, start_date,
  end_date, stage) — stage is one of 'Prospect','Proposal Sent','Negotiation','Contracted','In Fulfillment','Renewed'
  THERE IS NO deals.name COLUMN. Use brand_name.
- contracts (id, deal_id, property_id, brand_name, contract_number, effective_date,
  expiration_date, total_value, signed)
- contacts (id, property_id, deal_id, first_name, last_name, email, phone, position,
  company, city, state, linkedin, website, is_primary, last_contacted_at)
  Contact org is in 'company' NOT 'organization'.
- assets (id, property_id, name, category, description, quantity, base_price,
  total_available, sold_count, from_contract, source_contract_id) — category is a CHECK constraint on 8 values
- fulfillment_records (id, deal_id, contract_id, asset_id, benefit_id, scheduled_date,
  delivered, delivery_notes, auto_generated)
- activities (id, property_id, deal_id, created_by, activity_type, subject, description, occurred_at)
- teams (id, name, property_id, type, created_by) — EXISTS, has RLS, see migration 014
- team_members (id, team_id, user_id, role)
- feature_flags (module, enabled)

═══════════════════════════════════════
PLATFORM STATE THIS RUN
═══════════════════════════════════════

PLATFORM STATS:
${Object.entries(platformStats).map(([k, v]) => `- ${k}: ${v} rows`).join('\n')}

AUTO-FIXES APPLIED THIS RUN:
${autoFixes.length > 0 ? autoFixes.map(f => `- ${f.table}: ${f.action} (${f.count} records)`).join('\n') : 'None needed'}

ISSUES FOUND:
${issues.length > 0 ? issues.map(i => `- [${i.severity}] ${i.module}: ${i.description}`).join('\n') : 'None'}

MODULE HEALTH SCORES:
${Object.entries(moduleScores).map(([k, v]) => `- ${k}: ${v}/100`).join('\n')}

═══════════════════════════════════════
RULES — read these carefully
═══════════════════════════════════════

1. EMPTY TABLES ARE NOT BUGS. Zero rows in contracts/teams/fulfillment usually means no test data was created, NOT that the table is broken or missing. Distinguish "empty data" from "broken structure". Empty data is a UX/onboarding signal, not a code fix.

2. NEVER invent file paths. If you don't know the exact file, refer to the module category (e.g. "the contract management surface") rather than guessing a filename.

3. NEVER invent table columns, hook names, function names, or edge function names. If GROUNDED FACTS doesn't list it, it doesn't exist.

4. NEVER suggest creating files that already exist. If you're recommending an empty-state CTA on contracts, check the GROUNDED FACTS — ContractManager.jsx already exists.

5. NEVER suggest "improvements" that are just self-scoring tricks (e.g. counting DOM nodes to inflate the health score). Suggest changes that improve real user outcomes.

6. PREFER DIAGNOSIS OVER CODE. For each suggestion, lead with what's wrong and what category of fix it needs. Only include code if you can ground every line in GROUNDED FACTS.

7. RATE YOUR OWN CONFIDENCE. After each suggestion, label it [GROUNDED] if every reference is in GROUNDED FACTS, or [DIRECTIONAL] if you're suggesting a direction without specific code.

═══════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════

SUMMARY:
[2-3 sentences. Distinguish data-empty signals from real bugs. Be honest if everything looks healthy.]

IMPROVEMENTS:
---
1. [Title] [GROUNDED or DIRECTIONAL]
Diagnosis: [What the signal is and what it means]
Suggested direction: [The category of fix]
[Optional: specific code, but only if every file/column/function name comes from GROUNDED FACTS]
---
2. [Title] [GROUNDED or DIRECTIONAL]
...
---

CRITICAL ISSUES:
[List actual blocking problems, or "None — empty test data is not a critical issue"]

FEATURE SUGGESTIONS:
[Brainstorms for new capabilities. These do not need to be GROUNDED — they're directional ideas. But still use real module names where you reference them.]`,
        },
      })

      if (aiInvokeErr) throw aiInvokeErr
      const response = aiData?.response || aiData?.contract_text || ''
      claudeCodeInstructions = response

      // Parse sections
      const summaryMatch = response.match(/SUMMARY:\s*([\s\S]*?)(?=IMPROVEMENTS|$)/i)
      const improvementsMatch = response.match(/IMPROVEMENTS[\s\S]*?:\s*([\s\S]*?)(?=CRITICAL|$)/i)
      const criticalMatch = response.match(/CRITICAL ISSUES:\s*([\s\S]*?)(?=FEATURE|$)/i)
      const featureMatch = response.match(/FEATURE SUGGESTIONS:\s*([\s\S]*?)$/i)

      claudeAnalysis = {
        summary: summaryMatch?.[1]?.trim() || response.slice(0, 300),
        improvements: improvementsMatch?.[1]?.trim() || '',
        critical: criticalMatch?.[1]?.trim() || 'None',
        features: featureMatch?.[1]?.trim() || '',
      }
    } catch {
      claudeAnalysis = { summary: 'Claude analysis unavailable', improvements: '', critical: '', features: '' }
      claudeCodeInstructions = 'Claude analysis could not be completed. Run manually.'
    }

    // ═══════════════════════════════════════
    // PHASE 5: Save report + smoke results
    // ═══════════════════════════════════════
    await supabase.from('qa_auto_reports').update({
      status: 'completed',
      health_score: avgScore,
      total_checks: results.total,
      passed_checks: results.passed,
      failed_checks: results.failed,
      auto_fixes_applied: autoFixes.length,
      auto_fixes: autoFixes,
      platform_stats: platformStats,
      claude_analysis: claudeAnalysis,
      claude_code_instructions: claudeCodeInstructions,
      module_scores: moduleScores,
      completed_at: new Date().toISOString(),
    }).eq('id', report.id)

    if (smokeTests.length > 0) {
      try {
        await supabase.from('qa_smoke_results').insert(
          smokeTests.map(t => ({ ...t, qa_report_id: report.id }))
        )
      } catch {}
    }

    // ═══════════════════════════════════════
    // PHASE 6: Log auto-fixes to change log
    // ═══════════════════════════════════════
    try {
      if (autoFixes.length > 0) {
        await supabase.from('change_log').insert({
          title: `Auto QA: ${autoFixes.length} fixes applied`,
          description: autoFixes.map(f => `${f.table}: ${f.action} (${f.count} records)`).join('\n'),
          category: 'bugfix',
          module: 'platform',
          source: 'auto_fix',
          qa_report_id: report.id,
        })
      }
      await supabase.from('change_log').insert({
        title: `Auto QA Report: Health ${avgScore}/100`,
        description: `${schedule} run — ${results.passed}/${results.total} checks passed, ${autoFixes.length} auto-fixes applied.\n\n${claudeAnalysis.summary || ''}`,
        category: 'qa',
        module: 'platform',
        source: 'auto_qa',
        qa_report_id: report.id,
      })
    } catch {} // non-blocking — change_log may not exist

    return report.id
  } catch (err) {
    await supabase.from('qa_auto_reports').update({
      status: 'failed',
      claude_analysis: { summary: `Error: ${err.message}` },
      completed_at: new Date().toISOString(),
    }).eq('id', report.id)
    throw err
  }
}

function scoreModule(count, checks) {
  const base = checks.filter(Boolean).length / checks.length * 100
  return Math.round(Math.min(100, base))
}
