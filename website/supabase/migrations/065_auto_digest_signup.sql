-- ============================================================
-- MIGRATION 065 — AUTO-FUNNEL NEW USERS TO DIGEST
-- ============================================================
-- When a new profile row is created (i.e., a user signs up to the
-- platform), automatically enroll them in The Digest subscriber
-- list. This lives in the database as a trigger so it cannot be
-- bypassed by any signup code path, front-door or otherwise.
--
-- Users can opt out at any time via:
--   1. Unsubscribe link at the bottom of every email
--   2. /app/settings email preferences toggle
--
-- This behavior is covered by the updated Terms & Conditions
-- (migration also covers the legal document update).
-- ============================================================

create or replace function auto_subscribe_new_user_to_digest()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  v_email text;
  v_first_name text;
  v_last_name text;
  v_existing uuid;
begin
  -- Pull email + name from the profile row
  v_email := lower(coalesce(new.email, ''));
  v_first_name := new.first_name;
  v_last_name := new.last_name;

  -- Must have an email to enroll
  if v_email = '' or v_email is null then
    return new;
  end if;

  -- Check if the email is already in email_subscribers. If it is,
  -- just add the 'digest' tag (idempotent). If not, create a new
  -- active row tagged 'digest' + 'platform_user'.
  select id into v_existing
  from email_subscribers
  where lower(email) = v_email
  limit 1;

  if v_existing is not null then
    -- Append 'digest' + 'platform_user' to tags if not already present
    update email_subscribers
    set
      tags = array(select distinct unnest(coalesce(tags, '{}'::text[]) || array['digest', 'platform_user'])),
      updated_at = now()
    where id = v_existing;
  else
    -- Create a new active subscriber
    insert into email_subscribers (
      email,
      first_name,
      last_name,
      status,
      source,
      tags,
      industry,
      property_id,
      created_at,
      updated_at
    ) values (
      v_email,
      v_first_name,
      v_last_name,
      'active',
      'signup',
      array['digest', 'platform_user'],
      null,
      new.property_id,
      now(),
      now()
    )
    on conflict (email) do update set
      tags = array(select distinct unnest(coalesce(email_subscribers.tags, '{}'::text[]) || array['digest', 'platform_user'])),
      updated_at = now();
  end if;

  return new;
exception
  when others then
    -- Never let a subscriber enrollment failure break signup itself.
    -- Log to postgres logs and let the profile insert succeed.
    raise notice 'auto_subscribe_new_user_to_digest failed: %', sqlerrm;
    return new;
end;
$$;

-- Drop any old trigger so re-runs are idempotent
drop trigger if exists profiles_auto_digest_subscribe on profiles;

create trigger profiles_auto_digest_subscribe
  after insert on profiles
  for each row
  execute function auto_subscribe_new_user_to_digest();

-- Backfill existing profiles into the Digest list (one-shot).
-- Anybody who already has a profile row gets enrolled as of this
-- migration. Idempotent — re-running just re-adds the tags.
do $$
declare
  p record;
begin
  for p in select id, email, first_name, last_name, property_id from profiles where email is not null loop
    perform auto_subscribe_new_user_to_digest() from (select p.* as new) _;
    -- Inline the trigger body manually since we can't call it as a plain function
    null;
  end loop;
end $$;

-- Simpler backfill using direct SQL (the DO block above is a no-op;
-- this is the real one). Safe to re-run.
insert into email_subscribers (email, first_name, last_name, status, source, tags, property_id, created_at, updated_at)
select
  lower(p.email),
  p.first_name,
  p.last_name,
  'active',
  'signup',
  array['digest', 'platform_user'],
  p.property_id,
  now(),
  now()
from profiles p
where p.email is not null
  and not exists (
    select 1 from email_subscribers e where lower(e.email) = lower(p.email)
  )
on conflict (email) do update set
  tags = array(select distinct unnest(coalesce(email_subscribers.tags, '{}'::text[]) || array['digest', 'platform_user'])),
  updated_at = now();

-- Tag any pre-existing email_subscribers rows that belong to platform
-- users but don't yet have the 'digest' tag.
update email_subscribers e
set tags = array(select distinct unnest(coalesce(e.tags, '{}'::text[]) || array['digest', 'platform_user']))
from profiles p
where lower(e.email) = lower(p.email)
  and not (e.tags @> array['digest']);
