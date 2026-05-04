-- ============================================================
-- MIGRATION 079 — ACCOUNT MANAGEMENT 10/10 PUSH
-- ============================================================
-- Closes every code-shippable gap from the AM analysis. Builds on
-- top of the existing contracts/fulfillment/sponsor-portal stack —
-- no schema rewrites, just additive layers for renewal motion,
-- health scoring, QBRs, CS activities, account teams, onboarding.
--
--   1.  Renewal pipeline view
--   2.  Account health score view (composite KPI per account)
--   3.  QBR meetings + agenda template
--   4.  Customer-success activities (distinct from sales activities)
--   5.  Account team members (multi-role: AE/AM/CSM/SE)
--   6.  Onboarding workflows (triggered on deal=Contracted)
--   7.  Reference + case-study tracker
--   8.  Recap-report metrics view (proof of performance)
--   9.  Auto-renewal cadence helper RPC
--  10.  Surface churn_risks (already exists from migration 051)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. RENEWAL PIPELINE VIEW
-- ────────────────────────────────────────────────────────────
-- Lists every contract approaching expiration with renewal status.
-- Sorted by days-remaining; the renewal page reads this directly.
create or replace view renewal_pipeline as
  select
    c.id                                       as contract_id,
    c.property_id,
    c.deal_id,
    d.brand_name,
    d.account_id,
    d.account_lead_id,
    a.name                                     as account_name,
    c.effective_date,
    c.expiration_date,
    c.total_value,
    c.status,
    c.signed,
    (c.expiration_date - current_date)         as days_remaining,
    case
      when c.expiration_date < current_date                                  then 'Expired'
      when c.expiration_date <= current_date + interval '30 days'            then 'Critical'
      when c.expiration_date <= current_date + interval '60 days'            then 'Soon'
      when c.expiration_date <= current_date + interval '90 days'            then 'Upcoming'
      else 'Future'
    end                                         as renewal_band,
    -- Has the property already opened a successor deal at this brand?
    exists(
      select 1 from deals d2
      where d2.property_id = c.property_id
        and d2.brand_name = d.brand_name
        and d2.id <> c.deal_id
        and d2.created_at > c.effective_date
        and d2.stage not in ('Declined')
    )                                           as renewal_in_progress,
    -- Fulfillment delivered % (proxy for "are we delivering value")
    coalesce((
      select round(100.0 * count(*) filter (where fr.delivered) / nullif(count(*), 0), 1)
      from fulfillment_records fr
      where fr.contract_id = c.id
    ), 0)                                       as fulfillment_pct
  from contracts c
  join deals d on d.id = c.deal_id
  left join accounts a on a.id = d.account_id
  where c.expiration_date is not null
    and c.signed = true
    and (c.archived_at is null);

comment on view renewal_pipeline is
  'Every signed, non-archived contract with its renewal band + fulfillment health.';

-- ────────────────────────────────────────────────────────────
-- 2. ACCOUNT HEALTH SCORE
-- ────────────────────────────────────────────────────────────
-- Composite KPI per account combining:
--   • fulfillment_pct      — what % of promised benefits delivered
--   • days_since_touch     — last outbound or activity
--   • response_pct         — replies / outbound (last 90d)
--   • has_champion         — at least one decision_maker / champion
--   • renewal_window_days  — distance to nearest contract expiry
-- Output: 0-100 score + 'Healthy' | 'Watch' | 'At Risk' band.
create or replace view account_health_score as
  with recent_outreach as (
    select
      a.id as account_id,
      max(ol.sent_at) filter (where ol.direction = 'outbound') as last_outbound,
      max(ol.sent_at) filter (where ol.direction = 'inbound')  as last_inbound,
      count(*) filter (where ol.direction = 'outbound' and ol.sent_at >= now() - interval '90 days') as out_90d,
      count(*) filter (where ol.direction = 'inbound'  and ol.sent_at >= now() - interval '90 days') as in_90d
    from accounts a
    left join deals d on d.account_id = a.id
    left join outreach_log ol on ol.deal_id = d.id
    group by a.id
  ),
  fulfillment as (
    select
      a.id as account_id,
      coalesce(round(avg(
        case when fr_total > 0 then 100.0 * fr_delivered / fr_total else 100.0 end
      ), 1), 100.0) as avg_fulfillment_pct
    from accounts a
    left join deals d on d.account_id = a.id
    left join contracts c on c.deal_id = d.id and c.signed = true and c.archived_at is null
    left join lateral (
      select
        count(*) as fr_total,
        count(*) filter (where delivered) as fr_delivered
      from fulfillment_records fr where fr.contract_id = c.id
    ) f on true
    group by a.id
  ),
  champions as (
    select distinct a.id as account_id, true as has_champion
    from accounts a
    join deals d on d.account_id = a.id
    join deal_committee dc on dc.deal_id = d.id
    where dc.role in ('champion', 'decision_maker')
  ),
  renewals as (
    select
      a.id as account_id,
      min(c.expiration_date - current_date) as days_to_renewal
    from accounts a
    left join deals d on d.account_id = a.id
    left join contracts c on c.deal_id = d.id and c.signed = true and c.archived_at is null
    group by a.id
  )
  select
    a.id                                       as account_id,
    a.property_id,
    a.name,
    coalesce(f.avg_fulfillment_pct, 100)       as fulfillment_pct,
    coalesce(extract(day from now() - r.last_outbound), 999)::int as days_since_outbound,
    coalesce(extract(day from now() - r.last_inbound),  999)::int as days_since_inbound,
    r.out_90d,
    r.in_90d,
    case when r.out_90d > 0 then round(100.0 * r.in_90d / r.out_90d, 1) else 0 end as response_pct_90d,
    coalesce(c.has_champion, false)            as has_champion,
    rn.days_to_renewal,
    -- Composite score (0-100). Tweakable weights.
    least(100, greatest(0,
      ( coalesce(f.avg_fulfillment_pct, 100) * 0.35 )
      + ( case
            when coalesce(extract(day from now() - r.last_outbound), 999) <= 30 then 25
            when coalesce(extract(day from now() - r.last_outbound), 999) <= 60 then 15
            when coalesce(extract(day from now() - r.last_outbound), 999) <= 90 then 5
            else 0 end )
      + ( least(20, coalesce(r.in_90d, 0) * 5) )
      + ( case when coalesce(c.has_champion, false) then 10 else 0 end )
      + ( case
            when rn.days_to_renewal is null            then 10
            when rn.days_to_renewal > 90               then 10
            when rn.days_to_renewal > 30               then 5
            else 0 end )
    ))::int                                    as health_score,
    case
      when (
        ( coalesce(f.avg_fulfillment_pct, 100) * 0.35 )
        + ( case
              when coalesce(extract(day from now() - r.last_outbound), 999) <= 30 then 25
              when coalesce(extract(day from now() - r.last_outbound), 999) <= 60 then 15
              when coalesce(extract(day from now() - r.last_outbound), 999) <= 90 then 5
              else 0 end )
        + ( least(20, coalesce(r.in_90d, 0) * 5) )
        + ( case when coalesce(c.has_champion, false) then 10 else 0 end )
        + ( case
              when rn.days_to_renewal is null            then 10
              when rn.days_to_renewal > 90               then 10
              when rn.days_to_renewal > 30               then 5
              else 0 end )
      ) >= 70 then 'Healthy'
      when (
        ( coalesce(f.avg_fulfillment_pct, 100) * 0.35 )
        + ( case
              when coalesce(extract(day from now() - r.last_outbound), 999) <= 30 then 25
              when coalesce(extract(day from now() - r.last_outbound), 999) <= 60 then 15
              when coalesce(extract(day from now() - r.last_outbound), 999) <= 90 then 5
              else 0 end )
        + ( least(20, coalesce(r.in_90d, 0) * 5) )
        + ( case when coalesce(c.has_champion, false) then 10 else 0 end )
        + ( case
              when rn.days_to_renewal is null            then 10
              when rn.days_to_renewal > 90               then 10
              when rn.days_to_renewal > 30               then 5
              else 0 end )
      ) >= 45 then 'Watch'
      else 'At Risk'
    end                                        as health_band
  from accounts a
  left join recent_outreach r on r.account_id = a.id
  left join fulfillment f on f.account_id = a.id
  left join champions c on c.account_id = a.id
  left join renewals rn on rn.account_id = a.id;

comment on view account_health_score is
  '0-100 health score per account; composite of fulfillment %, recency of touch, reply rate, champion presence, renewal window.';

-- ────────────────────────────────────────────────────────────
-- 3. QBR MEETINGS
-- ────────────────────────────────────────────────────────────
create table if not exists qbr_meetings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,         -- nullable for account-level QBRs
  scheduled_for timestamptz not null,
  duration_minutes integer not null default 60,
  attendees_internal uuid[] default '{}',                       -- profile ids
  attendees_external text[] default '{}',                       -- contact emails
  agenda jsonb default '[]'::jsonb,                             -- [{topic, owner, notes}]
  recap_html text,
  recap_summary text,
  recap_action_items jsonb default '[]'::jsonb,                 -- [{task, owner, due_at}]
  status text not null default 'scheduled',                     -- 'scheduled' | 'in_progress' | 'complete' | 'cancelled'
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_qbr_meetings_property on qbr_meetings(property_id, scheduled_for desc);
create index if not exists idx_qbr_meetings_account on qbr_meetings(account_id, scheduled_for desc);
create index if not exists idx_qbr_meetings_upcoming on qbr_meetings(property_id, scheduled_for)
  where status in ('scheduled', 'in_progress');

alter table qbr_meetings enable row level security;
create policy "qbr_meetings_property_all" on qbr_meetings for all using (
  property_id = get_user_property_id() or is_developer()
);

-- Default agenda template seeded for new QBRs (used by the UI when
-- no custom agenda is provided).
create or replace function default_qbr_agenda() returns jsonb language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_object('topic', 'Welcome + objectives', 'owner', 'host'),
    jsonb_build_object('topic', 'Value delivered last quarter', 'owner', 'host'),
    jsonb_build_object('topic', 'Goals + KPIs against plan', 'owner', 'shared'),
    jsonb_build_object('topic', 'Voice of the customer', 'owner', 'customer'),
    jsonb_build_object('topic', 'Roadmap + next quarter', 'owner', 'host'),
    jsonb_build_object('topic', 'Action items + owners', 'owner', 'shared')
  );
$$;

-- ────────────────────────────────────────────────────────────
-- 4. CUSTOMER-SUCCESS ACTIVITIES
-- ────────────────────────────────────────────────────────────
-- Distinct from `activities` (which mixes sales + delivery). CS
-- activities are specifically about retention + adoption.
create table if not exists cs_activities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  activity_kind text not null,                  -- 'qbr' | 'escalation' | 'exec_sync' | 'training' | 'kickoff' | 'check_in' | 'risk_review'
  subject text not null,
  notes text,
  outcome text,                                 -- 'positive' | 'neutral' | 'concern'
  next_step text,
  occurred_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_cs_activities_account on cs_activities(account_id, occurred_at desc);
create index if not exists idx_cs_activities_property on cs_activities(property_id, occurred_at desc);

alter table cs_activities enable row level security;
create policy "cs_activities_property_all" on cs_activities for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 5. ACCOUNT TEAM MEMBERS (multi-role)
-- ────────────────────────────────────────────────────────────
-- Real accounts have AE + AM + CSM + SE. account_lead_id alone
-- is too coarse — this lets multiple people own different aspects.
create table if not exists account_team_members (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null,                          -- 'ae' | 'am' | 'csm' | 'se' | 'sponsor_exec'
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(account_id, user_id, role)
);

create index if not exists idx_account_team_account on account_team_members(account_id);
create index if not exists idx_account_team_user on account_team_members(user_id);

alter table account_team_members enable row level security;
create policy "account_team_property_all" on account_team_members for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 6. ONBOARDING WORKFLOWS
-- ────────────────────────────────────────────────────────────
-- A reusable playbook with ordered steps. When a deal flips to
-- 'Contracted', we instantiate an onboarding_runs row + tasks per
-- step. Sales-ops can edit the template; CSMs check off steps.
create table if not exists onboarding_templates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  steps jsonb not null default '[]'::jsonb,    -- [{key, title, description, owner_role, day_offset}]
  created_at timestamptz not null default now(),
  unique(property_id, name)
);

alter table onboarding_templates enable row level security;
create policy "onboarding_templates_property_all" on onboarding_templates for all using (
  property_id = get_user_property_id() or is_developer()
);

create table if not exists onboarding_runs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  template_id uuid references onboarding_templates(id) on delete set null,
  deal_id uuid not null references deals(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  status text not null default 'in_progress', -- 'in_progress' | 'complete' | 'cancelled'
  steps jsonb not null default '[]'::jsonb,    -- [{key, title, completed_at, completed_by, due_at}]
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(deal_id)
);

create index if not exists idx_onboarding_runs_property on onboarding_runs(property_id, started_at desc);

alter table onboarding_runs enable row level security;
create policy "onboarding_runs_property_all" on onboarding_runs for all using (
  property_id = get_user_property_id() or is_developer()
);

-- Trigger: when a deal moves to 'Contracted', kick off the default
-- onboarding run. Idempotent on (deal_id) so re-firing doesn't dup.
create or replace function start_onboarding_on_contracted() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_template record;
  v_default_steps jsonb;
begin
  if old.stage is not distinct from new.stage then return new; end if;
  if new.stage <> 'Contracted' then return new; end if;

  -- Pick the default template, or fall back to a built-in playbook.
  select * into v_template from onboarding_templates
    where property_id = new.property_id and is_default = true
    limit 1;

  if v_template.id is null then
    v_default_steps := jsonb_build_array(
      jsonb_build_object('key', 'welcome',  'title', 'Send welcome email + intros',     'owner_role', 'csm', 'day_offset', 0),
      jsonb_build_object('key', 'specs',    'title', 'Collect asset specs from sponsor', 'owner_role', 'csm', 'day_offset', 3),
      jsonb_build_object('key', 'kickoff',  'title', 'Kickoff call (review goals + KPIs)','owner_role', 'csm', 'day_offset', 7),
      jsonb_build_object('key', 'first',    'title', 'First activation review',          'owner_role', 'csm', 'day_offset', 30),
      jsonb_build_object('key', 'qbr',      'title', 'Schedule first QBR',               'owner_role', 'csm', 'day_offset', 60)
    );
  else
    v_default_steps := v_template.steps;
  end if;

  insert into onboarding_runs (property_id, template_id, deal_id, account_id, steps)
    values (
      new.property_id, v_template.id, new.id, new.account_id,
      (
        select jsonb_agg(
          jsonb_build_object(
            'key', s->>'key',
            'title', s->>'title',
            'description', s->>'description',
            'owner_role', s->>'owner_role',
            'due_at', (now() + ((coalesce(s->>'day_offset','0'))::int || ' days')::interval)
          )
        )
        from jsonb_array_elements(v_default_steps) as s
      )
    )
    on conflict (deal_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_start_onboarding_on_contracted on deals;
create trigger trg_start_onboarding_on_contracted
  after update of stage on deals
  for each row execute function start_onboarding_on_contracted();

-- ────────────────────────────────────────────────────────────
-- 7. REFERENCE / CASE-STUDY TRACKER
-- ────────────────────────────────────────────────────────────
create table if not exists references_tracker (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  willing_to_reference boolean not null default false,
  willing_to_case_study boolean not null default false,
  willing_to_speak boolean not null default false,
  last_asked_at timestamptz,
  last_used_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, contact_id)
);

create index if not exists idx_references_property on references_tracker(property_id);

alter table references_tracker enable row level security;
create policy "references_property_all" on references_tracker for all using (
  property_id = get_user_property_id() or is_developer()
);

-- ────────────────────────────────────────────────────────────
-- 8. RECAP-REPORT METRICS VIEW (Proof of Performance)
-- ────────────────────────────────────────────────────────────
-- Aggregates everything we know about value delivered to a deal:
-- benefit fulfillment, sponsor portal engagement, contract value.
-- The recap-report generator reads this view + adds AI narrative.
create or replace view deal_recap_metrics as
  select
    d.id                                       as deal_id,
    d.property_id,
    d.brand_name,
    d.value                                    as deal_value,
    d.start_date, d.end_date,
    coalesce((select count(*) from contracts c where c.deal_id = d.id and c.signed = true), 0) as signed_contract_count,
    coalesce((
      select count(*) from fulfillment_records fr
      join contracts c on c.id = fr.contract_id
      where c.deal_id = d.id and c.signed = true
    ), 0)                                       as benefits_total,
    coalesce((
      select count(*) from fulfillment_records fr
      join contracts c on c.id = fr.contract_id
      where c.deal_id = d.id and c.signed = true and fr.delivered = true
    ), 0)                                       as benefits_delivered,
    coalesce((
      select count(*) from proposal_view_events pve
      where pve.deal_id = d.id and pve.event_type = 'session_start'
    ), 0)                                       as portal_sessions,
    coalesce((
      select sum(duration_ms) from proposal_view_events pve
      where pve.deal_id = d.id and pve.event_type = 'page_view'
    ), 0)                                       as portal_total_ms,
    coalesce((
      select count(*) from outreach_log ol
      where ol.deal_id = d.id and ol.direction = 'outbound'
    ), 0)                                       as touches_outbound,
    coalesce((
      select count(*) from outreach_log ol
      where ol.deal_id = d.id and ol.direction = 'inbound'
    ), 0)                                       as touches_inbound
  from deals d;

-- ────────────────────────────────────────────────────────────
-- 9. AUTO-RENEWAL CADENCE HELPER RPC
-- ────────────────────────────────────────────────────────────
-- Given a contract, finds the deal's primary contact and enrolls
-- them in the property's renewal sequence (named "Renewal cadence",
-- created by the UI on first use). Idempotent.
create or replace function ensure_renewal_sequence(p_property_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if p_property_id is null then return null; end if;
  select id into v_id from prospect_sequences
    where property_id = p_property_id and name = 'Renewal cadence' limit 1;
  if v_id is not null then return v_id; end if;

  insert into prospect_sequences (property_id, name, description, is_active, created_by)
    values (p_property_id, 'Renewal cadence',
            '90/60/30-day cadence for contract renewals.',
            true, auth.uid())
    returning id into v_id;

  insert into prospect_sequence_steps (sequence_id, step_index, day_offset, subject_template, body_template) values
    (v_id, 0, 0,
      'Looking ahead to your renewal — {{company}}',
      'Hi {{first_name}},' || E'\n\n' ||
      'Wanted to start the conversation early on next year. Happy to share what worked this season and a couple of ideas for how to amplify the partnership going forward.' || E'\n\n' ||
      'Have time for 30 minutes in the next two weeks?'
    ),
    (v_id, 1, 30,
      'Following up on renewal planning',
      'Hey {{first_name}},' || E'\n\n' ||
      'Circling back on next season — we put together a quick recap of value delivered and a draft proposal for the renewal. Want me to walk you through it?' || E'\n\n' ||
      'A 20-minute call next week?'
    ),
    (v_id, 2, 60,
      'Renewal proposal — {{company}}',
      'Hi {{first_name}},' || E'\n\n' ||
      'Sending the formal renewal proposal. We''ve held the same rate and added a couple of upgrades based on what we learned this year.' || E'\n\n' ||
      'Open for any feedback — happy to revise on a call.'
    );
  return v_id;
end;
$$;

grant execute on function ensure_renewal_sequence(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 10. FEATURE FLAGS
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('renewal_pipeline', false),
  ('account_health', false),
  ('qbr_module', false),
  ('cs_activities', false),
  ('account_team', false),
  ('onboarding_workflows', false),
  ('references_tracker', false),
  ('recap_reports', false),
  ('auto_renewal_cadence', false)
on conflict (module) do nothing;
