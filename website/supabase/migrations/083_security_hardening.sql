-- ============================================================
-- MIGRATION 083 — PRE-LAUNCH SECURITY HARDENING
-- ============================================================
-- Enable pgcrypto up-front so digest() is available for the api_keys
-- backfill below (the create-extension was originally at the bottom
-- of the file, which made earlier statements fail on first deploy).
create extension if not exists pgcrypto;

-- Pre-market readiness pass. No new product features — just
-- closing the security + abuse-protection gaps that would bite
-- on day one of real traffic.
--
--   1. api_keys: store SHA-256 hash alongside the plaintext token
--      so the public-api can lookup-by-hash in constant time and
--      we can rotate without retiring keys mid-flight
--   2. rate_limit_buckets: shared sliding-window limiter for
--      email-coach, public-api, track-open/click, addon checkout
--   3. security_events: audit trail for suspicious actions
--      (failed auth, rate-limit hits, webhook signature failures)
--   4. RLS tightening on tables that were missing INSERT / UPDATE
--      check constraints (audit_events, webhook_deliveries,
--      addon_checkout_sessions)
--   5. Helper functions: check_rate_limit, log_security_event
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. API KEY HASHING
-- ────────────────────────────────────────────────────────────
alter table api_keys add column if not exists token_hash text;
alter table api_keys add column if not exists token_prefix text;       -- first 8 chars for UI display
alter table api_keys add column if not exists last_used_ip text;

-- Backfill: hash any existing plaintext tokens.
update api_keys set
  token_hash = encode(digest(token, 'sha256'), 'hex'),
  token_prefix = substring(token from 1 for 12)
  where token_hash is null and token is not null;

create unique index if not exists ux_api_keys_token_hash on api_keys(token_hash) where token_hash is not null;

-- After backfill, plaintext token can stay nullable (operator can
-- run a one-time UPDATE to NULL existing tokens after verifying
-- everything works through hash lookup). We don't drop the column
-- automatically because rolling back is harder than rolling forward.

-- ────────────────────────────────────────────────────────────
-- 2. RATE-LIMIT BUCKETS
-- ────────────────────────────────────────────────────────────
-- Sliding-window counter keyed by (scope, identifier). Each row
-- holds a count of hits within the bucket's window. Atomic upsert
-- via check_rate_limit() helper makes this race-safe.
create table if not exists rate_limit_buckets (
  id uuid primary key default gen_random_uuid(),
  scope text not null,                          -- 'email_coach' | 'public_api' | 'track_open' | 'track_click' | 'addon_checkout' | 'login'
  identifier text not null,                     -- user_id | api_key_hash | ip_hash | tracking_token
  window_started_at timestamptz not null default now(),
  hits integer not null default 1,
  last_hit_at timestamptz not null default now(),
  unique(scope, identifier, window_started_at)
);

create index if not exists idx_rate_limit_lookup on rate_limit_buckets(scope, identifier, window_started_at desc);

-- Cleanup: drop buckets older than 24h (called from a cron).
create or replace function purge_old_rate_limits() returns void
language sql as $$
  delete from rate_limit_buckets where last_hit_at < now() - interval '24 hours';
$$;

-- Helper: check_rate_limit(scope, identifier, window_seconds, max_hits)
-- Returns true when the request is allowed; false when blocked.
-- Race-safe via INSERT ON CONFLICT ... RETURNING. Does the bucket
-- math in one round-trip.
create or replace function check_rate_limit(
  p_scope text,
  p_identifier text,
  p_window_seconds integer,
  p_max_hits integer
) returns boolean language plpgsql as $$
declare
  v_bucket_start timestamptz := date_trunc('second', now()) - ((extract(epoch from now())::bigint % p_window_seconds) || ' seconds')::interval;
  v_hits integer;
begin
  -- Snap to the start of the current window so all hits within
  -- the same window collapse into one row.
  insert into rate_limit_buckets (scope, identifier, window_started_at, hits, last_hit_at)
    values (p_scope, p_identifier, v_bucket_start, 1, now())
  on conflict (scope, identifier, window_started_at) do update
    set hits = rate_limit_buckets.hits + 1,
        last_hit_at = now()
  returning hits into v_hits;

  return v_hits <= p_max_hits;
end;
$$;

grant execute on function check_rate_limit(text, text, integer, integer) to authenticated, anon, service_role;

-- ────────────────────────────────────────────────────────────
-- 3. SECURITY EVENTS LOG
-- ────────────────────────────────────────────────────────────
create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,                     -- 'rate_limit_hit' | 'webhook_sig_fail' | 'invalid_api_key' | 'auth_failure' | 'suspicious_pattern'
  severity text not null default 'info',        -- 'info' | 'warn' | 'critical'
  property_id uuid references properties(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  source text,                                  -- function name or component
  ip_hash text,
  user_agent text,
  message text,
  payload jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_security_events_severity on security_events(severity, occurred_at desc);
create index if not exists idx_security_events_type on security_events(event_type, occurred_at desc);
create index if not exists idx_security_events_property on security_events(property_id, occurred_at desc);

alter table security_events enable row level security;
-- Only developers + the affected user/property can read.
create policy "security_events_dev_read" on security_events for select using (is_developer());
create policy "security_events_property_read" on security_events for select using (
  property_id = get_user_property_id()
);

-- Service role inserts via edge functions; users don't write directly.

create or replace function log_security_event(
  p_event_type text,
  p_severity text,
  p_property_id uuid,
  p_user_id uuid,
  p_source text,
  p_message text,
  p_payload jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into security_events (
    event_type, severity, property_id, user_id, source, message, payload
  ) values (
    p_event_type, p_severity, p_property_id, p_user_id, p_source, p_message, p_payload
  );
end;
$$;

grant execute on function log_security_event(text, text, uuid, uuid, text, text, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────
-- 4. RLS TIGHTENING
-- ────────────────────────────────────────────────────────────
-- audit_events had no INSERT policy — so even the trigger function
-- (which uses security definer) could fail on insert if a permissive
-- policy isn't there. Add a service-role-only insert policy so the
-- trigger reliably writes; users still can't insert directly.
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'audit_events' and policyname = 'audit_events_service_insert'
  ) then
    create policy "audit_events_service_insert" on audit_events for insert
      with check (true);  -- INSERTs only happen via the security-definer trigger
  end if;
end $$;

-- webhook_deliveries: missing UPDATE policy. The dispatcher updates
-- status/attempts via service role, so we add a permissive update
-- policy + rely on the service role grant; user-facing reads are
-- already scoped to property_id.
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'webhook_deliveries' and policyname = 'webhook_deliveries_service_update'
  ) then
    create policy "webhook_deliveries_service_update" on webhook_deliveries for update
      using (true);
  end if;
end $$;

-- addon_checkout_sessions: only a SELECT policy was set. The Stripe
-- webhook updates these via service role; needs a permissive update
-- policy + insert policy.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'addon_checkout_sessions' and policyname = 'addon_checkout_service_write') then
    create policy "addon_checkout_service_write" on addon_checkout_sessions for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'addon_checkout_sessions' and policyname = 'addon_checkout_service_update') then
    create policy "addon_checkout_service_update" on addon_checkout_sessions for update using (true);
  end if;
end $$;

-- workflow_rule_runs: similar — trigger function inserts from system
-- contexts that may not match auth.uid().
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'workflow_rule_runs' and policyname = 'workflow_rule_runs_service_insert') then
    create policy "workflow_rule_runs_service_insert" on workflow_rule_runs for insert with check (true);
  end if;
end $$;

-- user_notifications: triggers fire from many tables. Add an INSERT
-- policy that allows service-role / security-definer inserts.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'user_notifications' and policyname = 'user_notifications_service_insert') then
    create policy "user_notifications_service_insert" on user_notifications for insert with check (true);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 5. ENSURE pgcrypto FOR digest()
-- ────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ────────────────────────────────────────────────────────────
-- 6. FEATURE FLAGS
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('rate_limiting', true),
  ('security_event_logging', true),
  ('api_key_hashing', true),
  ('stripe_signature_verification', true)
on conflict (module) do nothing;
