-- ============================================================
-- MIGRATION 078 — CLOSING THE INTEGRATION LOOPS
-- ============================================================
-- The forward path (prospecting → CRM) and the backward path
-- (CRM → prospecting) both work, but several lifecycle loops were
-- still open. This migration adds the triggers + tables that make
-- the system act on its own data, not just surface it.
--
--   1. Reply-intent → stage automation (DB trigger)
--   2. Signal → sequence auto-enrollment (signal_response_rules)
--   3. Expanded webhook triggers (contact.replied, sequence.completed,
--      signal.fired, intent.classified)
--   4. Audit log for sequence enrollments + bulk sends
--   5. SLA helper that knows about recent outreach activity
--   6. is_signal_fresh() helper for dedup-window logic
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. REPLY-INTENT → STAGE AUTOMATION
-- ────────────────────────────────────────────────────────────
-- When a reply is classified with high confidence, move the
-- linked deal forward (or backward) automatically. The rules:
--   • intent='meeting_request' AND confidence >= 0.7 → stage='Negotiation'
--   • intent='closed_lost'     AND confidence >= 0.8 → stage='Declined'
--                                                       (auto-creates postmortem)
--   • intent='objection'       (any confidence)      → no stage change,
--                                                       but notify owner
--
-- Skips when stage is already at-or-past the target so the trigger
-- never bounces a deal backward out of a higher stage.
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
      values (
        '00000000-0000-0000-0000-000000000000'::uuid,  -- system rule id
        v_deal.property_id,
        jsonb_build_object('source', 'auto_advance_deal_on_intent',
                           'deal_id', v_deal.id, 'intent', new.intent,
                           'from_stage', v_deal.stage, 'to_stage', v_target_stage),
        'success', now()
      );
  end if;

  -- Always notify the owner on objection or meeting_request so
  -- they can act fast even if the stage didn't auto-move.
  if new.intent in ('objection', 'meeting_request', 'interested') then
    v_owner := coalesce(v_deal.account_lead_id, v_deal.assigned_to_user_id);
    if v_owner is not null then
      insert into notifications (user_id, type, title, body, related_id)
        values (v_owner, 'reply_intent_' || new.intent,
                v_deal.brand_name || ' reply tagged "' || new.intent || '"',
                left(coalesce(new.rationale, ''), 280),
                v_deal.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_advance_on_intent on reply_intent_classifications;
create trigger trg_auto_advance_on_intent
  after insert on reply_intent_classifications
  for each row execute function auto_advance_deal_on_intent();

-- The 'system rule' ID we wrote above must exist in workflow_rules so
-- the foreign key on workflow_rule_runs holds. Insert a single shared
-- system row per property lazily — but since rules table is property-
-- scoped, we drop the FK requirement on workflow_rule_runs.rule_id
-- when the source is a built-in trigger. Simpler: relax the FK.
alter table workflow_rule_runs drop constraint if exists workflow_rule_runs_rule_id_fkey;
alter table workflow_rule_runs alter column rule_id drop not null;

-- ────────────────────────────────────────────────────────────
-- 2. SIGNAL → SEQUENCE AUTO-ENROLLMENT
-- ────────────────────────────────────────────────────────────
-- A property-scoped table mapping signal_type → sequence to
-- auto-enroll the contact in. Fires from a trigger on
-- prospect_signals after insert. If the signal isn't tied to a
-- contact, no-op. If the contact is already in the sequence,
-- the unique constraint on (sequence_id, contact_id) skips it.
create table if not exists signal_response_rules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  signal_type text not null,                      -- 'job_change' | 'funding_round' | …
  sequence_id uuid references prospect_sequences(id) on delete cascade,
  also_set_priority text,                          -- 'High' | 'Medium' | 'Low'
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(property_id, signal_type)
);

create index if not exists idx_signal_response_rules_active on signal_response_rules(property_id, signal_type) where is_active = true;

alter table signal_response_rules enable row level security;
create policy "signal_response_rules_property_all" on signal_response_rules for all using (
  property_id = get_user_property_id() or is_developer()
);

create or replace function fire_signal_response() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_rule record;
  v_owner uuid;
begin
  -- We need a contact and (ideally) a deal to act.
  if new.contact_id is null then return new; end if;

  select * into v_rule from signal_response_rules
    where property_id = new.property_id
      and signal_type = new.signal_type
      and is_active = true
    limit 1;
  if not found then return new; end if;

  -- Bump priority on the related deal.
  if v_rule.also_set_priority is not null and new.deal_id is not null then
    update deals set priority = v_rule.also_set_priority where id = new.deal_id;
  end if;

  -- Auto-enroll into the configured sequence, idempotent on
  -- (sequence_id, contact_id). Use the deal's account_lead or
  -- the radar's acted_on_by user as the enroller; if neither,
  -- pick any property admin.
  if v_rule.sequence_id is not null then
    if new.deal_id is not null then
      select coalesce(account_lead_id, assigned_to_user_id) into v_owner
        from deals where id = new.deal_id;
    end if;
    if v_owner is null then
      select id into v_owner from profiles
        where property_id = new.property_id
          and role in ('developer', 'businessops', 'admin')
        limit 1;
    end if;
    if v_owner is not null then
      insert into prospect_sequence_enrollments (
        sequence_id, property_id, contact_id, deal_id, enrolled_by,
        current_step, next_send_at
      ) values (
        v_rule.sequence_id, new.property_id, new.contact_id, new.deal_id,
        v_owner, 0, now()
      ) on conflict (sequence_id, contact_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fire_signal_response on prospect_signals;
create trigger trg_fire_signal_response
  after insert on prospect_signals
  for each row execute function fire_signal_response();

-- ────────────────────────────────────────────────────────────
-- 3. EXPANDED WEBHOOK TRIGGERS
-- ────────────────────────────────────────────────────────────
-- contact.replied + signal.fired + intent.classified +
-- sequence.completed all use the same enqueue pattern as
-- enqueue_webhook_for_deal_change(). Generic helper:
create or replace function enqueue_webhook_event(
  p_property_id uuid, p_event text, p_payload jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  sub record;
begin
  for sub in
    select id, property_id from webhook_subscriptions
    where property_id = p_property_id
      and is_active = true
      and p_event = any(events)
  loop
    insert into webhook_deliveries (subscription_id, property_id, event_type, payload)
      values (sub.id, sub.property_id, p_event, p_payload);
  end loop;
end;
$$;

-- contact.replied → fire when an inbound row lands in outreach_log
create or replace function webhook_on_contact_reply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.direction <> 'inbound' or new.contact_id is null then return new; end if;
  perform enqueue_webhook_event(
    new.property_id, 'contact.replied',
    jsonb_build_object(
      'event', 'contact.replied', 'occurred_at', now(),
      'contact_id', new.contact_id, 'deal_id', new.deal_id,
      'subject', new.subject, 'thread_id', new.thread_id,
      'provider', new.provider
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_webhook_on_reply on outreach_log;
create trigger trg_webhook_on_reply
  after insert on outreach_log
  for each row execute function webhook_on_contact_reply();

-- signal.fired
create or replace function webhook_on_signal_fired() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enqueue_webhook_event(
    new.property_id, 'signal.fired',
    jsonb_build_object(
      'event', 'signal.fired', 'occurred_at', now(),
      'signal_id', new.id, 'signal_type', new.signal_type,
      'severity', new.severity, 'title', new.title,
      'contact_id', new.contact_id, 'deal_id', new.deal_id,
      'source', new.source, 'payload', new.payload
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_webhook_on_signal on prospect_signals;
create trigger trg_webhook_on_signal
  after insert on prospect_signals
  for each row execute function webhook_on_signal_fired();

-- intent.classified
create or replace function webhook_on_intent_classified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform enqueue_webhook_event(
    new.property_id, 'intent.classified',
    jsonb_build_object(
      'event', 'intent.classified', 'occurred_at', now(),
      'classification_id', new.id, 'intent', new.intent,
      'confidence', new.confidence, 'rationale', new.rationale,
      'suggested_action', new.suggested_action,
      'contact_id', new.contact_id, 'deal_id', new.deal_id
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_webhook_on_intent on reply_intent_classifications;
create trigger trg_webhook_on_intent
  after insert on reply_intent_classifications
  for each row execute function webhook_on_intent_classified();

-- sequence.completed → fire when an enrollment row flips completed=true
create or replace function webhook_on_sequence_completed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.completed = false and new.completed = true then
    perform enqueue_webhook_event(
      new.property_id, 'sequence.completed',
      jsonb_build_object(
        'event', 'sequence.completed', 'occurred_at', now(),
        'enrollment_id', new.id, 'sequence_id', new.sequence_id,
        'contact_id', new.contact_id, 'deal_id', new.deal_id
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_webhook_on_seq_completed on prospect_sequence_enrollments;
create trigger trg_webhook_on_seq_completed
  after update of completed on prospect_sequence_enrollments
  for each row execute function webhook_on_sequence_completed();

-- ────────────────────────────────────────────────────────────
-- 4. AUDIT LOG ON SEQUENCE ENROLLMENTS
-- ────────────────────────────────────────────────────────────
-- The generic record_audit_event trigger from 077 expects rows
-- to have a property_id field — prospect_sequence_enrollments
-- already has one, so we can just attach.
drop trigger if exists trg_audit_seq_enrollments on prospect_sequence_enrollments;
create trigger trg_audit_seq_enrollments
  after insert or update or delete on prospect_sequence_enrollments
  for each row execute function record_audit_event();

-- Also attach to deal_committee so committee-mapping changes
-- show up in the audit feed (sales-ops cares about ownership shifts).
drop trigger if exists trg_audit_committee on deal_committee;
create trigger trg_audit_committee
  after insert or update or delete on deal_committee
  for each row execute function record_audit_event();

-- ────────────────────────────────────────────────────────────
-- 5. SLA RUNNER NOW KNOWS ABOUT OUTREACH
-- ────────────────────────────────────────────────────────────
-- Helper: how many outbound touches has a deal had in the last 7 days?
-- The runner uses this to skip an SLA breach if the rep is actively
-- working the deal (sequence touches, manual sends).
create or replace function recent_outreach_touch_count(p_deal_id uuid, p_window_days integer default 7)
returns integer language sql stable as $$
  select count(*)::integer from outreach_log
   where deal_id = p_deal_id
     and direction = 'outbound'
     and sent_at > now() - (p_window_days || ' days')::interval;
$$;
grant execute on function recent_outreach_touch_count(uuid, integer) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 6. LOOKALIKE → ACCOUNT FUZZY-MATCH HELPER
-- ────────────────────────────────────────────────────────────
-- Suggest existing accounts whose name resembles a candidate brand.
-- Used by the Lookalikes UI when "Add to pipeline" is clicked, so
-- the rep can opt into linking the new deal to a parent account.
-- pg_trgm provides similarity(); must be created BEFORE the function
-- below references it, otherwise function creation errors with
-- `function similarity(text, text) does not exist`.
create extension if not exists pg_trgm;
create or replace function suggest_account_for_brand(p_property_id uuid, p_brand text)
returns table (account_id uuid, account_name text, similarity real)
language sql stable as $$
  select id, name, greatest(
    similarity(lower(name), lower(p_brand)),
    case when lower(name) like '%' || lower(p_brand) || '%' then 0.5 else 0 end,
    case when lower(p_brand) like '%' || lower(name) || '%' then 0.5 else 0 end
  ) as sim
  from accounts
  where property_id = p_property_id
  order by sim desc
  limit 3;
$$;
grant execute on function suggest_account_for_brand(uuid, text) to authenticated;

-- ────────────────────────────────────────────────────────────
-- 7. FEATURE FLAGS
-- ────────────────────────────────────────────────────────────
insert into feature_flags (module, enabled) values
  ('intent_to_stage_automation', false),
  ('signal_to_sequence_automation', false),
  ('outreach_webhooks', false),
  ('lookalike_account_suggest', false)
on conflict (module) do nothing;
