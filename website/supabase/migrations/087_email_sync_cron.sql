-- ============================================================
-- MIGRATION 087 — EMAIL SYNC CRON JOBS
-- ============================================================
-- The Outlook + Gmail delta-sync edge functions ship with the
-- codebase but were never registered with pg_cron. Without a
-- schedule, inboxes only update when the user clicks "Sync now"
-- in the UI — defeats the point of an integrated inbox.
--
-- Schedule both at every-5-minutes. The runners are idempotent
-- (they only fetch deltas since the last cursor) so overlap is
-- safe. Each call hits the edge function with the service-role
-- key from vault.decrypted_secrets — same pattern as the digest
-- cron in migration 063.
-- ============================================================

-- Idempotent: drop any prior version of these jobs before
-- (re)registering. cron.unschedule errors when the job doesn't
-- exist, so wrap in a do block that swallows the failure.
do $$
begin
  perform cron.unschedule('outlook-delta-sync');
exception when others then null; end $$;
do $$
begin
  perform cron.unschedule('gmail-delta-sync');
exception when others then null; end $$;

select cron.schedule(
  'outlook-delta-sync',
  '*/5 * * * *',  -- every 5 minutes
  $cron$
  select
    net.http_post(
      url := 'https://juaqategmrghsfkbaiap.functions.supabase.co/outlook-delta-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
          ''
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);

select cron.schedule(
  'gmail-delta-sync',
  '*/5 * * * *',  -- every 5 minutes
  $cron$
  select
    net.http_post(
      url := 'https://juaqategmrghsfkbaiap.functions.supabase.co/gmail-delta-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
          ''
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);

-- Also schedule outlook-token-refresh hourly so access tokens stay
-- fresh ahead of the 60-minute Microsoft expiry.
do $$
begin
  perform cron.unschedule('outlook-token-refresh');
exception when others then null; end $$;

select cron.schedule(
  'outlook-token-refresh',
  '0 * * * *',  -- top of every hour
  $cron$
  select
    net.http_post(
      url := 'https://juaqategmrghsfkbaiap.functions.supabase.co/outlook-token-refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
          ''
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);
