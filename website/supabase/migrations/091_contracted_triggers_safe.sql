-- ============================================================
-- MIGRATION 091 — MAKE CONTRACTED TRIGGERS NON-BLOCKING
-- ============================================================
-- Reps reported "I can't move anything to Contracted — clicking
-- does nothing." Root cause: one of the four AFTER-UPDATE triggers
-- on deals.stage that fires when stage flips to 'Contracted' was
-- raising — the whole transaction rolled back, so the stage update
-- never landed and the UI showed no error.
--
-- The triggers are conveniences (auto-create draft contract,
-- spawn fulfillment, enroll in welcome sequence, fan out
-- notifications). None of them are critical to the stage flip
-- itself. Wrap each in BEGIN ... EXCEPTION WHEN OTHERS so a
-- failure logs a NOTICE but does not block the deal update.
--
-- A failure here is now observable two ways:
--   1. NOTICE in the postgres log
--   2. A row in trigger_failures (new table) so a developer
--      can investigate without log access.
-- ============================================================

create table if not exists trigger_failures (
  id uuid primary key default gen_random_uuid(),
  trigger_name text not null,
  table_name text,
  row_id uuid,
  err_state text,
  err_message text,
  err_detail text,
  occurred_at timestamptz default now()
);

create index if not exists idx_trigger_failures_recent
  on trigger_failures (occurred_at desc);

-- Reuse the existing trigger functions but rewrite their bodies
-- to swallow exceptions. The control flow inside (the early-return
-- guards) stays identical — we only catch errors raised by the
-- side-effect inserts.

create or replace function autocreate_contract_on_contracted() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_existing uuid;
  v_new_id uuid;
begin
  if old.stage is not distinct from new.stage then return new; end if;
  if new.stage <> 'Contracted' then return new; end if;

  begin
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
  exception when others then
    insert into trigger_failures (trigger_name, table_name, row_id, err_state, err_message, err_detail)
      values ('autocreate_contract_on_contracted', 'deals', new.id, sqlstate, sqlerrm, '');
    raise notice 'autocreate_contract_on_contracted swallowed error: % %', sqlstate, sqlerrm;
  end;

  return new;
end;
$$;

create or replace function enroll_in_welcome_sequence_on_contracted() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_seq_id uuid;
  v_contact_id uuid;
  v_enroller uuid;
begin
  if old.stage is not distinct from new.stage then return new; end if;
  if new.stage <> 'Contracted' then return new; end if;

  begin
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
          'Hi {{first_name}},' || E'\n\nExcited to officially have you on board.'
        ),
        (v_seq_id, 1, 7,
          'Quick check-in — onboarding going OK?',
          'Hi {{first_name}},' || E'\n\nWanted to make sure you have everything you need.'
        ),
        (v_seq_id, 2, 30,
          'First-review check-in — how are we doing?',
          'Hi {{first_name}},' || E'\n\n30 days in. Want to grab 20 minutes to review?'
        );
    end if;

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
  exception when others then
    insert into trigger_failures (trigger_name, table_name, row_id, err_state, err_message, err_detail)
      values ('enroll_in_welcome_sequence_on_contracted', 'deals', new.id, sqlstate, sqlerrm, '');
    raise notice 'enroll_in_welcome_sequence_on_contracted swallowed error: % %', sqlstate, sqlerrm;
  end;

  return new;
end;
$$;

-- Wrap notify_team_on_stage_change too — it's the most likely
-- culprit since it fans out into user_notifications + account_team
-- joins, both of which can have FK / NOT NULL surprises.
create or replace function notify_team_on_stage_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_outcome text;
begin
  if old.stage is not distinct from new.stage then return new; end if;
  if new.stage not in ('Contracted', 'Renewed', 'Declined') then return new; end if;

  begin
    if new.stage in ('Contracted','Renewed') then v_outcome := 'won';
    else v_outcome := 'lost';
    end if;

    insert into user_notifications (user_id, type, title, body, link, icon, metadata)
    select
      coalesce(new.account_lead_id, new.assigned_to_user_id),
      'deal_stage_change',
      case when v_outcome = 'won' then '🎉 Deal ' || new.stage else '💔 Deal Declined' end,
      coalesce(new.brand_name, 'A deal') || ' moved to ' || new.stage,
      '/app/crm/pipeline?deal=' || new.id,
      case when v_outcome = 'won' then '🎉' else '💔' end,
      jsonb_build_object('deal_id', new.id, 'stage', new.stage)
    where coalesce(new.account_lead_id, new.assigned_to_user_id) is not null;
  exception when others then
    insert into trigger_failures (trigger_name, table_name, row_id, err_state, err_message, err_detail)
      values ('notify_team_on_stage_change', 'deals', new.id, sqlstate, sqlerrm, '');
    raise notice 'notify_team_on_stage_change swallowed error: % %', sqlstate, sqlerrm;
  end;

  return new;
end;
$$;

-- Spawn-fulfillment fires on contract_benefits insert (downstream
-- of autocreate_contract). Wrap it too.
create or replace function spawn_fulfillment_for_benefit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
  v_contract record;
  v_property_id uuid;
  i integer;
begin
  if exists(select 1 from fulfillment_records where benefit_id = new.id) then
    return new;
  end if;

  begin
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
  exception when others then
    insert into trigger_failures (trigger_name, table_name, row_id, err_state, err_message, err_detail)
      values ('spawn_fulfillment_for_benefit', 'contract_benefits', new.id, sqlstate, sqlerrm, '');
    raise notice 'spawn_fulfillment_for_benefit swallowed error: % %', sqlstate, sqlerrm;
  end;

  return new;
end;
$$;
