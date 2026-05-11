-- ============================================================
-- MIGRATION 101 — AGENTIC AI: DEAL RESEARCH + EVENT-DIRTY BRIEFS
-- ============================================================
-- Two pieces of the agentic loop:
--
--   1. deal_research — output of the background research agent
--      (ai-research-deal edge fn). One row per (deal_id, kind);
--      newest row wins. The agent picks deals that have no
--      recent research and runs a multi-step pass (company news,
--      exec moves, prior sponsorships, comparable closed-wons)
--      to produce a brief the rep can read before next outreach.
--
--   2. ai_briefs.dirty_since — when a new prospect_signal or a
--      promoted activity_recording or a completed task changes
--      the picture for a user, we stamp dirty_since on their
--      current brief. The UI shows a "New signals — refresh"
--      banner so the rep knows the morning brief is stale. The
--      cron pre-warmer also regenerates dirty briefs.
--
-- Triggers live in this migration so the dirty flag is set
-- automatically across the app — no application code needs to
-- remember to do it.
-- ============================================================

-- ─── 1. deal_research ──────────────────────────────────────────
create table if not exists deal_research (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  deal_id uuid not null references deals on delete cascade,
  kind text not null default 'agent_brief' check (kind in ('agent_brief','company_news','exec_changes','sponsorship_history','comparable_wins')),
  -- payload shape varies by kind. For 'agent_brief':
  --   { headline, summary, talking_points: [...], red_flags: [...],
  --     comparable_wins: [...], sources: [...], confidence }
  payload jsonb not null default '{}'::jsonb,
  sources jsonb default '[]'::jsonb,       -- [{ url, title, snippet }]
  model text,
  generated_at timestamptz default now(),
  generated_by text default 'agent',       -- 'agent' | 'manual' | 'cron'
  created_at timestamptz default now()
);

create index if not exists idx_deal_research_deal on deal_research(deal_id, kind, generated_at desc);
create index if not exists idx_deal_research_property on deal_research(property_id, generated_at desc);

alter table deal_research enable row level security;
drop policy if exists "deal_research_property_access" on deal_research;
create policy "deal_research_property_access" on deal_research for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- ─── 2. ai_briefs.dirty_since ──────────────────────────────────
-- The agent-loop signal — when this is non-null AND newer than
-- generated_at, the brief is considered stale. The UI prompts the
-- rep to refresh, and the cron pre-warms it.
alter table ai_briefs
  add column if not exists dirty_since timestamptz;
create index if not exists idx_ai_briefs_dirty on ai_briefs(user_id, dirty_since)
  where dirty_since is not null;

-- ─── 3. Mark-dirty helper ──────────────────────────────────────
-- Stamps every brief belonging to the given property as dirty.
-- The cron + the UI refresh banner key off this. SECURITY DEFINER
-- so triggers (running as the inserting user) can flip it across
-- workspace members.
create or replace function mark_briefs_dirty(p_property_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update ai_briefs
     set dirty_since = now()
   where property_id = p_property_id
     and brief_date = current_date
     and (dirty_since is null or dirty_since < now());
$$;

grant execute on function mark_briefs_dirty(uuid) to authenticated, service_role;

-- ─── 4. Triggers — three event sources ─────────────────────────
-- 4a. New buying signal on a known account.
create or replace function trg_signal_marks_briefs_dirty()
returns trigger
language plpgsql
as $$
begin
  perform mark_briefs_dirty(new.property_id);
  return new;
end;
$$;
drop trigger if exists prospect_signals_mark_briefs on prospect_signals;
create trigger prospect_signals_mark_briefs
  after insert on prospect_signals
  for each row execute function trg_signal_marks_briefs_dirty();

-- 4b. Recording promoted (transcript + extraction landed).
-- We only fire when the row transitions INTO promoted state to
-- avoid duplicate updates on the recording's other status writes.
create or replace function trg_recording_marks_briefs_dirty()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'promoted' and (old.status is null or old.status <> 'promoted') then
    perform mark_briefs_dirty(new.property_id);
  end if;
  return new;
end;
$$;
drop trigger if exists activity_recordings_mark_briefs on activity_recordings;
create trigger activity_recordings_mark_briefs
  after update on activity_recordings
  for each row execute function trg_recording_marks_briefs_dirty();

-- 4c. Task transitions to Done. The rep just cleared something
-- off the list; tomorrow's brief should reflect that — but more
-- importantly, today's brief shouldn't keep recommending that
-- task as a "deal to push."
create or replace function trg_task_done_marks_briefs_dirty()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Done' and (old.status is null or old.status <> 'Done') then
    perform mark_briefs_dirty(new.property_id);
  end if;
  return new;
end;
$$;
drop trigger if exists tasks_done_mark_briefs on tasks;
create trigger tasks_done_mark_briefs
  after update on tasks
  for each row execute function trg_task_done_marks_briefs_dirty();

-- ─── 5. Schedule the research runner cron ──────────────────────
-- Every 2h during business-ish hours. Picks up to BATCH_PER_RUN
-- deals each pass; small enough to keep Anthropic spend bounded
-- but frequent enough that a deal added today gets researched
-- before the rep opens it tomorrow.
do $$
begin
  perform cron.unschedule('ai-research-runner');
exception when others then null; end $$;

select cron.schedule(
  'ai-research-runner',
  '17 */2 * * *',  -- xx:17 every 2 hours (offset so it doesn't collide with the brief cron)
  $cron$
  select
    net.http_post(
      url := 'https://juaqategmrghsfkbaiap.functions.supabase.co/ai-research-runner',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
          ''
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 600000
    );
  $cron$
);
