-- ============================================================
-- MIGRATION 075 — POLISH PASS (gaps + new high-leverage features)
-- ============================================================
-- Closes the gaps from 074 and adds the next wave:
--
--   1.  Outreach performance views (per-template, per-step, per-sender)
--   2.  Reply-thread continuity — outreach_log.in_reply_to_message_id
--   3.  Mute / quiet periods on contacts (do_not_contact_until,
--       holiday_mute_starts_at, holiday_mute_ends_at) + per-property
--       holiday calendar
--   4.  Send-time optimization — best_send_hour cached per contact;
--       view to compute it from outreach_log.opened_at
--   5.  Calendar booking links on profile + per-deal
--   6.  Champion tracking trigger — when a deal_committee row with
--       role='champion' has a job_change signal, escalate severity
--   7.  Personality profiles per contact (Crystal-style)
--   8.  Smart Links 2.0 — proposal_view_events for per-slide telemetry
--   9.  Win/loss debrief automation — deal_postmortems table + trigger
--   10. Daily digests — digest_subscriptions
--   11. Apollo LinkedIn fallback — contacts.linkedin already there
--   12. assigned_to → uuid migration path — adds assigned_to_user_id;
--       leaves text column for backwards compat
--   13. Coaching nudges materialized on read via view
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. OUTREACH PERFORMANCE VIEWS
-- ────────────────────────────────────────────────────────────
-- Per-property roll-up: count of sends in the last 30 days, opens,
-- clicks, replies, and the derived rates. Cheap because outreach_log
-- is indexed on (property_id, sent_at desc).
create or replace view outreach_performance_30d as
  select
    ol.property_id,
    count(*) filter (where ol.direction = 'outbound') as sends,
    count(*) filter (where ol.direction = 'outbound' and ol.opened_at is not null) as opens,
    count(*) filter (where ol.direction = 'outbound' and ol.clicked_at is not null) as clicks,
    count(*) filter (where ol.direction = 'outbound' and ol.replied_at is not null) as replies,
    count(*) filter (where ol.direction = 'outbound' and ol.bounced) as bounces,
    case when count(*) filter (where ol.direction = 'outbound') > 0
         then round(100.0 * count(*) filter (where ol.direction = 'outbound' and ol.opened_at is not null)
                          / count(*) filter (where ol.direction = 'outbound'), 1)
         else 0 end as open_rate,
    case when count(*) filter (where ol.direction = 'outbound') > 0
         then round(100.0 * count(*) filter (where ol.direction = 'outbound' and ol.replied_at is not null)
                          / count(*) filter (where ol.direction = 'outbound'), 1)
         else 0 end as reply_rate
  from outreach_log ol
  where ol.sent_at >= now() - interval '30 days'
  group by ol.property_id;

-- Per-sender breakdown so the manager can see who's pulling weight.
create or replace view outreach_performance_per_sender_30d as
  select
    ol.property_id,
    ol.user_id,
    p.full_name,
    count(*) filter (where ol.direction = 'outbound') as sends,
    count(*) filter (where ol.direction = 'outbound' and ol.opened_at is not null) as opens,
    count(*) filter (where ol.direction = 'outbound' and ol.replied_at is not null) as replies
  from outreach_log ol
  left join profiles p on p.id = ol.user_id
  where ol.sent_at >= now() - interval '30 days'
    and ol.user_id is not null
  group by ol.property_id, ol.user_id, p.full_name;

-- Per-step breakdown (which sequence step pulls reply rate).
create or replace view sequence_step_performance as
  select
    ol.property_id,
    pse.sequence_id,
    ps.name as sequence_name,
    ol.sequence_step_index as step_index,
    count(*) as sends,
    count(*) filter (where ol.opened_at is not null) as opens,
    count(*) filter (where ol.replied_at is not null) as replies,
    case when count(*) > 0
         then round(100.0 * count(*) filter (where ol.replied_at is not null) / count(*), 1)
         else 0 end as reply_rate
  from outreach_log ol
  join prospect_sequence_enrollments pse on pse.id = ol.sequence_enrollment_id
  join prospect_sequences ps on ps.id = pse.sequence_id
  where ol.direction = 'outbound'
    and ol.sequence_enrollment_id is not null
  group by ol.property_id, pse.sequence_id, ps.name, ol.sequence_step_index;

-- ────────────────────────────────────────────────────────────
-- 2. REPLY-THREAD CONTINUITY
-- ────────────────────────────────────────────────────────────
-- in_reply_to_message_id captures the provider message id of the
-- message we're replying to so the send action can stitch headers
-- (In-Reply-To, References) and keep mail clients threading right.
alter table outreach_log add column if not exists in_reply_to_message_id text;
alter table outreach_log add column if not exists references_chain text;

-- ────────────────────────────────────────────────────────────
-- 3. MUTE / QUIET PERIODS
-- ────────────────────────────────────────────────────────────
alter table contacts add column if not exists do_not_contact_until timestamptz;
alter table contacts add column if not exists do_not_contact_reason text;
alter table contacts add column if not exists best_send_hour integer; -- 0-23 UTC; null → no preference yet

create index if not exists idx_contacts_dnc on contacts(do_not_contact_until)
  where do_not_contact_until is not null;

-- Property-level holiday calendar — sequence runner skips sends
-- inside any active window.
create table if not exists property_holiday_windows (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  applies_to text not null default 'all',  -- 'all' | 'property_only' | 'recipient_industry'
  recipient_industry text,
  created_at timestamptz not null default now()
);

create index if not exists idx_holiday_windows_property on property_holiday_windows(property_id, starts_at, ends_at);

alter table property_holiday_windows enable row level security;
create policy "holiday_windows_property_all" on property_holiday_windows for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 4. SEND-TIME OPTIMIZATION
-- ────────────────────────────────────────────────────────────
-- View that derives the hour-of-day in which a contact has opened
-- the most messages. The runner reads this when scheduling.
create or replace view contact_best_send_hour as
  select
    ol.contact_id,
    ol.property_id,
    extract(hour from ol.opened_at)::int as best_hour,
    count(*) as opens_in_hour,
    row_number() over (partition by ol.contact_id order by count(*) desc) as rn
  from outreach_log ol
  where ol.opened_at is not null
    and ol.contact_id is not null
  group by ol.contact_id, ol.property_id, extract(hour from ol.opened_at);

-- ────────────────────────────────────────────────────────────
-- 5. CALENDAR BOOKING LINKS
-- ────────────────────────────────────────────────────────────
alter table profiles add column if not exists calendar_booking_url text;     -- e.g. calendly.com/jane
alter table profiles add column if not exists calendar_booking_label text;   -- e.g. "Book a 15-min intro"

-- ────────────────────────────────────────────────────────────
-- 6. CHAMPION TRACKING
-- ────────────────────────────────────────────────────────────
-- When a contact who is mapped as 'champion' on any open deal
-- triggers a job_change signal, escalate severity to high and tag
-- as champion_moved so the UI can highlight it.
create or replace function escalate_champion_move() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_is_champion boolean;
begin
  if new.signal_type <> 'job_change' or new.contact_id is null then
    return new;
  end if;
  select exists(
    select 1 from deal_committee dc
    join deals d on d.id = dc.deal_id
    where dc.contact_id = new.contact_id
      and dc.role = 'champion'
      and d.stage not in ('Renewed', 'Declined')
  ) into v_is_champion;
  if v_is_champion then
    new.severity := 'high';
    new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object('champion_moved', true);
    new.title := '🏆 Champion left: ' || coalesce(new.title, '');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_escalate_champion on prospect_signals;
create trigger trg_escalate_champion
  before insert on prospect_signals
  for each row execute function escalate_champion_move();

-- ────────────────────────────────────────────────────────────
-- 7. PERSONALITY PROFILES (Crystal-style)
-- ────────────────────────────────────────────────────────────
create table if not exists contact_personalities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null unique references contacts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  disc_type text,                              -- 'D' | 'I' | 'S' | 'C' | 'DI' | etc.
  communication_style text,                    -- 'direct' | 'analytical' | 'expressive' | 'amiable'
  preferred_pace text,                         -- 'fast' | 'measured' | 'slow'
  decision_drivers text[] default '{}',        -- ['data','speed','consensus','vision']
  avoid_phrases text[] default '{}',           -- phrases that pattern-poorly for this type
  recommended_phrases text[] default '{}',     -- phrases that pattern-well
  rationale text,
  generated_at timestamptz not null default now(),
  source text default 'claude'                 -- 'claude' | 'crystal' | 'manual'
);

create index if not exists idx_contact_personalities_property on contact_personalities(property_id);

alter table contact_personalities enable row level security;
create policy "contact_personalities_property_all" on contact_personalities for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 8. SMART LINKS 2.0 — PROPOSAL VIEW EVENTS
-- ────────────────────────────────────────────────────────────
create table if not exists proposal_view_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  portal_link_id uuid,                         -- references sponsor_portal_links(id) when present
  event_type text not null,                    -- 'page_view' | 'session_start' | 'session_end' | 'cta_click'
  page_index integer,                          -- 0-based for PDFs; null for non-paginated
  page_label text,
  duration_ms integer,                         -- for page_view, time-on-slide
  user_agent text,
  ip_hash text,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_proposal_view_events_link on proposal_view_events(portal_link_id, occurred_at desc);
create index if not exists idx_proposal_view_events_deal on proposal_view_events(deal_id, occurred_at desc);
create index if not exists idx_proposal_view_events_property on proposal_view_events(property_id, occurred_at desc);

alter table proposal_view_events enable row level security;
-- Rep can read events on deals in their property.
create policy "proposal_view_events_property_select" on proposal_view_events for select using (
  property_id = get_user_property_id() or is_developer()
);
-- Public portal viewers (anonymous) can insert their own telemetry
-- but only for an active sponsor_portal_links id. The check makes
-- it impossible to spray events for unrelated portal_link_ids.
create policy "proposal_view_events_public_insert" on proposal_view_events for insert with check (
  portal_link_id is not null
  and exists (
    select 1 from sponsor_portal_links spl
    where spl.id = proposal_view_events.portal_link_id
      and spl.active = true
  )
);
grant insert on proposal_view_events to anon;
grant insert on proposal_view_events to authenticated;

-- Roll-up view: per portal-link, total time + page heatmap.
-- Postgres forbids nesting aggregates, so the per-page sum runs in a
-- CTE first and the outer level just collects them into a jsonb map.
create or replace view proposal_view_summary as
  with page_totals as (
    select
      portal_link_id,
      deal_id,
      page_index,
      sum(duration_ms) filter (where event_type = 'page_view') as page_ms
    from proposal_view_events
    where page_index is not null
    group by portal_link_id, deal_id, page_index
  ),
  overall as (
    select
      portal_link_id,
      deal_id,
      count(*) filter (where event_type = 'session_start') as sessions,
      sum(duration_ms) filter (where event_type = 'page_view') as total_ms,
      max(occurred_at) as last_viewed_at
    from proposal_view_events
    group by portal_link_id, deal_id
  )
  select
    o.portal_link_id,
    o.deal_id,
    o.sessions,
    o.total_ms,
    o.last_viewed_at,
    (select jsonb_object_agg(pt.page_index::text, coalesce(pt.page_ms, 0))
       from page_totals pt
      where pt.portal_link_id = o.portal_link_id
        and pt.deal_id        is not distinct from o.deal_id) as page_heatmap_ms
  from overall o;

-- ────────────────────────────────────────────────────────────
-- 9. WIN/LOSS DEBRIEF AUTOMATION
-- ────────────────────────────────────────────────────────────
create table if not exists deal_postmortems (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  deal_id uuid not null references deals(id) on delete cascade,
  outcome text not null,                       -- 'won' | 'lost'
  status text not null default 'pending',     -- 'pending' | 'in_progress' | 'complete'
  primary_reason text,
  contributing_factors text[] default '{}',
  what_worked text,
  what_didnt text,
  lessons_learned text,
  rep_response_at timestamptz,
  contact_response_at timestamptz,
  rep_responses jsonb default '{}'::jsonb,
  contact_responses jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(deal_id)
);

create index if not exists idx_deal_postmortems_property on deal_postmortems(property_id, created_at desc);

alter table deal_postmortems enable row level security;
create policy "deal_postmortems_property_all" on deal_postmortems for all using (
  property_id = get_user_property_id() or is_developer()
);

-- Trigger: when a deal moves to Renewed/Contracted (won) or Declined (lost),
-- auto-create a pending postmortem if none exists yet.
create or replace function create_postmortem_on_outcome() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_outcome text;
begin
  if new.stage = old.stage then return new; end if;
  if new.stage in ('Renewed', 'Contracted') then v_outcome := 'won';
  elsif new.stage = 'Declined' then v_outcome := 'lost';
  else return new;
  end if;
  insert into deal_postmortems (property_id, deal_id, outcome, status)
    values (new.property_id, new.id, v_outcome, 'pending')
    on conflict (deal_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_postmortem on deals;
create trigger trg_create_postmortem
  after update of stage on deals
  for each row execute function create_postmortem_on_outcome();

-- ────────────────────────────────────────────────────────────
-- 10. DAILY DIGESTS
-- ────────────────────────────────────────────────────────────
create table if not exists digest_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  channel text not null,                       -- 'email' | 'slack'
  send_hour_utc integer not null default 13,   -- 13 UTC = 8am ET
  send_days text[] default '{Mon,Tue,Wed,Thu,Fri}',
  slack_webhook_url text,
  is_active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, channel)
);

create index if not exists idx_digest_subs_active on digest_subscriptions(is_active, send_hour_utc);

alter table digest_subscriptions enable row level security;
create policy "digest_subs_owner_all" on digest_subscriptions for all using (
  user_id = auth.uid() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 11. ASSIGNED_TO MIGRATION PATH
-- ────────────────────────────────────────────────────────────
-- New uuid column. Backfills any existing assigned_to text rows that
-- look like uuids. Old text column stays for backwards compat.
alter table deals add column if not exists assigned_to_user_id uuid references profiles(id) on delete set null;
update deals set assigned_to_user_id = assigned_to::uuid
  where assigned_to_user_id is null
    and assigned_to is not null
    and assigned_to ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
create index if not exists idx_deals_assigned_to_uid on deals(assigned_to_user_id);

-- ────────────────────────────────────────────────────────────
-- 12. COACHING NUDGES VIEW
-- ────────────────────────────────────────────────────────────
-- Materialized on read. The dashboard surfaces these as "you have X
-- deals stale > 14d, Y unresponded warm leads" — driven entirely
-- from this view so there's no mutation cost.
create or replace view coaching_nudges as
  select
    d.property_id,
    d.assigned_to_user_id as user_id,
    'stale_deal' as nudge_type,
    d.id as related_id,
    'Deal ' || d.brand_name || ' has not moved in over 14 days' as message,
    d.last_contacted as last_action_at
  from deals d
  where d.stage not in ('Renewed', 'Contracted', 'Declined')
    and d.assigned_to_user_id is not null
    and (d.last_contacted is null or d.last_contacted < now() - interval '14 days')
  union all
  select
    c.property_id,
    null::uuid as user_id,
    'unanswered_warm_reply' as nudge_type,
    c.id as related_id,
    coalesce(c.first_name || ' ', '') || coalesce(c.last_name, c.email, '') || ' replied but hasn''t been re-emailed' as message,
    c.last_email_received_at as last_action_at
  from contacts c
  where c.last_email_received_at is not null
    and (c.last_email_sent_at is null or c.last_email_sent_at < c.last_email_received_at)
    and c.last_email_received_at > now() - interval '7 days';

-- ────────────────────────────────────────────────────────────
-- 13. FEATURE FLAGS
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('outreach_analytics', false),
  ('smart_links_v2', false),
  ('personality_profiles', false),
  ('postmortems', false),
  ('daily_digests', false),
  ('coaching_nudges', false),
  ('mute_periods', false),
  ('send_time_optimization', false),
  ('calendar_booking', false),
  ('champion_tracking', false),
  ('funding_radar', false)
on conflict (module) do nothing;
