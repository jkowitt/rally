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
  v_subscriber_id uuid;
  v_digest_list_id uuid;
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
    v_subscriber_id := v_existing;
  else
    -- Create a new active subscriber. Defensive ON CONFLICT DO NOTHING
    -- in case a concurrent transaction inserted a matching row between
    -- our SELECT and our INSERT. email_subscribers has unique(property_id,
    -- email), so we target that constraint.
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
    on conflict (property_id, email) do nothing
    returning id into v_subscriber_id;

    -- If the INSERT was skipped by ON CONFLICT (rare race condition),
    -- look up the id so we can still add them to the list below.
    if v_subscriber_id is null then
      select id into v_subscriber_id
      from email_subscribers
      where lower(email) = v_email
      limit 1;
    end if;
  end if;

  -- Enroll the subscriber in the "Digest Subscribers" list via the
  -- email_list_subscribers junction. Without this, the master
  -- email_subscribers row exists but belongs to no lists, meaning
  -- the digest-scheduled-publish cron finds 0 recipients when it
  -- tries to send the next issue.
  --
  -- The list is identified by list_type='newsletter' AND 'digest' in
  -- tags. This matches the convention in digestIssueService.js and
  -- the digest-scheduled-publish edge function.
  if v_subscriber_id is not null then
    select id into v_digest_list_id
    from email_lists
    where list_type = 'newsletter'
      and 'digest' = any(tags)
    limit 1;

    if v_digest_list_id is not null then
      insert into email_list_subscribers (list_id, subscriber_id, source, status)
      values (v_digest_list_id, v_subscriber_id, 'signup', 'active')
      on conflict (list_id, subscriber_id) do nothing;
    end if;
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
-- One-shot INSERT that walks every profile and adds them to
-- email_subscribers with the 'digest' tag. Idempotent — safe to
-- re-run because:
--   1. The NOT EXISTS subquery filters out emails that already
--      have an email_subscribers row (regardless of property_id)
--   2. A DISTINCT ON prevents duplicate emails within the SELECT
--      itself (two profiles could theoretically share an email)
--   3. An ON CONFLICT DO NOTHING catches any race condition
--      against the (property_id, email) unique constraint
--
-- Rows that already exist in email_subscribers get their tags
-- updated in a separate UPDATE below — not via ON CONFLICT, so
-- we don't need an ON CONFLICT target that matches the actual
-- unique constraint shape.
--
-- full_name is split on the first space. Profiles with no name
-- get null first_name/last_name (personalization falls back to
-- the email address prefix in email templates).
insert into email_subscribers (email, first_name, last_name, status, source, tags, property_id, created_at, updated_at)
select distinct on (lower(p.email))
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
on conflict (property_id, email) do nothing;

-- Tag any pre-existing email_subscribers rows that belong to platform
-- users but don't yet have the 'digest' tag. This catches anyone who
-- was already in email_subscribers from a CSV import or pipeline sync
-- but hasn't been explicitly enrolled in the Digest.
update email_subscribers e
set tags = array(select distinct unnest(coalesce(e.tags, '{}'::text[]) || array['digest', 'platform_user']))
from profiles p
where lower(e.email) = lower(p.email)
  and not (coalesce(e.tags, '{}'::text[]) @> array['digest']);

-- ============================================================
-- LIST MEMBERSHIP: auto-create the Digest list and enroll everyone
-- ============================================================
-- The subscriber→list link lives in the email_list_subscribers
-- junction table. Without a junction row, a subscriber belongs to
-- no lists and no campaign can target them — which is exactly what
-- caused "Will send to ~0 subscribers" in the campaign builder
-- even when the master email_subscribers table had rows.
--
-- This block:
--   1. Ensures a list named "The Digest Subscribers" exists with
--      list_type='newsletter' and tags=['digest']. This matches the
--      convention used by digestIssueService.js and the cron job.
--   2. Enrolls every email_subscriber that has 'digest' in its tags
--      into that list via email_list_subscribers.
--
-- Safe to re-run: the list upsert is idempotent on name, and the
-- enrollment insert uses ON CONFLICT DO NOTHING.

-- email_lists has no unique constraint on name, so use a conditional
-- insert guarded by NOT EXISTS instead of ON CONFLICT. This matches
-- the find-or-create pattern used by digestIssueService.js and the
-- digest-scheduled-publish edge function.
insert into email_lists (name, description, list_type, tags, is_public)
select
  'The Digest Subscribers',
  'Everyone subscribed to The Digest by Loud Legacy Ventures. Auto-enrolled from platform signups and landing page form submissions.',
  'newsletter',
  array['digest'],
  false
where not exists (
  select 1 from email_lists
  where list_type = 'newsletter'
    and 'digest' = any(tags)
);

-- Enroll all tagged subscribers into the list.
insert into email_list_subscribers (list_id, subscriber_id, source, status)
select
  l.id,
  s.id,
  'signup',
  'active'
from email_lists l
cross join email_subscribers s
where l.list_type = 'newsletter'
  and 'digest' = any(l.tags)
  and 'digest' = any(coalesce(s.tags, '{}'::text[]))
  and s.status = 'active'
on conflict (list_id, subscriber_id) do nothing;

-- Refresh the denormalized subscriber counters on email_lists so
-- the UI shows the right count immediately (instead of waiting
-- for the next natural recount). This replicates what the
-- refreshListCounts() service function does.
update email_lists l
set
  subscriber_count = (select count(*) from email_list_subscribers where list_id = l.id),
  active_count = (select count(*) from email_list_subscribers where list_id = l.id and status = 'active'),
  updated_at = now()
where l.list_type = 'newsletter'
  and 'digest' = any(l.tags);
