-- ============================================================
-- MIGRATION 064 — FEATURE FLAG GRAVEYARD TRACKING
-- ============================================================
-- Adds lifecycle metadata to feature_flags so dead flags are
-- visible and retire-able:
--
--   first_seen_at      — when the flag row was first inserted
--   last_flipped_at    — when the enabled column last changed
--   last_flipped_by    — who flipped it
--
-- Plus a view `feature_flags_audit` that joins this metadata
-- with a "days_since_flipped" column for easy triage.
--
-- A flag that's been off for 90+ days and never been flipped on
-- is a strong candidate for deletion. A flag that was flipped
-- on months ago and has been on ever since is a candidate for
-- hardcoding.
-- ============================================================

alter table feature_flags
  add column if not exists first_seen_at timestamptz default now(),
  add column if not exists last_flipped_at timestamptz,
  add column if not exists last_flipped_by uuid references auth.users(id) on delete set null;

-- Backfill first_seen_at for existing rows (they've been around
-- at least as long as the table itself).
update feature_flags
set first_seen_at = coalesce(first_seen_at, updated_at, now())
where first_seen_at is null;

-- ─── Trigger: update last_flipped_at on enabled change ──
create or replace function feature_flags_track_flip()
returns trigger as $$
begin
  -- Only fire when the enabled column actually changed
  if (tg_op = 'UPDATE' and old.enabled is distinct from new.enabled) then
    new.last_flipped_at := now();
    -- last_flipped_by is populated by the caller (set-feature-flag
    -- edge function writes it explicitly). If not set, leave it null.
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists feature_flags_flip_trigger on feature_flags;
create trigger feature_flags_flip_trigger
  before update on feature_flags
  for each row
  execute function feature_flags_track_flip();

-- ─── Audit view: flag lifecycle at a glance ──────────────
create or replace view feature_flags_audit as
select
  f.module,
  f.enabled,
  f.first_seen_at,
  f.last_flipped_at,
  f.last_flipped_by,
  extract(day from (now() - coalesce(f.last_flipped_at, f.first_seen_at)))::integer as days_since_last_change,
  extract(day from (now() - f.first_seen_at))::integer as days_since_created,
  case
    when f.last_flipped_at is null and f.first_seen_at < now() - interval '90 days' and f.enabled = false
      then 'dead_candidate'
    when f.last_flipped_at is null and f.first_seen_at < now() - interval '90 days' and f.enabled = true
      then 'promote_candidate'
    when f.last_flipped_at is not null and f.last_flipped_at < now() - interval '90 days' and f.enabled = true
      then 'stable_on'
    when f.last_flipped_at is not null and f.last_flipped_at < now() - interval '90 days' and f.enabled = false
      then 'stable_off'
    else 'active'
  end as lifecycle_state,
  f.updated_at
from feature_flags f;

-- Developers/admins only
alter view feature_flags_audit set (security_invoker = on);

-- ─── Helper RPC: list dead flags ─────────────────────────
-- Returns flags that have been OFF for >N days and never flipped
-- on. Used by the developer console.
create or replace function get_dead_feature_flags(p_min_age_days integer default 90)
returns table (
  module text,
  enabled boolean,
  days_since_created integer,
  lifecycle_state text
) as $$
  select
    module,
    enabled,
    extract(day from (now() - first_seen_at))::integer as days_since_created,
    lifecycle_state
  from feature_flags_audit
  where lifecycle_state = 'dead_candidate'
    and days_since_created >= p_min_age_days
  order by days_since_created desc;
$$ language sql stable security definer;

grant execute on function get_dead_feature_flags(integer) to authenticated, service_role;
