-- ============================================================
-- MIGRATION 090 — HUB-LEVEL FEATURE FLAGS
-- ============================================================
-- Pre-seed feature_flags rows for the two new hub-level toggles
-- introduced in src/hooks/useFeatureFlags.tsx:
--
--   • hub_accounts      — Account Management hub. Default ON.
--                         Most tiers need it; developers can turn
--                         it off per-tenant for CRM-only plans.
--
--   • hub_business_ops  — Business Operations hub. Default OFF.
--                         Hidden from non-developers until the
--                         developer flips it on in Dev Tools.
--                         Reps don't need ops/billing tooling.
--
-- ON CONFLICT preserves any value an admin already set; only the
-- first install picks up the defaults.
-- ============================================================

insert into feature_flags (module, enabled) values
  ('hub_accounts',     true),
  ('hub_business_ops', false)
on conflict (module) do nothing;
