-- ============================================================
-- MIGRATION 092 — DISABLE SIDE-EFFECT TRIGGERS ON 'Contracted'
-- ============================================================
-- 091 wrapped four triggers in EXCEPTION handlers, but it missed
-- two more that also fire on stage='Contracted':
--   • trg_start_onboarding_on_contracted   (079)
--   • deals_auto_project                   (067)
--
-- Plus a postmortem-on-outcome trigger from 075 fires on Renewed/
-- Contracted/Declined transitions.
--
-- Until the AM / fulfillment / project side is in production the
-- safest move is to DISABLE all of these side-effect triggers
-- outright. The deal.stage column update itself, plus the audit
-- log, plus stage_entered_at stamping, are all preserved.
--
-- Re-enable individually when the consumer side is ready:
--   alter table deals enable trigger trg_autocreate_contract;
-- ============================================================

-- Each ALTER is wrapped in a DO block so a missing trigger (older
-- environments that never ran 067/075/079/080) is a no-op instead
-- of a hard error.

do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'trg_autocreate_contract') then
    execute 'alter table deals disable trigger trg_autocreate_contract';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'trg_welcome_enroll') then
    execute 'alter table deals disable trigger trg_welcome_enroll';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'trg_notify_team_stage') then
    execute 'alter table deals disable trigger trg_notify_team_stage';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'trg_start_onboarding_on_contracted') then
    execute 'alter table deals disable trigger trg_start_onboarding_on_contracted';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'deals_auto_project') then
    execute 'alter table deals disable trigger deals_auto_project';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'trg_create_postmortem') then
    execute 'alter table deals disable trigger trg_create_postmortem';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'deals_notify_stage_change') then
    execute 'alter table deals disable trigger deals_notify_stage_change';
  end if;
end $$;

-- Cascade: spawn_fulfillment fires on contract_benefits insert,
-- which only happens via the autocreate_contract trigger we just
-- disabled. Disable it too in case anything else inserts benefits.
do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'trg_spawn_fulfillment') then
    execute 'alter table contract_benefits disable trigger trg_spawn_fulfillment';
  end if;
end $$;
