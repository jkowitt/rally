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
-- (migration 066).
--
-- NOTE ON NAMES: profiles has a single full_name column (migration
-- 001), not first_name/last_name. We split on the first space when
-- populating email_subscribers. Not perfect for people whose first
-- name has a space, but good enough for personalization tokens.
-- ============================================================

create or replace function auto_subscribe_new_user_to_digest()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  v_email text;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_existing uuid;
  v_space_pos integer;
begin
  -- Pull email + name from the profile row
  v_email := lower(coalesce(new.email, ''));
  v_full_name := coalesce(new.full_name, '');

  -- Must have an email to enroll
  if v_email = '' or v_email is null then
    return new;
  end if;

  -- Split full_name on the first space for personalization
  v_space_pos := position(' ' in v_full_name);
  if v_space_pos > 0 then
    v_first_name := substring(v_full_name from 1 for v_space_pos - 1);
    v_last_name := substring(v_full_name from v_space_pos + 1);
  else
    v_first_name := nullif(v_full_name, '');
    v_last_name := null;
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

-- ============================================================
-- BACKFILL: enroll every existing profile into the Digest list
-- ============================================================
-- This is a one-shot INSERT ... ON CONFLICT that walks every
-- profile and adds them to email_subscribers with the 'digest'
-- tag. Idempotent — safe to re-run.
--
-- full_name is split on the first space. Profiles with no name
-- get null first_name/last_name (personalization will fall back
-- to the email address prefix).
insert into email_subscribers (email, first_name, last_name, status, source, tags, property_id, created_at, updated_at)
select
  lower(p.email),
  case
    when p.full_name is null or p.full_name = '' then null
    when position(' ' in p.full_name) > 0 then substring(p.full_name from 1 for position(' ' in p.full_name) - 1)
    else p.full_name
  end as first_name,
  case
    when p.full_name is null or p.full_name = '' then null
    when position(' ' in p.full_name) > 0 then substring(p.full_name from position(' ' in p.full_name) + 1)
    else null
  end as last_name,
  'active',
  'signup',
  array['digest', 'platform_user'],
  p.property_id,
  now(),
  now()
from profiles p
where p.email is not null
  and p.email != ''
  and not exists (
    select 1 from email_subscribers e where lower(e.email) = lower(p.email)
  )
on conflict (email) do update set
  tags = array(select distinct unnest(coalesce(email_subscribers.tags, '{}'::text[]) || array['digest', 'platform_user'])),
  updated_at = now();

-- Tag any pre-existing email_subscribers rows that belong to platform
-- users but don't yet have the 'digest' tag. This catches anyone who
-- was already in email_subscribers from a CSV import or pipeline sync
-- but hasn't been explicitly enrolled in the Digest.
update email_subscribers e
set tags = array(select distinct unnest(coalesce(e.tags, '{}'::text[]) || array['digest', 'platform_user']))
from profiles p
where lower(e.email) = lower(p.email)
  and not (coalesce(e.tags, '{}'::text[]) @> array['digest']);
