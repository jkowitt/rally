-- ============================================================
-- MIGRATION 100 — AI BRIEF CRON + RECORDINGS TTL
-- ============================================================
-- Schedules two daily jobs:
--   1. ai-brief-cron at 13:00 UTC (≈ 8 AM US Eastern, 9 AM EDT).
--      Fans out per-user AI brief generation so the rep finds it
--      already warm when they open the app.
--   2. cleanup-recordings at 02:00 UTC. Deletes audio files
--      older than 90 days from the 'recordings' storage bucket
--      while keeping the transcript + extracted fields.
--
-- Pattern matches migration 087 (gmail/outlook delta-sync). The
-- service-role key is read from vault.decrypted_secrets so it
-- never appears in plaintext in this migration file.
-- ============================================================

-- Idempotent: drop any prior version of these jobs before
-- (re)registering. cron.unschedule errors when the job doesn't
-- exist, so wrap in a do block that swallows the failure.
do $$
begin
  perform cron.unschedule('ai-brief-cron');
exception when others then null; end $$;
do $$
begin
  perform cron.unschedule('cleanup-recordings');
exception when others then null; end $$;

select cron.schedule(
  'ai-brief-cron',
  '0 13 * * *',  -- 13:00 UTC daily ≈ 8 AM Eastern
  $cron$
  select
    net.http_post(
      url := 'https://juaqategmrghsfkbaiap.functions.supabase.co/ai-brief-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
          ''
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 600000  -- 10 min; can run long if many users
    );
  $cron$
);

select cron.schedule(
  'cleanup-recordings',
  '0 2 * * *',  -- 02:00 UTC daily
  $cron$
  select
    net.http_post(
      url := 'https://juaqategmrghsfkbaiap.functions.supabase.co/cleanup-recordings',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
          ''
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 300000  -- 5 min
    );
  $cron$
);
