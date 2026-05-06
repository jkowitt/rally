-- ============================================================
-- MIGRATION 080 — THE LIFECYCLE CHAIN
-- ============================================================
-- When a deal flips to 'Contracted', everything downstream must
-- happen automatically, with notifications at each milestone:
--
--   1. A draft contract row is created (linked to the deal)
--   2. Fulfillment records are spawned from contract benefits
--   3. The customer is enrolled in a "welcome" cadence
--   4. Onboarding steps are mirrored as `tasks` rows assigned
--      to the account_lead / CSM
--   5. Push-style notifications are written to user_notifications
--      for the account team at every milestone
--
-- This migration also REPAIRS earlier triggers (077, 078) that
-- referenced a non-existent `notifications` table — the real one
-- is `user_notifications` from migration 069.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. REPAIR — point earlier triggers at user_notifications
-- ────────────────────────────────────────────────────────────
-- 077 wrote to notifications(user_id, type, title, body, related_id);
-- the real table is user_notifications(user_id, type, title, body,
-- link, icon, metadata, read). Rewrite the two triggers we shipped:
create or replace function notify_mentioned_users() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  v_brand text;
begin
  if new.mentioned_user_ids is null or array_length(new.mentioned_user_ids, 1) is null then
    return new;
  end if;
  select brand_name into v_brand from deals where id = new.deal_id;
  foreach uid in array new.mentioned_user_ids loop
    if uid = new.author_id then continue; end if;
    insert into user_notifications (user_id, type, title, body, link, icon, metadata)
      values (
        uid, 'mention',
        'Mentioned by a teammate on ' || coalesce(v_brand, 'a deal'),
        left(new.body, 280),
        '/app/crm/pipeline?deal=' || new.deal_id,
        '💬',
        jsonb_build_object('deal_id', new.deal_id, 'comment_id', new.id)
      );
  end loop;
  return new;
end;
$$;

-- 078's auto_advance_deal_on_intent fires user notifications too:
create or replace function auto_advance_deal_on_intent() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_deal record;
  v_target_stage text;
  v_owner uuid;
begin
  if new.deal_id is null then return new; end if;
  select id, stage, account_lead_id, assigned_to_user_id, brand_name, property_id
    into v_deal from deals where id = new.deal_id;
  if not found then return new; end if;

  if new.intent = 'meeting_request' and coalesce(new.confidence, 0) >= 0.7
     and v_deal.stage in ('Prospect', 'Proposal Sent') then
    v_target_stage := 'Negotiation';
  elsif new.intent = 'closed_lost' and coalesce(new.confidence, 0) >= 0.8
     and v_deal.stage not in ('Renewed', 'Declined') then
    v_target_stage := 'Declined';
  end if;

  if v_target_stage is not null then
    update deals set stage = v_target_stage where id = v_deal.id;
    insert into workflow_rule_runs (rule_id, property_id, trigger_payload, result, ran_at)
      values (null, v_deal.property_id,
        jsonb_build_object('source', 'auto_advance_deal_on_intent',
                           'deal_id', v_deal.id, 'intent', new.intent,
                           'from_stage', v_deal.stage, 'to_stage', v_target_stage),
        'success', now());
  end if;

  if new.intent in ('objection', 'meeting_request', 'interested') then
    v_owner := coalesce(v_deal.account_lead_id, v_deal.assigned_to_user_id);
    if v_owner is not null then
      insert into user_notifications (user_id, type, title, body, link, icon, metadata)
        values (
          v_owner, 'reply_intent_' || new.intent,
          v_deal.brand_name || ' reply tagged "' || new.intent || '"',
          left(coalesce(new.rationale, ''), 280),
          '/app/crm/pipeline?deal=' || v_deal.id,
          case new.intent when 'meeting_request' then '📅' when 'objection' then '⚠' else '👍' end,
          jsonb_build_object('deal_id', v_deal.id, 'intent', new.intent)
        );
    end if;
  end if;
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 1. AUTO-CREATE DRAFT CONTRACT ON 'Contracted'
-- ────────────────────────────────────────────────────────────
-- When a deal flips to Contracted, create a draft contract if the
-- deal doesn't already have one. The rep can then upload the
-- signed PDF and parse benefits — but the contract row exists
-- immediately so fulfillment + AM workflows can attach to it.
create or replace function autocreate_contract_on_contracted() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_existing uuid;
  v_new_id uuid;
begin
  if old.stage is not distinct from new.stage then return new; end if;
  if new.stage <> 'Contracted' then return new; end if;

  select id into v_existing from contracts where deal_id = new.id limit 1;
  if v_existing is not null then return new; end if;

  insert into contracts (
    property_id, deal_id, brand_name,
    status, total_value,
    effective_date, expiration_date,
    created_by
  ) values (
    new.property_id, new.id, new.brand_name,
    'Draft — Awaiting PDF',
    new.value,
    coalesce(new.start_date, current_date),
    coalesce(new.end_date, current_date + interval '1 year'),
    new.account_lead_id
  )
  returning id into v_new_id;

  -- Spawn benefits from any deal_assets already attached. The rep
  -- can edit later; this just bootstraps so fulfillment can be
  -- generated next.
  insert into contract_benefits (contract_id, benefit_description, quantity, frequency, value)
  select
    v_new_id,
    coalesce(a.name, 'Asset benefit'),
    coalesce(da.quantity, 1),
    'Per Season',
    coalesce(da.custom_price, a.base_price)
  from deal_assets da
  join assets a on a.id = da.asset_id
  where da.deal_id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_autocreate_contract on deals;
create trigger trg_autocreate_contract
  after update of stage on deals
  for each row execute function autocreate_contract_on_contracted();

-- ────────────────────────────────────────────────────────────
-- 2. AUTO-GENERATE FULFILLMENT RECORDS ON CONTRACT INSERT
-- ────────────────────────────────────────────────────────────
-- Fires once per contract — when benefits are created (or the
-- contract is auto-created with benefits), spawn fulfillment_records
-- for each benefit. Frequency drives how many records:
--   'Per Season' → 1
--   'Per Game'   → 12 (placeholder; real season length varies)
--   'Monthly'    → 12
--   'Weekly'     → 52
-- Default to 1 if frequency is unrecognized.
create or replace function spawn_fulfillment_for_benefit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
  v_contract record;
  v_property_id uuid;
  i integer;
begin
  -- Only spawn if no fulfillment_records exist for this benefit yet
  if exists(select 1 from fulfillment_records where benefit_id = new.id) then
    return new;
  end if;

  select c.*, d.property_id into v_contract
    from contracts c
    join deals d on d.id = c.deal_id
    where c.id = new.contract_id;
  if not found then return new; end if;
  v_property_id := v_contract.property_id;

  v_count := case lower(coalesce(new.frequency, 'per season'))
    when 'weekly'      then 52
    when 'monthly'     then 12
    when 'per game'    then 12
    when 'per match'   then 12
    when 'quarterly'   then 4
    else 1
  end;
  -- Cap at 60 to prevent runaway frequency strings.
  v_count := least(v_count, 60);

  for i in 1..v_count loop
    insert into fulfillment_records (
      contract_id, deal_id, benefit_id,
      scheduled_date, delivered, property_id
    ) values (
      new.contract_id,
      v_contract.deal_id,
      new.id,
      coalesce(v_contract.effective_date, current_date) + ((i - 1) * 30 || ' days')::interval,
      false,
      v_property_id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_spawn_fulfillment on contract_benefits;
create trigger trg_spawn_fulfillment
  after insert on contract_benefits
  for each row execute function spawn_fulfillment_for_benefit();

-- Some installs may not have property_id on fulfillment_records yet.
alter table fulfillment_records add column if not exists property_id uuid references properties(id) on delete cascade;
alter table fulfillment_records add column if not exists deal_id uuid references deals(id) on delete cascade;

-- ────────────────────────────────────────────────────────────
-- 3. WELCOME SEQUENCE — auto-enroll the customer
-- ────────────────────────────────────────────────────────────
-- When a deal is Contracted, enroll its primary contact in the
-- property's "Welcome cadence" so they get a welcome email + a
-- 7-day check-in + a 30-day first-review nudge.
create or replace function ensure_welcome_sequence(p_property_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if p_property_id is null then return null; end if;
  select id into v_id from prospect_sequences
    where property_id = p_property_id and name = 'Welcome cadence' limit 1;
  if v_id is not null then return v_id; end if;

  insert into prospect_sequences (property_id, name, description, is_active, created_by)
    values (p_property_id, 'Welcome cadence',
            'Auto-fired on deal=Contracted. Welcome → check-in → first review.',
            true, auth.uid())
    returning id into v_id;

  insert into prospect_sequence_steps (sequence_id, step_index, day_offset, subject_template, body_template) values
    (v_id, 0, 0,
      'Welcome aboard — {{company}} x our partnership',
      'Hi {{first_name}},' || E'\n\n' ||
      'Excited to officially have you on board. Over the next few days I''ll send you the activation roadmap, asset specs, and our kickoff invite.' || E'\n\n' ||
      'In the meantime, anything top of mind I should know about your goals for this season?' || E'\n\n' ||
      'Talk soon.'
    ),
    (v_id, 1, 7,
      'Quick check-in — onboarding going OK?',
      'Hi {{first_name}},' || E'\n\n' ||
      'Wanted to make sure you have everything you need. The kickoff is on the calendar; if you have questions on assets or timing, just reply to this thread.' || E'\n\n' ||
      'Thanks for partnering with us.'
    ),
    (v_id, 2, 30,
      'First-review check-in — how are we doing?',
      'Hi {{first_name}},' || E'\n\n' ||
      '30 days in. Want to grab 20 minutes to review what''s landed and what''s next? I''ll bring the data; you bring the brutal honesty.' || E'\n\n' ||
      'A couple of slots that might work…'
    );
  return v_id;
end;
$$;
grant execute on function ensure_welcome_sequence(uuid) to authenticated;

create or replace function enroll_in_welcome_sequence_on_contracted() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_seq_id uuid;
  v_contact_id uuid;
  v_enroller uuid;
begin
  if old.stage is not distinct from new.stage then return new; end if;
  if new.stage <> 'Contracted' then return new; end if;

  -- Resolve sequence (lazy-create) — security definer side-effect.
  select id into v_seq_id from prospect_sequences
    where property_id = new.property_id and name = 'Welcome cadence' limit 1;
  if v_seq_id is null then
    insert into prospect_sequences (property_id, name, description, is_active)
      values (new.property_id, 'Welcome cadence',
              'Auto-fired on deal=Contracted. Welcome → check-in → first review.', true)
      returning id into v_seq_id;
    insert into prospect_sequence_steps (sequence_id, step_index, day_offset, subject_template, body_template) values
      (v_seq_id, 0, 0,
        'Welcome aboard — {{company}} x our partnership',
        'Hi {{first_name}},' || E'\n\nExcited to officially have you on board. Over the next few days I''ll send the activation roadmap, asset specs, and the kickoff invite.\n\nIn the meantime, anything top of mind I should know about your goals?\n\nTalk soon.'
      ),
      (v_seq_id, 1, 7,
        'Quick check-in — onboarding going OK?',
        'Hi {{first_name}},' || E'\n\nWanted to make sure you have everything you need. Kickoff is on the calendar; reply with anything outstanding.\n\nThanks for partnering with us.'
      ),
      (v_seq_id, 2, 30,
        'First-review check-in — how are we doing?',
        'Hi {{first_name}},' || E'\n\n30 days in. Want to grab 20 minutes to review what''s landed and what''s next?\n\nA couple of slots that might work…'
      );
  end if;

  -- Find primary contact + enroller.
  select id into v_contact_id from contacts
    where deal_id = new.id order by is_primary desc limit 1;
  if v_contact_id is null then return new; end if;

  v_enroller := coalesce(new.account_lead_id, new.assigned_to_user_id);
  if v_enroller is null then
    select id into v_enroller from profiles
      where property_id = new.property_id and role in ('developer','businessops','admin') limit 1;
  end if;
  if v_enroller is null then return new; end if;

  insert into prospect_sequence_enrollments (
    sequence_id, property_id, contact_id, deal_id, enrolled_by,
    current_step, next_send_at
  ) values (
    v_seq_id, new.property_id, v_contact_id, new.id, v_enroller, 0, now()
  ) on conflict (sequence_id, contact_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_welcome_enroll on deals;
create trigger trg_welcome_enroll
  after update of stage on deals
  for each row execute function enroll_in_welcome_sequence_on_contracted();

-- ────────────────────────────────────────────────────────────
-- 4. ONBOARDING STEPS → REAL TASK ROWS
-- ────────────────────────────────────────────────────────────
-- The onboarding_runs row holds steps as jsonb; we also want each
-- step to live as a real task in the existing `tasks` table so the
-- assignee sees it in their queue and gets due-date escalation.
create or replace function spawn_tasks_from_onboarding_run() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  step jsonb;
  v_assignee uuid;
  v_brand text;
begin
  -- Pick the assignee: prefer CSM on the account team, fall back
  -- to account_lead, then assigned_to_user_id, then any admin.
  select user_id into v_assignee from account_team_members
    where account_id = new.account_id and role = 'csm' limit 1;
  if v_assignee is null then
    select coalesce(account_lead_id, assigned_to_user_id), brand_name
      into v_assignee, v_brand from deals where id = new.deal_id;
  else
    select brand_name into v_brand from deals where id = new.deal_id;
  end if;
  if v_assignee is null then
    select id into v_assignee from profiles
      where property_id = new.property_id and role in ('developer','businessops','admin') limit 1;
  end if;

  for step in select * from jsonb_array_elements(coalesce(new.steps, '[]'::jsonb)) loop
    insert into tasks (
      property_id, deal_id, title, description,
      due_date, priority, status, assigned_to, created_by
    ) values (
      new.property_id, new.deal_id,
      'Onboarding: ' || (step->>'title'),
      step->>'description',
      case when step->>'due_at' is not null
           then (step->>'due_at')::timestamptz::date
           else null end,
      'High', 'Pending', v_assignee, v_assignee
    );
  end loop;

  -- Also fan out a notification to everyone on the account team.
  insert into user_notifications (user_id, type, title, body, link, icon, metadata)
  select
    atm.user_id, 'onboarding_started',
    'Onboarding kicked off for ' || coalesce(v_brand, 'a new contract'),
    'A new playbook is in your queue. Welcome email is going out automatically.',
    '/app/crm/pipeline?deal=' || new.deal_id,
    '🚀',
    jsonb_build_object('deal_id', new.deal_id, 'run_id', new.id)
  from account_team_members atm
  where atm.account_id = new.account_id;

  -- Always notify the assignee even if they aren't on the account team.
  if v_assignee is not null then
    insert into user_notifications (user_id, type, title, body, link, icon, metadata)
      values (
        v_assignee, 'onboarding_started',
        'Onboarding kicked off for ' || coalesce(v_brand, 'a new contract'),
        'A new playbook is in your queue. Welcome email is going out automatically.',
        '/app/crm/pipeline?deal=' || new.deal_id,
        '🚀',
        jsonb_build_object('deal_id', new.deal_id, 'run_id', new.id)
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_spawn_tasks_from_onboarding on onboarding_runs;
create trigger trg_spawn_tasks_from_onboarding
  after insert on onboarding_runs
  for each row execute function spawn_tasks_from_onboarding_run();

-- ────────────────────────────────────────────────────────────
-- 5. NOTIFY THE TEAM ON STAGE FLIPS THAT MATTER
-- ────────────────────────────────────────────────────────────
-- When a deal flips to Contracted (or Renewed / Declined), notify
-- the account team + the deal owner. UI is real-time via Supabase
-- realtime on user_notifications (NotificationCenter already
-- subscribes — no client changes needed).
create or replace function notify_team_on_stage_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_event text;
  v_icon text;
  uid uuid;
begin
  if old.stage is not distinct from new.stage then return new; end if;

  case new.stage
    when 'Contracted'      then v_event := 'contract_signed';     v_icon := '✅';
    when 'In Fulfillment'  then v_event := 'fulfillment_started'; v_icon := '📦';
    when 'Renewed'         then v_event := 'deal_renewed';        v_icon := '🔁';
    when 'Declined'        then v_event := 'deal_lost';           v_icon := '❌';
    else return new;
  end case;

  -- Fan out to: account_lead, assigned_to_user_id, full account team.
  -- Wrap unnest() in a subquery so we can reference its output in
  -- WHERE — the bare `where unnest is not null` form raises
  -- "column unnest does not exist" because WHERE binds before the
  -- SRF column is named.
  for uid in
    select distinct u from (
      select unnest(array[new.account_lead_id, new.assigned_to_user_id]) as u
      union
      select user_id from account_team_members where account_id = new.account_id
    ) s
    where u is not null
  loop
    if uid is null then continue; end if;
    insert into user_notifications (user_id, type, title, body, link, icon, metadata)
      values (
        uid, v_event,
        new.brand_name || ' moved to ' || new.stage,
        case
          when new.stage = 'Contracted'
            then 'Contract draft created. Welcome email queued. Onboarding playbook opened.'
          when new.stage = 'Renewed'
            then 'Renewal closed. Updated contract + fulfillment cycle starting.'
          when new.stage = 'Declined'
            then 'Postmortem auto-created — capture lessons in the next 7 days.'
          else null
        end,
        '/app/crm/pipeline?deal=' || new.id,
        v_icon,
        jsonb_build_object('deal_id', new.id, 'stage', new.stage)
      );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_team_stage on deals;
create trigger trg_notify_team_stage
  after update of stage on deals
  for each row execute function notify_team_on_stage_change();

-- ────────────────────────────────────────────────────────────
-- 6. NOTIFY ON FULFILLMENT MILESTONES
-- ────────────────────────────────────────────────────────────
-- When a fulfillment record is delivered, notify the account team
-- (sponsor wants positive milestone proof). When it goes overdue,
-- notify the CSM.
create or replace function notify_on_fulfillment_delivered() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_brand text;
  v_account_id uuid;
  v_deal_id uuid;
  uid uuid;
begin
  if old.delivered = true or new.delivered <> true then return new; end if;

  select d.brand_name, d.account_id, d.id
    into v_brand, v_account_id, v_deal_id
    from contracts c join deals d on d.id = c.deal_id
    where c.id = new.contract_id;

  for uid in
    select user_id from account_team_members where account_id = v_account_id
  loop
    insert into user_notifications (user_id, type, title, body, link, icon, metadata)
      values (
        uid, 'fulfillment_delivered',
        'Delivered for ' || coalesce(v_brand, 'a sponsor'),
        'Fulfillment marked complete. Surfaces in their next recap.',
        '/app/crm/fulfillment',
        '🎯',
        jsonb_build_object('record_id', new.id, 'deal_id', v_deal_id)
      );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_fulfillment_delivered on fulfillment_records;
create trigger trg_notify_fulfillment_delivered
  after update of delivered on fulfillment_records
  for each row execute function notify_on_fulfillment_delivered();

-- ────────────────────────────────────────────────────────────
-- 7. FEATURE FLAGS
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('lifecycle_chain', false),
  ('welcome_cadence', false)
on conflict (module) do nothing;
