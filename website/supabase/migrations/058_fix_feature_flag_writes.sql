-- ============================================================
-- MIGRATION 058 — FIX FEATURE FLAG WRITES
-- ============================================================
-- Three bugs that together made feature flag toggles appear to
-- save but silently revert on reload:
--
-- 1. feature_flags.module had a CHECK constraint locking it to
--    exactly 15 string values (from migration 045). Any newer
--    flag (client_growth_hub, outlook_integration, show_*, etc.)
--    failed the check on insert. Adding a new feature flag
--    should NOT require a database migration — this migration
--    drops the CHECK constraint entirely.
--
-- 2. feature_flags had no INSERT or DELETE RLS policy (only
--    select + update from migration 002). Even when the CHECK
--    passed, inserts were silently blocked by RLS, so the
--    frontend's INSERT-on-update-miss fallback would fail.
--
-- 3. A companion fix in useFeatureFlags.jsx loadFlags() is
--    applied in the same commit — it was forcing the developer
--    baseline ALL_ON on every reload and ignoring DB values for
--    non-hidden flags. So even after the DB writes worked,
--    developers would still see toggles revert on reload.
--
-- After this migration + the JS fix, developers can toggle any
-- flag in Dev Tools / Business Ops and it persists correctly.
-- ============================================================

-- ─── Drop the CHECK constraint entirely ─────────────────────
-- New flags should not require a DB migration to work.
alter table feature_flags drop constraint if exists feature_flags_module_check;

-- ─── Add missing INSERT + DELETE policies ───────────────────
-- Developer-only. Matches the existing flags_update policy.
drop policy if exists flags_insert on feature_flags;
create policy "flags_insert" on feature_flags
  for insert with check (is_developer());

drop policy if exists flags_delete on feature_flags;
create policy "flags_delete" on feature_flags
  for delete using (is_developer());

-- ─── Backfill every known module as a row ──────────────────
-- Every flag the app references today gets an explicit row.
-- 'show_*' industry visibility and 'crm' default to ON to match
-- the hardcoded DEFAULT_FLAGS fallback in useFeatureFlags.jsx.
-- Everything else defaults to OFF — the developer role still
-- sees a baseline-ON experience via the ALL_ON override in the
-- hook, but clients see the correct DB-backed state.
-- on conflict (module) do nothing means existing rows are
-- preserved (nothing stomps on values already in place).
insert into feature_flags (module, enabled, updated_at) values
  -- Core modules
  ('crm', true, now()),
  ('sportify', false, now()),
  ('valora', false, now()),
  ('businessnow', false, now()),
  ('newsletter', false, now()),
  ('automations', false, now()),
  ('businessops', false, now()),
  ('developer', false, now()),
  ('marketing', false, now()),
  -- Industry availability
  ('industry_nonprofit', false, now()),
  ('industry_media', false, now()),
  ('industry_realestate', false, now()),
  ('industry_entertainment', false, now()),
  ('industry_conference', false, now()),
  ('industry_agency', false, now()),
  -- Industry visibility (signup + welcome — default ON)
  ('show_sports', true, now()),
  ('show_entertainment', true, now()),
  ('show_conference', true, now()),
  ('show_nonprofit', true, now()),
  ('show_media', true, now()),
  ('show_realestate', true, now()),
  ('show_agency', true, now()),
  ('show_other', true, now()),
  -- Client-facing Growth Tools (all default OFF — greenlit by developer)
  ('client_growth_hub', false, now()),
  ('client_marketing_hub', false, now()),
  ('client_ad_spend', false, now()),
  ('client_goal_tracker', false, now()),
  ('client_connection_manager', false, now()),
  ('client_financial_projections', false, now()),
  ('client_finance_dashboard', false, now()),
  ('client_growth_workbook', false, now()),
  ('client_report_builder', false, now()),
  ('client_strategic_workbooks', false, now()),
  -- Hidden flags
  ('outlook_integration', false, now()),
  ('email_marketing_developer', false, now()),
  ('email_marketing_public', false, now())
on conflict (module) do nothing;

-- ============================================================
-- DONE
-- ============================================================
