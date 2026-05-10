-- ============================================================
-- MIGRATION 099 — AI BRIEF + ACTIVITY CAPTURE
-- ============================================================
-- Two new surfaces:
--   1. ai_briefs — daily morning brief stored per user/property.
--      The ai-daily-brief edge function reads first-party data
--      (closed-won deals, recent activity, signals, sequence
--      response rates) and writes a structured JSONB blob the
--      Dashboard widget renders. Stored so the rep gets a stable
--      snapshot (and we don't burn API credits regenerating it
--      on every page load).
--   2. activity_recordings — per-call/meeting audio + transcript
--      + AI-extracted metadata. The transcribe-activity edge
--      function ingests audio (recorded in browser or uploaded),
--      runs Whisper + Claude, creates a row here, then promotes
--      the structured output into a real activities row + tasks.
--
-- Also extends activities with a `source` column so the timeline
-- can show where an event came from (manual entry, voice note,
-- file upload, email forward).
-- ============================================================

-- ─── ai_briefs ─────────────────────────────────────────────────
create table if not exists ai_briefs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  brief_date date not null default (current_date),
  -- payload shape:
  --   { generated_at, model, prospects: [...], emails: [...],
  --     deals_to_push: [...], renewal_risks: [...], market_signals: [...] }
  payload jsonb not null default '{}'::jsonb,
  status text check (status in ('generating','ready','failed')) default 'ready',
  error text,
  generated_at timestamptz default now(),
  created_at timestamptz default now()
);

create unique index if not exists idx_ai_briefs_user_date
  on ai_briefs(user_id, brief_date);
create index if not exists idx_ai_briefs_property
  on ai_briefs(property_id, brief_date desc);

alter table ai_briefs enable row level security;
drop policy if exists "ai_briefs_property_access" on ai_briefs;
create policy "ai_briefs_property_access" on ai_briefs for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- ─── activity_recordings ───────────────────────────────────────
create table if not exists activity_recordings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  deal_id uuid references deals on delete set null,
  contact_id uuid,
  user_id uuid references profiles(id) on delete set null,

  -- Storage
  audio_path text,                 -- path in 'recordings' bucket
  audio_mime text,
  duration_seconds integer,
  source text check (source in ('voice_note','file_upload','email_forward')) default 'voice_note',

  -- Transcript + extracted structure
  transcript text,
  summary text,
  detected_activity_type text,     -- Call / Meeting / Note / etc.
  sentiment text check (sentiment in ('positive','neutral','negative')) ,
  commitment_score integer,        -- 0-100, AI-inferred buying intent
  action_items jsonb default '[]'::jsonb,  -- [{title, due_in_days, priority}]
  contact_updates jsonb default '{}'::jsonb,
  competitor_mentions text[],

  -- Linkage to the activities table once promoted
  activity_id uuid,
  promoted_at timestamptz,

  status text check (status in ('uploaded','transcribing','transcribed','failed','promoted')) default 'uploaded',
  error text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_recordings_deal on activity_recordings(deal_id);
create index if not exists idx_recordings_property on activity_recordings(property_id, created_at desc);
create index if not exists idx_recordings_status on activity_recordings(status);

alter table activity_recordings enable row level security;
drop policy if exists "activity_recordings_property_access" on activity_recordings;
create policy "activity_recordings_property_access" on activity_recordings for all using (
  property_id in (select property_id from profiles where id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
);

-- ─── activities.source ─────────────────────────────────────────
-- Lets the timeline render a small badge showing where the row
-- came from. Default 'manual' for everything pre-existing.
alter table activities
  add column if not exists source text check (source in ('manual','voice_note','file_upload','email_forward','automation','sequence')) default 'manual';
alter table activities
  add column if not exists recording_id uuid references activity_recordings(id) on delete set null;

-- ─── recordings storage bucket ─────────────────────────────────
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

do $$
begin
  drop policy if exists "recordings_upload" on storage.objects;
  drop policy if exists "recordings_read" on storage.objects;
  drop policy if exists "recordings_delete" on storage.objects;

  create policy "recordings_upload" on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'recordings');

  create policy "recordings_read" on storage.objects
    for select
    to authenticated
    using (bucket_id = 'recordings');

  create policy "recordings_delete" on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'recordings');
exception when others then
  raise notice 'recordings bucket policies: %', sqlerrm;
end $$;
