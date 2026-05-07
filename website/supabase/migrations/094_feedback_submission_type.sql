-- ============================================================
-- MIGRATION 094 — submission_type ON feature_suggestions
-- ============================================================
-- The same form + table now backs two surfaces:
--   • "Suggest a Feature" button in the sidebar
--   • "Report an Issue" floating bubble (bottom-right)
--
-- A submission_type column lets the dev tools triage feature
-- requests vs bug reports without overloading the existing
-- category enum (which is locked to feature areas).
-- ============================================================

alter table feature_suggestions
  add column if not exists submission_type text
  check (submission_type in ('feature', 'issue'))
  default 'feature';

create index if not exists idx_suggestions_type
  on feature_suggestions(submission_type, created_at desc);

-- Backfill: every existing row was a feature suggestion.
update feature_suggestions set submission_type = 'feature'
  where submission_type is null;
