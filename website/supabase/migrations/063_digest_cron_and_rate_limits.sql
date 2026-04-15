-- ============================================================
-- MIGRATION 063 — DIGEST CRON + AI FUNCTION RATE LIMITS
-- ============================================================
-- Two concerns bundled because they're small and both require
-- pg_cron + pg_net extensions to be enabled:
--
-- 1. digest_issues auto-publish: every 5 minutes pg_cron calls
--    the digest-scheduled-publish edge function, which promotes
--    any 'scheduled' rows whose scheduled_for <= now() to
--    'published' and dispatches the email.
--
-- 2. ai_function_rate_limits: per-user sliding window table
--    used by the Anthropic-calling edge functions to cap spend
--    and prevent a compromised token from burning credits.
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ============================================================
-- 0. EMAIL CAMPAIGNS — add parent_campaign_id for resends
-- ============================================================
-- digest-resend-unopened creates a new email_campaigns row that
-- targets only unopened subscribers from a previous campaign.
-- We link the two with parent_campaign_id so the analytics UI
-- can group resends with their parent.
alter table email_campaigns
  add column if not exists parent_campaign_id uuid
  references email_campaigns(id) on delete set null;

create index if not exists idx_campaigns_parent
  on email_campaigns(parent_campaign_id)
  where parent_campaign_id is not null;

-- ============================================================
-- 1. AI FUNCTION RATE LIMITS
-- ============================================================
-- Simple per-user, per-function sliding window. Each call
-- inserts a row; old rows (>60 min) can be pruned periodically.
-- Callers query `count(*)` in the last N minutes for enforcement.
create table if not exists ai_function_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  function_name text not null,
  called_at timestamptz not null default now(),
  credits_charged integer default 0,
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_airl_user_fn_time
  on ai_function_rate_limits(user_id, function_name, called_at desc);

create index if not exists idx_airl_cleanup
  on ai_function_rate_limits(called_at);

alter table ai_function_rate_limits enable row level security;

-- Users can see their own rate limit history (for transparency),
-- developers/admins can see everything.
drop policy if exists airl_own_read on ai_function_rate_limits;
create policy airl_own_read on ai_function_rate_limits
  for select
  using (
    user_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role in ('developer', 'admin', 'businessops'))
  );

-- Only service role can insert (edge functions write through service key)
-- No client-side insert policy — edge functions bypass RLS.

-- Helper function: count calls in the last N minutes for a given user + function
create or replace function count_ai_calls(
  p_user_id uuid,
  p_function_name text,
  p_window_minutes integer default 60
)
returns integer as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from ai_function_rate_limits
  where user_id = p_user_id
    and function_name = p_function_name
    and called_at >= now() - (p_window_minutes || ' minutes')::interval;
  return coalesce(v_count, 0);
end;
$$ language plpgsql stable security definer;

grant execute on function count_ai_calls(uuid, text, integer) to authenticated, service_role;

-- ============================================================
-- 2. CRON: auto-publish scheduled digest issues
-- ============================================================
-- Runs every 5 minutes. The edge function URL + service key are
-- stored in database settings via pg_net.http_post.
--
-- Set these values manually in the Supabase dashboard under
-- Database > Extensions > pg_cron, or run the following once:
--
--   select vault.create_secret('https://juaqategmrghsfkbaiap.functions.supabase.co', 'functions_base_url');
--   select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
--
-- The job below reads from app settings via current_setting().
-- If the settings aren't set, the cron job will log an error but
-- won't crash — nothing else depends on it.

-- Unschedule old versions of this job if they exist, so re-runs
-- of this migration don't accumulate duplicates.
do $$
begin
  perform cron.unschedule('digest-scheduled-publish');
exception
  when others then
    -- Job doesn't exist yet; that's fine.
    null;
end $$;

-- Schedule the cron job. It POSTs to the edge function with the
-- service role bearer. If the settings aren't configured yet,
-- the job will be a no-op HTTP call but won't raise.
select cron.schedule(
  'digest-scheduled-publish',
  '*/5 * * * *',  -- every 5 minutes
  $cron$
  select
    net.http_post(
      url := coalesce(current_setting('app.functions_base_url', true), 'https://juaqategmrghsfkbaiap.functions.supabase.co') || '/digest-scheduled-publish',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.service_role_key', true), '')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $cron$
);

-- ============================================================
-- 3. CRON: prune old rate limit rows
-- ============================================================
-- Runs daily at 3am, deletes rate_limit rows older than 7 days.
do $$
begin
  perform cron.unschedule('ai-rate-limits-prune');
exception
  when others then null;
end $$;

select cron.schedule(
  'ai-rate-limits-prune',
  '0 3 * * *',
  $cron$
  delete from ai_function_rate_limits
  where called_at < now() - interval '7 days';
  $cron$
);

-- ============================================================
-- NOTE TO OPERATOR
-- ============================================================
-- After running this migration, set the two app settings via SQL:
--
--   alter database postgres set app.functions_base_url = 'https://juaqategmrghsfkbaiap.functions.supabase.co';
--   alter database postgres set app.service_role_key = '<your-service-role-key>';
--
-- The second one is secret; put it in Supabase Vault instead if
-- you're security-conscious:
--
--   select vault.create_secret('<key>', 'service_role_key');
--
-- ============================================================
