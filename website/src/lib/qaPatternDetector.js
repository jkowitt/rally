// ============================================================
// QA PATTERN DETECTOR + PROMPT GENERATOR
// ============================================================
// Takes aggregate results from autoQAEngine.runFullPass() and
// detects patterns that warrant a mass-update prompt. Each
// detected pattern produces a ready-to-paste Claude Code
// prompt with real file paths, error messages, and SQL.
//
// Patterns detected:
//   - rls_write_failures:   multiple probes hit RLS errors
//   - check_constraint:     CHECK constraint violations
//   - missing_column:       Postgres 42703 errors
//   - missing_table:        42P01 errors
//   - edge_fn_failures:     edge function probes failing
//   - flaky_tests:          probes that pass some runs but not others
//   - upload_failures:      storage upload probes failing
//
// Each pattern -> { title, summary, prompt_text, evidence }
// ============================================================
import { CATEGORIES } from './autoQAEngine'

export function detectPatterns(aggregateResults) {
  const patterns = []
  const results = Object.values(aggregateResults.results)

  // Bucket failed probes by error category
  const byCategory = {}
  results.forEach(r => {
    if (r.fails === 0) return
    r.errors.forEach(e => {
      const cat = classifyErrorCode(e.code) || 'unknown'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push({ probe: r, error: e })
    })
  })

  // ─── Pattern: RLS write failures ────────────────────────
  const rlsFailures = byCategory.db_rls || []
  if (rlsFailures.length >= 2) {
    const affectedTables = [...new Set(rlsFailures.map(f => extractTable(f.probe.label)))]
    patterns.push({
      pattern_detected: 'rls_write_failures',
      severity: 'high',
      title: `RLS blocks ${rlsFailures.length} write operations across ${affectedTables.length} tables`,
      summary: `Row-level security is blocking INSERT/UPDATE operations on ${affectedTables.join(', ')}. This usually means the table has SELECT + UPDATE policies but no INSERT policy, or the policy's USING clause doesn't match the caller.`,
      evidence: {
        affected_tables: affectedTables,
        error_count: rlsFailures.length,
        sample_errors: rlsFailures.slice(0, 5).map(f => f.error.message),
      },
      prompt_text: buildRlsPrompt(affectedTables, rlsFailures),
    })
  }

  // ─── Pattern: CHECK constraint failures ─────────────────
  const checkFailures = byCategory.db_check || []
  if (checkFailures.length >= 1) {
    const affectedTables = [...new Set(checkFailures.map(f => extractTable(f.probe.label)))]
    patterns.push({
      pattern_detected: 'check_constraint',
      severity: 'high',
      title: `CHECK constraint blocks ${checkFailures.length} writes on ${affectedTables.join(', ')}`,
      summary: 'A Postgres CHECK constraint is rejecting valid-looking data. Often this means a constraint was hardcoded with a specific enum of allowed values and new values need to be added — or the constraint should be dropped entirely.',
      evidence: {
        affected_tables: affectedTables,
        error_count: checkFailures.length,
        sample_errors: checkFailures.slice(0, 5).map(f => f.error.message),
      },
      prompt_text: buildCheckConstraintPrompt(affectedTables, checkFailures),
    })
  }

  // ─── Pattern: Missing columns ────────────────────────────
  const missingCols = byCategory.db_missing_column || []
  if (missingCols.length >= 1) {
    patterns.push({
      pattern_detected: 'missing_column',
      severity: 'critical',
      title: `${missingCols.length} probes reference columns that don't exist`,
      summary: 'Code is reading or writing columns that aren\'t in the database schema. Either the migration adding them was never applied, or the code references the wrong column name.',
      evidence: {
        error_count: missingCols.length,
        sample_errors: missingCols.slice(0, 5).map(f => f.error.message),
      },
      prompt_text: buildMissingColumnPrompt(missingCols),
    })
  }

  // ─── Pattern: Missing tables ────────────────────────────
  const missingTables = byCategory.db_read || []
  const truelyMissing = missingTables.filter(f => f.error.message?.includes('does not exist'))
  if (truelyMissing.length >= 1) {
    const tables = [...new Set(truelyMissing.map(f => extractTable(f.probe.label)))]
    patterns.push({
      pattern_detected: 'missing_table',
      severity: 'critical',
      title: `${tables.length} tables don't exist in the database`,
      summary: `Tables ${tables.join(', ')} are referenced by the app but aren\'t in the database. Most likely cause: one or more migrations haven\'t been applied.`,
      evidence: { missing_tables: tables },
      prompt_text: buildMissingTablePrompt(tables),
    })
  }

  // ─── Pattern: Edge function failures ─────────────────────
  const edgeFailures = results.filter(r => r.category === CATEGORIES.EDGE_FN && r.fails > 0)
  if (edgeFailures.length >= 1) {
    const functions = [...new Set(edgeFailures.map(r => extractFunctionName(r.label)))]
    patterns.push({
      pattern_detected: 'edge_fn_failures',
      severity: 'high',
      title: `${functions.length} edge function${functions.length !== 1 ? 's' : ''} failing to respond`,
      summary: `Edge functions ${functions.join(', ')} failed during the QA run. Either they aren\'t deployed, their secrets aren\'t configured, or they have an internal error.`,
      evidence: {
        failed_functions: functions,
        sample_errors: edgeFailures.slice(0, 3).map(r => r.errors[0]?.message),
      },
      prompt_text: buildEdgeFnPrompt(functions, edgeFailures),
    })
  }

  // ─── Pattern: Flaky tests ───────────────────────────────
  const flaky = results.filter(r => r.passes > 0 && r.fails > 0)
  if (flaky.length >= 2) {
    patterns.push({
      pattern_detected: 'flaky_tests',
      severity: 'medium',
      title: `${flaky.length} probes are flaky (intermittent failures)`,
      summary: 'Probes that pass some runs but fail others typically indicate race conditions, async ordering bugs, or dependency on external state that changes between runs.',
      evidence: {
        flaky_probes: flaky.map(r => ({
          id: r.id,
          label: r.label,
          passes: r.passes,
          fails: r.fails,
        })),
      },
      prompt_text: buildFlakyPrompt(flaky),
    })
  }

  // ─── Pattern: Upload failures ───────────────────────────
  const uploadFailures = results.filter(r => r.category === CATEGORIES.UPLOAD && r.fails > 0)
  if (uploadFailures.length >= 1) {
    patterns.push({
      pattern_detected: 'upload_failures',
      severity: 'medium',
      title: `Storage upload probes failing`,
      summary: 'The QA engine could not upload a test file to Supabase storage. Either the bucket does not exist, the policies block the upload, or the storage service is unreachable.',
      evidence: {
        sample_errors: uploadFailures.slice(0, 3).map(r => r.errors[0]?.message),
      },
      prompt_text: buildUploadPrompt(uploadFailures),
    })
  }

  return patterns
}

// ─── Helpers ────────────────────────────────────────────────
function classifyErrorCode(code) {
  if (code === '42501') return 'db_rls'
  if (code === '23514') return 'db_check'
  if (code === '42703') return 'db_missing_column'
  if (code === '42P01') return 'db_read'
  return null
}

function extractTable(label) {
  // Labels like "Read profiles" → "profiles"
  return label.replace(/^(Read|Write|Render|Update|Insert)\s+/i, '').split(' ')[0]
}

function extractFunctionName(label) {
  // Labels like "contract-ai edge function" → "contract-ai"
  return label.replace(/\s+edge function$/i, '').trim()
}

// ─── Prompt builders ────────────────────────────────────────
function buildRlsPrompt(tables, failures) {
  const sampleErrors = failures.slice(0, 5).map(f => `  - ${f.probe.label}: ${f.error.message}`).join('\n')
  return `# Fix RLS write policies blocking ${failures.length} operations

The AutoQA engine detected row-level security blocking writes on these tables:
${tables.map(t => `- ${t}`).join('\n')}

## Sample errors
${sampleErrors}

## Task
For each affected table, verify that it has the complete set of RLS policies:
1. SELECT — who can read
2. INSERT — who can create new rows
3. UPDATE — who can modify existing rows
4. DELETE — who can remove rows

The most common cause is a table that was created with SELECT and UPDATE policies but no explicit INSERT policy. Postgres RLS defaults to DENY when no matching policy exists for a write operation.

## For each table, add missing policies
\`\`\`sql
${tables.map(t => `-- ${t}
drop policy if exists ${t}_insert on ${t};
create policy "${t}_insert" on ${t}
  for insert with check (is_developer() or /* add scoping here */);

drop policy if exists ${t}_delete on ${t};
create policy "${t}_delete" on ${t}
  for delete using (is_developer() or /* add scoping here */);`).join('\n\n')}
\`\`\`

## Steps
1. Open each table's most recent migration file under website/supabase/migrations/
2. Check the existing RLS policies — only add what's missing
3. Create a new migration file (next number after the highest existing one)
4. Test by running the AutoQA engine again — RLS failures should drop to 0`
}

function buildCheckConstraintPrompt(tables, failures) {
  const errors = failures.slice(0, 3).map(f => `- ${f.error.message}`).join('\n')
  return `# Fix CHECK constraint violations on ${tables.join(', ')}

Postgres CHECK constraints are rejecting valid-looking writes:
${errors}

## Task
For each affected table:
1. Find the CHECK constraint in its most recent migration
2. Decide: should the constraint be EXPANDED to allow new values, or DROPPED entirely?
3. Hardcoded enum CHECK constraints are usually an anti-pattern — dropping them is often the right call

## Create a migration
\`\`\`sql
${tables.map(t => `alter table ${t} drop constraint if exists ${t}_check;
-- If the old constraint was an enum whitelist, consider NOT recreating it`).join('\n\n')}
\`\`\`

## Verify
Re-run the AutoQA engine. CHECK violations should drop to 0.`
}

function buildMissingColumnPrompt(failures) {
  const errors = failures.slice(0, 5).map(f => `- ${f.error.message}`).join('\n')
  return `# Fix missing column references

The AutoQA engine found code referencing columns that don't exist in the database:
${errors}

## Task
For each missing column:
1. Identify which code path references it (likely in website/src/services/ or website/src/modules/)
2. Determine if the column SHOULD exist (need to add it) or if the code is wrong (need to rename)
3. Check the most recent migration for the affected table to see the current schema

## Common causes
- Migration adding the column was never applied to production
- Column name was renamed but some code still uses the old name
- Code was copied from another project without adjusting column names

## Next steps
Search for each column name across the codebase with Grep and inspect every usage. If the column is genuinely needed, add a migration. If the code is wrong, fix the queries.`
}

function buildMissingTablePrompt(tables) {
  return `# ${tables.length} tables are missing from the database

These tables are referenced by the app but don't exist in the database:
${tables.map(t => `- ${t}`).join('\n')}

## Task
1. Check website/supabase/migrations/ for migrations that CREATE TABLE for each of these
2. If the migrations exist: they haven't been applied. Run:
   \`\`\`
   cd website
   supabase db push
   \`\`\`
3. If no migration exists for a table: the table was probably removed or renamed. Search the codebase for references and decide whether to restore the table or remove the references.

## Most likely cause
The GitHub Actions \`supabase-deploy\` workflow failed to apply recent migrations. Check the Actions tab for red runs.`
}

function buildEdgeFnPrompt(functions, failures) {
  const errorSummary = failures.slice(0, 3).map(f => `- ${f.label}: ${f.errors[0]?.message}`).join('\n')
  return `# ${functions.length} edge function${functions.length !== 1 ? 's' : ''} failing

These edge functions failed to respond during the QA run:
${functions.map(f => `- ${f}`).join('\n')}

## Sample errors
${errorSummary}

## Task
For each failing function, investigate in order:
1. Is the function actually deployed? Check supabase dashboard → Edge Functions, OR trigger the supabase-deploy GitHub workflow manually
2. Does the function have all required environment variables set? Each function has its own requirements — check the function header for \`Deno.env.get\` calls
3. Does the function throw on invoke? Check supabase dashboard → Edge Functions → Logs for the specific function

## For each function
${functions.map(f => `- ${f}: look at website/supabase/functions/${f}/index.ts`).join('\n')}`
}

function buildFlakyPrompt(flakyProbes) {
  return `# ${flakyProbes.length} flaky probes — intermittent failures across runs

These probes passed some runs and failed others during the QA pass:
${flakyProbes.map(p => `- ${p.label} (${p.passes} pass / ${p.fails} fail)`).join('\n')}

## Task
Flaky tests usually indicate one of:
1. **Race conditions** — async operations finishing in different orders
2. **External state dependencies** — tests depending on data that changes between runs
3. **Rate limits** — edge functions or APIs throttling after repeated hits
4. **Cache invalidation** — stale data between runs

For each flaky probe, investigate:
- Does it depend on data that another probe modifies?
- Is there an implicit async operation that should be awaited?
- Is it calling an external API that has rate limits?

## Fix approach
Make probes idempotent and self-contained. Each probe should set up its own state, run its assertion, and clean up — without relying on previous runs.`
}

function buildUploadPrompt(uploadFailures) {
  const errors = uploadFailures.slice(0, 3).map(r => `- ${r.errors[0]?.message}`).join('\n')
  return `# Storage uploads failing

The AutoQA engine could not upload test files to Supabase storage:
${errors}

## Task
1. Check if the 'media' bucket exists in Supabase dashboard → Storage
2. If not, create it with appropriate RLS policies
3. Verify the bucket has INSERT policy for authenticated users
4. Try uploading manually from Supabase dashboard to confirm bucket health

## RLS template for storage bucket
\`\`\`sql
insert into storage.buckets (id, name, public) values ('media', 'media', false)
  on conflict (id) do nothing;

create policy "media_upload" on storage.objects for insert
  to authenticated with check (bucket_id = 'media');

create policy "media_read" on storage.objects for select
  using (bucket_id = 'media');
\`\`\``
}
