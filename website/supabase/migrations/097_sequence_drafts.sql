-- ============================================================
-- MIGRATION 097 — SEQUENCE BUILDER + AI-DRAFTED OUTREACHES
-- ============================================================
-- Backs the new four-step sequence flow:
--   1. Builder    — pick touchpoint count, duration, methods
--   2. Generate   — Claude drafts a unique outreach per
--                   (prospect × step) and stores them in
--                   prospect_sequence_drafts.
--   3. Review     — rep reviews / iterates with OpenAI coach.
--   4. Apply      — approved drafts spawn tasks scheduled into
--                   the rep's daily plan.
-- ============================================================

-- ─── Sequence-level config ──────────────────────────────
alter table prospect_sequences
  add column if not exists total_touchpoints integer,
  add column if not exists duration_days integer,
  -- Ordered list of methods rep wants to cycle through, e.g.
  -- ['email','linkedin','phone'] → step 0 email, step 1 li,
  -- step 2 phone, step 3 email, …
  add column if not exists methods_order jsonb default '[]'::jsonb,
  add column if not exists drafts_generated_at timestamptz;

-- ─── Step-level config ──────────────────────────────────
-- 'task' is the catch-all for non-message touchpoints (research,
-- follow-up note, etc.). Other values map to user-visible
-- channels.
alter table prospect_sequence_steps
  add column if not exists method text default 'email',
  -- 'morning' | 'midday' | 'afternoon' | 'evening' — drives
  -- the scheduled_at hour bucket on the spawned task.
  add column if not exists time_of_day_window text default 'morning';

-- ─── Enrollment-level prefs ─────────────────────────────
alter table prospect_sequence_enrollments
  add column if not exists notify_user boolean default true,
  add column if not exists generation_status text default 'pending';
  -- pending | generating | ready | failed

-- ─── New: per-prospect, per-step drafts ─────────────────
-- One row per (enrollment × step). Claude fills body + subject;
-- the rep approves / edits / skips. Approved drafts spawn a
-- task scheduled at scheduled_at and link back via task_id.
create table if not exists prospect_sequence_drafts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  enrollment_id uuid not null references prospect_sequence_enrollments(id) on delete cascade,
  step_id uuid references prospect_sequence_steps(id) on delete set null,
  step_index integer not null,

  -- Channel + scheduling
  method text not null check (method in ('email','linkedin','phone','task')),
  scheduled_at timestamptz,

  -- Content
  subject text,
  body text not null,

  -- Workflow state
  status text not null default 'pending'
    check (status in ('pending','approved','sent','skipped')),
  task_id uuid references tasks(id) on delete set null,

  -- Provenance + iteration trail
  generated_by text default 'claude',
  generated_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references profiles(id) on delete set null,
  -- Each entry: { ts, model, prompt, body }
  iteration_history jsonb default '[]'::jsonb,

  unique(enrollment_id, step_index)
);

create index if not exists idx_seq_drafts_enrollment
  on prospect_sequence_drafts(enrollment_id, step_index);
create index if not exists idx_seq_drafts_status
  on prospect_sequence_drafts(property_id, status);
create index if not exists idx_seq_drafts_scheduled
  on prospect_sequence_drafts(property_id, scheduled_at)
  where scheduled_at is not null and status in ('pending','approved');

alter table prospect_sequence_drafts enable row level security;

create policy "seq_drafts_property_access" on prospect_sequence_drafts
  for all using (
    property_id in (select property_id from profiles where id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'developer')
  );
