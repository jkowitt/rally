-- ============================================================
-- MIGRATION 089 — CONTRACT UPLOAD QUOTAS + USAGE TIME TRACKING
-- ============================================================
-- 1. Per-property daily quota on contract uploads (5 starter / 10 pro
--    / 50 enterprise). Stops users from blowing through Anthropic's
--    rate limits or our own AI budget.
-- 2. Lightweight usage_events table to track session presence so we
--    can surface "average time in app" in dev tools + user view,
--    sliced by user and by property.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CONTRACT UPLOAD QUOTAS
-- ────────────────────────────────────────────────────────────
-- A row per upload attempt — written by process-contract-batch
-- before the file is queued. Daily count = rows in the last 24h
-- for the property. Storing per-row instead of a counter so we can
-- show breakdowns by user + over time in dev tools.
create table if not exists contract_upload_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  file_id uuid references contract_migration_files(id) on delete set null,
  source text not null default 'bulk',  -- 'bulk' | 'individual' | 'api'
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_upload_log_property_day
  on contract_upload_log (property_id, created_at desc);

alter table contract_upload_log enable row level security;

create policy "contract_upload_log_property_read" on contract_upload_log
  for select using (property_id = get_user_property_id() or is_developer());

-- Helper: how many contract uploads has this property used today
-- (rolling 24h)? Returns 0 when nothing logged.
create or replace function contract_uploads_used_today(p_property_id uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(count(*), 0)::integer
  from contract_upload_log
  where property_id = p_property_id
    and created_at > now() - interval '24 hours'
$$;

grant execute on function contract_uploads_used_today(uuid) to authenticated;

-- Plan → daily quota mapping. Hardcoded but easy to widen later.
create or replace function contract_upload_quota_for_plan(p_plan text)
returns integer
language sql immutable as $$
  select case lower(coalesce(p_plan, 'free'))
    when 'starter'    then 5
    when 'pro'        then 10
    when 'enterprise' then 50
    when 'free'       then 1
    else 1
  end
$$;

grant execute on function contract_upload_quota_for_plan(text) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. USAGE EVENTS — session presence tracking
-- ────────────────────────────────────────────────────────────
-- The front-end pings this table every minute the tab is focused
-- (one heartbeat per minute). "Average usage time" is just count of
-- rows × 1 minute, grouped by whatever dimension we care about.
-- Cheap, no client-side timer drift, survives tab close.
create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  -- 'heartbeat' is the per-minute presence ping. Can be extended
  -- later with 'page_view', 'feature_used', etc.
  event_type text not null default 'heartbeat',
  path text,                                        -- current pathname for context
  metadata jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_usage_events_user on usage_events(user_id, occurred_at desc);
create index if not exists idx_usage_events_property on usage_events(property_id, occurred_at desc);

alter table usage_events enable row level security;
create policy "usage_events_self" on usage_events
  for all using (user_id = auth.uid() or is_developer())
  with check (user_id = auth.uid() or is_developer());

-- Roll-up view: total minutes per user over the last 30 days, plus
-- daily average. Used by both the per-user usage page and the dev
-- tools usage dashboard.
create or replace view user_usage_summary as
  with last_30 as (
    select user_id, property_id, occurred_at::date as day, count(*) as minutes
    from usage_events
    where event_type = 'heartbeat'
      and occurred_at > now() - interval '30 days'
    group by user_id, property_id, occurred_at::date
  )
  select
    u.user_id,
    u.property_id,
    sum(u.minutes) as total_minutes_30d,
    round(sum(u.minutes)::numeric / 30, 1) as avg_minutes_per_day,
    count(distinct u.day) as active_days_30d,
    max(u.day) as last_active_day
  from last_30 u
  group by u.user_id, u.property_id;

-- Roll-up view: same shape but grouped by property — for the
-- per-company / per-property column on the dev tools dashboard.
create or replace view property_usage_summary as
  with last_30 as (
    select property_id, occurred_at::date as day, count(*) as minutes,
           count(distinct user_id) as distinct_users
    from usage_events
    where event_type = 'heartbeat'
      and property_id is not null
      and occurred_at > now() - interval '30 days'
    group by property_id, occurred_at::date
  )
  select
    property_id,
    sum(minutes) as total_minutes_30d,
    round(sum(minutes)::numeric / 30, 1) as avg_minutes_per_day,
    round(sum(minutes)::numeric / nullif(sum(distinct_users), 0), 1) as avg_minutes_per_user_per_day_estimate,
    max(distinct_users) as peak_concurrent_users,
    count(distinct day) as active_days_30d
  from last_30
  group by property_id;
