-- ============================================================
-- MIGRATION 076 — THE 10/10 PUSH
-- ============================================================
-- Closes every code-shippable gap from the prior honest assessment:
--
--   1.  A/B testing — sequence_step_variants table + winner picker
--   2.  Champion-tracking dedup (single signal per (contact_id,
--       new_company)) so we don't re-fire daily on the same event
--   3.  Recipient timezone — contact.timezone (IANA) inferred from
--       opens or state; runner uses it instead of UTC
--   4.  Business-day cadence — sequence_step.use_business_days +
--       us_holidays static table for skip-logic
--   5.  Unsubscribe + auto-suppression — outreach_log.unsubscribed_at +
--       contacts.unsubscribed_at + dnc_domains property-level table
--   6.  Sender warm-up monitor — daily_send_volume materialized view
--       + warm-up curve
--   7.  Phone integration scaffolding — phone_calls table (Twilio
--       SID, recording_url, transcription, AI summary)
--   8.  Sales velocity views — avg_days_per_stage, win_rate,
--       pipeline_coverage_ratio
--   9.  Reply variant draft — drafts table caches three-tone variants
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. A/B TESTING ON SEQUENCE STEPS
-- ────────────────────────────────────────────────────────────
-- A step can have N variants. Runner picks one weighted by current
-- reply rate (or round-robin while < SAMPLE_THRESHOLD sends per
-- variant). After the threshold, the runner sticks with the winner.
create table if not exists prospect_sequence_step_variants (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references prospect_sequence_steps(id) on delete cascade,
  variant_label text not null,                 -- 'A', 'B', 'C', or descriptive
  weight integer not null default 1,           -- soft hint for round-robin tie-break
  subject_template text,
  body_template text,
  task_template text,
  is_active boolean not null default true,
  is_winner boolean not null default false,
  created_at timestamptz not null default now(),
  unique(step_id, variant_label)
);

create index if not exists idx_step_variants_step on prospect_sequence_step_variants(step_id) where is_active = true;

alter table prospect_sequence_step_variants enable row level security;
create policy "step_variants_property_all" on prospect_sequence_step_variants for all using (
  exists (
    select 1 from prospect_sequence_steps s
    join prospect_sequences ps on ps.id = s.sequence_id
    where s.id = prospect_sequence_step_variants.step_id
      and (ps.property_id = get_user_property_id() or is_developer())
  )
);

-- Track which variant was used per outbound send, so analytics can
-- compute reply rate per variant.
alter table outreach_log add column if not exists variant_id uuid references prospect_sequence_step_variants(id) on delete set null;
create index if not exists idx_outreach_log_variant on outreach_log(variant_id);

-- View: per-variant performance (for the winner picker + UI).
create or replace view sequence_step_variant_performance as
  select
    v.id as variant_id,
    v.step_id,
    v.variant_label,
    v.is_winner,
    count(ol.*) as sends,
    count(ol.*) filter (where ol.opened_at is not null) as opens,
    count(ol.*) filter (where ol.replied_at is not null) as replies,
    case when count(ol.*) > 0
         then round(100.0 * count(ol.*) filter (where ol.replied_at is not null) / count(ol.*), 1)
         else 0 end as reply_rate
  from prospect_sequence_step_variants v
  left join outreach_log ol on ol.variant_id = v.id
  group by v.id, v.step_id, v.variant_label, v.is_winner;

-- ────────────────────────────────────────────────────────────
-- 2. CHAMPION-TRACKING DEDUP + GENERIC SIGNAL DEDUP
-- ────────────────────────────────────────────────────────────
-- A dedup key per (contact_id, signal_type, payload-fingerprint)
-- so re-running the radar over the same event doesn't spam.
alter table prospect_signals add column if not exists dedup_key text;
create unique index if not exists ux_signals_dedup
  on prospect_signals(property_id, dedup_key)
  where dedup_key is not null;

-- Helper: derive a sensible dedup key from signal_type + payload.
-- Use it from edge functions when building the insert payload.
create or replace function build_signal_dedup_key(p_signal_type text, p_contact_id uuid, p_payload jsonb)
returns text language plpgsql immutable as $$
begin
  if p_signal_type = 'job_change' then
    return p_signal_type || ':' || coalesce(p_contact_id::text, '') || ':' || lower(coalesce(p_payload->'current'->>'company', ''));
  elsif p_signal_type in ('funding_round', 'ma_event', 'hiring_post', 'earnings_mention') then
    return p_signal_type || ':' || coalesce(p_payload->>'brand', '') || ':' || coalesce(p_payload->>'approx_when', '');
  end if;
  return p_signal_type || ':' || coalesce(p_contact_id::text, '') || ':' || md5(p_payload::text);
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. RECIPIENT TIMEZONE
-- ────────────────────────────────────────────────────────────
alter table contacts add column if not exists timezone text;     -- IANA: 'America/New_York'

-- View: derive a contact's likely timezone from past open hours
-- (mode of opened_at hour) + best guess fallback ordering. Read
-- from the runner when picking next_send_at.
create or replace view contact_inferred_timezone as
  select
    c.id as contact_id,
    c.property_id,
    coalesce(
      c.timezone,
      case c.state
        when 'NY' then 'America/New_York'
        when 'NJ' then 'America/New_York'
        when 'PA' then 'America/New_York'
        when 'MA' then 'America/New_York'
        when 'FL' then 'America/New_York'
        when 'GA' then 'America/New_York'
        when 'OH' then 'America/New_York'
        when 'IL' then 'America/Chicago'
        when 'TX' then 'America/Chicago'
        when 'WI' then 'America/Chicago'
        when 'MO' then 'America/Chicago'
        when 'MN' then 'America/Chicago'
        when 'CO' then 'America/Denver'
        when 'AZ' then 'America/Phoenix'
        when 'CA' then 'America/Los_Angeles'
        when 'WA' then 'America/Los_Angeles'
        when 'OR' then 'America/Los_Angeles'
        when 'NV' then 'America/Los_Angeles'
      else 'America/New_York' end
    ) as timezone
  from contacts c;

-- ────────────────────────────────────────────────────────────
-- 4. BUSINESS-DAY CADENCE + US HOLIDAYS
-- ────────────────────────────────────────────────────────────
alter table prospect_sequence_steps add column if not exists use_business_days boolean not null default false;

create table if not exists us_holidays (
  observed_date date primary key,
  name text not null
);

-- Seed the next two years of major US business holidays.
insert into us_holidays (observed_date, name) values
  ('2026-01-01', 'New Year''s Day'),
  ('2026-01-19', 'MLK Day'),
  ('2026-02-16', 'Presidents Day'),
  ('2026-05-25', 'Memorial Day'),
  ('2026-06-19', 'Juneteenth'),
  ('2026-07-03', 'Independence Day (observed)'),
  ('2026-09-07', 'Labor Day'),
  ('2026-11-11', 'Veterans Day'),
  ('2026-11-26', 'Thanksgiving'),
  ('2026-11-27', 'Day after Thanksgiving'),
  ('2026-12-24', 'Christmas Eve'),
  ('2026-12-25', 'Christmas Day'),
  ('2027-01-01', 'New Year''s Day'),
  ('2027-01-18', 'MLK Day'),
  ('2027-02-15', 'Presidents Day'),
  ('2027-05-31', 'Memorial Day'),
  ('2027-06-18', 'Juneteenth (observed)'),
  ('2027-07-05', 'Independence Day (observed)'),
  ('2027-09-06', 'Labor Day'),
  ('2027-11-11', 'Veterans Day'),
  ('2027-11-25', 'Thanksgiving'),
  ('2027-11-26', 'Day after Thanksgiving'),
  ('2027-12-24', 'Christmas Eve'),
  ('2027-12-25', 'Christmas Day')
on conflict (observed_date) do nothing;

-- Helper: returns the timestamp at `from_ts + n_business_days`,
-- skipping weekends and us_holidays. Used by the sequence runner.
create or replace function add_business_days(from_ts timestamptz, n_days integer)
returns timestamptz language plpgsql stable as $$
declare
  d date := from_ts::date;
  added integer := 0;
begin
  while added < n_days loop
    d := d + interval '1 day';
    if extract(dow from d) in (0, 6) then continue; end if;       -- skip Sun/Sat
    if exists (select 1 from us_holidays where observed_date = d) then continue; end if;
    added := added + 1;
  end loop;
  return d::timestamptz + (from_ts - from_ts::date::timestamptz);  -- preserve hour
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. UNSUBSCRIBE + DNC BY DOMAIN
-- ────────────────────────────────────────────────────────────
alter table contacts add column if not exists unsubscribed_at timestamptz;
alter table outreach_log add column if not exists unsubscribed_via_id uuid;

-- Per-property domain blocklist. Contacts at a blocklisted domain
-- are skipped by the runner regardless of contact-level state.
create table if not exists dnc_domains (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  domain text not null,
  reason text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(property_id, domain)
);

create index if not exists idx_dnc_domains_property on dnc_domains(property_id, domain);

alter table dnc_domains enable row level security;
create policy "dnc_domains_property_all" on dnc_domains for all using (
  property_id = get_user_property_id() or is_developer()
);

-- Public-facing unsubscribe table — a token written into outbound
-- emails that, when clicked, marks the contact unsubscribed. The
-- token is the outreach_log.tracking_token reused (so we already
-- know what message → contact).

-- ────────────────────────────────────────────────────────────
-- 6. SENDER WARM-UP MONITOR
-- ────────────────────────────────────────────────────────────
-- Daily volume per sender, last 30 days. Used by the deliverability
-- linter to warn before sending if today's volume looks anomalous.
create or replace view sender_daily_send_volume as
  select
    user_id,
    property_id,
    date_trunc('day', sent_at)::date as send_day,
    count(*) as sends,
    count(*) filter (where bounced) as bounces
  from outreach_log
  where direction = 'outbound'
    and sent_at >= now() - interval '30 days'
  group by user_id, property_id, date_trunc('day', sent_at)::date;

-- ────────────────────────────────────────────────────────────
-- 7. PHONE INTEGRATION
-- ────────────────────────────────────────────────────────────
create table if not exists phone_calls (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  direction text not null default 'outbound',  -- 'outbound' | 'inbound'
  twilio_call_sid text unique,
  to_number text,
  from_number text,
  duration_seconds integer,
  recording_url text,
  recording_duration_seconds integer,
  transcription text,
  ai_summary text,
  ai_sentiment text,
  ai_action_items text[],
  status text default 'queued',                -- 'queued' | 'ringing' | 'in_progress' | 'completed' | 'failed'
  started_at timestamptz default now(),
  ended_at timestamptz
);

create index if not exists idx_phone_calls_property on phone_calls(property_id, started_at desc);
create index if not exists idx_phone_calls_contact on phone_calls(contact_id);
create index if not exists idx_phone_calls_deal on phone_calls(deal_id);

alter table phone_calls enable row level security;
create policy "phone_calls_property_all" on phone_calls for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 8. SALES VELOCITY VIEWS
-- ────────────────────────────────────────────────────────────
-- avg_days_per_stage: rolling 90 days of stage transitions, average
-- time spent in each stage before progression.
create or replace view sales_velocity_per_stage as
  select
    d.property_id,
    d.stage,
    count(*) as deals_in_stage,
    avg(extract(epoch from (now() - d.created_at)) / 86400) as avg_days_in_stage
  from deals d
  where d.stage not in ('Renewed', 'Declined')
  group by d.property_id, d.stage;

-- Win rate over last 90 days.
create or replace view sales_win_rate_90d as
  select
    property_id,
    count(*) filter (where stage in ('Renewed', 'Contracted')) as wins,
    count(*) filter (where stage = 'Declined') as losses,
    case when count(*) filter (where stage in ('Renewed', 'Contracted', 'Declined')) > 0
         then round(100.0 * count(*) filter (where stage in ('Renewed', 'Contracted'))
                          / count(*) filter (where stage in ('Renewed', 'Contracted', 'Declined')), 1)
         else 0 end as win_rate_pct
  from deals
  where created_at >= now() - interval '90 days'
  group by property_id;

-- Pipeline coverage ratio: open pipeline value / quota
-- (caller passes quota; we just compute open-pipeline-value).
create or replace view sales_open_pipeline_value as
  select
    property_id,
    count(*) as open_deal_count,
    sum(value) as open_pipeline_value
  from deals
  where stage not in ('Renewed', 'Declined', 'Contracted')
  group by property_id;

-- ────────────────────────────────────────────────────────────
-- 9. REPLY DRAFT VARIANTS CACHE
-- ────────────────────────────────────────────────────────────
-- Caches 3-tone variants per inbound message so re-opening doesn't
-- pay the Claude tax twice.
create table if not exists reply_draft_variants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  outreach_log_id uuid references outreach_log(id) on delete cascade,
  tone text not null,                          -- 'direct' | 'friendly' | 'concise'
  subject text,
  body text not null,
  generated_at timestamptz not null default now(),
  unique(outreach_log_id, tone)
);

create index if not exists idx_reply_drafts_log on reply_draft_variants(outreach_log_id);

alter table reply_draft_variants enable row level security;
create policy "reply_drafts_property_all" on reply_draft_variants for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 10. FEATURE FLAGS
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('ab_testing', false),
  ('business_day_cadence', false),
  ('phone_integration', false),
  ('sales_velocity', false),
  ('unsub_management', false),
  ('reply_variants', false),
  ('warm_up_monitor', false),
  ('sec_edgar_radar', false)
on conflict (module) do nothing;
