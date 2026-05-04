-- ============================================================
-- MIGRATION 073 — OUTREACH TRACKING + SEQUENCES + OPEN/CLICK TRACKING
-- ============================================================
-- Records every outbound email at the contact + deal level so the
-- CRM can show a real outreach history (last sent, last received,
-- counts, response rates). Adds infrastructure for:
--
--   1. Per-contact counters: last_email_sent_at, last_email_received_at,
--      outreach_count, response_count.
--   2. outreach_log: one row per outbound send (provider, message_id,
--      opened_at, clicked_at, replied_at) — feeds open/click tracking
--      pixels and reply attribution.
--   3. Prospect sequences: 3-touch cadence specifically for outreach
--      to CRM contacts (separate from the existing
--      email_sequence_enrollments which is for in-app user nurture).
--   4. email_tracking_clicks: per-link click telemetry.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CONTACT-LEVEL COUNTERS
-- ────────────────────────────────────────────────────────────
alter table contacts add column if not exists last_email_sent_at timestamptz;
alter table contacts add column if not exists last_email_received_at timestamptz;
alter table contacts add column if not exists last_email_subject text;
alter table contacts add column if not exists outreach_count integer not null default 0;
alter table contacts add column if not exists response_count integer not null default 0;

create index if not exists idx_contacts_last_sent on contacts(last_email_sent_at desc nulls last);
create index if not exists idx_contacts_last_received on contacts(last_email_received_at desc nulls last);

-- ────────────────────────────────────────────────────────────
-- 2. OUTREACH LOG
-- ────────────────────────────────────────────────────────────
create table if not exists outreach_log (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  provider text not null,                  -- 'outlook' | 'gmail' | 'manual'
  direction text not null default 'outbound', -- 'outbound' | 'inbound'
  message_id text,                         -- provider message id (for dedup)
  thread_id text,
  to_email text,
  to_name text,
  subject text,
  body_preview text,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  open_count integer not null default 0,
  clicked_at timestamptz,
  click_count integer not null default 0,
  replied_at timestamptz,
  bounced boolean not null default false,
  sequence_enrollment_id uuid,             -- FK below after table created
  sequence_step_index integer,
  tracking_token text unique,              -- for open/click pixel
  created_at timestamptz not null default now()
);

create index if not exists idx_outreach_log_property on outreach_log(property_id, sent_at desc);
create index if not exists idx_outreach_log_contact on outreach_log(contact_id, sent_at desc);
create index if not exists idx_outreach_log_deal on outreach_log(deal_id, sent_at desc);
create index if not exists idx_outreach_log_user on outreach_log(user_id, sent_at desc);
create index if not exists idx_outreach_log_token on outreach_log(tracking_token);
-- Partial unique on (provider, message_id) so sync can upsert without dups.
create unique index if not exists ux_outreach_log_provider_msg
  on outreach_log(provider, message_id)
  where message_id is not null;

alter table outreach_log enable row level security;

create policy "outreach_log_property_select" on outreach_log for select using (
  property_id = get_user_property_id() or is_developer()
);
create policy "outreach_log_property_insert" on outreach_log for insert with check (
  property_id = get_user_property_id() or is_developer()
);
create policy "outreach_log_property_update" on outreach_log for update using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 3. PROSPECT SEQUENCES (separate from user-nurture sequences)
-- ────────────────────────────────────────────────────────────
-- prospect_sequences: a named cadence created by a property
-- (e.g., "3-touch warm intro"). Steps are days_offset + template.
create table if not exists prospect_sequences (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  is_active boolean not null default true,
  total_steps integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_prospect_sequences_property on prospect_sequences(property_id);

alter table prospect_sequences enable row level security;
create policy "prospect_sequences_property_all" on prospect_sequences for all using (
  property_id = get_user_property_id() or is_developer()
);

create table if not exists prospect_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references prospect_sequences(id) on delete cascade,
  step_index integer not null,            -- 0-based
  day_offset integer not null,            -- days after enrollment (or after previous step)
  subject_template text,
  body_template text not null,
  created_at timestamptz not null default now(),
  unique(sequence_id, step_index)
);

create index if not exists idx_prospect_sequence_steps_seq on prospect_sequence_steps(sequence_id, step_index);

alter table prospect_sequence_steps enable row level security;
create policy "prospect_sequence_steps_property_all" on prospect_sequence_steps for all using (
  exists (
    select 1 from prospect_sequences ps
    where ps.id = prospect_sequence_steps.sequence_id
      and (ps.property_id = get_user_property_id() or is_developer())
  )
);

create table if not exists prospect_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references prospect_sequences(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  enrolled_by uuid references auth.users(id) on delete set null,
  enrolled_at timestamptz not null default now(),
  current_step integer not null default 0,
  next_send_at timestamptz,
  last_sent_at timestamptz,
  completed boolean not null default false,
  paused boolean not null default false,
  paused_at timestamptz,
  paused_reason text,                     -- 'replied' | 'manual' | 'bounced'
  created_at timestamptz not null default now(),
  unique(sequence_id, contact_id)
);

create index if not exists idx_pse_property on prospect_sequence_enrollments(property_id);
create index if not exists idx_pse_contact on prospect_sequence_enrollments(contact_id);
create index if not exists idx_pse_due on prospect_sequence_enrollments(next_send_at)
  where completed = false and paused = false;

alter table prospect_sequence_enrollments enable row level security;
create policy "prospect_sequence_enrollments_property_all" on prospect_sequence_enrollments for all using (
  property_id = get_user_property_id() or is_developer()
);

-- Now hook outreach_log.sequence_enrollment_id back to enrollments.
alter table outreach_log
  add constraint outreach_log_seq_enrollment_fk
  foreign key (sequence_enrollment_id) references prospect_sequence_enrollments(id) on delete set null;

-- ────────────────────────────────────────────────────────────
-- 4. CLICK TRACKING (one row per click)
-- ────────────────────────────────────────────────────────────
create table if not exists email_tracking_clicks (
  id uuid primary key default gen_random_uuid(),
  outreach_log_id uuid references outreach_log(id) on delete cascade,
  url text not null,
  clicked_at timestamptz not null default now(),
  user_agent text,
  ip_hash text                            -- coarse-grained, not raw IP
);

create index if not exists idx_email_tracking_clicks_log on email_tracking_clicks(outreach_log_id, clicked_at desc);

alter table email_tracking_clicks enable row level security;
create policy "email_tracking_clicks_property_select" on email_tracking_clicks for select using (
  exists (
    select 1 from outreach_log ol
    where ol.id = email_tracking_clicks.outreach_log_id
      and (ol.property_id = get_user_property_id() or is_developer())
  )
);

-- ────────────────────────────────────────────────────────────
-- 5. HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────
-- Bump per-contact send counters when a new outreach_log row is inserted.
create or replace function bump_contact_outreach_counters() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.contact_id is null then
    return new;
  end if;
  if new.direction = 'outbound' then
    update contacts
      set outreach_count = coalesce(outreach_count, 0) + 1,
          last_email_sent_at = greatest(coalesce(last_email_sent_at, '-infinity'::timestamptz), new.sent_at),
          last_email_subject = coalesce(new.subject, last_email_subject),
          last_contacted_at = greatest(coalesce(last_contacted_at, '-infinity'::timestamptz), new.sent_at)
      where id = new.contact_id;
  elsif new.direction = 'inbound' then
    update contacts
      set response_count = coalesce(response_count, 0) + 1,
          last_email_received_at = greatest(coalesce(last_email_received_at, '-infinity'::timestamptz), new.sent_at)
      where id = new.contact_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bump_contact_outreach on outreach_log;
create trigger trg_bump_contact_outreach
  after insert on outreach_log
  for each row execute function bump_contact_outreach_counters();

-- When an inbound email arrives that matches a sequence enrollment's
-- contact, auto-pause the enrollment so we don't keep emailing someone
-- who replied.
create or replace function autopause_sequence_on_reply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.direction <> 'inbound' or new.contact_id is null then
    return new;
  end if;
  update prospect_sequence_enrollments
    set paused = true,
        paused_at = now(),
        paused_reason = 'replied'
    where contact_id = new.contact_id
      and completed = false
      and paused = false;
  -- Also mark any in-flight outreach_log rows for this contact as replied.
  update outreach_log
    set replied_at = coalesce(replied_at, new.sent_at)
    where contact_id = new.contact_id
      and direction = 'outbound'
      and replied_at is null
      and sent_at < new.sent_at;
  return new;
end;
$$;

drop trigger if exists trg_autopause_seq_on_reply on outreach_log;
create trigger trg_autopause_seq_on_reply
  after insert on outreach_log
  for each row execute function autopause_sequence_on_reply();

-- Keep prospect_sequences.total_steps in sync with prospect_sequence_steps.
create or replace function refresh_sequence_total_steps() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_seq_id uuid;
begin
  v_seq_id := coalesce(new.sequence_id, old.sequence_id);
  update prospect_sequences
    set total_steps = (select count(*) from prospect_sequence_steps where sequence_id = v_seq_id),
        updated_at = now()
    where id = v_seq_id;
  return null;
end;
$$;

drop trigger if exists trg_refresh_seq_total_steps on prospect_sequence_steps;
create trigger trg_refresh_seq_total_steps
  after insert or delete on prospect_sequence_steps
  for each row execute function refresh_sequence_total_steps();

-- ────────────────────────────────────────────────────────────
-- 6. ENSURE-DEFAULT-SEQUENCE HELPER
-- ────────────────────────────────────────────────────────────
-- Lazily creates a "3-touch warm intro" sequence for the property
-- if one doesn't already exist. Returns the sequence id.
create or replace function ensure_default_prospect_sequence(p_property_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_property_id is null then return null; end if;

  select id into v_id from prospect_sequences
    where property_id = p_property_id and name = '3-touch warm intro'
    limit 1;
  if v_id is not null then return v_id; end if;

  insert into prospect_sequences (property_id, name, description, is_active, created_by)
    values (
      p_property_id,
      '3-touch warm intro',
      'Default 3-touch outreach: intro, value, last-call.',
      true,
      auth.uid()
    )
    returning id into v_id;

  insert into prospect_sequence_steps (sequence_id, step_index, day_offset, subject_template, body_template) values
    (v_id, 0, 0,
      'Quick intro — {{company}} x partnership',
      'Hi {{first_name}},' || E'\n\n' ||
      'I run partnerships at our property and noticed {{company}} keeps coming up when I think about a great cultural fit. Worth a quick chat about what we''re seeing this season?' || E'\n\n' ||
      'Open to a 15-minute call this week or next?'
    ),
    (v_id, 1, 3,
      'Following up — {{company}}',
      'Hey {{first_name}},' || E'\n\n' ||
      'Wanted to bump my note from earlier. We''ve had three partners with similar audiences activate and the early returns look strong. Happy to share what worked.' || E'\n\n' ||
      'Worth 15 minutes?'
    ),
    (v_id, 2, 7,
      'Last note — {{company}}',
      'Hi {{first_name}},' || E'\n\n' ||
      'I''ll stop bugging you after this one. If activations don''t fit your goals right now, totally understand. If you''d rather pick this up next quarter, just say the word and I''ll circle back.' || E'\n\n' ||
      'Either way, appreciate the consideration.'
    );

  return v_id;
end;
$$;

grant execute on function ensure_default_prospect_sequence(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 7. FEATURE FLAGS
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('email_tracking', false),
  ('prospect_sequences', false),
  ('bulk_outreach', false)
on conflict (module) do nothing;
